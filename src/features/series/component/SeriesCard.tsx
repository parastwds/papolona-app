import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Hourglass } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { useActiveSeries, useClueStatus } from '@/services/queries';
import { NftSeries } from '@/services/session';
import { rarityOf } from '../artworks';
import RarityMark from './RarityMark';
import RevealGrid from './RevealGrid';
import { ButterflyProgress } from './Butterfly';

interface SeriesCardProps {
  // No active series: open the series picker.
  onStart: () => void;
  // Active series: where readings are made (the Journal), or nothing when already there.
  onRead?: () => void;
  // Inside the Journal's step path: fills the step's width instead of the page's margins.
  embedded?: boolean;
  // Today's reading has passed: a new series waits for the next clue.
  startLocked?: boolean;
  // Only the series under way, without the (disabled) start button: the
  // Journal's Series box chooses the next series itself.
  hideStart?: boolean;
}

const MINUTE = 60 * 1000;

/** "2d 3h", "5h 12m" or "12m"; "under a minute" at the end. */
export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / MINUTE);
  if (minutes < 1) return 'under a minute';
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Re-renders every minute, for countdowns. */
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * The member's series, at the top of the Journal: a row to start one, which is
 * disabled while a series is under way; then, for that series, its grid with the
 * tiles revealed so far and what to do next before the deadline.
 * Members only: render it only for them.
 */
const SeriesCard = ({
  onStart,
  onRead,
  embedded,
  startLocked = false,
  hideStart = false,
}: SeriesCardProps) => {
  const active = useActiveSeries();
  const clueStatus = useClueStatus();
  const now = useNow();

  if (active.isPending || active.isError) return null;
  const series = active.data;
  const startOff = !!series || startLocked;

  // Starting a series is the heart of the app, so this leads the Journal. The
  // button is always there: gold when one can be started, off while one is
  // under way or while today's passed reading waits for the next clue.
  const startButton = (
    <View
      style={[styles.startButton, startOff && styles.startButtonOff]}
      accessible={false}
    >
      <Text style={[styles.startButtonText, startOff && styles.startTextOff]}>
        Start a series
      </Text>
      {startOff ? null : (
        <ArrowRight size={17} color="#172016" strokeWidth={2} />
      )}
    </View>
  );

  if (!series) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a series"
        accessibilityState={{ disabled: startLocked }}
        disabled={startLocked}
        onPress={onStart}
        style={({ pressed }) => [
          styles.card,
          embedded && styles.cardEmbedded,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.intro}>
          {/* A twelve-tile grid, unlit: what a series looks like before its readings. */}
          <View style={styles.preview}>
            <RevealGrid
              rows={3}
              cols={4}
              artworkKey=""
              revealedTiles={[]}
              previewOnly
              borderRadius={10}
            />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.text, styles.textFirst]}>
              Each reading the judge passes lights one tile. Choose 1, 2, 3, 6,
              12 or 24 readings: from three, each earns a butterfly emblem,
              rarer the longer the series.
            </Text>
          </View>
        </View>
        {startButton}
        {startLocked ? (
          <Text style={styles.offNote}>
            You can start your next series when the next clue opens.
          </Text>
        ) : null}
      </Pressable>
    );
  }

  const rarity = rarityOf(series.rarity);
  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      {/* The series under way: its grid, how far it has come, and what is next. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rarity.label} series: ${series.revealedCount} of ${series.length} readings approved.`}
        onPress={onRead}
        disabled={!onRead}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.topRow}>
          <Text style={styles.heading}>{series.length}-reading series</Text>
          <View style={styles.rarity}>
            {series.nftEligible ? (
              <>
                <RarityMark rarity={series.rarity} size={13} />
                <Text style={[styles.rarityText, { color: rarity.color }]}>
                  {rarity.label}
                </Text>
              </>
            ) : (
              <Text style={styles.practice}>Practice</Text>
            )}
          </View>
        </View>
        {/* One butterfly per reading, lit as the judge approves each. */}
        <ButterflyProgress total={series.length} lit={series.revealedCount} />
        <Text style={styles.title}>
          {series.revealedCount} of {series.length}{' '}
          {series.length === 1 ? 'reading' : 'readings'} approved
        </Text>
        <View style={styles.nextRow}>
          <Hourglass size={14} color="#D6C77F" strokeWidth={1.6} />
          <Text style={styles.nextText}>
            {nextStep(series, clueStatus.data, now)}
          </Text>
        </View>
      </Pressable>
      {hideStart ? null : (
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Start a series"
          accessibilityState={{ disabled: true }}
          accessibilityHint="Unavailable: a series is already under way"
        >
          {startButton}
          <Text style={styles.offNote}>
            You can start another once this one is finished.
          </Text>
        </View>
      )}
    </View>
  );
};

type ClueStatusData = ReturnType<typeof useClueStatus>['data'];

/** What the member should do next, and by when. */
function nextStep(series: NftSeries, status: ClueStatusData, now: number) {
  const last =
    status?.lastClue?.seriesId === series.id ? status.lastClue : null;
  // Each reading must be passed within 12 hours of its draw, or the series is lost.
  const deadline = last?.deadlineAt ? Date.parse(last.deadlineAt) : null;
  const left =
    deadline && deadline > now ? formatDuration(deadline - now) : null;
  if (last && !last.expired && left) {
    // Drawn in this series but not interpreted yet.
    if (!last.interpretation) {
      return `Interpret today’s clue in the Journal within ${left} to reveal a tile, or the series is lost.`;
    }
    // It failed and can still be resubmitted.
    if (
      last.interpretation.verdict === 'fail' &&
      (last.attemptsLeft ?? 0) > 0
    ) {
      return `Review and resubmit your interpretation in the Journal (${last.attemptsLeft} ${
        last.attemptsLeft === 1 ? 'attempt' : 'attempts'
      } left) within ${left}, or the series is lost.`;
    }
  }
  return 'Your next reading is ready. Once drawn, you have 12 hours to complete it.';
}

export default SeriesCard;

const styles = StyleSheet.create({
  // The Journal's leading block: the warm gold edge marks it as the main thing.
  card: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(8),
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.45)',
    borderRadius: 18,
    backgroundColor: 'rgba(4, 10, 7, 0.6)',
  },
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: wp(14) },
  cardEmbedded: { width: '100%', padding: wp(14) },
  preview: { width: wp(84) },
  heading: {
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(22),
    lineHeight: font(28),
  },
  text: {
    marginTop: hp(4),
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
  textFirst: { marginTop: 0 },
  // The one solid gold on the screen until a question is typed.
  startButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: hp(16),
    borderRadius: 25,
    backgroundColor: '#D9C77E',
  },
  startButtonOff: {
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.28)',
    backgroundColor: 'transparent',
  },
  startButtonText: { color: '#172016', fontSize: font(16), fontWeight: '700' },
  startTextOff: { color: '#979C8F', fontWeight: '600' },
  offNote: {
    marginTop: hp(8),
    color: '#979C8F',
    fontSize: font(13),
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(12),
  },
  title: {
    marginTop: hp(12),
    color: '#F1EEE0',
    fontSize: font(16),
    fontWeight: '600',
  },
  // The rarity as a coloured word with its butterfly mark, as in the Gallery.
  rarity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rarityText: { fontSize: font(14), fontWeight: '600' },
  practice: { color: '#B4B8AB', fontSize: font(14) },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(8),
    marginTop: hp(6),
  },
  nextText: {
    flex: 1,
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
});
