'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, MessageSquareWarning } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import type { PatientDetailData } from './types';
import { thaiDate, urgencyLabel } from './types';
import styles from './dashboard.module.css';

export function PatientDetail({ patientId }: { patientId: string }) {
  const [data, setData] = useState<PatientDetailData | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}`, { cache: 'no-store' });
    if (response.status === 401) { setNeedsLogin(true); return; }
    if (!response.ok) { setError(response.status === 404 ? 'ไม่พบข้อมูลผู้ป่วยรายนี้' : 'โหลดข้อมูลไม่สำเร็จ'); return; }
    setData(await response.json());
    setNeedsLogin(false);
    setError('');
  }, [patientId]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  return <DashboardShell title={data?.patient.displayName || 'ประวัติการแจ้งปัญหา'} description="ประวัติการแจ้งปัญหาของผู้ป่วย เรียงจากล่าสุด" onRefresh={load}>
    <Link href="/dashboard/patients" className={styles.backLink}><ArrowLeft/>กลับไปรายชื่อผู้ป่วย</Link>
    {error && <div className={styles.error}>{error}</div>}
    {!data ? <div className={styles.loadingRows}><i/><i/><i/></div> : <section className={styles.issueHistoryPanel}>
        <header className={styles.panelTitle}><span><MessageSquareWarning/></span><div><small>เรียงจากล่าสุด</small><h2>ประวัติการแจ้งปัญหา ({data.issues.length} ครั้ง)</h2></div></header>
        {data.issues.length ? <div className={styles.issueHistoryList}>{data.issues.map((issue) => <article key={issue.id} className={styles.issueHistoryItem}>
          <div className={styles.issueHistoryHeader}><div><span className={`${styles.tableBadge} ${styles[issue.urgency]}`}>{urgencyLabel[issue.urgency]}</span><small>{issue.category}</small></div><time>{thaiDate(issue.createdAt)}</time></div>
          <h3>{issue.subject}</h3><p>{issue.detail}</p>
          {issue.onset && <small className={styles.issueHistoryOnset}><Clock3/>เริ่มพบ: {issue.onset}</small>}
          {issue.status === 'answered' ? <div className={styles.issueHistoryReply}><b><CheckCircle2/>พยาบาลตอบกลับแล้ว</b><p>{issue.replyText}</p><time>{thaiDate(issue.repliedAt)}</time></div> : <Link href={`/dashboard/issues/unanswered#issue-${issue.id}`} className={styles.issueHistoryPending}>ยังไม่ตอบกลับ — ไปที่หน้าตอบกลับ</Link>}
        </article>)}</div> : <div className={styles.emptySmall}>ผู้ป่วยรายนี้ยังไม่เคยแจ้งปัญหา</div>}
      </section>}
  </DashboardShell>;
}
