'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardPenLine, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { closeLiff, initializeLiff } from '@/lib/liff-client';

type Mode = 'profile' | 'symptom';

export function LiffIntakeForm({ mode, liffId }: { mode: Mode; liffId: string }) {
  const [accessToken, setAccessToken] = useState('');
  const [lineName, setLineName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; urgency?: string } | null>(null);

  useEffect(() => {
    initializeLiff(liffId)
      .then((session) => {
        if (!session) return;
        setAccessToken(session.accessToken);
        setLineName(session.profile.displayName);
        setLoading(false);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'เปิด LIFF ไม่สำเร็จ');
        setLoading(false);
      });
  }, [liffId]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/liff/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: mode, accessToken, data }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setResult(body);
    else setError(body.error || 'บันทึกข้อมูลไม่สำเร็จ');
    setSending(false);
  }

  const isProfile = mode === 'profile';
  return <main className="form-page intake-page"><section className="form-shell">
    <header><p>LINE LIFF FORM</p><h1>{isProfile ? 'กรอกประวัติผู้ป่วย' : 'แจ้งอาการ'}</h1><span>{lineName ? `บัญชี LINE: ${lineName}` : 'กำลังเชื่อมต่อกับบัญชี LINE'}</span></header>
    {loading ? <div className="liff-loading">กำลังยืนยันบัญชี LINE…</div> : result ? <div className="success"><CheckCircle2/><h2>บันทึกเรียบร้อย</h2><p>{result.message}</p>{result.urgency && <span className={`result-level ${result.urgency}`}>ระดับการติดตาม: {result.urgency === 'red' ? 'เร่งด่วน' : result.urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ'}</span>}<Button type="button" onClick={closeLiff} className="mt-6 h-11 bg-[#176b87] px-7">กลับไปที่แชท</Button></div> : <form onSubmit={submit}>
      <div className="intake-title">{isProfile ? <ClipboardPenLine/> : <Stethoscope/>}<div><b>{isProfile ? 'ข้อมูลพื้นฐาน' : 'รายละเอียดอาการ'}</b><small>กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบ</small></div></div>
      {isProfile ? <>
        <label className="field-label">ชื่อ–นามสกุลผู้ป่วย *<input name="name" required maxLength={120} autoComplete="name" placeholder="เช่น นายสมชาย ใจดี"/></label>
        <div className="field-grid"><label className="field-label">อายุ (ปี) *<input name="age" required type="number" min="1" max="120" inputMode="numeric"/></label><label className="field-label">วันที่หลังออกจากโรงพยาบาล *<input name="dischargeDay" required type="number" min="0" max="365" inputMode="numeric"/></label></div>
        <label className="field-label">การรักษาหรือหัตถการ *<textarea name="procedure" required maxLength={300} placeholder="เช่น หลังผ่าตัด หรือหลังถอดสายสวน"/></label>
      </> : <>
        <label className="field-label">อาการที่พบ *<textarea name="symptom" required maxLength={1000} placeholder="ระบุตำแหน่ง อาการ และสิ่งผิดปกติที่สังเกตพบ"/></label>
        <div className="field-grid"><label className="field-label">เริ่มมีอาการมานานเท่าไร *<select name="duration" required defaultValue=""><option value="" disabled>เลือกช่วงเวลา</option><option>น้อยกว่า 1 ชั่วโมง</option><option>1–6 ชั่วโมง</option><option>มากกว่า 6 ชั่วโมง</option><option>มากกว่า 1 วัน</option></select></label><label className="field-label">ความรุนแรง *<select name="severity" required defaultValue=""><option value="" disabled>เลือกระดับ</option><option>เล็กน้อย</option><option>ปานกลาง</option><option>มาก</option><option>รุนแรงมาก</option></select></label></div>
        <label className="field-label">ไข้หรือหนาวสั่น *<select name="fever" required defaultValue=""><option value="" disabled>เลือกคำตอบ</option><option>มีไข้</option><option>ไม่มีไข้</option><option>ไม่แน่ใจ</option></select></label>
        <label className="field-label">การปัสสาวะ *<select name="urination" required defaultValue=""><option value="" disabled>เลือกคำตอบ</option><option>ปัสสาวะได้ปกติ</option><option>ปัสสาวะได้น้อย</option><option>ปัสสาวะไม่ออก</option><option>ไม่เกี่ยวกับปัสสาวะ</option></select></label>
        <label className="field-label">เลือดออกหรือเลือดปน *<select name="bleeding" required defaultValue=""><option value="" disabled>เลือกคำตอบ</option><option>มีเลือดออก</option><option>ไม่มีเลือดออก</option><option>ไม่แน่ใจ</option></select></label>
        <p className="medical-note">แบบฟอร์มนี้เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัยโรค หากมีอาการรุนแรงให้ติดต่อพยาบาลหรือโทร 1669</p>
      </>}
      {error && <p className="error">{error}</p>}
      <Button type="submit" disabled={sending || !accessToken} className="h-12 w-full bg-[#176b87]">{sending ? 'กำลังบันทึก…' : isProfile ? 'บันทึกประวัติ' : 'ส่งข้อมูลอาการ'}</Button>
    </form>}
  </section></main>;
}
