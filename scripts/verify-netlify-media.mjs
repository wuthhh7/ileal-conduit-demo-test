import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Transport smoke test on a unique, unlisted asset. Never creates a video row.
process.loadEnvFile('.env.local');
const base = new URL(process.argv[2]);
if (base.protocol !== 'https:' || !base.hostname.endsWith('.netlify.app'))
  throw new Error('Provide the production Netlify HTTPS URL');
const hash = (value) =>
  createHash('sha256').update(new Uint8Array(value)).digest('hex');
const unauthenticated = await fetch(new URL('/api/videos/upload', base), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});
assert.equal(unauthenticated.status, 401);
const login = await fetch(new URL('/api/auth/login', base), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: process.env.DASHBOARD_PASSWORD,
  }),
});
assert.equal(login.status, 200, 'Staff login failed');
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'Missing session cookie');
const json = async (body) =>
  fetch(new URL('/api/videos/upload', base), {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const bytes = new Uint8Array(3 * 1024 * 1024 + 257);
for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
const initialized = await json({
  action: 'init',
  kind: 'video',
  name: 'synthetic-storage-check.mp4',
  contentType: 'video/mp4',
  size: bytes.length,
});
assert.equal(
  initialized.status,
  201,
  `Upload init failed: ${initialized.status}`,
);
const upload = await initialized.json();
let deleted = false;
try {
  assert.equal(upload.chunkCount, 2);
  assert.equal(
    (await json({ action: 'complete', id: upload.id })).status,
    409,
    'Incomplete file must not publish',
  );
  for (const index of [0, 0, 1]) {
    const response = await fetch(
      new URL(`/api/videos/upload/${upload.id}/${index}`, base),
      {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/octet-stream' },
        body: bytes.slice(
          index * upload.chunkSize,
          (index + 1) * upload.chunkSize,
        ),
      },
    );
    assert.equal(
      response.status,
      200,
      `Chunk ${index} failed: ${response.status}`,
    );
  }
  const completed = await json({ action: 'complete', id: upload.id });
  assert.equal(completed.status, 200, 'Completion failed');
  const { url } = await completed.json();
  assert.equal(
    (await json({ action: 'complete', id: upload.id })).status,
    200,
    'Completion retry failed',
  );
  const full = await fetch(new URL(url, base));
  assert.equal(full.status, 200);
  assert.equal(hash(await full.arrayBuffer()), hash(bytes));
  const start = upload.chunkSize - 16,
    end = upload.chunkSize + 16;
  const partial = await fetch(new URL(url, base), {
    headers: { Range: `bytes=${start}-${end}` },
  });
  assert.equal(partial.status, 206);
  assert.equal(
    partial.headers.get('content-range'),
    `bytes ${start}-${end}/${bytes.length}`,
  );
  assert.equal(
    hash(await partial.arrayBuffer()),
    hash(bytes.slice(start, end + 1)),
  );
  const head = await fetch(new URL(url, base), { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get('content-length')), bytes.length);
  const removal = await fetch(
    new URL(`/api/videos/upload?id=${upload.id}`, base),
    { method: 'DELETE', headers: { cookie } },
  );
  assert.equal(removal.status, 200, 'Test upload cleanup failed');
  deleted = true;
  const missing = await fetch(new URL(`${url}?verify=${Date.now()}`, base), {
    method: 'HEAD',
  });
  assert.equal(
    missing.status,
    404,
    'Deleted test asset remains visible at origin',
  );
  console.log(
    JSON.stringify({
      authentication: 'passed',
      chunkedUploadAndRetry: 'passed',
      publicationAndChecksum: 'passed',
      crossChunkSeeking: 'passed',
      head: 'passed',
      deletion: 'passed',
      fixtureId: upload.id,
      visibleVideoRowsCreated: 0,
    }),
  );
} finally {
  if (!deleted) {
    const cleanup = await fetch(
      new URL(`/api/videos/upload?id=${upload.id}`, base),
      { method: 'DELETE', headers: { cookie } },
    );
    console.log(`Test asset cleanup HTTP ${cleanup.status}`);
  }
}
