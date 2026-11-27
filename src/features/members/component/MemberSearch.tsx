import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, Search, X } from 'lucide-react-native';

import { getErrorMessage } from '@/services/api';
import { useMemberSearch } from '@/services/queries';
import type { DmSearchUser } from '@/services/session';
import MemberAvatar from '@/features/messages/component/MemberAvatar';
import { font, hp, wp } from '@/utils/responsive';

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const STATE_TEXT: Record<DmSearchUser['state'], string> = {
  none: 'View profile',
  connected: 'You talk with them',
  requested: 'Message request sent',
  incoming: 'Sent you a message request',
};

/** Waits until typing pauses before searching. */
const useDebounced = (value: string, ms = 300) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
};

/**
 * Find members by name (two letters or more). Each result opens the member's
 * profile, where you can message them or ask to see their readings and NFTs.
 */
const MemberSearch = ({ onOpen }: { onOpen: (user: DmSearchUser) => void }) => {
  const [text, setText] = useState('');
  const query = useDebounced(text);
  const search = useMemberSearch(query);
  const active = text.trim().length >= 2;

  return (
    <View>
      <View style={styles.field}>
        <Search size={18} color={MUTED} strokeWidth={1.8} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search members by name"
          placeholderTextColor="rgba(205, 214, 198, 0.5)"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          accessibilityLabel="Search members by name"
          style={styles.input}
        />
        {text ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setText('')}
            hitSlop={10}
          >
            <X size={18} color={MUTED} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      {active ? (
        <View style={styles.results}>
          {search.isFetching && !search.data ? (
            <ActivityIndicator color="#E8D58A" style={styles.loading} />
          ) : search.isError ? (
            <Text style={styles.muted}>{getErrorMessage(search.error, 'Could not search.')}</Text>
          ) : search.data?.length ? (
            search.data.map(user => (
              <Pressable
                key={user.id}
                accessibilityRole="button"
                accessibilityLabel={`${user.name}, ${STATE_TEXT[user.state]}`}
                onPress={() => onOpen(user)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <MemberAvatar name={user.name} avatarUrl={user.avatarUrl} size={40} />
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text style={styles.hint}>{STATE_TEXT[user.state]}</Text>
                </View>
                <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
              </Pressable>
            ))
          ) : query.trim().length >= 2 ? (
            <Text style={styles.muted}>No members match “{query.trim()}”.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default MemberSearch;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(10),
    minHeight: 46,
    paddingHorizontal: wp(14),
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.4)',
    backgroundColor: 'rgba(2, 8, 5, 0.6)',
  },
  input: { flex: 1, color: CREAM, fontSize: font(15), paddingVertical: hp(10) },
  results: {
    marginTop: hp(10),
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.3)',
    backgroundColor: 'rgba(2, 8, 5, 0.7)',
    overflow: 'hidden',
  },
  loading: { marginVertical: hp(16) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingVertical: hp(10),
    paddingHorizontal: wp(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.18)',
  },
  name: { color: CREAM, fontSize: font(16) },
  hint: { marginTop: 2, color: MUTED, fontSize: font(12) },
  muted: { padding: wp(14), color: MUTED, fontSize: font(14) },
  pressed: { opacity: 0.75 },
});
