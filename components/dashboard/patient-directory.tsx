'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, History, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { PatientAvatar } from './patient-avatar';
import type { Issue, Patient } from './types';
import { thaiDate } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

const PAGE_SIZE = 8;

export function PatientDirectory() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const patients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th');
    const issues = data?.issues || [];
    return (data?.patients || []).map((patient) => {
      const patientIssues = issues.filter((issue) => issue.patientId === patient.id);
      const latestIssue = patientIssues.reduce<Issue | null>((latest, issue) => !latest || new Date(issue.createdAt) > new Date(latest.createdAt) ? issue : latest, null);
      return { ...patient, issueCount: patientIssues.length, latestIssueAt: latestIssue?.createdAt || null, issueSearch: patientIssues.map((issue) => `${issue.subject} ${issue.detail}`).join(' ') };
    }).filter((patient) => !normalized || `${patient.displayName} ${patient.issueSearch}`.toLocaleLowerCase('th').includes(normalized))
      .sort((a, b) => (b.latestIssueAt ? new Date(b.latestIssueAt).getTime() : 0) - (a.latestIssueAt ? new Date(a.latestIssueAt).getTime() : 0));
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePatients = patients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (needsLogin) return <DashboardLogin onSuccess={load}/>;
  return <DashboardShell title="ผู้ป่วย" description="รายชื่อผู้ป่วยและประวัติการแจ้งปัญหาแต่ละราย" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.tablePanel}>
      <div className={styles.tableToolbar}>
        <label className={styles.tableSearch}><Search/><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาชื่อหรือปัญหาที่เคยแจ้ง..."/></label>
      </div>

      {loading && !data ? <div className={styles.loadingRows}><i/><i/><i/></div> : visiblePatients.length ? <>
        <div className={styles.patientTableWrap}>
          <table className={styles.patientTable}>
            <caption className={styles.srOnly}>รายชื่อและประวัติการแจ้งปัญหาของผู้ป่วย</caption>
            <thead><tr><th scope="col">ชื่อ</th><th scope="col">อายุ</th><th scope="col">วันที่แจ้งปัญหาล่าสุด</th><th scope="col">จำนวนครั้งการแจ้งปัญหา</th><th scope="col">ประวัติการแจ้งปัญหา</th></tr></thead>
            <tbody>{visiblePatients.map((patient) => <PatientRow key={patient.id} patient={patient}/>)}</tbody>
          </table>
        </div>
        <footer className={styles.pagination}><span>แสดง {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, patients.length)} จาก {patients.length} ราย</span><div><button disabled={currentPage === 1} onClick={() => setPage((current) => current - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft/></button><b>{currentPage}</b><span>/ {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage((current) => current + 1)} aria-label="หน้าถัดไป"><ChevronRight/></button></div></footer>
      </> : <div className={styles.empty}><UsersRound/><h2>ไม่พบข้อมูลผู้ป่วย</h2><p>{query ? 'ลองเปลี่ยนคำค้นหา' : 'ยังไม่มีข้อมูลผู้ป่วย'}</p></div>}
    </section>
  </DashboardShell>;
}

function PatientRow({ patient }: { patient: Patient & { latestIssueAt: string | null; issueCount: number } }) {
  return <tr>
    <th scope="row" aria-label={`ผู้ป่วย ${patient.displayName}`}><div className={styles.tablePatient}><PatientAvatar name={patient.displayName} avatarUrl={patient.avatarUrl} className={styles.tableAvatar}/><div><b>{patient.displayName}</b><small>อัปเดต {thaiDate(patient.updatedAt)}</small></div></div></th>
    <td>{patient.age ? `${patient.age} ปี` : <span className={styles.tableMuted}>ไม่ระบุ</span>}</td>
    <td>{patient.latestIssueAt ? thaiDate(patient.latestIssueAt) : <span className={styles.tableMuted}>ยังไม่เคยแจ้งปัญหา</span>}</td>
    <td><span className={styles.issueCount}>{patient.issueCount} ครั้ง</span></td>
    <td><Link href={`/dashboard/patients/${patient.id}`} className={styles.historyAction} aria-label={`ดูประวัติการแจ้งปัญหาของ ${patient.displayName}`}><History/>ดูประวัติ</Link></td>
  </tr>;
}
