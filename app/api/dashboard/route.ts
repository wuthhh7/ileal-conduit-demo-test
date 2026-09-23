import { isDashboardAuthorized } from '@/lib/dashboard-auth';
import {
  ensureContentAnalyticsTables,
  ensureIssueUrgencyData,
  ensureVideoContentTable,
  getD1,
} from '@/lib/server-db';
import { calculateResponseMetrics, responseTimeMinutes } from '@/lib/issue-metrics';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function bangkokDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Date(date.getTime() + BANGKOK_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export async function GET(request: Request) {
  if (!(await isDashboardAuthorized(request)))
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  await Promise.all([
    ensureVideoContentTable(),
    ensureContentAnalyticsTables(),
    ensureIssueUrgencyData(),
  ]);
  const db = getD1();
  const bangkokToday = new Date(Date.now() + BANGKOK_OFFSET_MS);
  bangkokToday.setUTCHours(0, 0, 0, 0);
  const activityStart = new Date(
    Date.UTC(bangkokToday.getUTCFullYear(), bangkokToday.getUTCMonth() - 5, 1) -
      BANGKOK_OFFSET_MS,
  ).toISOString();
  const sevenDayStart = new Date(
    bangkokToday.getTime() - 6 * DAY_MS - BANGKOK_OFFSET_MS,
  ).toISOString();
  const [
    patients,
    assessmentRows,
    distribution,
    recentAssessments,
    issues,
    pageViewTotal,
    recentPageViews,
    recentVideoViews,
    videoPlayTotal,
    topVideos,
  ] = await Promise.all([
    db
      .prepare(`select id, line_user_id as "lineUserId", display_name as "displayName", avatar_url as "avatarUrl", urgency, status, age, procedure,
      discharge_date as "dischargeDate", discharge_day as "dischargeDay", created_at as "createdAt", updated_at as "updatedAt",
      (select count(*) from messages where patient_id = patients.id) as "messageCount",
      (select body from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomSummary",
      (select created_at from messages where patient_id = patients.id and role = 'user' and (body like 'แจ้งอาการผ่านแบบฟอร์ม%' or body like 'ส่งแบบฟอร์มแจ้งอาการ%') order by id desc limit 1) as "symptomUpdatedAt"
      from patients order by case urgency when 'red' then 1 when 'yellow' then 2 else 3 end, updated_at desc`)
      .all(),
    db
      .prepare(`select count(*) as count, coalesce(avg(overall), 0) as "averageOverall", coalesce(avg(ease), 0) as "averageEase",
      coalesce(avg(usefulness), 0) as "averageUsefulness",
      coalesce(100.0 * sum(case when overall >= 4 then 1 else 0 end) / nullif(count(*), 0), 0) as "positiveRate" from assessments`)
      .first(),
    db
      .prepare(
        `select overall as score, count(*) as count from assessments group by overall order by overall`,
      )
      .all(),
    db
      .prepare(
        `select id, overall, ease, usefulness, comment, created_at as "createdAt" from assessments order by id desc limit 12`,
      )
      .all(),
    db
      .prepare(`select i.id, i.patient_id as "patientId", p.line_user_id as "lineUserId", p.display_name as "displayName", p.avatar_url as "avatarUrl",
      i.subject, i.category, i.detail, i.onset, i.urgency, i.status, i.reply_text as "replyText",
      i.created_at as "createdAt", i.replied_at as "repliedAt"
      from issues i join patients p on p.id = i.patient_id
      order by case when i.status = 'answered' then 2 else 1 end,
      case i.urgency when 'red' then 1 when 'yellow' then 2 else 3 end, i.created_at desc`)
      .all(),
    db
      .prepare('select count(*) as count from content_page_views')
      .first<{ count: string | number }>(),
    db
      .prepare(
        'select created_at as "createdAt" from content_page_views where created_at >= ? order by created_at',
      )
      .bind(activityStart)
      .all<{ createdAt: string }>(),
    db
      .prepare(
        'select created_at as "createdAt" from video_view_events where created_at >= ? order by created_at',
      )
      .bind(activityStart)
      .all<{ createdAt: string }>(),
    db
      .prepare('select coalesce(sum(views), 0) as count from video_content')
      .first<{ count: string | number }>(),
    db
      .prepare(`select id, title, poster_url as "posterUrl", duration_label as "durationLabel", views
      from video_content order by views desc, sort_order asc, created_at desc limit 5`)
      .all<{
        id: string;
        title: string;
        posterUrl: string | null;
        durationLabel: string | null;
        views: string | number;
      }>(),
  ]);

  const daily = Array.from({ length: 7 }, (_, index) => {
    const shiftedDate = new Date(bangkokToday.getTime() - (6 - index) * DAY_MS);
    return {
      date: shiftedDate.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('th-TH', {
        weekday: 'short',
        timeZone: 'UTC',
      }).format(shiftedDate),
      pageViews: 0,
      videoPlays: 0,
    };
  });
  const dayByKey = new Map(daily.map((day) => [day.date, day]));
  for (const view of recentPageViews.results) {
    const day = dayByKey.get(bangkokDateKey(view.createdAt));
    if (day) day.pageViews += 1;
  }
  for (const view of recentVideoViews.results) {
    const day = dayByKey.get(bangkokDateKey(view.createdAt));
    if (day) day.videoPlays += 1;
  }

  const issueRows = issues.results.map((issue) => ({
    ...issue,
    responseMinutes: responseTimeMinutes(
      String(issue.createdAt),
      typeof issue.repliedAt === 'string' ? issue.repliedAt : null,
    ),
  }));

  return Response.json({
    patients: patients.results,
    issues: issueRows,
    issueAnalytics: calculateResponseMetrics(
      issues.results.map((issue) => ({
        createdAt: String(issue.createdAt),
        repliedAt: typeof issue.repliedAt === 'string' ? issue.repliedAt : null,
      })),
    ),
    assessments: {
      ...assessmentRows,
      distribution: distribution.results,
      recent: recentAssessments.results,
    },
    contentAnalytics: {
      pageViews: Number(pageViewTotal?.count) || 0,
      pageViewsToday: daily.at(-1)?.pageViews || 0,
      pageViews7Days: recentPageViews.results.filter(
        (view) => view.createdAt >= sevenDayStart,
      ).length,
      videoPlays: Number(videoPlayTotal?.count) || 0,
      videoPlays7Days: recentVideoViews.results.filter(
        (view) => view.createdAt >= sevenDayStart,
      ).length,
      daily,
      events: {
        pageViews: recentPageViews.results.map((view) => view.createdAt),
        videoPlays: recentVideoViews.results.map((view) => view.createdAt),
      },
      topVideos: topVideos.results.map((video) => ({
        ...video,
        views: Number(video.views) || 0,
      })),
    },
  });
}
