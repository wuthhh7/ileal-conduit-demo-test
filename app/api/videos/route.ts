import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { ensureVideoContentTable, getD1 } from '@/lib/server-db';

type VideoRow = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  posterUrl: string | null;
  durationLabel: string | null;
  views: string | number;
  sortOrder: number;
  createdAt: string;
};

function cleanUrl(value: unknown, optional = false) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url && optional) return '';
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : '';
  } catch {
    return '';
  }
}

function serialize(rows: VideoRow[]) {
  return rows.map((row) => ({ ...row, views: Number(row.views) || 0 }));
}

export async function GET() {
  await ensureVideoContentTable();
  const videos = await getD1().prepare(`select id, title, description, video_url as "videoUrl", poster_url as "posterUrl",
    duration_label as "durationLabel", views, sort_order as "sortOrder", created_at as "createdAt"
    from video_content order by sort_order, created_at desc`).all<VideoRow>();
  return Response.json({ videos: serialize(videos.results) });
}

export async function POST(request: Request) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const videoUrl = cleanUrl(body.videoUrl);
  const posterUrl = cleanUrl(body.posterUrl, true);
  const durationLabel = typeof body.durationLabel === 'string' ? body.durationLabel.trim() : '';
  if (!title || title.length > 120) return Response.json({ error: 'กรุณากรอกชื่อคลิปไม่เกิน 120 ตัวอักษร' }, { status: 400 });
  if (!videoUrl) return Response.json({ error: 'กรุณาอัปโหลดไฟล์วิดีโอที่ถูกต้อง' }, { status: 400 });
  if (description.length > 500 || durationLabel.length > 40) return Response.json({ error: 'ข้อความยาวเกินกำหนด' }, { status: 400 });
  if (body.posterUrl && !posterUrl) return Response.json({ error: 'ลิงก์รูปหน้าปกไม่ถูกต้อง' }, { status: 400 });

  await ensureVideoContentTable();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const latest = await getD1().prepare('select coalesce(max(sort_order), 0) as "sortOrder" from video_content').first<{ sortOrder: number }>();
  await getD1().prepare(`insert into video_content
    (id, title, description, video_url, poster_url, duration_label, views, sort_order, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`)
    .bind(id, title, description, videoUrl, posterUrl || null, durationLabel || null, Number(latest?.sortOrder || 0) + 10, now, now).run();
  return Response.json({ ok: true, id }, { status: 201 });
}
