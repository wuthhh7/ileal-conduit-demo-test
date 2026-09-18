'use client';

import Link from 'next/link';
import { BellRing, CheckCircle2, CircleAlert, X } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { DashboardSummary } from './types';
import styles from './dashboard.module.css';

type NotificationTone = 'info' | 'success' | 'urgent';

type NotificationInput = {
  title: string;
  message: string;
  tone?: NotificationTone;
  href?: string;
};

type DashboardToast = NotificationInput & {
  id: number;
  closing: boolean;
};

type NotificationContextValue = {
  notify: (notification: NotificationInput) => void;
  dismiss: (id: number) => void;
  toasts: DashboardToast[];
};

const NOTIFICATION_EVENT = 'ilieal:dashboard-notification';

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function DashboardNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<DashboardToast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number[]>());
  const knownIssueIds = useRef<Set<string> | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, closing: true } : toast,
      ),
    );
    const removeTimer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(id);
    }, 220);
    const currentTimers = timers.current.get(id) || [];
    timers.current.set(id, [...currentTimers, removeTimer]);
  }, []);

  const notify = useCallback(
    ({ tone = 'info', ...notification }: NotificationInput) => {
      const id = ++nextId.current;
      setToasts((current) => [
        ...current.slice(-2),
        { id, tone, closing: false, ...notification },
      ]);
      const dismissTimer = window.setTimeout(() => dismiss(id), 5_200);
      timers.current.set(id, [dismissTimer]);
    },
    [dismiss],
  );

  useEffect(() => {
    let disposed = false;
    const activeTimers = timers.current;

    async function checkForNewIssues() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!response.ok || disposed) return;
        const data = (await response.json()) as DashboardSummary;
        const issueIds = new Set(data.issues.map((issue) => issue.id));

        if (knownIssueIds.current) {
          const newIssues = data.issues.filter(
            (issue) =>
              issue.status === 'unanswered' &&
              !knownIssueIds.current?.has(issue.id),
          );
          if (newIssues.length === 1) {
            const issue = newIssues[0];
            notify({
              title:
                issue.urgency === 'red' ? 'มีเรื่องเร่งด่วนใหม่' : 'มีปัญหาใหม่เข้ามา',
              message: `${issue.displayName}: ${issue.subject}`,
              tone: issue.urgency === 'red' ? 'urgent' : 'info',
              href: `/dashboard/issues/unanswered#issue-${issue.id}`,
            });
          } else if (newIssues.length > 1) {
            notify({
              title: `มีปัญหาใหม่ ${newIssues.length} เรื่อง`,
              message: 'เปิดรายการที่ยังไม่ตอบกลับเพื่อตรวจสอบ',
              tone: newIssues.some((issue) => issue.urgency === 'red')
                ? 'urgent'
                : 'info',
              href: '/dashboard/issues/unanswered',
            });
          }
        }
        knownIssueIds.current = issueIds;
      } catch {
        // The page already reports connection errors; keep realtime checks quiet.
      }
    }

    const initialTimer = window.setTimeout(() => void checkForNewIssues(), 0);
    const pollTimer = window.setInterval(
      () => void checkForNewIssues(),
      10_000,
    );
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkForNewIssues();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      for (const toastTimers of activeTimers.values()) {
        toastTimers.forEach((timer) => window.clearTimeout(timer));
      }
      activeTimers.clear();
    };
  }, [notify]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const notification = (event as CustomEvent<NotificationInput>).detail;
      if (notification?.title && notification?.message) notify(notification);
    };
    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () =>
      window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, [notify]);

  return (
    <NotificationContext.Provider value={{ notify, dismiss, toasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useDashboardNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useDashboardNotifications must be used within DashboardNotificationProvider',
    );
  }
  return context;
}

export function DashboardToastViewport() {
  const { dismiss, toasts } = useDashboardNotifications();

  return (
    <section
      className={styles.toastViewport}
      aria-label="การแจ้งเตือน"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'urgent'
              ? CircleAlert
              : BellRing;
        return (
          <article
            key={toast.id}
            className={`${styles.dashboardToast} ${styles[`toast_${toast.tone}`]}`}
            data-state={toast.closing ? 'closing' : 'open'}
          >
            <span className={styles.toastIcon}>
              <Icon />
            </span>
            <div className={styles.toastCopy}>
              <b>{toast.title}</b>
              <p>{toast.message}</p>
              {toast.href && (
                <Link href={toast.href} onClick={() => dismiss(toast.id)}>
                  เปิดดูรายละเอียด
                </Link>
              )}
            </div>
            <button
              type="button"
              className={styles.toastDismiss}
              onClick={() => dismiss(toast.id)}
              aria-label={`ปิดการแจ้งเตือน ${toast.title}`}
            >
              <X />
            </button>
          </article>
        );
      })}
    </section>
  );
}
