export type Urgency = 'red' | 'yellow' | 'green';

export type Patient = {
  id: string;
  lineUserId: string;
  displayName: string;
  urgency: Urgency;
  status: string;
  age: number | null;
  procedure: string | null;
  dischargeDate: string | null;
  dischargeDay: number | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  symptomSummary: string | null;
  symptomUpdatedAt: string | null;
};

export type Assessment = {
  count: number;
  averageOverall: number;
  averageEase: number;
  averageUsefulness: number;
  positiveRate: number;
  distribution: { score: number; count: number }[];
  recent: { id: number; overall: number; ease: number; usefulness: number; comment: string | null; createdAt: string }[];
};

export type Issue = {
  id: string;
  patientId: string;
  lineUserId: string;
  displayName: string;
  subject: string;
  category: string;
  detail: string;
  onset: string | null;
  urgency: Urgency;
  status: 'unanswered' | 'answered';
  replyText: string | null;
  createdAt: string;
  repliedAt: string | null;
};

export type DashboardSummary = { patients: Patient[]; assessments: Assessment; issues: Issue[] };
export type PatientDetailData = { patient: Patient; messages: { id: number; role: string; body: string; reason: string | null; createdAt: string }[] };

export const urgencyLabel: Record<Urgency, string> = { red: 'เร่งด่วน', yellow: 'เฝ้าระวัง', green: 'ปกติ' };
export const statusLabel: Record<string, string> = { awaiting_staff: 'รอเจ้าหน้าที่', in_progress: 'กำลังติดตาม', resolved: 'เรียบร้อย' };

export function shortSymptom(value: string | null) {
  if (!value) return 'ยังไม่มีการแจ้งอาการ';
  const line = value.split('\n').find((item) => item.startsWith('อาการ:'));
  return line?.replace(/^อาการ:\s*/, '') || value.replace(/^ส่งแบบฟอร์มแจ้งอาการ\s*/, '').split('\n')[0];
}

export function thaiDate(value: string | null) {
  if (!value) return 'ยังไม่ระบุ';
  const date = new Date(value.length === 10 ? `${value}T00:00:00+07:00` : value);
  if (Number.isNaN(date.getTime())) return 'ยังไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: value.length === 10 ? undefined : 'short', timeZone: 'Asia/Bangkok' }).format(date);
}
