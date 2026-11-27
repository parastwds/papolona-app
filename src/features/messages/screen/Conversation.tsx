import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVertical, SendHorizontal } from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import type { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useConversation } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  answerMessageRequest,
  blockMember,
  sendDirectMessage,
  unblockMember,
  type DmConversation,
  type DmMessage,
} from '@/services/session';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import { font, hp, wp } from '@/utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const GOLD = '#E8D58A';

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** "Today", "Yesterday" or "12 November". */
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long' });
};

/**
 * One conversation, newest at the bottom, refreshed every few seconds. A
 * request sent to you is answered here (accept, decline or block); a request
 * you sent waits for a reply. The menu opens the member's profile and blocks
 * or unblocks them.
 */
const Conversation = ({ navigation, route }: Props) => {
  const { threadId, name } = route.params;
  const queryClient = useQueryClient();
  const query = useConversation(threadId);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);

  const thread = query.data?.thread;
  const other = thread?.other;
  const title = other?.name ?? name ?? 'Messages';

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });

  const run = async (key: string, task: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await task();
      await refreshAll();
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy('send');
    setError('');
    try {
      const message = await sendDirectMessage(threadId, text);
      setDraft('');
      // Shown at once; the next refresh confirms it.
      queryClient.setQueryData<DmConversation>(queryKeys.dmConversation(threadId), old =>
        old ? { ...old, messages: [message, ...old.messages] } : old,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.dmInbox });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const renderMessage = ({ item, index }: { item: DmMessage; index: number }) => {
    const messages = query.data?.messages ?? [];
    // The list is upside down: the next item is the older one.
    const older = messages[index + 1];
    const newDay = !older || dayLabel(older.createdAt) !== dayLabel(item.createdAt);
    return (
      <View>
        {newDay ? <Text style={styles.day}>{dayLabel(item.createdAt)}</Text> : null}
        <View style={[styles.bubbleRow, item.mine ? styles.rowMine : styles.rowTheirs]}>
          <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.text, item.mine && styles.textMine]}>{item.text}</Text>
            <Text style={[styles.time, item.mine && styles.timeMine]}>{time(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!thread || !other) return null;
    if (thread.state === 'incoming') {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {other.name} would like to message you. Accept to reply; they won’t be
            told if you decline.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => run('decline', async () => {
                await answerMessageRequest(threadId, false);
                navigation.goBack();
              })}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Decline</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() => run('accept', () => answerMessageRequest(threadId, true))}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              {busy === 'accept' ? (
                <ActivityIndicator color="#172016" />
              ) : (
                <Text style={styles.primaryText}>Accept</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }
    if (thread.state === 'requested') {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Request sent. You can write more once {other.name} accepts.
          </Text>
        </View>
      );
    }
    if (thread.blocked === 'by_me') {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Neither of you can send messages while {other.name} is blocked.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => run('unblock', () => unblockMember(other.id))}
            style={({ pressed }) => [styles.secondary, styles.single, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Unblock</Text>
          </Pressable>
        </View>
      );
    }
    if (thread.blocked === 'by_them') {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>You can’t reply to this conversation.</Text>
        </View>
      );
    }
    const canSend = draft.trim().length > 0 && busy === null;
    return (
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
          placeholder="Message"
          placeholderTextColor="rgba(205, 214, 198, 0.42)"
          accessibilityLabel={`Message ${other.name}`}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend, busy: busy === 'send' }}
          disabled={!canSend}
          onPress={send}
          style={({ pressed }) => [styles.send, !canSend && styles.disabled, pressed && styles.pressed]}
        >
          {busy === 'send' ? (
            <ActivityIndicator size="small" color="#172016" />
          ) : (
            <SendHorizontal size={18} color="#172016" strokeWidth={2} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <TabBackground deep blurred={menu}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title={title}
          onBack={() => navigation.goBack()}
          right={
            other ? (
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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? hp(90) : 0}
        >
          {query.isPending ? (
            <ActivityIndicator color={GOLD} style={styles.loading} />
          ) : query.isError ? (
            <Text style={styles.message}>{getErrorMessage(query.error, 'Could not open this conversation.')}</Text>
          ) : (
            <FlatList
              data={query.data.messages}
              keyExtractor={m => m.id}
              renderItem={renderMessage}
              inverted
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {renderFooter()}
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AppBottomModal visible={menu} onClose={() => setMenu(false)} background={SHEET_ARTWORK}>
        {other ? (
          <>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {other.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenu(false);
                navigation.navigate(SCREENS.memberProfile, { userId: other.id, name: other.name });
              }}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <Text style={styles.sheetRowText}>View profile</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy !== null}
              onPress={() =>
                run('block', async () => {
                  if (thread?.blocked === 'by_me') await unblockMember(other.id);
                  else await blockMember(other.id);
                  setMenu(false);
                })
              }
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <Text style={[styles.sheetRowText, thread?.blocked !== 'by_me' && styles.danger]}>
                {thread?.blocked === 'by_me' ? `Unblock ${other.name}` : `Block ${other.name}`}
              </Text>
            </Pressable>
            {thread?.blocked !== 'by_me' ? (
              <Text style={styles.sheetNote}>
                Blocking stops messages both ways, and you won’t find each other in search.
              </Text>
            ) : null}
          </>
        ) : null}
      </AppBottomModal>
    </TabBackground>
  );
};

export default Conversation;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: wp(20), color: MUTED, fontSize: font(14) },
  menuButton: { padding: 6 },
  list: { paddingHorizontal: wp(16), paddingVertical: hp(12) },
  day: { alignSelf: 'center', marginVertical: hp(10), color: MUTED, fontSize: font(12) },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingVertical: hp(8), paddingHorizontal: wp(12), borderRadius: 16 },
  bubbleMine: { backgroundColor: '#D9C77E', borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: 'rgba(23, 32, 22, 0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.35)',
    borderBottomLeftRadius: 4,
  },
  text: { color: CREAM, fontSize: font(15), lineHeight: font(21) },
  textMine: { color: '#172016' },
  time: { alignSelf: 'flex-end', marginTop: 2, color: MUTED, fontSize: font(10) },
  timeMine: { color: 'rgba(23, 32, 22, 0.65)' },
  error: { paddingHorizontal: wp(20), paddingBottom: hp(6), color: '#E2A09A', fontSize: font(13) },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: wp(10),
    paddingHorizontal: wp(16),
    paddingTop: hp(8),
    paddingBottom: hp(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  input: {
    flex: 1,
    maxHeight: hp(120),
    minHeight: 42,
    paddingHorizontal: wp(14),
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.45)',
    color: CREAM,
    fontSize: font(15),
  },
  send: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#D9C77E',
  },
  notice: {
    paddingHorizontal: wp(20),
    paddingVertical: hp(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  noticeText: { color: MUTED, fontSize: font(14), lineHeight: font(21), textAlign: 'center' },
  actions: { flexDirection: 'row', gap: wp(12), marginTop: hp(12) },
  primary: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#D9C77E',
  },
  primaryText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  secondary: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  single: { flex: 0, marginTop: hp(12) },
  secondaryText: { color: GOLD, fontSize: font(15), fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  sheetTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(22), marginBottom: hp(8) },
  sheetRow: {
    minHeight: 50,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  sheetRowText: { color: CREAM, fontSize: font(16) },
  danger: { color: '#E2A09A' },
  sheetNote: { marginTop: hp(10), color: MUTED, fontSize: font(13), lineHeight: font(19) },
});
