import type { SeriesRarity } from '@/services/session';

/**
 * Series artworks, by the key the server gives each series. Keys must match
 * ARTWORK_KEYS in the backend's series service (butterfly_01..15); series
 * started earlier keep their artwork_N placeholder keys.
 */
// Bundled image module ids (what require() returns), so the full-screen viewer can take them.
const ARTWORKS: Record<string, number> = {
  artwork_1: require('@assets/collection/artwork_1.jpg'),
  artwork_2: require('@assets/collection/artwork_2.jpg'),
  artwork_3: require('@assets/collection/artwork_3.jpg'),
  artwork_4: require('@assets/collection/artwork_4.jpg'),
  artwork_5: require('@assets/collection/artwork_5.jpg'),
  artwork_6: require('@assets/collection/artwork_6.jpg'),
  // Demo butterfly emblems (transparent PNGs), cut from the client's sheet in order.
  butterfly_01: require('@assets/collection/butterflies/butterfly_01.png'),
  butterfly_02: require('@assets/collection/butterflies/butterfly_02.png'),
  butterfly_03: require('@assets/collection/butterflies/butterfly_03.png'),
  butterfly_04: require('@assets/collection/butterflies/butterfly_04.png'),
  butterfly_05: require('@assets/collection/butterflies/butterfly_05.png'),
  butterfly_06: require('@assets/collection/butterflies/butterfly_06.png'),
  butterfly_07: require('@assets/collection/butterflies/butterfly_07.png'),
  butterfly_08: require('@assets/collection/butterflies/butterfly_08.png'),
  butterfly_09: require('@assets/collection/butterflies/butterfly_09.png'),
  butterfly_10: require('@assets/collection/butterflies/butterfly_10.png'),
  butterfly_11: require('@assets/collection/butterflies/butterfly_11.png'),
  butterfly_12: require('@assets/collection/butterflies/butterfly_12.png'),
  butterfly_13: require('@assets/collection/butterflies/butterfly_13.png'),
  butterfly_14: require('@assets/collection/butterflies/butterfly_14.png'),
  butterfly_15: require('@assets/collection/butterflies/butterfly_15.png'),
};

const PLACEHOLDERS = Object.values(ARTWORKS);

/** A key without a bundled image (e.g. a butterfly not yet added) gets a stable placeholder. */
const placeholderFor = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 1000003;
  return PLACEHOLDERS[hash % PLACEHOLDERS.length];
};

export const artworkFor = (key: string): number =>
  ARTWORKS[key] ?? placeholderFor(key);

/**
 * Whether a series has butterfly emblems: every series does, except practice
 * series (single, twin) started before those earned emblems too.
 */
export const hasEmblems = (series: { artworkKey: string }) =>
  !!series.artworkKey && series.artworkKey !== 'none';

// Every passed reading in a series earns its own butterfly emblem. The butterflies are the bundled
// ones, cycled from the series' own artwork (so each series starts on a different one) and repeated when
// a series has more readings than there are butterflies.
const BUTTERFLY_KEYS = Object.keys(ARTWORKS).filter(k => k.startsWith('butterfly_'));

/** The butterfly emblem earned by reading `tileIndex` (0-based) of the series with `artworkKey`. */
export const emblemKeyFor = (artworkKey: string, tileIndex: number): string => {
  let start = BUTTERFLY_KEYS.indexOf(artworkKey);
  if (start < 0) {
    // Older series (artwork_N, or none): a stable start from the key itself.
    start = 0;
    for (let i = 0; i < artworkKey.length; i += 1) {
      start = (start * 31 + artworkKey.charCodeAt(i)) % BUTTERFLY_KEYS.length;
    }
  }
  return BUTTERFLY_KEYS[(start + tileIndex) % BUTTERFLY_KEYS.length];
};

// How a series' emblems are laid out, by its length (the server's grids: 3 is 1 x 3 … 24 is 4 x 6).
const GRIDS: Record<number, { rows: number; cols: number }> = {
  1: { rows: 1, cols: 1 },
  2: { rows: 1, cols: 2 },
  3: { rows: 1, cols: 3 },
  6: { rows: 2, cols: 3 },
  12: { rows: 3, cols: 4 },
  24: { rows: 4, cols: 6 },
};
export const gridFor = (length: number) =>
  GRIDS[length] ?? { rows: 1, cols: Math.max(1, length) };

/** A transparent butterfly emblem (rather than a full-bleed painting). */
export const isEmblem = (key: string) => key.startsWith('butterfly_');

// The width:height a butterfly emblem fills best: its wings span about 1.6 times its height.
export const EMBLEM_ASPECT = 1.6;

// Each emblem series has one tier, named for its length and shown in its colour: Triple (3) bronze,
// Hexa (6) silver, Dozen (12) mythic red, Double Dozen (24) gold.
export const RARITY: Record<SeriesRarity, { label: string; color: string }> = {
  common: { label: 'Triple', color: '#C8875A' },
  epic: { label: 'Hexa', color: '#C9CED6' },
  mythic: { label: 'Dozen', color: '#E0574D' },
  legendary: { label: 'Double Dozen', color: '#E8C35A' },
};

// Rarer first, for grouping a gallery.
export const RARITY_ORDER: SeriesRarity[] = ['legendary', 'mythic', 'epic', 'common'];

/** A series' rarity, falling back to common for a tier this build doesn't know. */
export const rarityOf = (rarity: string) =>
  RARITY[rarity as SeriesRarity] ?? RARITY.common;

// The same four tiers as levels of reading, the way Home and the Journal name them:
// level one is 3 readings, two is 6, three is 12 (coherent advice), four is 24.
export const LEVELS = [
  { level: 1, length: 3, rarity: 'common', name: 'Level one reading' },
  { level: 2, length: 6, rarity: 'epic', name: 'Level two reading' },
  { level: 3, length: 12, rarity: 'mythic', name: 'Level three reading' },
  { level: 4, length: 24, rarity: 'legendary', name: 'Level four reading' },
] as const;

export type ReadingLevel = (typeof LEVELS)[number];

/** A series' level from its rarity ("Level three reading"), or null for an unknown tier. */
export const readingLevelOf = (rarity: string): ReadingLevel | null =>
  LEVELS.find(l => l.rarity === rarity) ?? null;
