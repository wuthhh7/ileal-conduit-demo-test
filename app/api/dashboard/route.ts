import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1 } from '@/lib/server-db';

export async function GET(request: Request) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const db = getD1();
  const [patients, assessmentRows, distribution] = await Promise.all([
    db.prepare(`select id, line_user_id as "lineUserId", display_name as "displayName", urgency, status, age, procedure, discharge_day as "dischargeDay", updated_at as "updatedAt",
      (select count(*) from messages where patient_id = patients.id) as "messageCount"
      from patients order by case urgency when 'red' then 1 when 'yellow' then 2 else 3 end, updated_at desc`).all(),
    db.prepare(`select count(*) as count, coalesce(avg(overall), 0) as "averageOverall", coalesce(avg(ease), 0) as "averageEase",
      coalesce(avg(usefulness), 0) as "averageUsefulness",
      coalesce(100.0 * sum(case when overall >= 4 then 1 else 0 end) / nullif(count(*), 0), 0) as "positiveRate" from assessments`).first(),
    db.prepare(`select overall as score, count(*) as count from assessments group by overall order by overall`).all(),
  ]);
  return Response.json({ patients: patients.results, assessments: { ...assessmentRows, distribution: distribution.results } });
}
