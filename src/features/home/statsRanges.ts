import type { StatsBucket, StatsUnit } from '@/services/session';
import { localDay } from '@/features/journal/journalDays';

// FX-style time scale switches on the Home stats.
export type StatsRange = '1W' | '1M' | '1Y' | '5Y' | 'ALL';

export const STATS_RANGES: StatsRange[] = ['1W', '1M', '1Y', '5Y', 'ALL'];

export type StatsQuery = { unit: StatsUnit; from?: string; to: string };

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const monthStart = (date: Date, monthsBack: number) =>
  new Date(date.getFullYear(), date.getMonth() - monthsBack, 1);

/** The query for a range, ending today (in the device's time zone). */
export function rangeQuery(range: StatsRange, now = new Date()): StatsQuery {
  const to = localDay(now);
  switch (range) {
    case '1W':
      return { unit: 'day', from: localDay(addDays(now, -6)), to };
    case '1M':
      return { unit: 'day', from: localDay(addDays(now, -29)), to };
    case '1Y':
      return { unit: 'month', from: localDay(monthStart(now, 11)), to };
    case '5Y':
      return { unit: 'month', from: localDay(monthStart(now, 59)), to };
    case 'ALL':
      // From the first reading or note.
      return { unit: 'month', to };
  }
}

/** Parses a local YYYY-MM-DD date as local midnight. */
export const parseLocalDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** A short axis label for a bucket. */
export function bucketLabel(
  bucket: StatsBucket,
  unit: StatsUnit,
  range?: StatsRange,
) {
  const date = parseLocalDay(bucket.start);
  if (unit === 'year') return String(date.getFullYear());
  if (unit === 'month') {
    return range === '1Y'
      ? date.toLocaleDateString([], { month: 'short' })
      : date.toLocaleDateString([], { month: 'short', year: '2-digit' });
  }
  return range === '1W'
    ? date.toLocaleDateString([], { weekday: 'short' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** A long label for a bucket, for the selected-point readout. */
export function bucketTitle(bucket: StatsBucket, unit: StatsUnit) {
  const date = parseLocalDay(bucket.start);
  if (unit === 'year') return String(date.getFullYear());
  if (unit === 'month') {
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const RANGE_NAMES: Record<StatsRange, string> = {
  '1W': 'the last 7 days',
  '1M': 'the last 30 days',
  '1Y': 'the last 12 months',
  '5Y': 'the last 5 years',
  ALL: 'all time',
};
