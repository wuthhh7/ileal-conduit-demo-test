import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ db: vi.fn(), config: vi.fn() }));
vi.mock('@/lib/server-db', () => ({ getD1: mocks.db, getRuntimeConfig: mocks.config }));
import { POST } from '@/app/api/line/webhook/route';
const secret = 'synthetic-webhook-test-secret';
function request(body: string, signed = true) {
  return new Request('https://test/api/line/webhook', { method: 'POST', body, headers: signed ? { 'x-line-signature': createHmac('sha256', secret).update(body).digest('base64') } : {} });
}
beforeEach(() => { mocks.config.mockReturnValue({ lineSecret: secret }); mocks.db.mockReturnValue({}); });
afterEach(() => vi.unstubAllGlobals());
it('handles a signed text message and sends a mocked reply', async () => {
  mocks.config.mockReturnValue({ lineSecret: secret, lineToken: 'fake-token' });
  const statement = { bind: vi.fn().mockReturnThis(), run: vi.fn().mockResolvedValue({}), first: vi.fn().mockResolvedValue({ id: 'demo-patient', intake_field: null }) };
  mocks.db.mockReturnValue({ prepare: vi.fn().mockReturnValue(statement) });
  const network = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', network);
  const response = await POST(request(JSON.stringify({ events: [{ type: 'message', source: { userId: 'synthetic-user' }, replyToken: 'synthetic-reply', message: { type: 'text', text: 'สอบถามอุปกรณ์' } }] })));
  expect(response.status).toBe(200);
  expect(statement.run).toHaveBeenCalled();
  expect(network).toHaveBeenCalledWith('https://api.line.me/v2/bot/message/reply', expect.objectContaining({ method: 'POST' }));
  const replyCall = network.mock.calls.find(([url]) => url === 'https://api.line.me/v2/bot/message/reply');
  const payload = JSON.parse(String(replyCall?.[1]?.body));
  expect(payload.messages).toEqual([expect.objectContaining({ type: 'text', text: expect.stringContaining('เมนูบริการ') })]);
  expect(payload.messages[0].quickReply).toBeUndefined();
});
it('sends a text welcome instead of form cards on follow', async () => {
  mocks.config.mockReturnValue({ lineSecret: secret, lineToken: 'fake-token' });
  const statement = { bind: vi.fn().mockReturnThis(), run: vi.fn().mockResolvedValue({}), first: vi.fn().mockResolvedValue({ id: 'demo-patient' }) };
  mocks.db.mockReturnValue({ prepare: vi.fn().mockReturnValue(statement) });
  const network = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', network);
  await POST(request(JSON.stringify({ events: [{ type: 'follow', source: { userId: 'synthetic-user' }, replyToken: 'synthetic-reply' }] })));
  const replyCall = network.mock.calls.find(([url]) => url === 'https://api.line.me/v2/bot/message/reply');
  const payload = JSON.parse(String(replyCall?.[1]?.body));
  expect(payload.messages).toEqual([expect.objectContaining({ type: 'text', text: expect.stringContaining('ยินดีต้อนรับ') })]);
  expect(payload.messages[0].contents).toBeUndefined();
});
it('redirects old chat intake to the Rich Menu', async () => {
  mocks.config.mockReturnValue({ lineSecret: secret, lineToken: 'fake-token' });
  const statement = { bind: vi.fn().mockReturnThis(), run: vi.fn().mockResolvedValue({}), first: vi.fn().mockResolvedValue({ id: 'demo-patient', intake_field: 'profile_age' }) };
  const prepare = vi.fn().mockReturnValue(statement);
  mocks.db.mockReturnValue({ prepare });
  const network = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', network);
  await POST(request(JSON.stringify({ events: [{ type: 'message', source: { userId: 'synthetic-user' }, replyToken: 'synthetic-reply', message: { type: 'text', text: '28' } }] })));
  expect(prepare).toHaveBeenCalledWith(expect.stringContaining('intake_field = null'));
  const replyCall = network.mock.calls.find(([url]) => url === 'https://api.line.me/v2/bot/message/reply');
  const payload = JSON.parse(String(replyCall?.[1]?.body));
  expect(payload.messages[0].text).toContain('เมนูบริการ');
  expect(payload.messages[0].text).not.toContain('อายุเท่าไร');
});
it('rejects missing signatures before touching data', async () => {
  expect((await POST(request('{"events":[]}', false))).status).toBe(401); expect(mocks.db).not.toHaveBeenCalled();
});
it('rejects a tampered body', async () => {
  const original = request('{"events":[]}');
  const changed = new Request(original.url, { method: 'POST', headers: original.headers, body: '{"events":[{}]}' });
  expect((await POST(changed)).status).toBe(401); expect(mocks.db).not.toHaveBeenCalled();
});
it('accepts LINE verification without database access', async () => {
  expect((await POST(request('{"events":[]}'))).status).toBe(200); expect(mocks.db).not.toHaveBeenCalled();
});
it.each(['{', 'null', '{"events":{}}', '{"events":[null]}'])('rejects malformed signed payload %s', async (body) => {
  expect((await POST(request(body))).status).toBe(400); expect(mocks.db).not.toHaveBeenCalled();
});
it('returns unavailable when channel secret is missing', async () => {
  mocks.config.mockReturnValue({ lineSecret: '' }); expect((await POST(request('{"events":[]}'))).status).toBe(503);
});
