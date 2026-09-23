export type Urgency = 'green' | 'yellow' | 'red';

export const REPORT_CATEGORIES = [
  'ลำไส้ผิดปกติ',
  'ความผิดปกติของปัสสาวะ',
  'ไข้สูง',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

const questions: Record<string, { text: string; choices: string[] }> = {
  duration: {
    text: 'เริ่มมีอาการมานานเท่าไรแล้วคะ',
    choices: ['น้อยกว่า 1 ชั่วโมง', '1–6 ชั่วโมง', 'มากกว่า 6 ชั่วโมง', 'มากกว่า 1 วัน'],
  },
  severity: {
    text: 'อาการตอนนี้รุนแรงระดับใดคะ',
    choices: ['เล็กน้อย', 'ปานกลาง', 'มาก', 'รุนแรงมาก'],
  },
  fever: { text: 'มีไข้หรือรู้สึกหนาวสั่นร่วมด้วยหรือไม่คะ', choices: ['มีไข้', 'ไม่มีไข้'] },
  urination: {
    text: 'ขณะนี้ปัสสาวะได้เป็นอย่างไรคะ',
    choices: ['ปัสสาวะได้ปกติ', 'ปัสสาวะได้น้อย', 'ปัสสาวะไม่ออก', 'ไม่เกี่ยวกับปัสสาวะ'],
  },
  bleeding: {
    text: 'มีเลือดออกหรือพบเลือดปนหรือไม่คะ',
    choices: ['มีเลือดออก', 'ไม่มีเลือดออก'],
  },
};

export function classify(text: string): Urgency {
  const red = [
    'หมดสติ',
    'หายใจไม่ออก',
    'เลือดออกมาก',
    'ปัสสาวะไม่ออก',
    'เจ็บมาก',
    'ปวดมาก',
    'ไข้สูง',
  ];
  const yellow = ['มีไข้', 'ไข้', 'ปวด', 'แสบ', 'เลือด', 'บวม', 'แผลแดง', 'คลื่นไส้'];
  if (red.some((word) => text.includes(word))) return 'red';
  if (yellow.some((word) => text.includes(word))) return 'yellow';
  return 'green';
}

function onsetLevel(onset: string) {
  const normalized = onset.replace(/\s+/g, '');
  if (normalized.includes('มากกว่า1วัน')) return 3;
  if (normalized.includes('มากกว่า6ชั่วโมง')) return 2;
  if (normalized.includes('1–6ชั่วโมง') || normalized.includes('1-6ชั่วโมง'))
    return 1;
  return 0;
}

/**
 * คัดกรองเรื่องที่ส่งจากฟอร์มแจ้งปัญหาโดยใช้ประเภท + ระยะเวลาร่วมกับข้อความ
 * ผลลัพธ์เป็นเพียงระดับการติดตามเบื้องต้น ไม่ใช่การวินิจฉัยโรค
 */
export function classifyReport(category: string, onset: string, text: string) {
  const categoryKey = category.replace(/\s+/g, '');
  const signalUrgency = classify(`${category} ${text}`);
  const elapsed = onsetLevel(onset);

  // สัญญาณอันตรายที่ระบุชัดเจนต้องมาก่อนกฎของประเภทปัญหา
  if (signalUrgency === 'red') return 'red' as const;

  // “ไข้สูง” เป็นประเภทที่ต้องให้เจ้าหน้าที่ประเมินโดยเร็วตั้งแต่เริ่มพบ
  if (categoryKey.includes('ไข้สูง')) return 'red' as const;

  // ปัญหาปัสสาวะที่ต่อเนื่องเกิน 6 ชั่วโมงให้ยกระดับเป็นเร่งด่วน
  if (categoryKey.includes('ปัสสาวะ'))
    return elapsed >= 2 ? ('red' as const) : ('yellow' as const);

  // การแจ้งปัญหาลำไส้ให้เจ้าหน้าที่เฝ้าระวังตั้งแต่เริ่มพบ
  if (categoryKey.includes('ลำไส้')) return 'yellow' as const;

  // กรณีประเภทใหม่ในอนาคต: อาการที่นานเกิน 1 วันไม่ควรถูกจัดเป็นปกติ
  return elapsed >= 3 ? ('yellow' as const) : signalUrgency;
}

export function nextIntakeReply(
  currentField: string,
  intake: Record<string, string>,
  text: string,
) {
  intake[currentField] = text;
  const urgency = classify(Object.values(intake).join(' '));
  if (urgency === 'red')
    return {
      urgency,
      complete: false,
      nextField: null,
      text: 'ระบบพบข้อมูลที่อาจเป็นอาการเร่งด่วน กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที ไม่ต้องรอกรอกข้อมูลให้ครบ',
      choices: ['ติดต่อพยาบาล', 'ไปห้องฉุกเฉิน'],
      reason: 'พบคำสำคัญในกลุ่มเร่งด่วน',
    };
  const order = [
    'symptom',
    'duration',
    'severity',
    'fever',
    'urination',
    'bleeding',
  ];
  const nextField = order.find((field) => !intake[field]) || null;
  if (nextField)
    return {
      urgency,
      complete: false,
      nextField,
      text: `ข้อมูลยังไม่ครบค่ะ ${questions[nextField].text}`,
      choices: questions[nextField].choices,
      reason: `ขอข้อมูลเพิ่มเติม: ${nextField}`,
    };
  return {
    urgency,
    complete: true,
    nextField: null,
    text: 'ข้อมูลอาการครบถ้วนเบื้องต้นแล้วค่ะ ระบบบันทึกเพื่อส่งให้พยาบาลตรวจสอบต่อ โดยผลนี้ไม่ใช่การวินิจฉัยโรค',
    choices: [],
    reason: 'ข้อมูลอาการครบถ้วน',
  };
}
