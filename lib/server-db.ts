import { neon } from '@neondatabase/serverless';

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
    return { results: await this.rows() as T[] };
  }
}

export function getD1() {
  return { prepare: (query: string) => new Statement(query) };
}

export function getRuntimeConfig() {
  return {
    lineSecret: process.env.LINE_CHANNEL_SECRET || '',
    lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    dashboardPassword: process.env.DASHBOARD_PASSWORD || 'demo1234',
    nursePhone: process.env.NURSE_PHONE || 'รอระบุเบอร์พยาบาล',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  };
}
