import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import TabBackground from '@/components/TabBackground';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMembership } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  applyForRetreat,
  formatPrice,
  type Membership,
  type RetreatInfo,
} from '@/services/session';
import ScreenHeader, { GOLD } from '@/features/artwork/component/ScreenHeader';
import { font, hp, wp } from '@/utils/responsive';
import { CHATEAU_PUYCHARNAUD, PACKAGE_PICTURE_RATIO } from '../packageArt';

type Props = NativeStackScreenProps<RootStackParamList, 'RetreatDetail'>;

const GUTTER = wp(20);
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const MIN_MOTIVATION = 20;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** "€600 – €1,500". */
export const retreatPriceRange = (r: RetreatInfo) =>
  `${formatPrice({
    amountCents: r.priceFromCents,
    currency: r.currency,
  })} – ${formatPrice({ amountCents: r.priceToCents, currency: r.currency })}`;

const STATUS_TEXT = {
  pending: 'We read every application and will write to you.',
  accepted: 'You have a place. We will write to you with the dates.',
  declined:
    'There is no place for you this year. You can apply again next year.',
};

/** Applying, or where the application stands. */
const Application = ({
  membership,
  retreat,
}: {
  membership: Membership;
  retreat: RetreatInfo;
}) => {
  const queryClient = useQueryClient();
  const [motivation, setMotivation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (retreat.application) {
    const { status, createdAt } = retreat.application;
    return (
      <View style={styles.applied}>
        <Check size={18} color={GOLD} strokeWidth={2.2} />
        <View style={styles.flex}>
          <Text style={styles.appliedTitle}>
            {status === 'accepted'
              ? 'Application accepted'
              : status === 'declined'
              ? 'Application not accepted'
              : `Applied ${formatDate(createdAt)}`}
          </Text>
          <Text style={styles.text}>{STATUS_TEXT[status]}</Text>
        </View>
      </View>
    );
  }

  if (!membership.isMember) {
    return (
      <Text style={[styles.text, styles.section]}>
        {membership.canJoin
          ? 'Join the collective (free) to apply.'
          : 'Members can apply once their apprenticeship is complete.'}
      </Text>
    );
  }

  const apply = async () => {
    if (busy) return;
    if (motivation.trim().length < MIN_MOTIVATION) {
      setMessage('Tell us a little more: a sentence or two.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const updated = await applyForRetreat(motivation.trim());
      queryClient.setQueryData(queryKeys.membership, updated);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not apply. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Apply</Text>
      <Text style={styles.text}>
        Why would you like to come? Nothing is charged now; if you are offered a
        place we write to you with the dates and price.
      </Text>
      <TextInput
        accessibilityLabel="Why you would like to come"
        placeholder="A few words on why you would like to come"
        placeholderTextColor="#7F8678"
        value={motivation}
        onChangeText={setMotivation}
        multiline
        maxLength={2000}
        textAlignVertical="top"
        style={styles.input}
      />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <AppButton
        title="Send application"
        onPress={apply}
        disabled={busy}
        loading={busy}
        variant="primary"
        style={styles.button}
        textStyle={styles.buttonText}
      />
    </View>
  );
};

/**
 * The Château de Puycharnaud retreat: a few days in France, a few places once a year, by application.
 * Its price range is shown; applying costs nothing.
 */
const RetreatDetail = ({ navigation }: Props) => {
  const membership = useMembership();
  const retreat = membership.data?.retreat;

  const renderBody = () => {
    if (membership.isPending) {
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    }
    if (membership.isError || !retreat) {
      return (
        <Text style={[styles.text, styles.padded]}>
          {membership.isError
            ? getErrorMessage(membership.error, 'Could not load the retreat.')
            : 'The retreat is not open for applications.'}
        </Text>
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.picture}>
          <Image
            source={CHATEAU_PUYCHARNAUD}
            contentFit="cover"
            // From the top: the bottom of the photo, with its watermark, is cropped off.
            contentPosition="top"
            accessibilityLabel="Château de Puycharnaud"
            style={styles.fill}
          />
        </View>
        <Text style={styles.subtitle}>
          {retreat.days} days at Château de Puycharnaud, France
        </Text>
        <Text style={styles.text}>
          A retreat to deepen your practice of the Papolona Method with a small
          group of members. Places are few and it is held once a year, so entry
          is by application.
        </Text>

        <View style={styles.facts}>
          <View style={styles.row}>
            <Text style={styles.label}>Length</Text>
            <Text style={styles.value}>{retreat.days} days</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Places</Text>
            <Text style={styles.value}>Limited, once a year</Text>
          </View>
          <View style={[styles.row, styles.total]}>
            <Text style={styles.label}>Price</Text>
            <Text style={styles.price}>{retreatPriceRange(retreat)}</Text>
          </View>
        </View>

        <Application membership={membership.data} retreat={retreat} />
      </ScrollView>
    );
  };

  return (
    <TabBackground deep>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader title="The retreat" onBack={() => navigation.goBack()} />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default RetreatDetail;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
  padded: { paddingHorizontal: GUTTER },
  fill: { width: '100%', height: '100%' },
  content: {
    paddingTop: hp(16),
    paddingHorizontal: GUTTER,
    paddingBottom: hp(40),
  },
  picture: {
    width: '100%',
    aspectRatio: PACKAGE_PICTURE_RATIO,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000',
  },
  subtitle: {
    marginTop: hp(16),
    marginBottom: hp(6),
    color: GOLD,
    fontFamily: 'serif',
    fontSize: font(18),
  },
  text: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  facts: { marginTop: hp(20) },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: hp(8),
  },
  total: {
    paddingTop: hp(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  label: { color: MUTED, fontSize: font(14) },
  value: { color: CREAM, fontSize: font(14) },
  price: { color: GOLD, fontSize: font(17), fontWeight: '600' },
  section: { marginTop: hp(28) },
  heading: {
    marginBottom: hp(6),
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  input: {
    minHeight: 120,
    marginTop: hp(14),
    padding: 14,
    color: CREAM,
    fontSize: font(15),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.32)',
    borderRadius: 12,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  error: { marginTop: hp(8), color: '#F0A29A', fontSize: font(13) },
  button: { marginTop: hp(14), backgroundColor: '#D9C77E' },
  buttonText: { color: '#172016' },
  applied: {
    flexDirection: 'row',
    gap: 10,
    marginTop: hp(28),
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.4)',
    borderRadius: 14,
  },
  appliedTitle: {
    marginBottom: 2,
    color: CREAM,
    fontSize: font(15),
    fontWeight: '600',
  },
});
