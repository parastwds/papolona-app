import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';

import BillingOnFile, { useHasBilling } from '@/components/BillingOnFile';
import { getErrorMessage } from '@/services/api';
import {
  chooseMembershipType,
  formatPrice,
  joinMembership,
  membershipPrice,
  type Membership,
  type MembershipTypeId,
} from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';

const GOLD = '#E8D58A';
const GOLD_SOLID = '#D9C77E';
const ON_GOLD = '#172016';
const CREAM = '#F1EEE0';
const MUTED = 'rgba(220, 224, 214, 0.72)';
const FAINT = 'rgba(220, 224, 214, 0.5)';
const RED = '#E2A09A';

type Props = {
  membership: Membership;
  // 'join': an apprentice who has finished joins as the chosen membership. 'change': a member chooses or
  // switches.
  mode: 'join' | 'change';
  onDone: (membership: Membership) => void;
  // Opens Billing info: paid memberships need it.
  onEditBilling: () => void;
};

/**
 * Explorer, Creator or Collector, as three tabs over one plan card: the chosen one's price, who it is for
 * and what it includes. The one the questionnaire suggests comes first and starts selected (a member's
 * own starts selected when changing). A paid one needs billing info and charges its first month (demo);
 * each switch to a paid one is charged again.
 */
const MembershipPicker = ({
  membership,
  mode,
  onDone,
  onEditBilling,
}: Props) => {
  const current = membership.membershipType ?? null;
  const suggested = membership.suggestedType ?? 'explorer';
  const types = useMemo(() => {
    const all = membership.membershipTypes ?? [];
    // The suggested one first; the rest keep their order.
    return [
      ...all.filter(t => t.id === suggested),
      ...all.filter(t => t.id !== suggested),
    ];
  }, [membership.membershipTypes, suggested]);
  const [selected, setSelected] = useState<MembershipTypeId>(
    current ?? suggested,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { ready: hasBilling } = useHasBilling();

  const choice = types.find(t => t.id === selected);
  if (!choice) return null;
  const paid = choice.priceCents > 0;
  const unchanged = mode === 'change' && selected === current;
  const blocked = busy || unchanged || (paid && !hasBilling);
  const amount = paid
    ? formatPrice({ amountCents: choice.priceCents, currency: choice.currency })
    : membershipPrice(choice);

  const submit = async () => {
    if (blocked) return;
    setBusy(true);
    setMessage('');
    try {
      onDone(
        mode === 'join'
          ? await joinMembership(selected)
          : await chooseMembershipType(selected),
      );
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          'Could not save your membership. Please try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const label =
    mode === 'join'
      ? `Join as ${choice.title}`
      : unchanged
      ? 'Your current membership'
      : `${current ? 'Switch to' : 'Choose'} ${choice.title}`;
  // Paid in Papolona pennies. A Creator starts provisional: free until their
  // first Level 1 conversion makes them full and starts the monthly price.
  const note =
    choice.id === 'creator' && !unchanged
      ? `You start as a provisional Creator: Single, Twin and Level 1 readings, free. Converting your first Level 1 series into an NFT makes you a full Creator and starts the monthly price (${membershipPrice(
          choice,
        )}). If you were a full Creator before, the first month is charged in pennies now.`
      : !paid
      ? choice.id === 'collector'
        ? 'No monthly price: keep Collector by meeting one of the terms above.'
        : 'Free: no monthly price and no terms to meet.'
      : mode === 'change' && !unchanged
      ? `Switching charges the first month (${membershipPrice(
          choice,
        )}) in pennies again, even if you had it before.`
      : 'Paid monthly in pennies; each switch to a paid membership is charged again.';

  return (
    <View>
      {/* The three, side by side: the suggested one marked with a dot. */}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {types.map(type => {
          const on = type.id === selected;
          return (
            <Pressable
              key={type.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${type.title}, ${membershipPrice(type)}${
                type.id === suggested ? ', suggested for you' : ''
              }${type.id === current ? ', your membership' : ''}`}
              onPress={() => {
                setSelected(type.id);
                setMessage('');
              }}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabTitle, on && styles.tabTitleOn]}>
                {type.title}
              </Text>
              <Text style={[styles.tabPrice, on && styles.tabPriceOn]}>
                {type.priceCents === 0
                  ? membershipPrice(type)
                  : formatPrice({
                      amountCents: type.priceCents,
                      currency: type.currency,
                    })}
              </Text>
              {type.id === suggested ? (
                <View style={[styles.dot, on && styles.dotOn]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* The chosen one. */}
      <View style={styles.plan}>
        <View style={styles.planTop}>
          <View style={styles.flex}>
            <Text style={styles.planTitle}>{choice.title}</Text>
            <Text style={styles.tagline}>{choice.tagline}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>{amount}</Text>
            {paid ? <Text style={styles.per}>a month</Text> : null}
          </View>
        </View>
        {selected === suggested || selected === current ? (
          <View style={styles.tags}>
            {selected === suggested ? (
              <Text style={styles.tag}>Suggested for you</Text>
            ) : null}
            {selected === current ? (
              <Text style={[styles.tag, styles.tagQuiet]}>Your membership</Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.benefits}>
          {choice.benefits.map(benefit => (
            <View key={benefit} style={styles.benefit}>
              <Check size={14} color={GOLD} strokeWidth={2.4} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      {paid ? <BillingOnFile onEdit={onEditBilling} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: blocked }}
        accessibilityLabel={
          unchanged || choice.id === 'collector'
            ? label
            : `${label}, ${membershipPrice(choice)}`
        }
        disabled={blocked}
        onPress={submit}
        style={({ pressed }) => [
          styles.button,
          blocked && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={ON_GOLD} />
        ) : (
          <Text style={styles.buttonText}>
            {label}
            {/* Collector has no price to show: just its name. */}
            {unchanged || choice.id === 'collector'
              ? ''
              : ` · ${membershipPrice(choice)}`}
          </Text>
        )}
      </Pressable>
      <Text style={styles.footnote}>{note}</Text>
    </View>
  );
};

export default MembershipPicker;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.25)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(10),
    borderRadius: 12,
  },
  tabOn: { backgroundColor: GOLD_SOLID },
  tabTitle: { color: CREAM, fontSize: font(14), fontWeight: '600' },
  tabTitleOn: { color: ON_GOLD },
  tabPrice: { marginTop: 2, color: MUTED, fontSize: font(12) },
  tabPriceOn: { color: ON_GOLD },
  dot: {
    position: 'absolute',
    top: 7,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  dotOn: { backgroundColor: ON_GOLD },
  plan: {
    marginTop: hp(12),
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.4)',
    borderRadius: 18,
    backgroundColor: 'rgba(8, 14, 10, 0.7)',
  },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: wp(12) },
  planTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(24) },
  tagline: { marginTop: 2, color: MUTED, fontSize: font(13) },
  priceBox: { alignItems: 'flex-end' },
  price: { color: GOLD, fontFamily: 'serif', fontSize: font(26) },
  per: { color: MUTED, fontSize: font(11) },
  tags: { flexDirection: 'row', gap: 6, marginTop: hp(10) },
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    color: ON_GOLD,
    fontSize: font(11),
    fontWeight: '700',
    borderRadius: 8,
    backgroundColor: GOLD_SOLID,
  },
  tagQuiet: {
    color: GOLD,
    backgroundColor: 'rgba(232, 213, 138, 0.14)',
  },
  benefits: { marginTop: hp(14), gap: hp(8) },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { flex: 1, color: CREAM, fontSize: font(14) },
  error: { marginTop: hp(10), color: RED, fontSize: font(12) },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: hp(14),
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: GOLD_SOLID,
  },
  buttonText: { color: ON_GOLD, fontSize: font(15), fontWeight: '700' },
  footnote: {
    marginTop: hp(8),
    color: FAINT,
    fontSize: font(11),
    lineHeight: 16,
    textAlign: 'center',
  },
});
