import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Sparkles, X } from 'lucide-react-native';

import { useMembership } from '@/services/queries';
import { font, hp, wp } from '@/utils/responsive';

// When the Collector last closed the invitation: it comes back after this long.
const DISMISSED_KEY = 'papolona.creatorInviteDismissedAt';
const COME_BACK_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * On Home, for two members:
 * - A Collector, now and then: they can start creating too (closable; it comes
 *   back after a fortnight).
 * - A provisional Creator: how to become a full Creator.
 */
const CreatorNudge = ({ onOpenMembership }: { onOpenMembership: () => void }) => {
  const membership = useMembership();
  const data = membership.data;
  const [dismissedAt, setDismissedAt] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(DISMISSED_KEY)
      .then(value => setDismissedAt(value ? Number(value) : null))
      .catch(() => setDismissedAt(null));
  }, []);

  if (!data?.isMember) return null;

  if (data.creatorStage === 'provisional') {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Sparkles size={18} color={GOLD} strokeWidth={1.7} />
          <Text style={styles.title}>You are a provisional Creator</Text>
        </View>
        <Text style={styles.text}>
          Complete a Level 1 series and convert it into an NFT: that makes you a
          full Creator, with every level and selling open to you.
        </Text>
      </View>
    );
  }

  if (!data.creatorInvite || dismissedAt === undefined) return null;
  if (dismissedAt && Date.now() - dismissedAt < COME_BACK_MS) return null;

  const dismiss = () => {
    const now = Date.now();
    setDismissedAt(now);
    SecureStore.setItemAsync(DISMISSED_KEY, String(now)).catch(() => undefined);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Sparkles size={18} color={GOLD} strokeWidth={1.7} />
        <Text style={styles.title}>You can start creating too</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          onPress={dismiss}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <X size={18} color="#B4B8AB" strokeWidth={1.8} />
        </Pressable>
      </View>
      <Text style={styles.text}>
        As a Collector you support the members who create. Switch to Creator to
        make your own: you start with Single, Twin and Level 1 readings, and your
        first Level 1 NFT makes you a full Creator.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenMembership}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.link}>Review your membership</Text>
      </Pressable>
    </View>
  );
};

export default CreatorNudge;

const GOLD = '#E8D58A';

const styles = StyleSheet.create({
  card: {
    marginTop: hp(20),
    padding: wp(16),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    backgroundColor: 'rgba(11, 18, 13, 0.6)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#F1EEE0', fontSize: font(16), fontWeight: '600' },
  text: { marginTop: hp(6), color: '#B4B8AB', fontSize: font(14), lineHeight: font(20) },
  action: { marginTop: hp(10), minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: GOLD, fontSize: font(14), fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
