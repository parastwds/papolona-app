import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native';

import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useWall } from '@/services/queries';
import type { WallTile } from '@/services/session';
import { font, hp, wp } from '@/utils/responsive';
import ScreenHeader, { GOLD } from '../component/ScreenHeader';
import WallGrid, { WallEmpty, WallIntro } from '../component/WallGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'CollectiveArtwork'>;

// Zoom steps: emblems across. Fewer is closer in; from 4 they show without captions.
const ZOOM_COLUMNS = [2, 3, 4, 6];
const DEFAULT_ZOOM = 1;
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

/** A round control in the bar under the artwork. */
const Control = ({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    hitSlop={8}
    style={({ pressed }) => [
      styles.control,
      disabled && styles.disabled,
      pressed && styles.pressed,
    ]}
  >
    {children}
  </Pressable>
);

/**
 * Papolona, the collaborative artwork: every emblem members have put up for
 * sale, as one ever-growing column, newest first. Zoom in and out (emblems
 * across) and page up and down with the bar at the bottom. Tap any thumbnail to
 * open its readings and the member who completed them.
 */
const CollectiveArtwork = ({ navigation }: Props) => {
  const wall = useWall();
  const tiles = useMemo(
    () => wall.data?.pages.flatMap(p => p.tiles) ?? [],
    [wall.data],
  );
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const columns = ZOOM_COLUMNS[zoom];
  const listRef = useRef<FlatList<WallTile>>(null);
  const offset = useRef(0);
  const { height } = useWindowDimensions();

  const open = useCallback(
    (tile: WallTile) => navigation.navigate(SCREENS.wallTile, { id: tile.id }),
    [navigation],
  );

  // About two thirds of the screen per press, so a row stays in view for context.
  const page = (direction: 1 | -1) =>
    listRef.current?.scrollToOffset({
      offset: Math.max(0, offset.current + direction * height * 0.6),
      animated: true,
    });

  const renderBody = () => {
    if (wall.isPending)
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    if (wall.isError) {
      return (
        <WallEmpty
          text={getErrorMessage(
            wall.error,
            'Could not load the collaborative artwork.',
          )}
        />
      );
    }
    return (
      <WallGrid
        tiles={tiles}
        onOpen={open}
        columns={columns}
        listRef={listRef}
        onScroll={y => {
          offset.current = y;
        }}
        onEndReached={() => {
          if (wall.hasNextPage && !wall.isFetchingNextPage)
            wall.fetchNextPage();
        }}
        loadingMore={wall.isFetchingNextPage}
        header={
          <WallIntro text="Every emblem is a member's completed series. Tap any thumbnail to see its readings and who made it." />
        }
        empty={
          <WallEmpty text="Nothing here yet. Emblems members make public, and NFTs put up for sale, join the collaborative artwork." />
        }
      />
    );
  };

  return (
    <TabBackground deep>
      {/* TabBackground keeps clear of the top; this keeps clear of the bottom. */}
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title="The collaborative artwork"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.flex}>{renderBody()}</View>

        {tiles.length > 0 ? (
          <View style={styles.bar}>
            <Control label="Scroll up" onPress={() => page(-1)}>
              <ChevronUp size={20} color={CREAM} strokeWidth={1.8} />
            </Control>
            <View style={styles.zoom}>
              <Control
                label="Zoom out"
                disabled={zoom === ZOOM_COLUMNS.length - 1}
                onPress={() =>
                  setZoom(z => Math.min(z + 1, ZOOM_COLUMNS.length - 1))
                }
              >
                <Minus size={18} color={CREAM} strokeWidth={1.8} />
              </Control>
              <Text style={styles.zoomText}>Zoom</Text>
              <Control
                label="Zoom in"
                disabled={zoom === 0}
                onPress={() => setZoom(z => Math.max(z - 1, 0))}
              >
                <Plus size={18} color={CREAM} strokeWidth={1.8} />
              </Control>
            </View>
            <Control label="Scroll down" onPress={() => page(1)}>
              <ChevronDown size={20} color={CREAM} strokeWidth={1.8} />
            </Control>
          </View>
        ) : null}
      </SafeAreaView>
    </TabBackground>
  );
};

export default CollectiveArtwork;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
  // The controls under the artwork: page up, zoom, page down.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(20),
    paddingVertical: hp(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
    backgroundColor: 'rgba(4, 10, 7, 0.85)',
  },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: wp(12) },
  zoomText: { color: MUTED, fontSize: font(13) },
  control: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.35)',
    borderRadius: 20,
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
