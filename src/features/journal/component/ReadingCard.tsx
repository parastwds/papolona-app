import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font, hp, wp } from '@/utils/responsive';
import { CLUE_FONT } from '@/theme/fonts';
import type { Reading } from '@/services/session';
import RarityMark from '@/features/series/component/RarityMark';

interface ReadingCardProps {
  reading: Reading;
  onPress: (reading: Reading) => void;
  // 'thumb': a small square for the Journal tab strip; 'tile': a gallery tile with the question.
  variant?: 'thumb' | 'tile';
  // The rarity of the completed emblem series this reading belonged to (tiles only).
  rarity?: string;
}

// "Passed", "Not passed" or "Not interpreted", from the AI judge's verdict.
export const verdictLabel = (reading: Reading) =>
  reading.interpretation
    ? reading.interpretation.verdict === 'pass'
      ? 'Passed'
      : 'Not passed'
    : 'Not interpreted';

const readingDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });

/** One reading: its clue in the clue font, when it was drawn, its verdict and (on tiles) the question asked. */
const ReadingCard = ({
  reading,
  onPress,
  variant = 'thumb',
  rarity,
}: ReadingCardProps) => {
  const tile = variant === 'tile';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reading ${reading.clue
        .split('')
        .join(' ')}, ${readingDate(reading.generatedAt)}. ${verdictLabel(
        reading,
      )}. ${reading.question}`}
      onPress={() => onPress(reading)}
      style={({ pressed }) => [
        styles.card,
        tile ? styles.tile : styles.thumb,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.date}>{readingDate(reading.generatedAt)}</Text>
        <View
          style={[
            styles.mark,
            reading.interpretation?.verdict === 'pass' && styles.markPass,
            reading.interpretation?.verdict === 'fail' && styles.markFail,
          ]}
        />
      </View>
      <Text
        style={[styles.clue, tile && styles.tileClue]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {reading.clue}
      </Text>
      {tile && reading.question ? (
        <Text style={styles.question} numberOfLines={3}>
          {reading.question}
        </Text>
      ) : null}
      {tile && rarity ? (
        <View style={styles.rarity}>
          <RarityMark rarity={rarity} size={13} showLabel />
        </View>
      ) : null}
    </Pressable>
  );
};

export default ReadingCard;

const styles = StyleSheet.create({
  // A quiet box, as elsewhere in the app: a dark wash and one thin edge.
  card: {
    padding: wp(12),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  thumb: {
    width: wp(112),
    height: wp(88),
    justifyContent: 'space-between',
  },
  tile: {
    flex: 1,
    minHeight: hp(130),
    gap: hp(8),
  },
  pressed: { opacity: 0.75 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Gold when passed, red when not, hollow until interpreted.
  mark: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
    borderRadius: 4,
  },
  markPass: { borderColor: '#D9C77E', backgroundColor: '#D9C77E' },
  markFail: { borderColor: '#E2A09A', backgroundColor: '#E2A09A' },
  date: {
    color: '#A1BE94',
    fontSize: font(13),
  },
  clue: {
    color: '#E8D58A',
    fontFamily: CLUE_FONT,
    fontSize: font(16),
    letterSpacing: 2,
  },
  tileClue: { fontSize: font(20) },
  question: {
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
  rarity: { marginTop: hp(8) },
});
