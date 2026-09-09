import { getD1 } from '@/lib/server-db';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const overall = Number(body.overall);
  const ease = Number(body.ease);
  const usefulness = Number(body.usefulness);
  if (![overall, ease, usefulness].every((score) => Number.isInteger(score) && score >= 1 && score <= 5)) {
    return Response.json({ error: 'กรุณาให้คะแนนทุกข้อ' }, { status: 400 });
  }
  await getD1().prepare(`insert into assessments (overall, ease, usefulness, comment, created_at) values (?, ?, ?, ?, ?)`)
    .bind(overall, ease, usefulness, String(body.comment || '').trim().slice(0, 1000), new Date().toISOString()).run();
  return Response.json({ ok: true }, { status: 201 });
}
