import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import { font, hp, wp } from '@/utils/responsive';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useSeriesOptions } from '@/services/queries';
import { SeriesOption, startSeries } from '@/services/session';
import { rarityOf } from '../artworks';
import RarityMark from '../component/RarityMark';
import ScreenHeader from '@/features/artwork/component/ScreenHeader';
import RevealGrid from '../component/RevealGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'StartSeries'>;

/** Members choose how many readings their next series takes; longer is rarer and earns more. */
const StartSeries = ({ navigation }: Props) => {
  const queryClient = useQueryClient();
  const options = useSeriesOptions();
  const [selected, setSelected] = useState<SeriesOption | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState('');

  const start = async () => {
    if (!selected || isStarting) return;
    setIsStarting(true);
    setMessage('');
    try {
      const series = await startSeries(selected.length);
      queryClient.setQueryData(queryKeys.seriesActive, series);
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
      navigation.goBack();
    } catch (error) {
      setMessage(
        getErrorMessage(error, 'Could not start the series. Please try again.'),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesAll });
    } finally {
      setIsStarting(false);
    }
  };

  const renderOptions = () => {
    if (options.isPending) return <ActivityIndicator color={COLORS.gold} />;
    if (options.isError) {
      return (
        <Text style={styles.error}>
          {getErrorMessage(options.error, 'Could not load the series.')}
        </Text>
      );
    }
    return options.data.options.map(option => {
      const isSelected = selected?.length === option.length;
      const rarity = rarityOf(option.rarity);
      return (
        <Pressable
          key={option.length}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${option.label}: ${option.length} ${
            option.length === 1 ? 'reading' : 'readings'
          }, ${
            option.nftEligible
              ? `${rarity.label}, earns a butterfly emblem you can convert into an NFT`
              : 'practice: emblems, no NFT'
          }`}
          onPress={() => setSelected(option)}
          style={({ pressed }) => [
            styles.option,
            isSelected && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.preview}>
            <RevealGrid
              rows={option.rows}
              cols={option.cols}
              artworkKey=""
              revealedTiles={[]}
              previewOnly
              borderRadius={8}
            />
          </View>
          <View style={styles.optionText}>
            <View style={styles.titleRow}>
              <Text style={styles.optionTitle}>
                {option.length} {option.length === 1 ? 'reading' : 'readings'}
              </Text>
              {option.nftEligible ? (
                <>
                  <RarityMark rarity={option.rarity} size={13} />
                  <Text style={[styles.rarityText, { color: rarity.color }]}>
                    {rarity.label}
                  </Text>
                </>
              ) : null}
            </View>
            <Text style={styles.optionMeta}>
              {option.label} · {option.rows} × {option.cols} grid · at least{' '}
              {option.minDays} {option.minDays === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.reward}>{rewardText(option)}</Text>
          </View>
        </Pressable>
      );
    });
  };

  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScreenHeader
          title="Choose your series"
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Each reading the judge passes lights one tile. A fail lights
            nothing: review and resubmit it, or move on to your next clue. A
            reading that fails all three attempts fails the whole series, and
            each reading must be completed within 12 hours of drawing its clue,
            or the series is lost. Singles and twins
            are practice. Three, six, twelve and twenty-four reading series earn
            a butterfly emblem, rarer the longer the series, that you can keep
            in your gallery or convert into an NFT.
          </Text>
          {renderOptions()}
        </ScrollView>

        <View style={styles.footer}>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selected || isStarting }}
            disabled={!selected || isStarting}
            onPress={start}
            style={({ pressed }) => [
              styles.startButton,
              (!selected || isStarting) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {isStarting ? (
              <ActivityIndicator color={COLORS.onGold} />
            ) : (
              <Text style={styles.startText}>
                {selected
                  ? selected.nftEligible
                    ? `Start ${rarityOf(
                        selected.rarity,
                      ).label.toLowerCase()} series`
                    : 'Start practice series'
                  : 'Choose a series'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

/** What completing the option earns. */
function rewardText(option: SeriesOption) {
  return option.nftEligible
    ? 'Butterfly emblem · NFT-eligible'
    : 'Practice · no reward';
}

export default StartSeries;

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  goldSolid: '#D9C77E',
  onGold: '#172016',
  cream: '#F1EEE0',
  muted: '#B4B8AB',
  red: '#E2A09A',
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.bottomBg },
  // As deep as the tabs': the text here sits on the artwork.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  flex: { flex: 1 },
  content: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: hp(20),
    paddingHorizontal: wp(20),
    paddingBottom: hp(24),
    gap: hp(12),
  },
  intro: {
    marginBottom: hp(8),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(21),
  },
  // Each choice a quiet box; the one picked takes a gold edge and tint.
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(14),
    padding: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  optionSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  preview: { width: wp(64) },
  optionText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionTitle: {
    marginRight: 6,
    color: COLORS.cream,
    fontSize: font(16),
    fontWeight: '600',
  },
  optionMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: font(13),
    lineHeight: font(19),
  },
  reward: {
    marginTop: 4,
    color: COLORS.gold,
    fontSize: font(13),
    fontWeight: '600',
  },
  // The rarity as a coloured word with a dot, as on Collect.
  rarityText: { fontSize: font(13), fontWeight: '600' },
  footer: { paddingHorizontal: wp(20), paddingBottom: hp(12), gap: hp(8) },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: COLORS.goldSolid,
  },
  startText: { color: COLORS.onGold, fontSize: font(16), fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  error: { color: COLORS.red, fontSize: font(14), textAlign: 'center' },
});
