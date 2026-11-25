import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import TabBackground from '@/components/TabBackground';
import ScreenHeader, { GOLD } from '@/features/artwork/component/ScreenHeader';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useCommunityMap } from '@/services/queries';
import { font, hp, wp } from '@/utils/responsive';
import { MAP_COLORS } from '../component/WorldMap';
import ZoomableMap from '../component/ZoomableMap';
import { countryName, flagOf, pinsFor } from '../pins';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityMap'>;

const GUTTER = wp(20);
const GAP = wp(10);
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const FAINT = '#979C8F';
const HAIRLINE = 'rgba(161, 190, 148, 0.2)';

const Dot = ({ color }: { color: string }) => (
  <View style={[styles.dot, { backgroundColor: color }]} />
);

/** One of the map's totals, in a quiet box: the number, then what it counts. */
const Stat = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  // The pin colour it counts, shown beside the label.
  color?: string;
}) => (
  <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
    <Text style={styles.statValue}>{value}</Text>
    <View style={styles.statLabelRow}>
      {color ? <Dot color={color} /> : null}
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </View>
);

/**
 * Papolona around the world: a pin for every user, in the country of their mobile number.
 * Registered users (on probation) and full members get different colours. Only the country is
 * known, so pins are scattered at random inside it.
 */
const CommunityMap = ({ navigation }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const map = useCommunityMap();
  const countries = useMemo(() => map.data?.countries ?? [], [map.data]);
  const pins = useMemo(() => pinsFor(countries), [countries]);

  // A pinch or drag on the map must not scroll the page under it.
  const [mapBusy, setMapBusy] = useState(false);
  const located = countries.reduce(
    (sum, c) => sum + c.registered + c.members,
    0,
  );
  const total = (map.data?.registered ?? 0) + (map.data?.members ?? 0);
  const unplaced = total - located;

  const renderBody = () => {
    if (map.isPending)
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    if (map.isError) {
      return (
        <Text style={[styles.body, styles.message]}>
          {getErrorMessage(map.error, 'Could not load the map.')}
        </Text>
      );
    }
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!mapBusy}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={map.isRefetching}
            onRefresh={() => map.refetch()}
            tintColor={GOLD}
            colors={['#D9C77E']}
            progressBackgroundColor="#0B120D"
          />
        }
      >
        <View style={styles.stats}>
          <Stat
            value={map.data.registered}
            label={map.data.registered === 1 ? 'apprentice' : 'apprentices'}
            color={MAP_COLORS.registered}
          />
          <Stat
            value={map.data.members}
            label={map.data.members === 1 ? 'member' : 'members'}
            color={MAP_COLORS.member}
          />
          <Stat
            value={countries.length}
            label={countries.length === 1 ? 'country' : 'countries'}
          />
        </View>

        {/* Dark like the sea, with one thin edge, as on Discover. */}
        <View style={styles.frame}>
          <ZoomableMap
            width={Math.floor(screenWidth - GUTTER * 2)}
            pins={pins}
            onLockScroll={setMapBusy}
          />
        </View>
        <Text style={styles.hint}>
          Pinch or double-tap to zoom, drag to move around.
        </Text>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          By country
        </Text>
        {countries.length === 0 ? (
          <Text style={styles.body}>
            No pins yet. Everyone who signs up from now on appears here.
          </Text>
        ) : (
          <View style={styles.list}>
            <View style={styles.listHead}>
              <Text style={[styles.headText, styles.flex]}>Country</Text>
              <View style={styles.count}>
                <Dot color={MAP_COLORS.registered} />
                <Text style={styles.headText}>App.</Text>
              </View>
              <View style={styles.count}>
                <Dot color={MAP_COLORS.member} />
                <Text style={styles.headText}>Mem.</Text>
              </View>
            </View>
            {countries.map(c => (
              <View
                key={c.code}
                accessible
                accessibilityLabel={`${countryName(c.code)}: ${
                  c.registered
                } apprentices, ${c.members} members`}
                style={styles.row}
              >
                <Text style={styles.flag}>{flagOf(c.code)}</Text>
                <Text style={styles.country} numberOfLines={1}>
                  {countryName(c.code)}
                </Text>
                <Text style={[styles.countText, styles.count]}>
                  {c.registered}
                </Text>
                <Text style={[styles.countText, styles.count]}>
                  {c.members}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footnote}>
          {unplaced > 0
            ? `${unplaced} ${
                unplaced === 1 ? 'user has' : 'users have'
              } no mobile number yet and ${
                unplaced === 1 ? 'is' : 'are'
              } not on the map. `
            : ''}
          For privacy we only know the country of a mobile number: each pin is
          placed at random inside that country, never at a real location.
        </Text>
      </ScrollView>
    );
  };

  return (
    <TabBackground deep>
      {/* TabBackground keeps clear of the top; this keeps clear of the bottom. */}
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title="Around the world"
          onBack={() => navigation.goBack()}
        />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default CommunityMap;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: GUTTER },
  // Starts clear of the fade the header lays over the top of the scroll.
  content: {
    paddingTop: hp(20),
    paddingHorizontal: GUTTER,
    paddingBottom: hp(40),
  },
  stats: { flexDirection: 'row', gap: GAP },
  // A quiet box: a dark wash on the artwork and one thin edge.
  stat: {
    flex: 1,
    paddingVertical: hp(12),
    paddingHorizontal: wp(12),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  statValue: {
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(26),
    lineHeight: font(32),
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statLabel: { flexShrink: 1, color: MUTED, fontSize: font(13) },
  dot: { width: 8, height: 8, borderRadius: 4 },
  frame: {
    marginTop: hp(16),
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 16, 12, 0.9)',
  },
  hint: { marginTop: hp(8), color: FAINT, fontSize: font(13) },
  sectionTitle: {
    marginTop: hp(32),
    marginBottom: hp(8),
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  list: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  // Names the two count columns once, so each row can be just numbers.
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  headText: { color: FAINT, fontSize: font(12) },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
  },
  flag: { fontSize: font(18) },
  country: { flex: 1, color: CREAM, fontSize: font(15) },
  // Fixed width, so the numbers line up in columns under their headings.
  count: {
    width: wp(56),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countText: {
    color: CREAM,
    fontSize: font(15),
    fontVariant: ['tabular-nums'],
  },
  body: { color: MUTED, fontSize: font(14), lineHeight: font(20) },
  footnote: {
    marginTop: hp(20),
    color: FAINT,
    fontSize: font(13),
    lineHeight: font(19),
  },
});
