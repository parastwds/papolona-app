import React, { useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { ACCENT } from '@/theme/colors';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useActiveSeries, useMembership } from '@/services/queries';
import { SeriesOption, startSeries } from '@/services/session';
import AppBottomModal from '@/components/AppBottomModal';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { LEVELS, rarityOf } from '../artworks';
import SeriesCard from './SeriesCard';
import { Butterfly } from './Butterfly';

type SeriesLength = SeriesOption['length'];

const CREAM = '#F1EEE0';
const GOLD = '#E8D58A';
const MUTED = '#B4B8AB';
const FAINT = '#979C8F';
const ON_GOLD = '#172016';

type Choice = {
  length: SeriesLength;
  // On the tile, under the count.
  short: string;
  // In the caption and on the button.
  name: string;
  about: string;
  rarity?: string;
};

const PRACTICE: Choice[] = [
  {
    length: 1,
    short: 'Single',
    name: 'Single papolona',
    about: 'One reading to practise on. Earns an emblem, but cannot become an NFT.',
  },
  {
    length: 2,
    short: 'Twin',
    name: 'Twin papolona',
    about: 'Two readings to practise on. Earns emblems, but cannot become an NFT.',
  },
];

const LEVEL_CHOICES: Choice[] = LEVELS.map(level => ({
  length: level.length,
  short: `Level ${level.level}`,
  name: level.name,
  about: `${level.length} readings${
    level.level === 3 ? ', offering coherent advice' : ''
  }, each AI validated. Earns a ${
    rarityOf(level.rarity).label
  } butterfly emblem.`,
  rarity: level.rarity,
}));

const ALL = [...PRACTICE, ...LEVEL_CHOICES];

// The NFT levels as one grid of butterflies, three to a row: level one lights
// the first row (3), level two two rows (6), level three four rows (12) and
// level four all eight (24). Each level's badge sits beside its last row.
const GRID_ROWS = 8;
const GRID_COLS = 3;
const ROWS_FOR: Partial<Record<SeriesLength, number>> = { 3: 1, 6: 2, 12: 4, 24: 8 };
const LEVEL_AT_ROW = new Map(
  LEVEL_CHOICES.map((c, i) => [(ROWS_FOR[c.length] ?? 1) - 1, { choice: c, number: i + 1 }]),
);
const ORANGE = ACCENT.orange;
// Tapping a butterfly picks the smallest level that reaches its row.
const levelForRow = (row: number) =>
  LEVEL_CHOICES.find(c => (ROWS_FOR[c.length] ?? 0) > row) ?? null;

type Props = {
  // Today's reading has passed: a new series waits for the next clue.
  startLocked?: boolean;
};

/**
 * The member's series, in its own box on the Journal. With one under way: its
 * grid and progress. Otherwise the choice of the next one: a practice reading
 * (single or twin, as radio buttons), then the levels as one grid of 24
 * butterflies with a numbered badge for each level; tapping a badge or a
 * butterfly lights up that level's butterflies, one for each reading the judge
 * must pass. Then START. A series is optional: readings can be drawn without one.
 */
const SeriesBox = ({ startLocked = false }: Props) => {
  const queryClient = useQueryClient();
  const active = useActiveSeries();
  // Explorers may start singles, twins and Level 1 only.
  const membershipData = useMembership().data;
  const allowed = membershipData?.allowedSeriesLengths;
  // A provisional Creator reads like an Explorer until their first Level 1 NFT.
  const provisional = membershipData?.creatorStage === 'provisional';
  const isAllowed = (length: SeriesLength) =>
    !allowed || allowed.length === 0 || allowed.includes(length);
  const [selected, setSelected] = useState<SeriesLength | null>(null);
  // The level an Explorer tapped that needs Creator or Collector: the pop-up.
  const [lockedTap, setLockedTap] = useState<Choice | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState('');

  if (active.isPending) {
    return <ActivityIndicator color={GOLD} style={styles.loading} />;
  }
  if (active.data) {
    return <SeriesCard embedded hideStart onStart={() => undefined} />;
  }

  const choice = ALL.find(c => c.length === selected) ?? null;
  const canStart = choice !== null && !isStarting && !startLocked;

  const choose = (length: SeriesLength) => {
    // The butterflies below grow or shrink into place.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(length);
    setMessage('');
  };

  const start = async () => {
    if (!canStart || !choice) return;
    setIsStarting(true);
    setMessage('');
    try {
      const series = await startSeries(choice.length);
      queryClient.setQueryData(queryKeys.seriesActive, series);
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
      setSelected(null);
    } catch (error) {
      setMessage(
        getErrorMessage(error, 'Could not start the series. Please try again.'),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesAll });
    } finally {
      setIsStarting(false);
    }
  };

  // Single or twin: a radio button on the practice line.
  const renderRadio = (c: Choice) => {
    const on = selected === c.length;
    return (
      <Pressable
        key={c.length}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${c.name}: ${c.length} ${
          c.length === 1 ? 'reading' : 'readings'
        }. ${c.about}`}
        onPress={() => choose(c.length)}
        hitSlop={8}
        style={({ pressed }) => [styles.radio, pressed && styles.pressed]}
      >
        <View style={[styles.radioRing, on && styles.radioRingOn]}>
          {on ? <View style={styles.radioDot} /> : null}
        </View>
        <Text style={[styles.radioText, on && styles.radioTextOn]}>
          {c.short}
        </Text>
      </Pressable>
    );
  };

  // A level's numbered badge, beside the last row it lights.
  const renderBadge = (c: Choice, number: number) => {
    const on = selected === c.length;
    const locked = !isAllowed(c.length);
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`Level ${number}: ${c.length} readings. ${c.about}${
          locked ? ' Needs Creator or Collector.' : ''
        }`}
        onPress={() => (locked ? setLockedTap(c) : choose(c.length))}
        hitSlop={8}
        style={({ pressed }) => [
          styles.badge,
          on && styles.badgeOn,
          locked && styles.locked,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.badgeText}>{number}</Text>
      </Pressable>
    );
  };

  const litRows = (selected && ROWS_FOR[selected]) || 0;

  return (
    <View>
      <View style={styles.frame}>
        {/* Practice: single or twin, no NFT. */}
        <Text style={styles.label}>Select reading</Text>
        <View accessibilityRole="radiogroup" style={styles.radios}>
          {PRACTICE.map(renderRadio)}
        </View>

        {/* NFT levels: tap a number to light its butterflies. */}
        <Text style={[styles.label, styles.labelGap]}>
          Select reading in series
        </Text>
        <View accessibilityRole="radiogroup" style={styles.gridRow}>
          <View
            style={styles.grid}
            accessible
            accessibilityLabel={
              litRows
                ? `${litRows * GRID_COLS} butterflies lit`
                : 'Choose a level to light its butterflies'
            }
          >
            {Array.from({ length: GRID_ROWS }, (_, row) => {
              const level = levelForRow(row);
              return (
                <Pressable
                  key={row}
                  disabled={!level}
                  onPress={() =>
                    level &&
                    (isAllowed(level.length)
                      ? choose(level.length)
                      : setLockedTap(level))
                  }
                  style={({ pressed }) => [
                    styles.butterflyRow,
                    pressed && styles.pressed,
                  ]}
                >
                  {Array.from({ length: GRID_COLS }, (__, col) => (
                    <View key={col} style={styles.cell}>
                      <Butterfly lit={row < litRows} />
                    </View>
                  ))}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.badges}>
            {Array.from({ length: GRID_ROWS }, (_, row) => {
              const level = LEVEL_AT_ROW.get(row);
              return (
                <View key={row} style={styles.badgeSlot}>
                  {level ? renderBadge(level.choice, level.number) : null}
                </View>
              );
            })}
          </View>
        </View>
        {LEVEL_CHOICES.some(c => !isAllowed(c.length)) ? (
          <Text style={styles.lockedNote}>
            {provisional
              ? 'As a provisional Creator you can read Single, Twin and Level 1. Convert your first Level 1 series to open every level.'
              : 'As an Explorer you can read Single, Twin and Level 1. Tap another level to upgrade.'}
          </Text>
        ) : null}
        <Text style={choice ? styles.choiceAbout : styles.choiceEmpty}>
          {choice
            ? `${choice.name}: ${choice.about}`
            : 'Choose a practice reading or tap a level number.'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          choice ? `Start ${choice.name.toLowerCase()}` : 'Start a series'
        }
        accessibilityState={{ busy: isStarting, disabled: !canStart }}
        disabled={!canStart}
        onPress={start}
        style={({ pressed }) => [
          styles.startButton,
          !canStart && !isStarting && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {isStarting ? (
          <ActivityIndicator color={ON_GOLD} />
        ) : (
          <Text style={styles.startText}>START</Text>
        )}
      </Pressable>
      {startLocked ? (
        <Text style={styles.note}>
          You can start your next series when the next clue opens.
        </Text>
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {/* An Explorer tapped a level beyond Level 1: how to upgrade. */}
      <AppBottomModal visible={lockedTap !== null} onClose={() => setLockedTap(null)}>
        <View style={styles.upgrade}>
          <Lock size={22} color={ORANGE} strokeWidth={1.8} />
          <Text accessibilityRole="header" style={styles.upgradeTitle}>
            {provisional
              ? `Become a full Creator to read ${lockedTap?.short ?? 'this level'}`
              : `Upgrade to read ${lockedTap?.short ?? 'this level'}`}
          </Text>
          <Text style={styles.upgradeText}>
            {provisional
              ? 'Complete a Level 1 series and convert it into an NFT: your first Level 1 NFT makes you a full Creator, and Levels 2, 3 and 4 open.'
              : 'Explorers can read Single, Twin and Level 1. Become a Creator or Collector to read Levels 2, 3 and 4, and to convert and sell your series as NFTs.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setLockedTap(null);
              navigation.navigate(SCREENS.membership);
            }}
            style={({ pressed }) => [styles.startButton, styles.upgradeButton, pressed && styles.pressed]}
          >
            <Text style={styles.startText}>See memberships</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLockedTap(null)}
            hitSlop={8}
            style={({ pressed }) => [styles.upgradeLater, pressed && styles.pressed]}
          >
            <Text style={styles.upgradeLaterText}>Not now</Text>
          </Pressable>
        </View>
      </AppBottomModal>
    </View>
  );
};

export default SeriesBox;

const styles = StyleSheet.create({
  loading: { marginVertical: hp(16) },
  pressed: { opacity: 0.75 },
  // The choices above START: no frame of their own, the Series box holds them.
  frame: { paddingTop: hp(4) },
  label: { color: CREAM, fontFamily: 'serif', fontSize: font(17) },
  labelGap: { marginTop: hp(18) },
  radios: { flexDirection: 'row', gap: wp(36), marginTop: hp(6) },
  radio: { flexDirection: 'row', alignItems: 'center', gap: wp(8), minHeight: 44 },
  radioRing: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 213, 138, 0.75)',
    borderRadius: 11,
  },
  radioRingOn: { borderColor: GOLD },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GOLD },
  radioText: { color: CREAM, fontSize: font(16) },
  radioTextOn: { color: GOLD, fontWeight: '700' },
  // The butterflies in an orange frame, with the level badges to its right.
  gridRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: hp(10) },
  grid: {
    flex: 1,
    paddingVertical: hp(6),
    paddingHorizontal: wp(6),
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 14,
  },
  butterflyRow: { flexDirection: 'row', height: wp(40) },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badges: { width: wp(52), marginLeft: wp(10), paddingVertical: hp(6) },
  badgeSlot: { height: wp(40), alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: wp(32),
    height: wp(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(16),
    backgroundColor: ORANGE,
  },
  badgeOn: { borderWidth: 2, borderColor: GOLD, transform: [{ scale: 1.12 }] },
  badgeText: { color: ON_GOLD, fontSize: font(15), fontWeight: '700' },
  locked: { opacity: 0.35 },
  upgrade: { alignItems: 'center', gap: hp(10) },
  upgradeTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(20), textAlign: 'center' },
  upgradeText: { color: MUTED, fontSize: font(14), lineHeight: font(21), textAlign: 'center' },
  upgradeButton: { alignSelf: 'stretch' },
  upgradeLater: { minHeight: 40, justifyContent: 'center' },
  upgradeLaterText: { color: GOLD, fontSize: font(15), fontWeight: '600' },
  lockedNote: {
    marginTop: hp(10),
    color: FAINT,
    fontSize: font(13),
    lineHeight: font(19),
  },
  choiceAbout: {
    marginTop: hp(12),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(20),
    textAlign: 'center',
  },
  choiceEmpty: {
    marginTop: hp(12),
    color: FAINT,
    fontSize: font(14),
    lineHeight: font(20),
    textAlign: 'center',
  },
  startButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(14),
    borderRadius: 27,
    backgroundColor: '#D9C77E',
  },
  startText: { color: ON_GOLD, fontSize: font(18), fontWeight: '700', letterSpacing: 1 },
  disabled: { opacity: 0.45 },
  note: {
    marginTop: hp(8),
    color: FAINT,
    fontSize: font(13),
    textAlign: 'center',
  },
  error: {
    marginTop: hp(8),
    color: '#E2A09A',
    fontSize: font(14),
    textAlign: 'center',
  },
});
