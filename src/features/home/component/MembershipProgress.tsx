import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { useProbation } from '@/services/queries';

interface MembershipProgressProps {
  // Where readings are made: the Journal tab.
  onPress: () => void;
  // Once probation is complete: the membership screen (join, free).
  onOpenMembership: () => void;
}

/**
 * "Probation · 3 of 28 readings": how far a new user is towards membership.
 * Each interpretation the AI judge passes is one reading, one day forward.
 * Once probation is complete it leads to joining (free); members see the
 * series card instead (see Home). Hidden while it can't load.
 */
const MembershipProgress = ({
  onPress,
  onOpenMembership,
}: MembershipProgressProps) => {
  const { data } = useProbation();
  if (!data || data.status === 'member') return null;

  const { readingsDone, readingsRequired, complete } = data;
  const done = Math.min(readingsDone, readingsRequired);
  const remaining = readingsRequired - done;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        complete
          ? 'Apprenticeship complete. Choose your membership.'
          : `Apprenticeship: ${done} of ${readingsRequired} readings passed. Open the journal.`
      }
      onPress={complete ? onOpenMembership : onPress}
      style={({ pressed }) => [styles.section, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        {complete && <BadgeCheck size={20} color="#E8D58A" strokeWidth={1.6} />}
        <Text accessibilityRole="header" style={styles.title}>
          {complete
            ? 'Apprenticeship complete'
            : `Apprenticeship · ${done} of ${readingsRequired} passed`}
        </Text>
        <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: readingsRequired, now: done }}
      >
        <View
          style={[
            styles.fill,
            { width: `${(done / readingsRequired) * 100}%` },
          ]}
        />
      </View>

      <Text style={styles.text}>
        {complete
          ? `You’ve passed all ${readingsRequired} readings. Choose your membership (Explorer, Creator or Collector), then receive your Sensitisation Package: initiation into the Papolona Method. As a member your prompts go from 90 to 30 a month: trust your own splits more.`
          : done === 0
          ? `Draw a clue in the Journal and interpret it. Each interpretation the AI judge passes is a reading; after ${readingsRequired} you’re ready for membership.`
          : `${remaining} more ${
              remaining === 1 ? 'reading' : 'readings'
            } to go. Draw and interpret a clue each day to keep going.`}
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
  track: {
    height: 6,
    marginTop: hp(12),
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
