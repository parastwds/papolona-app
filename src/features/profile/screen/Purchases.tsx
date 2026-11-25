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
import { useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Gem,
  Heart,
  ShoppingBag,
  Wallet,
} from 'lucide-react-native';
import EmblemSet from '@/features/series/component/EmblemSet';

import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMembership, usePurchases } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  formatPrice,
  membershipPrice,
  type Membership,
  type Purchase,
} from '@/services/session';
import { rarityOf } from '@/features/series/artworks';
import MembershipPicker from '@/features/membership/component/MembershipPicker';
import MembershipTerms from '@/features/membership/component/MembershipTerms';
import { font, hp, wp } from '@/utils/responsive';
import ProfileSubScreen, {
  SubSection,
  SUB_COLORS as COLORS,
  subText,
} from '../component/ProfileSubScreen';

/**
 * The member's membership: which one, its price, and switching to another (each switch to a paid one is
 * charged again). Apprentices see when it opens; members who never chose are asked to.
 */
const MembershipSection = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const membership = useMembership();
  const [changing, setChanging] = useState(false);

  if (membership.isPending) return <ActivityIndicator color={COLORS.gold} />;
  if (membership.isError) {
    return (
      <Text style={subText.error}>
        {getErrorMessage(membership.error, 'Could not load your membership.')}
      </Text>
    );
  }

  const data = membership.data;
  if (!data.isMember) {
    return (
      <View style={styles.box}>
        <Text style={subText.rowTitle}>No membership yet</Text>
        <Text style={subText.rowDescription}>
          {data.canJoin
            ? 'Your apprenticeship is complete: choose Explorer, Creator or Collector.'
            : 'You choose Explorer, Creator or Collector once your apprenticeship is complete.'}
        </Text>
        {data.canJoin ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(SCREENS.membership)}
            hitSlop={8}
            style={styles.link}
          >
            <Text style={styles.linkText}>Choose your membership</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const current = data.membershipTypes?.find(t => t.id === data.membershipType);
  const saved = (updated: Membership) => {
    queryClient.setQueryData(queryKeys.membership, updated);
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    setChanging(false);
  };

  if (current && !changing) {
    return (
      <View>
        {data.demotedFrom ? (
          <Text style={[subText.rowDescription, styles.lead]}>
            {`Your ${
              data.membershipTypes?.find(t => t.id === data.demotedFrom)
                ?.title ?? data.demotedFrom
            } membership has ended: its terms were not met in the last period. You can choose it again at any time.`}
          </Text>
        ) : null}
        <View style={[styles.box, styles.row]}>
          <View style={styles.flex}>
            <Text style={subText.rowTitle}>{current.title}</Text>
            <Text style={subText.rowDescription}>
              {current.tagline} · {membershipPrice(current)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change your membership from ${current.title}`}
            onPress={() => setChanging(true)}
            hitSlop={10}
          >
            <Text style={styles.linkText}>Change</Text>
          </Pressable>
        </View>
        {/* What a Creator or Collector must do each period, and their wallet. */}
        {data.standing?.required ? (
          <View style={styles.terms}>
            <MembershipTerms membership={data} onUpdated={saved} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {!current ? (
        <Text style={[subText.rowDescription, styles.lead]}>
          Choose the membership that best represents your role in Papolona.
        </Text>
      ) : null}
      <MembershipPicker
        membership={data}
        mode="change"
        onDone={saved}
        onEditBilling={() => navigation.navigate(SCREENS.billingInfo)}
      />
      {current ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setChanging(false)}
          hitSlop={8}
          style={styles.keep}
        >
          <Text style={styles.linkText}>Keep {current.title}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** What a purchase was, in words: "Dozen NFT, bought from Rey R.". */
const describe = (p: Purchase) => {
  const label = p.series ? rarityOf(p.series.rarity).label : '';
  switch (p.purpose) {
    case 'nft_purchase':
      return {
        title: `${label} NFT`.trim(),
        text: p.seller
          ? `Bought from ${p.seller}`
          : 'Bought on the marketplace',
      };
    case 'conversion':
      return {
        title: 'NFT conversion',
        text: label ? `Your ${label} emblem` : 'An emblem',
      };
    case 'stone':
      return {
        title: 'Sensitisation Package',
        text: 'Posted to your billing address',
      };
    case 'membership':
      return { title: 'Membership', text: 'First month' };
    case 'donation':
      return { title: 'Gift to Papolona', text: 'Thank you for your support' };
    case 'wallet_deposit':
      return { title: 'Wallet deposit', text: 'Added to your wallet' };
    case 'collector_fee':
      return { title: 'Collector fee', text: 'For the current period' };
    default:
      return { title: 'Payment', text: '' };
  }
};

/** One purchase: the NFT's artwork (or an icon), what it was, when, and what it cost. */
const PurchaseRow = ({ purchase }: { purchase: Purchase }) => {
  const { title, text } = describe(purchase);
  const price = formatPrice({
    amountCents: purchase.amountCents,
    currency: purchase.currency,
  });
  const Icon =
    purchase.purpose === 'stone'
      ? Gem
      : purchase.purpose === 'donation'
      ? Heart
      : purchase.purpose === 'wallet_deposit'
      ? Wallet
      : BadgeCheck;
  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${text}, ${formatDate(
        purchase.createdAt,
      )}, ${price}`}
      style={styles.purchase}
    >
      <View style={styles.thumb}>
        {purchase.series ? (
          <EmblemSet
            artworkKey={purchase.series.artworkKey}
            length={purchase.series.length}
            framed={false}
          />
        ) : (
          <Icon size={20} color={COLORS.gold} strokeWidth={1.6} />
        )}
      </View>
      <View style={styles.flex}>
        <Text style={subText.rowTitle}>{title}</Text>
        <Text style={subText.rowDescription} numberOfLines={1}>
          {text ? `${text} · ` : ''}
          {formatDate(purchase.createdAt)}
        </Text>
      </View>
      <Text style={styles.amount}>{price}</Text>
    </View>
  );
};

/** Everything the user paid for, newest first; demo payments for now. */
const PurchaseList = () => {
  const purchases = usePurchases();
  if (purchases.isPending) return <ActivityIndicator color={COLORS.gold} />;
  if (purchases.isError) {
    return (
      <Text style={subText.error}>
        {getErrorMessage(purchases.error, 'Could not load your purchases.')}
      </Text>
    );
  }
  if (purchases.data.length > 0) {
    return (
      <View style={styles.purchases}>
        {purchases.data.map(p => (
          <PurchaseRow key={p.id} purchase={p} />
        ))}
        <Text style={[subText.rowDescription, styles.demo]}>
          Demo payments: nobody was charged.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <View style={styles.icon}>
        <ShoppingBag size={28} color={COLORS.gold} strokeWidth={1.5} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        No purchases yet
      </Text>
      <Text style={[subText.rowDescription, styles.text]}>
        Your memberships, package, NFT conversions and NFTs you buy will be
        listed here.
      </Text>
    </View>
  );
};

/**
 * Membership & purchases, from the Profile tab: the member's membership, with switching, and everything
 * they paid for (memberships, the package, NFT conversions, NFTs bought).
 */
const Purchases = () => (
  <ProfileSubScreen title="Membership & purchases">
    <SubSection title="Membership">
      <MembershipSection />
    </SubSection>
    <SubSection title="Purchases">
      <PurchaseList />
    </SubSection>
  </ProfileSubScreen>
);

export default Purchases;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  box: {
    gap: 4,
    paddingVertical: hp(14),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: wp(12) },
  link: { alignSelf: 'flex-start', marginTop: hp(6) },
  linkText: { color: COLORS.gold, fontSize: font(14), fontWeight: '600' },
  lead: { marginBottom: hp(12) },
  keep: { alignSelf: 'center', marginTop: hp(12) },
  empty: { alignItems: 'center', paddingTop: hp(20) },
  fill: { width: '100%', height: '100%' },
  purchases: { gap: hp(12) },
  purchase: { flexDirection: 'row', alignItems: 'center', gap: wp(12) },
  terms: { marginTop: hp(16) },
  thumb: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#000',
  },
  amount: { color: COLORS.gold, fontSize: font(15), fontWeight: '600' },
  demo: { marginTop: hp(4), textAlign: 'center' },
  icon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: COLORS.tonal,
  },
  title: {
    marginTop: hp(18),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  text: { marginTop: hp(8), textAlign: 'center', maxWidth: 300 },
});
