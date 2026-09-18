import { serviceMetrics, type MeasuredCase } from '@/lib/service-metrics';

export function ServiceMetrics({ issues }: { issues: MeasuredCase[] }) {
  const metrics = serviceMetrics(issues);
  return <section aria-label="ประสิทธิภาพการตอบกลับ" className="my-5 rounded-2xl border border-teal-500/25 p-5">
    <h2 className="font-bold">ประสิทธิภาพการตอบกลับ</h2>
    <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
      {[
        ['จำนวนเคส', `${metrics.total} เคส`],
        ['ตอบกลับสำเร็จ', metrics.completionRate === null ? 'ยังไม่มีข้อมูล' : `${metrics.completionRate.toFixed(1)}%`],
        ['เวลาตอบเฉลี่ย', metrics.averageResponseMinutes === null ? 'ยังไม่มีข้อมูล' : `${metrics.averageResponseMinutes.toFixed(1)} นาที`],
        ['เวลาตอบมัธยฐาน', metrics.medianResponseMinutes === null ? 'ยังไม่มีข้อมูล' : `${metrics.medianResponseMinutes.toFixed(1)} นาที`],
      ].map(([label, value]) => <div key={label}><p className="text-sm opacity-75">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>)}
    </div>
    <p className="mt-4 text-xs opacity-75">ข้อมูลทุกช่วงเวลา · สำเร็จ = เคสที่ตอบกลับแล้ว / เคสทั้งหมด · เวลาตอบนับจากสร้างเคสถึงบันทึกตอบกลับ เฉพาะ {metrics.responseSamples} เคสที่มีเวลาถูกต้อง ไม่ใช่อัตราการกรอกแบบฟอร์มสำเร็จหรือผลลัพธ์การรักษา</p>
  </section>;
}
