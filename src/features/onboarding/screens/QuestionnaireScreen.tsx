import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';

import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation';
import { OPENING_STEPS, TOTAL_INTRO_STEPS } from '../constants';
import { ApiRequestError, apiRequest } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { Questionnaire, questionnaireQuery } from '@/services/queries';
import {
  clearQuestionnaireSubmissionId,
  saveQuestionnaireSubmissionId,
} from '@/services/session';
import EdgeFade from '@/components/EdgeFade';
import ButterflyBackground from '@/components/ButterflyBackground';
import { THIN_TEXT_FONT, TITLE_FONT } from '@/theme/fonts';

type Props = NativeStackScreenProps<RootStackParamList, 'Questionnaire'>;

const QuestionnaireScreen = ({ navigation }: Props) => {
  const queryClient = useQueryClient();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(
    null,
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questions = questionnaire?.questions ?? [];
  const question = questions[questionIndex];
  const selectedOptions = question ? answers[question.key] ?? [] : [];
  const hasAnswer = selectedOptions.length > 0;
  const totalIntroSteps = TOTAL_INTRO_STEPS;
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion =
    questions.length > 0 && questionIndex === questions.length - 1;

  // Served from cache when possible. A background refresh only updates the
  // cache, so the questions never change while someone is answering them.
  const loadQuestionnaire = useCallback(
    async (force = false) => {
      setError('');
      try {
        // Normally: cached questions at once, refreshed in the background when
        // stale (the refresh only updates the cache, not this screen).
        // Forced (retry, or the server has a newer version): wait for the network.
        const data = force
          ? await queryClient.fetchQuery({
              ...questionnaireQuery,
              staleTime: 0,
            })
          : await queryClient.ensureQueryData({
              ...questionnaireQuery,
              revalidateIfStale: true,
            });
        await clearQuestionnaireSubmissionId().catch(() => undefined);
        setQuestionnaire(data);
        setQuestionIndex(0);
        setAnswers({});
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the questionnaire.',
        );
      }
    },
    [queryClient],
  );

  useEffect(() => {
    loadQuestionnaire();
  }, [loadQuestionnaire]);

  const returnToLogin = () => {
    navigation.navigate(SCREENS.login);
  };

  const goBack = useCallback(() => {
    if (isFirstQuestion) {
      navigation.goBack();
      return;
    }

    setQuestionIndex(index => index - 1);
  }, [isFirstQuestion, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (isFirstQuestion) return false;

          goBack();
          return true;
        },
      );

      return () => subscription.remove();
    }, [goBack, isFirstQuestion]),
  );

  // Single-choice replaces the answer; multi-select toggles, and an exclusive
  // option (e.g. "None yet") clears the others and is cleared by them.
  const selectOption = (option: { key: string; exclusive: boolean }) => {
    if (!question) return;
    setAnswers(previous => {
      const current = previous[question.key] ?? [];
      let next: string[];
      if (!question.multiple) {
        next = [option.key];
      } else if (current.includes(option.key)) {
        next = current.filter(key => key !== option.key);
      } else if (option.exclusive) {
        next = [option.key];
      } else {
        const exclusiveKeys = question.options
          .filter(item => item.exclusive)
          .map(item => item.key);
        next = [
          ...current.filter(key => !exclusiveKeys.includes(key)),
          option.key,
        ];
      }
      return { ...previous, [question.key]: next };
    });
  };

  const continueQuestionnaire = async () => {
    if (!question || !hasAnswer || !questionnaire || isSubmitting) return;

    if (isLastQuestion) {
      setIsSubmitting(true);
      setError('');
      try {
        const submission = await apiRequest<{ submissionId: string }>(
          '/onboarding/questionnaire/submit',
          {
            method: 'POST',
            body: JSON.stringify({
              version: questionnaire.version,
              answers: questionnaire.questions.map(item =>
                item.multiple
                  ? { questionKey: item.key, optionKeys: answers[item.key] }
                  : {
                      questionKey: item.key,
                      optionKey: answers[item.key]?.[0],
                    },
              ),
            }),
          },
        );
        await saveQuestionnaireSubmissionId(submission.submissionId).catch(
          () => undefined,
        );
        navigation.navigate(SCREENS.introVideo, {
          questionnaireSubmissionId: submission.submissionId,
        });
      } catch (submitError) {
        if (
          submitError instanceof ApiRequestError &&
          submitError.code === 'QUESTIONNAIRE_OUTDATED'
        ) {
          // The cached questions are older than the server's: fetch the new
          // version and start over.
          await loadQuestionnaire(true);
          setError('The questions were updated. Please answer them again.');
          return;
        }
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Unable to save your answers.',
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setQuestionIndex(index => index + 1);
    setError('');
  };

  return (
    <ButterflyBackground
      style={styles.background}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            hitSlop={10}
            style={styles.headerAction}
          >
            <ChevronLeft size={16} color={COLORS.gold} strokeWidth={1.8} />
            <Text style={styles.headerActionText}>Back</Text>
          </Pressable>

          <Text style={styles.stepCount}>
            {String(OPENING_STEPS + questionIndex + 1).padStart(2, '0')} /{' '}
            {String(totalIntroSteps || 1).padStart(2, '0')}
          </Text>

          {isFirstQuestion ? (
            <Pressable
              accessibilityRole="button"
              onPress={returnToLogin}
              hitSlop={10}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <View style={styles.questionScroll}>
        <ScrollView
          style={styles.questionScroll}
          contentContainerStyle={styles.questionContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {question ? (
            <>
              <Image
                source={require('../../../../assets/papolona_wordmark_gold.webp')}
                contentFit="contain"
                style={styles.eyebrow}
                accessibilityLabel="Papolona"
              />
              <Text style={styles.title}>Question {questionIndex + 1}</Text>
              <Text style={styles.prompt}>{question.prompt}</Text>
              {question.multiple && (
                <Text style={styles.hint}>Select all that apply</Text>
              )}

              <View style={styles.options}>
                {question.options.map(option => {
                  const isSelected = selectedOptions.includes(option.key);

                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole={
                        question.multiple ? 'checkbox' : 'radio'
                      }
                      accessibilityState={
                        question.multiple
                          ? { checked: isSelected }
                          : { selected: isSelected }
                      }
                      onPress={() => selectOption(option)}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && styles.optionSelected,
                        pressed && styles.optionPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          question.multiple && styles.checkbox,
                          isSelected && styles.radioSelected,
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.radioDot,
                              question.multiple && styles.checkboxFill,
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.loadState}>
              {error ? (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    onPress={() => loadQuestionnaire(true)}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </>
              ) : (
                <ActivityIndicator color={COLORS.gold} />
              )}
            </View>
          )}
          {question && error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </ScrollView>
        <EdgeFade />
        </View>

        <View style={styles.footer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((OPENING_STEPS + questionIndex + 1) /
                      (totalIntroSteps || 1)) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isLastQuestion ? 'Save answers and continue' : 'Next question'
            }
            accessibilityState={{
              disabled: !hasAnswer || isSubmitting || !question,
            }}
            disabled={!hasAnswer || isSubmitting || !question}
            onPress={continueQuestionnaire}
            style={({ pressed }) => [
              styles.nextButton,
              (!hasAnswer || isSubmitting || !question) &&
                styles.nextButtonDisabled,
              pressed && styles.nextButtonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.paleGold} />
            ) : (
              <ChevronRight
                size={24}
                color={COLORS.paleGold}
                strokeWidth={1.8}
              />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ButterflyBackground>
  );
};

const COLORS = {
  gold: '#D9C77E',
  paleGold: '#EFE4B3',
  muted: '#A8B09A',
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#020905',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 26,
    backgroundColor: 'rgba(0, 5, 2, 0.28)',
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 52,
  },
  headerAction: {
    minWidth: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActionText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  stepCount: {
    color: COLORS.gold,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  questionScroll: {
    flex: 1,
  },
  questionContent: {
    flexGrow: 1,
    justifyContent: 'center',
    // Pushes the question down so more of the butterfly shows above it.
    paddingTop: '30%',
    // As tall as the EdgeFade, so the last option clears the fade once scrolled to the end.
    paddingBottom: 64,
  },
  // Same size as on the Welcome ("Tap to enter") screen. The wordmark image has transparent space
  // above and below its letters (over a third of its height); the negative margins cancel it.
  eyebrow: {
    width: 240,
    aspectRatio: 2000 / 668,
    alignSelf: 'center',
    marginTop: -26,
    marginBottom: -12,
    // Lifts only the logo; the title and question below stay where they are.
    transform: [{ translateY: -10 }],
  },
  title: {
    color: COLORS.paleGold,
    fontFamily: TITLE_FONT,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 1,
    textAlign: 'center',
  },
  prompt: {
    marginTop: 8,
    marginBottom: 18,
    textAlign: 'center',
    // Brighter than the body text, so the light weight still reads with presence.
    color: '#FFF4DA',
    fontFamily: THIN_TEXT_FONT,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  loadState: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  errorText: {
    color: '#F0A29A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 18,
  },
  retryText: { color: COLORS.paleGold, fontSize: 13 },
  hint: {
    marginTop: -10,
    textAlign: 'center',
    marginBottom: 18,
    color: COLORS.muted,
    fontSize: 12,
  },
  options: {
    gap: 11,
  },
  option: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 194, 146, 0.32)',
    borderRadius: 12,
    backgroundColor: 'rgba(2, 9, 6, 0.72)',
  },
  optionSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(55, 62, 34, 0.68)',
  },
  optionPressed: {
    opacity: 0.82,
  },
  radio: {
    width: 18,
    height: 18,
    marginRight: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.75)',
    borderRadius: 9,
  },
  radioSelected: {
    borderColor: COLORS.gold,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
  checkbox: {
    borderRadius: 4,
  },
  checkboxFill: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  optionText: {
    flex: 1,
    color: '#E0E2D6',
    fontSize: 13,
    lineHeight: 19,
  },
  optionTextSelected: {
    color: COLORS.paleGold,
  },
  footer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(217, 199, 126, 0.24)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
  },
  nextButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 22,
  },
  nextButtonDisabled: {
    opacity: 0.42,
  },
  nextButtonPressed: {
    backgroundColor: 'rgba(217, 199, 126, 0.18)',
  },
});

export default QuestionnaireScreen;
