'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createDemoCases, type DemoCase } from '@/lib/demo-data';
import { classifyReport } from '@/lib/triage';
import { ServiceMetrics } from '@/components/dashboard/service-metrics';

const labels = { green: 'ปกติ', yellow: 'เฝ้าระวัง', red: 'เร่งด่วน' };
const colors = { green: 'bg-emerald-100 text-emerald-900', yellow: 'bg-amber-100 text-amber-900', red: 'bg-rose-100 text-rose-900' };
const inputStyle = 'mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 focus:outline-teal-600';

export function DemoWorkspace({ initialCases }: { initialCases: DemoCase[] }) {
  const [cases, setCases] = useState<DemoCase[]>(initialCases);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const visible = cases.filter((item) => filter === 'all' || item.urgency === filter);

  function submit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (key: string) => { const value = values.get(key); return typeof value === 'string' ? value.trim() : ''; };
    const category = text('category');
    const onset = text('onset');
    const subject = text('subject');
    if (!subject) return;
    setCases((current) => [{ id: `demo-${crypto.randomUUID()}`, name: 'ผู้ป่วยจำลองใหม่', subject, category, onset,
      urgency: classifyReport(category, onset, subject), status: 'unanswered', createdAt: new Date().toISOString(), repliedAt: null, reply: '' }, ...current]);
    setNotice('รับเคสจำลองแล้ว ลองตอบกลับจากรายการด้านขวา');
    setFilter('all'); form.reset();
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-10">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><Link href="/demo" className="font-bold text-teal-800">ILEAL CONDUIT CARE / DEMO</Link><Link href="/dashboard" className="text-sm underline">เข้าสู่ระบบเจ้าหน้าที่</Link></div>
      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">ข้อมูลจำลอง 100% · ไม่ต้องสมัครสมาชิก</span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-5xl">จากการแจ้งอาการ<br/>สู่การติดตามที่มองเห็นได้</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">ทดลองแจ้งเคส → ดูระดับความสำคัญ → ตอบกลับ → ดูสถิติเปลี่ยนตามการใช้งาน ข้อมูลอยู่ในหน้านี้เท่านั้นและหายเมื่อรีเฟรช ไม่มีการส่งข้อความเข้า LINE กรุณาใช้ข้อความสมมติเท่านั้น</p>
      <ServiceMetrics issues={cases}/>
      <output aria-live="polite" className="my-4 block min-h-6 font-medium text-teal-800">{notice}</output>
      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">1. จำลองฝั่งผู้ป่วย</h2>
          <label className="mt-5 block text-sm font-medium">ประเภทปัญหา<select name="category" className={inputStyle}><option>สอบถามทั่วไป</option><option>ปัญหาปัสสาวะ</option><option>ปัญหาลำไส้</option></select></label>
          <label className="mt-4 block text-sm font-medium">เริ่มพบปัญหา<select name="onset" className={inputStyle}><option>น้อยกว่า 1 ชั่วโมง</option><option>1–6 ชั่วโมง</option><option>มากกว่า 6 ชั่วโมง</option><option>มากกว่า 1 วัน</option></select></label>
          <label className="mt-4 block text-sm font-medium">ข้อความสมมติ<textarea name="subject" required maxLength={500} rows={3} placeholder="เช่น สอบถามการดูแลอุปกรณ์" className={inputStyle}/></label>
          <button className="mt-5 w-full rounded-xl bg-teal-700 p-3 font-semibold text-white hover:bg-teal-800">ส่งเคสจำลอง</button>
          <p className="mt-4 text-xs leading-5 text-slate-500">กฎคัดกรองเป็นต้นแบบเพื่อช่วยจัดลำดับการติดตาม ไม่ใช่การวินิจฉัยหรือคำแนะนำการรักษา</p>
        </form>
        <section aria-label="รายการเคสจำลอง" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">2. จำลองฝั่งพยาบาล</h2><button type="button" onClick={() => { setCases(createDemoCases()); setReplies({}); setFilter('all'); setNotice('รีเซ็ตข้อมูลจำลองแล้ว'); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">เริ่มใหม่</button></div>
          <div className="my-5 flex flex-wrap gap-2">{[['all', 'ทั้งหมด'], ...Object.entries(labels)].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full px-4 py-2 text-sm ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>)}</div>
          <div className="space-y-4">{visible.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex justify-between gap-3"><p className="text-sm text-slate-500">{item.name}</p><span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[item.urgency]}`}>{labels[item.urgency]}</span></div>
            <h3 className="mt-2 font-bold">{item.subject}</h3><p className="mt-1 text-xs text-slate-500">{item.category} · {item.onset}</p>
            {item.status === 'answered' ? <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">ตอบกลับแล้ว: {item.reply}</p> : <form className="mt-3" onSubmit={(event) => { event.preventDefault(); const reply = replies[item.id]?.trim(); if (!reply) return; setCases((current) => current.map((value) => value.id === item.id ? { ...value, status: 'answered', repliedAt: new Date().toISOString(), reply } : value)); setNotice('ตอบกลับเคสจำลองแล้ว สถิติอัปเดตแล้ว'); }}>
              <label className="text-sm">คำตอบจำลองสำหรับ {item.name}<input required maxLength={500} value={replies[item.id] || ''} onChange={(event) => setReplies({ ...replies, [item.id]: event.target.value })} placeholder="พิมพ์ข้อความตอบกลับตัวอย่าง" className={inputStyle}/></label>
              <button className="mt-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">จำลองการตอบกลับ</button>
            </form>}
          </article>)}{!visible.length && <p className="py-8 text-center text-slate-500">ไม่มีเคสในระดับนี้ ลองสร้างเคสใหม่</p>}</div>
        </section>
      </div>
    </div>
  </main>;
}
