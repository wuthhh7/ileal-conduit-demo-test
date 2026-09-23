'use client';

import { type ChangeEvent, type SyntheticEvent, useEffect, useState } from 'react';
import NextImage from 'next/image';
import { CheckCircle2, ClipboardPenLine, ImagePlus, MessageSquareWarning, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { closeLiff, initializeLiff } from '@/lib/liff-client';
import { REPORT_CATEGORIES } from '@/lib/triage';

type Mode = 'profile' | 'report';

type Attachment = { dataUrl: string; name: string; size: number };

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1280;

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('อ่านรูปไม่สำเร็จ'));
    reader.onerror = () => reject(new Error('อ่านรูปไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}

async function prepareImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('รูปมีขนาดใหญ่เกิน 6 MB กรุณาเลือกภาพที่เล็กลง');

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('เปิดรูปนี้ไม่ได้ กรุณาลองเลือกรูปอื่น'));
      element.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('เตรียมรูปไม่สำเร็จ');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) throw new Error('เตรียมรูปไม่สำเร็จ');
    return { dataUrl: await readBlobAsDataUrl(blob), name: file.name, size: blob.size };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function LiffIntakeForm({ mode, liffId }: { mode: Mode; liffId: string }) {
  const [accessToken, setAccessToken] = useState('');
  const [lineName, setLineName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [preparingAttachment, setPreparingAttachment] = useState(false);
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
    const formData = new FormData(event.currentTarget);
    formData.delete('attachment');
    const data = Object.fromEntries(formData);
    if (attachment) data.imageData = attachment.dataUrl;
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

  async function chooseAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreparingAttachment(true);
    setError('');
    try {
      setAttachment(await prepareImage(file));
    } catch (cause) {
      setAttachment(null);
      setError(cause instanceof Error ? cause.message : 'แนบรูปไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setPreparingAttachment(false);
    }
  }

  const isProfile = mode === 'profile';
  return <main className="form-page intake-page"><section className="form-shell">
    <header><h1>{isProfile ? 'กรอกประวัติผู้ป่วย' : 'แจ้งปัญหาที่พบ'}</h1><span>{lineName ? `บัญชี LINE: ${lineName}` : 'กำลังเชื่อมต่อกับบัญชี LINE'}</span></header>
    {loading ? <div className="liff-loading">กำลังยืนยันบัญชี LINE…</div> : result ? <div className="success"><CheckCircle2/><h2>บันทึกเรียบร้อย</h2><p>{result.message}</p>{result.urgency && <span className={`result-level ${result.urgency}`}>ระดับการติดตาม: {result.urgency === 'red' ? 'เร่งด่วน' : result.urgency === 'yellow' ? 'เฝ้าระวัง' : 'ปกติ'}</span>}<Button type="button" onClick={closeLiff} className="mt-6 h-11 bg-[#147d91] px-7">กลับไปที่แชท</Button></div> : <form onSubmit={submit}>
      <div className="intake-title">{isProfile ? <ClipboardPenLine/> : <MessageSquareWarning/>}<div><b>{isProfile ? 'ข้อมูลพื้นฐาน' : 'รายละเอียดปัญหา'}</b><small>กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบ</small></div></div>
      {isProfile ? <>
        <label className="field-label">ชื่อ–นามสกุลผู้ป่วย *<input name="name" required maxLength={120} autoComplete="name" placeholder="เช่น ประวิทย์ จันทร์ดวง"/></label>
        <div className="field-grid"><label className="field-label">อายุ (ปี) *<input name="age" required type="number" min="1" max="120" inputMode="numeric"/></label><label className="field-label">เบอร์โทรศัพท์ *<input name="phone" required type="text" maxLength={10} inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{1,10}" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10); }} placeholder="เช่น 0812345678"/></label></div>
        <label className="field-label">LINE ID *<input name="lineId" required maxLength={80} autoCapitalize="none" spellCheck={false} placeholder="กรอก LINE ID สำหรับติดต่อ"/></label>
      </> : <>
        <label className="field-label">หัวข้อปัญหา *<input name="subject" required maxLength={120} placeholder="เช่น สายหลวม มีเลือดออก หรือสอบถามการดูแล"/></label>
        <div className="field-grid"><label className="field-label">ประเภทปัญหา *<select name="category" required defaultValue=""><option value="" disabled>เลือกประเภท</option>{REPORT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">เริ่มพบปัญหาเมื่อไร *<select name="onset" required defaultValue=""><option value="" disabled>เลือกช่วงเวลา</option><option>ภายใน 1 ชั่วโมง</option><option>1–6 ชั่วโมง</option><option>มากกว่า 6 ชั่วโมง</option><option>มากกว่า 1 วัน</option></select></label></div>
        <label className="field-label">ตำแหน่งที่พบปัญหา *<input name="location" required maxLength={160} placeholder="เช่น รอบแผลผ่าตัด ด้านซ้ายของหน้าท้อง หรือบริเวณถุงปัสสาวะ"/></label>
        <label className="field-label">รายละเอียดปัญหา *<textarea name="detail" required maxLength={1500} placeholder="อธิบายสิ่งที่พบ อาการ ตำแหน่ง และสิ่งที่ได้ลองทำไปแล้ว"/></label>
        <div className="attachment-field">
          <div className="attachment-heading"><span>รูปประกอบ</span><small>ไม่บังคับ</small></div>
          <label htmlFor="issue-attachment" className="attachment-picker">
            <ImagePlus aria-hidden="true"/>
            <span><b>{preparingAttachment ? 'กำลังเตรียมรูป…' : 'แนบรูปภาพ'}</b><small>เลือกจากโทรศัพท์ได้ 1 รูป ระบบจะย่อขนาดให้อัตโนมัติ</small></span>
          </label>
          <input id="issue-attachment" name="attachment" type="file" accept="image/*" className="attachment-input-hidden" onChange={chooseAttachment} disabled={preparingAttachment}/>
          {attachment && <div className="attachment-preview"><NextImage src={attachment.dataUrl} alt="ตัวอย่างรูปที่แนบ" width={72} height={72} unoptimized/><div><b>{attachment.name}</b><small>พร้อมแนบแล้ว · {(attachment.size / 1024).toFixed(0)} KB</small></div><button type="button" className="attachment-remove" onClick={() => setAttachment(null)} aria-label="ลบรูปที่แนบ"><X aria-hidden="true"/></button></div>}
        </div>
        <p className="medical-note">เรื่องที่ส่งจะเข้าสู่แดชบอร์ดพยาบาลและได้รับคำตอบกลับในแชท LINE หากมีอาการรุนแรงหรือฉุกเฉินให้โทร 1669</p>
      </>}
      {error && <p className="error">{error}</p>}
      <Button type="submit" disabled={sending || preparingAttachment || !accessToken} className="h-12 w-full bg-[#147d91]">{sending ? 'กำลังส่งเรื่อง…' : isProfile ? 'บันทึกประวัติ' : 'ส่งเรื่องให้พยาบาล'}</Button>
    </form>}
  </section></main>;
}
