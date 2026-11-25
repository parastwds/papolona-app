import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Maximize2, Minimize2 } from 'lucide-react-native';

import IntroVideo from '@/components/IntroVideo';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import {
  INTRO_VIDEO_STEP,
  INTRO_VIDEO_URL,
  TOTAL_INTRO_STEPS,
} from '../constants';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroVideo'>;

const IntroVideoScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [fullscreen, setFullscreen] = useState(false);

  // Android's back button leaves full screen before it leaves the screen.
  useEffect(() => {
    if (!fullscreen) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setFullscreen(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [fullscreen]);

  const inlineWidth = width - SIDE_PADDING * 2;
  // The children keep the same order in both modes, so React keeps the one
  // player instance and full screen doesn't restart the video.
  return (
    <ButterflyBackground
      style={styles.background}
    >
      <StatusBar
        hidden={fullscreen}
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View
        style={[
          styles.container,
          fullscreen
            ? styles.containerFullscreen
            : { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {!fullscreen && (
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={styles.headerAction}
            >
              <ChevronLeft size={16} color={COLORS.gold} strokeWidth={1.8} />
              <Text style={styles.headerActionText}>Back</Text>
            </Pressable>
            <Text style={styles.stepCount}>
              {String(INTRO_VIDEO_STEP).padStart(2, '0')} /{' '}
              {String(TOTAL_INTRO_STEPS).padStart(2, '0')}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        {!fullscreen && (
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>PAPOLONA INTRODUCES</Text>
            <Text style={styles.title}>Meet Papolona</Text>
            <Text style={styles.body}>
              Mark Dolamore introduces the ideas behind Papolona. Turn your
              sound on.
            </Text>
          </View>
        )}

        <IntroVideo
          uri={INTRO_VIDEO_URL}
          style={
            fullscreen
              ? [styles.videoFullscreen, { width, height }]
              : { width: inlineWidth, height: (inlineWidth * 9) / 16 }
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fullscreen ? 'Exit full screen' : 'Full screen'}
          onPress={() => setFullscreen(value => !value)}
          hitSlop={10}
          style={
            fullscreen
              ? [styles.exitButton, { top: insets.top + 12 }]
              : styles.fullscreenButton
          }
        >
          {fullscreen ? (
            <Minimize2 size={18} color={COLORS.paleGold} strokeWidth={1.8} />
          ) : (
            <>
              <Maximize2 size={16} color={COLORS.gold} strokeWidth={1.8} />
              <Text style={styles.fullscreenText}>Full screen</Text>
            </>
          )}
        </Pressable>

        {!fullscreen && (
          <View style={styles.footer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(INTRO_VIDEO_STEP / TOTAL_INTRO_STEPS) * 100}%`,
                  },
                ]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              onPress={() => navigation.navigate(SCREENS.signup, route.params)}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.nextButtonPressed,
              ]}
            >
              <ChevronRight
                size={24}
                color={COLORS.paleGold}
                strokeWidth={1.8}
              />
            </Pressable>
          </View>
        )}
      </View>
    </ButterflyBackground>
  );
};

export default IntroVideoScreen;

const SIDE_PADDING = 26;

const COLORS = {
  gold: '#D9C77E',
  paleGold: '#EFE4B3',
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#020905',
  },
  container: {
    flex: 1,
    paddingHorizontal: SIDE_PADDING,
    backgroundColor: 'rgba(0, 5, 2, 0.28)',
  },
  containerFullscreen: {
    paddingHorizontal: 0,
    backgroundColor: '#000',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: {
    minWidth: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActionText: {
    color: '#A8B09A',
    fontSize: 13,
  },
  headerSpacer: {
    width: 52,
  },
  stepCount: {
    color: COLORS.gold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  intro: {
    marginTop: 'auto',
    marginBottom: 22,
  },
  eyebrow: {
    marginBottom: 12,
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  title: {
    color: COLORS.paleGold,
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 39,
  },
  body: {
    marginTop: 12,
    color: '#D3D7C8',
    fontSize: 14,
    lineHeight: 21,
  },
  videoFullscreen: {
    borderWidth: 0,
    borderRadius: 0,
  },
  fullscreenButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.5)',
    borderRadius: 18,
    backgroundColor: 'rgba(8, 14, 10, 0.7)',
  },
  fullscreenText: {
    color: COLORS.paleGold,
    fontSize: 13,
    fontWeight: '600',
  },
  exitButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.42)',
    borderRadius: 20,
    backgroundColor: 'rgba(8, 14, 10, 0.7)',
  },
  footer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(217, 199, 126, 0.24)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  nextButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 22,
  },
  nextButtonPressed: {
    backgroundColor: 'rgba(217, 199, 126, 0.18)',
  },
});
