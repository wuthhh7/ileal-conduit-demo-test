import { describe, expect, it } from 'vitest';
import { classify, classifyReport, nextIntakeReply, REPORT_CATEGORIES } from '@/lib/triage';

describe('existing triage policy regression (not clinical validation)', () => {
  it.each(['หมดสติ', 'หายใจไม่ออก', 'ปัสสาวะไม่ออก', 'เลือดออกมาก'])('prioritizes explicit urgent signal: %s', (text) => {
    expect(classify(text)).toBe('red');
    expect(classifyReport('สอบถามทั่วไป', 'น้อยกว่า 1 ชั่วโมง', text)).toBe('red');
  });
  it.each([
    ['น้อยกว่า 1 ชั่วโมง', 'yellow'], ['1–6 ชั่วโมง', 'yellow'],
    ['มากกว่า 6 ชั่วโมง', 'red'], ['มากกว่า 1 วัน', 'red'],
  ])('uses urinary category and onset %s', (onset, expected) => expect(classifyReport('ปัญหาปัสสาวะ', onset, '')).toBe(expected));
  it('keeps a short general question normal', () => expect(classifyReport('สอบถามทั่วไป', 'น้อยกว่า 1 ชั่วโมง', 'สอบถามอุปกรณ์')).toBe('green'));
  it('escalates prolonged reports according to current policy', () => expect(classifyReport('อื่นๆ', 'มากกว่า 1 วัน', '')).toBe('yellow'));
  it('supports the new surgical-wound category with a watch level', () => {
    expect(REPORT_CATEGORIES).toContain('แผลผ่าตัดผิดปกติ');
    expect(classifyReport('แผลผ่าตัดผิดปกติ', 'น้อยกว่า 1 ชั่วโมง', '')).toBe('yellow');
  });
  it('keeps explicit danger signals above the new category rule', () => {
    expect(classifyReport('แผลผ่าตัดผิดปกติ', 'น้อยกว่า 1 ชั่วโมง', 'เลือดออกมาก')).toBe('red');
  });
  it('asks for missing fields', () => expect(nextIntakeReply('symptom', {}, 'สอบถาม').nextField).toBe('duration'));
  it('interrupts intake for urgent signals', () => {
    const result = nextIntakeReply('symptom', {}, 'หายใจไม่ออก');
    expect(result.urgency).toBe('red'); expect(result.nextField).toBeNull(); expect(result.complete).toBe(false);
  });
  it('marks intake complete only when every field exists', () => expect(nextIntakeReply('bleeding', {
    symptom: 'สอบถาม', duration: 'น้อยกว่า 1 ชั่วโมง', severity: 'เล็กน้อย', fever: 'ไม่มีไข้', urination: 'ปัสสาวะได้ปกติ',
  }, 'ไม่มีเลือดออก').complete).toBe(true));
});
