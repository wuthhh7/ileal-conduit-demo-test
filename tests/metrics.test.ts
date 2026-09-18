import { expect, it } from 'vitest';
import { serviceMetrics } from '@/lib/service-metrics';
import { createDemoCases } from '@/lib/demo-data';

it('returns no percentage or timing when no cases exist', () => {
  expect(serviceMetrics([])).toMatchObject({ total: 0, completionRate: null, averageResponseMinutes: null, medianResponseMinutes: null });
});
it('excludes waiting cases from response latency but includes them in completion denominator', () => {
  expect(serviceMetrics(createDemoCases())).toMatchObject({ total: 4, answered: 2, completionRate: 50, averageResponseMinutes: 18, medianResponseMinutes: 18, responseSamples: 2 });
});
it('does not count malformed or negative response intervals', () => {
  expect(serviceMetrics([
    { status: 'answered', createdAt: 'invalid', repliedAt: 'invalid' },
    { status: 'answered', createdAt: '2026-09-18T10:00:00Z', repliedAt: '2026-09-18T09:00:00Z' },
  ]).responseSamples).toBe(0);
});
it('all demo identities are synthetic and have no external attachments', () => {
  for (const item of createDemoCases()) {
    expect(item.id).toMatch(/^demo-/); expect(item.name).toContain('จำลอง');
    expect(JSON.stringify(item)).not.toMatch(/https?:|lineUserId|phone|imageData/);
  }
});
