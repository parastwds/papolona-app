import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { useProbation } from '@/services/queries';
import type { ProbationProgress } from '@/services/session';
import { probationNext, probationRule, probationShort } from '../probation';

interface MembershipProgressProps {
  // Where readings are made: the Journal tab.
  onPress: () => void;
  // Once probation is complete: the membership screen (join, free).
  onOpenMembership: () => void;
}

/** One labelled bar: "Days  5 of 28". */
export const ApprenticeshipBar = ({
  label,
  now,
  max,
}: {
  label: string;
  now: number;
  max: number;
}) => (
  <View style={styles.bar}>
    <View style={styles.barHead}>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>
        {now} of {max}
      </Text>
    </View>
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(now, max) }}
    >
      <View
        style={[
          styles.fill,
          { width: `${max > 0 ? Math.min(1, now / max) * 100 : 100}%` },
        ]}
      />
    </View>
  </View>
);

/** The apprenticeship's two measures: its days and its passed readings. */
export const ApprenticeshipBars = ({ data }: { data: ProbationProgress }) => (
  <View>
    <ApprenticeshipBar
      label="Days"
      now={Math.min(data.daysDone, data.daysRequired)}
      max={data.daysRequired}
    />
    <ApprenticeshipBar
      label="Readings passed"
      now={data.readingsDone}
      max={data.readingsTarget}
    />
  </View>
);

/**
 * How far a new user is towards membership: the apprenticeship lasts 28 days
 * and needs at least 30 passed readings in a multiple of 3 (30, 33, 36…).
 * Once both are met it leads to joining and choosing a membership; members
 * see the series card instead (see Home). Hidden while it can't load.
 */
const MembershipProgress = ({
  onPress,
  onOpenMembership,
}: MembershipProgressProps) => {
  const { data } = useProbation();
  if (!data || data.status === 'member') return null;

  const { complete } = data;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        complete
          ? 'Apprenticeship complete. Choose your membership.'
          : `Apprenticeship: ${probationShort(data)}. ${probationNext(
              data,
            )} Open the journal.`
      }
      onPress={complete ? onOpenMembership : onPress}
      style={({ pressed }) => [styles.section, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        {complete && <BadgeCheck size={20} color="#E8D58A" strokeWidth={1.6} />}
        <Text accessibilityRole="header" style={styles.title}>
          {complete ? 'Apprenticeship complete' : 'Apprenticeship'}
        </Text>
        <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
      </View>

      <ApprenticeshipBars data={data} />

      <Text style={styles.text}>
        {complete
          ? `You’ve completed ${data.daysRequired} days and ${data.readingsDone} passed readings. Choose your membership (Explorer, Creator or Collector), then receive your Sensitisation Package: initiation into the Papolona Method. As a member your prompts go from 90 to 30 a month: trust your own splits more.`
          : data.readingsDone === 0
          ? `Draw a clue in the Journal and interpret it. Each interpretation the AI judge passes is a reading. You graduate after ${probationRule(
              data,
            )}.`
          : probationNext(data)}
      </Text>
    </Pressable>
  );
};

export default MembershipProgress;

const styles = StyleSheet.create({
  section: { marginTop: hp(36) },
  pressed: { opacity: 0.8 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
  },
  title: {
    flex: 1,
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(20),
  },
  bar: { marginTop: hp(12) },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: '#B4B8AB', fontSize: font(13) },
  barValue: { color: '#E8D58A', fontSize: font(13) },
  track: {
    height: 6,
    marginTop: hp(6),
    borderRadius: 3,
    backgroundColor: 'rgba(217, 199, 126, 0.18)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D9C77E',
  },
  text: {
    marginTop: hp(10),
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(21),
  },
});
