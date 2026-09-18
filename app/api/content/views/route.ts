import { ensureContentAnalyticsTables, getD1 } from '@/lib/server-db';

export async function POST() {
  await ensureContentAnalyticsTables();
  await getD1()
    .prepare('insert into content_page_views (created_at) values (?)')
    .bind(new Date().toISOString())
    .run();
  return Response.json({ ok: true }, { status: 201 });
}
