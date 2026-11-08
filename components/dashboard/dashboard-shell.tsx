'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareCheck,
  MessageSquareWarning,
  Moon,
  RefreshCw,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from './brand-mark';
import { PatientAvatar } from './patient-avatar';
import {
  DashboardToastViewport,
  useDashboardNotifications,
} from './dashboard-notifications';
import styles from './dashboard.module.css';

const nav = [
  { href: '/dashboard/analytics', label: 'แดชบอร์ด', icon: LayoutDashboard },
  {
    href: '/dashboard/patients',
    label: 'ผู้ป่วยทั้งหมด',
    icon: Users,
    group: 'ผู้ป่วย',
  },
  {
    href: '/dashboard/issues/unanswered',
    label: 'เรื่องที่ยังไม่ตอบกลับ',
    icon: MessageSquareWarning,
    group: 'ปัญหา',
  },
  {
    href: '/dashboard/issues/answered',
    label: 'เรื่องที่ตอบกลับแล้ว',
    icon: MessageSquareCheck,
    group: 'ปัญหา',
  },
  {
    href: '/dashboard/videos',
    label: 'จัดการคลิปวิดีโอ',
    icon: Clapperboard,
    group: 'เนื้อหา',
  },
];
type DashboardTheme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'ilieal-dashboard-theme';

export function DashboardShell({
  title,
  description,
  onRefresh,
  headerProfile,
  children,
}: {
  title: string;
  description: string;
  onRefresh?: () => void | Promise<void>;
  headerProfile?: { name: string; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<DashboardTheme>('light');
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { notify } = useDashboardNotifications();

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const media = window.matchMedia('(max-width: 900px)');
    const previousOverflow = document.body.style.overflow;
    const syncInert = () => {
      sidebar.inert = media.matches && !open;
      document.body.style.overflow =
        open && media.matches ? 'hidden' : previousOverflow;
    };
    syncInert();
    media.addEventListener('change', syncInert);
    if (open && media.matches)
      sidebar.querySelector<HTMLButtonElement>('button')?.focus();
    function handleKey(event: KeyboardEvent) {
      if (!open || !media.matches) return;
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const controls = Array.from(
        sidebar.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)'),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      media.removeEventListener('change', syncInert);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      sidebar.inert = false;
    };
  }, [open]);

  useEffect(() => {
    let timer: number | undefined;
    try {
      if (window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark')
        timer = window.setTimeout(() => setTheme('dark'), 0);
    } catch {
      // Keep the light theme when browser storage is unavailable.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* Continue without persistence. */
      }
      return next;
    });
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.assign('/dashboard');
    }
  }

  async function refreshDashboard() {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
      notify({
        title: 'ตรวจสอบข้อมูลล่าสุดแล้ว',
        message: 'รายการบนแดชบอร์ดได้รับการอัปเดตเรียบร้อย',
        tone: 'success',
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className={styles.app} data-theme={theme} data-motion="on">
      <a href="#dashboard-content" className={styles.skipLink}>
        ข้ามไปยังเนื้อหา
      </a>
      <aside
        id="dashboard-navigation"
        ref={sidebarRef}
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <div>
            <b>Ilieal Conduit Care</b>
            <small>ระบบติดตามผู้ป่วย</small>
          </div>
        </div>
        <button
          className={styles.closeMenu}
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
        >
          <X />
        </button>
        <nav aria-label="เมนูหลักเจ้าหน้าที่">
          {nav.map((item, index) => {
            const isPatientDetail = /^\/dashboard\/patients\/[^/]+$/.test(
              pathname,
            );
            const startsNewGroup =
              item.group !== undefined && item.group !== nav[index - 1]?.group;
            const groupLabel = item.group === 'ปัญหา' ? 'ปัญหาผู้ป่วย' : item.group;
            const active =
              item.href === '/dashboard/patients'
                ? pathname === item.href || isPatientDetail
                : pathname === item.href;
            const Icon = item.icon;
            return (
              <span key={item.href}>
                {startsNewGroup && groupLabel && (
                  <span className={styles.navGroup}>{groupLabel}</span>
                )}
                <Link
                  href={item.href}
                  className={`${active ? styles.navActive : ''} ${item.group ? styles.navChild : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </Link>
              </span>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarNote}>
            <b>อัปเดตอัตโนมัติ</b>
            <span>ตรวจสอบข้อมูลใหม่ทุก 10 วินาที</span>
          </div>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
            <span>{theme === 'dark' ? 'ธีมสว่าง' : 'ธีมมืด'}</span>
          </button>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            disabled={loggingOut}
          >
            <LogOut />
            {loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
          </button>
        </div>
      </aside>
      {open && (
        <button
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}
      <section className={styles.workspace}>
        <header className={styles.header}>
          <button
            ref={menuButtonRef}
            className={styles.menuButton}
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
            aria-expanded={open}
            aria-controls="dashboard-navigation"
          >
            <Menu />
          </button>
          <div className={styles.headerIdentity}>
            {headerProfile && (
              <PatientAvatar
                name={headerProfile.name}
                avatarUrl={headerProfile.avatarUrl}
                className={styles.headerAvatar}
              />
            )}
            <div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              className={styles.refreshButton}
              onClick={() => void refreshDashboard()}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <RefreshCw />
              {refreshing ? 'กำลังรีเฟรช…' : 'รีเฟรช'}
            </button>
          )}
        </header>
        <div
          id="dashboard-content"
          tabIndex={-1}
          key={pathname}
          className={styles.content}
        >
          {children}
        </div>
      </section>
      <DashboardToastViewport />
    </main>
  );
}
