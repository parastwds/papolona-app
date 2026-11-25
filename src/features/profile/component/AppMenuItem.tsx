import { font, wp } from '@/utils/responsive';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

interface AppMenuItemProps {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  // An action rather than a destination (log out): tinted, with no chevron.
  tone?: 'default' | 'danger';
  // A short call to action beside the title, such as "UPGRADE!".
  badge?: string;
}

const TONES = {
  default: { icon: '#A1BE94', text: '#F1EEE0' },
  danger: { icon: '#E8A69F', text: '#E8A69F' },
};

/** One row of a plain list: icon, title, and a chevron when it leads somewhere. */
const AppMenuItem = ({
  title,
  onPress,
  icon: Icon,
  tone = 'default',
  badge,
}: AppMenuItemProps) => {
  const colors = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge}` : undefined}
      android_ripple={RIPPLE}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      {Icon ? <Icon size={20} color={colors.icon} strokeWidth={1.6} /> : null}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {tone === 'default' ? (
        <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
      ) : null}
    </Pressable>
  );
};

export default AppMenuItem;

const RIPPLE = { color: 'rgba(232, 213, 138, 0.14)' };

const styles = StyleSheet.create({
  // Full width, so the press feedback runs edge to edge like a system list.
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingHorizontal: wp(20),
  },
  pressed: { backgroundColor: 'rgba(232, 213, 138, 0.07)' },
  title: { flex: 1, fontSize: font(16) },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E8964A',
  },
  badgeText: { color: '#172016', fontSize: font(11), fontWeight: '800', letterSpacing: 0.8 },
});
