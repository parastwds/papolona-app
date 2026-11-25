import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { rarityOf } from '../artworks';
import { font } from '@/utils/responsive';

// The tab bar's butterfly, filled: the one key graphic for a series' rarity.
const WINGS =
  'M20 5c-3.5 0-6.5 3.9-8 6.3C10.5 8.9 7.5 5 4 5a2 2 0 0 0-2 2c0 2.3.6 4.4 1.5 5.6C4 13.5 4.9 14 6 14h2c-.9.4-2.1.9-2.6 1.5-1.6 1.6-.9 3.4.7 4.9 1.6 1.6 3.4 2.3 4.9.7.3-.3 1-1.1 1-1.1s.6.8 1 1.1c1.6 1.6 3.4.9 4.9-.7 1.6-1.6 2.3-3.4.7-4.9-.5-.5-1.7-1.1-2.6-1.5h2c1.1 0 2-.5 2.5-1.4.9-1.2 1.5-3.3 1.5-5.6a2 2 0 0 0-2-2';
const ANTENNAE = 'M15.8 2C12 3.8 12 9 12 9s0-5.2-3.8-7';

type Props = {
  rarity: string;
  size?: number;
  // Shows the rarity's name beside the butterfly.
  showLabel?: boolean;
};

/** A small butterfly in the rarity's colour: bronze, silver, mythic red or gold. */
const RarityMark = ({ rarity, size = 12, showLabel = false }: Props) => {
  const { label, color } = rarityOf(rarity);
  const mark = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={WINGS} fill={color} />
      <Path
        d={ANTENNAE}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
  if (!showLabel) {
    return (
      <View accessible accessibilityLabel={label}>
        {mark}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {mark}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

export default RarityMark;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontFamily: 'Roboto-Medium', fontSize: font(11) },
});
