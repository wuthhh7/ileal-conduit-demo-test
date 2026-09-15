import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import { getD1 } from '@/lib/server-db';

export async function GET(request: Request) {
  if (!(await isDashboardAuthorized(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const issues = await getD1().prepare(`select i.id, i.patient_id as "patientId", p.line_user_id as "lineUserId", p.display_name as "displayName",
    i.subject, i.category, i.detail, i.onset, i.urgency, i.status, i.reply_text as "replyText",
    i.created_at as "createdAt", i.replied_at as "repliedAt"
    from issues i join patients p on p.id = i.patient_id
    order by case i.status when 'unanswered' then 1 else 2 end,
    case i.urgency when 'red' then 1 when 'yellow' then 2 else 3 end, i.created_at desc`).all();
  return Response.json({ issues: issues.results });
}
