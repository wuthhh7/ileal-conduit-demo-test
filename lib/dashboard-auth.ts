import { getRuntimeConfig } from './server-db';

async function tokenFor(password: string) {
  const bytes = new TextEncoder().encode(`siriraj-dashboard:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function isDashboardAuthorized(request: Request) {
  const expected = await tokenFor(getRuntimeConfig().dashboardPassword);
  const cookie = request.headers.get('cookie') || '';
  const supplied = cookie.match(/(?:^|;\s*)dashboard_session=([^;]+)/)?.[1] || '';
  return supplied === expected;
}

export async function createDashboardSession(password: string) {
  if (password !== getRuntimeConfig().dashboardPassword) return null;
  return tokenFor(password);
}
