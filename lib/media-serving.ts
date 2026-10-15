import {
  getMediaManifest,
  mediaErrorResponse,
  mediaStore,
} from './media-storage';

export function parseMediaRange(
  header: string | null,
  size: number,
): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return 'invalid';
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if (
    (first !== null && !Number.isSafeInteger(first)) ||
    (last !== null && !Number.isSafeInteger(last))
  )
    return 'invalid';
  const start = first === null ? Math.max(0, size - (last ?? 0)) : first;
  const end =
    first === null || last === null ? size - 1 : Math.min(last, size - 1);
  return start < size && start >= 0 && end >= start
    ? { start, end }
    : 'invalid';
}
export async function serveMedia(request: Request, id: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  try {
    const manifest = await getMediaManifest(id);
    if (!manifest)
      return new Response('ไม่พบไฟล์', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    const etag = `"${id}"`;
    const headers = new Headers({
      'Content-Type': manifest.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      ETag: etag,
      'Cache-Control': 'public, max-age=300, must-revalidate',
    });
    const cached = request.headers.get('if-none-match');
    if (
      cached === '*' ||
      cached
        ?.split(',')
        .some((value) => value.trim().replace(/^W\//, '') === etag)
    )
      return new Response(null, { status: 304, headers });
    const ifRange = request.headers.get('if-range');
    const range =
      request.method === 'HEAD' || (ifRange && ifRange !== etag)
        ? null
        : parseMediaRange(request.headers.get('range'), manifest.size);
    if (range === 'invalid') {
      headers.set('Content-Range', `bytes */${manifest.size}`);
      return new Response(null, { status: 416, headers });
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? manifest.size - 1;
    headers.set('Content-Length', String(end - start + 1));
    if (range) {
      headers.set('Content-Range', `bytes ${start}-${end}/${manifest.size}`);
      headers.set('Netlify-CDN-Cache-Control', 'no-store');
    }
    if (request.method === 'HEAD') return new Response(null, { headers });
    const store = mediaStore();
    let index = Math.floor(start / manifest.chunkSize);
    const finalIndex = Math.floor(end / manifest.chunkSize);
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk: ArrayBuffer | null = await store.get(
            `${id}/chunks/${index}`,
            { type: 'arrayBuffer' },
          );
          if (cancelled) return;
          if (!chunk) throw new Error('Missing media chunk');
          const from =
            index === Math.floor(start / manifest.chunkSize)
              ? start % manifest.chunkSize
              : 0;
          const to =
            index === finalIndex
              ? (end % manifest.chunkSize) + 1
              : chunk.byteLength;
          controller.enqueue(new Uint8Array(chunk).subarray(from, to));
          index += 1;
          if (index > finalIndex) controller.close();
        } catch (error) {
          if (!cancelled) controller.error(error);
        }
      },
      cancel() {
        cancelled = true;
      },
    });
    return new Response(stream, { status: range ? 206 : 200, headers });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
