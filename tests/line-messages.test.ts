import { expect, it } from 'vitest';
import {
  menuGuideLineMessage,
  nurseReplyLineMessage,
  profileConfirmationLineMessage,
  reportConfirmationLineMessage,
  symptomConfirmationLineMessage,
  welcomeLineMessage,
} from '@/lib/line-messages';

it('welcomes patients with the three Rich Menu actions', () => {
  const welcome = welcomeLineMessage();
  expect(welcome).toContain('ยินดีต้อนรับ');
  expect(welcome).toContain('วิดีโอให้ความรู้');
  expect(welcome).toContain('กรอกประวัติ');
  expect(welcome).toContain('แจ้งอาการ');
  expect(menuGuideLineMessage()).toContain('เมนูบริการ');
});

it('keeps form confirmations concise and gives the next step', () => {
  expect(profileConfirmationLineMessage()).toContain('บันทึกประวัติเรียบร้อย');
  expect(profileConfirmationLineMessage()).toContain('แจ้งอาการ');
  const report = reportConfirmationLineMessage('  ถุงปัสสาวะ\nรั่ว  ', 'yellow');
  expect(report).toContain('เรื่อง: ถุงปัสสาวะ รั่ว');
  expect(report).toContain('ระดับการติดตามเบื้องต้น: เฝ้าระวัง');
  expect(report).toContain('พยาบาลจะตรวจสอบและตอบกลับ');
  expect(reportConfirmationLineMessage('หายใจลำบาก', 'red')).toContain(
    'โทร 1669 ทันที',
  );
  expect(symptomConfirmationLineMessage('red', 'กรุณาติดต่อพยาบาล')).toContain(
    'ระดับการติดตามเบื้องต้น: เร่งด่วน\n\nกรุณาติดต่อพยาบาล',
  );
});

it('separates the nurse reply from its issue subject', () => {
  const message = nurseReplyLineMessage(
    '  แผล\nผ่าตัด  ',
    'ตรวจแผลวันละครั้ง\nหากมีข้อสงสัยให้ติดต่อพยาบาล',
  );
  expect(message).toContain('เรื่อง: แผล ผ่าตัด\n\nคำตอบ\n');
  expect(message).toContain('ตรวจแผลวันละครั้ง\nหากมีข้อสงสัยให้ติดต่อพยาบาล');
  expect(message).toContain('เมนูบริการด้านล่าง');
});
