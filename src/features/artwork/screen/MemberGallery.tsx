import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMemberGallery } from '@/services/queries';
import type { WallTile } from '@/services/session';
import { hp } from '@/utils/responsive';
import ScreenHeader, { GOLD } from '../component/ScreenHeader';
import WallGrid, { WallEmpty, WallIntro } from '../component/WallGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'MemberGallery'>;

/** A member's gallery on Papolona: every series they have published. */
const MemberGallery = ({ navigation, route }: Props) => {
  const { userId, name } = route.params;
  const gallery = useMemberGallery(userId);
  const memberName = gallery.data?.member.name ?? name ?? 'Member';

  const open = useCallback(
    (tile: WallTile) => navigation.push(SCREENS.wallTile, { id: tile.id }),
    [navigation],
  );

  const renderBody = () => {
    if (gallery.isPending)
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    if (gallery.isError) {
      return (
        <WallEmpty
          text={getErrorMessage(gallery.error, 'Could not load this gallery.')}
        />
      );
    }
    const { member, tiles } = gallery.data;
    return (
      <WallGrid
        tiles={tiles}
        onOpen={open}
        showOwner={false}
        header={
          member.memberSince ? (
            <WallIntro
              text={`Member since ${new Date(
                member.memberSince,
              ).toLocaleDateString([], { month: 'long', year: 'numeric' })}`}
            />
          ) : undefined
        }
        empty={
          <WallEmpty text={`${member.name} hasn't published anything yet.`} />
        }
      />
    );
  };

  return (
    <TabBackground deep>
      {/* TabBackground keeps clear of the top; this keeps clear of the bottom. */}
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader title={memberName} onBack={() => navigation.goBack()} />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default MemberGallery;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
});
