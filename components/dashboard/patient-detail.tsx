'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ClipboardPlus, Clock3, HeartPulse, MessageCircle, MessageSquareWarning, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import type { PatientDetailData } from './types';
import { shortSymptom, statusLabel, thaiDate, urgencyLabel } from './types';
import styles from './dashboard.module.css';

export function PatientDetail({ patientId }: { patientId: string }) {
  const [data, setData] = useState<PatientDetailData | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  async function updateStatus(status: string) {
    if (!data) return;
    setSaving(true);
    const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
    if (response.ok) await load(); else setError('เปลี่ยนสถานะไม่สำเร็จ');
    setSaving(false);
  }

  const symptomMessage = useMemo(() => data?.messages.find((message) => message.role === 'user' && (message.body.startsWith('แจ้งอาการผ่านแบบฟอร์ม') || message.body.startsWith('ส่งแบบฟอร์มแจ้งอาการ'))) || null, [data]);
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  return <DashboardShell title={data?.patient.displayName || 'ข้อมูลผู้ป่วย'} description="ประวัติ อาการ และลำดับการติดต่อของผู้ป่วย" onRefresh={load}>
    <Link href="/dashboard/patients" className={styles.backLink}><ArrowLeft/>กลับไปรายชื่อผู้ป่วย</Link>
    {error && <div className={styles.error}>{error}</div>}
    {!data ? <div className={styles.loadingRows}><i/><i/><i/></div> : <>
      <section className={styles.patientHero}>
        <div className={styles.patientIdentity}><span className={styles.largeAvatar}>{data.patient.displayName.charAt(0) || '?'}</span><div><h2>{data.patient.displayName}</h2><p>LINE ID: {data.patient.lineUserId}</p></div></div>
        <div className={styles.heroBadges}><span className={`${styles.badge} ${styles[data.patient.urgency]}`}>{urgencyLabel[data.patient.urgency]}</span><span className={`${styles.statusDot} ${styles[data.patient.status]}`}>{statusLabel[data.patient.status]}</span></div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.whitePanel}>
          <header className={styles.panelTitle}><span><UserRound/></span><div><small>ข้อมูลพื้นฐาน</small><h2>ประวัติผู้ป่วย</h2></div></header>
          <dl className={styles.detailList}>
            <div><dt>ชื่อ–นามสกุล</dt><dd>{data.patient.displayName}</dd></div>
            <div><dt>อายุ</dt><dd>{data.patient.age ? `${data.patient.age} ปี` : 'ยังไม่ระบุ'}</dd></div>
            <div><dt>วันที่ออกจากโรงพยาบาล</dt><dd>{thaiDate(data.patient.dischargeDate)}</dd></div>
            <div><dt>จำนวนวันหลังออกจากโรงพยาบาล</dt><dd>{data.patient.dischargeDay === null ? 'ยังไม่ระบุ' : `${data.patient.dischargeDay} วัน`}</dd></div>
            <div className={styles.fullRow}><dt>การรักษาหรือหัตถการ</dt><dd>{data.patient.procedure || 'ยังไม่ระบุ'}</dd></div>
          </dl>
        </article>
        <article className={`${styles.whitePanel} ${styles.symptomDetail}`}>
          <header className={styles.panelTitle}><span><ClipboardPlus/></span><div><small>ข้อมูลคัดกรองล่าสุด</small><h2>สรุปอาการ</h2></div></header>
          <div className={styles.symptomLead}>{shortSymptom(symptomMessage?.body || null)}</div>
          {symptomMessage ? <div className={styles.formSummary}>{symptomMessage.body.split('\n').slice(2).map((line) => <p key={line}>{line}</p>)}</div> : <p className={styles.muted}>ผู้ป่วยยังไม่ได้ส่งแบบฟอร์มแจ้งอาการ</p>}
          {symptomMessage && <time><Clock3/>แจ้งเมื่อ {thaiDate(symptomMessage.createdAt)}</time>}
        </article>
      </section>

      <section className={styles.careStatus}>
        <div><small>สถานะการดูแล</small><h2>อัปเดตการติดตามเคส</h2></div>
        <div>{Object.entries(statusLabel).map(([key, label]) => <button key={key} disabled={saving} className={data.patient.status === key ? styles.statusActive : ''} onClick={() => updateStatus(key)}>{label}</button>)}</div>
      </section>

      <section className={styles.issueHistoryPanel}>
        <header className={styles.panelTitle}><span><MessageSquareWarning/></span><div><small>เรียงจากล่าสุด</small><h2>ประวัติการแจ้งปัญหา ({data.issues.length} ครั้ง)</h2></div></header>
        {data.issues.length ? <div className={styles.issueHistoryList}>{data.issues.map((issue) => <article key={issue.id} className={styles.issueHistoryItem}>
          <div className={styles.issueHistoryHeader}><div><span className={`${styles.tableBadge} ${styles[issue.urgency]}`}>{urgencyLabel[issue.urgency]}</span><small>{issue.category}</small></div><time>{thaiDate(issue.createdAt)}</time></div>
          <h3>{issue.subject}</h3><p>{issue.detail}</p>
          {issue.onset && <small className={styles.issueHistoryOnset}><Clock3/>เริ่มพบ: {issue.onset}</small>}
          {issue.status === 'answered' ? <div className={styles.issueHistoryReply}><b><CheckCircle2/>พยาบาลตอบกลับแล้ว</b><p>{issue.replyText}</p><time>{thaiDate(issue.repliedAt)}</time></div> : <Link href={`/dashboard/issues/unanswered#issue-${issue.id}`} className={styles.issueHistoryPending}>ยังไม่ตอบกลับ — ไปที่หน้าตอบกลับ</Link>}
        </article>)}</div> : <div className={styles.emptySmall}>ผู้ป่วยรายนี้ยังไม่เคยแจ้งปัญหา</div>}
      </section>

      <section className={styles.chatPanel}>
        <header className={styles.chatTopbar}>
          <span className={styles.chatProfile}><MessageCircle/></span>
          <div><small>การสนทนาผ่าน LINE OA</small><h2>{data.patient.displayName}</h2></div>
          <span className={styles.chatOnline}>บันทึกข้อความอัตโนมัติ</span>
        </header>
        <div className={styles.lineChat}>{data.messages.length ? data.messages.map((message) => {
          const fromPatient = message.role === 'user';
          const fromNurse = message.role === 'nurse';
          return <article key={message.id} className={`${styles.chatMessage} ${fromPatient ? styles.chatFromPatient : fromNurse ? styles.chatFromNurse : styles.chatFromSystem}`}>
            {!fromPatient && <span className={styles.chatAvatar}><HeartPulse/></span>}
            <div className={styles.chatBubbleGroup}>
              <b>{fromPatient ? 'ผู้ป่วย' : fromNurse ? 'พยาบาล' : 'ระบบช่วยคัดกรอง'}</b>
              <div className={styles.chatBubble}><p>{message.body}</p>{message.reason && <small>{message.reason}</small>}</div>
              <time>{thaiDate(message.createdAt)}</time>
            </div>
            {fromPatient && <span className={styles.chatAvatar}><UserRound/></span>}
          </article>;
        }) : <div className={styles.chatEmpty}><MessageCircle/><b>ยังไม่มีข้อความ</b><span>ข้อความจาก LINE OA จะแสดงในบริเวณนี้</span></div>}</div>
      </section>
    </>}
  </DashboardShell>;
}
