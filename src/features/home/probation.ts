import type { ProbationProgress } from '@/services/session';

// The apprenticeship in words, the same on every screen. It completes once at
// least `daysRequired` days have passed since sign-up and the passed readings
// are at least `readingsRequired` and a multiple of `readingsStep` (30, 33, 36…).

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Readings still to pass to reach the target (30, or the next multiple of 3). */
export const readingsLeft = (p: ProbationProgress) =>
  Math.max(0, p.readingsTarget - p.readingsDone);

/** Days still to go in the apprenticeship. */
export const daysLeft = (p: ProbationProgress) =>
  Math.max(0, p.daysRequired - p.daysDone);

/** "Day 5 of 28 · 12 of 30 readings" */
export const probationShort = (p: ProbationProgress) =>
  `Day ${Math.min(p.daysDone, p.daysRequired)} of ${p.daysRequired} · ${
    p.readingsDone
  } of ${p.readingsTarget} readings`;

/** "Day 5/28 · 12/30 readings": for one short line, such as under the name on Profile. */
export const probationCompact = (p: ProbationProgress) =>
  `Day ${Math.min(p.daysDone, p.daysRequired)}/${p.daysRequired} · ${
    p.readingsDone
  }/${p.readingsTarget} readings`;

/** "28 days and at least 30 passed readings, in a multiple of 3 (30, 33, 36…)" */
export const probationRule = (p: ProbationProgress) =>
  `${p.daysRequired} days and at least ${p.readingsRequired} passed readings, in a multiple of ${
    p.readingsStep
  } (${p.readingsRequired}, ${p.readingsRequired + p.readingsStep}, ${
    p.readingsRequired + 2 * p.readingsStep
  }…)`;

/** What is left before the member can graduate, in a sentence. */
export function probationNext(p: ProbationProgress) {
  if (p.complete) return 'Your apprenticeship is complete.';
  const readings = readingsLeft(p);
  const days = daysLeft(p);
  // Past the minimum but not on a multiple of the step: say why the target moved.
  const offStep =
    readings > 0 && p.readingsDone > p.readingsRequired
      ? ` to reach ${p.readingsTarget}: the total must be a multiple of ${p.readingsStep}`
      : '';
  if (readings > 0 && days > 0) {
    return `${plural(readings, 'more reading')} to pass${offStep}, and ${plural(
      days,
      'more day',
    )} to go.`;
  }
  if (readings > 0) return `${plural(readings, 'more reading')} to pass${offStep}.`;
  // Readings on target, days still to go: more readings must keep the total on a multiple.
  return `Your ${p.readingsDone} readings are on target. ${plural(
    days,
    'more day',
  )} to go; if you pass more readings meanwhile, keep the total a multiple of ${
    p.readingsStep
  }.`;
}
