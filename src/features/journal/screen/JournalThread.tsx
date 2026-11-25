import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sparkles } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { CLUE_FONT } from '@/theme/fonts';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useJournalEntries, useJournalInsights } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { regenerateJournalInsights } from '@/services/session';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import JournalEntryCard from '../component/JournalEntryCard';
import { isPendingEntry, useJournalCache } from '../journalCache';
import { dayRange, dayTitle, groupByDay } from '../journalDays';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalThread'>;

// The AI reading that refines a day's notes into one reflection is switched off: the Reflection
// section is hidden and never requested. Set to true to bring it back. This doesn't touch the AI
// judge of clue interpretations or its eeriness/satisfaction scores.
const SHOW_AI_REFLECTION = false;

/** One day of the journal: its entries, then (when switched on) the AI's refined reading of them. */
const JournalThread = ({ navigation, route }: Props) => {
  const { day } = route.params;
  const range = dayRange(day);
  const queryClient = useQueryClient();
  const { confirmDelete } = useJournalCache();
  const [statusMessage, setStatusMessage] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // The entries come from the cached journal, so deletes here show on the Journal tab too.
  const journal = useJournalEntries();
  const entries =
    groupByDay(journal.data?.pages.flatMap(page => page.entries) ?? []).find(
      group => group.day === day,
    )?.entries ?? [];
  const savedEntries = entries.filter(entry => !isPendingEntry(entry));

  // A day picked on the calendar may be older than the pages loaded so far:
  // load more until the journal reaches back past the start of that day.
  const loaded = journal.data?.pages.flatMap(page => page.entries) ?? [];
  const oldestLoaded = loaded[loaded.length - 1]?.createdAt;
  const needsOlder =
    journal.hasNextPage &&
    (!oldestLoaded || new Date(oldestLoaded) >= new Date(range.from));
  const { fetchNextPage, isFetchingNextPage } = journal;
  useEffect(() => {
    if (needsOlder && !isFetchingNextPage) fetchNextPage();
  }, [needsOlder, isFetchingNextPage, fetchNextPage]);
  const loadingDay = entries.length === 0 && (needsOlder || journal.isPending);
  const clues = [
    ...new Set(entries.map(entry => entry.clue?.clue).filter(Boolean)),
  ];

  const insights = useJournalInsights(range, SHOW_AI_REFLECTION);

  const regenerate = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setStatusMessage('');
    try {
      const fresh = await regenerateJournalInsights(range);
      queryClient.setQueryData(queryKeys.journalInsights(day), fresh);
    } catch (error) {
      setStatusMessage(
        getErrorMessage(
          error,
          'Could not refresh the reading. Please try again.',
        ),
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const renderReading = () => {
    if (loadingDay) return <ActivityIndicator color={COLORS.gold} />;
    if (savedEntries.length === 0) {
      return (
        <Text style={styles.muted}>No entries are left for this day.</Text>
      );
    }
    if (insights.isPending || isRegenerating) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.muted}>
            Reading your day… this can take a few seconds.
          </Text>
        </View>
      );
    }
    if (insights.isError) {
      return (
        <>
          <Text style={styles.muted}>
            {getErrorMessage(insights.error, 'Could not read this day.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => insights.refetch()}
            hitSlop={8}
            style={styles.retry}
          >
            <Text style={styles.linkText}>Try again</Text>
          </Pressable>
        </>
      );
    }
    const reading = insights.data;
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Refined</Text>
          <Text style={styles.refined}>{reading.refined}</Text>
        </View>

        <View style={styles.readingFooter}>
          <Text style={styles.footnote}>
            AI reading of {reading.entryCount}{' '}
            {reading.entryCount === 1 ? 'entry' : 'entries'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read this day again"
            onPress={regenerate}
            hitSlop={8}
            style={styles.regenerate}
          >
            <RefreshCw size={12} color={COLORS.gold} strokeWidth={1.8} />
            <Text style={styles.linkText}>Read again</Text>
          </Pressable>
        </View>
      </>
    );
  };

  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader
          title={dayTitle(day)}
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {clues.length > 0 && (
            <View style={styles.clueRow}>
              <Sparkles size={13} color={COLORS.gold} strokeWidth={1.8} />
              <Text style={styles.clueText}>{clues.join(' · ')}</Text>
            </View>
          )}

          <Text accessibilityRole="header" style={styles.sectionHeading}>
            Entries
          </Text>
          {entries.map(entry => (
            <JournalEntryCard
              key={entry.clientId}
              entry={entry}
              onDelete={item => confirmDelete(item, setStatusMessage)}
            />
          ))}
          {statusMessage ? (
            <Text style={styles.status}>{statusMessage}</Text>
          ) : null}

          {SHOW_AI_REFLECTION && (
            <>
              <Text style={[styles.sectionHeading, styles.readingHeading]}>
                Reflection
              </Text>
              {renderReading()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default JournalThread;

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  cream: '#F1EEE0',
  muted: '#B4B8AB',
  faint: '#979C8F',
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.bottomBg },
  // As deep as the tabs': the text here sits on the artwork.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  flex: { flex: 1 },
  scrollContent: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: hp(20),
    paddingHorizontal: wp(20),
    paddingBottom: hp(40),
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: hp(20),
  },
  clueText: {
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(16),
    letterSpacing: 3,
  },
  sectionHeading: {
    marginBottom: hp(12),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  readingHeading: { marginTop: hp(24) },
  status: {
    marginBottom: hp(10),
    color: COLORS.muted,
    fontSize: font(13),
    textAlign: 'center',
  },
  // A quiet box, as elsewhere: a dark wash and one thin edge.
  card: {
    marginBottom: hp(12),
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  cardEyebrow: {
    marginBottom: hp(8),
    color: '#A1BE94',
    fontSize: font(13),
    fontWeight: '600',
  },
  refined: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(16),
    lineHeight: font(24),
  },
  readingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footnote: {
    color: COLORS.faint,
    fontSize: font(13),
  },
  regenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
  },
  linkText: { color: COLORS.gold, fontSize: font(14), fontWeight: '600' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(10),
    paddingVertical: hp(8),
  },
  muted: {
    flexShrink: 1,
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
});
