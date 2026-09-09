import { classify, type Urgency } from '@/lib/triage';
import { getD1, getRuntimeConfig } from '@/lib/server-db';

type LineProfile = { userId?: string; displayName?: string };
type IntakeBody = { kind?: 'profile' | 'symptom'; accessToken?: string; data?: Record<string, unknown> };

async function stableId(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `line-${Array.from(new Uint8Array(hash)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function verifyLineUser(accessToken: string) {
  const response = await fetch('https://api.line.me/v2/profile', { headers: { authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!response.ok) return null;
  const profile = await response.json() as LineProfile;
  return profile.userId ? { userId: profile.userId, displayName: profile.displayName || 'ผู้ใช้ LINE' } : null;
}

async function ensurePatient(userId: string, displayName: string) {
  const db = getD1();
  const id = await stableId(userId);
  const now = new Date().toISOString();
  await db.prepare(`insert into patients (id, line_user_id, display_name, urgency, status, intake_json, created_at, updated_at)
    values (?, ?, ?, 'green', 'awaiting_staff', '{}', ?, ?)
    on conflict(line_user_id) do update set updated_at = excluded.updated_at`).bind(id, userId, displayName, now, now).run();
  return { id, now };
}

async function pushToChat(userId: string, text: string) {
  const token = getRuntimeConfig().lineToken;
  if (!token) return false;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok) console.error('LINE push failed', response.status, await response.text());
  return response.ok;
}

function text(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as IntakeBody;
  const accessToken = String(body.accessToken || '');
  if (!accessToken || !body.kind || !body.data) return Response.json({ error: 'ข้อมูลไม่ครบ กรุณาเปิดแบบฟอร์มจาก LINE อีกครั้ง' }, { status: 400 });
  const lineProfile = await verifyLineUser(accessToken);
  if (!lineProfile) return Response.json({ error: 'ยืนยันบัญชี LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดแบบฟอร์มใหม่' }, { status: 401 });

  const db = getD1();
  const patient = await ensurePatient(lineProfile.userId, lineProfile.displayName);

  if (body.kind === 'profile') {
    const name = text(body.data, 'name');
    const age = Number(text(body.data, 'age'));
    const procedure = text(body.data, 'procedure');
    const dischargeDay = Number(text(body.data, 'dischargeDay'));
    if (!name || !procedure || !Number.isInteger(age) || age < 1 || age > 120 || !Number.isInteger(dischargeDay) || dischargeDay < 0 || dischargeDay > 365) {
      return Response.json({ error: 'ข้อมูลประวัติยังไม่ครบหรือไม่ถูกต้อง กรุณาตรวจทุกช่อง' }, { status: 400 });
    }
    const summary = `ส่งแบบฟอร์มประวัติ\nชื่อ: ${name}\nอายุ: ${age} ปี\nการรักษา: ${procedure}\nหลังออกจากโรงพยาบาล: ${dischargeDay} วัน`;
    const reply = 'บันทึกประวัติผู้ป่วยเรียบร้อยแล้วค่ะ ข้อมูลจะแสดงใน Dashboard ของเจ้าหน้าที่';
    await db.prepare(`update patients set display_name = ?, age = ?, procedure = ?, discharge_day = ?, intake_field = null, updated_at = ? where id = ?`).bind(name.slice(0, 120), age, procedure.slice(0, 300), dischargeDay, patient.now, patient.id).run();
    await db.prepare(`insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`).bind(patient.id, summary, patient.now).run();
    await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'บันทึกจาก LIFF', ?)`).bind(patient.id, reply, patient.now).run();
    await pushToChat(lineProfile.userId, `✅ ${reply}`);
    return Response.json({ message: 'ประวัติถูกบันทึกและส่งข้อความยืนยันเข้าแชทแล้ว' });
  }

  const fields = ['symptom', 'duration', 'severity', 'fever', 'urination', 'bleeding'] as const;
  const values = Object.fromEntries(fields.map((field) => [field, text(body.data!, field)])) as Record<(typeof fields)[number], string>;
  const missing = fields.filter((field) => !values[field]);
  if (missing.length) return Response.json({ error: `ข้อมูลยังไม่ครบ กรุณากรอกเพิ่มอีก ${missing.length} ช่อง` }, { status: 400 });
  let urgency: Urgency = classify(Object.values(values).join(' '));
  if (values.severity === 'รุนแรงมาก' || values.urination === 'ปัสสาวะไม่ออก') urgency = 'red';
  const urgencyText = urgency === 'red' ? 'เร่งด่วน' : urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ';
  const summary = `แจ้งอาการผ่านแบบฟอร์ม\nอาการ: ${values.symptom}\nระยะเวลา: ${values.duration}\nความรุนแรง: ${values.severity}\nไข้: ${values.fever}\nการปัสสาวะ: ${values.urination}\nเลือดออก: ${values.bleeding}`;
  const reply = urgency === 'red'
    ? 'ระบบพบข้อมูลที่อาจเร่งด่วน กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที หากฉุกเฉินโทร 1669'
    : `ระบบบันทึกอาการครบถ้วนแล้ว ระดับการติดตาม: ${urgencyText} เจ้าหน้าที่สามารถตรวจข้อมูลได้จาก Dashboard`;
  await db.prepare(`update patients set urgency = ?, status = 'awaiting_staff', intake_field = null, intake_json = ?, updated_at = ? where id = ?`).bind(urgency, JSON.stringify(values), patient.now, patient.id).run();
  await db.prepare(`insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`).bind(patient.id, summary, patient.now).run();
  await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'คัดกรองจาก LIFF', ?)`).bind(patient.id, reply, patient.now).run();
  await pushToChat(lineProfile.userId, `📋 ได้รับข้อมูลแจ้งอาการแล้ว\n\n${summary}\n\n${reply}`);
  return Response.json({ message: 'ข้อมูลอาการถูกบันทึกและส่งสรุปเข้าแชทแล้ว', urgency });
}
