'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardPenLine, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { closeLiff, initializeLiff } from '@/lib/liff-client';

type Mode = 'profile' | 'report';

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
    <header><p>LINE LIFF FORM</p><h1>{isProfile ? 'กรอกประวัติผู้ป่วย' : 'แจ้งปัญหาที่พบ'}</h1><span>{lineName ? `บัญชี LINE: ${lineName}` : 'กำลังเชื่อมต่อกับบัญชี LINE'}</span></header>
    {loading ? <div className="liff-loading">กำลังยืนยันบัญชี LINE…</div> : result ? <div className="success"><CheckCircle2/><h2>บันทึกเรียบร้อย</h2><p>{result.message}</p>{result.urgency && <span className={`result-level ${result.urgency}`}>ระดับการติดตาม: {result.urgency === 'red' ? 'เร่งด่วน' : result.urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ'}</span>}<Button type="button" onClick={closeLiff} className="mt-6 h-11 bg-[#176b87] px-7">กลับไปที่แชท</Button></div> : <form onSubmit={submit}>
      <div className="intake-title">{isProfile ? <ClipboardPenLine/> : <MessageSquareWarning/>}<div><b>{isProfile ? 'ข้อมูลพื้นฐาน' : 'รายละเอียดปัญหา'}</b><small>กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบ</small></div></div>
      {isProfile ? <>
        <label className="field-label">ชื่อ–นามสกุลผู้ป่วย *<input name="name" required maxLength={120} autoComplete="name" placeholder="เช่น นายสมชาย ใจดี"/></label>
        <div className="field-grid"><label className="field-label">อายุ (ปี) *<input name="age" required type="number" min="1" max="120" inputMode="numeric"/></label><label className="field-label">วันที่ออกจากโรงพยาบาล *<input name="dischargeDate" required type="date"/></label></div>
        <label className="field-label">การรักษาหรือหัตถการ *<textarea name="procedure" required maxLength={300} placeholder="เช่น หลังผ่าตัด หรือหลังถอดสายสวน"/></label>
      </> : <>
        <label className="field-label">หัวข้อปัญหา *<input name="subject" required maxLength={120} placeholder="เช่น สายหลวม มีเลือดออก หรือสอบถามการดูแล"/></label>
        <div className="field-grid"><label className="field-label">ประเภทปัญหา *<select name="category" required defaultValue=""><option value="" disabled>เลือกประเภท</option><option>อาการผิดปกติ</option><option>แผลและผิวหนัง</option><option>สายและอุปกรณ์</option><option>การขับถ่ายปัสสาวะ</option><option>ยาและการดูแล</option><option>สอบถามทั่วไป</option><option>อื่น ๆ</option></select></label><label className="field-label">เริ่มพบปัญหาเมื่อไร *<select name="onset" required defaultValue=""><option value="" disabled>เลือกช่วงเวลา</option><option>ภายใน 1 ชั่วโมง</option><option>1–6 ชั่วโมง</option><option>มากกว่า 6 ชั่วโมง</option><option>มากกว่า 1 วัน</option></select></label></div>
        <label className="field-label">รายละเอียดปัญหา *<textarea name="detail" required maxLength={1500} placeholder="อธิบายสิ่งที่พบ อาการ ตำแหน่ง และสิ่งที่ได้ลองทำไปแล้ว"/></label>
        <p className="medical-note">เรื่องที่ส่งจะเข้าสู่แดชบอร์ดพยาบาลและได้รับคำตอบกลับในแชท LINE หากมีอาการรุนแรงหรือฉุกเฉินให้โทร 1669</p>
      </>}
      {error && <p className="error">{error}</p>}
      <Button type="submit" disabled={sending || !accessToken} className="h-12 w-full bg-[#176b87]">{sending ? 'กำลังส่งเรื่อง…' : isProfile ? 'บันทึกประวัติ' : 'ส่งเรื่องให้พยาบาล'}</Button>
    </form>}
  </section></main>;
}
