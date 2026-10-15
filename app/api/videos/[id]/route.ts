import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { deleteMediaAsset } from '@/lib/media-storage';
import { mediaIdFromUrl } from '@/lib/media-config';
import { ensureVideoContentTable, getD1 } from '@/lib/server-db';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  await ensureVideoContentTable();
  const { id } = await context.params;
  const existing = await getD1().prepare('select id, video_url as "videoUrl", poster_url as "posterUrl" from video_content where id = ?').bind(id).first<{ id: string; videoUrl: string; posterUrl: string | null }>();
  if (!existing) return Response.json({ error: 'ไม่พบคลิปนี้' }, { status: 404 });
  await getD1().prepare('delete from video_content where id = ?').bind(id).run();
  for (const url of new Set([existing.videoUrl, existing.posterUrl])) {
    const assetId = url ? mediaIdFromUrl(url) : null;
    if (!assetId) continue;
    try {
      const used = await getD1().prepare('select id from video_content where video_url = ? or poster_url = ? limit 1').bind(url, url).first();
      if (!used) await deleteMediaAsset(assetId);
    } catch (error) { console.error('Netlify media cleanup failed', error); }
  }
  return Response.json({ ok: true });
}
