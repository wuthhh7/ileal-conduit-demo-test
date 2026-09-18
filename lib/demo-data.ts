import type { Urgency } from './triage';

export type DemoCase = {
  id: string; name: string; subject: string; category: string; onset: string;
  urgency: Urgency; status: 'answered' | 'unanswered'; createdAt: string;
  repliedAt: string | null; reply: string;
};

// Handwritten synthetic examples only. Never import records or images from production.
export function createDemoCases(now = Date.now()): DemoCase[] {
  return [
    { name: 'ผู้ป่วยจำลอง 01', subject: 'สอบถามอุปกรณ์ดูแลตนเอง', category: 'สอบถามทั่วไป', onset: 'น้อยกว่า 1 ชั่วโมง', urgency: 'green' as const, delay: 12 },
    { name: 'ผู้ป่วยจำลอง 02', subject: 'แจ้งปัญหาปัสสาวะ', category: 'ปัญหาปัสสาวะ', onset: '1–6 ชั่วโมง', urgency: 'yellow' as const, delay: 24 },
    { name: 'ผู้ป่วยจำลอง 03', subject: 'ปัสสาวะไม่ออก', category: 'ปัญหาปัสสาวะ', onset: 'มากกว่า 6 ชั่วโมง', urgency: 'red' as const, delay: null },
    { name: 'ผู้ป่วยจำลอง 04', subject: 'ขอข้อมูลการดูแลถุง', category: 'สอบถามทั่วไป', onset: 'น้อยกว่า 1 ชั่วโมง', urgency: 'green' as const, delay: null },
  ].map((item, index) => ({
    ...item, id: `demo-${index + 1}`, createdAt: new Date(now - (index + 1) * 3600000).toISOString(),
    status: item.delay === null ? 'unanswered' : 'answered',
    repliedAt: item.delay === null ? null : new Date(now - (index + 1) * 3600000 + item.delay * 60000).toISOString(),
    reply: item.delay === null ? '' : 'ข้อความตอบกลับตัวอย่างสำหรับสาธิตเท่านั้น',
  }));
}
