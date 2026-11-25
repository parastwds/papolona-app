import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';

// Component import
import { RootNavigator } from '@/navigation';
import {
  CACHE_BUSTER,
  PERSIST_MAX_AGE,
  queryClient,
  queryPersister,
} from '@/services/queryClient';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020905',
    card: '#020905',
  },
};

const splashImage = require('./assets/papolona_splash.png');

// Clue strings are set in Doto, a dot matrix face, for their quantum origin (see CLUE_FONT); screen titles such
// as "Question 1" in Montserrat Alternates (see TITLE_FONT), and the question beneath in Josefin
// Sans (see THIN_TEXT_FONT).
const FONTS = {
  Doto: require('./assets/fonts/Doto-ExtraBold.ttf'),
  JosefinSansLight: require('./assets/fonts/JosefinSans-Light.ttf'),
  JosefinSansRegular: require('./assets/fonts/JosefinSans-Regular.ttf'),
  MontserratAlternatesLight: require('./assets/fonts/MontserratAlternates-Light.ttf'),
  MontserratAlternatesRegular: require('./assets/fonts/MontserratAlternates-Regular.ttf'),
  MontserratAlternatesMedium: require('./assets/fonts/MontserratAlternates-Medium.ttf'),
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  // Loads while the splash shows; until then clue strings use the system font.
  useFonts(FONTS);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const dismissing = useRef(false);

  // The splash stays until it is tapped.
  useEffect(() => () => splashOpacity.stopAnimation(), [splashOpacity]);

  const dismissSplash = () => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowSplash(false);
    });
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: CACHE_BUSTER,
      }}
    >
      <SafeAreaProvider style={styles.container}>
        <StatusBar
          barStyle={showSplash || isDarkMode ? 'light-content' : 'dark-content'}
          hidden={showSplash}
        />
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
        {showSplash && (
          <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
            <Pressable
              onPress={dismissSplash}
              accessibilityRole="button"
              accessibilityLabel="Papolona. Tap to continue"
              style={styles.splashPressable}
            >
              <Image
                source={splashImage}
                resizeMode="cover"
                style={styles.splashImage}
              />
              <Text style={styles.splashHint}>Tap to continue</Text>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020905',
  },
  splash: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    backgroundColor: '#17200C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashPressable: {
    width: '100%',
    height: '100%',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
  splashHint: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    color: '#FFF1B8',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.8,
    // Soft glow so it reads on both light and dark parts of the splash art.
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

export default App;
