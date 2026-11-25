import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpenText, Palette } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMarket, useMembership } from '@/services/queries';
import { formatPrice, type Listing } from '@/services/session';
import ScreenHeader, { GOLD } from '@/features/artwork/component/ScreenHeader';
import { rarityOf } from '@/features/series/artworks';
import EmblemTile, {
  EMBLEM_COLUMNS,
  EMBLEM_GAP,
  EMBLEM_GUTTER,
  useEmblemTileWidth,
} from '@/features/series/component/EmblemTile';
import { font, hp } from '@/utils/responsive';
import PackageOffers from '../component/PackageOffers';

type Props = NativeStackScreenProps<RootStackParamList, 'Marketplace'>;

const MUTED = '#B4B8AB';

export const listingPrice = (l: Pick<Listing, 'priceCents' | 'currency'>) =>
  formatPrice({ amountCents: l.priceCents, currency: l.currency });

/**
 * The marketplace: every NFT members have put up for sale, newest first, three across (tap one to see it
 * and buy it), then the Sensitisation Package, the retreat (by application) and published series.
 */
const Marketplace = ({ navigation }: Props) => {
  const market = useMarket();
  const membership = useMembership();
  const size = useEmblemTileWidth();
  const listings = useMemo(
    () => market.data?.pages.flatMap(p => p.listings) ?? [],
    [market.data],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Listing>) => (
      <EmblemTile
        artworkKey={item.series.artworkKey}
        rarity={item.series.rarity}
        length={item.series.length}
        width={size}
        owner={item.mine ? 'You' : item.seller.name}
        note={listingPrice(item)}
        accessibilityLabel={`${rarityOf(item.series.rarity).label} NFT by ${
          item.seller.name
        }, ${listingPrice(item)}. Open.`}
        onPress={() => navigation.navigate(SCREENS.listing, { id: item.id })}
      />
    ),
    [size, navigation],
  );

  // The packages stay on offer while the NFTs load or can't.
  const renderEmpty = () => {
    if (market.isPending) {
      return <ActivityIndicator color={GOLD} style={styles.empty} />;
    }
    if (market.isError) {
      return (
        <Text style={[styles.text, styles.empty]}>
          {getErrorMessage(market.error, 'Could not load the NFTs for sale.')}
        </Text>
      );
    }
    return (
      <Text style={[styles.text, styles.empty]}>
        Nothing for sale yet. Active members can sell an NFT as soon as they
        build and convert it.
      </Text>
    );
  };

  const renderBody = () => {
    return (
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={EMBLEM_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        onEndReached={() => {
          if (market.hasNextPage && !market.isFetchingNextPage)
            market.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              NFTs for sale
            </Text>
            <Text style={styles.text}>
              NFTs recently converted, which appear at the top of the Papolona
              collaborative systems artwork. Buy one and it moves to your
              Gallery, under Bought.
            </Text>
          </View>
        }
        ListEmptyComponent={renderEmpty()}
        // Under the NFTs: the more that load, the packages follow them.
        ListFooterComponent={
          <View>
            {market.isFetchingNextPage ? (
              <ActivityIndicator color={GOLD} style={styles.loading} />
            ) : null}
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, styles.packagesTitle]}
            >
              Initiation and retreat
            </Text>
            <Text style={styles.text}>
              Every member receives the Sensitisation Package once: with an NFT
              conversion every 60 days, it makes you an active member. The
              retreat is by application.
            </Text>
            <View style={styles.packages}>
              {membership.data ? (
                <PackageOffers membership={membership.data} withRetreat />
              ) : membership.isError ? (
                <Text style={styles.text}>
                  {getErrorMessage(
                    membership.error,
                    'Could not load the packages.',
                  )}
                </Text>
              ) : (
                <ActivityIndicator color={GOLD} />
              )}
            </View>

            {/* Mark Dolamore's original Enigma Prism art: none on offer yet. */}
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, styles.packagesTitle]}
            >
              Original Enigma Prism art by Mark Dolamore
            </Text>
            <View style={styles.editionsEmpty}>
              <Palette size={24} color={GOLD} strokeWidth={1.5} />
              <Text style={styles.editionsTitle}>Coming soon</Text>
              <Text style={[styles.text, styles.centered]}>
                Original works will be offered here.
              </Text>
            </View>

            {/* Published series: not built yet, so always empty. */}
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, styles.packagesTitle]}
            >
              Published series
            </Text>
            <Text style={styles.text}>
              A completed 24-reading series, edited and published as a digital
              edition. Sales are shared between its creator, the members who
              contributed and Papolona.
            </Text>
            <View style={styles.editionsEmpty}>
              <BookOpenText size={24} color={GOLD} strokeWidth={1.5} />
              <Text style={styles.editionsTitle}>No editions yet</Text>
              <Text style={[styles.text, styles.centered]}>
                The first published series will appear here.
              </Text>
            </View>
          </View>
        }
      />
    );
  };

  return (
    <TabBackground deep>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader title="Marketplace" onBack={() => navigation.goBack()} />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default Marketplace;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingTop: hp(20),
    paddingHorizontal: EMBLEM_GUTTER,
    paddingBottom: hp(32),
    gap: hp(18),
  },
  row: { gap: EMBLEM_GAP },
  loading: { marginVertical: hp(12) },
  text: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  sectionTitle: {
    marginBottom: hp(6),
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(20),
  },
  packagesTitle: { marginTop: hp(18) },
  packages: { marginTop: hp(14) },
  editionsEmpty: {
    alignItems: 'center',
    gap: 6,
    marginTop: hp(14),
    paddingVertical: hp(22),
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 18,
  },
  editionsTitle: { color: '#F1EEE0', fontSize: font(15), fontWeight: '600' },
  centered: { textAlign: 'center' },
  empty: { marginTop: hp(24) },
});
