'use client';

import { BarChart3, MessageSquareText, Smile, Sparkles } from 'lucide-react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { thaiDate } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

export function AssessmentSummary() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  if (needsLogin) return <DashboardLogin onSuccess={load}/>;
  const assessment = data?.assessments;
  const max = Math.max(...(assessment?.distribution.map((item) => Number(item.count)) || [1]), 1);

  return <DashboardShell title="ผลประเมินการใช้งาน" description="สรุปความพึงพอใจ ความง่าย และประโยชน์ของระบบ" onRefresh={load}>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.metrics}>
      <article><span className={styles.metricIcon}><BarChart3/></span><div><small>แบบประเมินทั้งหมด</small><strong>{Number(assessment?.count || 0)}</strong><p>รายการ</p></div></article>
      <article><span className={styles.metricIcon}><Smile/></span><div><small>คะแนนภาพรวม</small><strong>{Number(assessment?.averageOverall || 0).toFixed(1)}</strong><p>จาก 5 คะแนน</p></div></article>
      <article><span className={styles.metricIcon}><Sparkles/></span><div><small>ความง่ายในการใช้</small><strong>{Number(assessment?.averageEase || 0).toFixed(1)}</strong><p>จาก 5 คะแนน</p></div></article>
      <article><span className={styles.metricIcon}><MessageSquareText/></span><div><small>ประโยชน์ที่ได้รับ</small><strong>{Number(assessment?.averageUsefulness || 0).toFixed(1)}</strong><p>จาก 5 คะแนน</p></div></article>
    </section>
    <section className={styles.assessmentLayout}>
      <article className={styles.whitePanel}>
        <header><span>การกระจายคะแนน</span><h2>คะแนนภาพรวม</h2></header>
        <div className={styles.scoreBars}>{[5, 4, 3, 2, 1].map((score) => {
          const count = Number(assessment?.distribution.find((item) => Number(item.score) === score)?.count || 0);
          return <div key={score}><b>{score} คะแนน</b><span><i style={{ width: `${(count / max) * 100}%` }}/></span><strong>{count}</strong></div>;
        })}</div>
      </article>
      <article className={styles.whitePanel}>
        <header><span>ความคิดเห็นล่าสุด</span><h2>เสียงจากผู้ใช้งาน</h2></header>
        {loading ? <div className={styles.loadingRows}><i/><i/></div> : assessment?.recent?.length ? <div className={styles.feedbackList}>{assessment.recent.map((item) => <section key={item.id}><div><b>{item.overall}/5</b><time>{thaiDate(item.createdAt)}</time></div><p>{item.comment || 'ไม่มีความคิดเห็นเพิ่มเติม'}</p></section>)}</div> : <div className={styles.emptySmall}>ยังไม่มีผลประเมิน</div>}
      </article>
    </section>
  </DashboardShell>;
}
