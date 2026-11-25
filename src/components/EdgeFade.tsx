import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface EdgeFadeProps {
  // Which edge of the scrolling area fades: content dissolves into the dark towards it.
  edge?: 'top' | 'bottom';
  // How tall the fade is, in points. Ignored with `fill`.
  height?: number;
  // Covers the whole parent, padding included, instead of a strip at one edge.
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

const FADE_COLOR = '#010402';

/**
 * Fades the edge of a scrolling area into the dark, instead of cutting content off at a line.
 * By default it sits inside its parent at that edge: put it after the ScrollView, inside a
 * wrapper View with the same size as the ScrollView.
 */
const EdgeFade = ({
  edge = 'bottom',
  height = 64,
  fill = false,
  style,
}: EdgeFadeProps) => {
  const id = `${edge}Fade`;
  // Fully clear on the content side, nearly solid at the edge.
  const [start, end] = edge === 'bottom' ? [0, 0.95] : [0.95, 0];
  // A percentage height would leave out the parent's padding, so fill uses top and bottom.
  const placement = fill
    ? StyleSheet.absoluteFill
    : [styles.fade, edge === 'bottom' ? styles.bottom : styles.top, { height }];
  return (
    <View pointerEvents="none" style={[placement, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={FADE_COLOR} stopOpacity={start} />
            <Stop offset="1" stopColor={FADE_COLOR} stopOpacity={end} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bottom: { bottom: 0 },
  top: { top: 0 },
});

export default EdgeFade;
