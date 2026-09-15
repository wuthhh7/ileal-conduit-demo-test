'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, History, ShieldCheck, Tickets } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { PatientAvatar } from './patient-avatar';
import { thaiDate, urgencyLabel } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

export function DashboardAnalytics() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  const patients = data?.patients || [];
  const issues = data?.issues || [];
  const answered = issues.filter((issue) => issue.status === 'answered').length;
  const unanswered = issues.filter((issue) => issue.status === 'unanswered').length;
  const urgent = issues.filter((issue) => issue.status === 'unanswered' && issue.urgency === 'red').length;
  const reportingPatients = new Set(issues.map((issue) => issue.patientId)).size;
  const attention = issues.filter((issue) => issue.status === 'unanswered').sort((a, b) => {
    const weight = { red: 3, yellow: 2, green: 1 };
    const score = (issue: typeof a) => weight[issue.urgency];
    return score(b) - score(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 4);
  const latestPatients = patients.map((patient) => {
    const patientIssues = issues.filter((issue) => issue.patientId === patient.id);
    const latestIssueAt = patientIssues.reduce<string | null>((latest, issue) => !latest || new Date(issue.createdAt) > new Date(latest) ? issue.createdAt : latest, null);
    return { ...patient, issueCount: patientIssues.length, latestIssueAt };
  }).filter((patient) => patient.issueCount > 0)
    .sort((a, b) => new Date(b.latestIssueAt || 0).getTime() - new Date(a.latestIssueAt || 0).getTime())
    .slice(0, 10);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const added = issues.filter((issue) => {
      const created = new Date(issue.createdAt);
      return created >= date && created < next;
    });
    return {
      label: new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' }).format(date),
      total: added.length,
      urgent: added.filter((issue) => issue.urgency === 'red').length,
    };
  });
  const chartMax = Math.max(...days.flatMap((day) => [day.total, day.urgent]), 1);
  const greenCount = issues.filter((issue) => issue.urgency === 'green').length;
  const yellowCount = issues.filter((issue) => issue.urgency === 'yellow').length;
  const redCount = issues.filter((issue) => issue.urgency === 'red').length;
  const greenPercent = issues.length ? (greenCount / issues.length) * 100 : 0;
  const yellowPercent = issues.length ? (yellowCount / issues.length) * 100 : 0;
  const donut = issues.length ? `conic-gradient(#55a985 0 ${greenPercent}%, #d99a28 ${greenPercent}% ${greenPercent + yellowPercent}%, #d55757 ${greenPercent + yellowPercent}% 100%)` : '#e8eef0';

  return <DashboardShell title="แดชบอร์ด" description="ภาพรวมปัญหาที่ผู้ป่วยแจ้งและสถานะการตอบกลับของพยาบาล" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.dashboardKpis}>
      <Kpi icon={<Tickets/>} label="ปัญหาทั้งหมด" value={issues.length} note={`จากผู้ป่วย ${reportingPatients} ราย`}/>
      <Kpi icon={<CheckCircle2/>} label="ตอบกลับแล้ว" value={answered} note="ส่งคำตอบเข้า LINE แล้ว"/>
      <Kpi icon={<Clock3/>} label="ยังไม่ตอบกลับ" value={unanswered} note="รอพยาบาลตอบกลับ" tone="warning"/>
      <Kpi icon={<CircleAlert/>} label="เรื่องเร่งด่วน" value={urgent} note="ยังรอคำตอบ" tone="danger"/>
    </section>

    {loading && !data ? <div className={styles.loadingRows}><i/><i/><i/></div> : <>
      <section className={styles.dashboardMainGrid}>
        <article className={`${styles.dashboardCard} ${styles.trendCard}`}>
          <header><div><small>7 วันล่าสุด</small><h2>แนวโน้มปัญหาที่แจ้งเข้ามา</h2></div><div className={styles.chartLegend}><span><i/>เรื่องใหม่</span><span><i/>เรื่องเร่งด่วน</span></div></header>
          <figure className={styles.barChart} aria-label="กราฟแท่งจำนวนเรื่องใหม่และเรื่องเร่งด่วนในช่วง 7 วันล่าสุด">
            <div className={styles.barChartPlot}>{days.map((day) => <div className={styles.barDay} key={day.label}>
              <div className={styles.barValues}><b>{day.total}</b>{day.urgent > 0 && <span>{day.urgent} เร่งด่วน</span>}</div>
              <div className={styles.barTrack}><i className={styles.barTotal} style={{ height: `${Math.max((day.total / chartMax) * 100, 3)}%` }}/><i className={styles.barUrgent} style={{ height: `${(day.urgent / chartMax) * 100}%` }}/></div>
              <small>{day.label}</small>
            </div>)}</div>
          </figure>
        </article>

        <article className={`${styles.dashboardCard} ${styles.attentionCard}`}>
          <header><div><small>เรียงตามความสำคัญ</small><h2>เรื่องที่รอคำตอบ</h2></div><Link href="/dashboard/issues/unanswered">ดูทั้งหมด<ArrowRight/></Link></header>
          <div className={styles.attentionList}>{attention.length ? attention.map((issue) => <Link href={`/dashboard/issues/unanswered#issue-${issue.id}`} key={issue.id}><PatientAvatar name={issue.displayName} avatarUrl={issue.avatarUrl} className={styles.miniAvatar}/><div><b>{issue.subject}</b><small>{issue.displayName}</small></div><span className={`${styles.tableBadge} ${styles[issue.urgency]}`}>{urgencyLabel[issue.urgency]}</span></Link>) : <div className={styles.compactEmpty}><ShieldCheck/>ไม่มีเรื่องที่รอคำตอบ</div>}</div>
        </article>

        <article className={`${styles.dashboardCard} ${styles.statusCard}`}>
          <header><div><small>ปัญหาทั้งหมด</small><h2>ระดับความเร่งด่วน</h2></div></header>
          <div className={styles.donutLayout}><div className={styles.donutChart} style={{ background: donut }}><span><b>{issues.length}</b><small>เรื่อง</small></span></div><div className={styles.donutLegend}><span><i className={styles.legendGreen}/>ปกติ <b>{greenCount}</b></span><span><i className={styles.legendYellow}/>เฝ้าระวัง <b>{yellowCount}</b></span><span><i className={styles.legendRed}/>เร่งด่วน <b>{redCount}</b></span></div></div>
        </article>
      </section>

      <section className={`${styles.dashboardCard} ${styles.overviewTableCard}`}>
        <header><div><small>10 คนล่าสุดที่แจ้งปัญหา</small><h2>ภาพรวมผู้ป่วย</h2></div><Link href="/dashboard/patients">ดูผู้ป่วยทั้งหมด<ArrowRight/></Link></header>
        {latestPatients.length ? <div className={styles.dashboardTableWrap}><table className={styles.dashboardTable}><caption className={styles.srOnly}>ผู้ป่วย 10 คนล่าสุดที่แจ้งปัญหา</caption><thead><tr><th scope="col">ชื่อ</th><th scope="col">อายุ</th><th scope="col">วันที่แจ้งปัญหาล่าสุด</th><th scope="col">จำนวนครั้งการแจ้งปัญหา</th><th scope="col">ประวัติการแจ้งปัญหา</th></tr></thead><tbody>{latestPatients.map((patient) => <tr key={patient.id}><th scope="row" aria-label={`ผู้ป่วย ${patient.displayName}`}><div className={styles.tablePatient}><PatientAvatar name={patient.displayName} avatarUrl={patient.avatarUrl} className={styles.tableAvatar}/><div><b>{patient.displayName}</b></div></div></th><td>{patient.age ? `${patient.age} ปี` : 'ไม่ระบุ'}</td><td>{thaiDate(patient.latestIssueAt)}</td><td><span className={styles.issueCount}>{patient.issueCount} ครั้ง</span></td><td><Link href={`/dashboard/patients/${patient.id}`} className={styles.historyAction} aria-label={`ดูประวัติการแจ้งปัญหาของ ${patient.displayName}`}><History/>ดูประวัติ</Link></td></tr>)}</tbody></table></div> : <div className={styles.compactEmpty}>ยังไม่มีผู้ป่วยแจ้งปัญหา</div>}
      </section>
    </>}
  </DashboardShell>;
}

function Kpi({ icon, label, value, note, tone = '' }: { icon: React.ReactNode; label: string; value: number; note: string; tone?: 'warning' | 'danger' | '' }) {
  return <article className={tone ? styles[`dashboardKpi_${tone}`] : ''}><div><span>{label}</span><b>{value}</b><small>{note}</small></div><i>{icon}</i></article>;
}
