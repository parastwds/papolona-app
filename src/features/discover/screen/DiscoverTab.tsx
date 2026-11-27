import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { font, hp, wp } from '@/utils/responsive';
import CustomHeader from '@/components/CustomHeader';
import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import MapBanner from '@/features/community/component/MapBanner';
import { artworkFor } from '@/features/series/artworks';
import { MEDITATION_STONE } from '@/features/market/component/PackageOffers';
import { useCommunityStats, useMarket } from '@/services/queries';
import type { CommunityStats } from '@/services/session';

const GUTTER = wp(20);
const GAP = wp(12);
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

// The Pyramid itself, for the story's tile.
const PYRAMID = require('@assets/enigma_prism.jpg');
// Four members' emblems, as a glimpse of the wall they make together.
// Three rows of three, as every emblem grid in the app.
const WALL_GLIMPSE = [
  'butterfly_03',
  'butterfly_07',
  'butterfly_11',
  'butterfly_14',
  'butterfly_01',
  'butterfly_05',
  'butterfly_09',
  'butterfly_12',
  'butterfly_15',
];

const STATS: { key: keyof CommunityStats; one: string; many: string }[] = [
  { key: 'sessions', one: 'perception session', many: 'perception sessions' },
  { key: 'artworks', one: 'artwork generated', many: 'artworks generated' },
  { key: 'countries', one: 'country', many: 'countries' },
  { key: 'members', one: 'member', many: 'members' },
];

/** 184200 -> '184K', 8240 -> '8.2K', 47 -> '47'. */
const compact = (n: number) => {
  if (n < 1000) return String(n);
  const [value, unit] = n < 1e6 ? [n / 1e3, 'K'] : [n / 1e6, 'M'];
  return `${
    value < 10 ? Math.floor(value * 10) / 10 : Math.floor(value)
  }${unit}`;
};

/** A section's name, as on Gallery, with an optional link at its end. */
const SectionTitle = ({
  title,
  link,
  onLink,
}: {
  title: string;
  link?: string;
  onLink?: () => void;
}) => (
  <View style={styles.sectionRow}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    {link ? (
      <Pressable accessibilityRole="button" onPress={onLink} hitSlop={10}>
        <Text style={styles.sectionLink}>{link}</Text>
      </Pressable>
    ) : null}
  </View>
);

/** A place to go, as a framed picture with what it is underneath, like an NFT on Collect. */
const Tile = ({
  width,
  title,
  text,
  onPress,
  children,
}: {
  width: number;
  title: string;
  text: string;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${title}. ${text}`}
    onPress={onPress}
    style={({ pressed }) => [{ width }, pressed && styles.pressed]}
  >
    <View style={styles.tileFrame}>{children}</View>
    <Text style={styles.tileTitle} numberOfLines={1}>
      {title}
    </Text>
    <Text style={styles.tileText} numberOfLines={2}>
      {text}
    </Text>
  </Pressable>
);

const DiscoverTab = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const stats = useCommunityStats();
  const market = useMarket();
  const forSale = market.data?.pages[0]?.listings.length ?? 0;
  const moreForSale = Boolean(market.data?.pages[0]?.nextBefore);
  const nftLine =
    forSale === 0
      ? 'and NFTs members sell'
      : `and ${forSale}${moreForSale ? '+' : ''} ${
          forSale === 1 && !moreForSale ? 'NFT' : 'NFTs'
        } for sale`;
  const { width } = useWindowDimensions();
  // Rounded down: two items and the gap filling the row exactly can wrap on rounding.
  const half = Math.floor((width - GUTTER * 2 - GAP) / 2) - 1;

  return (
    <TabBackground deep>
      <CustomHeader title="Discover" txtStyle={styles.headerTitle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SectionTitle title="Around the world" />
        <MapBanner onPress={() => navigation.navigate(SCREENS.communityMap)} />

        <View style={styles.sectionGap} />
        <SectionTitle title="Marketplace" />
        {/* Always here: the Sensitisation Package, the retreat, and the NFTs for sale. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Marketplace. The Sensitisation Package, the retreat, published series, ${nftLine}. Open.`}
          onPress={() => navigation.navigate(SCREENS.marketplace)}
          style={({ pressed }) => [
            styles.marketButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.marketStone}>
            <Image
              source={MEDITATION_STONE}
              contentFit="contain"
              style={styles.fill}
            />
          </View>
          <View style={styles.marketBody}>
            <Text style={styles.marketTitle}>Open the Marketplace</Text>
            <Text style={styles.marketText} numberOfLines={3}>
              The Sensitisation Package, the Château de Puycharnaud retreat,
              published series {nftLine}.
            </Text>
          </View>
          <ChevronRight size={20} color="#E8D58A" strokeWidth={1.6} />
        </Pressable>

        <View style={styles.sectionGap} />
        <SectionTitle title="Explore" />
        <View style={styles.grid}>
          <Tile
            width={half}
            title="Collaborative artwork"
            text="Every member's published series in one artwork."
            onPress={() => navigation.navigate(SCREENS.collectiveArtwork)}
          >
            <View style={styles.glimpse}>
              {WALL_GLIMPSE.map(key => (
                <View key={key} style={styles.glimpseCell}>
                  <Image
                    source={artworkFor(key)}
                    contentFit="contain"
                    style={styles.fill}
                  />
                </View>
              ))}
            </View>
          </Tile>
          <Tile
            width={half}
            title="Pyramid Art story"
            text="By Mark Dolamore, as an overview or in full."
            onPress={() => navigation.navigate(SCREENS.pyramidArtStory)}
          >
            <Image
              source={PYRAMID}
              contentFit="contain"
              style={styles.pyramid}
            />
          </Tile>
        </View>

        <View style={styles.sectionGap} />
        <SectionTitle title="The collective" />
        {/* The whole collective's totals, two to a row, each in its own box. */}
        <View style={styles.grid}>
          {STATS.map(stat => {
            const value = stats.data?.[stat.key];
            // A dash while loading or when the figures can't be fetched.
            const shown = value === undefined ? '–' : compact(value);
            const label = value === 1 ? stat.one : stat.many;
            return (
              <View
                key={stat.key}
                accessible
                accessibilityLabel={`${shown} ${label}`}
                style={[styles.stat, { width: half }]}
              >
                <Text style={styles.statValue}>{shown}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </TabBackground>
  );
};

export default DiscoverTab;

const styles = StyleSheet.create({
  headerTitle: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(25),
  },
  scrollContent: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: 32,
    paddingHorizontal: GUTTER,
    // Clears the floating tab bar, like the other tabs.
    paddingBottom: hp(120),
  },
  pressed: { opacity: 0.8 },
  fill: { width: '100%', height: '100%' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: hp(12),
  },
  sectionTitle: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  sectionLink: { color: '#E8D58A', fontSize: font(14), fontWeight: '600' },
  marketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(14),
    padding: wp(12),
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.45)',
    borderRadius: 18,
    backgroundColor: 'rgba(4, 10, 7, 0.6)',
  },
  marketStone: {
    width: wp(72),
    height: wp(72),
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F4F2EC',
  },
  marketBody: { flex: 1 },
  marketTitle: { color: CREAM, fontSize: font(16), fontWeight: '600' },
  marketText: {
    marginTop: 3,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(18),
  },
  // Wide, so each section reads as its own part of the page.
  sectionGap: { height: hp(36) },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    rowGap: GAP,
  },
  // Square and black, as on Collect; what the tile is sits under it.
  tileFrame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  tileTitle: {
    marginTop: 10,
    color: CREAM,
    fontSize: font(15),
    fontWeight: '600',
  },
  tileText: {
    marginTop: 2,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(18),
  },
  glimpse: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    padding: 8,
  },
  glimpseCell: { width: '33.33%', aspectRatio: 1, padding: 4 },
  pyramid: { width: '100%', height: '100%', transform: [{ scale: 0.86 }] },
  // A quiet box: a dark wash on the artwork and one thin edge.
  stat: {
    paddingVertical: hp(14),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  statValue: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(28),
    lineHeight: font(34),
  },
  statLabel: { marginTop: 2, color: MUTED, fontSize: font(13) },
});
