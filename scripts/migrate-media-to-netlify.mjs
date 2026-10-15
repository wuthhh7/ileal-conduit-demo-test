import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { neon } from '@neondatabase/serverless';

// Explicit phases: inspect -> copy and verify -> deploy -> switch references.
// Source files are never deleted by this migration.
process.loadEnvFile('.env.local');
const mode = process.argv[2] || '--plan';
if (!['--plan', '--copy', '--switch', '--verify'].includes(mode))
  throw new Error('Use --plan, --copy, --switch or --verify');
const base = new URL(process.argv[3] || process.env.PUBLIC_BASE_URL);
if (!base.hostname.endsWith('.netlify.app') || base.protocol !== 'https:')
  throw new Error('Provide the production Netlify HTTPS URL');
const { siteId } = JSON.parse(
  await readFile(new URL('../.netlify/state.json', import.meta.url), 'utf8'),
);
if (!siteId) throw new Error('Link the existing Netlify site first');
const sql = neon(process.env.DATABASE_URL);
const rows = await sql.query(
  'select id, title, video_url, poster_url, views, duration_label, created_at from video_content order by id',
);
const liveResponse = await fetch(new URL('/api/videos', base));
if (!liveResponse.ok)
  throw new Error('Cannot read the production video library');
const live = (await liveResponse.json()).videos;
if (
  rows.length !== live.length ||
  rows.some(
    (row) =>
      !live.some(
        (v) =>
          v.id === row.id &&
          v.videoUrl === row.video_url &&
          v.posterUrl === row.poster_url,
      ),
  )
)
  throw new Error(
    'Local database and production video library differ; stopping',
  );
const isLegacy = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    );
  } catch {
    return false;
  }
};
const sources = new Map();
for (const row of rows)
  for (const [url, kind] of [
    [row.video_url, 'video'],
    [row.poster_url, 'poster'],
  ])
    if (isLegacy(url)) sources.set(url, kind);
const directory = new URL('../.netlify/migrations/', import.meta.url);
const planPath = new URL('media-migration.json', directory);
let plan;
try {
  plan = JSON.parse(await readFile(planPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (plan && plan.siteId !== siteId)
  throw new Error('Migration plan belongs to another site');
const sha = (bytes) =>
  createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const chunkSize = 3 * 1024 * 1024;

if (mode === '--plan') {
  const files = [];
  for (const [url, kind] of sources) {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) throw new Error(`Cannot inspect source (${head.status})`);
    files.push({
      kind,
      size: Number(head.headers.get('content-length')),
      type: head.headers.get('content-type'),
    });
  }
  console.log(
    JSON.stringify(
      { siteId, videos: rows.length, legacyFiles: files.length, files },
      null,
      2,
    ),
  );
} else if (mode === '--copy') {
  if (!plan) {
    plan = {
      siteId,
      createdAt: new Date().toISOString(),
      rows,
      files: Array.from(sources, ([sourceUrl, kind]) => ({
        sourceUrl,
        kind,
        id: randomUUID(),
      })),
    };
    await mkdir(directory, { recursive: true });
    await writeFile(planPath, JSON.stringify(plan, null, 2), { flag: 'wx' });
  }
  const configPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'netlify', 'Config', 'config.json')
    : path.join(homedir(), '.config', 'netlify', 'config.json');
  const config = process.env.NETLIFY_AUTH_TOKEN
    ? null
    : JSON.parse(await readFile(configPath, 'utf8'));
  const token =
    process.env.NETLIFY_AUTH_TOKEN || config.users[config.userId].auth.token;
  const store = getStore({
    name: 'patient-education-media',
    siteID: siteId,
    token,
    consistency: 'strong',
  });
  for (const entry of plan.files) {
    console.log(`Copying ${entry.kind} ${entry.id}`);
    const source = await fetch(entry.sourceUrl);
    if (!source.ok)
      throw new Error(`Source download failed (${source.status})`);
    const contentType = (source.headers.get('content-type') || '').split(
      ';',
    )[0];
    const allowed =
      entry.kind === 'video'
        ? ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
        : ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(contentType))
      throw new Error('Unexpected source content type');
    const data = await source.arrayBuffer();
    const maxSize = (entry.kind === 'video' ? 250 : 8) * 1024 * 1024;
    if (!data.byteLength || data.byteLength > maxSize)
      throw new Error('Unexpected source size');
    const chunkCount = Math.ceil(data.byteLength / chunkSize);
    const copiedHash = createHash('sha256');
    for (let index = 0; index < chunkCount; index++) {
      const bytes = data.slice(
        index * chunkSize,
        Math.min((index + 1) * chunkSize, data.byteLength),
      );
      const key = `${entry.id}/chunks/${index}`;
      await store.set(key, bytes, {
        onlyIfNew: true,
        metadata: { size: bytes.byteLength, sha256: sha(bytes) },
      });
      const readBack = await store.get(key, { type: 'arrayBuffer' });
      if (!readBack || sha(readBack) !== sha(bytes))
        throw new Error('Copied chunk checksum mismatch');
      copiedHash.update(new Uint8Array(readBack));
    }
    const hash = sha(data);
    if (copiedHash.digest('hex') !== hash)
      throw new Error('Copied file checksum mismatch');
    const manifest = {
      version: 1,
      id: entry.id,
      kind: entry.kind,
      name: decodeURIComponent(
        new URL(entry.sourceUrl).pathname.split('/').pop(),
      ),
      contentType,
      size: data.byteLength,
      chunkSize,
      chunkCount,
      createdAt: new Date().toISOString(),
    };
    await store.setJSON(`${entry.id}/manifest`, manifest, { onlyIfNew: true });
    Object.assign(entry, {
      size: data.byteLength,
      contentType,
      sha256: hash,
      url: `/media/${entry.id}`,
    });
    await writeFile(planPath, JSON.stringify(plan, null, 2));
    console.log(`Verified ${entry.kind}: ${entry.size} bytes, SHA-256 ${hash}`);
  }
  console.log(
    'Copy complete. Database references are unchanged. Deploy the media routes before --switch.',
  );
} else if (mode === '--switch') {
  if (!plan?.files.every((file) => file.sha256 && file.url))
    throw new Error('Run --copy first');
  for (const entry of plan.files) {
    const response = await fetch(new URL(entry.url, base));
    if (
      !response.ok ||
      response.headers.get('content-type')?.split(';')[0] !== entry.contentType
    )
      throw new Error(`Media route unavailable (${response.status})`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== entry.size || sha(bytes) !== entry.sha256)
      throw new Error('Production file checksum mismatch');
    for (const [start, end] of [
      [
        Math.max(0, Math.min(chunkSize - 16, entry.size - 1)),
        Math.min(chunkSize + 15, entry.size - 1),
      ],
      [Math.max(0, entry.size - 128), entry.size - 1],
    ]) {
      const partial = await fetch(new URL(entry.url, base), {
        headers: { Range: `bytes=${start}-${end}` },
      });
      if (
        partial.status !== 206 ||
        partial.headers.get('content-range') !==
          `bytes ${start}-${end}/${entry.size}` ||
        sha(await partial.arrayBuffer()) !== sha(bytes.slice(start, end + 1))
      )
        throw new Error('Production byte-range verification failed');
    }
    console.log(`Production checksum and seeking verified: ${entry.id}`);
  }
  const replacements = new Map(
    plan.files.map((file) => [file.sourceUrl, file.url]),
  );
  const queries = plan.rows
    .filter(
      (row) =>
        replacements.has(row.video_url) || replacements.has(row.poster_url),
    )
    .map((row) =>
      sql.query(
        'update video_content set video_url = $1, poster_url = $2 where id = $3 and video_url = $4 and poster_url is not distinct from $5 returning id',
        [
          replacements.get(row.video_url) || row.video_url,
          replacements.get(row.poster_url) || row.poster_url,
          row.id,
          row.video_url,
          row.poster_url,
        ],
      ),
    );
  const changed = queries.length ? await sql.transaction(queries) : [];
  console.log(JSON.stringify({ updatedRows: changed.flat().length }));
} else {
  console.log(
    JSON.stringify({
      videos: rows.length,
      remainingLegacyReferences: sources.size,
      allMediaOnNetlify: sources.size === 0,
    }),
  );
}
