import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

interface Star {
  left: string;
  top: string;
  size: number;
  minOpacity: number;
  maxOpacity: number;
  duration: number;
  delay: number;
}

// Small deterministic generator, so the stars stay in the same places on every visit.
const seededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const makeStars = (count: number, seed: number): Star[] => {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const bright = random() < 0.15;
    return {
      left: `${(random() * 100).toFixed(2)}%`,
      top: `${(random() * 100).toFixed(2)}%`,
      size: bright ? 2 + random() * 1.2 : 1 + random() * 1,
      minOpacity: 0.08 + random() * 0.15,
      maxOpacity: bright ? 0.85 + random() * 0.15 : 0.45 + random() * 0.35,
      duration: 1400 + random() * 2600,
      delay: random() * 4000,
    };
  });
};

const TwinklingStar = ({ star, animate }: { star: Star; animate: boolean }) => {
  const opacity = useRef(new Animated.Value(star.minOpacity)).current;

  useEffect(() => {
    if (!animate) {
      opacity.setValue((star.minOpacity + star.maxOpacity) / 2);
      return;
    }
    const half = star.duration / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: star.maxOpacity,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: star.minOpacity,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), star.delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [animate, opacity, star]);

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.left as `${number}%`,
          top: star.top as `${number}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          opacity,
        },
        star.size > 2 && styles.glow,
      ]}
    />
  );
};

interface StarFieldProps {
  count?: number;
  seed?: number;
}

/**
 * A field of softly twinkling stars that fills its parent. Purely decorative: it ignores touches
 * and is hidden from screen readers. The stars hold still when the user asks to reduce motion.
 */
const StarField = ({ count = 70, seed = 7 }: StarFieldProps) => {
  const stars = useMemo(() => makeStars(count, seed), [count, seed]);
  const [animate, setAnimate] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduce => {
        if (!cancelled) setAnimate(!reduce);
      })
      .catch(() => {
        if (!cancelled) setAnimate(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {stars.map((star, index) => (
        <TwinklingStar key={index} star={star} animate={animate} />
      ))}
    </View>
  );
};

export default StarField;

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    backgroundColor: '#FFF6DA',
  },
  glow: {
    shadowColor: '#FFF1C2',
    shadowOpacity: 0.9,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
