import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1 } from '@/lib/server-db';

export async function GET(request: Request) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const db = getD1();
  const [patients, assessmentRows, distribution, recentAssessments, issues] = await Promise.all([
    db.prepare(`select id, line_user_id as "lineUserId", display_name as "displayName", avatar_url as "avatarUrl", urgency, status, age, procedure,
      discharge_date as "dischargeDate", discharge_day as "dischargeDay", created_at as "createdAt", updated_at as "updatedAt",
      (select count(*) from messages where patient_id = patients.id) as "messageCount",
      (select body from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomSummary",
      (select created_at from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomUpdatedAt"
      from patients order by case urgency when 'red' then 1 when 'yellow' then 2 else 3 end, updated_at desc`).all(),
    db.prepare(`select count(*) as count, coalesce(avg(overall), 0) as "averageOverall", coalesce(avg(ease), 0) as "averageEase",
      coalesce(avg(usefulness), 0) as "averageUsefulness",
      coalesce(100.0 * sum(case when overall >= 4 then 1 else 0 end) / nullif(count(*), 0), 0) as "positiveRate" from assessments`).first(),
    db.prepare(`select overall as score, count(*) as count from assessments group by overall order by overall`).all(),
    db.prepare(`select id, overall, ease, usefulness, comment, created_at as "createdAt" from assessments order by id desc limit 12`).all(),
    db.prepare(`select i.id, i.patient_id as "patientId", p.line_user_id as "lineUserId", p.display_name as "displayName", p.avatar_url as "avatarUrl",
      i.subject, i.category, i.detail, i.onset, i.urgency, i.status, i.reply_text as "replyText",
      i.created_at as "createdAt", i.replied_at as "repliedAt"
      from issues i join patients p on p.id = i.patient_id
      order by case i.status when 'unanswered' then 1 else 2 end,
      case i.urgency when 'red' then 1 when 'yellow' then 2 else 3 end, i.created_at desc`).all(),
  ]);
  return Response.json({ patients: patients.results, issues: issues.results, assessments: { ...assessmentRows, distribution: distribution.results, recent: recentAssessments.results } });
}
