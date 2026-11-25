import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { hp, wp } from '@/utils/responsive';
import { ACCENT } from '@/theme/colors';

const GOLD = '#E8D58A';

// A butterfly drawn as a wire frame: four wings, a body and two antennae.
const WINGS = [
  'M11.4 10.6C9.6 6.4 5.4 3.6 3 4.4 1.4 5 1.8 8.4 3.6 10.2 5.4 12 8.6 12.4 11.4 11.8Z',
  'M12.6 10.6C14.4 6.4 18.6 3.6 21 4.4 22.6 5 22.2 8.4 20.4 10.2 18.6 12 15.4 12.4 12.6 11.8Z',
  'M11.4 12.8C8.6 12.6 5.6 13.8 5.2 16.4 4.8 18.8 7.4 20.2 9.4 18.6 10.6 17.6 11.2 15.6 11.4 13.8Z',
  'M12.6 12.8C15.4 12.6 18.4 13.8 18.8 16.4 19.2 18.8 16.6 20.2 14.6 18.6 13.4 17.6 12.8 15.6 12.6 13.8Z',
];
const BODY = 'M12 8.6V18.4';
const ANTENNAE =
  'M11.6 8.8C11.2 6.6 10.2 5 8.8 4.2M12.4 8.8C12.8 6.6 13.8 5 15.2 4.2';

/** One butterfly: lit (gold) or faint. */
export const Butterfly = ({ lit }: { lit: boolean }) => {
  const stroke = lit ? GOLD : 'rgba(232, 213, 138, 0.32)';
  return (
    <Svg width="80%" height="80%" viewBox="0 0 24 24">
      {WINGS.map(d => (
        <Path
          key={d}
          d={d}
          fill={lit ? 'rgba(232, 213, 138, 0.42)' : 'rgba(232, 213, 138, 0.05)'}
          stroke={stroke}
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
      ))}
      <Path d={BODY} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
      <Path
        d={ANTENNAE}
        fill="none"
        stroke={stroke}
        strokeWidth={0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
};

const COLS = 3;

/**
 * A series as butterflies, three to a row (one row for a single or twin): one
 * for each reading, lit once the judge has approved it.
 */
export const ButterflyProgress = ({
  total,
  lit,
}: {
  total: number;
  lit: number;
}) => {
  const rows = Math.ceil(total / COLS);
  return (
    <View
      style={styles.grid}
      accessible
      accessibilityLabel={`${lit} of ${total} butterflies lit`}
    >
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: Math.min(COLS, total - row * COLS) }, (__, col) => (
            <View key={col} style={styles.cell}>
              <Butterfly lit={row * COLS + col < lit} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'stretch',
    marginTop: hp(12),
    paddingVertical: hp(6),
    paddingHorizontal: wp(6),
    borderWidth: 1,
    borderColor: ACCENT.orange,
    borderRadius: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'center', height: wp(40) },
  cell: { width: '33.33%', alignItems: 'center', justifyContent: 'center' },
});
