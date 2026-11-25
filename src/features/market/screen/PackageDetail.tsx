import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  BookOpenText,
  Castle,
  Check,
  type LucideIcon,
} from 'lucide-react-native';

import TabBackground from '@/components/TabBackground';
import { RootStackParamList } from '@/navigation/types';
import { SCREENS } from '@/constants/screens';
import { getErrorMessage } from '@/services/api';
import { useMembership } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { formatPrice, type Membership, type Package } from '@/services/session';
import ScreenHeader, { GOLD } from '@/features/artwork/component/ScreenHeader';
import { font, hp, wp } from '@/utils/responsive';
import PackageOrderSheet from '../component/PackageOrderSheet';
import {
  GICLEE_TRIPTYCH,
  MEDITATION_STONE,
  PACKAGE_PICTURE_RATIO,
} from '../packageArt';

type Props = NativeStackScreenProps<RootStackParamList, 'PackageDetail'>;

const GUTTER = wp(20);
const GOLD_SOLID = '#D9C77E';
const ON_GOLD = '#172016';
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** One thing in the package: its picture (or, with no picture yet, an icon), its name and what it is. */
const Item = ({
  picture,
  Icon,
  title,
  text,
}: {
  picture?: React.ReactNode;
  Icon?: LucideIcon;
  title: string;
  text: string;
}) =>
  Icon ? (
    <View style={[styles.item, styles.iconItem]}>
      <View style={styles.iconBox}>
        <Icon size={20} color={GOLD} strokeWidth={1.6} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.itemTitle, styles.iconTitle]}>{title}</Text>
        <Text style={styles.itemText}>{text}</Text>
      </View>
    </View>
  ) : (
    <View style={styles.item}>
      {picture}
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemText}>{text}</Text>
    </View>
  );

/** Where the user stands on the package: bought it, can't buy yet, or can buy it now. */
const Action = ({
  pkg,
  membership,
  onBuy,
}: {
  pkg: Package;
  membership: Membership;
  onBuy: () => void;
}) => {
  // Any order counts: the old retreat package held the stone and triptych too.
  const order = membership.stone.order;
  if (order) {
    return (
      <View style={styles.ordered}>
        <Check size={18} color={GOLD} strokeWidth={2.2} />
        <Text style={styles.orderedText}>
          Bought {formatDate(order.createdAt)}, posted to {order.city}.
        </Text>
      </View>
    );
  }
  if (!membership.isMember) {
    return (
      <Text style={styles.note}>
        {membership.canJoin
          ? 'Join the collective (free) to buy it.'
          : 'Opens once your apprenticeship is complete.'}
      </Text>
    );
  }
  const total = formatPrice({
    amountCents: pkg.totalCents,
    currency: pkg.currency,
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buy ${pkg.title}, ${total} with postage`}
      onPress={onBuy}
      style={({ pressed }) => [styles.buy, pressed && styles.pressed]}
    >
      <Text style={styles.buyText}>Buy · {total}</Text>
    </Pressable>
  );
};

/**
 * One package: everything in it, in pictures and words, its price with postage, and buying it (the
 * address sheet opens over the screen).
 */
const PackageDetail = ({ navigation, route }: Props) => {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const membership = useMembership();
  const [buying, setBuying] = useState(false);
  const pkg = membership.data?.packages?.find(p => p.id === id);

  const renderBody = () => {
    if (membership.isPending) {
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    }
    if (membership.isError || !pkg) {
      return (
        <Text style={[styles.note, styles.padded]}>
          {membership.isError
            ? getErrorMessage(membership.error, 'Could not load the package.')
            : 'This package is not on offer.'}
        </Text>
      );
    }
    const price = (amountCents: number) =>
      formatPrice({ amountCents, currency: pkg.currency });

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {pkg.subtitle ? (
          <Text style={styles.subtitle}>{pkg.subtitle}</Text>
        ) : null}
        <Text style={styles.lead}>
          Every member receives it once. With an NFT conversion every 60 days,
          it makes you an active member.
        </Text>

        <Item
          picture={
            <View style={[styles.picture, styles.stone]}>
              <Image
                source={MEDITATION_STONE}
                contentFit="contain"
                accessibilityLabel="The meditation stone"
                style={styles.fill}
              />
            </View>
          }
          title="Meditation stone"
          text="A white stone marked with a Papolona glyph, to keep beside you while you draw and interpret your clues. Posted to you."
        />
        <Item
          picture={
            <View style={styles.picture}>
              <Image
                source={GICLEE_TRIPTYCH}
                contentFit="cover"
                accessibilityLabel="The Enigma Prism Triptych: three framed prints hung side by side"
                style={styles.fill}
              />
            </View>
          }
          title="Enigma Prism Triptych"
          text="Three fine-art giclée prints that hang together as one work. Posted to you with the stone."
        />
        <Item
          Icon={BookOpenText}
          title="Initiation materials"
          text="A guide to the Papolona Method, posted with the stone and triptych."
        />
        <Item
          Icon={Castle}
          title="A retreat stay at Château de Puycharnaud"
          text="A stay at the château in France, to deepen your practice of the Papolona Method."
        />
        <View style={styles.prices}>
          <View style={styles.row}>
            <Text style={styles.label}>Package</Text>
            <Text style={styles.value}>{price(pkg.priceCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Postage</Text>
            <Text style={styles.value}>{price(pkg.postageCents)}</Text>
          </View>
          <View style={[styles.row, styles.total]}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.totalValue}>{price(pkg.totalCents)}</Text>
          </View>
        </View>

        <Action
          pkg={pkg}
          membership={membership.data}
          onBuy={() => setBuying(true)}
        />
      </ScrollView>
    );
  };

  return (
    <TabBackground deep>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title={pkg?.title ?? 'Package'}
          onBack={() => navigation.goBack()}
        />
        {renderBody()}
      </SafeAreaView>
      <PackageOrderSheet
        pkg={buying && pkg ? pkg : null}
        onClose={() => setBuying(false)}
        onOrdered={updated => {
          queryClient.setQueryData(queryKeys.membership, updated);
          setBuying(false);
        }}
        onEditBilling={() => {
          setBuying(false);
          navigation.navigate(SCREENS.billingInfo);
        }}
      />
    </TabBackground>
  );
};

export default PackageDetail;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
  padded: { paddingHorizontal: GUTTER },
  pressed: { opacity: 0.8 },
  fill: { width: '100%', height: '100%' },
  content: {
    paddingTop: hp(16),
    paddingHorizontal: GUTTER,
    paddingBottom: hp(40),
  },
  subtitle: {
    marginBottom: hp(8),
    color: GOLD,
    fontFamily: 'serif',
    fontSize: font(18),
  },
  lead: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  iconItem: { flexDirection: 'row', gap: wp(14) },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(232, 213, 138, 0.14)',
  },
  iconTitle: { marginTop: 0 },
  item: { marginTop: hp(24) },
  picture: {
    width: '100%',
    aspectRatio: PACKAGE_PICTURE_RATIO,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  stone: { backgroundColor: '#F4F2EC', padding: 10 },
  itemTitle: {
    marginTop: hp(12),
    color: CREAM,
    fontSize: font(17),
    fontWeight: '600',
  },
  itemText: {
    marginTop: 4,
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(20),
  },
  prices: { marginTop: hp(28) },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(8),
  },
  total: {
    paddingTop: hp(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  label: { color: MUTED, fontSize: font(14) },
  value: { color: CREAM, fontSize: font(14) },
  totalValue: { color: GOLD, fontSize: font(18), fontWeight: '600' },
  buy: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: hp(22),
    borderRadius: 26,
    backgroundColor: GOLD_SOLID,
  },
  buyText: { color: ON_GOLD, fontSize: font(16), fontWeight: '700' },
  ordered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: hp(22),
  },
  orderedText: { flex: 1, color: CREAM, fontSize: font(14) },
  note: { marginTop: hp(22), color: MUTED, fontSize: font(14) },
});
