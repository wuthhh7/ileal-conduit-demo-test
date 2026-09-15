'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Search, SlidersHorizontal, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import type { Patient, Urgency } from './types';
import { shortSymptom, statusLabel, thaiDate, urgencyLabel } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

type DirectoryView = 'all' | 'accepted' | 'unaccepted';

const PAGE_SIZE = 8;
const pageCopy: Record<DirectoryView, { title: string; description: string }> = {
  all: { title: 'ผู้ป่วย', description: 'ข้อมูลผู้ป่วยทั้งหมดและสถานะการติดตามล่าสุด' },
  accepted: { title: 'เคสที่รับเรื่อง', description: 'ผู้ป่วยที่เจ้าหน้าที่กำลังติดตามหรือดำเนินการเรียบร้อยแล้ว' },
  unaccepted: { title: 'ยังไม่รับเรื่อง', description: 'ผู้ป่วยที่กำลังรอเจ้าหน้าที่ตรวจสอบและรับเรื่อง' },
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function PatientDirectory({ view = 'all' }: { view?: DirectoryView }) {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  const [query, setQuery] = useState('');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');
  const [page, setPage] = useState(1);

  const patients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th');
    return (data?.patients || []).filter((patient) => {
      const matchesView = view === 'all' || (view === 'accepted' ? patient.status !== 'awaiting_staff' : patient.status === 'awaiting_staff');
      const matchesUrgency = urgency === 'all' || patient.urgency === urgency;
      const haystack = [patient.displayName, patient.procedure, shortSymptom(patient.symptomSummary)].join(' ').toLocaleLowerCase('th');
      return matchesView && matchesUrgency && (!normalized || haystack.includes(normalized));
    });
  }, [data, query, urgency, view]);

  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePatients = patients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function exportPatients() {
    const header = ['ชื่อผู้ป่วย', 'อายุ', 'การรักษาหรือหัตถการ', 'วันที่ออกจากโรงพยาบาล', 'อาการล่าสุด', 'ความเร่งด่วน', 'สถานะ'];
    const rows = patients.map((patient) => [patient.displayName, patient.age ? `${patient.age} ปี` : '', patient.procedure || '', thaiDate(patient.dischargeDate), shortSymptom(patient.symptomSummary), urgencyLabel[patient.urgency], statusLabel[patient.status] || patient.status]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `patients-${view}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (needsLogin) return <DashboardLogin onSuccess={load}/>;
  const copy = pageCopy[view];

  return <DashboardShell title={copy.title} description={copy.description} onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.tablePanel}>
      <div className={styles.tableToolbar}>
        <label className={styles.tableSearch}><Search/><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาชื่อ หัตถการ หรืออาการ..."/></label>
        <label className={styles.selectFilter}><SlidersHorizontal/><span>ความเร่งด่วน</span><select value={urgency} onChange={(event) => { setUrgency(event.target.value as 'all' | Urgency); setPage(1); }}><option value="all">ทั้งหมด</option><option value="red">เร่งด่วน</option><option value="yellow">เฝ้าระวัง</option><option value="green">ปกติ</option></select></label>
        <button type="button" className={styles.exportButton} onClick={exportPatients} disabled={!patients.length}><Download/>ส่งออก CSV</button>
      </div>

      {loading && !data ? <div className={styles.loadingRows}><i/><i/><i/></div> : visiblePatients.length ? <>
        <div className={styles.patientTableWrap}>
          <table className={styles.patientTable}>
            <caption className={styles.srOnly}>รายชื่อและข้อมูลติดตามผู้ป่วย</caption>
            <thead><tr><th scope="col">ผู้ป่วย</th><th scope="col">อายุ</th><th scope="col">การรักษา / หัตถการ</th><th scope="col">วันที่ออก รพ.</th><th scope="col">อาการล่าสุด</th><th scope="col">ความเร่งด่วน</th><th scope="col">สถานะ</th><th scope="col">รายละเอียด</th></tr></thead>
            <tbody>{visiblePatients.map((patient) => <PatientRow key={patient.id} patient={patient}/>)}</tbody>
          </table>
        </div>
        <footer className={styles.pagination}><span>แสดง {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, patients.length)} จาก {patients.length} ราย</span><div><button disabled={currentPage === 1} onClick={() => setPage((current) => current - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft/></button><b>{currentPage}</b><span>/ {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage((current) => current + 1)} aria-label="หน้าถัดไป"><ChevronRight/></button></div></footer>
      </> : <div className={styles.empty}><UsersRound/><h2>ไม่พบข้อมูลผู้ป่วย</h2><p>{query || urgency !== 'all' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'ยังไม่มีผู้ป่วยในหมวดนี้'}</p></div>}
    </section>
  </DashboardShell>;
}

function PatientRow({ patient }: { patient: Patient }) {
  return <tr>
    <th scope="row" aria-label={`ผู้ป่วย ${patient.displayName}`}><div className={styles.tablePatient}><span className={styles.tableAvatar}>{patient.displayName.charAt(0) || '?'}</span><div><b>{patient.displayName}</b><small>อัปเดต {thaiDate(patient.updatedAt)}</small></div></div></th>
    <td>{patient.age ? `${patient.age} ปี` : <span className={styles.tableMuted}>ไม่ระบุ</span>}</td>
    <td className={styles.procedureCell}>{patient.procedure || <span className={styles.tableMuted}>ยังไม่ระบุ</span>}</td>
    <td>{thaiDate(patient.dischargeDate)}</td>
    <td className={styles.symptomCell}>{shortSymptom(patient.symptomSummary)}</td>
    <td><span className={`${styles.tableBadge} ${styles[patient.urgency]}`}>{urgencyLabel[patient.urgency]}</span></td>
    <td><span className={`${styles.statusDot} ${styles[patient.status]}`}>{statusLabel[patient.status] || patient.status}</span></td>
    <td><Link href={`/dashboard/patients/${patient.id}`} className={styles.rowAction} aria-label={`ดูรายละเอียด ${patient.displayName}`}><MoreHorizontal/></Link></td>
  </tr>;
}
