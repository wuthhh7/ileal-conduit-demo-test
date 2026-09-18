'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Users } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { PatientCard } from './patient-card';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

export function DashboardOverview() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;
  const patients = data?.patients || [];
  const red = patients.filter((patient) => patient.urgency === 'red').length;
  const waiting = patients.filter((patient) => patient.status === 'awaiting_staff').length;
  const tracking = patients.filter((patient) => patient.status === 'in_progress').length;
  const priority = patients.filter((patient) => patient.urgency !== 'green' || patient.status === 'awaiting_staff').slice(0, 4);

  return <DashboardShell title="ภาพรวมการดูแลผู้ป่วย" description="เริ่มจากเคสเร่งด่วนและผู้ป่วยที่ยังรอการติดตาม" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.metrics} aria-label="สรุปจำนวนผู้ป่วย">
      <article><span className={styles.metricIcon}><Users/></span><div><small>ผู้ป่วยทั้งหมด</small><strong>{patients.length}</strong><p>รายในระบบ</p></div></article>
      <article className={styles.metricDanger}><span className={styles.metricIcon}><AlertTriangle/></span><div><small>เคสเร่งด่วน</small><strong>{red}</strong><p>ควรตรวจสอบก่อน</p></div></article>
      <article className={styles.metricWarning}><span className={styles.metricIcon}><Clock3/></span><div><small>รอเจ้าหน้าที่</small><strong>{waiting}</strong><p>ยังไม่ได้เริ่มติดตาม</p></div></article>
      <article><span className={styles.metricIcon}><CheckCircle2/></span><div><small>กำลังติดตาม</small><strong>{tracking}</strong><p>อยู่ระหว่างดูแล</p></div></article>
    </section>

    <section className={styles.quickPanelsSingle}>
      <article className={styles.priorityPanel}>
        <header><div><span>ลำดับความสำคัญ</span><h2>ผู้ป่วยที่ควรตรวจสอบ</h2></div><Link href="/dashboard/patients">ดูผู้ป่วยทั้งหมด<ArrowRight/></Link></header>
        {loading ? <div className={styles.loadingRows}><i/><i/><i/></div> : priority.length ? <div className={styles.priorityGrid}>{priority.map((patient) => <PatientCard key={patient.id} patient={patient}/>)}</div> : <div className={styles.empty}><CheckCircle2/><h3>ไม่มีเคสที่ต้องเร่งติดตาม</h3><p>ขณะนี้ผู้ป่วยทุกคนได้รับการตรวจสอบแล้ว</p></div>}
      </article>
    </section>
  </DashboardShell>;
}
