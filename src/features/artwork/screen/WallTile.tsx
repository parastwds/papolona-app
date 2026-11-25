import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Maximize2 } from 'lucide-react-native';

import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useWallTile } from '@/services/queries';
import { rarityOf, readingLevelOf } from '@/features/series/artworks';
import EmblemSet, {
  EmblemSetViewer,
} from '@/features/series/component/EmblemSet';
import { CLUE_FONT } from '@/theme/fonts';
import { font, hp, wp } from '@/utils/responsive';
import ScreenHeader, { GOLD } from '../component/ScreenHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'WallTile'>;

const GUTTER = wp(20);
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const HAIRLINE = 'rgba(161, 190, 148, 0.2)';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** One label and value; with onPress it leads somewhere (a member's gallery). */
const Fact = ({
  label,
  children,
  onPress,
}: {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    disabled={!onPress}
    onPress={onPress}
    style={({ pressed }) => [styles.factRow, pressed && styles.pressed]}
  >
    <Text style={styles.factLabel}>{label}</Text>
    <View style={styles.factValueWrap}>{children}</View>
    {onPress ? (
      <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
    ) : null}
  </Pressable>
);

/**
 * One emblem from the collaborative artwork, opened: the emblem (tap to zoom,
 * pinch inside), who completed it (to their gallery) and who owns it now, then
 * every reading that made it in full: the clue, the interpretation, how the
 * judge read each part, and the judge's feedback.
 */
const WallTile = ({ navigation, route }: Props) => {
  const { id } = route.params;
  const query = useWallTile(id);
  const [zoomed, setZoomed] = useState(false);

  const renderBody = () => {
    if (query.isPending)
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    if (query.isError) {
      return (
        <Text style={[styles.body, styles.message]}>
          {getErrorMessage(query.error, 'Could not open this artwork.')}
        </Text>
      );
    }
    const { tile, readings } = query.data;
    const rarity = rarityOf(tile.rarity);
    const maker = tile.creator ?? tile.owner;
    const sold = maker.id !== tile.owner.id;
    const openGallery = (member: { id: string; name: string }) =>
      navigation.navigate(SCREENS.memberGallery, {
        userId: member.id,
        name: member.name,
      });

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel="Open the emblems full screen"
          onPress={() => setZoomed(true)}
          style={({ pressed }) => [styles.frame, pressed && styles.pressed]}
        >
          <View style={styles.setWrap}>
            <EmblemSet
              artworkKey={tile.artworkKey}
              length={tile.length}
              framed={false}
            />
          </View>
          <View style={styles.zoomHint}>
            <Maximize2 size={16} color={CREAM} strokeWidth={1.8} />
          </View>
        </Pressable>
        <Text style={styles.hint}>
          Each butterfly is one reading the judge passed. Tap to see them
          closely.
        </Text>

        {/* What it is, as label and value, like an NFT's own screen. */}
        <View style={styles.facts}>
          <Fact label="Completed by" onPress={() => openGallery(maker)}>
            <Text style={styles.factValue}>{maker.name}</Text>
          </Fact>
          {sold ? (
            <>
              <View style={styles.divider} />
              <Fact label="Owned by">
                <Text style={styles.factValue}>{tile.owner.name}</Text>
              </Fact>
            </>
          ) : null}
          <View style={styles.divider} />
          <Fact label="Level">
            <Text style={styles.factValue}>
              {readingLevelOf(tile.rarity)
                ? `Level ${readingLevelOf(tile.rarity)?.level}`
                : rarity.label}
            </Text>
          </Fact>
          <View style={styles.divider} />
          <Fact label="Readings">
            <Text style={styles.factValue}>{tile.length}</Text>
          </Fact>
          {tile.completedAt ? (
            <>
              <View style={styles.divider} />
              <Fact label="Completed">
                <Text style={styles.factValue}>
                  {formatDate(tile.completedAt)}
                </Text>
              </Fact>
            </>
          ) : null}
        </View>

        <Text accessibilityRole="header" style={styles.subheading}>
          The readings
        </Text>
        <Text style={styles.body}>
          Each butterfly above is one of these readings, passed by {maker.name}.
        </Text>
        {readings.length === 0 ? (
          <Text style={[styles.body, styles.empty]}>
            No readings are recorded for this emblem.
          </Text>
        ) : (
          readings.map((reading, index) => (
            <View key={reading.id} style={styles.reading}>
              <View style={styles.readingHead}>
                <Text style={styles.readingNumber}>
                  {index + 1} of {readings.length}
                </Text>
                <Text style={styles.readingDate}>
                  {formatDate(reading.generatedAt)}
                </Text>
              </View>
              <Text style={styles.readingClue}>{reading.clue}</Text>
              {reading.interpretation ? (
                <>
                  <Text style={styles.label}>Interpretation</Text>
                  <Text style={styles.text}>{reading.interpretation}</Text>
                </>
              ) : null}
              {reading.parts.length > 0 ? (
                <>
                  <Text style={styles.label}>The clue, part by part</Text>
                  {reading.parts.map(part => (
                    <Text key={part.part} style={styles.text}>
                      <Text style={styles.part}>{part.part}</Text>{' '}
                      {part.meaning}
                    </Text>
                  ))}
                </>
              ) : null}
              {reading.feedback ? (
                <>
                  <Text style={styles.label}>The judge</Text>
                  <Text style={styles.text}>{reading.feedback}</Text>
                </>
              ) : null}
            </View>
          ))
        )}

        {zoomed && (
          <EmblemSetViewer
            artworkKey={tile.artworkKey}
            length={tile.length}
            label={`${rarity.label} by ${maker.name}`}
            onClose={() => setZoomed(false)}
          />
        )}
      </ScrollView>
    );
  };

  // "Mira S.'s level two reading".
  const title = query.data
    ? `${(query.data.tile.creator ?? query.data.tile.owner).name}'s ${(
        readingLevelOf(query.data.tile.rarity)?.name ??
        rarityOf(query.data.tile.rarity).label
      ).toLowerCase()}`
    : 'Artwork';

  return (
    <TabBackground deep>
      {/* TabBackground keeps clear of the top; this keeps clear of the bottom. */}
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default WallTile;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  // The set of emblems, centred in the frame.
  setWrap: { flex: 1, justifyContent: 'center', padding: 8 },
  center: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: GUTTER },
  // Starts clear of the fade the header lays over the top of the scroll.
  content: {
    paddingTop: hp(20),
    paddingHorizontal: GUTTER,
    paddingBottom: hp(40),
  },
  // Black, as the emblems were made to be seen, with one thin edge.
  frame: {
    width: '100%',
    aspectRatio: 1.1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  pressed: { opacity: 0.85 },
  zoomHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  hint: {
    marginTop: 8,
    color: MUTED,
    fontSize: font(12),
    textAlign: 'center',
  },
  facts: {
    marginTop: hp(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  factRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE },
  // One column for every label, so the values line up down the page.
  factLabel: { width: wp(118), color: MUTED, fontSize: font(14) },
  factValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factValue: { flexShrink: 1, color: CREAM, fontSize: font(15) },
  subheading: {
    marginTop: hp(24),
    marginBottom: 4,
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  empty: { marginTop: hp(12) },
  // A quiet box per reading: a dark wash on the artwork and one thin edge.
  reading: {
    marginTop: hp(14),
    gap: 6,
    padding: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  readingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readingNumber: { color: MUTED, fontSize: font(12) },
  readingDate: { color: MUTED, fontSize: font(12) },
  readingClue: {
    color: CREAM,
    fontFamily: CLUE_FONT,
    fontSize: font(24),
    letterSpacing: 2,
  },
  label: {
    marginTop: 6,
    color: GOLD,
    fontSize: font(11),
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  part: { color: GOLD, fontWeight: '700' },
  text: { color: CREAM, fontSize: font(14), lineHeight: font(20) },
  body: { color: MUTED, fontSize: font(14), lineHeight: font(20) },
});
