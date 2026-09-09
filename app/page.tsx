import Link from 'next/link';
import { Activity, BookOpen, ClipboardCheck, LayoutDashboard, ShieldCheck } from 'lucide-react';

const cards = [
  { href: '/content/health', title: 'ข้อมูลสุขภาพ', text: 'พื้นที่สำหรับเนื้อหาสุขภาพที่จะเพิ่มภายหลัง', icon: BookOpen },
  { href: '/content/care', title: 'การดูแลผู้ป่วย', text: 'พื้นที่สำหรับคำแนะนำการดูแลที่จะเพิ่มภายหลัง', icon: Activity },
  { href: '/assessment', title: 'แบบประเมิน', text: 'ประเมินความพึงพอใจหลังใช้งานระบบ', icon: ClipboardCheck },
];

export default function Home() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#176b87] font-serif text-2xl text-white">S</span><div><b>Siriraj Urology Care</b><p className="text-sm text-slate-500">ระบบติดตามผู้ป่วยหลังกลับบ้าน</p></div></div>
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#183153] px-4 py-2.5 text-sm font-bold text-white"><LayoutDashboard className="size-4"/> Dashboard</Link>
    </div></header>
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="max-w-3xl"><p className="mb-3 text-sm font-bold tracking-[.18em] text-[#15998d]">PATIENT SUPPORT</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">ศูนย์ข้อมูลและติดตามอาการผู้ป่วย</h1><p className="mt-5 text-lg leading-8 text-slate-600">เว็บสำหรับเปิดจาก Rich Menu ใน LINE Official Account และเชื่อมข้อมูลเข้าสู่ Dashboard ของเจ้าหน้าที่</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">{cards.map(({href,title,text,icon:Icon}) => <Link key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="grid size-12 place-items-center rounded-2xl bg-[#e8f6f4] text-[#148d82]"><Icon/></span><h2 className="mt-6 text-xl font-bold">{title}</h2><p className="mt-2 leading-7 text-slate-500">{text}</p><span className="mt-6 inline-block font-bold text-[#176b87]">เปิดหน้า →</span></Link>)}</div>
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><ShieldCheck className="mt-0.5 size-5 shrink-0"/><p>ระบบอยู่ในช่วงทดลอง ไม่ใช้วินิจฉัยโรค หากมีอาการรุนแรงให้ติดต่อพยาบาลหรือไปโรงพยาบาลทันที</p></div>
    </section>
  </main>;
}
