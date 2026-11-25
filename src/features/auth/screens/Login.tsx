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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowRight,
  ChevronLeft,
  LockKeyhole,
  Mail,
} from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import AuthTextInput from '../components/TextInput';
import OAuthButtons from '../components/OAuthButtons';
import { login as loginSession, signInWithGoogle } from '@/services/session';
import { ApiRequestError } from '@/services/api';
import ButterflyBackground from '@/components/ButterflyBackground';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const Login = ({ navigation }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // A Google account with no Papolona account yet: offer the questionnaire.
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(SCREENS.welcome);
  };
  const loginHandler = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await loginSession(email.trim().toLowerCase(), password);
      navigation.reset({ index: 0, routes: [{ name: SCREENS.mainTabs }] });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to log in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const forgotHandler = () => navigation.navigate(SCREENS.forgotPassword);

  const googleHandler = async () => {
    if (isGoogleLoading || isSubmitting) return;
    setError('');
    setNeedsQuestionnaire(false);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        navigation.reset({ index: 0, routes: [{ name: SCREENS.mainTabs }] });
      }
    } catch (googleError) {
      if (
        googleError instanceof ApiRequestError &&
        googleError.code === 'ACCOUNT_NOT_FOUND'
      ) {
        setNeedsQuestionnaire(true);
        setError(
          'No Papolona account for this Google account yet. Answer a few questions to create one.',
        );
      } else {
        setError(
          googleError instanceof Error
            ? googleError.message
            : 'Google sign-in failed. Please try again.',
        );
      }
    } finally {
      setIsGoogleLoading(false);
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
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Continue your journey into creativity and connection.
                </Text>
              </View>

              <View
                style={[styles.inputWrapper, compact && styles.compactInputs]}
              >
                <AuthTextInput
                  appearance="glass"
                  label="Email"
                  required
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  leftIcon={<Mail size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
                <AuthTextInput
                  appearance="glass"
                  label="Password"
                  required
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={loginHandler}
                  leftIcon={<LockKeyhole size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={forgotHandler}
                style={styles.forgotButton}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <AppButton
                title="Log in"
                onPress={loginHandler}
                loading={isSubmitting}
                disabled={!email.trim() || !password}
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
              {needsQuestionnaire ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(SCREENS.questionnaire)}
                  style={styles.questionnaireButton}
                >
                  <Text style={styles.questionnaireText}>
                    Start the questionnaire
                  </Text>
                </Pressable>
              ) : null}

              <View
                style={[
                  styles.dividerContainer,
                  compact && styles.compactDivider,
                ]}
              >
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.divider} />
              </View>

              <OAuthButtons
                onGooglePress={googleHandler}
                googleLoading={isGoogleLoading}
              />

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>New to Papolona?</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(SCREENS.questionnaire)}
                  hitSlop={8}
                >
                  <Text style={styles.signupLink}>Create an account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default Login;

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
  backText: {
    color: '#A8B09A',
    fontSize: 13,
  },
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
    maxWidth: 290,
  },
  inputWrapper: { gap: 14, marginBottom: 6 },
  compactInputs: { gap: 11, marginBottom: 4 },
  inputContainer: {
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(166, 187, 137, 0.46)',
    borderRadius: 13,
    backgroundColor: 'rgba(12, 19, 13, 0.62)',
  },
  input: { color: '#E8E8D8', fontSize: 12, minHeight: 40 },
  forgotButton: { alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 8 },
  forgotText: { color: '#D6C77F', fontSize: 11 },
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
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  questionnaireButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
    borderRadius: 18,
  },
  questionnaireText: { color: '#E1C77D', fontSize: 12, fontWeight: '600' },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 9, 4, 0.55)',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  compactDivider: { marginTop: 14, marginBottom: 10 },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(186, 199, 155, 0.30)',
  },
  dividerText: { color: 'rgba(207, 211, 196, 0.60)', fontSize: 11 },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 17,
  },
  signupText: { color: 'rgba(205, 214, 198, 0.62)', fontSize: 11 },
  signupLink: { color: '#E1C77D', fontSize: 11, fontWeight: '600' },
});
