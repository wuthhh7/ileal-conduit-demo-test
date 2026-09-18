export type MeasuredCase = { status: string; createdAt: string; repliedAt: string | null };

/** First recorded staff response; unresolved cases never count as zero minutes. */
export function serviceMetrics(cases: MeasuredCase[]) {
  const answered = cases.filter((item) => item.status === 'answered');
  const minutes = answered.flatMap((item) => {
    if (!item.repliedAt) return [];
    const elapsed = (Date.parse(item.repliedAt) - Date.parse(item.createdAt)) / 60000;
    return Number.isFinite(elapsed) && elapsed >= 0 ? [elapsed] : [];
  }).sort((a, b) => a - b);
  const middle = Math.floor(minutes.length / 2);
  return {
    total: cases.length,
    answered: answered.length,
    waiting: cases.length - answered.length,
    completionRate: cases.length ? answered.length / cases.length * 100 : null,
    averageResponseMinutes: minutes.length ? minutes.reduce((sum, value) => sum + value, 0) / minutes.length : null,
    medianResponseMinutes: minutes.length ? (minutes.length % 2 ? minutes[middle] : (minutes[middle - 1] + minutes[middle]) / 2) : null,
    responseSamples: minutes.length,
  };
}
