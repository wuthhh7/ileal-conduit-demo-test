'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, HeartPulse, Menu, RefreshCw, UserCheck, UserRoundX, Users, X } from 'lucide-react';
import { useState } from 'react';
import styles from './dashboard.module.css';

const nav = [
  { href: '/dashboard/patients', label: 'ผู้ป่วยทั้งหมด', icon: Users, group: 'ผู้ป่วย' },
  { href: '/dashboard/patients/accepted', label: 'เคสที่รับเรื่อง', icon: UserCheck, group: 'ผู้ป่วย' },
  { href: '/dashboard/patients/unaccepted', label: 'ยังไม่รับเรื่อง', icon: UserRoundX, group: 'ผู้ป่วย' },
  { href: '/dashboard/analytics', label: 'วิเคราะห์ สถิติ', icon: BarChart3 },
  { href: '/dashboard/assessments', label: 'ผลประเมิน', icon: ClipboardList },
];

export function DashboardShell({ title, description, onRefresh, children }: { title: string; description: string; onRefresh?: () => void; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <main className={styles.app}>
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span><HeartPulse/></span><div><b>Ilieal Conduit Care</b><small>ระบบติดตามผู้ป่วย</small></div></div>
      <button className={styles.closeMenu} onClick={() => setOpen(false)} aria-label="ปิดเมนู"><X/></button>
      <nav><span className={styles.navGroup}>ผู้ป่วย</span>{nav.map((item, index) => {
        const isPatientDetail = /^\/dashboard\/patients\/[^/]+$/.test(pathname) && !pathname.endsWith('/accepted') && !pathname.endsWith('/unaccepted');
        const active = item.href === '/dashboard/patients' ? pathname === item.href || isPatientDetail : pathname === item.href;
        const Icon = item.icon;
        return <span key={item.href}>{index === 3 && <span className={styles.navGroup}>รายงาน</span>}<Link href={item.href} className={`${active ? styles.navActive : ''} ${item.group ? styles.navChild : ''}`} onClick={() => setOpen(false)}><Icon/>{item.label}</Link></span>;
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
