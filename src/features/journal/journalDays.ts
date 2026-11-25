import type { JournalDayRange, JournalEntry } from '@/services/session';

/** One local calendar day of the journal: an Active Thread. */
export type JournalDay = JournalDayRange & {
  // Newest first, like the journal list.
  entries: JournalEntry[];
  // Clues the day's entries were sealed with (usually one).
  clues: string[];
  lastAt: Date;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD of a moment in this device's time zone. */
export const localDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A local day's start and end as instants; the day after midnight handles clock changes. */
export function dayRange(day: string): JournalDayRange {
  const [y, m, d] = day.split('-').map(Number);
  return {
    day,
    from: new Date(y, m - 1, d).toISOString(),
    to: new Date(y, m - 1, d + 1).toISOString(),
  };
}

/** Groups entries (newest first) into days, newest day first. */
export function groupByDay(entries: JournalEntry[]): JournalDay[] {
  const days = new Map<string, JournalDay>();
  for (const entry of entries) {
    const at = new Date(entry.createdAt);
    const day = localDay(at);
    let group = days.get(day);
    if (!group) {
      group = { ...dayRange(day), entries: [], clues: [], lastAt: at };
      days.set(day, group);
    }
    group.entries.push(entry);
    if (entry.clue && !group.clues.includes(entry.clue.clue)) {
      group.clues.push(entry.clue.clue);
    }
  }
  return [...days.values()];
}

/** "Today", "Yesterday", or e.g. "Monday, 2 Nov" (with the year when it isn't this year). */
export function dayTitle(day: string, now = new Date()) {
  const today = localDay(now);
  const yesterday = localDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    ...(y !== now.getFullYear() && { year: 'numeric' }),
  });
}

export const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
