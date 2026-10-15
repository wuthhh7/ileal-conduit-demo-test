import { getStore } from '@netlify/blobs';
import {
  MEDIA_CHUNK_SIZE,
  MEDIA_ID,
  MEDIA_LIMITS,
  MEDIA_STORE,
  MEDIA_TYPES,
  type MediaKind,
  type MediaManifest,
} from './media-config.ts';

type UploadSession = MediaManifest & { expiresAt: number };
export class MediaError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const fetchMediaStorage: typeof fetch = async (input, init) => {
  const response = await fetch(input, { ...init, cache: 'no-store' });
  // Next's instrumented fetch can return a tee'd response. The Blobs SDK
  // awaits body.cancel() on misses/retries; a tee can wait forever for its
  // other branch. Drain error responses and detach them before SDK disposal.
  if (response.status >= 400 && response.body) {
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  return response;
};
export function mediaStore() {
  return getStore({
    name: MEDIA_STORE,
    consistency: 'strong',
    fetch: fetchMediaStorage,
  });
}
export function validateMediaId(id: string) {
  if (!MEDIA_ID.test(id)) throw new MediaError('ไม่พบไฟล์นี้', 404);
}
export async function getMediaManifest(
  id: string,
): Promise<MediaManifest | null> {
  validateMediaId(id);
  return mediaStore().get(`${id}/manifest`, { type: 'json' });
}
export async function createMediaUpload(body: Record<string, unknown>) {
  const kind = body.kind;
  if (kind !== 'video' && kind !== 'poster')
    throw new MediaError('ประเภทไฟล์ไม่ถูกต้อง');
  const size = body.size;
  if (
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MEDIA_LIMITS[kind]
  ) {
    throw new MediaError(
      kind === 'video'
        ? 'คลิปต้องมีขนาดไม่เกิน 250 MB'
        : 'รูปหน้าปกต้องมีขนาดไม่เกิน 8 MB',
      413,
    );
  }
  const contentType =
    typeof body.contentType === 'string' ? body.contentType : '';
  if (!MEDIA_TYPES[kind].includes(contentType))
    throw new MediaError('ชนิดไฟล์ไม่รองรับ', 415);
  const id = crypto.randomUUID();
  const session: UploadSession = {
    version: 1,
    id,
    kind,
    name:
      typeof body.name === 'string'
        ? body.name.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180)
        : '',
    contentType,
    size,
    chunkSize: MEDIA_CHUNK_SIZE,
    chunkCount: Math.ceil(size / MEDIA_CHUNK_SIZE),
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  await mediaStore().setJSON(`${id}/upload`, session, { onlyIfNew: true });
  return { id, chunkSize: session.chunkSize, chunkCount: session.chunkCount };
}
async function getSession(id: string): Promise<UploadSession> {
  validateMediaId(id);
  const session: UploadSession | null = await mediaStore().get(`${id}/upload`, {
    type: 'json',
  });
  if (!session) throw new MediaError('ไม่พบรายการอัปโหลด', 404);
  if (session.expiresAt < Date.now())
    throw new MediaError('รายการอัปโหลดหมดอายุ กรุณาเลือกไฟล์อีกครั้ง', 410);
  return session;
}
async function limitedBody(request: Request, expected: number) {
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) !== expected)
    throw new MediaError('ขนาดส่วนไฟล์ไม่ถูกต้อง', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new MediaError('ไม่พบข้อมูลไฟล์');
  const bytes = new Uint8Array(expected);
  let offset = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.length > expected) {
        await reader.cancel();
        throw new MediaError('ขนาดส่วนไฟล์ไม่ถูกต้อง', 413);
      }
      bytes.set(value, offset);
      offset += value.length;
    }
  } finally {
    reader.releaseLock();
  }
  if (offset !== expected) throw new MediaError('ได้รับข้อมูลไฟล์ไม่ครบ');
  return bytes.buffer;
}
export async function writeMediaChunk(
  id: string,
  index: number,
  request: Request,
) {
  const session = await getSession(id);
  if (!Number.isSafeInteger(index) || index < 0 || index >= session.chunkCount)
    throw new MediaError('ลำดับส่วนไฟล์ไม่ถูกต้อง');
  if (await getMediaManifest(id))
    throw new MediaError('ไฟล์นี้อัปโหลดเสร็จแล้ว', 409);
  const size = Math.min(
    session.chunkSize,
    session.size - index * session.chunkSize,
  );
  const bytes = await limitedBody(request, size);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const store = mediaStore();
  const key = `${id}/chunks/${index}`;
  const result = await store.set(key, bytes, {
    metadata: { size, sha256 },
    onlyIfNew: true,
  });
  if (!result.modified) {
    const existing = await store.getMetadata(key);
    if (existing?.metadata.sha256 !== sha256 || existing.metadata.size !== size)
      throw new MediaError('ส่วนไฟล์เดิมไม่ตรงกัน กรุณาอัปโหลดใหม่', 409);
  }
}
export async function completeMediaUpload(id: string) {
  if (await getMediaManifest(id)) return { id, url: `/media/${id}` };
  const session = await getSession(id);
  const store = mediaStore();
  const parts = await Promise.all(
    Array.from({ length: session.chunkCount }, (_, index) =>
      store.getMetadata(`${id}/chunks/${index}`),
    ),
  );
  if (
    parts.some(
      (part, index) =>
        !part ||
        part.metadata.size !==
          Math.min(session.chunkSize, session.size - index * session.chunkSize),
    )
  )
    throw new MediaError('ได้รับส่วนไฟล์ไม่ครบ กรุณาอัปโหลดใหม่', 409);
  const { expiresAt: _expiresAt, ...manifest } = session;
  await store.setJSON(`${id}/manifest`, manifest, { onlyIfNew: true });
  await store.delete(`${id}/upload`);
  return { id, url: `/media/${id}` };
}
export async function deleteMediaAsset(id: string) {
  validateMediaId(id);
  const store = mediaStore();
  await store.delete(`${id}/manifest`);
  const { blobs } = await store.list({ prefix: `${id}/` });
  await Promise.all(blobs.map((blob) => store.delete(blob.key)));
}
export async function requireMediaAsset(url: string, kind: MediaKind) {
  const id = url.match(/^\/media\/([^/]+)$/)?.[1];
  if (!id) throw new MediaError('กรุณาอัปโหลดไฟล์ให้เรียบร้อยก่อนบันทึก');
  const manifest = await getMediaManifest(id);
  if (!manifest || manifest.kind !== kind)
    throw new MediaError('ไม่พบไฟล์ที่อัปโหลด');
}
export function mediaErrorResponse(error: unknown) {
  if (error instanceof MediaError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error('Netlify media storage error', error);
  return Response.json(
    { error: 'จัดการไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง' },
    { status: 503 },
  );
}
