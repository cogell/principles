const RELATIVE_TIME_UNITS = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
] as const;

type TimeInput = string | number | Date | null | undefined;

function toTimestamp(value: TimeInput): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function formatRelativeTime(value: TimeInput, now: Date | number = Date.now()): string | null {
  const time = toTimestamp(value);
  if (time === null) return null;

  const nowTime = typeof now === 'number' ? now : now.getTime();
  if (Number.isNaN(nowTime)) return null;

  const diffMs = time - nowTime;
  const absMs = Math.abs(diffMs);

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absMs >= ms || unit === 'second') {
      const valueForUnit = Math.round(diffMs / ms);
      if (valueForUnit === 0) return 'just now';

      const absValue = Math.abs(valueForUnit);
      const label = absValue === 1 ? unit : `${unit}s`;

      return valueForUnit < 0 ? `${absValue} ${label} ago` : `in ${absValue} ${label}`;
    }
  }

  return null;
}
