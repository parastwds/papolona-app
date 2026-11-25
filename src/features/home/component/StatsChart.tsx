import React, { useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export type LineSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  // null where there is no value (e.g. a day without a rating): the line breaks
  // there, unless connectGaps joins the points on either side.
  values: (number | null)[];
  connectGaps?: boolean;
  // For a count shown on its own: shades the area under the line and marks
  // each point above zero, so the days something happened stand out.
  area?: boolean;
};

type Props = {
  height: number;
  labels: string[];
  series: LineSeries[];
  // Fixed top of the scale (10 for ratings); otherwise it fits the data.
  yMax?: number;
  // The index the user is touching, highlighted on the chart.
  selected: number | null;
  onSelect: (index: number | null) => void;
};

const PAD_LEFT = 26;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
// Past this many points the marks would run together, so only the line is drawn.
const MAX_MARKED_POINTS = 45;

const GRID = 'rgba(161, 190, 148, 0.16)';
const BASELINE = 'rgba(161, 190, 148, 0.4)';
const AXIS_TEXT = '#979C8F';
const HIGHLIGHT = 'rgba(232, 213, 138, 0.55)';
const PAGE = '#060B08';

/**
 * The marks up a count axis: whole numbers in steps of 1, 2 or 5 (times ten as
 * needed), at most four steps, ending at or just above `max`.
 */
function countTicks(max: number) {
  const reach = Math.max(1, max);
  let magnitude = 1;
  for (;;) {
    for (const base of [1, 2, 5]) {
      const step = base * magnitude;
      const steps = Math.ceil(reach / step);
      if (steps <= 4) {
        return Array.from({ length: steps + 1 }, (_, i) => i * step);
      }
    }
    magnitude *= 10;
  }
}

/** Which axis labels to show so they don't crowd: about five, always the first and last. */
function labelIndexes(count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / 4;
  return Array.from(new Set([0, 1, 2, 3, 4].map(i => Math.round(i * step))));
}

/**
 * The line chart for the Home stats, with gaps where values are missing.
 * Touch and drag across it to pick a point.
 */
const StatsChart = ({
  height,
  labels,
  series,
  yMax,
  selected,
  onSelect,
}: Props) => {
  const [width, setWidth] = useState(0);
  const count = labels.length;
  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const dataMax = Math.max(
    0,
    ...series.flatMap(s => s.values.map(v => v ?? 0)),
  );
  const ticks = yMax !== undefined ? [0, yMax / 2, yMax] : countTicks(dataMax);
  const top = ticks[ticks.length - 1];
  const y = (value: number) =>
    PAD_TOP + plotHeight - (value / top) * plotHeight;
  const base = y(0);

  const x = (index: number) =>
    count === 1
      ? PAD_LEFT + plotWidth / 2
      : PAD_LEFT + (index * plotWidth) / (count - 1);

  const indexAt = (event: GestureResponderEvent) => {
    if (count === 0 || plotWidth === 0) return null;
    const px = event.nativeEvent.locationX - PAD_LEFT;
    const raw = count === 1 ? 0 : Math.round((px / plotWidth) * (count - 1));
    return Math.min(count - 1, Math.max(0, raw));
  };

  const formatTick = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(1);

  const renderLines = () =>
    series.map(s => {
      // Runs of joined points; a missing value ends a run unless gaps are joined.
      const runs: number[][] = [];
      let run: number[] | null = null;
      s.values.forEach((value, i) => {
        if (value == null) {
          if (!s.connectGaps) run = null;
          return;
        }
        if (!run) {
          run = [];
          runs.push(run);
        }
        run.push(i);
      });
      const at = (i: number) =>
        `${x(i).toFixed(1)},${y(s.values[i] as number).toFixed(1)}`;
      const line = runs
        .map(points =>
          points.map((i, n) => `${n ? 'L' : 'M'}${at(i)}`).join(' '),
        )
        .join(' ');
      // The same runs, closed down to the baseline, for the shading.
      const area = runs
        .filter(points => points.length > 1)
        .map(
          points =>
            `${points.map((i, n) => `${n ? 'L' : 'M'}${at(i)}`).join(' ')} ` +
            `L${x(points[points.length - 1]).toFixed(1)},${base.toFixed(1)} ` +
            `L${x(points[0]).toFixed(1)},${base.toFixed(1)} Z`,
        )
        .join(' ');
      // Points stay visible where a value has no neighbours to join.
      const lonely = runs.filter(points => points.length === 1).map(p => p[0]);
      // On a count, every point above zero is marked: the days something happened.
      const marked =
        s.area && count <= MAX_MARKED_POINTS
          ? s.values
              .map((value, i) => (value != null && value > 0 ? i : -1))
              .filter(i => i >= 0)
          : [];
      return (
        <G key={s.key}>
          {s.area && area ? (
            <Path d={area} fill={`url(#shade-${s.key})`} stroke="none" />
          ) : null}
          {line ? (
            <Path
              d={line}
              stroke={s.color}
              strokeWidth={s.area ? 2.5 : 2}
              strokeDasharray={s.dashed ? '5,4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
          {lonely.map(i => (
            <Circle
              key={`lonely-${i}`}
              cx={x(i)}
              cy={y(s.values[i] as number)}
              r={2.6}
              fill={s.color}
            />
          ))}
          {marked.map(i => (
            <Circle
              key={`mark-${i}`}
              cx={x(i)}
              cy={y(s.values[i] as number)}
              r={3.5}
              fill={s.color}
              stroke={PAGE}
              strokeWidth={1.5}
            />
          ))}
          {selected !== null && s.values[selected] != null ? (
            <Circle
              cx={x(selected)}
              cy={y(s.values[selected] as number)}
              r={5}
              fill={PAGE}
              stroke={s.color}
              strokeWidth={2.5}
            />
          ) : null}
        </G>
      );
    });

  return (
    <View
      style={[styles.box, { height }]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={event => onSelect(indexAt(event))}
      onResponderMove={event => onSelect(indexAt(event))}
      onResponderTerminationRequest={() => true}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            {series
              .filter(s => s.area)
              .map(s => (
                <LinearGradient
                  key={s.key}
                  id={`shade-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop offset="0" stopColor={s.color} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
          </Defs>
          {ticks.map(v => (
            <G key={v}>
              <Line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={y(v)}
                y2={y(v)}
                // The zero line is the ground the rest is read against.
                stroke={v === 0 ? BASELINE : GRID}
                strokeWidth={1}
              />
              <SvgText
                x={PAD_LEFT - 8}
                y={y(v) + 4}
                fill={AXIS_TEXT}
                fontSize={11}
                textAnchor="end"
              >
                {formatTick(v)}
              </SvgText>
            </G>
          ))}
          {selected !== null && (
            <Line
              x1={x(selected)}
              x2={x(selected)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotHeight}
              stroke={HIGHLIGHT}
              strokeWidth={1}
            />
          )}
          {renderLines()}
          {labelIndexes(count).map(i => (
            <SvgText
              key={i}
              x={x(i)}
              y={height - 6}
              fill={AXIS_TEXT}
              fontSize={11}
              textAnchor={
                count > 1
                  ? i === 0
                    ? 'start'
                    : i === count - 1
                    ? 'end'
                    : 'middle'
                  : 'middle'
              }
            >
              {labels[i]}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
};

export default StatsChart;

const styles = StyleSheet.create({
  box: { width: '100%' },
});
