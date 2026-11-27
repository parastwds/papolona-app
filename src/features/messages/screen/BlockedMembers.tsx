import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import TabBackground from '@/components/TabBackground';
import type { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useBlockedMembers } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { unblockMember } from '@/services/session';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import { font, hp, wp } from '@/utils/responsive';
import MemberAvatar from '../component/MemberAvatar';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedMembers'>;

/** The members you blocked, each with a way to unblock them. */
const BlockedMembers = ({ navigation }: Props) => {
  const queryClient = useQueryClient();
  const blocked = useBlockedMembers();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const unblock = async (id: string) => {
    setBusy(id);
    setError('');
    try {
      await unblockMember(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dmsAll });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not unblock. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <TabBackground deep>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader title="Blocked members" onBack={() => navigation.goBack()} />
        {blocked.isPending ? (
          <ActivityIndicator color="#E8D58A" style={styles.loading} />
        ) : (
          <FlatList
            data={blocked.data ?? []}
            keyExtractor={u => u.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <>
                <Text style={styles.muted}>
                  Blocked members can’t message you, and you won’t find each other in
                  search or see each other’s profiles.
                </Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            }
            ListEmptyComponent={<Text style={styles.empty}>You haven’t blocked anyone.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <MemberAvatar name={item.name} avatarUrl={item.avatarUrl} size={40} />
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${item.name}`}
                  disabled={busy !== null}
                  onPress={() => unblock(item.id)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  {busy === item.id ? (
                    <ActivityIndicator size="small" color="#E8D58A" />
                  ) : (
                    <Text style={styles.chipText}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </TabBackground>
  );
};

export default BlockedMembers;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: hp(40) },
  list: { paddingHorizontal: wp(20), paddingTop: hp(12), paddingBottom: hp(40) },
  muted: { color: '#B4B8AB', fontSize: font(14), lineHeight: font(21), marginBottom: hp(12) },
  empty: { marginTop: hp(20), color: '#B4B8AB', fontSize: font(15), textAlign: 'center' },
  error: { marginBottom: hp(8), color: '#E2A09A', fontSize: font(13) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingVertical: hp(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  name: { flex: 1, color: '#F1EEE0', fontSize: font(16) },
  chip: {
    minHeight: 34,
    minWidth: wp(84),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  chipText: { color: '#E8D58A', fontSize: font(13), fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
