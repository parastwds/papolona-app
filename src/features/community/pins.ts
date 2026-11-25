import type { CommunityCountry } from '@/services/session';
import { PIN_SPOTS } from './data/worldMap';

export type MapPin = { key: string; x: number; y: number; member: boolean };

/**
 * One pin per user, dropped on a spot inside their country (see PIN_SPOTS: every spot was
 * checked to lie within the borders). The server only tells us the country, so where in the
 * country a pin lands means nothing, by design.
 *
 * A country with more users than spots shows a pin on every spot, coloured in proportion.
 * Pins come back sorted top to bottom, so lower pins overlap the ones behind them.
 */
export function pinsFor(countries: CommunityCountry[]): MapPin[] {
  const pins: MapPin[] = [];
  for (const { code, registered, members } of countries) {
    const spots = PIN_SPOTS[code];
    const users = registered + members;
    if (!spots || users <= 0) continue;
    const count = Math.min(users, spots.length / 2);
    // Members among the pins: exact when everyone fits, proportional otherwise,
    // and never rounding a group that exists down to nothing while there is room.
    let memberPins = Math.round((members / users) * count);
    if (count >= 2) {
      if (members > 0) memberPins = Math.max(1, memberPins);
      if (registered > 0) memberPins = Math.min(count - 1, memberPins);
    }
    for (let i = 0; i < count; i += 1) {
      // Spread the member pins evenly through the spots instead of bunching them first.
      const member =
        Math.floor(((i + 1) * memberPins) / count) > Math.floor((i * memberPins) / count);
      pins.push({ key: `${code}-${i}`, x: spots[i * 2], y: spots[i * 2 + 1], member });
    }
  }
  return pins.sort((a, b) => a.y - b.y);
}

/** 'IN' -> the Indian flag emoji. */
export const flagOf = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '';

/** 'IN' -> 'India', in the phone's language; the code itself if unknown. */
export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames([], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};
