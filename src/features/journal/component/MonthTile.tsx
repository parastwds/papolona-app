import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { useStats } from '@/services/queries';
import {
  ACTIVITY_LEVELS as LEVELS,
  activityOf,
  levelOf,
} from '@/features/home/activityLevels';
import { localDay } from '../journalDays';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = {
  // A day with something recorded: its reading to review, or its notes when it has none.
  onOpenDay: (day: string, hasReading: boolean) => void;
  // Opens the full calendar, with its other spans.
  onOpenCalendar: () => void;
};

/**
 * A month across the full width of the Journal: one block per day, brighter
 * the more was recorded, with today ringed. The arrows step through the
 * months; tap a day with something recorded to review its reading.
 */
const MonthTile = ({ onOpenDay, onOpenCalendar }: Props) => {
  const now = new Date();
  // Months back from this one: 0 is this month.
  const [back, setBack] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const stats = useStats({
    unit: 'day',
    from: localDay(first),
    to: localDay(last),
  });

  const byDay = new Map(
    (stats.data?.series ?? []).map(bucket => [bucket.start, bucket]),
  );
  const max = Math.max(1, ...[...byDay.values()].map(activityOf));
  const today = localDay(now);
  const activeDays = [...byDay.values()].filter(b => activityOf(b) > 0).length;

  // Weeks start on Monday, as on the full calendar.
  const leading = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= last.getDate(); d += 1) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const month = first.toLocaleDateString([], {
    month: 'long',
    ...(first.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });

  return (
    <View style={styles.tile}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => setBack(b => b + 1)}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <ChevronLeft size={26} color="#B4B8AB" strokeWidth={1.6} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={styles.heading}
          numberOfLines={1}
        >
          {month}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: back === 0 }}
          disabled={back === 0}
          hitSlop={8}
          onPress={() => setBack(b => Math.max(0, b - 1))}
          style={({ pressed }) => [
            styles.arrow,
            back === 0 && styles.arrowOff,
            pressed && styles.pressed,
          ]}
        >
          <ChevronRight size={26} color="#B4B8AB" strokeWidth={1.6} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((label, index) => (
          <Text key={index} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={index} style={styles.cell} />;
          const key = localDay(
            new Date(first.getFullYear(), first.getMonth(), day),
          );
          const bucket = byDay.get(key);
          const activity = activityOf(bucket);
          const level = levelOf(activity, max);
          const active = activity > 0 && key <= today;
          const hasReading = (bucket?.readings ?? 0) > 0;
          return (
            <Pressable
              key={index}
              accessibilityRole={active ? 'button' : undefined}
              accessibilityLabel={`${day} ${month}${
                key === today ? ', today' : ''
              }${
                active
                  ? hasReading
                    ? ', review the reading'
                    : ', open the notes'
                  : ''
              }`}
              disabled={!active}
              onPress={() => onOpenDay(key, hasReading)}
              style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.block,
                  { backgroundColor: LEVELS[level] },
                  key === today && styles.today,
                  key > today && styles.future,
                ]}
              >
                {/* Dark on the brighter golds, light on the faint ones. */}
                <Text
                  style={[
                    styles.date,
                    level >= 3 && styles.dateOnGold,
                    key === today && styles.dateToday,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.foot}>
        <Text style={styles.meta}>
          {activeDays} active {activeDays === 1 ? 'day' : 'days'}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenCalendar}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.link}>Full calendar</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default MonthTile;

const styles = StyleSheet.create({
  // A quiet box, as elsewhere: a dark wash and one thin edge.
  tile: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(16),
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  pressed: { opacity: 0.7 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(16),
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { opacity: 0.3 },
  heading: {
    flexShrink: 1,
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(30),
  },
  week: { flexDirection: 'row', marginTop: hp(12) },
  weekday: {
    width: '14.28%',
    color: '#979C8F',
    fontSize: font(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: hp(4) },
  // Seven to a row, sized in whole pixels so the last one never wraps.
  cell: { width: '14.28%', aspectRatio: 1, padding: 4 },
  block: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  date: { color: '#B4B8AB', fontSize: font(15), fontWeight: '600' },
  dateOnGold: { color: '#172016' },
  dateToday: { color: '#F1EEE0' },
  today: { borderWidth: 2, borderColor: '#F1EEE0' },
  future: { opacity: 0.35 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(10),
  },
  meta: { color: '#B4B8AB', fontSize: font(13) },
  link: { color: '#E8D58A', fontSize: font(13), fontWeight: '600' },
});
