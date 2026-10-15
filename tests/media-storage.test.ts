import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { MEDIA_CHUNK_SIZE, MEDIA_LIMITS } from '@/lib/media-config';
import {
  completeMediaUpload,
  createMediaUpload,
  deleteMediaAsset,
  fetchMediaStorage,
  getMediaManifest,
  requireMediaAsset,
  writeMediaChunk,
} from '@/lib/media-storage';
import { parseMediaRange, serveMedia } from '@/lib/media-serving';
import { POST, DELETE } from '@/app/api/videos/upload/route';
import { PUT } from '@/app/api/videos/upload/[id]/[index]/route';
import { uploadMedia } from '@/lib/media-upload';

const memory = vi.hoisted(() => {
  type Entry = { data: unknown; metadata: Record<string, unknown> };
  const entries = new Map<string, Entry>();
  const set = async (
    key: string,
    data: unknown,
    options?: { onlyIfNew?: boolean; metadata?: Record<string, unknown> },
  ) => {
    if (options?.onlyIfNew && entries.has(key)) return { modified: false };
    entries.set(key, {
      data: structuredClone(data),
      metadata: options?.metadata || {},
    });
    return { modified: true };
  };
  return {
    entries,
    authorized: true,
    referenced: false,
    store: {
      set,
      setJSON: set,
      get: vi.fn(async (key: string) =>
        structuredClone(entries.get(key)?.data ?? null),
      ),
      getMetadata: async (key: string) =>
        entries.has(key) ? { metadata: entries.get(key)!.metadata } : null,
      delete: async (key: string) => {
        entries.delete(key);
      },
      list: async ({ prefix }: { prefix: string }) => ({
        blobs: [...entries.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key })),
      }),
    },
  };
});
vi.mock('@netlify/blobs', () => ({ getStore: () => memory.store }));
vi.mock('@/lib/dashboard-auth', () => ({
  isDashboardAuthorized: async () => memory.authorized,
}));
vi.mock('@/lib/server-db', () => ({
  getD1: () => ({
    prepare: () => ({
      bind: () => ({
        first: async () =>
          memory.referenced ? { id: 'referenced-video' } : null,
      }),
    }),
  }),
}));

beforeEach(() => {
  memory.entries.clear();
  memory.authorized = true;
  memory.referenced = false;
  vi.unstubAllGlobals();
});
const chunkRequest = (bytes: ArrayBuffer) =>
  new Request('https://test/upload', { method: 'PUT', body: bytes });
const start = (size: number, kind = 'video', contentType = 'video/mp4') =>
  createMediaUpload({ kind, contentType, size, name: 'synthetic.mp4' });

it('drains a missing-object response before the SDK cancels its tee branch', async () => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('not found'));
      controller.close();
    },
  });
  const [branch, other] = source.tee();
  const upstream = new Response(branch, { status: 404 });
  const transport = vi.fn().mockResolvedValue(upstream);
  vi.stubGlobal('fetch', transport);
  const detached = await fetchMediaStorage('https://storage.test/key');
  expect(detached.status).toBe(404);
  expect(upstream.bodyUsed).toBe(true);
  await detached.body?.cancel();
  await other.cancel();
  expect(transport).toHaveBeenCalledWith('https://storage.test/key', {
    cache: 'no-store',
  });
});
async function fixture() {
  const bytes = new Uint8Array(MEDIA_CHUNK_SIZE + 11);
  for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
  const session = await start(bytes.length);
  await writeMediaChunk(
    session.id,
    0,
    chunkRequest(bytes.buffer.slice(0, MEDIA_CHUNK_SIZE)),
  );
  await writeMediaChunk(
    session.id,
    1,
    chunkRequest(bytes.buffer.slice(MEDIA_CHUNK_SIZE)),
  );
  await completeMediaUpload(session.id);
  return { id: session.id, bytes };
}

describe('authenticated chunked media uploads', () => {
  it('rejects unsupported types, wrong limits and empty files', async () => {
    await expect(start(1, 'video', 'text/html')).rejects.toMatchObject({
      status: 415,
    });
    await expect(start(0)).rejects.toMatchObject({ status: 413 });
    await expect(start(MEDIA_LIMITS.video + 1)).rejects.toMatchObject({
      status: 413,
    });
    await expect(
      start(MEDIA_LIMITS.poster + 1, 'poster', 'image/jpeg'),
    ).rejects.toMatchObject({ status: 413 });
    expect((await start(MEDIA_LIMITS.video)).chunkSize).toBeLessThan(
      4.5 * 1024 * 1024,
    );
  });
  it('does not publish incomplete uploads; rejects wrong sizes and indexes', async () => {
    const { id } = await start(2);
    await expect(
      writeMediaChunk(id, 1, chunkRequest(new ArrayBuffer(2))),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      writeMediaChunk(id, 0, chunkRequest(new ArrayBuffer(3))),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      writeMediaChunk(id, 0, chunkRequest(new ArrayBuffer(1))),
    ).rejects.toThrow('ไม่ครบ');
    await expect(completeMediaUpload(id)).rejects.toMatchObject({
      status: 409,
    });
    expect(await getMediaManifest(id)).toBeNull();
    expect(
      (await serveMedia(new Request('https://test/media'), id)).status,
    ).toBe(404);
  });
  it('accepts identical retries, rejects changed bytes and expires stale sessions', async () => {
    const { id } = await start(2);
    await writeMediaChunk(id, 0, chunkRequest(new Uint8Array([1, 2]).buffer));
    await writeMediaChunk(id, 0, chunkRequest(new Uint8Array([1, 2]).buffer));
    await expect(
      writeMediaChunk(id, 0, chunkRequest(new Uint8Array([2, 1]).buffer)),
    ).rejects.toMatchObject({ status: 409 });
    await completeMediaUpload(id);
    expect(await completeMediaUpload(id)).toEqual({ id, url: `/media/${id}` });
    await expect(requireMediaAsset(`/media/${id}`, 'poster')).rejects.toThrow();
    const expired = await start(2);
    (
      memory.entries.get(`${expired.id}/upload`)!.data as { expiresAt: number }
    ).expiresAt = 0;
    await expect(
      writeMediaChunk(expired.id, 0, chunkRequest(new ArrayBuffer(2))),
    ).rejects.toMatchObject({ status: 410 });
  });
  it('requires auth for init, chunks and cancel and protects referenced assets', async () => {
    const { id } = await start(2);
    memory.authorized = false;
    expect(
      (
        await POST(
          new Request('https://test/upload', { method: 'POST', body: '{}' }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await PUT(chunkRequest(new ArrayBuffer(2)), {
          params: Promise.resolve({ id, index: '0' }),
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await DELETE(
          new Request(`https://test/upload?id=${id}`, { method: 'DELETE' }),
        )
      ).status,
    ).toBe(401);
    memory.authorized = true;
    memory.referenced = true;
    expect(
      (
        await DELETE(
          new Request(`https://test/upload?id=${id}`, { method: 'DELETE' }),
        )
      ).status,
    ).toBe(409);
    expect(memory.entries.has(`${id}/upload`)).toBe(true);
    memory.referenced = false;
    expect(
      (
        await DELETE(
          new Request(`https://test/upload?id=${id}`, { method: 'DELETE' }),
        )
      ).status,
    ).toBe(200);
    expect(memory.entries.size).toBe(0);
  });
  it('uploads a browser File through all routes and retries a transient failed part', async () => {
    let failOnce = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const request = new Request(`https://test${url}`, init);
        if (init.method === 'POST') return POST(request);
        if (init.method === 'DELETE') return DELETE(request);
        if (failOnce) {
          failOnce = false;
          return Response.json({ error: 'transient' }, { status: 503 });
        }
        const [, id, index] = url.match(/upload\/([^/]+)\/(\d+)$/)!;
        return PUT(request, { params: Promise.resolve({ id, index }) });
      }),
    );
    const progress: number[] = [];
    const uploaded = await uploadMedia(
      new File([new Uint8Array([1, 2, 3])], 'synthetic.mov'),
      'video',
      (percent) => progress.push(percent),
    );
    expect((await getMediaManifest(uploaded.id))?.contentType).toBe(
      'video/quicktime',
    );
    expect(progress).toEqual([100]);
    expect(
      await (
        await serveMedia(new Request('https://test/media'), uploaded.id)
      ).arrayBuffer(),
    ).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });
});

describe('media streaming and seeking', () => {
  it('streams exact bytes across chunk boundaries and supports tail ranges', async () => {
    const { id, bytes } = await fixture();
    const full = await serveMedia(new Request('https://test/media'), id);
    expect(full.status).toBe(200);
    expect(
      createHash('sha256')
        .update(new Uint8Array(await full.arrayBuffer()))
        .digest('hex'),
    ).toBe(createHash('sha256').update(bytes).digest('hex'));
    const offset = MEDIA_CHUNK_SIZE - 5;
    const partial = await serveMedia(
      new Request('https://test/media', {
        headers: { Range: `bytes=${offset}-${offset + 10}` },
      }),
      id,
    );
    expect(partial.status).toBe(206);
    expect(partial.headers.get('content-range')).toBe(
      `bytes ${offset}-${offset + 10}/${bytes.length}`,
    );
    expect(new Uint8Array(await partial.arrayBuffer())).toEqual(
      bytes.slice(offset, offset + 11),
    );
    const tail = await serveMedia(
      new Request('https://test/media', { headers: { Range: 'bytes=-5' } }),
      id,
    );
    expect(new Uint8Array(await tail.arrayBuffer())).toEqual(bytes.slice(-5));
  });
  it('supports HEAD, revalidation and If-Range without serving incorrect cached ranges', async () => {
    const { id, bytes } = await fixture();
    const head = await serveMedia(
      new Request('https://test/media', {
        method: 'HEAD',
        headers: { Range: 'bytes=0-1' },
      }),
      id,
    );
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(bytes.length));
    expect(await head.text()).toBe('');
    expect(
      (
        await serveMedia(
          new Request('https://test/media', {
            headers: { 'If-None-Match': `W/"${id}"` },
          }),
          id,
        )
      ).status,
    ).toBe(304);
    const mismatched = await serveMedia(
      new Request('https://test/media', {
        headers: { Range: 'bytes=0-1', 'If-Range': '"old"' },
      }),
      id,
    );
    expect(mismatched.status).toBe(200);
    await mismatched.body?.cancel();
    const invalid = await serveMedia(
      new Request('https://test/media', {
        headers: { Range: `bytes=${bytes.length}-` },
      }),
      id,
    );
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get('content-range')).toBe(
      `bytes */${bytes.length}`,
    );
  });
  it('deletes only the selected asset and rejects unsafe identifiers', async () => {
    const { id } = await fixture();
    const other = await start(1);
    await deleteMediaAsset(id);
    expect(
      (await serveMedia(new Request('https://test/media'), id)).status,
    ).toBe(404);
    expect(memory.entries.has(`${other.id}/upload`)).toBe(true);
    await expect(deleteMediaAsset('../another-store')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('handles suffix, open-ended, oversize and invalid ranges', () => {
    expect(parseMediaRange('bytes=4-', 10)).toEqual({ start: 4, end: 9 });
    expect(parseMediaRange('bytes=-20', 10)).toEqual({ start: 0, end: 9 });
    expect(parseMediaRange('bytes=0-100', 10)).toEqual({ start: 0, end: 9 });
    for (const range of [
      'bytes=-0',
      'bytes=5-2',
      'bytes=99-',
      'bytes=-',
      'bytes=0-1,4-5',
      'bytes=Infinity-',
    ])
      expect(parseMediaRange(range, 10)).toBe('invalid');
  });
});
