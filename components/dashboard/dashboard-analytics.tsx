'use client';

import { Activity, CircleAlert, Clock3, UserCheck, UsersRound } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

export function DashboardAnalytics() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  const patients = data?.patients || [];
  const accepted = patients.filter((patient) => patient.status !== 'awaiting_staff').length;
  const waiting = patients.filter((patient) => patient.status === 'awaiting_staff').length;
  const urgent = patients.filter((patient) => patient.urgency === 'red').length;
  const maxStatus = Math.max(patients.length, 1);
  const statusRows = [
    { label: 'ยังไม่รับเรื่อง', value: waiting, tone: 'warning' },
    { label: 'กำลังติดตาม', value: patients.filter((patient) => patient.status === 'in_progress').length, tone: 'blue' },
    { label: 'เรียบร้อย', value: patients.filter((patient) => patient.status === 'resolved').length, tone: 'green' },
  ];
  const urgencyRows = [
    { label: 'เร่งด่วน', value: urgent, tone: 'red' },
    { label: 'เฝ้าระวัง', value: patients.filter((patient) => patient.urgency === 'yellow').length, tone: 'warning' },
    { label: 'ปกติ', value: patients.filter((patient) => patient.urgency === 'green').length, tone: 'green' },
  ];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const value = patients.filter((patient) => {
      const created = new Date(patient.createdAt);
      return created >= date && created < next;
    }).length;
    return { label: new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' }).format(date), value };
  });
  const maxDay = Math.max(...days.map((day) => day.value), 1);

  return <DashboardShell title="วิเคราะห์ สถิติ" description="ภาพรวมภาระงาน ระดับความเร่งด่วน และแนวโน้มผู้ป่วย" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.metrics}>
      <article><span className={styles.metricIcon}><UsersRound/></span><div><small>ผู้ป่วยทั้งหมด</small><strong>{patients.length}</strong><p>รายในระบบ</p></div></article>
      <article><span className={styles.metricIcon}><UserCheck/></span><div><small>เคสที่รับเรื่อง</small><strong>{accepted}</strong><p>กำลังติดตามและเสร็จสิ้น</p></div></article>
      <article className={styles.metricWarning}><span className={styles.metricIcon}><Clock3/></span><div><small>ยังไม่รับเรื่อง</small><strong>{waiting}</strong><p>รอเจ้าหน้าที่ตรวจสอบ</p></div></article>
      <article className={styles.metricDanger}><span className={styles.metricIcon}><CircleAlert/></span><div><small>เคสเร่งด่วน</small><strong>{urgent}</strong><p>ควรตรวจสอบก่อน</p></div></article>
    </section>

    {loading && !data ? <div className={styles.loadingRows}><i/><i/></div> : <section className={styles.analyticsGrid}>
      <article className={styles.whitePanel}><header><span>ภาระงาน</span><h2>สถานะการรับเรื่อง</h2></header><div className={styles.distributionRows}>{statusRows.map((row) => <DistributionRow key={row.label} {...row} max={maxStatus}/>)}</div></article>
      <article className={styles.whitePanel}><header><span>การคัดกรอง</span><h2>ระดับความเร่งด่วน</h2></header><div className={styles.distributionRows}>{urgencyRows.map((row) => <DistributionRow key={row.label} {...row} max={maxStatus}/>)}</div></article>
      <article className={`${styles.whitePanel} ${styles.wideAnalytics}`}><header><span>7 วันล่าสุด</span><h2>ผู้ป่วยที่เพิ่มเข้าระบบ</h2></header><div className={styles.dailyBars}>{days.map((day) => <div key={day.label}><strong>{day.value}</strong><span><i style={{ height: `${Math.max((day.value / maxDay) * 100, day.value ? 12 : 2)}%` }}/></span><small>{day.label}</small></div>)}</div></article>
      <article className={`${styles.whitePanel} ${styles.assessmentStat}`}><header><span>ผลประเมิน</span><h2>คุณภาพการใช้งาน</h2></header><div><span className={styles.analyticsIcon}><Activity/></span><strong>{Number(data?.assessments.averageOverall || 0).toFixed(1)}<small>/5</small></strong><p>คะแนนภาพรวม จาก {Number(data?.assessments.count || 0)} แบบประเมิน</p><b>{Number(data?.assessments.positiveRate || 0).toFixed(0)}% ให้คะแนนเชิงบวก</b></div></article>
    </section>}
  </DashboardShell>;
}

function DistributionRow({ label, value, tone, max }: { label: string; value: number; tone: string; max: number }) {
  return <div><div><span>{label}</span><b>{value} ราย</b></div><span><i className={styles[`bar_${tone}`]} style={{ width: `${(value / max) * 100}%` }}/></span></div>;
}
