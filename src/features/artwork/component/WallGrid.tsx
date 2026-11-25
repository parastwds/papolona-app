import React, { useCallback, type Ref } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
} from 'react-native';

import { font, hp } from '@/utils/responsive';
import type { WallTile } from '@/services/session';
import { rarityOf } from '@/features/series/artworks';
import EmblemTile, {
  EMBLEM_COLUMNS,
  EMBLEM_GAP,
  EMBLEM_GUTTER,
  useEmblemTileWidth,
} from '@/features/series/component/EmblemTile';
import { GOLD } from './ScreenHeader';

const MUTED = '#B4B8AB';

type Props = {
  tiles: WallTile[];
  onOpen: (tile: WallTile) => void;
  // Off on a member's own gallery, where every tile is theirs.
  showOwner?: boolean;
  onEndReached?: () => void;
  loadingMore?: boolean;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  // How many emblems across (zoom); from 4 up they show without captions.
  columns?: number;
  listRef?: Ref<FlatList<WallTile>>;
  onScroll?: (y: number) => void;
};

// Zoomed out, emblems sit closer together.
const gapFor = (columns: number) => (columns > 3 ? EMBLEM_GAP / 2 : EMBLEM_GAP);

/** A wall of published series, newest first, three across unless zoomed: a rising column to scroll. */
const WallGrid = ({
  tiles,
  onOpen,
  showOwner = true,
  onEndReached,
  loadingMore,
  header,
  empty,
  columns = EMBLEM_COLUMNS,
  listRef,
  onScroll,
}: Props) => {
  const gap = gapFor(columns);
  const size = useEmblemTileWidth(columns, gap);
  const compact = columns > 3;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<WallTile>) => (
      <EmblemTile
        artworkKey={item.artworkKey}
        rarity={item.rarity}
        length={item.length}
        width={size}
        compact={compact}
        plain
        owner={showOwner ? (item.creator ?? item.owner).name : undefined}
        accessibilityLabel={`${rarityOf(item.rarity).label} by ${
          (item.creator ?? item.owner).name
        }. Open.`}
        onPress={() => onOpen(item)}
      />
    ),
    [size, showOwner, onOpen, compact],
  );

  return (
    <FlatList
      // A new column count is a new layout: FlatList can't change it in place.
      key={`grid-${columns}`}
      ref={listRef}
      data={tiles}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      numColumns={columns}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={[styles.content, { gap: compact ? gap : hp(18) }]}
      onScroll={
        onScroll ? e => onScroll(e.nativeEvent.contentOffset.y) : undefined
      }
      scrollEventThrottle={100}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={GOLD} style={styles.loading} />
        ) : null
      }
    />
  );
};

export default WallGrid;

export const WallEmpty = ({ text }: { text: string }) => (
  <Text style={styles.empty}>{text}</Text>
);

/** A line above the wall: what it is, in plain words. */
export const WallIntro = ({ text }: { text: string }) => (
  <Text style={styles.intro}>{text}</Text>
);

const styles = StyleSheet.create({
  content: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: hp(20),
    paddingHorizontal: EMBLEM_GUTTER,
    paddingBottom: hp(32),
  },
  loading: { marginVertical: hp(12) },
  intro: {
    marginBottom: hp(8),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(21),
  },
  empty: {
    marginTop: hp(24),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(21),
  },
});
