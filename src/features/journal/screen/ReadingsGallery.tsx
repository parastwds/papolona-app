import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { CLUE_FONT } from '@/theme/fonts';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useProbation, useReadings, useSeriesList } from '@/services/queries';
import { starsOf, type Reading } from '@/services/session';
import AppBottomModal from '@/components/AppBottomModal';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import { SUB_RIPPLE } from '@/features/profile/component/ProfileSubScreen';
import ReadingCard from '../component/ReadingCard';
import { hasEmblems } from '@/features/series/artworks';

// The onboarding artwork: butterflies round the edges, dark and calm in the middle.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
import { localDay } from '../journalDays';

type Props = NativeStackScreenProps<RootStackParamList, 'ReadingsGallery'>;

/**
 * Every reading the user has made, newest first; tap one to see its question in
 * full. Opened for a day (from the Journal's calendar), that day's reading opens.
 */
const ReadingsGallery = ({ navigation, route }: Props) => {
  const day = route.params?.day;
  const readings = useReadings();
  // A reading in a completed emblem series carries that series' rarity mark.
  const isMember = useProbation().data?.status === 'member';
  const series = useSeriesList(isMember);
  const rarityBySeries = new Map(
    (series.data ?? [])
      .filter(s => s.status === 'completed' && hasEmblems(s))
      .map(s => [s.id, s.rarity]),
  );
  const items = readings.data?.pages.flatMap(page => page.readings) ?? [];
  const [open, setOpen] = useState<Reading | null>(null);

  // The day asked for opens once its reading has loaded, and only once.
  const openedDay = useRef(false);
  const dayReading = day
    ? items.find(item => localDay(new Date(item.generatedAt)) === day)
    : undefined;
  useEffect(() => {
    if (!dayReading || openedDay.current) return;
    openedDay.current = true;
    setOpen(dayReading);
  }, [dayReading]);

  const openDay = (reading: Reading) => {
    setOpen(null);
    navigation.navigate(SCREENS.journalThread, {
      day: localDay(new Date(reading.generatedAt)),
    });
  };

  const renderEmpty = () => {
    if (readings.isPending) return <ActivityIndicator color={COLORS.gold} />;
    if (readings.isError) {
      return (
        <Text style={styles.muted}>
          {getErrorMessage(readings.error, 'Could not load your readings.')}
        </Text>
      );
    }
    return (
      <Text style={styles.muted}>
        Ask a question in the Journal and draw a clue: each one becomes a
        reading here.
      </Text>
    );
  };

  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      // Steps back slightly while a reading's sheet is open over it.
      style={[styles.background, open !== null && styles.blurred]}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Readings" onBack={() => navigation.goBack()} />

        <FlatList
          data={items}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReadingCard
              reading={item}
              variant="tile"
              onPress={setOpen}
              rarity={
                item.seriesId ? rarityBySeries.get(item.seriesId) : undefined
              }
            />
          )}
          ListEmptyComponent={renderEmpty}
          onEndReached={() => {
            if (readings.hasNextPage && !readings.isFetchingNextPage) {
              readings.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            readings.isFetchingNextPage ? (
              <ActivityIndicator color={COLORS.gold} style={styles.footer} />
            ) : null
          }
        />
      </SafeAreaView>

      <AppBottomModal
        visible={open !== null}
        onClose={() => setOpen(null)}
        background={SHEET_ARTWORK}
      >
        {open && (
          <>
            <Text style={styles.detailDate}>
              {new Date(open.generatedAt).toLocaleString([], {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            {/* The day's notes first: kept as written, not edited later. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => openDay(open)}
              android_ripple={SUB_RIPPLE}
              style={({ pressed }) => [
                styles.detailBox,
                styles.dayRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.flex}>
                <Text style={styles.boxLabel}>Journal</Text>
                <Text style={styles.dayRowText}>Notes from this day</Text>
                <Text style={styles.dayRowHint}>
                  Not editable at a later date
                </Text>
              </View>
              <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
            </Pressable>
            {open.question ? (
              <View style={styles.detailBox}>
                <Text style={styles.boxLabel}>My question</Text>
                <Text style={styles.detailQuestion}>{open.question}</Text>
              </View>
            ) : null}
            <View style={styles.detailBox}>
              <Text style={styles.boxLabel}>Papolona clue string</Text>
              <Text
                style={styles.detailClue}
                adjustsFontSizeToFit
                numberOfLines={1}
                accessibilityLabel={open.clue.split('').join(' ')}
              >
                {open.clue}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.boxLabel}>
                My interpretation ·{' '}
                <Text
                  style={
                    open.interpretation?.verdict === 'pass'
                      ? styles.verdictPass
                      : styles.verdictFail
                  }
                >
                  {open.interpretation
                    ? open.interpretation.verdict === 'pass'
                      ? 'Passed'
                      : 'Invalid'
                    : 'Incomplete'}
                </Text>
              </Text>
              {open.interpretation ? (
                <>
                  <Text style={styles.detailText}>
                    {open.interpretation.text}
                  </Text>
                  <Text style={styles.detailFeedback}>
                    {open.interpretation.feedback}
                  </Text>
                </>
              ) : null}
              {open.interpretation?.verdict !== 'pass' ? (
                <Text style={styles.detailFeedback}>
                  This reading did not count toward graduation.
                </Text>
              ) : null}
            </View>
            {open.ratings ? (
              <View style={styles.detailBox}>
                <Text style={styles.boxLabel}>Satisfaction</Text>
                <Text style={styles.detailText}>
                  You {starsOf(open.ratings.user?.satisfaction) ?? '–'} / 5 ·
                  Papolona {starsOf(open.ratings.ai?.satisfaction) ?? '–'} / 5
                </Text>
              </View>
            ) : null}
          </>
        )}
      </AppBottomModal>
    </ImageBackground>
  );
};

export default ReadingsGallery;

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  cream: '#F1EEE0',
  sage: '#A1BE94',
  muted: '#B4B8AB',
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.bottomBg },
  // Drawn by the platform: Android 12 and later blur, anything else stays sharp.
  blurred: { filter: [{ blur: 1.5 }] },
  // As deep as the tabs': the text here sits on the artwork.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  flex: { flex: 1 },
  list: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: hp(20),
    paddingHorizontal: wp(20),
    paddingBottom: hp(40),
    gap: wp(12),
  },
  row: { gap: wp(12) },
  footer: { marginVertical: hp(12) },
  muted: {
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
    marginTop: hp(24),
  },
  detailDate: {
    color: COLORS.muted,
    fontSize: font(14),
    textAlign: 'center',
  },
  detailClue: {
    marginTop: hp(6),
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(36),
    letterSpacing: 6,
    textAlign: 'center',
  },
  detailQuestion: {
    marginTop: hp(6),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: font(17),
    lineHeight: font(25),
  },
  detailText: {
    marginTop: hp(6),
    color: COLORS.cream,
    fontSize: font(15),
    lineHeight: font(22),
  },
  detailFeedback: {
    marginTop: hp(8),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  verdictPass: { color: COLORS.gold },
  verdictFail: { color: '#E2A09A' },
  // Each part of the reading in a frame of its own.
  detailBox: {
    marginTop: hp(12),
    paddingVertical: hp(12),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.3)',
    borderRadius: 14,
    backgroundColor: 'rgba(2, 8, 5, 0.45)',
  },
  boxLabel: {
    color: COLORS.sage,
    fontSize: font(13),
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // The row to the day's notes: opens them.
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(10),
  },
  dayRowText: { marginTop: hp(4), color: COLORS.cream, fontSize: font(16) },
  dayRowHint: { marginTop: 2, color: COLORS.muted, fontSize: font(13) },
  pressed: { opacity: 0.75 },
});
