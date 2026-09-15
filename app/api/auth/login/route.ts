import { createDashboardSession } from '@/lib/dashboard-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  const token = await createDashboardSession(String(body.username || '').trim(), String(body.password || ''));
  if (!token) return Response.json({ error: 'Username หรือ Password ไม่ถูกต้อง' }, { status: 401 });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': `dashboard_session=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=28800`,
    },
  });
}
