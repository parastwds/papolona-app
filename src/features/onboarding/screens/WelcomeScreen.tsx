import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WelcomeScreen = ({ navigation }: Props) => {
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../../../assets/welcome_butterfly_bg.webp')}
      resizeMode="cover"
      style={styles.background}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View
        style={[
          styles.content,
          { paddingTop: Math.max(top, 24) + height * 0.04 },
        ]}
      >
        <View style={styles.brand}>
          <Image
            source={require('../../../../assets/papolona_logo.png')}
            resizeMode="contain"
            style={styles.brandLogo}
            accessibilityLabel="Papolona logo"
          />
          {/* expo-image: the wordmark is a WebP, which React Native's Image may not show on older iOS. */}
          <ExpoImage
            source={require('../../../../assets/papolona_wordmark_gold.webp')}
            contentFit="contain"
            style={styles.brandName}
            accessibilityLabel="Papolona"
          />
          <View style={styles.brandDivider} />
        </View>

        {/* The brand sits at the top; the tagline and the buttons sit together at the bottom. */}
        <View style={styles.actions}>
          <Text style={styles.tagline}>
            Ignite your perception of{'\n'}nature's Dark Beauty.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(SCREENS.opening)}
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.getStartedText}>Tap to enter</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(SCREENS.login)}
            hitSlop={8}
          >
            <Text style={styles.signInText}>Open my existing account</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
};

const COLORS = {
  gold: '#E8D58A',
  text: '#D8C981',
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#020905',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 96,
    backgroundColor: 'rgba(0, 5, 2, 0.14)',
  },
  brand: {
    alignItems: 'center',
  },
  brandLogo: {
    width: 140,
    height: 140,
  },
  // The wordmark image has transparent space around the letters (about a third of its height
  // above and below), so the negative margins keep the spacing the text version had.
  brandName: {
    width: 240,
    aspectRatio: 2000 / 668,
    marginTop: -26,
  },
  brandDivider: {
    width: 100,
    height: 1,
    marginTop: -8,
    backgroundColor: 'rgba(232, 213, 138, 0.75)',
  },
  tagline: {
    marginBottom: 0,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    alignItems: 'center',
    gap: 18,
  },
  getStartedButton: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#70864D',
    backgroundColor: 'rgba(54, 75, 43, 0.84)',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  getStartedText: {
    color: '#E8D99F',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  signInText: {
    color: '#A5B49B',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
