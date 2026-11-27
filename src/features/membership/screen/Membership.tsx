import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Grid3x3,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { RootStackParamList } from '@/navigation/types';
import { BOTTOMTABSCREN, SCREENS } from '@/constants/screens';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useMembership } from '@/services/queries';
import {
  membershipPrice,
  type Membership as MembershipData,
} from '@/services/session';
import { activeSummary } from '@/features/collect/component/ActiveBanner';
import { ApprenticeshipBars } from '@/features/home/component/MembershipProgress';
import { probationNext, probationRule } from '@/features/home/probation';
import MembershipPicker from '../component/MembershipPicker';
import MembershipTerms from '../component/MembershipTerms';

type Props = NativeStackScreenProps<RootStackParamList, 'Membership'>;

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

// What every membership includes, a line each.
const INCLUDED: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Grid3x3, title: 'Reading series', text: '1 to 24 readings' },
  {
    Icon: Sparkles,
    title: 'Butterfly emblems',
    text: 'From a Triple (3) up',
  },
  { Icon: ShieldCheck, title: 'NFT conversion', text: 'From $90' },
  { Icon: Store, title: 'Marketplace', text: 'Sell as an active member' },
  { Icon: Globe, title: 'Collective artwork', text: 'Your NFTs on show' },
  { Icon: NotebookPen, title: 'Your journal', text: 'Every day, as before' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** A section's name. */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {title}
    </Text>
    {children}
  </View>
);

/** What every membership includes, two to a row. */
const IncludedGrid = () => (
  <View style={styles.grid}>
    {INCLUDED.map(({ Icon, title, text }) => (
      <View
        key={title}
        accessible
        accessibilityLabel={`${title}: ${text}`}
        style={styles.cell}
      >
        <View style={styles.cellIcon}>
          <Icon size={16} color={COLORS.gold} strokeWidth={1.7} />
        </View>
        <Text style={styles.cellTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cellText} numberOfLines={1}>
          {text}
        </Text>
      </View>
    ))}
  </View>
);

/** One step towards staying active: done or not, in a line, with its action. */
const Step = ({
  Icon,
  done,
  title,
  text,
  onPress,
}: {
  Icon: LucideIcon;
  done: boolean;
  title: string;
  text: string;
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={`${title}: ${done ? 'done' : 'to do'}. ${text}`}
    disabled={!onPress}
    onPress={onPress}
    style={({ pressed }) => [styles.step, pressed && styles.pressed]}
  >
    <View style={[styles.stepIcon, done && styles.stepDone]}>
      {done ? (
        <Check size={15} color={COLORS.onGold} strokeWidth={2.6} />
      ) : (
        <Icon size={15} color={COLORS.gold} strokeWidth={1.8} />
      )}
    </View>
    <View style={styles.flex}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepText} numberOfLines={2}>
        {text}
      </Text>
    </View>
    {onPress ? (
      <ChevronRight size={18} color={COLORS.gold} strokeWidth={1.6} />
    ) : null}
  </Pressable>
);

/**
 * After the apprenticeship. Before joining: the three memberships to choose from (the questionnaire
 * suggests one). As a member: their membership (changed in a sheet) and what keeps them active. The
 * Sensitisation Package is not shown here: it is in Purchases once bought, on the marketplace until then.
 */
const Membership = ({ navigation }: Props) => {
  const queryClient = useQueryClient();
  const membership = useMembership();
  const [changing, setChanging] = useState(false);

  // Joined or changed: the profile, probation card and Gallery read it too
  // (['users', 'me'] covers the probation query).
  const saved = (updated: MembershipData) => {
    queryClient.setQueryData(queryKeys.membership, updated);
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    setChanging(false);
  };
  const openBilling = () => {
    setChanging(false);
    navigation.navigate(SCREENS.billingInfo);
  };

  const data = membership.data;
  const isMember = Boolean(data?.isMember);

  const renderHero = (title: string, text?: string) => (
    <View style={styles.hero}>
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {title}
      </Text>
      {text ? <Text style={styles.heroText}>{text}</Text> : null}
    </View>
  );

  const renderMember = (d: MembershipData) => {
    const active = d.active;
    const summary = active ? activeSummary(active) : null;
    const converting = Boolean(
      active?.activeUntil && new Date(active.activeUntil) > new Date(),
    );
    const type = d.membershipTypes?.find(t => t.id === d.membershipType);
    const status = active?.isActive ? 'Active' : '';

    return (
      <>
        {renderHero(
          type
            ? `${status ? `${status} ` : ''}${type.title} member`
            : active?.isActive
            ? 'You’re an active member'
            : 'You’re a member',
          d.demotedFrom
            ? `Your ${
                d.membershipTypes?.find(t => t.id === d.demotedFrom)?.title ??
                d.demotedFrom
              } membership has ended: its terms were not met in the last period. You are an Explorer again, and can review your membership at any time.`
            : d.memberSince
            ? `Member since ${formatDate(d.memberSince)}`
            : undefined,
        )}

        <Section title="Your membership">
          {type ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${type.title}, ${membershipPrice(
                type,
              )}. Change your membership.`}
              onPress={() => setChanging(true)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardIcon}>
                <BadgeCheck size={20} color={COLORS.gold} strokeWidth={1.6} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{type.title}</Text>
                <Text style={styles.cardText} numberOfLines={1}>
                  {type.tagline} · {membershipPrice(type)}
                </Text>
              </View>
              <Text style={styles.link}>Change</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setChanging(true)}
              style={({ pressed }) => [
                styles.card,
                styles.cardAsk,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Choose your membership</Text>
                <Text style={styles.cardText}>
                  Explorer, Creator or Collector
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.gold} strokeWidth={1.6} />
            </Pressable>
          )}
        </Section>

        {d.standing?.required ? (
          <Section title="Your terms">
            <MembershipTerms membership={d} onUpdated={saved} />
          </Section>
        ) : null}

        {active && summary ? (
          <Section title="Stay active">
            <Text style={[styles.summary, summary.warn && styles.warn]}>
              {summary.title}
            </Text>
            <View style={styles.steps}>
              <Step
                Icon={ShieldCheck}
                done={converting}
                title="An NFT conversion"
                text={
                  converting
                    ? `Done. Convert another by ${formatDate(
                        active.activeUntil!,
                      )}.`
                    : `At least one every ${active.windowDays} days, from your Gallery.`
                }
                onPress={
                  converting
                    ? undefined
                    : () =>
                        navigation.navigate(SCREENS.mainTabs, {
                          screen: BOTTOMTABSCREN.collect,
                        } as never)
                }
              />
            </View>
          </Section>
        ) : null}

        <Section title="Included">
          <IncludedGrid />
        </Section>
      </>
    );
  };

  const renderJoin = (d: MembershipData) => (
    <>
      {renderHero(
        'Your apprenticeship is complete',
        'Choose the membership that best represents your role in Papolona. Your answers at sign-up suggest one; any is fine.',
      )}
      <MembershipPicker
        membership={d}
        mode="join"
        onDone={saved}
        onEditBilling={openBilling}
      />
      <Section title="Every membership includes">
        <IncludedGrid />
      </Section>
      <Text style={styles.footnote}>
        Then receive the Sensitisation Package and convert an emblem into an NFT
        every 60 days to stay an active member.
      </Text>
    </>
  );

  const renderApprentice = (d: MembershipData) => {
    const p = d.probation;
    return (
      <>
        {renderHero(
          'Membership opens after your apprenticeship',
          `${probationNext(p)} Then choose Explorer, Creator or Collector.`,
        )}
        <ApprenticeshipBars data={p} />
        <Text style={styles.trackText}>
          The apprenticeship asks for {probationRule(p)}.
        </Text>
        <Section title="Every membership includes">
          <IncludedGrid />
        </Section>
      </>
    );
  };

  const renderBody = () => {
    if (membership.isPending) {
      return <ActivityIndicator color={COLORS.gold} style={styles.center} />;
    }
    if (membership.isError || !data) {
      return (
        <View style={styles.center}>
          <Text style={styles.error}>
            {getErrorMessage(membership.error, 'Could not load membership.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => membership.refetch()}
            style={styles.secondaryButton}
          >
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    if (data.isMember) return renderMember(data);
    if (data.canJoin) return renderJoin(data);
    return renderApprentice(data);
  };

  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.back}
          >
            <ChevronLeft size={18} color={COLORS.gold} strokeWidth={1.8} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>
              {isMember ? 'THE COLLECTIVE' : 'AFTER APPRENTICESHIP'}
            </Text>
            <Text style={styles.headerTitle}>Membership</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderBody()}
        </ScrollView>
      </SafeAreaView>

      {data?.isMember ? (
        <AppBottomModal
          visible={changing}
          onClose={() => setChanging(false)}
          background={SHEET_ARTWORK}
        >
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {data.membershipType
              ? 'Change your membership'
              : 'Choose your membership'}
          </Text>
          <Text style={styles.sheetText}>
            Switch at any time. Each switch to a paid membership is charged
            again.
          </Text>
          <MembershipPicker
            membership={data}
            mode="change"
            onDone={saved}
            onEditBilling={openBilling}
          />
        </AppBottomModal>
      ) : null}
    </ImageBackground>
  );
};

export default Membership;

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  goldSolid: '#D9C77E',
  onGold: '#172016',
  cream: '#F1EEE0',
  muted: 'rgba(220, 224, 214, 0.72)',
  faint: 'rgba(220, 224, 214, 0.5)',
  hairline: 'rgba(161, 190, 148, 0.2)',
  red: '#E2A09A',
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.bottomBg },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 5, 2, 0.66)',
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  center: { marginTop: hp(40), alignItems: 'center', gap: hp(12) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingHorizontal: '5%',
    paddingTop: hp(8),
    paddingBottom: hp(8),
  },
  back: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.55)',
    borderRadius: 19,
    backgroundColor: 'rgba(217, 199, 126, 0.1)',
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: font(10),
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  headerTitle: {
    marginTop: 2,
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(24),
  },
  content: { paddingHorizontal: '5%', paddingBottom: hp(32) },
  hero: { marginTop: hp(12), marginBottom: hp(20) },
  heroTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(28),
    lineHeight: font(34),
  },
  heroText: {
    marginTop: hp(8),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(21),
  },
  section: { marginTop: hp(26) },
  sectionTitle: {
    marginBottom: hp(10),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(19),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingVertical: hp(14),
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.4)',
    borderRadius: 16,
    backgroundColor: 'rgba(8, 14, 10, 0.7)',
  },
  cardAsk: { borderColor: COLORS.gold },
  cardIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(217, 199, 126, 0.12)',
  },
  cardTitle: { color: COLORS.cream, fontSize: font(16), fontWeight: '600' },
  cardText: { marginTop: 2, color: COLORS.muted, fontSize: font(13) },
  link: { color: COLORS.gold, fontSize: font(14), fontWeight: '600' },
  summary: {
    marginBottom: hp(10),
    color: COLORS.muted,
    fontSize: font(14),
  },
  warn: { color: COLORS.red },
  steps: {
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 16,
    backgroundColor: 'rgba(8, 14, 10, 0.55)',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingVertical: hp(14),
  },
  stepIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(217, 199, 126, 0.12)',
  },
  stepDone: { backgroundColor: COLORS.goldSolid },
  stepTitle: { color: COLORS.cream, fontSize: font(15), fontWeight: '600' },
  stepText: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: font(13),
    lineHeight: font(18),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(10) },
  cell: {
    // Two to a row, the gap between them.
    width: '48%',
    flexGrow: 1,
    paddingVertical: hp(12),
    paddingHorizontal: wp(12),
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 14, 10, 0.55)',
  },
  cellIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(8),
    borderRadius: 15,
    backgroundColor: 'rgba(217, 199, 126, 0.12)',
  },
  cellTitle: { color: COLORS.cream, fontSize: font(14), fontWeight: '600' },
  cellText: { marginTop: 2, color: COLORS.muted, fontSize: font(12) },
  trackText: { marginTop: hp(8), color: COLORS.muted, fontSize: font(13) },
  footnote: {
    marginTop: hp(18),
    color: COLORS.faint,
    fontSize: font(12),
    lineHeight: 17,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: hp(8),
    paddingHorizontal: wp(18),
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.55)',
    borderRadius: 18,
  },
  error: { color: COLORS.red, fontSize: font(13), textAlign: 'center' },
  sheetTitle: { color: COLORS.cream, fontFamily: 'serif', fontSize: font(22) },
  sheetText: {
    marginTop: hp(6),
    marginBottom: hp(14),
    color: COLORS.muted,
    fontSize: font(13),
    lineHeight: font(19),
  },
});
