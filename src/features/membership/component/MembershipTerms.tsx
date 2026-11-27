import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Coins } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import {
  Membership,
  PENNIES,
  formatPrice,
  payCollectorFee,
} from '@/services/session';

const CREAM = '#F1EEE0';
const GOLD = '#E8D58A';
const MUTED = '#B4B8AB';
const WARN = '#E2A09A';
const ON_GOLD = '#172016';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

type Props = {
  membership: Membership;
  // The membership after paying the fee.
  onUpdated: (membership: Membership) => void;
};

/**
 * What a Creator or Collector must do each period (two months) to keep their
 * membership, by when, and their wallet: a Collector pays the fee, buys a
 * member's NFT with the minimum in their wallet, or buys art worth the yearly
 * amount within 12 months; a Creator converts a series. Nothing for Explorers
 * (or provisional Creators). Everything is in Papolona pennies, bought on the
 * wallet screen.
 */
const MembershipTerms = ({ membership, onUpdated }: Props) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState<'fee' | null>(null);
  const [message, setMessage] = useState('');
  const standing = membership.standing;
  if (!standing?.required) return null;

  const currency = standing.currency ?? membership.wallet?.currency ?? PENNIES;
  const money = (amountCents: number) => formatPrice({ amountCents, currency });
  const balance = membership.wallet?.balanceCents ?? standing.walletCents ?? 0;
  const isCollector = standing.type === 'collector';
  const depositCents = isCollector
    ? Math.max(0, (standing.minWalletCents ?? 0) - balance)
    : standing.depositCents ?? 0;

  const payFee = async () => {
    setBusy('fee');
    setMessage('');
    try {
      onUpdated(await payCollectorFee());
    } catch (error) {
      setMessage(
        getErrorMessage(error, 'That did not go through. Please try again.'),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={[styles.due, !standing.met && styles.warn]}>
        {standing.dueBy
          ? `Review your membership by ${formatDate(standing.dueBy)}`
          : 'Review your membership'}
      </Text>
      <Text style={styles.text}>
        {isCollector
          ? `Every ${
              standing.periodDays
            } days, either pay the Collector fee (${money(
              standing.feeCents ?? 0,
            )}), or buy a member's NFT on the marketplace while keeping at least ${money(
              standing.minWalletCents ?? 0,
            )} in your wallet.${
              standing.artYearTargetCents
                ? ` Or buy art worth ${money(
                    standing.artYearTargetCents,
                  )} or more within 12 months, which covers those 12 months.`
                : ''
            }`
          : `Every ${standing.periodDays} days, convert at least one completed series into an NFT.`}
      </Text>
      <Text style={styles.text}>
        If the period ends without this, your membership reverts to Explorer.
        You can review your membership at any time.
      </Text>

      <View style={styles.wallet}>
        <Coins size={18} color={GOLD} strokeWidth={1.6} />
        <Text style={styles.walletText}>Your pennies</Text>
        <Text style={styles.walletAmount}>{money(balance)}</Text>
      </View>
      {isCollector && standing.artYearTargetCents ? (
        <Text style={[styles.text, standing.artCoveredUntil && styles.ok]}>
          {standing.artCoveredUntil
            ? `Art bought in the last 12 months keeps you a Collector until ${formatDate(
                standing.artCoveredUntil,
              )}.`
            : `Art bought in the last 12 months: ${money(
                standing.artYearCents ?? 0,
              )} of ${money(standing.artYearTargetCents)}.`}
        </Text>
      ) : null}
      {isCollector ? (
        <Text
          style={[styles.text, standing.walletOk ? styles.ok : styles.warn]}
        >
          {standing.walletOk
            ? 'Your wallet holds the minimum.'
            : `Add ${money(depositCents)} to reach the minimum.`}
        </Text>
      ) : null}

      <View style={styles.buttons}>
        {isCollector ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={payFee}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            {busy === 'fee' ? (
              <ActivityIndicator color={ON_GOLD} />
            ) : (
              <Text style={styles.buttonText}>
                Pay the Collector fee · {money(standing.feeCents ?? 0)}
              </Text>
            )}
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate(SCREENS.wallet)}
          style={({ pressed }) => [
            styles.button,
            isCollector && styles.buttonQuiet,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, isCollector && styles.buttonTextQuiet]}>
            Buy pennies
          </Text>
        </Pressable>
      </View>
      {message ? (
        <Text style={[styles.note, styles.warn]}>{message}</Text>
      ) : null}
    </View>
  );
};

export default MembershipTerms;

const styles = StyleSheet.create({
  due: { color: CREAM, fontFamily: 'serif', fontSize: font(19) },
  warn: { color: WARN },
  ok: { color: GOLD },
  text: {
    marginTop: hp(6),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(21),
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(10),
    marginTop: hp(14),
    paddingVertical: hp(12),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.25)',
    borderRadius: 12,
  },
  walletText: { flex: 1, color: CREAM, fontSize: font(15) },
  walletAmount: { color: GOLD, fontSize: font(16), fontWeight: '700' },
  buttons: { gap: hp(10), marginTop: hp(14) },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(16),
    borderRadius: 24,
    backgroundColor: '#D9C77E',
  },
  buttonQuiet: {
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.55)',
    backgroundColor: 'transparent',
  },
  buttonText: { color: ON_GOLD, fontSize: font(15), fontWeight: '700' },
  buttonTextQuiet: { color: GOLD },
  pressed: { opacity: 0.8 },
  note: {
    marginTop: hp(8),
    color: '#979C8F',
    fontSize: font(13),
    textAlign: 'center',
  },
});
