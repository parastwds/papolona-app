import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import AppBottomModal from '@/components/AppBottomModal';
import { ApiRequestError, getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useWallet } from '@/services/queries';
import {
  formatPennies,
  sendDirectMessage,
  sendMessageRequest,
  type DmThread,
  type DmUser,
} from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

/**
 * The conversation a refused request points to, one already open or waiting
 * between the two, and whether they are already talking.
 */
const existingThreadOf = (err: unknown) => {
  if (!(err instanceof ApiRequestError) || err.status !== 409) return null;
  const details = err.details as { threadId?: unknown } | undefined;
  return typeof details?.threadId === 'string'
    ? { id: details.threadId, connected: err.code === 'ALREADY_CONNECTED' }
    : null;
};

/**
 * A message request to a member: a first message, which they accept (then you
 * can talk) or decline. With `initialText`, the message starts written (about
 * a listing, say). When the two already have a conversation, `onExisting`
 * opens it instead.
 */
const MessageRequestSheet = ({
  member,
  onClose,
  onSent,
  initialText = '',
  onExisting,
}: {
  member: DmUser | null;
  onClose: () => void;
  onSent: (thread: DmThread) => void;
  initialText?: string;
  onExisting?: (threadId: string) => void;
}) => {
  const queryClient = useQueryClient();
  // A message request is paid in pennies.
  const requestPrice = useWallet().data?.prices.messageRequest;
  const [text, setText] = useState(initialText);
  // Each time the sheet opens, it starts from the suggested message.
  const open = member !== null;
  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canSend = !busy && text.trim().length > 0;

  const close = () => {
    setText('');
    setError('');
    onClose();
  };

  const send = async () => {
    if (!member || !canSend) return;
    setBusy(true);
    setError('');
    try {
      const thread = await sendMessageRequest(member.id, text.trim());
      queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.memberProfile(member.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.penniesAll });
      setText('');
      onSent(thread);
    } catch (err) {
      const existing = existingThreadOf(err);
      if (existing && onExisting) {
        try {
          // Already talking: the message goes into that conversation. Otherwise a
          // request is waiting either way, and the conversation shows it.
          if (existing.connected) await sendDirectMessage(existing.id, text.trim());
          queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });
          setText('');
          onExisting(existing.id);
        } catch (sendErr) {
          setError(getErrorMessage(sendErr, 'Could not send your message. Please try again.'));
        }
        return;
      }
      setError(getErrorMessage(err, 'Could not send your request. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppBottomModal visible={member !== null} onClose={close} background={SHEET_ARTWORK}>
      <Text accessibilityRole="header" style={styles.title}>
        Message {member?.name}
      </Text>
      <Text style={styles.body}>
        Your first message is sent as a request. Once {member?.name} accepts it,
        you can talk freely.
        {requestPrice ? ` A request costs ${formatPennies(requestPrice)}; the messages after it are free.` : ''}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        maxLength={2000}
        textAlignVertical="top"
        placeholder="Say hello…"
        placeholderTextColor="rgba(205, 214, 198, 0.42)"
        accessibilityLabel="Your first message"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend, busy }}
          disabled={!canSend}
          onPress={send}
          style={({ pressed }) => [styles.primary, !canSend && styles.disabled, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator color="#172016" />
          ) : (
            <Text style={styles.primaryText}>Send request</Text>
          )}
        </Pressable>
      </View>
    </AppBottomModal>
  );
};

export default MessageRequestSheet;

const styles = StyleSheet.create({
  title: { color: '#F1EEE0', fontFamily: 'serif', fontSize: font(22) },
  body: { marginTop: hp(8), color: '#B4B8AB', fontSize: font(14), lineHeight: font(21) },
  input: {
    minHeight: hp(110),
    marginTop: hp(14),
    paddingHorizontal: wp(12),
    paddingVertical: hp(10),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.45)',
    color: '#F1EEE0',
    fontSize: font(15),
    lineHeight: font(21),
  },
  error: { marginTop: hp(8), color: '#E2A09A', fontSize: font(13) },
  actions: { flexDirection: 'row', gap: wp(12), marginTop: hp(16) },
  primary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#D9C77E',
  },
  primaryText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  secondary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  secondaryText: { color: '#E8D58A', fontSize: font(15), fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
