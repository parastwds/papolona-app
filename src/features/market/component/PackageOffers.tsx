import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import {
  formatPrice,
  type Membership,
  type Package,
  type RetreatInfo,
} from '@/services/session';
import { retreatPriceRange } from '../screen/RetreatDetail';
import { font, hp, wp } from '@/utils/responsive';

export { MEDITATION_STONE } from '../packageArt';

const GOLD = '#E8D58A';
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const totalOf = (pkg: Package) =>
  formatPrice({ amountCents: pkg.totalCents, currency: pkg.currency });

/** One package, in words only: tap it for the pictures, the details and buying it. */
const PackageCard = ({
  pkg,
  bought,
  onPress,
}: {
  pkg: Package;
  bought: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${pkg.title}: ${pkg.includes.join(', ')}. ${totalOf(
      pkg,
    )} with postage.${bought ? ' Bought.' : ''} Open details.`}
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      bought && styles.cardMine,
      pressed && styles.pressed,
    ]}
  >
    <View style={styles.cardTop}>
      <Text style={styles.title}>{pkg.title}</Text>
      <ChevronRight size={20} color={GOLD} strokeWidth={1.6} />
    </View>
    {pkg.subtitle ? <Text style={styles.subtitle}>{pkg.subtitle}</Text> : null}
    {pkg.includes.map(item => (
      <Text key={item} style={styles.include}>
        · {item}
      </Text>
    ))}
    <View style={styles.cardBottom}>
      <Text style={styles.price}>
        {totalOf(pkg)} <Text style={styles.priceNote}>with postage</Text>
      </Text>
      {bought ? (
        <View style={styles.boughtTag}>
          <Check size={13} color={GOLD} strokeWidth={2.4} />
          <Text style={styles.boughtText}>Bought</Text>
        </View>
      ) : (
        <Text style={styles.details}>Details</Text>
      )}
    </View>
  </Pressable>
);

/** The retreat, in words: by application, with its price range. Opens the retreat's screen. */
const RetreatCard = ({
  retreat,
  onPress,
}: {
  retreat: RetreatInfo;
  onPress: () => void;
}) => {
  const status = retreat.application?.status;
  const tag =
    status === 'accepted'
      ? 'Accepted'
      : status === 'declined'
      ? 'Not accepted'
      : status
      ? 'Applied'
      : 'Apply';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Château de Puycharnaud retreat: ${
        retreat.days
      } days, by application, ${retreatPriceRange(retreat)}. ${
        status ? tag + '.' : ''
      } Open.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        status && styles.cardMine,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.title}>Château de Puycharnaud retreat</Text>
        <ChevronRight size={20} color={GOLD} strokeWidth={1.6} />
      </View>
      <Text style={styles.subtitle}>Book your stay</Text>
      <Text style={styles.include}>· {retreat.days} days in France</Text>
      <Text style={styles.include}>· A small group of members</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.price}>{retreatPriceRange(retreat)}</Text>
        <Text style={styles.details}>{tag}</Text>
      </View>
    </Pressable>
  );
};

type Props = {
  membership: Membership;
  // The retreat card under the package (on the marketplace).
  withRetreat?: boolean;
};

/**
 * The Sensitisation Package active membership asks for, and on the marketplace the retreat, by
 * application. Each card opens its own screen.
 */
const PackageOffers = ({ membership, withRetreat = false }: Props) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Any order counts: the old retreat package held the stone and triptych too.
  const bought = Boolean(membership.stone.order);

  return (
    <View style={styles.list}>
      {(membership.packages ?? []).map(pkg => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          bought={bought}
          onPress={() =>
            navigation.navigate(SCREENS.packageDetail, { id: pkg.id })
          }
        />
      ))}
      {withRetreat && membership.retreat ? (
        <RetreatCard
          retreat={membership.retreat}
          onPress={() => navigation.navigate(SCREENS.retreatDetail)}
        />
      ) : null}
    </View>
  );
};

export default PackageOffers;

const styles = StyleSheet.create({
  list: { gap: hp(14) },
  pressed: { opacity: 0.8 },
  card: {
    padding: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 18,
    backgroundColor: 'rgba(4, 10, 7, 0.6)',
  },
  cardMine: { borderColor: GOLD },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(19),
  },
  subtitle: {
    marginBottom: 2,
    color: GOLD,
    fontSize: font(13),
  },
  include: {
    marginTop: 4,
    color: MUTED,
    fontSize: font(13),
    lineHeight: font(19),
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: hp(10),
  },
  price: { color: GOLD, fontFamily: 'serif', fontSize: font(22) },
  priceNote: { color: MUTED, fontFamily: undefined, fontSize: font(12) },
  details: { color: GOLD, fontSize: font(13), fontWeight: '600' },
  boughtTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boughtText: { color: GOLD, fontSize: font(13), fontWeight: '600' },
});
