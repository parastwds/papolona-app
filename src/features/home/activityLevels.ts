import type { StatsBucket } from '@/services/session';

// Gold, from faint to full, by how much happened in a day, month or year.
export const ACTIVITY_LEVELS = [
  'rgba(217, 199, 126, 0.06)',
  'rgba(217, 199, 126, 0.25)',
  'rgba(217, 199, 126, 0.45)',
  'rgba(217, 199, 126, 0.7)',
  'rgba(217, 199, 126, 0.95)',
];

/** How much was recorded: a reading counts more than a note. */
export const activityOf = (bucket?: StatsBucket) =>
  bucket ? bucket.readings * 2 + bucket.notes : 0;

/** 0 for nothing, else 1–4 relative to the busiest bucket shown. */
export const levelOf = (activity: number, max: number) =>
  activity === 0
    ? 0
    : Math.max(1, Math.ceil((activity / Math.max(1, max)) * 4));
