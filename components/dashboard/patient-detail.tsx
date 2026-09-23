'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, ContactRound, MapPin, MessageSquareWarning } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { IssueAttachment } from './issue-attachment';
import type { PatientDetailData } from './types';
import { issueStatusLabel, thaiDate, urgencyLabel } from './types';
import { formatResponseMinutes } from '@/lib/issue-metrics';
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

  return <DashboardShell title={data?.patient.displayName || 'ประวัติผู้ป่วย'} description="ข้อมูลผู้ป่วยและประวัติการแจ้งปัญหา" onRefresh={load} headerProfile={data ? { name: data.patient.displayName, avatarUrl: data.patient.avatarUrl } : undefined}>
    <Link href="/dashboard/patients" className={styles.backLink}><ArrowLeft/>กลับไปรายชื่อผู้ป่วย</Link>
    {error && <div className={styles.error}>{error}</div>}
    {!data ? <div className={styles.loadingRows}><i/><i/><i/></div> : <>
      <section className={styles.patientInfoPanel} aria-labelledby="patient-profile-title">
        <header className={styles.panelTitle}><span><ContactRound/></span><div><h2 id="patient-profile-title">ประวัติผู้ป่วยจาก LINE</h2><p>ข้อมูลที่ผู้ป่วยกรอกผ่านแบบฟอร์มประวัติ</p></div></header>
        <dl className={styles.patientInfoGrid}>
          <div><dt>ชื่อ–นามสกุล</dt><dd>{data.patient.displayName || 'ยังไม่ได้กรอก'}</dd></div>
          <div><dt>อายุ</dt><dd>{data.patient.age ? `${data.patient.age} ปี` : 'ยังไม่ได้กรอก'}</dd></div>
          <div><dt>เบอร์โทรศัพท์</dt><dd>{data.patient.phone || 'ยังไม่ได้กรอก'}</dd></div>
          <div><dt>LINE ID</dt><dd>{data.patient.lineId || 'ยังไม่ได้กรอก'}</dd></div>
        </dl>
      </section>
      <section className={styles.issueHistoryPanel}>
        <header className={styles.panelTitle}><span><MessageSquareWarning/></span><div><small>เรียงจากล่าสุด</small><h2>ประวัติการแจ้งปัญหา ({data.issues.length} ครั้ง)</h2></div></header>
        {data.issues.length ? <div className={styles.issueHistoryList}>{data.issues.map((issue) => <article key={issue.id} className={styles.issueHistoryItem}>
          <div className={styles.issueHistoryHeader}><div><span className={`${styles.tableBadge} ${styles[issue.urgency]}`}>{urgencyLabel[issue.urgency]}</span><small>{issue.category}</small></div><time>{thaiDate(issue.createdAt)}</time></div>
          <h3>{issue.subject}</h3><p>{issue.detail}</p>
          {issue.imageData && <IssueAttachment src={issue.imageData} alt="รูปประกอบจากผู้ป่วย"/>}
          {issue.onset && <small className={styles.issueHistoryOnset}><Clock3/>เริ่มพบ: {issue.onset}</small>}
          {issue.location && <small className={styles.issueHistoryOnset}><MapPin/>ตำแหน่ง: {issue.location}</small>}
          {issue.status === 'answered' ? <div className={styles.issueHistoryReply}><b><CheckCircle2/>พยาบาลตอบกลับแล้ว</b><p>{issue.replyText}</p><time>{thaiDate(issue.repliedAt)} · ใช้เวลา {formatResponseMinutes(issue.responseMinutes)}</time></div> : <Link href={`/dashboard/issues/${issue.status === 'in_progress' ? 'in-progress' : 'unanswered'}#issue-${issue.id}`} className={styles.issueHistoryPending}>{issueStatusLabel[issue.status]} — ไปที่หน้าตรวจสอบ</Link>}
        </article>)}</div> : <div className={styles.emptySmall}>ผู้ป่วยรายนี้ยังไม่เคยแจ้งปัญหา</div>}
      </section>
    </>}
  </DashboardShell>;
}
