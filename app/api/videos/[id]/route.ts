import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { del } from '@vercel/blob';
import { ensureVideoContentTable, getD1 } from '@/lib/server-db';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await ensureVideoContentTable();
  const { id } = await context.params;
  const existing = await getD1().prepare('select id, video_url as "videoUrl", poster_url as "posterUrl" from video_content where id = ?').bind(id).first<{ id: string; videoUrl: string; posterUrl: string | null }>();
  if (!existing) return Response.json({ error: 'ไม่พบคลิปนี้' }, { status: 404 });
  const blobUrls = [existing.videoUrl, existing.posterUrl].filter((url): url is string => Boolean(url && url.includes('.blob.vercel-storage.com')));
  if (blobUrls.length) {
    try { await del(blobUrls); } catch (error) { console.error('Video blob cleanup failed', error); }
  }
  await getD1().prepare('delete from video_content where id = ?').bind(id).run();
  return Response.json({ ok: true });
}
