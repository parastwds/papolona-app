import React from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';

export const SUB_COLORS = {
  gold: '#E8D58A',
  goldSolid: '#D9C77E',
  onGold: '#172016',
  cream: '#F1EEE0',
  sage: '#A1BE94',
  // Cream held back, for descriptions and for notes; both clear 4.5:1 on the dark.
  muted: '#B4B8AB',
  faint: '#979C8F',
  red: '#E8A69F',
  hairline: 'rgba(161, 190, 148, 0.2)',
  // The edge of a field or a choice that can be pressed.
  outline: 'rgba(161, 190, 148, 0.32)',
  // Press feedback, and the quiet fill that marks the choice in effect.
  ripple: 'rgba(232, 213, 138, 0.14)',
  tonal: 'rgba(232, 213, 138, 0.16)',
};

/** The side margin every Profile screen keeps. */
export const GUTTER = wp(20);

export const SUB_RIPPLE = { color: SUB_COLORS.ripple };

interface ProfileSubScreenProps {
  title: string;
  children: React.ReactNode;
  // Shown at the right of the header (e.g. a "New" action).
  action?: React.ReactNode;
  // Off for a screen that lays out and scrolls its own body.
  scroll?: boolean;
  // On while a sheet is open over the screen, to push the screen out of focus.
  blurred?: boolean;
}

/** The frame of a screen opened from the Profile tab: back arrow, title and a scrolling body. */
const ProfileSubScreen = ({
  title,
  children,
  action,
  scroll = true,
  blurred = false,
}: ProfileSubScreenProps) => {
  const navigation = useNavigation();
  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      style={[styles.background, blurred && styles.blurred]}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            android_ripple={BACK_RIPPLE}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <ArrowLeft size={22} color={SUB_COLORS.cream} strokeWidth={1.7} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {action}
        </View>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

export default ProfileSubScreen;

/** A text action for the right of the header: "New", "Edit". */
export const HeaderAction = ({
  title,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? title}
    hitSlop={8}
    android_ripple={ACTION_RIPPLE}
    onPress={onPress}
    style={({ pressed }) => [styles.action, pressed && styles.pressed]}
  >
    <Text style={styles.actionText}>{title}</Text>
  </Pressable>
);

/**
 * A group on a Profile screen, set apart by space and named by a plain subheading.
 * `bleed` leaves the sides open, for rows whose press feedback runs edge to edge.
 */
export const SubSection = ({
  title,
  bleed,
  children,
}: {
  title?: string;
  bleed?: boolean;
  children: React.ReactNode;
}) => (
  <View style={[styles.section, !bleed && styles.gutter]}>
    {title ? (
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, bleed && styles.gutter]}
      >
        {title}
      </Text>
    ) : null}
    {children}
  </View>
);

/** A hairline between rows of a group. In a `bleed` group, `inset` holds it to the gutters, or starts it past a leading icon. */
export const RowDivider = ({ inset }: { inset?: 'gutter' | 'icon' }) => (
  <View
    style={[
      styles.divider,
      inset === 'gutter' && styles.dividerGutter,
      inset === 'icon' && styles.dividerIcon,
    ]}
  />
);

/**
 * A choice between a few options, as one joined control: the option in effect
 * is filled, the others are plain.
 */
export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  accessibilityLabel: string;
}) => (
  <View
    accessibilityRole="radiogroup"
    accessibilityLabel={accessibilityLabel}
    style={styles.segmented}
  >
    {options.map((option, index) => {
      const selected = option.key === value;
      return (
        <Pressable
          key={option.key}
          accessibilityRole="radio"
          accessibilityState={{ selected, checked: selected }}
          android_ripple={SUB_RIPPLE}
          onPress={() => onChange(option.key)}
          style={[
            styles.segment,
            index > 0 && styles.segmentDivided,
            selected && styles.segmentSelected,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.segmentText, selected && styles.segmentTextSelected]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/**
 * Something that is not built yet: what it will be and why it is not here,
 * so the screen never looks broken.
 */
export const ComingSoon = ({
  title,
  text,
}: {
  title: string;
  text: string;
}) => (
  <View accessible accessibilityLabel={`${title}. Coming soon. ${text}`}>
    <View style={styles.soonHeading}>
      <Text style={styles.soonTitle}>{title}</Text>
      <Text style={styles.soonLabel}>Coming soon</Text>
    </View>
    <Text style={styles.soonText}>{text}</Text>
  </View>
);

const BACK_RIPPLE = { color: SUB_COLORS.ripple, borderless: true, radius: 24 };
const ACTION_RIPPLE = { color: SUB_COLORS.ripple, borderless: true };

/** Text roles shared by the rows of every Profile screen. */
export const subText = StyleSheet.create({
  rowTitle: { color: SUB_COLORS.cream, fontSize: font(16) },
  rowDescription: {
    marginTop: 2,
    color: SUB_COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  body: {
    color: '#D5D8CB',
    fontSize: font(15),
    lineHeight: font(23),
  },
  note: {
    color: SUB_COLORS.faint,
    fontSize: font(13),
    lineHeight: font(19),
  },
  error: {
    color: SUB_COLORS.red,
    fontSize: font(14),
    lineHeight: font(20),
  },
});

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: THEME_COLORS.bottomBg },
  // Drawn by the platform: Android 12 and later blur, anything else stays sharp.
  blurred: { filter: [{ blur: 1.5 }] },
  // As deep as the Profile tab's: the text sits on the artwork, not on cards.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  flex: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    // The arrow's 48 touch area overhangs the gutter, so the arrow itself sits on it.
    paddingLeft: GUTTER - 13,
    paddingRight: GUTTER,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: SUB_COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(24),
  },
  action: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionText: {
    color: SUB_COLORS.gold,
    fontSize: font(15),
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
  content: { paddingTop: hp(8), paddingBottom: hp(56) },
  gutter: { paddingHorizontal: GUTTER },
  section: { marginTop: hp(24) },
  // More room above the subheading than below it, so it belongs to what follows.
  sectionTitle: {
    marginBottom: hp(6),
    color: SUB_COLORS.sage,
    fontSize: font(14),
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SUB_COLORS.hairline,
  },
  dividerGutter: { marginHorizontal: GUTTER },
  dividerIcon: { marginLeft: GUTTER + 20 + wp(16), marginRight: GUTTER },
  segmented: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SUB_COLORS.outline,
    borderRadius: 12,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentDivided: {
    borderLeftWidth: 1,
    borderLeftColor: SUB_COLORS.outline,
  },
  segmentSelected: { backgroundColor: SUB_COLORS.tonal },
  segmentText: { color: SUB_COLORS.cream, fontSize: font(14) },
  segmentTextSelected: { color: SUB_COLORS.gold, fontWeight: '600' },
  soonHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: wp(12),
  },
  soonTitle: { flexShrink: 1, color: SUB_COLORS.cream, fontSize: font(16) },
  soonLabel: { color: SUB_COLORS.sage, fontSize: font(13) },
  soonText: {
    marginTop: 4,
    color: SUB_COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
});
