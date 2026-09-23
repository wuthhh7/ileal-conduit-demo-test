'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircleReply,
  Search,
  Send,
} from 'lucide-react';
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { useDashboardNotifications } from './dashboard-notifications';
import { IssueAttachment } from './issue-attachment';
import { PatientAvatar } from './patient-avatar';
import type { Issue } from './types';
import { issueStatusLabel, thaiDate, urgencyLabel } from './types';
import { formatResponseMinutes } from '@/lib/issue-metrics';
import { REPORT_CATEGORIES } from '@/lib/triage';
import styles from './dashboard.module.css';

export function IssueDirectory({ view }: { view: Issue['status'] }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | Issue['urgency']>('all');
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { notify } = useDashboardNotifications();

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/issues', { cache: 'no-store' });
      if (response.status === 401) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error('load failed');
      const body = (await response.json()) as { issues: Issue[] };
      setIssues(body.issues || []);
      setNeedsLogin(false);
      setError('');
    } catch {
      setError('โหลดรายการปัญหาไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);
    const timer = window.setInterval(() => {
      void load();
    }, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  const visibleIssues = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th');
    return issues.filter(
      (issue) =>
        issue.status === view &&
        (categoryFilter === 'all' || issue.category === categoryFilter) &&
        (urgencyFilter === 'all' || issue.urgency === urgencyFilter) &&
        (!normalized ||
          [issue.displayName, issue.subject, issue.category, issue.location, issue.detail]
            .join(' ')
            .toLocaleLowerCase('th')
            .includes(normalized)),
    );
  }, [categoryFilter, issues, query, urgencyFilter, view]);

  async function startReview(issue: Issue) {
    setUpdatingId(issue.id);
    setError('');
    const response = await fetch(`/api/issues/${encodeURIComponent(issue.id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      notify({
        title: 'เริ่มตรวจสอบแล้ว',
        message: `เรื่อง “${issue.subject}” ย้ายไปอยู่ในรายการกำลังตรวจสอบ`,
        tone: 'success',
        href: '/dashboard/issues/in-progress',
      });
      await load();
    } else {
      const message = body.error || 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่';
      setError(message);
      notify({ title: 'ยังเปลี่ยนสถานะไม่ได้', message, tone: 'urgent' });
    }
    setUpdatingId(null);
  }

  async function reply(event: SyntheticEvent<HTMLFormElement>, issue: Issue) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('reply');
    const replyText = typeof value === 'string' ? value.trim() : '';
    if (!replyText) return;
    setSendingId(issue.id);
    setError('');
    const response = await fetch(
      `/api/issues/${encodeURIComponent(issue.id)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setActiveReply(null);
      notify({
        title: 'ตอบกลับแล้ว',
        message: `ส่งคำตอบเรื่อง “${issue.subject}” เข้า LINE เรียบร้อย`,
        tone: 'success',
        href: '/dashboard/issues/answered',
      });
      await load();
    } else {
      const message = body.error || 'ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่';
      setError(message);
      notify({
        title: 'ยังส่งคำตอบไม่ได้',
        message,
        tone: 'urgent',
      });
    }
    setSendingId(null);
  }

  if (needsLogin) return <DashboardLogin onSuccess={load} />;
  const unanswered = view === 'unanswered';
  const pageCopy = {
    unanswered: {
      title: 'เรื่องที่ยังไม่ตอบกลับ',
      description: 'ปัญหาที่ผู้ป่วยส่งจาก LINE และยังไม่ได้เริ่มตรวจสอบ',
    },
    in_progress: {
      title: 'กำลังตรวจสอบ',
      description: 'ปัญหาที่พยาบาลกำลังตรวจสอบก่อนตอบกลับผู้ป่วย',
    },
    answered: {
      title: 'เรื่องที่ตอบกลับแล้ว',
      description: 'ประวัติเรื่องที่พยาบาลตอบกลับทาง LINE เรียบร้อยแล้ว',
    },
  }[view];
  return (
    <DashboardShell
      title={pageCopy.title}
      description={pageCopy.description}
      onRefresh={load}
    >
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.issueToolbar}>
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อผู้ป่วย หัวข้อ หรือรายละเอียด..."
          />
        </label>
        <label className={styles.selectFilter}>
          ประเภท
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">ทั้งหมด</option>
            {REPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className={styles.selectFilter}>
          ระดับ
          <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value as typeof urgencyFilter)}>
            <option value="all">ทั้งหมด</option>
            <option value="red">เร่งด่วน</option>
            <option value="yellow">เฝ้าระวัง</option>
            <option value="green">ปกติ</option>
          </select>
        </label>
        <span>{visibleIssues.length} เรื่อง</span>
      </div>
      {loading ? (
        <div className={styles.loadingRows}>
          <i />
          <i />
          <i />
        </div>
      ) : visibleIssues.length ? (
        <section className={styles.issueGrid}>
          {visibleIssues.map((issue) => (
            <article
              id={`issue-${issue.id}`}
              key={issue.id}
              className={`${styles.issueCard} ${styles[`issue_${issue.urgency}`]}`}
            >
              <header>
                <div>
                  <span
                    className={`${styles.tableBadge} ${styles[issue.urgency]}`}
                  >
                    {urgencyLabel[issue.urgency]}
                  </span>
                  <small>{issueStatusLabel[issue.status]}</small>
                  <small>เรื่อง #{issue.id}</small>
                </div>
                <time>{thaiDate(issue.createdAt)}</time>
              </header>
              <div className={styles.issueBody}>
                <p>{issue.category}</p>
                <h2>{issue.subject}</h2>
                <div className={styles.issueDetail}>{issue.detail}</div>
                {issue.onset && (
                  <span className={styles.issueOnset}>
                    <Clock3 />
                    เริ่มพบ: {issue.onset}
                  </span>
                )}
                {issue.location && (
                  <span className={styles.issueOnset}>
                    <MapPin />
                    ตำแหน่ง: {issue.location}
                  </span>
                )}
                {issue.imageData && (
                  <IssueAttachment
                    src={issue.imageData}
                    alt="รูปประกอบจากผู้ป่วย"
                  />
                )}
              </div>
              <footer>
                <Link href={`/dashboard/patients/${issue.patientId}`}>
                  <PatientAvatar
                    name={issue.displayName}
                    avatarUrl={issue.avatarUrl}
                    className={styles.miniAvatar}
                  />
                  <div>
                    <small>ผู้ป่วย</small>
                    <b>{issue.displayName}</b>
                  </div>
                </Link>
                <div className={styles.issueActions}>
                  {unanswered && (
                    <button onClick={() => void startReview(issue)} disabled={updatingId === issue.id}>
                      <ClipboardCheck />
                      {updatingId === issue.id ? 'กำลังอัปเดต…' : 'เริ่มตรวจสอบ'}
                    </button>
                  )}
                  {view !== 'answered' ? (
                    <button
                      onClick={() =>
                        setActiveReply((current) =>
                          current === issue.id ? null : issue.id,
                        )
                      }
                    >
                      <MessageCircleReply />
                      {activeReply === issue.id ? 'ยกเลิก' : 'ตอบกลับ'}
                    </button>
                  ) : null}
                </div>
              </footer>
              {unanswered && activeReply === issue.id && (
                <form
                  className={styles.issueReplyForm}
                  onSubmit={(event) => reply(event, issue)}
                >
                  <label htmlFor={`reply-${issue.id}`}>คำตอบจากพยาบาล</label>
                  <textarea
                    id={`reply-${issue.id}`}
                    name="reply"
                    required
                    maxLength={2000}
                    placeholder="พิมพ์คำแนะนำหรือคำตอบที่จะส่งเข้า LINE ของผู้ป่วย..."
                  />
                  <button type="submit" disabled={sendingId === issue.id}>
                    <Send />
                    {sendingId === issue.id ? 'กำลังส่ง…' : 'ส่งคำตอบเข้า LINE'}
                  </button>
                  <small>เมื่อส่งสำเร็จ เรื่องจะย้ายไปหน้า “ตอบกลับแล้ว” อัตโนมัติ</small>
                </form>
              )}
              {!unanswered && (
                <div className={styles.issueAnswered}>
                  <div>
                    <CheckCircle2 />
                    <b>คำตอบจากพยาบาล</b>
                    <time>{thaiDate(issue.repliedAt)}</time>
                  </div>
                  <p>{issue.replyText}</p>
                  <small>ใช้เวลาตอบกลับ {formatResponseMinutes(issue.responseMinutes)}</small>
                </div>
              )}
            </article>
          ))}
        </section>
      ) : (
        <div className={styles.empty}>
          {unanswered ? <MessageCircleReply /> : <CheckCircle2 />}
          <h2>{unanswered ? 'ไม่มีเรื่องที่รอตอบกลับ' : 'ยังไม่มีเรื่องที่ตอบกลับแล้ว'}</h2>
          <p>
            {query
              ? 'ลองเปลี่ยนคำค้นหา'
              : unanswered
                ? 'เรื่องใหม่จาก LINE จะแสดงที่หน้านี้'
                : 'เรื่องจะย้ายมาหน้านี้หลังส่งคำตอบสำเร็จ'}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
