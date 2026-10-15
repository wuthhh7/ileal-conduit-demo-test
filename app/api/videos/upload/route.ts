import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1 } from '@/lib/server-db';
import {
  createMediaUpload,
  completeMediaUpload,
  deleteMediaAsset,
  mediaErrorResponse,
  MediaError,
  validateMediaId,
} from '@/lib/media-storage';

export async function POST(request: Request) {
  if (!(await isDashboardAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object')
      throw new MediaError('รูปแบบคำขอไม่ถูกต้อง');
    if (body.action === 'complete' && typeof body.id === 'string')
      return Response.json(await completeMediaUpload(body.id));
    if (body.action !== 'init') throw new MediaError('รูปแบบคำขอไม่ถูกต้อง');
    return Response.json(await createMediaUpload(body), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
    return mediaErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  if (!(await isDashboardAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get('id') || '';
    validateMediaId(id);
    const url = `/media/${id}`;
    const used = await getD1()
      .prepare(
        'select id from video_content where video_url = ? or poster_url = ? limit 1',
      )
      .bind(url, url)
      .first();
    if (used) throw new MediaError('ไฟล์นี้ถูกใช้โดยคลิปที่บันทึกแล้ว', 409);
    await deleteMediaAsset(id);
    return Response.json({ ok: true });
  } catch (error) {
    return mediaErrorResponse(error);
  }
}
