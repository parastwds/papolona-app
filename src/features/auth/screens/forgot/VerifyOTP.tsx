import React, { useEffect, useRef, useState } from 'react';
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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import { getErrorMessage } from '@/services/api';
import {
  requestPasswordReset,
  verifyPasswordResetCode,
} from '@/services/session';
import OTPInputText, { OTPInputHandle } from '../../components/OTPInputText';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackNavigationProp<RootStackParamList, 'VerifyOTP'>;

const formatSeconds = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`;

const VerifyOTP = () => {
  const navigation = useNavigation<Props>();
  const { email, resendAfterSeconds, expiresInMinutes } =
    useRoute<RouteProp<RootStackParamList, 'VerifyOTP'>>().params;
  const scrollRef = useRef<ScrollView>(null);
  const otpRef = useRef<OTPInputHandle>(null);
  // Seconds until another code can be requested.
  const [timer, setTimer] = useState(resendAfterSeconds);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer(value => value - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(SCREENS.forgotPassword);
  };

  const verifyCode = async (enteredCode = code) => {
    if (isVerifying) return;
    if (!/^\d{6}$/.test(enteredCode)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setError('');
    setNotice('');
    setIsVerifying(true);
    try {
      await verifyPasswordResetCode(email, enteredCode);
      navigation.navigate(SCREENS.newPassword, { email, code: enteredCode });
    } catch (verifyError) {
      setError(
        getErrorMessage(verifyError, 'Unable to verify the code. Try again.'),
      );
      otpRef.current?.clear();
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    if (timer > 0 || isResending) return;
    setError('');
    setNotice('');
    setIsResending(true);
    try {
      const sent = await requestPasswordReset(email);
      setTimer(sent.resendAfterSeconds);
      setNotice('A new code is on its way.');
      otpRef.current?.clear();
    } catch (resendError) {
      setError(
        getErrorMessage(resendError, 'Unable to resend the code. Try again.'),
      );
    } finally {
      setIsResending(false);
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
            accessibilityLabel="Go back"
            onPress={goBack}
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
                <Text style={styles.title}>Verify your code</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit verification code sent to your email
                  address.
                </Text>
                <Text style={styles.email}>{email}</Text>
              </View>

              <View style={styles.otpWrapper}>
                <OTPInputText
                  ref={otpRef}
                  appearance="glass"
                  onChange={value => {
                    setCode(value);
                    if (error) setError('');
                  }}
                  onComplete={verifyCode}
                />
              </View>

              <View style={styles.timerRow}>
                <Text style={styles.timerText}>
                  The code is valid for {expiresInMinutes} minutes.
                </Text>
              </View>

              <AppButton
                title="Verify OTP"
                onPress={() => verifyCode()}
                loading={isVerifying}
                disabled={code.length !== 6}
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
              {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn’t receive the code?</Text>
                {timer > 0 ? (
                  <Text style={styles.timerValue}>
                    Resend in {formatSeconds(timer)}
                  </Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isResending}
                    onPress={resendCode}
                    hitSlop={8}
                  >
                    <Text style={styles.resendLink}>
                      {isResending ? 'Sending…' : 'Resend OTP'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default VerifyOTP;

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
    paddingTop: 20,
    paddingBottom: 28,
  },
  formContent: { width: '100%', maxWidth: 390, alignSelf: 'center' },
  compactForm: { paddingVertical: 4 },
  heading: { marginBottom: 28 },
  compactHeading: { marginBottom: 20 },
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
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(211, 216, 207, 0.70)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 310,
  },
  email: { color: '#D9C77E', fontSize: 12, marginTop: 10 },
  otpWrapper: { marginBottom: 18 },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginBottom: 18,
  },
  timerText: { color: 'rgba(205, 214, 198, 0.72)', fontSize: 12 },
  timerValue: { color: '#D9C77E', fontSize: 12, fontWeight: '600' },
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
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 18,
  },
  resendText: { color: 'rgba(205, 214, 198, 0.62)', fontSize: 11 },
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  noticeText: {
    color: '#A9CF95',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  resendLink: { color: '#E1C77D', fontSize: 11, fontWeight: '600' },
});
