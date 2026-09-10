import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardPlus, UserRound } from 'lucide-react';
import type { Patient } from './types';
import { shortSymptom, statusLabel, thaiDate, urgencyLabel } from './types';
import styles from './dashboard.module.css';

export function PatientCard({ patient }: { patient: Patient }) {
  return <article className={`${styles.patientCard} ${styles[`priority_${patient.urgency}`]}`}>
    <div className={styles.patientHeading}>
      <span className={styles.avatar}>{patient.displayName.charAt(0) || '?'}</span>
      <div><h3>{patient.displayName}</h3><p>อัปเดต {thaiDate(patient.updatedAt)}</p></div>
      <span className={`${styles.badge} ${styles[patient.urgency]}`}>{urgencyLabel[patient.urgency]}</span>
    </div>
    <section className={styles.cardSection}>
      <h4><UserRound/>ประวัติผู้ป่วย</h4>
      <dl className={styles.profileGrid}>
        <div><dt>อายุ</dt><dd>{patient.age ? `${patient.age} ปี` : 'ยังไม่ระบุ'}</dd></div>
        <div><dt><CalendarDays/>วันที่ออก รพ.</dt><dd>{thaiDate(patient.dischargeDate)}</dd></div>
        <div className={styles.fullRow}><dt>การรักษา/หัตถการ</dt><dd>{patient.procedure || 'ยังไม่ระบุ'}</dd></div>
      </dl>
    </section>
    <section className={`${styles.cardSection} ${styles.symptomBox}`}>
      <h4><ClipboardPlus/>สรุปอาการล่าสุด</h4>
      <p>{shortSymptom(patient.symptomSummary)}</p>
      {patient.symptomUpdatedAt && <small>แจ้งเมื่อ {thaiDate(patient.symptomUpdatedAt)}</small>}
    </section>
    <div className={styles.cardFooter}>
      <span className={`${styles.statusDot} ${styles[patient.status]}`}>{statusLabel[patient.status] || patient.status}</span>
      <Link href={`/dashboard/patients/${patient.id}`}>เปิดข้อมูลผู้ป่วย<ArrowRight/></Link>
    </div>
  </article>;
}
