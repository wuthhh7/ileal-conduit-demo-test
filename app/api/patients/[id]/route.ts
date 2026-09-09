import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1 } from '@/lib/server-db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const db = getD1();
  const [patient, messages] = await Promise.all([
    db.prepare(`select id, line_user_id as "lineUserId", display_name as "displayName", urgency, status, age, procedure, discharge_day as "dischargeDay", updated_at as "updatedAt" from patients where id = ?`).bind(id).first(),
    db.prepare(`select id, role, body, reason, created_at as "createdAt" from messages where patient_id = ? order by id asc`).bind(id).all(),
  ]);
  if (!patient) return Response.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
  return Response.json({ patient, messages: messages.results });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { status?: string };
  if (!['awaiting_staff', 'in_progress', 'resolved'].includes(body.status || '')) return Response.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  await getD1().prepare(`update patients set status = ?, updated_at = ? where id = ?`).bind(body.status, new Date().toISOString(), id).run();
  return Response.json({ ok: true });
}
