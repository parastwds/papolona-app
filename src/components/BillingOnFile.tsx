import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useBilling } from '@/services/queries';
import { font, hp } from '@/utils/responsive';

const GOLD = '#E8D58A';
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

/** Whether the user has saved billing info, which every payment needs. */
export function useHasBilling() {
  const billing = useBilling();
  return {
    ready: Boolean(billing.data?.billing),
    loading: billing.isPending,
    billing: billing.data?.billing ?? null,
  };
}

type Props = {
  // Opens Billing info (close any sheet first).
  onEdit: () => void;
};

/**
 * "Billed to": the billing info a payment uses, from the Profile tab, with a way to change it. Before it is
 * saved, a prompt to add it instead; the pay button waits for it (see useHasBilling).
 */
const BillingOnFile = ({ onEdit }: Props) => {
  const { billing, loading } = useHasBilling();

  if (loading) {
    return <ActivityIndicator color={GOLD} style={styles.box} />;
  }

  if (!billing) {
    return (
      <View style={[styles.box, styles.missing]}>
        <Text style={styles.title}>Add your billing info</Text>
        <Text style={styles.text}>
          Every payment uses the billing info you keep in your Profile. Add it
          once to pay.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          hitSlop={8}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Text style={styles.link}>Add billing info</Text>
        </Pressable>
      </View>
    );
  }

  const place = [billing.city, billing.country].filter(Boolean).join(', ');
  return (
    <View
      accessible
      accessibilityLabel={`Billed to ${billing.fullName}, ${billing.email}, ${place}.`}
      style={[styles.box, styles.row]}
    >
      <View style={styles.flex}>
        <Text style={styles.label}>Billed to</Text>
        <Text style={styles.name} numberOfLines={1}>
          {billing.fullName}
        </Text>
        <Text style={styles.text} numberOfLines={1}>
          {billing.email}
          {place ? ` · ${place}` : ''}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change billing info"
        onPress={onEdit}
        hitSlop={10}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>Change</Text>
      </Pressable>
    </View>
  );
};

export default BillingOnFile;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  box: {
    marginTop: hp(14),
    paddingVertical: hp(12),
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.25)',
    borderRadius: 12,
    backgroundColor: 'rgba(4, 10, 7, 0.45)',
  },
  missing: { borderColor: 'rgba(232, 213, 138, 0.5)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { color: MUTED, fontSize: font(12) },
  name: { marginTop: 2, color: CREAM, fontSize: font(15), fontWeight: '600' },
  title: { color: CREAM, fontSize: font(15), fontWeight: '600' },
  text: {
    marginTop: 2,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(18),
  },
  add: { alignSelf: 'flex-start', marginTop: hp(8) },
  link: { color: GOLD, fontSize: font(14), fontWeight: '600' },
});
