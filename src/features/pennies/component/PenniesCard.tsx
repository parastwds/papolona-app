import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Coins, Gift } from 'lucide-react-native';

import { getErrorMessage } from '@/services/api';
import { useWallet } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { claimDailyBonus, formatPennies } from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';

/**
 * On Home: the user's Papolona pennies, a button for today's bonus while it is
 * there to claim, and the way into the wallet.
 */
const PenniesCard = ({ onOpen }: { onOpen: () => void }) => {
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const data = wallet.data;
  if (!data) return null;

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      queryClient.setQueryData(queryKeys.wallet, await claimDailyBonus());
      queryClient.invalidateQueries({ queryKey: queryKeys.penniesAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.membership });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not claim today’s pennies.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatPennies(data.balance)}. Open your pennies.`}
        onPress={onOpen}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <Coins size={22} color={GOLD} strokeWidth={1.6} />
        <View style={styles.flex}>
          <Text style={styles.label}>Your pennies</Text>
          <Text style={styles.balance}>{data.balance.toLocaleString('en')}</Text>
        </View>
        <Text style={styles.link}>Buy pennies</Text>
        <ChevronRight size={18} color={GOLD} strokeWidth={1.8} />
      </Pressable>
      {data.dailyBonus.available ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={claim}
          style={({ pressed }) => [styles.bonus, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator color={ON_GOLD} />
          ) : (
            <>
              <Gift size={17} color={ON_GOLD} strokeWidth={2} />
              <Text style={styles.bonusText}>
                Claim today’s {formatPennies(data.dailyBonus.amount)}
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <Text style={styles.note}>
          Today’s bonus is claimed. A reading costs {formatPennies(data.prices.reading)}.
        </Text>
      )}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
};

export default PenniesCard;

const GOLD = '#E8D58A';
const ON_GOLD = '#172016';

const styles = StyleSheet.create({
  card: {
    marginTop: hp(20),
    padding: wp(16),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    backgroundColor: 'rgba(11, 18, 13, 0.6)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  label: { color: '#B4B8AB', fontSize: font(12) },
  balance: { color: '#F1EEE0', fontFamily: 'serif', fontSize: font(26) },
  link: { color: GOLD, fontSize: font(14), fontWeight: '600' },
  bonus: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: hp(12),
    borderRadius: 22,
    backgroundColor: '#D9C77E',
  },
  bonusText: { color: ON_GOLD, fontSize: font(15), fontWeight: '700' },
  note: { marginTop: hp(10), color: '#B4B8AB', fontSize: font(13), lineHeight: font(19) },
  error: { marginTop: hp(8), color: '#E2A09A', fontSize: font(13) },
  pressed: { opacity: 0.8 },
});
