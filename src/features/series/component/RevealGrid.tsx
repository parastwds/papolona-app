import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Hexagon, Sparkles } from 'lucide-react-native';

import { artworkFor, emblemKeyFor, gridFor } from '../artworks';

interface RevealGridProps {
  // The series' stored grid; only its size (rows x cols) is used: every grid
  // is drawn three tiles wide (see gridFor).
  rows: number;
  cols: number;
  artworkKey: string;
  // Tile indexes, row by row from the top left, that are uncovered.
  revealedTiles: number[];
  // Outlines the newest tile (the last of revealedTiles).
  highlightLatest?: boolean;
  // Hides the artwork entirely (a preview of an empty grid in the picker).
  previewOnly?: boolean;
  // False for singles and twins: practice, with no artwork, so revealed tiles light up gold.
  showArtwork?: boolean;
  borderRadius?: number;
}

/**
 * A series' grid, three tiles to a row: each reading the judge passes earns the
 * butterfly emblem in its tile (practice series light the tile gold instead);
 * tiles still to come stay covered.
 */
const RevealGrid = ({
  rows: storedRows,
  cols: storedCols,
  artworkKey,
  revealedTiles,
  highlightLatest = false,
  previewOnly = false,
  showArtwork = true,
  borderRadius = 14,
}: RevealGridProps) => {
  const withArtwork = showArtwork && !previewOnly;
  const revealed = new Set(revealedTiles);
  const latest = highlightLatest
    ? revealedTiles[revealedTiles.length - 1]
    : undefined;
  const { rows, cols, widthShare } = gridFor(storedRows * storedCols);
  const iconSize = 16;

  return (
    <View
      // Square tiles, three to a row; a single or twin is narrower, centred.
      style={[
        styles.frame,
        { width: `${widthShare * 100}%`, aspectRatio: cols / rows, borderRadius },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${revealed.size} of ${rows * cols} tiles revealed`}
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }, (__, c) => {
            const index = r * cols + c;
            const isOpen = !previewOnly && revealed.has(index);
            return (
              <View
                key={c}
                style={[
                  styles.tile,
                  isOpen ? (withArtwork ? styles.tileOpen : styles.tileLit) : styles.tileCovered,
                  index === latest && styles.tileLatest,
                ]}
              >
                {isOpen && withArtwork && (
                  <Image
                    source={artworkFor(emblemKeyFor(artworkKey, index))}
                    resizeMode="contain"
                    style={styles.butterfly}
                  />
                )}
                {isOpen && !withArtwork && (
                  <Sparkles size={iconSize} color="#E8D58A" strokeWidth={1.6} />
                )}
                {!isOpen && (
                  <Hexagon
                    size={iconSize}
                    color="rgba(217, 199, 126, 0.35)"
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

export default RevealGrid;

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.45)',
    backgroundColor: '#070C09',
  },
  // An explicit size: a bundled image otherwise takes its own pixel size.
  butterfly: { width: '86%', height: '86%' },
  row: { flex: 1, flexDirection: 'row' },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 199, 126, 0.22)',
  },
  tileCovered: { backgroundColor: '#0B120E' },
  tileOpen: { backgroundColor: '#000' },
  // A revealed tile of a practice series: lit gold, no artwork beneath.
  tileLit: { backgroundColor: 'rgba(217, 199, 126, 0.22)' },
  tileLatest: { borderWidth: 2, borderColor: '#E8D58A' },
});
