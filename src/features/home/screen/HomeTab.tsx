import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useMemo } from 'react';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { ACCENT } from '@/theme/colors';
import { BOTTOMTABSCREN, SCREENS } from '@/constants/screens';
import TabBackground from '@/components/TabBackground';
import CustomHeader from '@/components/CustomHeader';
import { RootStackParamList, RootTabParamList } from '@/navigation/types';
import { useWall } from '@/services/queries';
import {
  artworkFor,
  rarityOf,
  readingLevelOf,
} from '@/features/series/artworks';
import EmblemSet from '@/features/series/component/EmblemSet';
import MembershipProgress from '../component/MembershipProgress';
import MonthDensity from '../component/MonthDensity';
import StatsPanel from '../component/StatsPanel';

// While the collective artwork is empty: the demo emblems, one a day.
const FALLBACK_EMBLEMS = Array.from(
  { length: 15 },
  (_, i) => `butterfly_${String(i + 1).padStart(2, '0')}`,
);

/** Days since 1 January 1970 in the user's own time zone: changes at their midnight. */
const dayNumber = () => {
  const now = new Date();
  return Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000,
  );
};

const HomeTab = () => {
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<RootTabParamList>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();
  // The reading of the day: one of the longest (most meaningful) completed
  // series on the collective artwork in Discover, the same one all day; a demo
  // emblem while the wall is empty.
  const wall = useWall();
  const tiles = useMemo(
    () => wall.data?.pages.flatMap(p => p.tiles) ?? [],
    [wall.data],
  );
  const longest = useMemo(() => {
    const most = Math.max(0, ...tiles.map(t => t.length));
    return tiles.filter(t => t.length === most);
  }, [tiles]);
  const today = dayNumber();
  const tile = longest.length ? longest[today % longest.length] : null;
  const artworkKey =
    tile?.artworkKey ?? FALLBACK_EMBLEMS[today % FALLBACK_EMBLEMS.length];
  // Named by its level ("Level three reading by Theo W.").
  const emblemTitle = tile
    ? `${readingLevelOf(tile.rarity)?.name ?? rarityOf(tile.rarity).label} by ${
        tile.creator?.name ?? tile.owner.name
      }`
    : 'What are you noticing?';
  const emblemCaption = wall.isPending && !tile
    ? 'Loading today’s Papolona…'
    : 'Papolona of the day';

  // Readings are made in the Journal.
  const beginExperienceHandler = () => {
    navigation.navigate(BOTTOMTABSCREN.journal);
  };
  return (
    <TabBackground deep>
      <CustomHeader title="Home" txtStyle={styles.headerTitle} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* The reading of the day leads; what it is sits under it. It opens
            the emblem with every reading that earned it, in full. */}
        <Pressable
          disabled={!tile}
          onPress={() =>
            tile && navigation.navigate(SCREENS.wallTile, { id: tile.id })
          }
          accessibilityRole={tile ? 'button' : 'image'}
          accessibilityLabel={
            tile
              ? `Open the reading of the day: ${emblemTitle}, and its readings`
              : 'Reading of the day'
          }
          style={({ pressed }) => pressed && styles.pressed}
        >
          {/* The day's completed series: one butterfly per reading. A demo
              butterfly while the wall is empty. */}
          <View style={styles.frame}>
            {tile ? (
              <View style={styles.setWrap}>
                <EmblemSet
                  artworkKey={tile.artworkKey}
                  length={tile.length}
                  framed={false}
                  maxHeight={wp(300)}
                />
              </View>
            ) : (
              <Image
                source={artworkFor(artworkKey)}
                contentFit="contain"
                transition={300}
                style={styles.emblem}
              />
            )}
          </View>
          <Text style={styles.artworkTitle} numberOfLines={2}>
            {emblemTitle}
          </Text>
          <Text style={styles.artworkMeta} numberOfLines={2}>
            {emblemCaption}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={beginExperienceHandler}
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.startButtonText}>Start new reading</Text>
          <ArrowRight size={17} color="#172016" strokeWidth={2} />
        </Pressable>

        {/* Shown until membership; members have their series in the Journal. */}
        <MembershipProgress
          onPress={beginExperienceHandler}
          onOpenMembership={() => navigation.navigate(SCREENS.membership)}
        />

        <StatsPanel />
        <MonthDensity
          onOpenDay={day => navigation.navigate(SCREENS.journalThread, { day })}
        />
      </ScrollView>
    </TabBackground>
  );
};

export default HomeTab;


const styles = StyleSheet.create({
  headerTitle: { color: '#F1EEE0', fontFamily: 'serif', fontSize: font(25) },
  scrollContent: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: 32,
    paddingHorizontal: wp(20),
    // Clears the floating tab bar, like the other tabs.
    paddingBottom: hp(120),
  },
  pressed: { opacity: 0.9 },
  // One thin edge, so a dark artwork still has a boundary on the dark page.
  frame: {
    width: '100%',
    // At least this tall; a longer set (three to a row) makes it taller.
    minHeight: wp(260),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  // The emblem whole, with room around it, on black like the Gallery's.
  emblem: { flex: 1, margin: '8%' },
  setWrap: { flex: 1, justifyContent: 'center', padding: '4%' },
  artworkTitle: {
    marginTop: hp(12),
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(24),
    lineHeight: font(30),
  },
  artworkMeta: {
    marginTop: 4,
    color: ACCENT.orange,
    fontSize: font(14),
    lineHeight: font(20),
  },
  startButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: hp(20),
    borderRadius: 25,
    backgroundColor: '#D9C77E',
  },
  startButtonText: { color: '#172016', fontSize: font(16), fontWeight: '700' },
});
