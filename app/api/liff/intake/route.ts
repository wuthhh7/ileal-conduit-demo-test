import { classify, classifyReport, REPORT_CATEGORIES, type Urgency } from '@/lib/triage';
import {
  profileConfirmationLineMessage,
  reportConfirmationLineMessage,
  symptomConfirmationLineMessage,
} from '@/lib/line-messages';
import {
  ensureIssueAttachmentColumn,
  ensureIssueUrgencyData,
  getD1,
  getRuntimeConfig,
} from '@/lib/server-db';

type LineProfile = {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
};
type IntakeBody = {
  kind?: 'profile' | 'report' | 'symptom';
  accessToken?: string;
  data?: Record<string, unknown>;
};

async function stableId(value: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return `line-${Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

async function verifyLineUser(accessToken: string) {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const profile = (await response.json()) as LineProfile;
  return profile.userId
    ? {
        userId: profile.userId,
        displayName: profile.displayName || 'ผู้ใช้ LINE',
        avatarUrl: profile.pictureUrl || null,
      }
    : null;
}

async function ensurePatient(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
) {
  const db = getD1();
  const id = await stableId(userId);
  const now = new Date().toISOString();
  await db
    .prepare(`insert into patients (id, line_user_id, display_name, avatar_url, urgency, status, intake_json, created_at, updated_at)
    values (?, ?, ?, ?, 'green', 'awaiting_staff', '{}', ?, ?)
    on conflict(line_user_id) do update set avatar_url = coalesce(excluded.avatar_url, patients.avatar_url), updated_at = excluded.updated_at`)
    .bind(id, userId, displayName, avatarUrl, now, now)
    .run();
  return { id, now };
}

async function pushToChat(userId: string, text: string) {
  const token = getRuntimeConfig().lineToken;
  if (!token) return false;
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
  if (!response.ok)
    console.error('LINE push failed', response.status, await response.text());
  return response.ok;
}

function text(data: Record<string, unknown>, field: string) {
  const value = data[field];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function imageData(data: Record<string, unknown>) {
  const value = typeof data.imageData === 'string' ? data.imageData.trim() : '';
  if (!value) return null;
  const [header, payload] = value.split(',', 2);
  if (
    !/^data:image\/(jpeg|png|webp);base64$/.test(header) ||
    !payload ||
    payload.length > 3000000 ||
    !/^[A-Za-z0-9+/=]+$/.test(payload)
  )
    return undefined;
  return value;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as IntakeBody;
  const accessToken = String(body.accessToken || '');
  if (!accessToken || !body.kind || !body.data)
    return Response.json(
      { error: 'ข้อมูลไม่ครบ กรุณาเปิดแบบฟอร์มจาก LINE อีกครั้ง' },
      { status: 400 },
    );
  const lineProfile = await verifyLineUser(accessToken);
  if (!lineProfile)
    return Response.json(
      { error: 'ยืนยันบัญชี LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดแบบฟอร์มใหม่' },
      { status: 401 },
    );

  const db = getD1();
  const patient = await ensurePatient(
    lineProfile.userId,
    lineProfile.displayName,
    lineProfile.avatarUrl,
  );

  if (body.kind === 'profile') {
    const name = text(body.data, 'name');
    const age = Number(text(body.data, 'age'));
    const phone = text(body.data, 'phone');
    const lineId = text(body.data, 'lineId');
    const normalizedPhone = phone;
    if (
      !name ||
      !lineId ||
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120 ||
      !/^\d{1,10}$/.test(normalizedPhone)
    ) {
      return Response.json(
        { error: 'ข้อมูลประวัติยังไม่ครบหรือไม่ถูกต้อง กรุณาตรวจทุกช่อง' },
        { status: 400 },
      );
    }
    const summary = `ส่งแบบฟอร์มประวัติ\nชื่อ–นามสกุล: ${name}\nอายุ: ${age} ปี\nเบอร์โทรศัพท์: ${phone}\nLINE ID: ${lineId}`;
    const reply = profileConfirmationLineMessage();
    await db
      .prepare(
        `update patients set display_name = ?, age = ?, phone = ?, line_id = ?, procedure = null, discharge_date = null, discharge_day = null, intake_field = null, updated_at = ? where id = ?`,
      )
      .bind(
        name.slice(0, 120),
        age,
        phone.slice(0, 10),
        lineId.slice(0, 80),
        patient.now,
        patient.id,
      )
      .run();
    await db
      .prepare(
        `insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`,
      )
      .bind(patient.id, summary, patient.now)
      .run();
    await db
      .prepare(
        `insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'บันทึกจาก LIFF', ?)`,
      )
      .bind(patient.id, reply, patient.now)
      .run();
    await pushToChat(lineProfile.userId, reply);
    return Response.json({ message: 'ประวัติถูกบันทึกและส่งข้อความยืนยันเข้าแชทแล้ว' });
  }

  if (body.kind === 'report') {
    const subject = text(body.data, 'subject');
    const category = text(body.data, 'category');
    const detail = text(body.data, 'detail');
    const onset = text(body.data, 'onset');
    const attachment = imageData(body.data);
    if (!subject || !REPORT_CATEGORIES.includes(category as (typeof REPORT_CATEGORIES)[number]) || !detail || !onset)
      return Response.json(
        { error: 'ข้อมูลยังไม่ครบหรือประเภทปัญหาไม่ถูกต้อง กรุณาตรวจทุกช่อง' },
        { status: 400 },
      );
    if (attachment === undefined)
      return Response.json(
        { error: 'รูปประกอบไม่ถูกต้องหรือมีขนาดใหญ่เกินไป กรุณาเลือกรูปใหม่' },
        { status: 400 },
      );
    await Promise.all([
      ensureIssueAttachmentColumn(),
      ensureIssueUrgencyData(),
    ]);
    const urgency = classifyReport(category, onset, `${subject} ${detail}`);
    const summary = `แจ้งปัญหาผ่านแบบฟอร์ม\nหัวข้อ: ${subject}\nประเภท: ${category}\nเริ่มพบ: ${onset}\nรายละเอียด: ${detail}${attachment ? '\nรูปประกอบ: แนบแล้ว' : ''}`;
    await db
      .prepare(`insert into issues (patient_id, subject, category, detail, onset, urgency, status, image_data, created_at)
      values (?, ?, ?, ?, ?, ?, 'unanswered', ?, ?)`)
      .bind(
        patient.id,
        subject.slice(0, 120),
        category.slice(0, 80),
        detail.slice(0, 1500),
        onset.slice(0, 80),
        urgency,
        attachment,
        patient.now,
      )
      .run();
    await db
      .prepare(`update patients set urgency = ?, updated_at = ? where id = ?`)
      .bind(urgency, patient.now, patient.id)
      .run();
    await db
      .prepare(
        `insert into messages (patient_id, role, body, reason, created_at) values (?, 'user', ?, 'แจ้งปัญหาจาก LIFF', ?)`,
      )
      .bind(patient.id, summary, patient.now)
      .run();
    const reply = reportConfirmationLineMessage(subject, urgency);
    await db
      .prepare(
        `insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'ยืนยันรับเรื่อง', ?)`,
      )
      .bind(patient.id, reply, patient.now)
      .run();
    await pushToChat(lineProfile.userId, reply);
    return Response.json({
      message: 'ส่งเรื่องให้พยาบาลแล้ว กรุณารอคำตอบในแชท LINE',
      urgency,
    });
  }

  const fields = [
    'symptom',
    'duration',
    'severity',
    'fever',
    'urination',
    'bleeding',
  ] as const;
  const values = Object.fromEntries(
    fields.map((field) => [field, text(body.data!, field)]),
  ) as Record<(typeof fields)[number], string>;
  const missing = fields.filter((field) => !values[field]);
  if (missing.length)
    return Response.json(
      { error: `ข้อมูลยังไม่ครบ กรุณากรอกเพิ่มอีก ${missing.length} ช่อง` },
      { status: 400 },
    );
  let urgency: Urgency = classify(Object.values(values).join(' '));
  if (values.severity === 'รุนแรงมาก' || values.urination === 'ปัสสาวะไม่ออก')
    urgency = 'red';
  const summary = `แจ้งอาการผ่านแบบฟอร์ม\nอาการ: ${values.symptom}\nระยะเวลา: ${values.duration}\nความรุนแรง: ${values.severity}\nไข้: ${values.fever}\nการปัสสาวะ: ${values.urination}\nเลือดออก: ${values.bleeding}`;
  const reply =
    urgency === 'red'
      ? 'ระบบพบข้อมูลที่อาจเร่งด่วน กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที หากฉุกเฉินโทร 1669'
      : 'ระบบบันทึกอาการครบถ้วนแล้ว พยาบาลจะตรวจสอบข้อมูลและตอบกลับทางแชทนี้';
  const confirmation = symptomConfirmationLineMessage(urgency, reply);
  await db
    .prepare(
      `update patients set urgency = ?, status = 'awaiting_staff', intake_field = null, intake_json = ?, updated_at = ? where id = ?`,
    )
    .bind(urgency, JSON.stringify(values), patient.now, patient.id)
    .run();
  await db
    .prepare(
      `insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`,
    )
    .bind(patient.id, summary, patient.now)
    .run();
  await db
    .prepare(
      `insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'คัดกรองจาก LIFF', ?)`,
    )
    .bind(patient.id, confirmation, patient.now)
    .run();
  await pushToChat(lineProfile.userId, confirmation);
  return Response.json({
    message: 'ข้อมูลอาการถูกบันทึกและส่งข้อความยืนยันเข้าแชทแล้ว',
    urgency,
  });
}
