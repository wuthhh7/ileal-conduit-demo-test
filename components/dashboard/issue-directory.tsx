'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Clock3,
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
import { thaiDate, urgencyLabel } from './types';
import styles from './dashboard.module.css';

export function IssueDirectory({ view }: { view: 'unanswered' | 'answered' }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
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
        (!normalized ||
          [issue.displayName, issue.subject, issue.category, issue.detail]
            .join(' ')
            .toLocaleLowerCase('th')
            .includes(normalized)),
    );
  }, [issues, query, view]);

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
  return (
    <DashboardShell
      title={unanswered ? 'เรื่องที่ยังไม่ตอบกลับ' : 'เรื่องที่ตอบกลับแล้ว'}
      description={
        unanswered
          ? 'ปัญหาที่ผู้ป่วยส่งจาก LINE และกำลังรอคำตอบจากพยาบาล'
          : 'ประวัติเรื่องที่พยาบาลตอบกลับทาง LINE เรียบร้อยแล้ว'
      }
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
                {unanswered && (
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
                )}
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
