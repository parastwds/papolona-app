import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppleIcon, GoogleIcon } from '@assets/icon';

interface Props {
  onGooglePress: () => void;
  googleLoading?: boolean;
}

const OAuthButtons = ({ onGooglePress, googleLoading = false }: Props) => (
  <View style={styles.container}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ busy: googleLoading, disabled: googleLoading }}
      disabled={googleLoading}
      onPress={onGooglePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {googleLoading ? (
        <ActivityIndicator color="#D9C77E" />
      ) : (
        <GoogleIcon width={25} height={25} />
      )}
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
      accessibilityHint="Apple sign-in will be available later"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.button, styles.disabled]}
    >
      <AppleIcon width={25} height={25} />
    </Pressable>
  </View>
);

export default OAuthButtons;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  button: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.72)',
    borderRadius: 26,
    backgroundColor: 'rgba(12, 27, 19, 0.5)',
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
