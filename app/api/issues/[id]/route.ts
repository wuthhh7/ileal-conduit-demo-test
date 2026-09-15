import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1, getRuntimeConfig } from '@/lib/server-db';

async function pushLineReply(userId: string, text: string) {
  const token = getRuntimeConfig().lineToken;
  if (!token) return false;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok) console.error('LINE nurse reply failed', response.status, await response.text());
  return response.ok;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { reply?: unknown };
  const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
  if (!reply || reply.length > 2000) return Response.json({ error: 'กรุณากรอกคำตอบไม่เกิน 2,000 ตัวอักษร' }, { status: 400 });

  const db = getD1();
  const issue = await db.prepare(`select i.id, i.patient_id as "patientId", i.subject, i.status,
    p.line_user_id as "lineUserId" from issues i join patients p on p.id = i.patient_id where i.id = ?`).bind(id).first<{ id: string; patientId: string; subject: string; status: string; lineUserId: string }>();
  if (!issue) return Response.json({ error: 'ไม่พบเรื่องนี้' }, { status: 404 });
  if (issue.status === 'answered') return Response.json({ error: 'เรื่องนี้ตอบกลับแล้ว' }, { status: 409 });

  const lineMessage = `👩‍⚕️ พยาบาลตอบกลับเรื่อง “${issue.subject}”\n\n${reply}`;
  if (!(await pushLineReply(issue.lineUserId, lineMessage))) return Response.json({ error: 'ส่งข้อความเข้า LINE ไม่สำเร็จ เรื่องยังไม่ถูกปิด' }, { status: 502 });

  const now = new Date().toISOString();
  await db.prepare(`update issues set status = 'answered', reply_text = ?, replied_at = ? where id = ? and status = 'unanswered'`).bind(reply, now, id).run();
  await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'nurse', ?, 'ตอบกลับปัญหาจาก Dashboard', ?)`).bind(issue.patientId, lineMessage, now).run();
  return Response.json({ ok: true });
}
