import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQueryClient } from '@tanstack/react-query';
import { Ban, Search } from 'lucide-react-native';

import CustomHeader from '@/components/CustomHeader';
import TabBackground from '@/components/TabBackground';
import { BOTTOMTABSCREN, SCREENS } from '@/constants/screens';
import type { RootStackParamList, RootTabParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useDmInbox } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { answerMessageRequest, blockMember, type DmThread } from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';
import MemberAvatar from '../component/MemberAvatar';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const GOLD = '#E8D58A';
const HAIRLINE = 'rgba(161, 190, 148, 0.2)';

/** "now", "5m", "3h", "Mon", "12 Nov". */
export const shortTime = (iso: string) => {
  const at = new Date(iso);
  const minutes = Math.floor((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 24 * 6) return at.toLocaleDateString([], { weekday: 'short' });
  return at.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const preview = (t: DmThread) =>
  t.lastMessage ? `${t.lastMessage.mine ? 'You: ' : ''}${t.lastMessage.text}` : '';

/**
 * Messages: requests from other members (accept, decline or block), the
 * conversations you are in, and the requests you sent that wait for a reply.
 * Members are found with the search in Discover.
 */
const MessagesTab = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const inbox = useDmInbox();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const open = (t: DmThread) =>
    navigation.navigate(SCREENS.conversation, { threadId: t.id, name: t.other.name });

  const act = async (t: DmThread, action: 'accept' | 'decline' | 'block') => {
    setBusy(`${t.id}:${action}`);
    setError('');
    try {
      if (action === 'block') await blockMember(t.other.id);
      else await answerMessageRequest(t.id, action === 'accept');
      await queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });
      if (action === 'accept') open(t);
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await inbox.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderRow = (t: DmThread, extra?: React.ReactNode) => (
    <Pressable
      key={t.id}
      accessibilityRole="button"
      accessibilityLabel={`${t.other.name}. ${preview(t)}${t.unread ? `, ${t.unread} unread` : ''}`}
      onPress={() => open(t)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <MemberAvatar name={t.other.name} avatarUrl={t.other.avatarUrl} />
      <View style={styles.flex}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, t.unread > 0 && styles.nameUnread]} numberOfLines={1}>
            {t.other.name}
          </Text>
          <Text style={styles.time}>{shortTime(t.lastActivityAt)}</Text>
        </View>
        <View style={styles.rowTop}>
          <Text
            style={[styles.preview, t.unread > 0 && styles.previewUnread]}
            numberOfLines={extra ? 2 : 1}
          >
            {t.blocked === 'by_me'
              ? 'Blocked'
              : t.state === 'requested'
              ? 'Request sent · waiting for a reply'
              : preview(t)}
          </Text>
          {t.unread > 0 && t.state === 'connected' ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.unread}</Text>
            </View>
          ) : null}
        </View>
        {extra}
      </View>
    </Pressable>
  );

  const renderRequestActions = (t: DmThread) => (
    <View style={styles.requestActions}>
      {(['accept', 'decline', 'block'] as const).map(action => {
        const loading = busy === `${t.id}:${action}`;
        return (
          <Pressable
            key={action}
            accessibilityRole="button"
            accessibilityLabel={`${action[0].toUpperCase()}${action.slice(1)} ${t.other.name}`}
            disabled={busy !== null}
            onPress={() => act(t, action)}
            style={({ pressed }) => [
              styles.chip,
              action === 'accept' && styles.chipPrimary,
              pressed && styles.pressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={action === 'accept' ? '#172016' : GOLD} />
            ) : (
              <Text style={[styles.chipText, action === 'accept' && styles.chipTextPrimary]}>
                {action === 'accept' ? 'Accept' : action === 'decline' ? 'Decline' : 'Block'}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const renderBody = () => {
    if (inbox.isPending) return <ActivityIndicator color={GOLD} style={styles.loading} />;
    if (inbox.isError) {
      return <Text style={styles.muted}>{getErrorMessage(inbox.error, 'Could not load your messages.')}</Text>;
    }
    const { conversations, requests, sent } = inbox.data;
    if (!conversations.length && !requests.length && !sent.length) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.muted}>
            Find a member with the search in Discover, open their profile and send
            them a message request.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(BOTTOMTABSCREN.discover)}
            style={({ pressed }) => [styles.findButton, pressed && styles.pressed]}
          >
            <Search size={16} color="#172016" strokeWidth={2} />
            <Text style={styles.findText}>Find members</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <>
        {requests.length ? (
          <>
            <Text accessibilityRole="header" style={styles.section}>
              Requests <Text style={styles.count}>{requests.length}</Text>
            </Text>
            <View style={styles.list}>{requests.map(t => renderRow(t, renderRequestActions(t)))}</View>
          </>
        ) : null}
        <Text accessibilityRole="header" style={styles.section}>
          Conversations
        </Text>
        {conversations.length ? (
          <View style={styles.list}>{conversations.map(t => renderRow(t))}</View>
        ) : (
          <Text style={styles.muted}>Once a member accepts your request, you can talk here.</Text>
        )}
        {sent.length ? (
          <>
            <Text accessibilityRole="header" style={styles.section}>
              Sent requests
            </Text>
            <View style={styles.list}>{sent.map(t => renderRow(t))}</View>
          </>
        ) : null}
      </>
    );
  };

  return (
    <TabBackground deep>
      <CustomHeader
        title="Messages"
        txtStyle={styles.headerTitle}
        rightIcon={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Blocked members"
            onPress={() => navigation.navigate(SCREENS.blockedMembers)}
            hitSlop={10}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ban size={20} color={CREAM} strokeWidth={1.7} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={GOLD} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {renderBody()}
      </ScrollView>
    </TabBackground>
  );
};

export default MessagesTab;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(25) },
  headerButton: { padding: 6 },
  content: { paddingHorizontal: wp(20), paddingTop: hp(8), paddingBottom: hp(140) },
  loading: { marginTop: hp(40) },
  section: {
    marginTop: hp(22),
    marginBottom: hp(6),
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  count: { color: GOLD, fontSize: font(16) },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: HAIRLINE },
  row: {
    flexDirection: 'row',
    gap: wp(12),
    paddingVertical: hp(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: wp(8) },
  name: { flex: 1, color: CREAM, fontSize: font(16) },
  nameUnread: { fontWeight: '700' },
  time: { color: MUTED, fontSize: font(12) },
  preview: { flex: 1, marginTop: 2, color: MUTED, fontSize: font(14), lineHeight: font(19) },
  previewUnread: { color: CREAM },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#D9C77E',
  },
  badgeText: { color: '#172016', fontSize: font(11), fontWeight: '700' },
  requestActions: { flexDirection: 'row', gap: wp(8), marginTop: hp(10) },
  chip: {
    minHeight: 34,
    minWidth: wp(72),
    paddingHorizontal: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  chipPrimary: { backgroundColor: '#D9C77E', borderColor: '#D9C77E' },
  chipText: { color: GOLD, fontSize: font(13), fontWeight: '600' },
  chipTextPrimary: { color: '#172016' },
  muted: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  error: { marginTop: hp(8), color: '#E2A09A', fontSize: font(13) },
  empty: { marginTop: hp(40), alignItems: 'center', gap: hp(10), paddingHorizontal: wp(12) },
  emptyTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(22) },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: hp(8),
    paddingHorizontal: wp(18),
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#D9C77E',
  },
  findText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
