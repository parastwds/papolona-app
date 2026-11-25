import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Star } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import { Reading, rateReading, starsOf } from '@/services/session';

const STARS = [1, 2, 3, 4, 5];

interface ReadingRatingProps {
  reading: Reading;
  // The reading as saved, with its new ratings.
  onRated: (reading: Reading) => void;
  // On its own in a sheet: no rule above it to set it off from a verdict.
  plain?: boolean;
}

/**
 * After a reading is judged: the member states how satisfied they are with
 * the answer or advice, on a scale of five, and sees how Papolona rated it.
 * They can change it.
 */
const ReadingRating = ({ reading, onRated, plain }: ReadingRatingProps) => {
  const saved = starsOf(reading.ratings?.user?.satisfaction);
  const ai = starsOf(reading.ratings?.ai?.satisfaction);
  const [value, setValue] = useState<number | null>(saved);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const unchanged = saved !== null && saved === value;

  const save = async () => {
    if (value === null || unchanged || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      onRated(await rateReading(reading.id, value));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your rating.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.box, plain && styles.boxPlain]}>
      <Text style={styles.title}>
        {saved ? 'Your rating' : 'Rate this reading'}
      </Text>
      <Text style={styles.subtitle}>
        How satisfied are you with this answer or advice?
      </Text>
      <View
        style={styles.stars}
        accessibilityRole="adjustable"
        accessibilityLabel="Satisfaction, 1 to 5 stars"
        accessibilityValue={{ min: 1, max: 5, now: value ?? 0 }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => {
          const current = value ?? 3;
          setValue(
            event.nativeEvent.actionName === 'increment'
              ? Math.min(5, current + 1)
              : Math.max(1, current - 1),
          );
        }}
      >
        {STARS.map(n => {
          const on = (value ?? 0) >= n;
          return (
            <Pressable
              key={n}
              accessible={false}
              hitSlop={6}
              onPress={() => setValue(n)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Star
                size={wp(36)}
                color={on ? '#D9C77E' : 'rgba(161, 190, 148, 0.45)'}
                fill={on ? '#D9C77E' : 'transparent'}
                strokeWidth={1.5}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ends}>
        <Text style={styles.endText}>not satisfied</Text>
        <Text style={styles.endText}>fully answered</Text>
      </View>

      <View style={styles.footer}>
        {ai ? (
          <Text style={styles.aiText}>
            Papolona rated it <Text style={styles.aiValue}>{ai} / 5</Text>
          </Text>
        ) : (
          <View style={styles.flex} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: value === null || unchanged || isSaving,
          }}
          onPress={save}
          style={({ pressed }) => [
            styles.saveButton,
            (value === null || unchanged) && styles.saveDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#172016" />
          ) : (
            <Text style={styles.saveText}>
              {unchanged ? 'Saved' : saved ? 'Update' : 'Save rating'}
            </Text>
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default ReadingRating;

const styles = StyleSheet.create({
  // Part of the clue box it sits in, ruled off from the verdict above, not a box in a box.
  box: {
    alignSelf: 'stretch',
    marginTop: hp(18),
    paddingTop: hp(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(161, 190, 148, 0.28)',
  },
  boxPlain: { marginTop: 0, paddingTop: 0, borderTopWidth: 0 },
  title: {
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(18),
  },
  subtitle: {
    marginTop: hp(6),
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(16),
    paddingHorizontal: wp(8),
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(6),
  },
  endText: { color: '#979C8F', fontSize: font(13) },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    marginTop: hp(16),
  },
  flex: { flex: 1 },
  aiText: {
    flex: 1,
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
  aiValue: { color: '#E8D58A', fontWeight: '600' },
  saveButton: {
    minWidth: wp(104),
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(18),
    borderRadius: 22,
    backgroundColor: '#D9C77E',
  },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: '#172016', fontSize: font(14), fontWeight: '700' },
  pressed: { opacity: 0.75 },
  error: { marginTop: hp(8), color: '#E2A09A', fontSize: font(13) },
});
