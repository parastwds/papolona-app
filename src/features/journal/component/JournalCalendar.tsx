import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { Segmented } from '@/features/profile/component/ProfileSubScreen';
import { useJournalCalendar, useStats } from '@/services/queries';
import type { StatsBucket } from '@/services/session';
import {
  ACTIVITY_LEVELS,
  activityOf,
  levelOf,
} from '@/features/home/activityLevels';
import { localDay } from '../journalDays';

interface JournalCalendarProps {
  // A past day: opens its thread.
  onOpenDay: (day: string) => void;
  // Today: notes are made for today, so this goes to the composer.
  onToday: () => void;
  // Takes the full width of what holds it (a sheet) instead of the page's margins.
  fill?: boolean;
}

// From a single day out to everything, each tap on a period zooms in a level.
type Zoom = 'day' | 'week' | 'month' | 'year' | '5y' | 'all';

const ZOOMS: { key: Zoom; label: string; name: string }[] = [
  { key: 'day', label: 'Day', name: 'one day' },
  { key: 'week', label: 'Week', name: 'one week' },
  { key: 'month', label: 'Month', name: 'one month' },
  { key: 'year', label: 'Year', name: 'one year' },
  { key: '5y', label: '5Y', name: 'five years' },
  { key: 'all', label: 'All', name: 'all time' },
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_INITIALS = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
];

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Monday of the week containing `date`. */
const weekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

/** Days of a month laid out in Monday-first weeks; null fills the gaps. */
function monthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** The anchor moved one period back (-1) or forward (+1) at this zoom. */
function moveAnchor(anchor: Date, zoom: Zoom, step: number) {
  switch (zoom) {
    case 'day':
      return addDays(anchor, step);
    case 'week':
      return addDays(anchor, 7 * step);
    case 'month':
      return new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
    case 'year':
      return new Date(anchor.getFullYear() + step, 0, 1);
    case '5y':
      return new Date(anchor.getFullYear() + 5 * step, 0, 1);
    default:
      return anchor;
  }
}

/** Whether the period after the one shown would start in the future. */
function isLatest(anchor: Date, zoom: Zoom, now: Date) {
  if (zoom === 'all') return true;
  return moveAnchor(anchor, zoom, 1) > now;
}

/** Stats buckets by their local start date. */
const indexBuckets = (series: StatsBucket[] = []) =>
  new Map(series.map(bucket => [bucket.start, bucket]));

/**
 * The journal calendar. Zoom from a full day out to a week, a month, a year,
 * five years and everything: notes and readings show as marks, and longer
 * periods as blocks that brighten with activity. Tap a period to zoom into it.
 */
const JournalCalendar = ({
  onOpenDay,
  onToday,
  fill,
}: JournalCalendarProps) => {
  const now = new Date();
  const today = localDay(now);
  const [zoom, setZoom] = useState<Zoom>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(now));

  const zoomTo = (next: Zoom, date?: Date) => {
    setZoom(next);
    if (date) setAnchor(startOfDay(date));
  };

  const title = (() => {
    switch (zoom) {
      case 'day':
        return anchor.toLocaleDateString([], {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
      case 'week': {
        const start = weekStart(anchor);
        const end = addDays(start, 6);
        return `${start.toLocaleDateString([], {
          day: 'numeric',
          month: 'short',
        })} – ${end.toLocaleDateString([], {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`;
      }
      case 'month':
        return anchor.toLocaleDateString([], {
          month: 'long',
          year: 'numeric',
        });
      case 'year':
        return String(anchor.getFullYear());
      case '5y':
        return `${anchor.getFullYear() - 4} – ${anchor.getFullYear()}`;
      default:
        return 'All time';
    }
  })();

  const latest = isLatest(anchor, zoom, now);
  const zoomName = ZOOMS.find(z => z.key === zoom)!.name;

  return (
    <View style={[styles.card, fill && styles.cardFill]}>
      {/* The span shown, as one joined control like the other tabs' switches. */}
      <Segmented
        accessibilityLabel="Calendar span"
        options={ZOOMS}
        value={zoom}
        onChange={key => zoomTo(key)}
      />

      <View style={styles.header}>
        {zoom !== 'all' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Previous ${zoomName}`}
            onPress={() => setAnchor(a => moveAnchor(a, zoom, -1))}
            style={styles.arrow}
          >
            <ChevronLeft size={20} color={COLORS.cream} strokeWidth={1.7} />
          </Pressable>
        ) : (
          <View style={styles.arrowSpace} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {zoom !== 'all' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Next ${zoomName}`}
            accessibilityState={{ disabled: latest }}
            disabled={latest}
            onPress={() => setAnchor(a => moveAnchor(a, zoom, 1))}
            style={[styles.arrow, latest && styles.disabled]}
          >
            <ChevronRight size={20} color={COLORS.cream} strokeWidth={1.7} />
          </Pressable>
        ) : (
          <View style={styles.arrowSpace} />
        )}
      </View>

      {zoom === 'day' && (
        <DayView
          day={localDay(anchor)}
          today={today}
          onOpen={day => (day === today ? onToday() : onOpenDay(day))}
        />
      )}
      {zoom === 'week' && (
        <WeekView
          start={weekStart(anchor)}
          today={today}
          onPickDay={date => zoomTo('day', date)}
        />
      )}
      {zoom === 'month' && (
        <MonthView
          year={anchor.getFullYear()}
          month={anchor.getMonth()}
          today={today}
          onPickDay={date => zoomTo('day', date)}
        />
      )}
      {zoom === 'year' && (
        <YearView
          year={anchor.getFullYear()}
          today={today}
          onPickMonth={date => zoomTo('month', date)}
        />
      )}
      {(zoom === '5y' || zoom === 'all') && (
        <YearsView
          endYear={zoom === '5y' ? anchor.getFullYear() : now.getFullYear()}
          span={zoom === '5y' ? 5 : 'all'}
          today={today}
          onPickMonth={date => zoomTo('month', date)}
          onPickYear={date => zoomTo('year', date)}
        />
      )}
    </View>
  );
};

export default JournalCalendar;

// ---------- Day ----------

const DayView = ({
  day,
  today,
  onOpen,
}: {
  day: string;
  today: string;
  onOpen: (day: string) => void;
}) => {
  const stats = useStats({ unit: 'day', from: day, to: day });
  const bucket = stats.data?.series[0];
  const isToday = day === today;
  const isFuture = day > today;
  const hasAnything = !!bucket && (bucket.readings > 0 || bucket.notes > 0);

  if (stats.isPending) {
    return <ActivityIndicator style={styles.loading} color={COLORS.gold} />;
  }
  return (
    <View style={styles.dayBox}>
      {isFuture ? (
        <Text style={styles.muted}>This day hasn’t come yet.</Text>
      ) : (
        <>
          <View style={styles.dayStats}>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatValue}>{bucket?.readings ?? 0}</Text>
              <Text style={styles.dayStatLabel}>
                {bucket?.readings === 1 ? 'reading' : 'readings'}
              </Text>
            </View>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatValue}>{bucket?.notes ?? 0}</Text>
              <Text style={styles.dayStatLabel}>
                {bucket?.notes === 1 ? 'note' : 'notes'}
              </Text>
            </View>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatValue}>
                {bucket && bucket.passed + bucket.failed > 0
                  ? bucket.passed > 0
                    ? 'Passed'
                    : 'Not passed'
                  : '–'}
              </Text>
              <Text style={styles.dayStatLabel}>verdict</Text>
            </View>
          </View>
          {bucket?.userEeriness != null || bucket?.aiEeriness != null ? (
            <Text style={styles.muted}>
              Eeriness {bucket?.userEeriness ?? '–'} (AI{' '}
              {bucket?.aiEeriness ?? '–'}) · Satisfaction{' '}
              {bucket?.userSatisfaction ?? '–'} (AI{' '}
              {bucket?.aiSatisfaction ?? '–'})
            </Text>
          ) : null}
          {isToday || hasAnything ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen(day)}
              style={({ pressed }) => [
                styles.openButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.openText}>
                {isToday ? 'Write in today’s journal' : 'Open this day'}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>Nothing was recorded on this day.</Text>
          )}
        </>
      )}
    </View>
  );
};

// ---------- Week ----------

const WeekView = ({
  start,
  today,
  onPickDay,
}: {
  start: Date;
  today: string;
  onPickDay: (date: Date) => void;
}) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const stats = useStats({
    unit: 'day',
    from: localDay(days[0]),
    to: localDay(days[6]),
  });
  const byDay = indexBuckets(stats.data?.series);
  const max = Math.max(1, ...[...byDay.values()].map(activityOf));

  return (
    <>
      <View style={styles.weekRow}>
        {days.map((date, i) => {
          const day = localDay(date);
          const bucket = byDay.get(day);
          const activity = activityOf(bucket);
          const isFuture = day > today;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString([], {
                weekday: 'long',
                day: 'numeric',
              })}: ${bucket?.readings ?? 0} readings, ${
                bucket?.notes ?? 0
              } notes`}
              disabled={isFuture}
              onPress={() => onPickDay(date)}
              style={styles.weekCell}
            >
              <Text style={styles.weekday}>{WEEKDAYS[i]}</Text>
              <View
                style={[
                  styles.weekBlock,
                  {
                    backgroundColor: ACTIVITY_LEVELS[levelOf(activity, max)],
                  },
                  day === today && styles.todayRing,
                  isFuture && styles.futureBlock,
                ]}
              >
                <Text
                  style={[
                    styles.weekDate,
                    levelOf(activity, max) >= 3 && styles.darkText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              <Text style={styles.weekCount}>
                {bucket?.readings ? '✦' : ' '}
                {bucket?.notes ? ` ${bucket.notes}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {stats.isFetching && (
        <ActivityIndicator size="small" color={COLORS.gold} />
      )}
      <Legend items={['✦ reading', 'number: notes', 'tap a day to open it']} />
    </>
  );
};

// ---------- Month ----------

const MonthView = ({
  year,
  month,
  today,
  onPickDay,
}: {
  year: number;
  month: number;
  today: string;
  onPickDay: (date: Date) => void;
}) => {
  const key = monthKey(year, month);
  const calendar = useJournalCalendar(key);

  // Local days with notes and with readings.
  const marks = useMemo(() => {
    const toDays = (stamps: string[] = []) =>
      new Set(stamps.map(stamp => localDay(new Date(stamp))));
    return {
      notes: toDays(calendar.data?.entries),
      readings: toDays(calendar.data?.readings),
    };
  }, [calendar.data]);

  return (
    <>
      <View style={styles.week}>
        {WEEKDAYS.map((label, index) => (
          <Text key={index} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {monthGrid(year, month).map((date, index) => {
          if (date === null) return <View key={index} style={styles.cell} />;
          const day = `${key}-${pad(date)}`;
          const isToday = day === today;
          const hasNotes = marks.notes.has(day);
          const hasReading = marks.readings.has(day);
          const isFuture = day > today;
          const parts = [hasNotes && 'notes', hasReading && 'a reading'].filter(
            Boolean,
          );
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`${date}${isToday ? ', today' : ''}${
                parts.length ? `, ${parts.join(' and ')}` : ''
              }`}
              accessibilityState={{ disabled: isFuture }}
              disabled={isFuture}
              onPress={() => onPickDay(new Date(year, month, date))}
              style={styles.cell}
            >
              <View style={[styles.day, isToday && styles.today]}>
                <Text
                  style={[
                    styles.dayText,
                    isFuture && styles.futureText,
                    (hasNotes || isToday) && styles.activeText,
                  ]}
                >
                  {date}
                </Text>
                {hasReading && <Text style={styles.readingMark}>✦</Text>}
              </View>
              <View style={[styles.dot, !hasNotes && styles.dotHidden]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.dot} />
          <Text style={styles.legendText}>Notes</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendMark}>✦</Text>
          <Text style={styles.legendText}>Reading</Text>
        </View>
        {calendar.isFetching && (
          <ActivityIndicator size="small" color={COLORS.gold} />
        )}
      </View>
    </>
  );
};

// ---------- Year ----------

const YearView = ({
  year,
  today,
  onPickMonth,
}: {
  year: number;
  today: string;
  onPickMonth: (date: Date) => void;
}) => {
  const stats = useStats({
    unit: 'day',
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  });
  const byDay = indexBuckets(stats.data?.series);
  const max = Math.max(1, ...[...byDay.values()].map(activityOf));

  if (stats.isPending) {
    return <ActivityIndicator style={styles.loading} color={COLORS.gold} />;
  }
  return (
    <>
      <View style={styles.yearGrid}>
        {Array.from({ length: 12 }, (_, month) => {
          const first = new Date(year, month, 1);
          const isFuture = localDay(first) > today;
          const cells = monthGrid(year, month);
          let readings = 0;
          return (
            <Pressable
              key={month}
              accessibilityRole="button"
              accessibilityLabel={`Open ${first.toLocaleDateString([], {
                month: 'long',
                year: 'numeric',
              })}`}
              disabled={isFuture}
              onPress={() => onPickMonth(first)}
              style={({ pressed }) => [
                styles.miniMonth,
                isFuture && styles.futureBlock,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.miniTitle}>
                {first.toLocaleDateString([], { month: 'short' })}
              </Text>
              <View style={styles.miniGrid}>
                {cells.map((date, i) => {
                  if (date === null) {
                    return <View key={i} style={styles.miniCell} />;
                  }
                  const bucket = byDay.get(
                    `${monthKey(year, month)}-${pad(date)}`,
                  );
                  readings += bucket?.readings ?? 0;
                  return (
                    <View key={i} style={styles.miniCell}>
                      <View
                        style={[
                          styles.miniBlock,
                          {
                            backgroundColor:
                              ACTIVITY_LEVELS[levelOf(activityOf(bucket), max)],
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={styles.miniCount}>
                {readings > 0 ? `✦ ${readings}` : ' '}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScaleLegend hint="Tap a month to open it" />
    </>
  );
};

// ---------- Five years and all time ----------

const YearsView = ({
  endYear,
  span,
  today,
  onPickMonth,
  onPickYear,
}: {
  endYear: number;
  span: 5 | 'all';
  today: string;
  onPickMonth: (date: Date) => void;
  onPickYear: (date: Date) => void;
}) => {
  const stats = useStats({
    unit: 'month',
    from: span === 5 ? `${endYear - 4}-01-01` : undefined,
    to: `${endYear}-12-31`,
  });
  const byMonth = indexBuckets(stats.data?.series);
  const max = Math.max(1, ...[...byMonth.values()].map(activityOf));
  const firstYear =
    span === 5
      ? endYear - 4
      : Number((stats.data?.firstActivity ?? today).slice(0, 4));
  const years = Array.from(
    { length: endYear - firstYear + 1 },
    (_, i) => endYear - i,
  );

  if (stats.isPending) {
    return <ActivityIndicator style={styles.loading} color={COLORS.gold} />;
  }
  return (
    <>
      <View style={styles.yearsHeader}>
        <View style={styles.yearLabelSpace} />
        {MONTH_INITIALS.map((m, i) => (
          <Text key={i} style={styles.yearsMonth}>
            {m}
          </Text>
        ))}
      </View>
      {years.map(year => {
        const yearReadings = Array.from({ length: 12 }, (_, m) =>
          byMonth.get(`${monthKey(year, m)}-01`),
        ).reduce((sum, b) => sum + (b?.readings ?? 0), 0);
        return (
          <View key={year} style={styles.yearsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${year}: ${yearReadings} readings`}
              onPress={() => onPickYear(new Date(year, 0, 1))}
              hitSlop={6}
              style={styles.yearLabel}
            >
              <Text style={styles.yearLabelText}>{year}</Text>
            </Pressable>
            {Array.from({ length: 12 }, (_, month) => {
              const start = `${monthKey(year, month)}-01`;
              const bucket = byMonth.get(start);
              const isFuture = start > today;
              const level = levelOf(activityOf(bucket), max);
              return (
                <Pressable
                  key={month}
                  accessibilityRole="button"
                  accessibilityLabel={`${new Date(
                    year,
                    month,
                    1,
                  ).toLocaleDateString([], {
                    month: 'long',
                    year: 'numeric',
                  })}: ${bucket?.readings ?? 0} readings, ${
                    bucket?.notes ?? 0
                  } notes`}
                  disabled={isFuture}
                  onPress={() => onPickMonth(new Date(year, month, 1))}
                  style={styles.yearsCell}
                >
                  <View
                    style={[
                      styles.yearsBlock,
                      { backgroundColor: ACTIVITY_LEVELS[level] },
                      isFuture && styles.futureBlock,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <ScaleLegend hint="Tap a month or a year to open it" />
    </>
  );
};

// ---------- Legends ----------

const Legend = ({ items }: { items: string[] }) => (
  <View style={styles.legend}>
    {items.map(item => (
      <Text key={item} style={styles.legendText}>
        {item}
      </Text>
    ))}
  </View>
);

const ScaleLegend = ({ hint }: { hint: string }) => (
  <View style={styles.scaleLegend}>
    <Text style={styles.legendText}>{hint}</Text>
    <View style={styles.scale}>
      <Text style={styles.legendText}>less</Text>
      {ACTIVITY_LEVELS.map(color => (
        <View
          key={color}
          style={[styles.scaleBlock, { backgroundColor: color }]}
        />
      ))}
      <Text style={styles.legendText}>more</Text>
    </View>
  </View>
);

const COLORS = {
  gold: '#E8D58A',
  goldSolid: '#D9C77E',
  cream: '#F1EEE0',
  sage: '#A1BE94',
};

const styles = StyleSheet.create({
  // Open on the page like Home's calendar, not a box: the grid is the shape.
  card: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(4),
  },
  cardFill: { width: '100%', marginTop: 0 },
  zoomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(12),
  },
  zoomPill: {
    paddingVertical: hp(5),
    paddingHorizontal: wp(9),
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.3)',
    borderRadius: 14,
  },
  zoomPillActive: {
    borderColor: COLORS.goldSolid,
    backgroundColor: COLORS.goldSolid,
  },
  zoomText: {
    color: 'rgba(220, 224, 214, 0.72)',
    fontSize: font(11),
    fontWeight: '600',
  },
  zoomTextActive: { color: '#172016' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(10),
  },
  // A plain chevron in a 44 touch area.
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowSpace: { width: 44 },
  disabled: { opacity: 0.3 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  loading: { marginVertical: hp(30) },
  pressed: { opacity: 0.7 },
  muted: {
    marginTop: hp(10),
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
    textAlign: 'center',
  },
  // Day
  dayBox: { marginTop: hp(12), alignItems: 'center' },
  dayStats: { flexDirection: 'row', alignSelf: 'stretch' },
  dayStat: { flex: 1, alignItems: 'center' },
  dayStatValue: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  dayStatLabel: { color: '#B4B8AB', fontSize: font(13) },
  openButton: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: hp(16),
    paddingHorizontal: wp(24),
    borderRadius: 24,
    backgroundColor: COLORS.goldSolid,
  },
  openText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  // Week
  weekRow: { flexDirection: 'row', marginTop: hp(12) },
  weekCell: { flex: 1, alignItems: 'center' },
  weekBlock: {
    width: '82%',
    aspectRatio: 0.8,
    marginTop: hp(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  weekDate: { color: COLORS.cream, fontSize: font(14), fontWeight: '600' },
  weekCount: {
    marginTop: hp(4),
    color: COLORS.gold,
    fontSize: font(12),
  },
  darkText: { color: '#172016' },
  todayRing: { borderWidth: 1.5, borderColor: COLORS.cream },
  futureBlock: { opacity: 0.3 },
  // Month
  week: { flexDirection: 'row', marginTop: hp(12) },
  weekday: {
    flex: 1,
    color: '#979C8F',
    fontSize: font(12),
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: hp(4) },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  day: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  today: { borderWidth: 1, borderColor: COLORS.gold },
  dayText: { color: '#B4B8AB', fontSize: font(14) },
  activeText: { color: COLORS.cream, fontWeight: '600' },
  futureText: { color: 'rgba(220, 224, 214, 0.25)' },
  readingMark: {
    position: 'absolute',
    top: -2,
    right: -1,
    color: COLORS.gold,
    fontSize: 10,
  },
  dot: {
    width: 4,
    height: 4,
    marginTop: 2,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  dotHidden: { backgroundColor: 'transparent' },
  // Year
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: hp(10),
    marginTop: hp(12),
  },
  // A quiet box per month, as the year has twelve to tell apart.
  miniMonth: {
    width: '31%',
    padding: wp(6),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 10,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  miniTitle: {
    color: COLORS.cream,
    fontSize: font(13),
    fontWeight: '600',
    marginBottom: hp(3),
  },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 0.8 },
  miniBlock: { flex: 1, borderRadius: 1.5 },
  miniCount: {
    marginTop: hp(3),
    color: COLORS.gold,
    fontSize: font(11),
  },
  // Five years / all
  yearsHeader: { flexDirection: 'row', marginTop: hp(12) },
  yearLabelSpace: { width: wp(40) },
  yearsMonth: {
    flex: 1,
    textAlign: 'center',
    color: '#979C8F',
    fontSize: font(11),
  },
  yearsRow: { flexDirection: 'row', alignItems: 'center', marginTop: hp(4) },
  yearLabel: { width: wp(40) },
  yearLabelText: {
    color: COLORS.cream,
    fontSize: font(13),
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(217, 199, 126, 0.4)',
  },
  yearsCell: { flex: 1, aspectRatio: 1, padding: 1.5 },
  yearsBlock: { flex: 1, borderRadius: 4 },
  // Legends
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(14),
    marginTop: hp(10),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: wp(6) },
  legendMark: { color: COLORS.gold, fontSize: 12 },
  legendText: { color: '#B4B8AB', fontSize: font(12) },
  scaleLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(12),
  },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scaleBlock: { width: 11, height: 11, borderRadius: 3 },
});
