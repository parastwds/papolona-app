import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { SCREENS } from '@/constants/screens';
import type { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useProfileAccessRequests } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { answerProfileAccess } from '@/services/session';
import MemberAvatar from '@/features/messages/component/MemberAvatar';
import { font, hp, wp } from '@/utils/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Members asking to see your readings and NFTs, each with Approve and Deny.
 * Nothing shows when there are none.
 */
const ProfileAccessRequests = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const requests = useProfileAccessRequests();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!requests.data?.length) return null;

  const answer = async (id: string, approve: boolean) => {
    setBusy(`${id}:${approve}`);
    setError('');
    try {
      await answerProfileAccess(id, approve);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profileAccessRequests });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not answer. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {requests.data.map(r => (
        <View key={r.id} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${r.viewer.name}'s profile`}
            onPress={() =>
              navigation.navigate(SCREENS.memberProfile, { userId: r.viewer.id, name: r.viewer.name })
            }
          >
            <MemberAvatar name={r.viewer.name} avatarUrl={r.viewer.avatarUrl} size={40} />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.text}>
              <Text style={styles.name}>{r.viewer.name}</Text> asks to see your readings and NFTs.
            </Text>
            <View style={styles.actions}>
              {[true, false].map(approve => (
                <Pressable
                  key={String(approve)}
                  accessibilityRole="button"
                  accessibilityLabel={`${approve ? 'Approve' : 'Deny'} ${r.viewer.name}`}
                  disabled={busy !== null}
                  onPress={() => answer(r.id, approve)}
                  style={({ pressed }) => [styles.chip, approve && styles.chipPrimary, pressed && styles.pressed]}
                >
                  {busy === `${r.id}:${approve}` ? (
                    <ActivityIndicator size="small" color={approve ? '#172016' : '#E8D58A'} />
                  ) : (
                    <Text style={[styles.chipText, approve && styles.chipTextPrimary]}>
                      {approve ? 'Approve' : 'Deny'}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default ProfileAccessRequests;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { paddingHorizontal: wp(20) },
  error: { marginBottom: hp(8), color: '#E2A09A', fontSize: font(13) },
  row: {
    flexDirection: 'row',
    gap: wp(12),
    paddingVertical: hp(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  text: { color: '#B4B8AB', fontSize: font(14), lineHeight: font(20) },
  name: { color: '#F1EEE0', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: wp(8), marginTop: hp(10) },
  chip: {
    minHeight: 34,
    minWidth: wp(84),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  chipPrimary: { backgroundColor: '#D9C77E', borderColor: '#D9C77E' },
  chipText: { color: '#E8D58A', fontSize: font(13), fontWeight: '600' },
  chipTextPrimary: { color: '#172016' },
  pressed: { opacity: 0.75 },
});
