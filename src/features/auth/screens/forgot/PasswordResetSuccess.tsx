import React from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackNavigationProp<
  RootStackParamList,
  'PasswordResetSuccess'
>;

const PasswordResetSuccess = () => {
  const navigation = useNavigation<Props>();
  const { width } = useWindowDimensions();
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(SCREENS.login);
  };
  const goToLogin = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: SCREENS.login }],
    });

  return (
    <ButterflyBackground
      imageStyle={styles.backgroundImage}
      style={styles.background}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.shade} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.backRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            style={styles.backButton}
            hitSlop={10}
          >
            <ChevronLeft size={16} color="#D9C77E" strokeWidth={1.8} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <View
          style={[styles.content, { paddingHorizontal: contentInset }]}
        >
          <View style={styles.formContent}>
            <Text style={styles.eyebrow}>P A P O L O N A</Text>

            <View style={styles.checkCircle}>
              <Check size={34} color="#D9C77E" strokeWidth={1.6} />
            </View>

            <Text style={styles.title}>Password reset successful</Text>
            <Text style={styles.subtitle}>
              Your password has been updated. You can now log in to your
              account.
            </Text>

            <AppButton
              title="Go to Login"
              onPress={goToLogin}
              variant="secondary"
              style={styles.submitButton}
              textStyle={styles.submitText}
              rightIcon={
                <View style={styles.arrowCircle}>
                  <ArrowRight size={17} color="#E8E8D8" />
                </View>
              }
            />
          </View>
        </View>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default PasswordResetSuccess;

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#030804' },
  safeArea: { flex: 1 },
  backgroundImage: { width: '100%', height: '100%' },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 5, 2, 0.25)',
  },
  backRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  backButton: {
    minWidth: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  backText: { color: '#A8B09A', fontSize: 13 },
  content: { flex: 1, justifyContent: 'center' },
  formContent: { width: '100%', maxWidth: 390, alignSelf: 'center' },
  eyebrow: {
    color: '#D6C77F',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 28,
  },
  checkCircle: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(191, 211, 157, 0.58)',
    backgroundColor: 'rgba(105, 132, 76, 0.20)',
    marginBottom: 24,
  },
  title: {
    color: '#F0E7D1',
    fontFamily: 'serif',
    fontSize: 25,
    lineHeight: 40,
    fontWeight: '400',
    letterSpacing: -0.5,
    maxWidth: 310,
  },
  subtitle: {
    color: 'rgba(211, 216, 207, 0.70)',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 26,
    maxWidth: 310,
  },
  submitButton: {
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(191, 211, 157, 0.58)',
    backgroundColor: 'rgba(105, 132, 76, 0.38)',
  },
  submitText: {
    color: '#DFDFC9',
    fontFamily: 'serif',
    fontWeight: '400',
    fontSize: 14,
    letterSpacing: 0,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 9, 4, 0.55)',
  },
});
