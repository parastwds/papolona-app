import React from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/theme/colors';
import { font } from '@/utils/responsive';

const DEFAULT_BACKGROUND: ImageSourcePropType = require('@assets/login_bg.png');

interface Props {
  children: React.ReactNode;
  source?: ImageSourcePropType;
  // A deeper veil, for a tab whose text sits on the artwork rather than on cards.
  deep?: boolean;
  // On while a sheet is open over the tab, to push the tab slightly out of focus.
  blurred?: boolean;
}

/** Dark artwork backdrop shared by the main tabs, matching the login screen. */
const TabBackground = ({
  children,
  source = DEFAULT_BACKGROUND,
  deep = false,
  blurred = false,
}: Props) => (
  <ImageBackground
    source={source}
    resizeMode="cover"
    style={[styles.background, blurred && styles.blurred]}
  >
    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle="light-content"
    />
    <View style={[styles.overlay, deep && styles.overlayDeep]} />
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {children}
    </SafeAreaView>
  </ImageBackground>
);

export default TabBackground;

/** Gold eyebrow and serif title for CustomHeader on the main tabs. */
export const tabHeaderStyles = StyleSheet.create({
  title: {
    color: '#E8D58A',
    letterSpacing: 1.4,
    fontSize: font(13),
    fontWeight: '600',
  },
  subtitle: {
    color: '#F1EEE0',
    fontFamily: 'serif',
    fontSize: font(25),
  },
});

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.bottomBg,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 5, 2, 0.55)',
  },
  overlayDeep: { backgroundColor: 'rgba(2, 8, 5, 0.8)' },
  // Drawn by the platform: Android 12 and later blur, anything else stays sharp.
  blurred: { filter: [{ blur: 1.5 }] },
  safeArea: { flex: 1 },
});
