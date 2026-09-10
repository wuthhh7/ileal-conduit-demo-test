'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, HeartPulse, LayoutDashboard, Menu, RefreshCw, Users, X } from 'lucide-react';
import { useState } from 'react';
import styles from './dashboard.module.css';

const nav = [
  { href: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'รายชื่อผู้ป่วย', icon: Users },
  { href: '/dashboard/assessments', label: 'ผลประเมิน', icon: ClipboardList },
];

export function DashboardShell({ title, description, onRefresh, children }: { title: string; description: string; onRefresh?: () => void; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <main className={styles.app}>
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span><HeartPulse/></span><div><b>Siriraj Urology</b><small>ระบบติดตามผู้ป่วย</small></div></div>
      <button className={styles.closeMenu} onClick={() => setOpen(false)} aria-label="ปิดเมนู"><X/></button>
      <nav>{nav.map((item) => {
        const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={active ? styles.navActive : ''} onClick={() => setOpen(false)}><Icon/>{item.label}</Link>;
      })}</nav>
      <div className={styles.sidebarNote}><b>อัปเดตอัตโนมัติ</b><span>ตรวจสอบข้อมูลใหม่ทุก 10 วินาที</span></div>
    </aside>
    {open && <button className={styles.backdrop} onClick={() => setOpen(false)} aria-label="ปิดเมนู"/>}
    <section className={styles.workspace}>
      <header className={styles.header}>
        <button className={styles.menuButton} onClick={() => setOpen(true)} aria-label="เปิดเมนู"><Menu/></button>
        <div><h1>{title}</h1><p>{description}</p></div>
        {onRefresh && <button className={styles.refreshButton} onClick={onRefresh}><RefreshCw/>รีเฟรช</button>}
      </header>
      <div className={styles.content}>{children}</div>
    </section>
  </main>;
}
