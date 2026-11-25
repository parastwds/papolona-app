import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Hexagon, X } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { artworkFor, emblemKeyFor, gridFor } from '../artworks';

type Props = {
  // The series' own artwork key: each emblem's butterfly is cycled from it.
  artworkKey: string;
  // How many readings the series takes: 3, 6, 12 or 24 (its grid follows).
  length: number;
  // The emblems earned so far (tile indexes); leave out for a complete set.
  revealedTiles?: number[];
  // Outlines the newest emblem (the last of revealedTiles).
  highlightLatest?: boolean;
  // A frame around the set; off where the set sits in a frame of its own.
  framed?: boolean;
};

/**
 * A series' butterfly emblems, one for each reading the judge passed, laid out
 * on the series' grid (3 in a row … 24 in four rows of six). A complete set is
 * one NFT. Readings still to come show as faint hexagons.
 */
const EmblemSet = ({
  artworkKey,
  length,
  revealedTiles,
  highlightLatest = false,
  framed = true,
}: Props) => {
  const { rows, cols } = gridFor(length);
  const earned = revealedTiles
    ? new Set(revealedTiles)
    : new Set(Array.from({ length }, (_, i) => i));
  const latest =
    highlightLatest && revealedTiles?.length
      ? revealedTiles[revealedTiles.length - 1]
      : undefined;
  const iconSize = cols >= 6 ? 10 : cols >= 4 ? 12 : 16;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${earned.size} of ${length} butterfly emblems`}
      style={[
        styles.set,
        framed && styles.framed,
        { aspectRatio: cols / rows },
      ]}
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }, (__, c) => {
            const index = r * cols + c;
            const has = earned.has(index);
            return (
              <View
                key={c}
                style={[styles.cell, index === latest && styles.latest]}
              >
                {has ? (
                  <Image
                    source={artworkFor(emblemKeyFor(artworkKey, index))}
                    contentFit="contain"
                    style={styles.butterfly}
                  />
                ) : (
                  <Hexagon
                    size={iconSize}
                    color="rgba(217, 199, 126, 0.3)"
                    strokeWidth={1.4}
                  />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default EmblemSet;

/** A set of emblems full screen, on black, to see each butterfly closely. */
export const EmblemSetViewer = ({
  artworkKey,
  length,
  revealedTiles,
  label,
  onClose,
}: {
  artworkKey: string;
  length: number;
  revealedTiles?: number[];
  label: string;
  onClose: () => void;
}) => {
  const { width, height } = useWindowDimensions();
  const { rows, cols } = gridFor(length);
  // As large as fits the screen, keeping the grid's shape.
  const setWidth = Math.min(width - wp(24), (height * 0.7 * cols) / rows);
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
          style={styles.close}
        >
          <X size={26} color="#F1EEE0" strokeWidth={1.8} />
        </Pressable>
        <View style={{ width: setWidth }}>
          <EmblemSet
            artworkKey={artworkKey}
            length={length}
            revealedTiles={revealedTiles}
            framed={false}
          />
        </View>
        <Text style={styles.viewerLabel}>{label}</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  set: { width: '100%', backgroundColor: '#000' },
  framed: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 12,
    padding: 4,
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  latest: { borderWidth: 1.5, borderColor: '#E8D58A', borderRadius: 6 },
  butterfly: { width: '90%', height: '90%' },
  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  close: { position: 'absolute', top: hp(48), right: wp(20), padding: 6 },
  viewerLabel: {
    marginTop: hp(16),
    paddingHorizontal: wp(20),
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(18),
    textAlign: 'center',
  },
});
