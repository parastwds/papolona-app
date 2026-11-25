import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

/**
 * Returns an Animated opacity value that blinks on/off.
 * Runs on the native/UI thread, so there are no React re-renders while blinking.
 */
export const useBlinkingOpacity = (enabled: boolean = true, interval = 500) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      opacity.setValue(0);
      return;
    }

    // Always start visible, then blink
    opacity.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(interval),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(interval),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [enabled, interval, opacity]);

  return opacity;
};

type Props = {
  style?: StyleProp<ViewStyle>;
};

// Mount it only inside the active box: it restarts visible every time it mounts.
const BlinkingCursor = ({ style }: Props) => {
  const opacity = useBlinkingOpacity(true);
  return <Animated.View style={[styles.cursor, style, { opacity }]} />;
};

export default BlinkingCursor;

const styles = StyleSheet.create({
  cursor: {
    width: 1.5,
    height: 24,
    backgroundColor: '#FFFFFF',
    marginLeft: 2,
  },
});
