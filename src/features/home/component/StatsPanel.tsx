import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Segmented } from '@/features/profile/component/ProfileSubScreen';
import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import { useStats } from '@/services/queries';
import type { StatsBucket } from '@/services/session';
import {
  RANGE_NAMES,
  STATS_RANGES,
  StatsRange,
  bucketLabel,
  bucketTitle,
  rangeQuery,
} from '../statsRanges';
import StatsChart, { LineSeries } from './StatsChart';

type Metric = 'activity' | 'feel';

const COLORS = {
  gold: '#E8D58A',
  cream: '#F1EEE0',
  red: '#E2A09A',
  muted: '#B4B8AB',
  faint: '#979C8F',
  eerie: '#B49BE8',
};

// The lines for each tab. Ratings: the user's solid, the AI's dashed.
const ACTIVITY_LINES: {
  key: keyof StatsBucket;
  label: string;
  color: string;
  area?: boolean;
}[] = [
  // Readings alone: a note is written around a reading, so its line said the same thing twice.
  { key: 'readings', label: 'Readings', color: COLORS.gold, area: true },
];
const FEEL_LINES: {
  key: keyof StatsBucket;
  label: string;
  color: string;
  dashed?: boolean;
}[] = [
  { key: 'userEeriness', label: 'Eeriness · you', color: COLORS.eerie },
  {
    key: 'aiEeriness',
    label: 'Eeriness · AI',
    color: COLORS.eerie,
    dashed: true,
  },
  { key: 'userSatisfaction', label: 'Satisfaction · you', color: COLORS.gold },
  {
    key: 'aiSatisfaction',
    label: 'Satisfaction · AI',
    color: COLORS.gold,
    dashed: true,
  },
];

const formatAverage = (value: number | null) =>
  value == null ? '–' : value.toFixed(1);

const RANGE_OPTIONS = STATS_RANGES.map(r => ({ key: r, label: r }));
const METRICS: { key: Metric; label: string }[] = [
  { key: 'activity', label: 'Readings' },
  { key: 'feel', label: 'Eeriness & satisfaction' },
];

/** One of the span's totals: the number, with what it counts under it. */
const Figure = ({ value, label }: { value: string; label: string }) => (
  <View
    style={styles.figure}
    accessible
    accessibilityLabel={`${value} ${label}`}
  >
    <Text style={styles.figureValue}>{value}</Text>
    <Text style={styles.figureLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

/**
 * The Home stats: readings, verdicts, notes and how eerie and satisfying the
 * readings felt (rated by the user and by the AI), over FX-style time scales,
 * as a line graph. Touch the chart to read a single day, month or year.
 */
const StatsPanel = () => {
  const [range, setRange] = useState<StatsRange>('1M');
  const [metric, setMetric] = useState<Metric>('activity');
  const [selected, setSelected] = useState<number | null>(null);

  // Recomputed per render so the range follows the date; same day, same key.
  const query = rangeQuery(range);
  const stats = useStats(query);
  const data = stats.data;
  const series = useMemo(() => data?.series ?? [], [data]);

  const labels = useMemo(
    () => series.map(bucket => bucketLabel(bucket, data!.unit, range)),
    [series, data, range],
  );

  const lineSeries: LineSeries[] = (
    metric === 'activity' ? ACTIVITY_LINES : FEEL_LINES
  ).map(line => ({
    ...line,
    values: series.map(bucket => bucket[line.key] as number | null),
    // Ratings are averages of the days rated: join them across unrated days.
    connectGaps: metric === 'feel',
  }));

  const changeRange = (next: StatsRange) => {
    setRange(next);
    setSelected(null);
  };

  const point = selected !== null ? series[selected] : undefined;
  const totals = data?.totals;
  const passRate =
    totals && totals.passed + totals.failed > 0
      ? Math.round((totals.passed / (totals.passed + totals.failed)) * 100)
      : null;
  const rated =
    !!totals &&
    [
      totals.userEeriness,
      totals.aiEeriness,
      totals.userSatisfaction,
      totals.aiSatisfaction,
    ].some(value => value != null);

  // Only once a point is touched: the chart's day, month or year in words.
  const renderReadout = () => {
    if (!point || !data) return null;
    return (
      <View style={styles.readout}>
        <Text style={styles.readoutTitle}>{bucketTitle(point, data.unit)}</Text>
        <Text style={styles.readoutText}>
          {metric === 'activity'
            ? `${point.readings} reading${point.readings === 1 ? '' : 's'} · ${
                point.passed
              } passed · ${point.failed} not passed · ${point.notes} note${
                point.notes === 1 ? '' : 's'
              }`
            : `Eeriness: you ${formatAverage(
                point.userEeriness,
              )}, AI ${formatAverage(
                point.aiEeriness,
              )} · Satisfaction: you ${formatAverage(
                point.userSatisfaction,
              )}, AI ${formatAverage(point.aiSatisfaction)}`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>YOUR PRACTICE</Text>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Your stats
        </Text>
        {stats.isFetching && (
          <ActivityIndicator size="small" color={COLORS.gold} />
        )}
      </View>

      <Segmented
        accessibilityLabel="Time span"
        options={RANGE_OPTIONS}
        value={range}
        onChange={changeRange}
      />

      {stats.isPending ? (
        <ActivityIndicator style={styles.loading} color={COLORS.gold} />
      ) : stats.isError && !data ? (
        <Text style={styles.error}>
          {getErrorMessage(stats.error, 'Could not load your stats.')}
        </Text>
      ) : data ? (
        <>
          {/* The span's totals in one line. */}
          <View style={styles.figures}>
            <Figure
              value={String(totals!.readings)}
              label={totals!.readings === 1 ? 'reading' : 'readings'}
            />
            <Figure
              value={passRate === null ? '–' : `${passRate}%`}
              label="passed"
            />
            <Figure
              value={String(totals!.notes)}
              label={totals!.notes === 1 ? 'note' : 'notes'}
            />
            <Figure value={String(data.streak.current)} label="day streak" />
          </View>

          {/* What the chart shows: two words to switch between, not another box. */}
          <View accessibilityRole="tablist" style={styles.tabs}>
            {METRICS.map(item => {
              const active = item.key === metric;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setMetric(item.key);
                    setSelected(null);
                  }}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <StatsChart
            height={hp(170)}
            labels={labels}
            series={lineSeries}
            yMax={metric === 'feel' ? 10 : undefined}
            selected={selected}
            onSelect={setSelected}
          />

          {/* One line needs no key: the tab above already names it. */}
          {lineSeries.length > 1 ? (
            <View style={styles.legend}>
              {lineSeries.map(item => (
                <View key={item.key} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendSwatch,
                      { borderColor: item.color },
                      item.dashed
                        ? styles.legendDashed
                        : { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {renderReadout()}

          {metric === 'feel' && (
            <Text style={styles.footnote}>
              {rated
                ? `Average for ${
                    RANGE_NAMES[range]
                  }: eeriness you ${formatAverage(
                    totals!.userEeriness,
                  )} / AI ${formatAverage(
                    totals!.aiEeriness,
                  )}, satisfaction you ${formatAverage(
                    totals!.userSatisfaction,
                  )} / AI ${formatAverage(totals!.aiSatisfaction)}.`
                : 'No ratings yet. Rate each reading in the Journal after it is judged.'}
            </Text>
          )}
          {totals!.readings === 0 && totals!.notes === 0 && (
            <Text style={styles.footnote}>
              Nothing recorded in {RANGE_NAMES[range]} yet. Draw a clue or write
              a note in the Journal and it will show here.
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
};

export default StatsPanel;

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    marginBottom: hp(12),
  },
  title: { color: COLORS.cream, fontFamily: 'serif', fontSize: font(20) },
  loading: { marginVertical: hp(40) },
  error: {
    marginVertical: hp(24),
    color: COLORS.red,
    fontSize: font(14),
    lineHeight: font(20),
  },
  // Four across: each number with its one word under it.
  figures: { flexDirection: 'row', marginTop: hp(20) },
  figure: { flex: 1 },
  figureValue: {
    color: COLORS.cream,
    fontSize: font(22),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  figureLabel: { marginTop: 2, color: COLORS.muted, fontSize: font(13) },
  tabs: {
    flexDirection: 'row',
    gap: wp(24),
    marginTop: hp(24),
    marginBottom: hp(8),
  },
  // Tall enough to touch; the mark of the one in use is a rule under its words.
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gold },
  tabText: { color: COLORS.faint, fontSize: font(15) },
  tabTextActive: { color: COLORS.gold, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: wp(16),
    rowGap: hp(6),
    marginTop: hp(10),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: wp(6) },
  legendSwatch: {
    width: 14,
    height: 4,
    borderWidth: 1,
    borderRadius: 2,
  },
  legendDashed: { borderStyle: 'dashed', height: 0, borderWidth: 1 },
  legendText: { color: COLORS.muted, fontSize: font(12) },
  readout: { marginTop: hp(12) },
  readoutTitle: { color: COLORS.cream, fontSize: font(15), fontWeight: '600' },
  readoutText: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  footnote: {
    marginTop: hp(10),
    color: COLORS.faint,
    fontSize: font(13),
    lineHeight: font(19),
  },
});
