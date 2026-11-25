import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import type { ActiveStatus } from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';

const GOLD = '#E8D58A';
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const WARN = '#E2A09A';
const DAY = 24 * 60 * 60 * 1000;
// Within this many days of the window closing, the banner warns.
const SOON_DAYS = 14;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });

/** What the member still needs to do to become (or stay) active, in plain words. */
export function activeSummary(active: ActiveStatus, now = Date.now()) {
  const until = active.activeUntil ? new Date(active.activeUntil).getTime() : 0;
  const daysLeft = Math.ceil((until - now) / DAY);
  if (active.isActive) {
    return {
      title: `Active member until ${shortDate(active.activeUntil!)}`,
      text:
        daysLeft <= SOON_DAYS
          ? `${daysLeft} ${
              daysLeft === 1 ? 'day' : 'days'
            } left. Convert an emblem into an NFT to stay active.`
          : 'Each NFT conversion keeps you active for another ' +
            `${active.windowDays} days.`,
      warn: daysLeft <= SOON_DAYS,
    };
  }
  const steps = [
    !active.stoneOrdered && 'buy the Sensitisation Package',
    !(until > now) && 'convert an emblem into an NFT',
  ].filter(Boolean) as string[];
  const ended = Boolean(active.activeUntil) && until <= now;
  return {
    title: ended
      ? 'Your active membership has ended'
      : 'Become an active member',
    text: `To sell on the marketplace, ${steps.join(' and ')}.`,
    warn: ended,
  };
}

type Props = { active: ActiveStatus; onPress: () => void };

/** Where the member stands on active membership, at the top of the Gallery. Opens Membership. */
const ActiveBanner = ({ active, onPress }: Props) => {
  const { title, text, warn } = activeSummary(active);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text} Open membership.`}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor:
              active.isActive && !warn ? GOLD : warn ? WARN : MUTED,
          },
        ]}
      />
      <View style={styles.flex}>
        <Text style={[styles.title, warn && { color: WARN }]}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
    </Pressable>
  );
};

export default ActiveBanner;

const styles = StyleSheet.create({
  // A quiet box: a dark wash and one thin edge.
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    marginBottom: hp(28),
    paddingVertical: hp(12),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  pressed: { opacity: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  title: { color: CREAM, fontSize: font(15), fontWeight: '600' },
  text: {
    marginTop: 2,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(18),
  },
});
