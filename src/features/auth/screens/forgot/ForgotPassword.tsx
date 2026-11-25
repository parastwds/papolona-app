import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, ChevronLeft, Mail } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import { getErrorMessage } from '@/services/api';
import { requestPasswordReset } from '@/services/session';
import AuthTextInput from '../../components/TextInput';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackNavigationProp<RootStackParamList>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const navigation = useNavigation<Props>();
  const scrollRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToLogin = () => navigation.navigate(SCREENS.login);
  const sendOtp = async () => {
    if (isSubmitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const sent = await requestPasswordReset(normalizedEmail);
      navigation.navigate(SCREENS.verifyOTP, {
        email: normalizedEmail,
        resendAfterSeconds: sent.resendAfterSeconds,
        expiresInMinutes: sent.expiresInMinutes,
      });
    } catch (sendError) {
      setError(
        getErrorMessage(sendError, 'Unable to send a code. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ButterflyBackground
      imageStyle={styles.backgroundImage}
      style={styles.background}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <View style={styles.shade} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.backRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Login"
            onPress={goToLogin}
            style={styles.backButton}
            hitSlop={10}
          >
            <ChevronLeft size={16} color="#D9C77E" strokeWidth={1.8} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: contentInset },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.formContent, compact && styles.compactForm]}>
              <View style={[styles.heading, compact && styles.compactHeading]}>
                <Text style={styles.eyebrow}>P A P O L O N A</Text>
                <Text style={styles.title}>Forgot your password?</Text>
                <Text style={styles.subtitle}>
                  Enter the email address connected to your account. We’ll send
                  you a code to reset your password.
                </Text>
              </View>

              <View style={styles.inputWrapper}>
                <AuthTextInput
                  appearance="glass"
                  label="Email"
                  required
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="send"
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    if (error) setError('');
                  }}
                  onSubmitEditing={sendOtp}
                  editable={!isSubmitting}
                  leftIcon={<Mail size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
              </View>

              <AppButton
                title="Send OTP"
                onPress={sendOtp}
                loading={isSubmitting}
                disabled={!email.trim()}
                variant="secondary"
                style={styles.submitButton}
                textStyle={styles.submitText}
                rightIcon={
                  <View style={styles.arrowCircle}>
                    <ArrowRight size={17} color="#E8E8D8" />
                  </View>
                }
              />

              {error ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={goToLogin}
                hitSlop={8}
                style={styles.backToLogin}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default ForgotPassword;

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
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 28,
  },
  formContent: { width: '100%', maxWidth: 390, alignSelf: 'center' },
  compactForm: { paddingVertical: 4 },
  heading: { marginBottom: 24 },
  compactHeading: { marginBottom: 18 },
  eyebrow: {
    color: '#D6C77F',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 11,
  },
  title: {
    color: '#F0E7D1',
    fontFamily: 'serif',
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '400',
    letterSpacing: -0.5,
    maxWidth: 310,
  },
  subtitle: {
    color: 'rgba(211, 216, 207, 0.70)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 300,
  },
  inputWrapper: { marginBottom: 18 },
  inputContainer: {
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(166, 187, 137, 0.46)',
    borderRadius: 13,
    backgroundColor: 'rgba(12, 19, 13, 0.62)',
  },
  input: { color: '#E8E8D8', fontSize: 12, minHeight: 40 },
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
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  backToLogin: { alignSelf: 'center', marginTop: 20, padding: 6 },
  backToLoginText: { color: '#E1C77D', fontSize: 12, fontWeight: '600' },
});
