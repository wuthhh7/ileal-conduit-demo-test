import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import {
  ensureIssueAttachmentColumn,
  ensureIssueUrgencyData,
  getD1,
} from '@/lib/server-db';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isDashboardAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await Promise.all([ensureIssueAttachmentColumn(), ensureIssueUrgencyData()]);
  const db = getD1();
  const [patient, messages, issues] = await Promise.all([
    db
      .prepare(`select id, line_user_id as "lineUserId", display_name as "displayName", avatar_url as "avatarUrl", urgency, status, age, phone, line_id as "lineId", procedure,
      discharge_date as "dischargeDate", discharge_day as "dischargeDay", created_at as "createdAt", updated_at as "updatedAt",
      (select count(*) from messages where patient_id = patients.id) as "messageCount",
      (select body from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomSummary",
      (select created_at from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomUpdatedAt"
      from patients where id = ?`)
      .bind(id)
      .first(),
    db
      .prepare(
        `select id, role, body, reason, created_at as "createdAt" from messages where patient_id = ? order by id asc`,
      )
      .bind(id)
      .all(),
    db
      .prepare(`select i.id, i.patient_id as "patientId", p.line_user_id as "lineUserId", p.display_name as "displayName", p.avatar_url as "avatarUrl",
      i.subject, i.category, i.detail, i.onset, i.urgency, i.status, i.reply_text as "replyText", i.image_data as "imageData",
      i.created_at as "createdAt", i.replied_at as "repliedAt"
      from issues i join patients p on p.id = i.patient_id where i.patient_id = ? order by i.created_at desc`)
      .bind(id)
      .all(),
  ]);
  if (!patient) return Response.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
  return Response.json({
    patient,
    issues: issues.results,
    messages: messages.results,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isDashboardAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  if (
    !['awaiting_staff', 'in_progress', 'resolved'].includes(body.status || '')
  )
    return Response.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  await getD1()
    .prepare(`update patients set status = ?, updated_at = ? where id = ?`)
    .bind(body.status, new Date().toISOString(), id)
    .run();
  return Response.json({ ok: true });
}
