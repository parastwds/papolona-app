import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, X } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { CLUE_FONT } from '@/theme/fonts';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useProbation, useReadings, useSeriesList } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { contestReading, starsOf, type Reading } from '@/services/session';
import AppBottomModal from '@/components/AppBottomModal';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import { SUB_RIPPLE } from '@/features/profile/component/ProfileSubScreen';
import ReadingCard from '../component/ReadingCard';
import { hasEmblems } from '@/features/series/artworks';

// The onboarding artwork: butterflies round the edges, dark and calm in the middle.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
import { localDay } from '../journalDays';

type Props = NativeStackScreenProps<RootStackParamList, 'ReadingsGallery'>;

const MIN_CONTEST_LENGTH = 20;

/** "Wed 25 Nov 2026 · 2:42 PM" */
const readingDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

/** One row of the fact table: a label, then its value. */
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.factRow}>
    <Text style={styles.factLabel}>{label}</Text>
    <View style={styles.factValueWrap}>{children}</View>
  </View>
);

/**
 * A reading that failed all three attempts may have its judgement contested,
 * once, within 90 days: the member says why they believe it is coherent and it
 * is emailed to Papolona with the reading. Once sent, it shows what they wrote.
 */
const ContestSection = ({
  reading,
  onContested,
}: {
  reading: Reading;
  onContested: (reading: Reading) => void;
}) => {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (reading.contest) {
    return (
      <>
        <Text accessibilityRole="header" style={styles.subheading}>
          Judgement contested
        </Text>
        <Text style={styles.body}>
          Sent to Papolona on{' '}
          {new Date(reading.contest.at).toLocaleDateString([], {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          . Papolona will reply by email.
        </Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{reading.contest.text}</Text>
        </View>
      </>
    );
  }

  const canSend = !busy && text.trim().length >= MIN_CONTEST_LENGTH;
  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    setError('');
    try {
      onContested(await contestReading(reading.id, text.trim()));
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not send your contest. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text accessibilityRole="header" style={styles.subheading}>
        Contest this judgement
      </Text>
      <Text style={styles.body}>
        If you believe this reading is coherent, tell Papolona why. Your reading
        and your case are sent to Papolona, who replies by email. You can contest
        a reading once.
      </Text>
      {writing ? (
        <>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={3000}
            textAlignVertical="top"
            placeholder="Why I believe my reading is coherent…"
            placeholderTextColor="rgba(205, 214, 198, 0.42)"
            accessibilityLabel="Why you believe your reading is coherent"
            style={styles.contestInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setWriting(false);
                setError('');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend, busy }}
              disabled={!canSend}
              onPress={send}
              style={({ pressed }) => [
                styles.primary,
                !canSend && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#172016" />
              ) : (
                <Text style={styles.primaryText}>Send</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setWriting(true)}
          style={({ pressed }) => [
            styles.secondary,
            styles.wide,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryText}>Contest judgement</Text>
        </Pressable>
      )}
    </>
  );
};

/**
 * One reading, opened from the readings or the calendar, laid out like the
 * Journal and the listing screens: the clue as tiles with its verdict and
 * question, a table of facts, the interpretation with its bites in a grid, and
 * (after three failed attempts) a way to contest the judgement.
 */
const ReadingDetail = ({
  reading,
  onOpenDay,
  onContested,
  onClose,
}: {
  reading: Reading;
  onOpenDay: () => void;
  onContested: (reading: Reading) => void;
  onClose: () => void;
}) => {
  const judged = reading.interpretation;
  const valid = judged?.verdict === 'pass';
  const parts = judged?.parts ?? [];
  const attempts = reading.attempts ?? (judged ? 1 : 0);
  const maxAttempts = reading.maxAttempts ?? 3;
  const ratings = reading.ratings;

  return (
    <View>
      {/* The sheet is tall: a way to close it that is always in reach. */}
      <View style={styles.headRow}>
        <View style={styles.closeSpacer} />
        <Text style={[styles.flex, styles.date]}>
          {readingDate(reading.generatedAt)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <X size={18} color={COLORS.cream} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* The clue as the Journal shows it: one tile per letter. */}
      <View
        style={styles.tiles}
        accessible
        accessibilityLabel={`Clue string ${reading.clue.split('').join(' ')}`}
      >
        {reading.clue.split('').map((letter, i) => (
          <View key={i} style={styles.tile}>
            <Text style={styles.tileLetter}>{letter}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.badge, !valid && styles.badgeFail]}>
        <Text style={[styles.badgeText, !valid && styles.failText]}>
          {valid ? 'Coherent' : 'Incomplete or invalid'}
        </Text>
      </View>

      <Text style={styles.question}>
        {reading.question || 'Left blank: an invitation for Papolona’s comment.'}
      </Text>

      <View style={styles.facts}>
        <Fact label="Attempts">
          <Text style={styles.factValue}>
            {judged ? `${attempts} of ${maxAttempts}` : 'None'}
          </Text>
        </Fact>
        <View style={styles.divider} />
        <Fact label="Graduation">
          <Text style={[styles.factValue, !valid && styles.mutedValue]}>
            {valid ? 'Counted' : 'Did not count'}
          </Text>
        </Fact>
        {ratings ? (
          <>
            <View style={styles.divider} />
            <Fact label="Satisfaction">
              <Text style={styles.factValue}>
                You {starsOf(ratings.user?.satisfaction) ?? '–'}/5 · Papolona{' '}
                {starsOf(ratings.ai?.satisfaction) ?? '–'}/5
              </Text>
            </Fact>
          </>
        ) : null}
        <View style={styles.divider} />
        {/* The day's notes: kept as written, not edited later. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Journal: notes from this day, not editable at a later date"
          onPress={onOpenDay}
          android_ripple={SUB_RIPPLE}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Fact label="Journal">
            <View style={styles.flex}>
              <Text style={styles.factValue}>Notes from this day</Text>
              <Text style={styles.factHint}>Not editable at a later date</Text>
            </View>
            <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
          </Fact>
        </Pressable>
      </View>

      <Text accessibilityRole="header" style={styles.subheading}>
        My interpretation
      </Text>
      {judged?.text ? (
        <Text style={styles.interpretation}>{judged.text}</Text>
      ) : (
        <Text style={styles.body}>
          {reading.expired
            ? 'Not interpreted within 12 hours.'
            : 'Not interpreted.'}
        </Text>
      )}

      {/* The bites, two to a row: letters from the clue and what they mean. */}
      {parts.length > 0 ? (
        <View style={styles.bites}>
          {parts.map(part => (
            <View key={part.part} style={styles.bite}>
              <Text style={styles.biteLetters}>{part.part}</Text>
              <Text style={styles.biteMeaning}>{part.meaning}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {judged?.feedback ? (
        <Text style={styles.feedback}>{judged.feedback}</Text>
      ) : null}

      {reading.canContest || reading.contest ? (
        <ContestSection reading={reading} onContested={onContested} />
      ) : null}
    </View>
  );
};

/**
 * Every reading the user has made, newest first; tap one to see its question in
 * full. Opened for a day (from the Journal's calendar), that day's reading opens.
 */
const ReadingsGallery = ({ navigation, route }: Props) => {
  const day = route.params?.day;
  const queryClient = useQueryClient();
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
          <ReadingDetail
            reading={open}
            onOpenDay={() => openDay(open)}
            onClose={() => setOpen(null)}
            onContested={reading => {
              setOpen(reading);
              queryClient.invalidateQueries({ queryKey: queryKeys.readings });
            }}
          />
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
  danger: '#E2A09A',
  hairline: 'rgba(161, 190, 148, 0.2)',
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
  pressed: { opacity: 0.75 },

  // The reading sheet.
  date: { color: COLORS.muted, fontSize: font(13), textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  closeSpacer: { width: 32 },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(241, 238, 224, 0.1)',
  },
  // The clue, one tile per letter, as in the Journal.
  tiles: { flexDirection: 'row', gap: wp(6), marginTop: hp(12) },
  tile: {
    flex: 1,
    aspectRatio: 1.12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.55)',
    borderRadius: 10,
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  tileLetter: { color: COLORS.gold, fontFamily: CLUE_FONT, fontSize: font(22) },
  // The verdict, as the Journal's pill.
  badge: {
    alignSelf: 'center',
    marginTop: hp(14),
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 213, 138, 0.16)',
  },
  badgeFail: { backgroundColor: 'rgba(226, 160, 154, 0.14)' },
  badgeText: { color: COLORS.gold, fontSize: font(14), fontWeight: '600' },
  failText: { color: COLORS.danger },
  question: {
    marginTop: hp(12),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: font(17),
    lineHeight: font(24),
    textAlign: 'center',
  },
  // The fact table, as on a listing or an emblem.
  facts: {
    marginTop: hp(18),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  factRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline },
  factLabel: { width: wp(108), color: COLORS.muted, fontSize: font(14) },
  factValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  factValue: { flexShrink: 1, color: COLORS.cream, fontSize: font(15) },
  mutedValue: { color: COLORS.muted },
  factHint: { marginTop: 2, color: COLORS.muted, fontSize: font(12) },
  subheading: {
    marginTop: hp(24),
    marginBottom: hp(6),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  interpretation: { color: COLORS.cream, fontSize: font(15), lineHeight: font(22) },
  body: { color: COLORS.muted, fontSize: font(14), lineHeight: font(21) },
  // The bites, two to a row.
  bites: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(8), marginTop: hp(14) },
  bite: {
    width: '48.5%',
    paddingVertical: hp(10),
    paddingHorizontal: wp(12),
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.35)',
    backgroundColor: 'rgba(23, 32, 22, 0.55)',
  },
  biteLetters: {
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(18),
    letterSpacing: 2,
  },
  biteMeaning: { marginTop: 4, color: COLORS.cream, fontSize: font(14), lineHeight: font(19) },
  feedback: {
    marginTop: hp(14),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(21),
  },
  // The member's contest, once sent.
  quote: {
    marginTop: hp(10),
    paddingLeft: wp(12),
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(232, 213, 138, 0.5)',
  },
  quoteText: { color: COLORS.cream, fontSize: font(15), lineHeight: font(22) },
  contestInput: {
    minHeight: hp(110),
    marginTop: hp(12),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.45)',
    color: COLORS.cream,
    fontSize: font(15),
    lineHeight: font(21),
  },
  error: { marginTop: hp(8), color: COLORS.danger, fontSize: font(13) },
  // Buttons as in the app's sheets: outline beside filled.
  actions: { flexDirection: 'row', gap: wp(12), marginTop: hp(14) },
  primary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#D9C77E',
  },
  primaryText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  secondary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  secondaryText: { color: COLORS.gold, fontSize: font(15), fontWeight: '600' },
  wide: { flex: 0, marginTop: hp(14) },
  disabled: { opacity: 0.45 },
});
