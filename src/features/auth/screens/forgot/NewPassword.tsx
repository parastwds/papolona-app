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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, ChevronLeft, LockKeyhole } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import { getErrorMessage } from '@/services/api';
import { resetPassword } from '@/services/session';
import AuthTextInput from '../../components/TextInput';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackNavigationProp<RootStackParamList, 'NewPassword'>;

// Mirrors the backend's password rules.
const passwordProblem = (password: string) => {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'Use at least one letter and one number.';
  return '';
};

const NewPassword = () => {
  const navigation = useNavigation<Props>();
  const { email, code } =
    useRoute<RouteProp<RootStackParamList, 'NewPassword'>>().params;
  const scrollRef = useRef<ScrollView>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(SCREENS.forgotPassword);
  };
  const handlePasswordReset = async () => {
    if (isSubmitting) return;
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await resetPassword(email, code, password);
      // The code is used up, so going back must not return to this screen.
      navigation.reset({
        index: 1,
        routes: [
          { name: SCREENS.login },
          { name: SCREENS.passwordResetSuccess },
        ],
      });
    } catch (resetError) {
      setError(
        getErrorMessage(
          resetError,
          'Unable to reset your password. Please try again.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearError = () => {
    if (error) setError('');
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
                <Text style={styles.title}>Set a new password</Text>
                <Text style={styles.subtitle}>
                  Choose a strong password to protect your account.
                </Text>
              </View>

              <View style={styles.inputWrapper}>
                <AuthTextInput
                  appearance="glass"
                  label="New password"
                  required
                  placeholder="Create a password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  maxLength={72}
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    clearError();
                  }}
                  editable={!isSubmitting}
                  leftIcon={<LockKeyhole size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
                <AuthTextInput
                  appearance="glass"
                  label="Confirm password"
                  required
                  placeholder="Enter your password again"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="done"
                  maxLength={72}
                  value={confirmPassword}
                  onChangeText={value => {
                    setConfirmPassword(value);
                    clearError();
                  }}
                  onSubmitEditing={handlePasswordReset}
                  editable={!isSubmitting}
                  leftIcon={<LockKeyhole size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
              </View>

              <View style={styles.checkList}>
                <Text style={styles.checkListTitle}>Use a password with:</Text>
                <Text style={styles.checkItem}>• 8 to 72 characters</Text>
                <Text style={styles.checkItem}>
                  • At least one letter and one number
                </Text>
              </View>

              <AppButton
                title="Reset Password"
                onPress={handlePasswordReset}
                loading={isSubmitting}
                disabled={!password || !confirmPassword}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default NewPassword;

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
    fontSize: 36,
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
  inputWrapper: { gap: 14, marginBottom: 16 },
  inputContainer: {
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(166, 187, 137, 0.46)',
    borderRadius: 13,
    backgroundColor: 'rgba(12, 19, 13, 0.62)',
  },
  input: { color: '#E8E8D8', fontSize: 12, minHeight: 40 },
  checkList: { gap: 6, marginBottom: 20 },
  checkListTitle: { color: 'rgba(205, 214, 198, 0.72)', fontSize: 11 },
  checkItem: {
    color: 'rgba(205, 214, 198, 0.65)',
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
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
