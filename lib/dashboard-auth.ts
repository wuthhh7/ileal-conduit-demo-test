import { getRuntimeConfig } from './server-db';

async function tokenFor(username: string, password: string) {
  const bytes = new TextEncoder().encode(`ilieal-dashboard:${username}:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function isDashboardAuthorized(request: Request) {
  const config = getRuntimeConfig();
  if (!config.dashboardPassword) return false;
  const expected = await tokenFor(config.dashboardUsername, config.dashboardPassword);
  const cookie = request.headers.get('cookie') || '';
  const supplied = cookie.match(/(?:^|;\s*)dashboard_session=([^;]+)/)?.[1] || '';
  return supplied === expected;
}

export async function createDashboardSession(username: string, password: string) {
  const config = getRuntimeConfig();
  if (!config.dashboardPassword) return null;
  if (username !== config.dashboardUsername || password !== config.dashboardPassword) return null;
  return tokenFor(username, password);
}
