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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVertical, Lock, MessageCircle } from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import type { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMemberProfile } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  blockMember,
  requestProfileAccess,
  unblockMember,
  type MemberProfile as Profile,
} from '@/services/session';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import { rarityOf } from '@/features/series/artworks';
import EmblemTile, { useEmblemTileWidth } from '@/features/series/component/EmblemTile';
import MemberAvatar from '@/features/messages/component/MemberAvatar';
import MessageRequestSheet from '@/features/messages/component/MessageRequestSheet';
import { CLUE_FONT } from '@/theme/fonts';
import { font, hp, wp } from '@/utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberProfile'>;

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const GOLD = '#E8D58A';
const HAIRLINE = 'rgba(161, 190, 148, 0.2)';

const joined = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'long', year: 'numeric' });

/**
 * A member's profile, opened from search in Discover: who they are and how
 * many readings and NFTs they have. Their readings and NFTs stay locked until
 * they approve your request to see them. From here you message them (a
 * request, or the conversation once accepted) and block or unblock them.
 */
const MemberProfile = ({ navigation, route }: Props) => {
  const { userId, name } = route.params;
  const queryClient = useQueryClient();
  const query = useMemberProfile(userId);
  const tileWidth = useEmblemTileWidth();
  const [composing, setComposing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.memberProfile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });
  };

  const run = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await task();
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const message = (p: Profile) => {
    if (p.dm.threadId) {
      navigation.navigate(SCREENS.conversation, { threadId: p.dm.threadId, name: p.member.name });
    } else {
      setComposing(true);
    }
  };

  const renderLocked = (p: Profile) => {
    const label =
      p.access === 'pending'
        ? 'Request sent'
        : p.access === 'denied'
        ? 'Ask again'
        : 'Request access';
    return (
      <View style={styles.locked}>
        <View style={styles.lockDisc}>
          <Lock size={22} color={GOLD} strokeWidth={1.7} />
        </View>
        <Text style={styles.lockedTitle}>Readings and NFTs are private</Text>
        <Text style={styles.lockedText}>
          {p.access === 'pending'
            ? `${p.member.name} has your request. You’ll see their readings and NFTs once they approve it.`
            : p.access === 'denied'
            ? `${p.member.name} didn’t share them this time. You can ask again.`
            : `Ask ${p.member.name} to share their ${p.stats.readings} ${
                p.stats.readings === 1 ? 'reading' : 'readings'
              } and ${p.stats.nfts} ${p.stats.nfts === 1 ? 'NFT' : 'NFTs'} with you.`}
        </Text>
        {p.blocked ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: p.access === 'pending', busy: busy === 'access' }}
            disabled={p.access === 'pending' || busy !== null}
            onPress={() => run('access', () => requestProfileAccess(userId))}
            style={({ pressed }) => [
              styles.secondary,
              styles.lockButton,
              p.access === 'pending' && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {busy === 'access' ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              <Text style={styles.secondaryText}>{label}</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  const renderOpen = (p: Profile) => (
    <>
      <Text accessibilityRole="header" style={styles.subheading}>
        NFTs
      </Text>
      {p.nfts?.length ? (
        <View style={styles.grid}>
          {p.nfts.map(s => (
            <EmblemTile
              key={s.id}
              artworkKey={s.artworkKey}
              rarity={s.rarity}
              length={s.length}
              width={tileWidth}
              plain
              accessibilityLabel={`${rarityOf(s.rarity).label} NFT, ${s.length} readings`}
              onPress={() => navigation.navigate(SCREENS.wallTile, { id: s.id })}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>No NFTs yet.</Text>
      )}
      <Text accessibilityRole="header" style={styles.subheading}>
        Readings
      </Text>
      {p.readings?.length ? (
        <View style={styles.readings}>
          {p.readings.map(r => (
            <View key={r.id} style={styles.reading}>
              <View style={styles.readingTop}>
                <Text style={styles.readingClue}>{r.clue}</Text>
                <View style={[styles.pill, !r.coherent && styles.pillFail]}>
                  <Text style={[styles.pillText, !r.coherent && styles.pillTextFail]}>
                    {r.coherent ? 'Coherent' : 'Not coherent'}
                  </Text>
                </View>
              </View>
              {r.question ? <Text style={styles.readingQuestion}>{r.question}</Text> : null}
              {r.interpretation ? (
                <Text style={styles.readingText} numberOfLines={4}>
                  {r.interpretation}
                </Text>
              ) : null}
              <Text style={styles.readingDate}>
                {new Date(r.generatedAt).toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>No readings yet.</Text>
      )}
    </>
  );

  const renderBody = () => {
    if (query.isPending) return <ActivityIndicator color={GOLD} style={styles.loading} />;
    if (query.isError) {
      return <Text style={styles.message}>{getErrorMessage(query.error, 'Could not open this profile.')}</Text>;
    }
    const p = query.data;
    const self = p.access === 'self';
    const open = self || p.access === 'approved';
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <MemberAvatar name={p.member.name} avatarUrl={p.member.avatarUrl} size={84} />
          <Text style={styles.name}>{p.member.name}</Text>
          <Text style={styles.role}>
            {p.member.role}
            {p.member.country ? ` · ${p.member.country}` : ''}
          </Text>
          {p.member.bio ? <Text style={styles.bio}>{p.member.bio}</Text> : null}
        </View>

        <View style={styles.stats}>
          {[
            [p.stats.readings, p.stats.readings === 1 ? 'reading' : 'readings'],
            [p.stats.emblems, p.stats.emblems === 1 ? 'emblem set' : 'emblem sets'],
            [p.stats.nfts, p.stats.nfts === 1 ? 'NFT' : 'NFTs'],
          ].map(([n, label]) => (
            <View key={String(label)} style={styles.stat}>
              <Text style={styles.statValue}>{n}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.joined}>Joined {joined(p.member.joinedAt)}</Text>

        {self ? null : p.blocked ? (
          <View style={styles.blockedBox}>
            <Text style={styles.muted}>You have blocked {p.member.name}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => run('unblock', () => unblockMember(userId))}
              style={({ pressed }) => [styles.secondary, styles.lockButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Unblock</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => message(p)}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <MessageCircle size={18} color="#172016" strokeWidth={2} />
            <Text style={styles.primaryText}>
              {p.dm.state === 'connected'
                ? 'Message'
                : p.dm.state === 'requested'
                ? 'Request sent · open'
                : p.dm.state === 'incoming'
                ? 'Reply to their request'
                : 'Send a message request'}
            </Text>
          </Pressable>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {open ? renderOpen(p) : renderLocked(p)}
      </ScrollView>
    );
  };

  const profile = query.data;
  return (
    <TabBackground deep blurred={menu || composing}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title={profile?.member.name ?? name ?? 'Member'}
          onBack={() => navigation.goBack()}
          right={
            profile && profile.access !== 'self' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More"
                onPress={() => setMenu(true)}
                hitSlop={10}
                style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
              >
                <EllipsisVertical size={20} color={CREAM} strokeWidth={1.8} />
              </Pressable>
            ) : null
          }
        />
        {renderBody()}
      </SafeAreaView>

      <MessageRequestSheet
        member={composing && profile ? profile.member : null}
        onClose={() => setComposing(false)}
        onSent={thread => {
          setComposing(false);
          navigation.navigate(SCREENS.conversation, { threadId: thread.id, name: thread.other.name });
        }}
      />

      <AppBottomModal visible={menu} onClose={() => setMenu(false)} background={SHEET_ARTWORK}>
        {profile ? (
          <>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {profile.member.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() =>
                run('block', async () => {
                  if (profile.blocked) await unblockMember(userId);
                  else await blockMember(userId);
                  setMenu(false);
                })
              }
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <Text style={[styles.sheetRowText, !profile.blocked && styles.danger]}>
                {profile.blocked ? `Unblock ${profile.member.name}` : `Block ${profile.member.name}`}
              </Text>
            </Pressable>
            {profile.blocked ? null : (
              <Text style={styles.sheetNote}>
                Blocking stops messages both ways, and you won’t find each other in search
                or see each other’s profiles.
              </Text>
            )}
          </>
        ) : null}
      </AppBottomModal>
    </TabBackground>
  );
};

export default MemberProfile;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: wp(20), color: MUTED, fontSize: font(14) },
  menuButton: { padding: 6 },
  content: { paddingHorizontal: wp(20), paddingTop: hp(16), paddingBottom: hp(48) },
  hero: { alignItems: 'center' },
  name: { marginTop: hp(12), color: CREAM, fontFamily: 'serif', fontSize: font(26) },
  role: { marginTop: 4, color: GOLD, fontSize: font(14), fontWeight: '600' },
  bio: { marginTop: hp(10), color: MUTED, fontSize: font(14), lineHeight: font(21), textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    marginTop: hp(18),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: hp(12) },
  statValue: { color: CREAM, fontSize: font(22), fontWeight: '600' },
  statLabel: { marginTop: 2, color: MUTED, fontSize: font(12) },
  joined: { marginTop: hp(10), color: MUTED, fontSize: font(12), textAlign: 'center' },
  primary: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    marginTop: hp(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#D9C77E',
  },
  primaryText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  secondary: {
    minHeight: 44,
    paddingHorizontal: wp(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  secondaryText: { color: GOLD, fontSize: font(15), fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  error: { marginTop: hp(10), color: '#E2A09A', fontSize: font(13), textAlign: 'center' },
  blockedBox: { marginTop: hp(18), alignItems: 'center' },
  locked: {
    marginTop: hp(24),
    alignItems: 'center',
    paddingVertical: hp(24),
    paddingHorizontal: wp(18),
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.35)',
    backgroundColor: 'rgba(2, 8, 5, 0.55)',
  },
  lockDisc: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(232, 213, 138, 0.14)',
  },
  lockedTitle: { marginTop: hp(12), color: CREAM, fontFamily: 'serif', fontSize: font(19) },
  lockedText: { marginTop: hp(6), color: MUTED, fontSize: font(14), lineHeight: font(21), textAlign: 'center' },
  lockButton: { marginTop: hp(16), alignSelf: 'center', minWidth: wp(180) },
  subheading: { marginTop: hp(26), marginBottom: hp(10), color: CREAM, fontFamily: 'serif', fontSize: font(20) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(12) },
  muted: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  readings: { gap: hp(10) },
  reading: {
    padding: wp(14),
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.3)',
    backgroundColor: 'rgba(2, 8, 5, 0.45)',
  },
  readingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readingClue: { color: GOLD, fontFamily: CLUE_FONT, fontSize: font(20), letterSpacing: 3 },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(232, 213, 138, 0.16)' },
  pillFail: { backgroundColor: 'rgba(226, 160, 154, 0.14)' },
  pillText: { color: GOLD, fontSize: font(12), fontWeight: '600' },
  pillTextFail: { color: '#E2A09A' },
  readingQuestion: { marginTop: hp(8), color: CREAM, fontFamily: 'serif', fontStyle: 'italic', fontSize: font(15) },
  readingText: { marginTop: hp(6), color: MUTED, fontSize: font(14), lineHeight: font(20) },
  readingDate: { marginTop: hp(8), color: MUTED, fontSize: font(12) },
  sheetTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(22), marginBottom: hp(8) },
  sheetRow: { minHeight: 50, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: HAIRLINE },
  sheetRowText: { color: CREAM, fontSize: font(16) },
  danger: { color: '#E2A09A' },
  sheetNote: { marginTop: hp(10), color: MUTED, fontSize: font(13), lineHeight: font(19) },
});

