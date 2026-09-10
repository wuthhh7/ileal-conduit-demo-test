'use client';

import { useMemo, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { PatientCard } from './patient-card';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

const filters = [
  ['all', 'ทั้งหมด'], ['red', 'เร่งด่วน'], ['yellow', 'เฝ้าระวัง'], ['green', 'ปกติ'],
];

export function PatientDirectory() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const patients = useMemo(() => data?.patients.filter((patient) =>
    (filter === 'all' || patient.urgency === filter) && `${patient.displayName} ${patient.lineUserId} ${patient.procedure || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  ) || [], [data, filter, query]);
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;

  return <DashboardShell title="รายชื่อผู้ป่วย" description="หนึ่งการ์ดต่อหนึ่งผู้ป่วย พร้อมประวัติและอาการล่าสุด" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.toolbar}>
      <div className={styles.filters}>{filters.map(([key, label]) => <button key={key} className={filter === key ? styles.filterActive : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <label className={styles.search}><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อหรือการรักษา"/></label>
    </section>
    <div className={styles.resultCount}>แสดง {patients.length} จาก {data?.patients.length || 0} ราย</div>
    {loading ? <div className={styles.loadingRows}><i/><i/><i/></div> : patients.length ? <section className={styles.patientGrid}>{patients.map((patient) => <PatientCard key={patient.id} patient={patient}/>)}</section> : <div className={styles.empty}><UsersRound/><h2>ไม่พบผู้ป่วย</h2><p>ลองเปลี่ยนตัวกรองหรือคำค้นหา</p></div>}
  </DashboardShell>;
}
