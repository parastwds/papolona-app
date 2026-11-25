import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { useStats } from '@/services/queries';
import { localDay } from '@/features/journal/journalDays';
import {
  ACTIVITY_LEVELS as LEVELS,
  activityOf,
  levelOf,
} from '../activityLevels';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface MonthDensityProps {
  // A day with activity: opens it in the Journal.
  onOpenDay: (day: string) => void;
}

/**
 * Monthly density: each day of the month as a block, brighter the more was
 * recorded (readings and notes). Passed readings get a dot.
 */
const MonthDensity = ({ onOpenDay }: MonthDensityProps) => {
  const now = new Date();
  const [shown, setShown] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const first = new Date(shown.year, shown.month, 1);
  const last = new Date(shown.year, shown.month + 1, 0);
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
  const isCurrentMonth =
    shown.year === now.getFullYear() && shown.month === now.getMonth();

  const leading = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= last.getDate(); d += 1) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const activeDays = [...byDay.values()].filter(b => activityOf(b) > 0).length;

  const move = (step: number) =>
    setShown(({ year, month }) => {
      const next = new Date(year, month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>YOUR JOURNAL</Text>
      {/* The section's own name on the left; on the right, the month shown and
          the arrows that step through months. */}
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Monthly density
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => move(-1)}
          android_ripple={NAV_RIPPLE}
          style={styles.navButton}
        >
          <ChevronLeft size={20} color="#F1EEE0" strokeWidth={1.7} />
        </Pressable>
        <Text
          style={styles.month}
          accessibilityLabel={first.toLocaleDateString([], {
            month: 'long',
            year: 'numeric',
          })}
        >
          {first.toLocaleDateString([], { month: 'short', year: 'numeric' })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: isCurrentMonth }}
          disabled={isCurrentMonth}
          onPress={() => move(1)}
          android_ripple={NAV_RIPPLE}
          style={[
            styles.navButton,
            styles.navLast,
            isCurrentMonth && styles.navDisabled,
          ]}
        >
          <ChevronRight size={20} color="#F1EEE0" strokeWidth={1.7} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {stats.isPending ? (
        <ActivityIndicator style={styles.loading} color="#E8D58A" />
      ) : (
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={index} style={styles.cell} />;
            const key = localDay(new Date(shown.year, shown.month, day));
            const bucket = byDay.get(key);
            const activity = activityOf(bucket);
            const future = key > today;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`${day}: ${
                  bucket?.readings ?? 0
                } readings, ${bucket?.notes ?? 0} notes`}
                disabled={activity === 0}
                onPress={() => onOpenDay(key)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.block,
                    { backgroundColor: LEVELS[levelOf(activity, max)] },
                    key === today && styles.today,
                    future && styles.future,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      levelOf(activity, max) >= 3 && styles.dayTextDark,
                    ]}
                  >
                    {day}
                  </Text>
                  {bucket && bucket.passed > 0 ? (
                    <View style={styles.passDot} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeDays} active day{activeDays === 1 ? '' : 's'}
        </Text>
        <View style={styles.scale}>
          <Text style={styles.footerText}>less</Text>
          {LEVELS.map(color => (
            <View
              key={color}
              style={[styles.scaleBlock, { backgroundColor: color }]}
            />
          ))}
          <Text style={styles.footerText}>more</Text>
        </View>
      </View>
    </View>
  );
};

export default MonthDensity;

const NAV_RIPPLE = {
  color: 'rgba(232, 213, 138, 0.14)',
  borderless: true,
  radius: 22,
};

const styles = StyleSheet.create({
  // Its own panel: a tinted box with one thin edge, set apart from the emblem
  // above and the other panel, with a small gold label over its name.
  section: {
    marginTop: hp(24),
    paddingHorizontal: wp(16),
    paddingTop: hp(16),
    paddingBottom: hp(18),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 20,
    backgroundColor: 'rgba(6, 12, 8, 0.72)',
  },
  eyebrow: {
    marginBottom: 2,
    color: '#E8D58A',
    fontSize: font(11),
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: {
    flex: 1,
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(20),
  },
  // A plain chevron in a 44 touch area; the pair sits flush with the right edge.
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  navLast: { marginRight: -12 },
  // A fixed width, so the arrows stay put as the month's name changes.
  month: {
    minWidth: 72,
    textAlign: 'center',
    color: '#F1EEE0',
    fontSize: font(14),
    fontWeight: '600',
  },
  navDisabled: { opacity: 0.35 },
  weekRow: { flexDirection: 'row', marginTop: hp(4) },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#979C8F',
    fontSize: font(12),
  },
  loading: { marginVertical: hp(40) },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: hp(6),
  },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5 },
  block: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  today: { borderWidth: 1.5, borderColor: '#F1EEE0' },
  future: { opacity: 0.35 },
  dayText: { color: 'rgba(241, 238, 224, 0.85)', fontSize: font(12) },
  dayTextDark: { color: '#172016', fontWeight: '700' },
  passDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1EEE0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(10),
  },
  footerText: { color: '#B4B8AB', fontSize: font(12) },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scaleBlock: { width: 11, height: 11, borderRadius: 3 },
});
