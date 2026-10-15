import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { mediaErrorResponse, MediaError, writeMediaChunk } from '@/lib/media-storage';

export async function PUT(request: Request, context: { params: Promise<{ id: string; index: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { id, index } = await context.params;
    if (!/^\d+$/.test(index)) throw new MediaError('ลำดับส่วนไฟล์ไม่ถูกต้อง');
    await writeMediaChunk(id, Number(index), request);
    return Response.json({ ok: true });
  } catch (error) { return mediaErrorResponse(error); }
}
