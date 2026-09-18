import { afterEach, expect, it, vi } from 'vitest';
import { createDashboardSession, isDashboardAuthorized } from '@/lib/dashboard-auth';
import { POST } from '@/app/api/auth/login/route';
import { GET } from '@/app/api/dashboard/route';

afterEach(() => vi.unstubAllEnvs());
it('fails closed when password is unconfigured', async () => {
  vi.stubEnv('DASHBOARD_PASSWORD', '');
  expect(await createDashboardSession('admin', 'demo1234')).toBeNull();
  expect(await isDashboardAuthorized(new Request('https://test/api/dashboard'))).toBe(false);
});
it('rejects wrong credentials and tampered/missing cookies', async () => {
  vi.stubEnv('DASHBOARD_PASSWORD', 'synthetic-test-password');
  expect(await createDashboardSession('admin', 'wrong')).toBeNull();
  expect(await createDashboardSession('other', 'synthetic-test-password')).toBeNull();
  const token = await createDashboardSession('admin', 'synthetic-test-password');
  expect(await isDashboardAuthorized(new Request('https://test', { headers: { cookie: `dashboard_session=${token}` } }))).toBe(true);
  expect(await isDashboardAuthorized(new Request('https://test', { headers: { cookie: `dashboard_session=${token}tampered` } }))).toBe(false);
  expect((await GET(new Request('https://test/api/dashboard'))).status).toBe(401);
});
it('login issues a secure httpOnly session cookie in production', async () => {
  vi.stubEnv('DASHBOARD_PASSWORD', 'synthetic-test-password'); vi.stubEnv('NODE_ENV', 'production');
  const response = await POST(new Request('https://test/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'synthetic-test-password' }) }));
  expect(response.status).toBe(200);
  const cookie = response.headers.get('set-cookie');
  expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=Lax');
});
it('rejects malformed login JSON', async () => {
  vi.stubEnv('DASHBOARD_PASSWORD', 'synthetic-test-password');
  expect((await POST(new Request('https://test', { method: 'POST', body: '{' }))).status).toBe(401);
});
