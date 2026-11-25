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
  Smartphone,
  UserRound,
} from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import AuthTextInput from '../components/TextInput';
import OAuthButtons from '../components/OAuthButtons';
import {
  getQuestionnaireSubmissionId,
  register,
  signInWithGoogle,
} from '@/services/session';
import { ApiRequestError } from '@/services/api';
import ButterflyBackground from '@/components/ButterflyBackground';
import { normalizePhone, phoneProblem } from '@/utils/phone';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

const Signup = ({ navigation, route }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [questionnaireMissing, setQuestionnaireMissing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const contentInset = Math.max(24, Math.min(48, width * 0.11));

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(SCREENS.login);
  };
  const goToLogin = () => navigation.replace(SCREENS.login);

  // Creates the account from this questionnaire, or logs in if the Google
  // account (or its email) already has one.
  const googleHandler = async () => {
    if (isGoogleLoading || isSubmitting) return;
    setError('');
    setQuestionnaireMissing(false);
    // Google shares no number, so a new account takes the one typed here. Left empty, an
    // existing Google account still signs in; a new one is asked for the number below.
    if (phone.trim()) {
      const problem = phoneProblem(phone);
      if (problem) {
        setError(problem);
        return;
      }
    }
    const submissionId =
      route.params?.questionnaireSubmissionId ||
      (await getQuestionnaireSubmissionId());
    if (!submissionId) {
      setQuestionnaireMissing(true);
      setError(
        'We could not find your questionnaire answers. Please complete the questionnaire again.',
      );
      return;
    }
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(
        submissionId,
        normalizePhone(phone) || undefined,
      );
      if (result) {
        navigation.reset({ index: 0, routes: [{ name: SCREENS.mainTabs }] });
      }
    } catch (googleError) {
      setQuestionnaireMissing(
        googleError instanceof ApiRequestError &&
          (googleError.code === 'QUESTIONNAIRE_INVALID' ||
            googleError.code === 'QUESTIONNAIRE_ALREADY_USED'),
      );
      setError(
        googleError instanceof ApiRequestError &&
          googleError.code === 'PHONE_REQUIRED'
          ? 'Enter your mobile number above, then continue with Google again.'
          : googleError instanceof Error
          ? googleError.message
          : 'Google sign-in failed. Please try again.',
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const createAccount = async () => {
    if (isSubmitting) return;
    setQuestionnaireMissing(false);
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Enter your name, email, mobile number and password to continue.');
      return;
    }
    const phoneError = phoneProblem(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError('Password must be between 8 and 72 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must include at least one letter and one number.');
      return;
    }
    setError('');
    setQuestionnaireMissing(false);
    setIsSubmitting(true);
    try {
      await register(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: normalizePhone(phone),
          password,
        },
        route.params?.questionnaireSubmissionId,
      );
      navigation.reset({ index: 0, routes: [{ name: SCREENS.mainTabs }] });
    } catch (registerError) {
      const message =
        registerError instanceof Error
          ? registerError.message
          : 'Unable to create your account. Please try again.';
      setQuestionnaireMissing(
        message.includes('could not find your questionnaire submission'),
      );
      if (
        registerError instanceof ApiRequestError &&
        registerError.code === 'VALIDATION_ERROR' &&
        Array.isArray(registerError.details)
      ) {
        const fieldMessages = registerError.details
          .map((detail: unknown) => {
            if (
              detail &&
              typeof detail === 'object' &&
              'message' in detail &&
              typeof detail.message === 'string'
            ) {
              return detail.message;
            }
            return null;
          })
          .filter((fieldMessage): fieldMessage is string =>
            Boolean(fieldMessage),
          );
        setError(fieldMessages.join('\n') || registerError.message);
      } else {
        setError(message);
      }
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.subtitle}>
                  Join a community curious about art, nature and perception.
                </Text>
              </View>

              <View
                style={[styles.inputWrapper, compact && styles.compactInputs]}
              >
                <AuthTextInput
                  appearance="glass"
                  label="Full name"
                  required
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<UserRound size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
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
                  label="Mobile number"
                  required
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  value={phone}
                  onChangeText={setPhone}
                  leftIcon={<Smartphone size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
                <Text style={styles.passwordHint}>
                  Include your country code. It only places you, by country, on
                  the members' world map.
                </Text>
                <AuthTextInput
                  appearance="glass"
                  label="Password"
                  required
                  placeholder="Create a password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={createAccount}
                  leftIcon={<LockKeyhole size={17} color="#8E9C87" />}
                  scrollViewRef={scrollRef}
                  inputContainerStyle={styles.inputContainer}
                  style={styles.input}
                />
                <Text style={styles.passwordHint}>
                  Use 8–72 characters, including at least one letter and one
                  number.
                </Text>
              </View>

              <AppButton
                title="Create account"
                onPress={createAccount}
                loading={isSubmitting}
                disabled={
                  !name.trim() || !email.trim() || !phone.trim() || !password
                }
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
                <>
                  <Text accessibilityRole="alert" style={styles.errorText}>
                    {error}
                  </Text>
                  {questionnaireMissing ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        navigation.reset({
                          index: 0,
                          routes: [{ name: SCREENS.questionnaire }],
                        })
                      }
                      style={styles.retryQuestionnaireButton}
                    >
                      <Text style={styles.retryQuestionnaireText}>
                        Return to questionnaire
                      </Text>
                    </Pressable>
                  ) : null}
                </>
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

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={goToLogin}
                  hitSlop={8}
                >
                  <Text style={styles.loginLink}>Log in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

export default Signup;

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
    paddingTop: 28,
    paddingBottom: 28,
  },
  formContent: { width: '100%', maxWidth: 390, alignSelf: 'center' },
  compactForm: { paddingVertical: 4 },
  heading: { marginBottom: 20 },
  compactHeading: { marginBottom: 15 },
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
    fontSize: 32,
    lineHeight: 38,
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
  inputWrapper: { gap: 12, marginBottom: 17 },
  compactInputs: { gap: 10, marginBottom: 14 },
  inputContainer: {
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(166, 187, 137, 0.46)',
    borderRadius: 13,
    backgroundColor: 'rgba(12, 19, 13, 0.62)',
  },
  input: { color: '#E8E8D8', fontSize: 12, minHeight: 40 },
  passwordHint: {
    marginTop: -5,
    color: 'rgba(211, 216, 207, 0.68)',
    fontSize: 10,
    lineHeight: 14,
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
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  retryQuestionnaireButton: {
    alignSelf: 'center',
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  retryQuestionnaireText: {
    color: '#E1C77D',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
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
    marginTop: 17,
    marginBottom: 12,
  },
  compactDivider: { marginTop: 13, marginBottom: 10 },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(186, 199, 155, 0.30)',
  },
  dividerText: { color: 'rgba(207, 211, 196, 0.60)', fontSize: 11 },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 17,
  },
  loginText: { color: 'rgba(205, 214, 198, 0.62)', fontSize: 11 },
  loginLink: { color: '#E1C77D', fontSize: 11, fontWeight: '600' },
});
