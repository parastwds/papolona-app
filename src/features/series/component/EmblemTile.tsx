import React, { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import EmblemSet from './EmblemSet';
import RarityMark from './RarityMark';
import { readingLevelOf } from '../artworks';
import { font, wp } from '@/utils/responsive';

// Emblem grids are three across: the gallery, the NFTs and the collective artwork.
export const EMBLEM_COLUMNS = 3;
export const EMBLEM_GUTTER = wp(20);
export const EMBLEM_GAP = wp(10);

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

/** The width of one tile in a grid of `columns` filling the screen between the gutters (three by default). */
export const useEmblemTileWidth = (
  columns = EMBLEM_COLUMNS,
  gap = EMBLEM_GAP,
) => {
  const { width } = useWindowDimensions();
  // Rounded down: tiles and the gaps filling the row exactly can wrap on rounding.
  return (
    Math.floor((width - EMBLEM_GUTTER * 2 - gap * (columns - 1)) / columns) - 1
  );
};

type Props = {
  artworkKey: string;
  rarity: string;
  length: number;
  width: number;
  onPress: () => void;
  accessibilityLabel: string;
  // Who made it, on the collective artwork.
  owner?: string;
  // A line in gold under the caption: its price on the marketplace, say.
  note?: string;
  // A muted line under the note: who bought it and when, say.
  subnote?: string;
  // Just the emblem, no caption: for small tiles when a grid is zoomed out.
  compact?: boolean;
  // The emblems earned, for a series left unfinished; leave out for a complete set.
  revealedTiles?: number[];
  // The level in words instead of the coloured rarity mark (the collective artwork).
  plain?: boolean;
  // Converted into an NFT: a gold frame.
  nft?: boolean;
  // Readings that failed, shown as placeholders.
  failedTiles?: number[];
};

/**
 * One emblem: the butterfly in its black frame, and under it the rarity's
 * butterfly mark with how many readings it took.
 */
const EmblemTile = ({
  artworkKey,
  rarity,
  length,
  width,
  onPress,
  accessibilityLabel,
  owner,
  note,
  subnote,
  compact = false,
  revealedTiles,
  plain = false,
  nft = false,
  failedTiles,
}: Props) => (
  <Pressable
    accessibilityRole="imagebutton"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={({ pressed }) => [{ width }, pressed && styles.pressed]}
  >
    {/* At least square; a longer set (three to a row) makes it taller. */}
    <View style={[styles.frame, nft && styles.frameNft, { minHeight: width }]}>
      <EmblemSet
        artworkKey={artworkKey}
        length={length}
        revealedTiles={revealedTiles}
        failedTiles={failedTiles}
        framed={false}
      />
    </View>
    {compact ? null : owner ? (
      <Text style={styles.owner} numberOfLines={1}>
        {owner}
      </Text>
    ) : null}
    {compact ? null : (
      <View style={[styles.caption, !owner && styles.captionFirst]}>
        {plain ? null : <RarityMark rarity={rarity} size={12} />}
        <Text style={styles.readings} numberOfLines={1}>
          {`${plain && readingLevelOf(rarity) ? `Level ${readingLevelOf(rarity)?.level} · ` : ''}${length} ${
            length === 1 ? 'reading' : 'readings'
          }`}
        </Text>
      </View>
    )}
    {note && !compact ? (
      <Text style={styles.note} numberOfLines={1}>
        {note}
      </Text>
    ) : null}
    {subnote && !compact ? (
      <Text style={styles.subnote} numberOfLines={1}>
        {subnote}
      </Text>
    ) : null}
  </Pressable>
);

export default memo(EmblemTile);

const styles = StyleSheet.create({
  // Black, as the emblems were made to be seen; square or taller.
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 12,
    backgroundColor: '#000',
    // The set of emblems, centred: one row of three for Level 1, eight for Level 4.
    justifyContent: 'center',
    padding: 4,
  },
  // A converted NFT: framed in gold, as the client's artwork shows.
  frameNft: { borderWidth: 2, borderColor: '#D9C77E' },

  owner: {
    marginTop: 8,
    color: CREAM,
    fontSize: font(13),
    fontWeight: '600',
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  captionFirst: { marginTop: 8 },
  readings: { flex: 1, color: MUTED, fontSize: font(12) },
  note: {
    marginTop: 2,
    color: '#E8D58A',
    fontSize: font(13),
    fontWeight: '600',
  },
  subnote: { marginTop: 1, color: MUTED, fontSize: font(12) },
  pressed: { opacity: 0.8 },
});
