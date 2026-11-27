import type { ImageSourcePropType } from 'react-native';
import { artworkFor } from '@/features/series/artworks';

// Papolona merchandise. Demo items only: shown in the marketplace as a preview,
// none on sale yet (no stock, no checkout).
export type MerchItem = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  image: ImageSourcePropType;
  // Butterfly emblems are transparent: they sit on black, not cropped to fill.
  emblem?: boolean;
};

export const DEMO_MERCH: MerchItem[] = [
  {
    id: 'print-butterfly',
    title: 'Butterfly emblem print',
    description:
      'A giclée print of one Papolona butterfly emblem on cotton rag paper, 30 × 40 cm, signed and numbered.',
    priceCents: 4500,
    currency: 'PNY',
    image: artworkFor('butterfly_03'),
    emblem: true,
  },
  {
    id: 'poster-prism',
    title: 'Enigma Prism poster',
    description:
      'Mark Dolamore’s Enigma Prism as a matte poster, 50 × 70 cm.',
    priceCents: 3000,
    currency: 'PNY',
    image: require('@assets/enigma_prism.jpg'),
  },
  {
    id: 'journal-notebook',
    title: 'Individuation notebook',
    description:
      'A linen-bound notebook for readings away from the app: 192 dotted pages, a ribbon and a butterfly on the cover.',
    priceCents: 2400,
    currency: 'PNY',
    image: artworkFor('butterfly_08'),
    emblem: true,
  },
  {
    id: 'tote',
    title: 'Collective tote',
    description:
      'A heavy organic cotton tote printed with the collaborative artwork’s butterflies.',
    priceCents: 2200,
    currency: 'PNY',
    image: artworkFor('butterfly_12'),
    emblem: true,
  },
  {
    id: 'stone',
    title: 'Meditation stone',
    description:
      'A hand-finished stone engraved with the Papolona emblem, the one in the Sensitisation Package.',
    priceCents: 3800,
    currency: 'PNY',
    image: require('@assets/packages/meditation_stone.png'),
  },
  {
    id: 'mug',
    title: 'Papolona mug',
    description:
      'A stoneware mug glazed deep green, with a gold butterfly emblem.',
    priceCents: 1800,
    currency: 'PNY',
    image: artworkFor('butterfly_05'),
    emblem: true,
  },
];
