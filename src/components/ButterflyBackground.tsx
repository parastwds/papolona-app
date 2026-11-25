import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const FRAME_A = require('../../assets/onboarding_butterfly_bg.webp');
const FRAME_B = require('../../assets/onboarding_butterfly_bg_2.webp');

// One cycle: switch to the second frame (antennae moved), hold, switch back, hold.
const FADE_MS = 600;
const HOLD_MS = 2900;

interface ButterflyBackgroundProps {
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
}

/**
 * The onboarding and auth background: two frames of the butterfly that swap, so its antennae
 * seem to twitch. A drop-in for <ImageBackground source={butterfly} resizeMode="cover">.
 * Stays on the first frame when the user has asked the system to reduce motion.
 */
const ButterflyBackground = ({
  style,
  imageStyle,
  children,
}: ButterflyBackgroundProps) => {
  const frameB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fade = (toValue: number) =>
      Animated.timing(frameB, {
        toValue,
        duration: FADE_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    const loop = Animated.loop(
      Animated.sequence([
        fade(1),
        Animated.delay(HOLD_MS),
        fade(0),
        Animated.delay(HOLD_MS),
      ]),
    );

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduce => {
        if (!cancelled && !reduce) loop.start();
      })
      .catch(() => {
        if (!cancelled) loop.start();
      });
    return () => {
      cancelled = true;
      loop.stop();
    };
  }, [frameB]);

  return (
    <View style={style}>
      <Animated.Image
        source={FRAME_A}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, styles.frame, imageStyle]}
      />
      <Animated.Image
        source={FRAME_B}
        resizeMode="cover"
        style={[
          StyleSheet.absoluteFill,
          styles.frame,
          imageStyle,
          { opacity: frameB },
        ]}
      />
      {children}
    </View>
  );
};

export default ButterflyBackground;

const styles = StyleSheet.create({
  frame: { width: '100%', height: '100%' },
});
