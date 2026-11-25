import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Maximize2 } from 'lucide-react-native';

import { useCommunityMap } from '@/services/queries';
import { font, hp } from '@/utils/responsive';
import { pinsFor } from '../pins';
import WorldMap, { MAP_COLORS } from './WorldMap';

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

type Props = { onPress: () => void };

/**
 * Discover's lead: the whole world map with everyone's pins, in a frame like
 * Collect's emblems, and under it how far the collective reaches. Tap it to
 * open the full, zoomable map.
 */
const MapBanner = ({ onPress }: Props) => {
  const map = useCommunityMap();
  const countries = useMemo(() => map.data?.countries ?? [], [map.data]);
  const pins = useMemo(() => pinsFor(countries), [countries]);
  // The map fills the frame's width, known after the first layout.
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  const people = (map.data?.registered ?? 0) + (map.data?.members ?? 0);
  const title = map.data
    ? `${plural(people, 'person', 'people')} in ${plural(
        countries.length,
        'country',
        'countries',
      )}`
    : 'Around the world';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Open the world map.`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={styles.frame} onLayout={onLayout}>
        {/* Pins drawn a little smaller than on the full map, to suit the frame. */}
        {width > 0 ? (
          <WorldMap width={width} shownWidth={width * 1.35} pins={pins} />
        ) : null}
        {/* Says the map opens bigger; a dark disc keeps it readable over land. */}
        <View style={styles.expand}>
          <Maximize2 size={15} color={CREAM} strokeWidth={1.8} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <View style={styles.legend}>
        <View
          style={[styles.dot, { backgroundColor: MAP_COLORS.registered }]}
        />
        <Text style={styles.legendText}>Apprentices</Text>
        <View
          style={[
            styles.dot,
            styles.dotGap,
            { backgroundColor: MAP_COLORS.member },
          ]}
        />
        <Text style={styles.legendText}>Members</Text>
      </View>
    </Pressable>
  );
};

export default MapBanner;

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  // Dark like the sea, with one thin edge, and as much room above the map as below.
  frame: {
    width: '100%',
    minHeight: hp(150),
    justifyContent: 'center',
    paddingVertical: hp(16),
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 16, 12, 0.9)',
  },
  expand: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  title: {
    marginTop: 10,
    color: CREAM,
    fontSize: font(16),
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGap: { marginLeft: 12 },
  legendText: { color: MUTED, fontSize: font(13) },
});
