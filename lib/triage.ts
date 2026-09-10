export type Urgency = 'green' | 'yellow' | 'red';

const questions: Record<string, { text: string; choices: string[] }> = {
  duration: { text: 'เริ่มมีอาการมานานเท่าไรแล้วคะ', choices: ['น้อยกว่า 1 ชั่วโมง', '1–6 ชั่วโมง', 'มากกว่า 6 ชั่วโมง', 'มากกว่า 1 วัน'] },
  severity: { text: 'อาการตอนนี้รุนแรงระดับใดคะ', choices: ['เล็กน้อย', 'ปานกลาง', 'มาก', 'รุนแรงมาก'] },
  fever: { text: 'มีไข้หรือรู้สึกหนาวสั่นร่วมด้วยหรือไม่คะ', choices: ['มีไข้', 'ไม่มีไข้'] },
  urination: { text: 'ขณะนี้ปัสสาวะได้เป็นอย่างไรคะ', choices: ['ปัสสาวะได้ปกติ', 'ปัสสาวะได้น้อย', 'ปัสสาวะไม่ออก', 'ไม่เกี่ยวกับปัสสาวะ'] },
  bleeding: { text: 'มีเลือดออกหรือพบเลือดปนหรือไม่คะ', choices: ['มีเลือดออก', 'ไม่มีเลือดออก'] },
};

export function classify(text: string): Urgency {
  const red = ['หมดสติ', 'หายใจไม่ออก', 'เลือดออกมาก', 'ปัสสาวะไม่ออก', 'เจ็บมาก', 'ปวดมาก', 'ไข้สูง'];
  const yellow = ['มีไข้', 'ไข้', 'ปวด', 'แสบ', 'เลือด', 'บวม', 'แผลแดง', 'คลื่นไส้'];
  if (red.some((word) => text.includes(word))) return 'red';
  if (yellow.some((word) => text.includes(word))) return 'yellow';
  return 'green';
}

export function nextIntakeReply(currentField: string, intake: Record<string, string>, text: string) {
  intake[currentField] = text;
  const urgency = classify(Object.values(intake).join(' '));
  if (urgency === 'red') return { urgency, complete: false, nextField: null, text: 'ระบบพบข้อมูลที่อาจเป็นอาการเร่งด่วน กรุณาติดต่อพยาบาลหรือไปห้องฉุกเฉินทันที ไม่ต้องรอกรอกข้อมูลให้ครบ', choices: ['ติดต่อพยาบาล', 'ไปห้องฉุกเฉิน'], reason: 'พบคำสำคัญในกลุ่มเร่งด่วน' };
  const order = ['symptom', 'duration', 'severity', 'fever', 'urination', 'bleeding'];
  const nextField = order.find((field) => !intake[field]) || null;
  if (nextField) return { urgency, complete: false, nextField, text: `ข้อมูลยังไม่ครบค่ะ ${questions[nextField].text}`, choices: questions[nextField].choices, reason: `ขอข้อมูลเพิ่มเติม: ${nextField}` };
  return { urgency, complete: true, nextField: null, text: 'ข้อมูลอาการครบถ้วนเบื้องต้นแล้วค่ะ ระบบบันทึกเพื่อส่งให้พยาบาลตรวจสอบต่อ โดยผลนี้ไม่ใช่การวินิจฉัยโรค', choices: [], reason: 'ข้อมูลอาการครบถ้วน' };
}
