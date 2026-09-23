import { describe, expect, it } from 'vitest';
import {
  calculateResponseMetrics,
  formatResponseMinutes,
  responseTimeMinutes,
} from '@/lib/issue-metrics';

describe('issue response metrics', () => {
  it('calculates the elapsed minutes between report and reply', () => {
    expect(
      responseTimeMinutes(
        '2026-09-20T01:00:00.000Z',
        '2026-09-20T02:35:00.000Z',
      ),
    ).toBe(95);
    expect(responseTimeMinutes('2026-09-20T01:00:00.000Z', null)).toBeNull();
  });

  it('summarizes average, median, and 24-hour response rate', () => {
    const metrics = calculateResponseMetrics([
      { createdAt: '2026-09-20T00:00:00.000Z', repliedAt: '2026-09-20T00:30:00.000Z' },
      { createdAt: '2026-09-20T00:00:00.000Z', repliedAt: '2026-09-20T02:00:00.000Z' },
      { createdAt: '2026-09-20T00:00:00.000Z', repliedAt: null },
    ]);
    expect(metrics).toEqual({
      answered: 2,
      averageResponseMinutes: 75,
      medianResponseMinutes: 75,
      respondedWithin24HoursRate: 100,
    });
  });

  it('formats response time for the dashboard', () => {
    expect(formatResponseMinutes(45)).toBe('45 นาที');
    expect(formatResponseMinutes(95)).toBe('1 ชม. 35 นาที');
    expect(formatResponseMinutes(null)).toBe('ยังไม่ตอบกลับ');
  });
});
