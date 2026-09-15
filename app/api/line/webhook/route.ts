import { getD1, getRuntimeConfig } from '@/lib/server-db';
import { classify, nextIntakeReply } from '@/lib/triage';

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

async function verifySignature(raw: ArrayBuffer, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, raw));
  const expected = btoa(String.fromCharCode(...signed));
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}

async function stableId(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `line-${Array.from(new Uint8Array(hash)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function quickReply(choices: string[]) {
  if (!choices.length) return undefined;
  return { items: choices.slice(0, 13).map((label) => ({ type: 'action', action: { type: 'message', label: label.slice(0, 20), text: label } })) };
}

async function replyLine(replyToken: string | undefined, messages: unknown[]) {
  const token = getRuntimeConfig().lineToken;
  if (!replyToken || !token) return;
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!response.ok) console.error('LINE reply failed', response.status, await response.text());
}

function welcomeFlex(profileUrl: string, reportUrl: string) {
  return {
    type: 'flex',
    altText: 'กรอกประวัติหรือแจ้งปัญหา',
    contents: {
      type: 'carousel',
      contents: [
        { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: 'กรอกประวัติ', weight: 'bold', size: 'xl', color: '#183153' },
          { type: 'text', text: 'บันทึกข้อมูลพื้นฐานก่อนเริ่มติดตามอาการ', wrap: true, color: '#66758a' },
          { type: 'button', style: 'primary', color: '#176b87', action: { type: 'uri', label: 'เปิดแบบฟอร์ม', uri: profileUrl } },
        ] } },
        { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: 'แจ้งปัญหา', weight: 'bold', size: 'xl', color: '#183153' },
          { type: 'text', text: 'ส่งเรื่องให้พยาบาลตรวจสอบและตอบกลับทาง LINE', wrap: true, color: '#66758a' },
          { type: 'button', style: 'primary', color: '#15a394', action: { type: 'uri', label: 'เปิดแบบฟอร์ม', uri: reportUrl } },
        ] } },
      ],
    },
  };
}

async function getLineProfile(lineUserId: string) {
  const token = getRuntimeConfig().lineToken;
  if (!token) return null;
  const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) return null;
  return response.json() as Promise<{ displayName?: string; pictureUrl?: string }>;
}

async function ensurePatient(lineUserId: string) {
  const db = getD1();
  const id = await stableId(lineUserId);
  const now = new Date().toISOString();
  const profile = await getLineProfile(lineUserId);
  const displayName = profile?.displayName || 'ผู้ใช้ LINE (ยังไม่กรอกประวัติ)';
  await db.prepare(`insert into patients (id, line_user_id, display_name, avatar_url, urgency, status, intake_json, created_at, updated_at)
    values (?, ?, ?, ?, 'green', 'awaiting_staff', '{}', ?, ?)
    on conflict(line_user_id) do update set avatar_url = coalesce(excluded.avatar_url, patients.avatar_url),
      display_name = case when patients.display_name = 'ผู้ใช้ LINE (ยังไม่กรอกประวัติ)' then excluded.display_name else patients.display_name end,
      updated_at = excluded.updated_at`)
    .bind(id, lineUserId, displayName, profile?.pictureUrl || null, now, now).run();
  return db.prepare(`select * from patients where line_user_id = ?`).bind(lineUserId).first<Record<string, unknown>>();
}

async function handleProfile(patient: Record<string, unknown>, text: string) {
  const db = getD1();
  const id = stringValue(patient.id);
  const field = stringValue(patient.intake_field);
  const now = new Date().toISOString();
  if (field === 'profile_name') {
    await db.prepare(`update patients set display_name = ?, intake_field = 'profile_age', updated_at = ? where id = ?`).bind(text.slice(0, 120), now, id).run();
    return { text: 'อายุเท่าไรคะ กรุณาพิมพ์เป็นตัวเลข', choices: [] };
  }
  if (field === 'profile_age') {
    const age = Number(text.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(age) || age < 1 || age > 120) return { text: 'กรุณาพิมพ์อายุเป็นตัวเลขระหว่าง 1–120 ปีค่ะ', choices: [] };
    await db.prepare(`update patients set age = ?, intake_field = 'profile_procedure', updated_at = ? where id = ?`).bind(age, now, id).run();
    return { text: 'กรุณาระบุการรักษาหรือหัตถการ เช่น หลังผ่าตัดหรือหลังถอดสายสวน', choices: [] };
  }
  if (field === 'profile_procedure') {
    await db.prepare(`update patients set procedure = ?, intake_field = 'profile_discharge', updated_at = ? where id = ?`).bind(text.slice(0, 300), now, id).run();
    return { text: 'วันนี้เป็นวันที่เท่าไรหลังออกจากโรงพยาบาลคะ กรุณาพิมพ์เป็นตัวเลข', choices: [] };
  }
  const day = Number(text.replace(/[^0-9]/g, ''));
  if (!Number.isInteger(day) || day < 0 || day > 365) return { text: 'กรุณาพิมพ์จำนวนวันเป็นตัวเลข 0–365 ค่ะ', choices: [] };
  await db.prepare(`update patients set discharge_day = ?, intake_field = null, updated_at = ? where id = ?`).bind(day, now, id).run();
  return { text: 'บันทึกประวัติเบื้องต้นครบแล้วค่ะ คุณสามารถเลือก “แจ้งอาการ” ได้ทันที', choices: ['แจ้งอาการ'] };
}

export async function POST(request: Request) {
  const { lineSecret, nursePhone, liffProfileUrl, liffSymptomUrl } = getRuntimeConfig();
  if (!lineSecret) return Response.json({ error: 'LINE is not configured' }, { status: 503 });
  const raw = await request.arrayBuffer();
  const signature = request.headers.get('x-line-signature') || '';
  if (!(await verifySignature(raw, signature, lineSecret))) return Response.json({ error: 'invalid signature' }, { status: 401 });
  const body = JSON.parse(new TextDecoder().decode(raw)) as { events?: LineEvent[] };
  const db = getD1();

  for (const event of body.events || []) {
    if (!event.source?.userId) continue;
    const patient = await ensurePatient(event.source.userId);
    if (!patient) continue;
    if (event.type === 'follow') {
      await replyLine(event.replyToken, [welcomeFlex(liffProfileUrl, liffSymptomUrl)]);
      continue;
    }
    if (event.type !== 'message' || event.message?.type !== 'text') continue;
    const text = String(event.message.text || '').trim().slice(0, 1000);
    const now = new Date().toISOString();
    await db.prepare(`insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`).bind(patient.id, text, now).run();

    let reply: { text: string; choices: string[]; urgency?: string; reason?: string };
    if (text === 'เมนู' || text === 'กรอกประวัติ' || text === 'แจ้งอาการ' || text === 'แจ้งปัญหา') {
      await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', 'เปิดเมนูแบบฟอร์ม LIFF', 'แสดงเมนู', ?)`).bind(patient.id, now).run();
      await replyLine(event.replyToken, [welcomeFlex(liffProfileUrl, liffSymptomUrl)]);
      continue;
    } else if (text === 'ติดต่อพยาบาลเร่งด่วน' || text === 'ติดต่อพยาบาล') {
      await db.prepare(`update patients set urgency = 'red', status = 'awaiting_staff', updated_at = ? where id = ?`).bind(now, patient.id).run();
      reply = { text: `กรุณาติดต่อพยาบาลที่ ${nursePhone} หากมีอาการรุนแรงหรือฉุกเฉินให้ไปห้องฉุกเฉินหรือโทร 1669 ทันที`, choices: [], urgency: 'red', reason: 'ผู้ใช้เลือกติดต่อเร่งด่วน' };
    } else if (stringValue(patient.intake_field).startsWith('profile_')) {
      reply = await handleProfile(patient, text);
    } else if (patient.intake_field) {
      const intake = JSON.parse(stringValue(patient.intake_json, '{}')) as Record<string, string>;
      const result = nextIntakeReply(stringValue(patient.intake_field), intake, text);
      await db.prepare(`update patients set urgency = ?, status = 'awaiting_staff', intake_field = ?, intake_json = ?, updated_at = ? where id = ?`)
        .bind(result.urgency, result.nextField, JSON.stringify(intake), now, patient.id).run();
      reply = result;
    } else {
      const urgency = classify(text);
      reply = urgency === 'red'
        ? { text: 'ระบบพบข้อความที่อาจต้องให้พยาบาลตรวจสอบโดยเร็ว กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที', choices: ['ติดต่อพยาบาล'], urgency, reason: 'พบคำสำคัญเร่งด่วน' }
        : { text: 'กรุณาเลือกสิ่งที่ต้องการทำค่ะ', choices: ['กรอกประวัติ', 'แจ้งปัญหา'], urgency };
      await db.prepare(`update patients set urgency = ?, status = 'awaiting_staff', updated_at = ? where id = ?`).bind(urgency, now, patient.id).run();
    }

    await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, ?, ?)`)
      .bind(patient.id, reply.text, reply.reason || null, now).run();
    await replyLine(event.replyToken, [{ type: 'text', text: reply.text, quickReply: quickReply(reply.choices) }]);
  }
  return Response.json({ ok: true });
}
