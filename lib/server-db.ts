import { neon } from '@neondatabase/serverless';
import { classifyReport, type Urgency } from '@/lib/triage';

function connection() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

function postgresPlaceholders(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

class Statement {
  private params: unknown[] = [];

  constructor(private readonly query: string) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async rows() {
    return connection().query(postgresPlaceholders(this.query), this.params);
  }

  async run() {
    await this.rows();
    return { success: true };
  }

  async first<T>() {
    const rows = await this.rows();
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    return { results: (await this.rows()) as T[] };
  }
}

export function getD1() {
  return { prepare: (query: string) => new Statement(query) };
}

let issueAttachmentColumnReady: Promise<void> | null = null;
let issueLocationColumnReady: Promise<void> | null = null;
let issueUrgencyDataReady: Promise<void> | null = null;
let videoContentTableReady: Promise<void> | null = null;
let contentAnalyticsTablesReady: Promise<void> | null = null;

export function ensureIssueAttachmentColumn() {
  if (!issueAttachmentColumnReady) {
    issueAttachmentColumnReady = getD1()
      .prepare('alter table issues add column if not exists image_data text')
      .run()
      .then(() => undefined)
      .catch((error) => {
        issueAttachmentColumnReady = null;
        throw error;
      });
  }
  return issueAttachmentColumnReady;
}

export function ensureIssueLocationColumn() {
  if (!issueLocationColumnReady) {
    issueLocationColumnReady = getD1()
      .prepare('alter table issues add column if not exists location text')
      .run()
      .then(() => undefined)
      .catch((error) => {
        issueLocationColumnReady = null;
        throw error;
      });
  }
  return issueLocationColumnReady;
}

function highestUrgency(values: string[]): Urgency {
  if (values.includes('red')) return 'red';
  if (values.includes('yellow')) return 'yellow';
  return 'green';
}

/** Re-evaluate legacy issue records when the triage rules change. */
export function ensureIssueUrgencyData() {
  if (!issueUrgencyDataReady) {
    issueUrgencyDataReady = (async () => {
      const db = getD1();
      const issues = await db
        .prepare(
          `select id, patient_id as "patientId", subject, category, detail, onset from issues`,
        )
        .all<{
          id: string;
          patientId: string;
          subject: string;
          category: string;
          detail: string;
          onset: string | null;
        }>();

      await Promise.all(
        issues.results.map((issue) => {
          const urgency = classifyReport(
            issue.category || '',
            issue.onset || '',
            `${issue.subject || ''} ${issue.detail || ''}`,
          );
          return db
            .prepare('update issues set urgency = ? where id = ?')
            .bind(urgency, issue.id)
            .run();
        }),
      );

      const patientIds = [
        ...new Set(issues.results.map((issue) => issue.patientId)),
      ];
      await Promise.all(
        patientIds.map(async (patientId) => {
          const patientIssues = await db
            .prepare('select urgency from issues where patient_id = ?')
            .bind(patientId)
            .all<{ urgency: string }>();
          const urgency = highestUrgency(
            patientIssues.results.map((issue) => issue.urgency),
          );
          await db
            .prepare('update patients set urgency = ? where id = ?')
            .bind(urgency, patientId)
            .run();
        }),
      );
    })()
      .then(() => undefined)
      .catch((error) => {
        issueUrgencyDataReady = null;
        throw error;
      });
  }
  return issueUrgencyDataReady;
}

export function ensureVideoContentTable() {
  if (!videoContentTableReady) {
    const db = getD1();
    videoContentTableReady = db
      .prepare(`create table if not exists video_content (
      id text primary key,
      title text not null,
      description text not null default '',
      video_url text not null,
      poster_url text,
      duration_label text,
      views bigint not null default 0,
      sort_order integer not null default 0,
      created_at text not null,
      updated_at text not null
    )`)
      .run()
      .then(() => undefined)
      .catch((error) => {
        videoContentTableReady = null;
        throw error;
      });
  }
  return videoContentTableReady;
}

export function ensureContentAnalyticsTables() {
  if (!contentAnalyticsTablesReady) {
    const db = getD1();
    contentAnalyticsTablesReady = db
      .prepare(`create table if not exists content_page_views (
      id bigint generated by default as identity primary key,
      created_at text not null
    )`)
      .run()
      .then(() =>
        db
          .prepare(`create table if not exists video_view_events (
        id bigint generated by default as identity primary key,
        video_id text not null,
        created_at text not null
      )`)
          .run(),
      )
      .then(() =>
        db
          .prepare(
            'create index if not exists content_page_views_created_at_idx on content_page_views(created_at desc)',
          )
          .run(),
      )
      .then(() =>
        db
          .prepare(
            'create index if not exists video_view_events_created_at_idx on video_view_events(created_at desc)',
          )
          .run(),
      )
      .then(() => undefined)
      .catch((error) => {
        contentAnalyticsTablesReady = null;
        throw error;
      });
  }
  return contentAnalyticsTablesReady;
}

export function getRuntimeConfig() {
  return {
    lineSecret: process.env.LINE_CHANNEL_SECRET || '',
    lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    dashboardUsername: 'admin',
    dashboardPassword: process.env.DASHBOARD_PASSWORD || '',
    nursePhone: process.env.NURSE_PHONE || 'รอระบุเบอร์พยาบาล',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
    liffProfileUrl:
      process.env.LIFF_PROFILE_URL ||
      'https://liff.line.me/2011529300-4sP0rLxd',
    liffSymptomUrl:
      process.env.LIFF_SYMPTOM_URL ||
      'https://liff.line.me/2011529300-zJ1dVPeY',
  };
}
