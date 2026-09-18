import {
  ensureContentAnalyticsTables,
  ensureVideoContentTable,
  getD1,
} from '@/lib/server-db';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await Promise.all([
    ensureVideoContentTable(),
    ensureContentAnalyticsTables(),
  ]);
  const { id } = await context.params;
  const video = await getD1()
    .prepare('select id from video_content where id = ?')
    .bind(id)
    .first<{ id: string }>();
  if (!video) return Response.json({ error: 'ไม่พบคลิปนี้' }, { status: 404 });
  const now = new Date().toISOString();
  await Promise.all([
    getD1()
      .prepare(
        'update video_content set views = views + 1, updated_at = ? where id = ?',
      )
      .bind(now, id)
      .run(),
    getD1()
      .prepare(
        'insert into video_view_events (video_id, created_at) values (?, ?)',
      )
      .bind(id, now)
      .run(),
  ]);
  const updated = await getD1()
    .prepare('select views from video_content where id = ?')
    .bind(id)
    .first<{ views: string | number }>();
  return Response.json({ ok: true, views: Number(updated?.views) || 0 });
}
