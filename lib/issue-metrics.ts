export function responseTimeMinutes(
  createdAt: string,
  repliedAt: string | null,
) {
  if (!repliedAt) return null;
  const created = new Date(createdAt).getTime();
  const replied = new Date(repliedAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(replied)) return null;
  return Math.max(0, Math.round((replied - created) / 60000));
}

export function calculateResponseMetrics(
  issues: readonly { createdAt: string; repliedAt: string | null }[],
) {
  const responseTimes = issues
    .map((issue) => responseTimeMinutes(issue.createdAt, issue.repliedAt))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const total = responseTimes.length;
  const averageResponseMinutes = total
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / total)
    : 0;
  const middle = Math.floor(total / 2);
  const medianResponseMinutes = total
    ? total % 2
      ? responseTimes[middle]
      : Math.round((responseTimes[middle - 1] + responseTimes[middle]) / 2)
    : 0;
  const respondedWithin24HoursRate = total
    ? Math.round(
        (responseTimes.filter((value) => value <= 24 * 60).length / total) *
          100,
      )
    : 0;
  return {
    answered: total,
    averageResponseMinutes,
    medianResponseMinutes,
    respondedWithin24HoursRate,
  };
}

export function formatResponseMinutes(value: number | null) {
  if (value === null) return 'ยังไม่ตอบกลับ';
  if (value < 60) return `${value} นาที`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours} ชม. ${minutes} นาที` : `${hours} ชั่วโมง`;
}
