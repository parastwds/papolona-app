import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import AppButton from '@/components/AppButton';
import CustomHeader from '@/components/CustomHeader';
import TabBackground from '@/components/TabBackground';
import { BOTTOMTABSCREN, SCREENS } from '@/constants/screens';
import { RootStackParamList, RootTabParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import {
  useMembership,
  useMyListings,
  useProbation,
  useSeriesList,
} from '@/services/queries';
import { formatPrice, type Listing } from '@/services/session';
import ActiveBanner from '../component/ActiveBanner';
import NftDetailSheet, { type NftDetail } from '../component/NftDetailSheet';
import { queryKeys } from '@/services/queryKeys';
import type { NftSeries } from '@/services/session';
import { RARITY_ORDER, hasEmblems, rarityOf } from '@/features/series/artworks';
import EmblemTile, {
  EMBLEM_GAP,
  EMBLEM_GUTTER,
  useEmblemTileWidth,
} from '@/features/series/component/EmblemTile';
import RarityMark from '@/features/series/component/RarityMark';
import { probationNext, probationShort } from '@/features/home/probation';
import { font, hp } from '@/utils/responsive';

/** A section's name, with how many it holds beside it. */
const SectionTitle = ({
  title,
  count,
  note,
}: {
  title: string;
  count?: number;
  note?: string;
}) => (
  <View style={styles.sectionTitle}>
    <Text accessibilityRole="header" style={styles.sectionName}>
      {title}
    </Text>
    {count ? (
      <Text style={styles.sectionCount}>
        {note ? `${count} ${note}` : count}
      </Text>
    ) : null}
  </View>
);

/** Under a sold tile: who bought it and when ("to Mira S. · 14 Nov"). */
const soldTo = (listing: Listing) => {
  const when = listing.soldAt
    ? new Date(listing.soldAt).toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
      })
    : null;
  const parts = [listing.buyer ? `to ${listing.buyer.name}` : null, when];
  return parts.filter(Boolean).join(' · ') || undefined;
};

// An NFT the user owns: one of their emblems they converted, or one they bought.
const isNft = (s: NftSeries) =>
  Boolean(s.convertedAt) ||
  s.mintChoice === 'mint' ||
  s.mintChoice === 'mint_poc';

/** Under a tile: its price while it is for sale, or that it was bought. */
const noteFor = (s: NftSeries) =>
  s.listing
    ? `For sale · ${formatPrice({
        amountCents: s.listing.priceCents,
        currency: s.listing.currency,
      })}`
    : s.acquired
    ? 'Bought'
    : undefined;

/**
 * The Gallery tab, one scroll in two parts, three emblems across:
 * - My Papolona gallery: every butterfly emblem the member's completed series
 *   earned (practice singles and twins too, which cannot become NFTs), grouped
 *   by category under its butterfly mark.
 * - My NFT investments: the emblems the member converted into NFTs; then the
 *   NFTs bought on the marketplace and those sold, each in a row that scrolls
 *   sideways. Anyone can buy, so Bought shows before membership too.
 * At the foot: the wallet balance, topping it up, and donating.
 * Above them, where the member stands on active membership. The collective
 * artwork and the marketplace are on Discover. Practice series from before
 * singles and twins earned emblems never appear. Before
 * membership, a locked invitation. The series in progress lives in the
 * Journal, where readings are made.
 */
const CollectTab = () => {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<RootTabParamList>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  const probation = useProbation();
  const isMember = probation.data?.status === 'member';
  // Everyone: apprentices can own NFTs bought on the marketplace.
  const series = useSeriesList();
  const membership = useMembership();
  // NFTs the user sold: no longer theirs, but kept here marked as sold.
  const myListings = useMyListings();
  const sold = (myListings.data?.listings ?? []).filter(
    l => l.status === 'sold',
  );
  const tileWidth = useEmblemTileWidth();

  const emblems = useMemo(
    () =>
      (series.data ?? []).filter(
        s => s.status === 'completed' && hasEmblems(s) && !s.acquired,
      ),
    [series.data],
  );
  // Series left unfinished live in the Journal; the Gallery only points there.
  const unfinishedCount = useMemo(
    () =>
      (series.data ?? []).filter(
        s => s.status === 'abandoned' || s.status === 'failed',
      ).length,
    [series.data],
  );
  // The NFT whose card is open.
  const [detail, setDetail] = useState<NftDetail | null>(null);
  const openDetail = (d: NftDetail) => {
    setDetail(null);
    if (d.kind === 'sold') navigation.navigate(SCREENS.listing, { id: d.listing.id });
    else navigation.navigate(SCREENS.seriesDetail, { seriesId: d.series.id });
  };
  // Rarest first, each rarity under its butterfly mark.
  const groups = useMemo(
    () =>
      RARITY_ORDER.map(rarity => ({
        rarity,
        items: emblems.filter(s => rarityOf(s.rarity) === rarityOf(rarity)),
      })).filter(g => g.items.length > 0),
    [emblems],
  );
  const nfts = useMemo(
    () =>
      (series.data ?? []).filter(
        s => s.status === 'completed' && s.nftEligible && isNft(s),
      ),
    [series.data],
  );
  const converted = nfts.filter(s => !s.acquired);
  const bought = nfts.filter(s => s.acquired);
  const wallet = membership.data?.wallet;

  // Pull to refresh: the member's series.
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        probation.refetch(),
        membership.refetch(),
        myListings.refetch(),
        queryClient.refetchQueries({ queryKey: queryKeys.seriesAll }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // An NFT opens its card; an emblem not yet converted opens its page.
  const ownTile = (item: NftSeries) => {
    const nft = item.nftEligible && isNft(item);
    return (
      <EmblemTile
        key={item.id}
        artworkKey={item.artworkKey}
        rarity={item.rarity}
        length={item.length}
        width={tileWidth}
        nft={nft}
        note={noteFor(item)}
        subnote={nft ? item.reference ?? undefined : undefined}
        accessibilityLabel={`${rarityOf(item.rarity).label} ${
          nft ? 'NFT' : 'emblem'
        }, ${item.length} readings${item.listing ? ', for sale' : ''}${
          item.acquired ? ', bought' : ''
        }${item.reference ? `, reference ${item.reference}` : ''}. Open.`}
        onPress={() =>
          nft
            ? setDetail({ kind: 'own', series: item })
            : navigation.navigate(SCREENS.seriesDetail, { seriesId: item.id })
        }
      />
    );
  };

  const soldTile = (listing: Listing) => {
    const price = formatPrice({
      amountCents: listing.priceCents,
      currency: listing.currency,
    });
    return (
      <EmblemTile
        key={listing.id}
        artworkKey={listing.series.artworkKey}
        rarity={listing.series.rarity}
        length={listing.series.length}
        width={tileWidth}
        nft
        note={`Sold · ${price}`}
        subnote={soldTo(listing)}
        accessibilityLabel={`${
          rarityOf(listing.series.rarity).label
        } NFT, sold for ${price}${
          listing.buyer ? ` to ${listing.buyer.name}` : ''
        }, open.`}
        onPress={() => setDetail({ kind: 'sold', listing })}
      />
    );
  };

  const renderLocked = () => {
    const data = probation.data;
    if (!data) return <ActivityIndicator color={GOLD} style={styles.loading} />;
    return (
      <View style={styles.locked}>
        <Text accessibilityRole="header" style={styles.lockedTitle}>
          Collecting opens to members
        </Text>
        <Text style={styles.body}>
          {data.complete
            ? 'Your apprenticeship is complete. Join the collective, free, to start a series: each reading the judge passes reveals one tile of your artwork.'
            : `Finish your apprenticeship first (${probationShort(
                data,
              )}). ${probationNext(
                data,
              )} Then join the collective, free, to start collecting.`}
        </Text>
        <AppButton
          title={data.complete ? 'Join the collective' : 'Open the journal'}
          onPress={() =>
            data.complete
              ? navigation.navigate(SCREENS.membership)
              : navigation.navigate(BOTTOMTABSCREN.journal)
          }
          variant="primary"
          style={styles.lockedButton}
          textStyle={styles.lockedButtonText}
        />
      </View>
    );
  };

  const renderGallery = () => {
    if (series.isPending) {
      return <ActivityIndicator color={GOLD} style={styles.loading} />;
    }
    if (series.isError) {
      return (
        <Text style={styles.error}>
          {getErrorMessage(series.error, 'Could not load your gallery.')}
        </Text>
      );
    }
    if (groups.length === 0) {
      return (
        <Text style={styles.body}>
          None yet. Every reading Papolona passes in a series earns a butterfly
          emblem; a completed series is one set.
        </Text>
      );
    }
    return groups.map(({ rarity, items }) => (
      <View key={rarity} style={styles.group}>
        <View style={styles.groupTitle}>
          <RarityMark rarity={rarity} size={14} showLabel />
          <Text style={styles.groupCount}>{items.length}</Text>
        </View>
        <View style={styles.grid}>{items.map(ownTile)}</View>
      </View>
    ));
  };

  const renderNfts = () => {
    if (series.isPending || series.isError) return null;
    if (converted.length === 0) {
      return (
        <Text style={styles.body}>
          None yet. Open an emblem in your gallery to convert it into an NFT, or
          buy one on the marketplace in Discover.
        </Text>
      );
    }
    return <View style={styles.grid}>{converted.map(ownTile)}</View>;
  };

  // A row of tiles that scrolls sideways, edge to edge.
  const renderRow = (tiles: React.ReactNode[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {tiles}
    </ScrollView>
  );

  const renderBought = () =>
    bought.length > 0 ? (
      <>
        <View style={styles.sectionGap} />
        <SectionTitle title="Bought" count={bought.length} />
        {renderRow(bought.map(ownTile))}
      </>
    ) : null;

  // The user's pennies, buying more, and a gift to Papolona.
  const renderFooter = () => (
    <View style={styles.footer}>
      {wallet ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Balance ${formatPrice({
            amountCents: wallet.balanceCents,
            currency: wallet.currency,
          })}. Open your pennies.`}
          onPress={() => navigation.navigate(SCREENS.wallet)}
          style={({ pressed }) => [
            styles.footerItem,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.footerLabel}>Your pennies</Text>
          <Text style={styles.footerValue}>
            {formatPrice({
              amountCents: wallet.balanceCents,
              currency: wallet.currency,
            })}
          </Text>
        </Pressable>
      ) : null}
      {wallet ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate(SCREENS.wallet)}
          style={({ pressed }) => [
            styles.footerItem,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.footerLink}>Buy pennies</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate(SCREENS.donate)}
        style={({ pressed }) => [styles.footerItem, pressed && styles.pressed]}
      >
        <Text style={styles.footerLink}>Donate</Text>
      </Pressable>
    </View>
  );

  return (
    <TabBackground deep>
      <CustomHeader title="Gallery" txtStyle={styles.headerTitle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={GOLD}
            colors={['#D9C77E']}
            progressBackgroundColor="#0B120D"
          />
        }
      >
        {!isMember ? (
          <>
            {renderLocked()}
            {/* Bought on the marketplace before membership. */}
            {renderBought()}
            {renderFooter()}
          </>
        ) : (
          <>
            {membership.data ? (
              <ActiveBanner
                active={membership.data.active}
                onPress={() => navigation.navigate(SCREENS.membership)}
              />
            ) : null}
            <SectionTitle title="My Papolona gallery" count={emblems.length} />
            {renderGallery()}
            <View style={styles.sectionGap} />
            <SectionTitle title="My NFT investments" count={converted.length} />
            {renderNfts()}
            {renderBought()}
            {unfinishedCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${unfinishedCount} unfinished series are in your Journal. Open the Journal.`}
                onPress={() => navigation.navigate(BOTTOMTABSCREN.journal)}
                style={({ pressed }) => [styles.noteCard, pressed && styles.pressed]}
              >
                <Text style={styles.noteTitle}>
                  {`${unfinishedCount} unfinished ${
                    unfinishedCount === 1 ? 'series is' : 'series are'
                  } in your Journal`}
                </Text>
                <Text style={styles.noteBody}>
                  Only completed series show here. A series left unfinished, or
                  stopped by a failed reading, keeps its emblems in the Journal,
                  with a placeholder where the failed reading would be. It cannot
                  become an NFT.
                </Text>
                <Text style={styles.noteLink}>Open the Journal</Text>
              </Pressable>
            ) : null}
            {sold.length > 0 ? (
              <>
                <View style={styles.sectionGap} />
                <SectionTitle
                  title="Sold"
                  count={sold.length}
                  note={sold.length === 1 ? 'NFT sold' : 'NFTs sold'}
                />
                {renderRow(sold.map(soldTile))}
              </>
            ) : null}
            {renderFooter()}
          </>
        )}
      </ScrollView>
      <NftDetailSheet
        detail={detail}
        onClose={() => setDetail(null)}
        onOpen={openDetail}
      />
    </TabBackground>
  );
};

export default CollectTab;

const GOLD = '#E8D58A';
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const styles = StyleSheet.create({
  headerTitle: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(25),
  },
  scrollContent: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: 32,
    paddingHorizontal: EMBLEM_GUTTER,
    // Clears the floating tab bar, like the other tabs.
    paddingBottom: hp(120),
  },
  loading: { marginVertical: hp(24) },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: hp(12),
  },
  sectionName: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  sectionCount: { color: MUTED, fontSize: font(15) },
  // Wide, so each part reads on its own.
  sectionGap: { height: hp(36) },
  group: { marginBottom: hp(20) },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: hp(10),
  },
  groupCount: { color: MUTED, fontSize: font(12) },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: EMBLEM_GAP,
    rowGap: hp(18),
  },
  body: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  error: { color: '#F0A29A', fontSize: font(14), lineHeight: font(20) },
  locked: { marginTop: hp(8) },
  lockedTitle: {
    marginBottom: hp(8),
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(24),
    lineHeight: font(31),
  },
  lockedButton: { marginTop: hp(24), backgroundColor: '#D9C77E' },
  lockedButtonText: { color: '#172016' },
  // Out to the screen's edges, so the row scrolls from edge to edge.
  row: { marginHorizontal: -EMBLEM_GUTTER },
  rowContent: { paddingHorizontal: EMBLEM_GUTTER, columnGap: EMBLEM_GAP },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: hp(36),
    paddingTop: hp(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(161, 190, 148, 0.28)',
  },
  footerItem: { minHeight: 44, justifyContent: 'center' },
  footerLabel: { color: MUTED, fontSize: font(12) },
  footerValue: { color: CREAM, fontSize: font(16), fontWeight: '600' },
  footerLink: { color: GOLD, fontSize: font(15), fontWeight: '600' },
  noteCard: {
    marginTop: hp(28),
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.35)',
    backgroundColor: 'rgba(11, 18, 13, 0.6)',
  },
  noteTitle: { color: CREAM, fontSize: font(15), fontWeight: '600' },
  noteBody: {
    marginTop: 6,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(19),
  },
  noteLink: {
    marginTop: 8,
    color: GOLD,
    fontSize: font(14),
    fontWeight: '600',
  },
  pressed: { opacity: 0.75 },
});
