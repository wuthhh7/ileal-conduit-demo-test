import { env } from 'cloudflare:workers';

export function getD1() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}

export function getRuntimeConfig() {
  return {
    lineSecret: env.LINE_CHANNEL_SECRET || '',
    lineToken: env.LINE_CHANNEL_ACCESS_TOKEN || '',
    dashboardPassword: env.DASHBOARD_PASSWORD || 'demo1234',
    nursePhone: env.NURSE_PHONE || 'รอระบุเบอร์พยาบาล',
    publicBaseUrl: env.PUBLIC_BASE_URL || '',
  };
}
