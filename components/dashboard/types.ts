export type Urgency = 'red' | 'yellow' | 'green';

export type Patient = {
  id: string;
  lineUserId: string;
  displayName: string;
  avatarUrl: string | null;
  urgency: Urgency;
  status: string;
  age: number | null;
  phone: string | null;
  lineId: string | null;
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
  recent: {
    id: number;
    overall: number;
    ease: number;
    usefulness: number;
    comment: string | null;
    createdAt: string;
  }[];
};

export type Issue = {
  id: string;
  patientId: string;
  lineUserId: string;
  displayName: string;
  avatarUrl: string | null;
  subject: string;
  category: string;
  detail: string;
  onset: string | null;
  urgency: Urgency;
  status: 'unanswered' | 'in_progress' | 'answered';
  imageData: string | null;
  replyText: string | null;
  createdAt: string;
  repliedAt: string | null;
  responseMinutes: number | null;
};

export type ContentAnalytics = {
  pageViews: number;
  pageViewsToday: number;
  pageViews7Days: number;
  videoPlays: number;
  videoPlays7Days: number;
  daily: {
    date: string;
    label: string;
    pageViews: number;
    videoPlays: number;
  }[];
  events: {
    pageViews: string[];
    videoPlays: string[];
  };
  topVideos: {
    id: string;
    title: string;
    posterUrl: string | null;
    durationLabel: string | null;
    views: number;
  }[];
};

export type DashboardSummary = {
  patients: Patient[];
  assessments: Assessment;
  issues: Issue[];
  issueAnalytics: {
    answered: number;
    averageResponseMinutes: number;
    medianResponseMinutes: number;
    respondedWithin24HoursRate: number;
  };
  contentAnalytics: ContentAnalytics;
};
export type PatientDetailData = {
  patient: Patient;
  issues: Issue[];
  messages: {
    id: number;
    role: string;
    body: string;
    reason: string | null;
    createdAt: string;
  }[];
};

export const urgencyLabel: Record<Urgency, string> = {
  red: 'เร่งด่วน',
  yellow: 'เฝ้าระวัง',
  green: 'ปกติ',
};
export const statusLabel: Record<string, string> = {
  awaiting_staff: 'รอเจ้าหน้าที่',
  in_progress: 'กำลังติดตาม',
  resolved: 'เรียบร้อย',
};

export const issueStatusLabel: Record<Issue['status'], string> = {
  unanswered: 'รอคำตอบ',
  in_progress: 'รอคำตอบ',
  answered: 'ตอบกลับแล้ว',
};

export function shortSymptom(value: string | null) {
  if (!value) return 'ยังไม่มีการแจ้งอาการ';
  const line = value.split('\n').find((item) => item.startsWith('อาการ:'));
  return (
    line?.replace(/^อาการ:\s*/, '') ||
    value.replace(/^ส่งแบบฟอร์มแจ้งอาการ\s*/, '').split('\n')[0]
  );
}

export function thaiDate(value: string | null) {
  if (!value) return 'ยังไม่ระบุ';
  const date = new Date(
    value.length === 10 ? `${value}T00:00:00+07:00` : value,
  );
  if (Number.isNaN(date.getTime())) return 'ยังไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: value.length === 10 ? undefined : 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}
