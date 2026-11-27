import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Coins, Gift } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import { usePennyHistory, useWallet } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  buyPennyPack,
  claimDailyBonus,
  formatPennies,
  formatPrice,
  type PennyPack,
  type PennyReason,
  type Wallet as WalletData,
} from '@/services/session';
import ProfileSubScreen, {
  SUB_COLORS,
  SubSection,
  subText,
} from '@/features/profile/component/ProfileSubScreen';

// What each change to the balance was, in the history.
const REASON: Record<PennyReason, string> = {
  welcome: 'Welcome pennies',
  daily_bonus: 'Daily bonus',
  pack: 'Penny pack',
  reading: 'Reading',
  clue_prompt: 'AI clue suggestion',
  message_request: 'Message request',
  conversion: 'NFT conversion',
  membership: 'Membership',
  collector_fee: 'Collector fee',
  stone: 'Sensitisation Package',
  donation: 'Gift to Papolona',
  nft_purchase: 'NFT bought',
  bid_hold: 'Bid placed (held)',
  bid_refund: 'Outbid: bid returned',
  nft_sale: 'NFT sold: your share',
  refund: 'Returned',
  migration: 'Balance moved to pennies',
};

const when = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });

/**
 * Papolona pennies: the balance, today's bonus, the packs (the one thing
 * bought with real money) and every penny earned and spent.
 */
const Wallet = () => {
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const history = usePennyHistory();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // The balance shows on the membership screen and in the Gallery too.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.penniesAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.membership });
  };

  const run = async (key: string, action: () => Promise<WalletData>, fallback: string) => {
    if (busy) return;
    setBusy(key);
    setMessage('');
    try {
      // The new balance at once; the history and the rest follow.
      queryClient.setQueryData(queryKeys.wallet, await action());
      refresh();
    } catch (error) {
      setMessage(getErrorMessage(error, fallback));
    } finally {
      setBusy(null);
    }
  };

  const data = wallet.data;
  const transactions = history.data?.pages.flatMap(p => p.transactions) ?? [];

  const renderPack = (pack: PennyPack) => (
    <Pressable
      key={pack.id}
      accessibilityRole="button"
      accessibilityLabel={`${formatPennies(pack.pennies)} for ${formatPrice({
        amountCents: pack.priceCents,
        currency: pack.currency,
      })}${pack.bonusPercent ? `, ${pack.bonusPercent}% extra` : ''}`}
      disabled={busy !== null}
      onPress={() =>
        run(pack.id, () => buyPennyPack(pack.id), 'The pack was not bought. Please try again.')
      }
      style={({ pressed }) => [styles.pack, pressed && styles.pressed]}
    >
      {pack.bonusPercent ? (
        <Text style={styles.packBonus}>+{pack.bonusPercent}%</Text>
      ) : null}
      <Coins size={22} color={SUB_COLORS.gold} strokeWidth={1.6} />
      <Text style={styles.packPennies}>{pack.pennies.toLocaleString('en')}</Text>
      <Text style={styles.packUnit}>pennies</Text>
      {busy === pack.id ? (
        <ActivityIndicator color={SUB_COLORS.gold} style={styles.packPrice} />
      ) : (
        <Text style={styles.packPrice}>
          {formatPrice({ amountCents: pack.priceCents, currency: pack.currency })}
        </Text>
      )}
    </Pressable>
  );

  return (
    <ProfileSubScreen title="Papolona pennies">
      <SubSection>
        {wallet.isPending ? (
          <ActivityIndicator color={SUB_COLORS.gold} />
        ) : wallet.isError || !data ? (
          <Text style={subText.error}>
            {getErrorMessage(wallet.error, 'Could not load your pennies.')}
          </Text>
        ) : (
          <>
            <Text style={subText.rowDescription}>Your balance</Text>
            <View style={styles.balanceRow}>
              <Coins size={30} color={SUB_COLORS.gold} strokeWidth={1.6} />
              <Text accessibilityRole="header" style={styles.balance}>
                {data.balance.toLocaleString('en')}
              </Text>
              <Text style={styles.balanceUnit}>pennies</Text>
            </View>
            <Text style={subText.body}>
              Everything in Papolona is paid in pennies: a reading costs{' '}
              {formatPennies(data.prices.reading)}, an AI clue suggestion{' '}
              {formatPennies(data.prices.cluePrompt)}, a message request{' '}
              {formatPennies(data.prices.messageRequest)}. Conversions, NFTs,
              memberships and the Sensitisation Package too. When you sell an
              NFT, your share comes back as pennies.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !data.dailyBonus.available }}
              disabled={!data.dailyBonus.available || busy !== null}
              onPress={() =>
                run('bonus', claimDailyBonus, 'Could not claim today’s pennies.')
              }
              style={({ pressed }) => [
                styles.bonus,
                !data.dailyBonus.available && styles.bonusDone,
                pressed && styles.pressed,
              ]}
            >
              {busy === 'bonus' ? (
                <ActivityIndicator color={SUB_COLORS.onGold} />
              ) : (
                <View style={styles.bonusRow}>
                  <Gift
                    size={18}
                    color={data.dailyBonus.available ? SUB_COLORS.onGold : SUB_COLORS.gold}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.bonusText,
                      !data.dailyBonus.available && styles.bonusTextDone,
                    ]}
                  >
                    {data.dailyBonus.available
                      ? `Claim today’s ${formatPennies(data.dailyBonus.amount)}`
                      : 'Today’s bonus claimed: back tomorrow'}
                  </Text>
                </View>
              )}
            </Pressable>
          </>
        )}
        {message ? <Text style={[subText.error, styles.center]}>{message}</Text> : null}
      </SubSection>

      {data ? (
        <SubSection title="Buy pennies">
          <View style={styles.packs}>{data.packs.map(renderPack)}</View>
          <Text style={[subText.note, styles.center]}>
            {data.demoPayments
              ? 'Demo payment: nobody is charged.'
              : 'Buying pennies is not available yet.'}
          </Text>
        </SubSection>
      ) : null}

      <SubSection title="History">
        {history.isPending ? (
          <ActivityIndicator color={SUB_COLORS.gold} />
        ) : transactions.length === 0 ? (
          <Text style={subText.body}>Nothing yet.</Text>
        ) : (
          <View>
            {transactions.map(t => (
              <View key={t.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{REASON[t.reason] ?? t.reason}</Text>
                  <Text style={subText.rowDescription}>
                    {when(t.createdAt)} · balance {t.balanceAfter.toLocaleString('en')}
                  </Text>
                </View>
                <Text style={[styles.amount, t.amount > 0 && styles.amountIn]}>
                  {t.amount > 0 ? '+' : '−'}
                  {Math.abs(t.amount).toLocaleString('en')}
                </Text>
              </View>
            ))}
            {history.hasNextPage ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => history.fetchNextPage()}
                style={({ pressed }) => [styles.more, pressed && styles.pressed]}
              >
                {history.isFetchingNextPage ? (
                  <ActivityIndicator color={SUB_COLORS.gold} />
                ) : (
                  <Text style={styles.link}>Show older</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </SubSection>
    </ProfileSubScreen>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  center: { textAlign: 'center' },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: hp(4),
    marginBottom: hp(12),
  },
  balance: { color: SUB_COLORS.cream, fontFamily: 'serif', fontSize: font(40) },
  balanceUnit: { color: SUB_COLORS.gold, fontSize: font(16), marginTop: hp(10) },
  bonus: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(16),
    borderRadius: 25,
    backgroundColor: SUB_COLORS.goldSolid,
  },
  bonusDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: SUB_COLORS.outline,
  },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bonusText: { color: SUB_COLORS.onGold, fontSize: font(15), fontWeight: '700' },
  bonusTextDone: { color: SUB_COLORS.gold, fontWeight: '600' },
  // Three across, like every grid in the app.
  packs: { flexDirection: 'row', gap: wp(10), marginBottom: hp(10) },
  pack: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: hp(14),
    borderWidth: 1,
    borderColor: SUB_COLORS.outline,
    borderRadius: 14,
  },
  packBonus: {
    position: 'absolute',
    top: 6,
    right: 6,
    color: SUB_COLORS.gold,
    fontSize: font(11),
    fontWeight: '800',
  },
  packPennies: {
    marginTop: hp(6),
    color: SUB_COLORS.cream,
    fontSize: font(19),
    fontWeight: '700',
  },
  packUnit: { color: SUB_COLORS.faint, fontSize: font(12) },
  packPrice: {
    marginTop: hp(8),
    color: SUB_COLORS.gold,
    fontSize: font(15),
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: hp(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUB_COLORS.outline,
  },
  rowText: { flex: 1 },
  rowTitle: { color: SUB_COLORS.cream, fontSize: font(15), fontWeight: '600' },
  amount: { color: SUB_COLORS.cream, fontSize: font(16), fontWeight: '700' },
  amountIn: { color: SUB_COLORS.gold },
  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { color: SUB_COLORS.gold, fontSize: font(15), fontWeight: '600' },
});
