import { getD1, getRuntimeConfig } from '@/lib/server-db';
import { menuGuideLineMessage, welcomeLineMessage } from '@/lib/line-messages';
import { classify } from '@/lib/triage';

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

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

export async function POST(request: Request) {
  const { lineSecret, nursePhone } = getRuntimeConfig();
  if (!lineSecret) return Response.json({ error: 'LINE is not configured' }, { status: 503 });
  const raw = await request.arrayBuffer();
  const signature = request.headers.get('x-line-signature') || '';
  if (!(await verifySignature(raw, signature, lineSecret))) return Response.json({ error: 'invalid signature' }, { status: 401 });
  let body: { events?: LineEvent[] };
  try {
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.events) || parsed.events.some((event: unknown) => !event || typeof event !== 'object')) {
      return Response.json({ error: 'invalid events' }, { status: 400 });
    }
    body = parsed;
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body.events?.length) return Response.json({ ok: true });
  const db = getD1();

  for (const event of body.events || []) {
    if (!event.source?.userId) continue;
    const patient = await ensurePatient(event.source.userId);
    if (!patient) continue;
    if (event.type === 'follow') {
      await replyLine(event.replyToken, [{ type: 'text', text: welcomeLineMessage() }]);
      continue;
    }
    if (event.type !== 'message' || event.message?.type !== 'text') continue;
    const text = String(event.message.text || '').trim().slice(0, 1000);
    const now = new Date().toISOString();
    await db.prepare(`insert into messages (patient_id, role, body, created_at) values (?, 'user', ?, ?)`).bind(patient.id, text, now).run();
    if (patient.intake_field) {
      await db.prepare(`update patients set intake_field = null, updated_at = ? where id = ?`)
        .bind(now, patient.id).run();
    }

    let reply: { text: string; choices: string[]; urgency?: string; reason?: string };
    if (text === 'เมนู' || text === 'กรอกประวัติ' || text === 'แจ้งอาการ' || text === 'แจ้งปัญหา') {
      const guide = menuGuideLineMessage();
      await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, 'แนะนำ Rich Menu', ?)`)
        .bind(patient.id, guide, now).run();
      await replyLine(event.replyToken, [{ type: 'text', text: guide }]);
      continue;
    } else if (text === 'ติดต่อพยาบาลเร่งด่วน' || text === 'ติดต่อพยาบาล') {
      await db.prepare(`update patients set urgency = 'red', status = 'awaiting_staff', updated_at = ? where id = ?`).bind(now, patient.id).run();
      reply = { text: `กรุณาติดต่อพยาบาลที่ ${nursePhone} หากมีอาการรุนแรงหรือฉุกเฉินให้ไปห้องฉุกเฉินหรือโทร 1669 ทันที`, choices: [], urgency: 'red', reason: 'ผู้ใช้เลือกติดต่อเร่งด่วน' };
    } else {
      const urgency = classify(text);
      reply = urgency === 'red'
        ? { text: 'ระบบพบข้อความที่อาจต้องให้พยาบาลตรวจสอบโดยเร็ว กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที', choices: ['ติดต่อพยาบาล'], urgency, reason: 'พบคำสำคัญเร่งด่วน' }
        : { text: menuGuideLineMessage(), choices: [], urgency };
      await db.prepare(`update patients set urgency = ?, status = 'awaiting_staff', updated_at = ? where id = ?`).bind(urgency, now, patient.id).run();
    }

    await db.prepare(`insert into messages (patient_id, role, body, reason, created_at) values (?, 'bot', ?, ?, ?)`)
      .bind(patient.id, reply.text, reply.reason || null, now).run();
    await replyLine(event.replyToken, [{ type: 'text', text: reply.text, quickReply: quickReply(reply.choices) }]);
  }
  return Response.json({ ok: true });
}
