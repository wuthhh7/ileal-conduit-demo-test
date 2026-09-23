import type { Urgency } from './triage';

const menuHint = 'แตะ “เมนูบริการ” ด้านล่างของแชทเพื่อเลือกสิ่งที่ต้องการ';

const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export function welcomeLineMessage() {
  return [
    'ยินดีต้อนรับสู่ Ilieal Conduit Care 👋',
    'ระบบติดตามและดูแลผู้ป่วยผ่าน LINE',
    '',
    menuHint,
    '• วิดีโอให้ความรู้ — ดูคลิปการดูแลตนเอง',
    '• กรอกประวัติ — บันทึกข้อมูลก่อนเริ่มติดตาม',
    '• แจ้งอาการ — ส่งเรื่องให้พยาบาลตรวจสอบ',
    '',
    'เมื่อพยาบาลตอบกลับ คุณจะได้รับข้อความในแชทนี้',
  ].join('\n');
}

export function menuGuideLineMessage() {
  return [
    menuHint,
    '',
    'กรอกประวัติและแจ้งอาการได้จาก Rich Menu เท่านั้น',
    'หากไม่เห็นเมนู ให้แตะ “เมนูบริการ” ที่แถบด้านล่าง',
  ].join('\n');
}

export function profileConfirmationLineMessage() {
  return [
    '✅ บันทึกประวัติเรียบร้อย',
    '',
    'ข้อมูลของคุณถูกส่งให้ทีมพยาบาลแล้ว',
    'หากต้องการแจ้งอาการ ให้แตะ “แจ้งอาการ” ในเมนูบริการด้านล่าง',
  ].join('\n');
}

export function reportConfirmationLineMessage(
  subject: string,
  urgency: Urgency,
) {
  const urgencyText =
    urgency === 'red' ? 'เร่งด่วน' : urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ';
  return [
    '📩 รับเรื่องแจ้งอาการแล้ว',
    '',
    `เรื่อง: ${oneLine(subject)}`,
    `ระดับการติดตามเบื้องต้น: ${urgencyText}`,
    '',
    'พยาบาลจะตรวจสอบและตอบกลับในแชทนี้',
    ...(urgency === 'red'
      ? ['', 'หากมีอาการรุนแรงหรือฉุกเฉิน ให้ไปห้องฉุกเฉินหรือโทร 1669 ทันที']
      : []),
  ].join('\n');
}

export function symptomConfirmationLineMessage(
  urgency: Urgency,
  reply: string,
) {
  const urgencyText =
    urgency === 'red' ? 'เร่งด่วน' : urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ';
  return [
    '📩 รับข้อมูลแจ้งอาการแล้ว',
    '',
    `ระดับการติดตามเบื้องต้น: ${urgencyText}`,
    '',
    reply.trim(),
  ].join('\n');
}

export function nurseReplyLineMessage(subject: string, reply: string) {
  return [
    '👩‍⚕️ ข้อความตอบกลับจากพยาบาล',
    `เรื่อง: ${oneLine(subject)}`,
    '',
    'คำตอบ',
    reply.trim(),
    '',
    'หากต้องการแจ้งอาการเพิ่มเติม ให้ใช้ “แจ้งอาการ” ในเมนูบริการด้านล่าง',
  ].join('\n');
}
