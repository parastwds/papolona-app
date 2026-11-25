import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import EdgeFade from '@/components/EdgeFade';
import { font, hp, wp } from '@/utils/responsive';

type Props = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
};

/**
 * Back arrow and a serif title: the header of the screens opened from Discover,
 * the same as the Profile sub-screens'.
 */
const ScreenHeader = ({ title, onBack, right }: Props) => (
  <View style={styles.header}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onBack}
      android_ripple={BACK_RIPPLE}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <ArrowLeft size={22} color={CREAM} strokeWidth={1.7} />
    </Pressable>
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
    {right}
    {/* Content scrolling up under the header dissolves instead of being cut off at a line. */}
    <View pointerEvents="none" style={styles.fade}>
      <EdgeFade edge="top" fill />
    </View>
  </View>
);

export default ScreenHeader;

export const GOLD = '#E8D58A';
const CREAM = '#F1EEE0';
const BACK_RIPPLE = {
  color: 'rgba(232, 213, 138, 0.14)',
  borderless: true,
  radius: 24,
};

const styles = StyleSheet.create({
  header: {
    zIndex: 2,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    // The arrow's 48 touch area overhangs the gutter, so the arrow itself sits on it.
    paddingLeft: wp(20) - 13,
    paddingRight: wp(20),
  },
  // Hangs just below the header's bottom edge (a percentage top doesn't measure from there).
  fade: {
    position: 'absolute',
    bottom: -hp(28),
    left: 0,
    right: 0,
    height: hp(28),
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  title: {
    flex: 1,
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(24),
  },
});
