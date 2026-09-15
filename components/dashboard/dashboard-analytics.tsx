'use client';

import Link from 'next/link';
import { ArrowRight, CircleAlert, Clock3, MoreHorizontal, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { shortSymptom, statusLabel, thaiDate, urgencyLabel } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

export function DashboardAnalytics() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  const patients = data?.patients || [];
  const accepted = patients.filter((patient) => patient.status !== 'awaiting_staff').length;
  const waiting = patients.filter((patient) => patient.status === 'awaiting_staff').length;
  const urgent = patients.filter((patient) => patient.urgency === 'red').length;
  const inProgress = patients.filter((patient) => patient.status === 'in_progress').length;
  const attention = [...patients].sort((a, b) => {
    const weight = { red: 3, yellow: 2, green: 1 };
    const score = (patient: typeof a) => weight[patient.urgency] * 10 + (patient.status === 'awaiting_staff' ? 2 : patient.status === 'in_progress' ? 1 : 0);
    return score(b) - score(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }).filter((patient) => patient.status !== 'resolved' || patient.urgency !== 'green').slice(0, 4);
  const latestPatients = [...patients].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const added = patients.filter((patient) => {
      const created = new Date(patient.createdAt);
      return created >= date && created < next;
    });
    return {
      label: new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' }).format(date),
      total: added.length,
      urgent: added.filter((patient) => patient.urgency === 'red').length,
    };
  });
  const chartMax = Math.max(...days.flatMap((day) => [day.total, day.urgent]), 1);
  const points = (field: 'total' | 'urgent') => days.map((day, index) => {
    const x = 30 + index * (640 / 6);
    const y = 180 - (day[field] / chartMax) * 130;
    return `${x},${y}`;
  }).join(' ');
  const greenCount = patients.filter((patient) => patient.urgency === 'green').length;
  const yellowCount = patients.filter((patient) => patient.urgency === 'yellow').length;
  const greenPercent = patients.length ? (greenCount / patients.length) * 100 : 0;
  const yellowPercent = patients.length ? (yellowCount / patients.length) * 100 : 0;
  const donut = patients.length ? `conic-gradient(#55a985 0 ${greenPercent}%, #d99a28 ${greenPercent}% ${greenPercent + yellowPercent}%, #d55757 ${greenPercent + yellowPercent}% 100%)` : '#e8eef0';

  return <DashboardShell title="แดชบอร์ด" description="ภาพรวมข้อมูลผู้ป่วยและสถานะที่พยาบาลควรติดตาม" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.dashboardKpis}>
      <Kpi icon={<UsersRound/>} label="ผู้ป่วยทั้งหมด" value={patients.length} note="รายในระบบ"/>
      <Kpi icon={<UserCheck/>} label="รับเรื่องแล้ว" value={accepted} note={`${inProgress} รายกำลังติดตาม`}/>
      <Kpi icon={<Clock3/>} label="ยังไม่รับเรื่อง" value={waiting} note="รอเจ้าหน้าที่ตรวจสอบ" tone="warning"/>
      <Kpi icon={<CircleAlert/>} label="เคสเร่งด่วน" value={urgent} note="ควรตรวจสอบก่อน" tone="danger"/>
    </section>

    {loading && !data ? <div className={styles.loadingRows}><i/><i/><i/></div> : <>
      <section className={styles.dashboardMainGrid}>
        <article className={`${styles.dashboardCard} ${styles.trendCard}`}>
          <header><div><small>7 วันล่าสุด</small><h2>แนวโน้มผู้ป่วยใหม่</h2></div><div className={styles.chartLegend}><span><i/>ผู้ป่วยใหม่</span><span><i/>เคสเร่งด่วน</span></div></header>
          <div className={styles.lineChart}>
            <svg viewBox="0 0 700 220"><title>กราฟผู้ป่วยใหม่และเคสเร่งด่วนในช่วง 7 วันล่าสุด</title>
              {[50, 115, 180].map((y) => <line key={y} x1="30" x2="670" y1={y} y2={y} className={styles.chartGridLine}/>) }
              <polyline points={`30,180 ${points('total')} 670,180`} className={styles.chartArea}/>
              <polyline points={points('total')} className={styles.chartLinePrimary}/>
              <polyline points={points('urgent')} className={styles.chartLineDanger}/>
              {days.map((day, index) => <g key={day.label}><circle cx={30 + index * (640 / 6)} cy={180 - (day.total / chartMax) * 130} r="4" className={styles.chartDotPrimary}/><circle cx={30 + index * (640 / 6)} cy={180 - (day.urgent / chartMax) * 130} r="3" className={styles.chartDotDanger}/><text x={30 + index * (640 / 6)} y="207" textAnchor="middle">{day.label}</text></g>)}
            </svg>
          </div>
        </article>

        <article className={`${styles.dashboardCard} ${styles.attentionCard}`}>
          <header><div><small>เรียงตามความสำคัญ</small><h2>เคสที่ควรตรวจสอบ</h2></div><Link href="/dashboard/patients/unaccepted">ดูทั้งหมด<ArrowRight/></Link></header>
          <div className={styles.attentionList}>{attention.length ? attention.map((patient) => <Link href={`/dashboard/patients/${patient.id}`} key={patient.id}><span className={styles.miniAvatar}>{patient.displayName.charAt(0) || '?'}</span><div><b>{patient.displayName}</b><small>{shortSymptom(patient.symptomSummary)}</small></div><span className={`${styles.tableBadge} ${styles[patient.urgency]}`}>{urgencyLabel[patient.urgency]}</span></Link>) : <div className={styles.compactEmpty}><ShieldCheck/>ไม่มีเคสที่ต้องติดตาม</div>}</div>
        </article>

        <article className={`${styles.dashboardCard} ${styles.statusCard}`}>
          <header><div><small>สถานะปัจจุบัน</small><h2>ระดับความเร่งด่วน</h2></div></header>
          <div className={styles.donutLayout}><div className={styles.donutChart} style={{ background: donut }}><span><b>{patients.length}</b><small>ทั้งหมด</small></span></div><div className={styles.donutLegend}><span><i className={styles.legendGreen}/>ปกติ <b>{greenCount}</b></span><span><i className={styles.legendYellow}/>เฝ้าระวัง <b>{yellowCount}</b></span><span><i className={styles.legendRed}/>เร่งด่วน <b>{urgent}</b></span></div></div>
        </article>
      </section>

      <section className={`${styles.dashboardCard} ${styles.overviewTableCard}`}>
        <header><div><small>อัปเดตล่าสุด</small><h2>ภาพรวมผู้ป่วย</h2></div><Link href="/dashboard/patients">ดูผู้ป่วยทั้งหมด<ArrowRight/></Link></header>
        {latestPatients.length ? <div className={styles.dashboardTableWrap}><table className={styles.dashboardTable}><caption className={styles.srOnly}>ภาพรวมผู้ป่วยที่อัปเดตล่าสุด</caption><thead><tr><th scope="col">ผู้ป่วย</th><th scope="col">อายุ</th><th scope="col">การรักษา / หัตถการ</th><th scope="col">อาการล่าสุด</th><th scope="col">ความเร่งด่วน</th><th scope="col">สถานะ</th><th scope="col">รายละเอียด</th></tr></thead><tbody>{latestPatients.map((patient) => <tr key={patient.id}><th scope="row" aria-label={`ผู้ป่วย ${patient.displayName}`}><div className={styles.tablePatient}><span className={styles.tableAvatar}>{patient.displayName.charAt(0) || '?'}</span><div><b>{patient.displayName}</b><small>อัปเดต {thaiDate(patient.updatedAt)}</small></div></div></th><td>{patient.age ? `${patient.age} ปี` : 'ไม่ระบุ'}</td><td>{patient.procedure || 'ยังไม่ระบุ'}</td><td>{shortSymptom(patient.symptomSummary)}</td><td><span className={`${styles.tableBadge} ${styles[patient.urgency]}`}>{urgencyLabel[patient.urgency]}</span></td><td><span className={`${styles.statusDot} ${styles[patient.status]}`}>{statusLabel[patient.status] || patient.status}</span></td><td><Link href={`/dashboard/patients/${patient.id}`} className={styles.rowAction} aria-label={`ดูรายละเอียด ${patient.displayName}`}><MoreHorizontal/></Link></td></tr>)}</tbody></table></div> : <div className={styles.compactEmpty}>ยังไม่มีข้อมูลผู้ป่วย</div>}
      </section>
    </>}
  </DashboardShell>;
}

function Kpi({ icon, label, value, note, tone = '' }: { icon: React.ReactNode; label: string; value: number; note: string; tone?: 'warning' | 'danger' | '' }) {
  return <article className={tone ? styles[`dashboardKpi_${tone}`] : ''}><div><span>{label}</span><b>{value}</b><small>{note}</small></div><i>{icon}</i></article>;
}
