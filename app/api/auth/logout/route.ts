export async function POST() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': `dashboard_session=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`,
    },
  });
}
