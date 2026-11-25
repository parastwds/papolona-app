import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Mic,
  PenLine,
  Square,
} from 'lucide-react-native';

import { ACCENT, COLORS as THEME_COLORS } from '@/theme/colors';
import { CLUE_FONT } from '@/theme/fonts';
import CustomHeader from '@/components/CustomHeader';
import { font, hp, wp } from '@/utils/responsive';
import { speechModule, useSpeechEvent } from '@/services/speechRecognition';
import { ApiRequestError, getErrorMessage } from '@/services/api';
import {
  ClueStatus,
  JournalEntrySource as EntrySource,
  NftSeries,
  PromptAllowance,
  PromptOption,
  Reading,
  ProbationProgress,
  createJournalEntry,
  generateClueString,
  interpretReading,
} from '@/services/session';
import {
  useActiveSeries,
  useClueStatus,
  useJournalEntries,
  useProbation,
  useReadings,
} from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import SeriesBox from '@/features/series/component/SeriesBox';
import { hasEmblems, rarityOf } from '@/features/series/artworks';
import ActiveThreads, { DiscoveryItem } from '../component/ActiveThreads';
import JournalCalendar from '../component/JournalCalendar';
import MonthTile from '../component/MonthTile';
import AppBottomModal from '@/components/AppBottomModal';
import ReadingRating from '../component/ReadingRating';
import ReadingTimeLeft from '../component/ReadingTimeLeft';
import CluePrompt, { promptsLeftText, splitDraft } from '../component/CluePrompt';
import { PENDING_ID_PREFIX, useJournalCache } from '../journalCache';
import { JournalDay, dayTitle, formatTime, groupByDay } from '../journalDays';

type VoiceStatus = 'idle' | 'recording';

// Notes can be any length; this only guards against runaway pastes, and
// matches the server's limit.
const MAX_ENTRY_LENGTH = 50000;
// Photos per note, as the server allows.
// The judge needs enough to work with: the split, the meanings and the message.
const MIN_INTERPRETATION_LENGTH = 15;


// Errors that mean listening can't continue, so we stop instead of restarting.
const FATAL_ERRORS: ExpoSpeechRecognitionErrorCode[] = [
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
  'audio-capture',
];

const joinText = (...parts: string[]) =>
  parts
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');

// Sent with each new entry so a retried save can't create a duplicate.
const newClientId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// A day of the journal as an Active Thread card.
const toThreadItem = (day: JournalDay): DiscoveryItem => ({
  id: day.day,
  title: dayTitle(day.day),
  source: day.clues.join(' · ') || undefined,
  readings: `${day.entries.length} ${
    day.entries.length === 1 ? 'entry' : 'entries'
  }`,
  lastActivity: `last ${formatTime(day.lastAt)}`,
  image: firstPhoto(day),
});

// The day's first photo, if any, as its thread's thumbnail.
function firstPhoto(day: JournalDay) {
  const url = day.entries.find(entry => entry.photos?.length)?.photos[0]?.url;
  return url ? { uri: url } : undefined;
}

const JournalTab = () => {
  const [mode, setMode] = useState<EntrySource>('text');
  const [draft, setDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  // The question today's clue is drawn for; left blank, Papolona responds to
  // the member's predicament.
  const [question, setQuestion] = useState('');
  // The sheet open over the page: the full calendar, the rating for today's
  // reading, the prompt for today's clue, or none.
  const [sheet, setSheet] = useState<'calendar' | 'rating' | 'prompt' | null>(
    null,
  );
  // Steps opened or closed by hand; the others follow where the day stands.
  const [stepOpen, setStepOpen] = useState<
    Partial<Record<SectionKey, boolean>>
  >(
    {},
  );
  const [isJudging, setIsJudging] = useState(false);
  // Whether any of the interpretation being written came from speaking.
  const [spokeInterpretation, setSpokeInterpretation] = useState(false);
  const probation = useProbation();
  const isMember = probation.data?.status === 'member';
  // Members draw their clues inside a series, so the Journal needs to know of one.
  const activeSeries = useActiveSeries(isMember);
  // The series today's judged reading belonged to, as the judge left it.
  const [judgedSeries, setJudgedSeries] = useState<NftSeries | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const queryClient = useQueryClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const journal = useJournalEntries();
  const entries = journal.data?.pages.flatMap(page => page.entries) ?? [];
  // Each local day is one Active Thread, newest first.
  const days = groupByDay(entries);
  const { editEntries, refetchJournal, invalidateInsights } = useJournalCache();
  // The reading shown in the modal (null = closed) and the latest one drawn.
  const [clue, setClue] = useState<Reading | null>(null);
  const [lastClue, setLastClue] = useState<Reading | null>(null);
  const readings = useReadings();
  const [isGeneratingClue, setIsGeneratingClue] = useState(false);
  // A reading judged in this visit stays on the question card, with its verdict,
  // until the user asks another question.
  const [keptJudgedId, setKeptJudgedId] = useState<string | null>(null);
  // A failed reading the user left for a new one, and one they chose to review
  // and resubmit.
  const [leftId, setLeftId] = useState<string | null>(null);
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  // The reading on the question card: the latest clue while it waits for its
  // interpretation (only the latest can be interpreted), a failed one that can
  // still be resubmitted, or one judged in this visit.
  const shownReading =
    lastClue &&
    lastClue.id !== leftId &&
    (!lastClue.interpretation ||
      canResubmit(lastClue) ||
      keptJudgedId === lastClue.id)
      ? lastClue
      : null;
  // The clue waits for an interpretation, a first one or a resubmission the
  // user chose: the composer asks for it, and the AI judges it.
  // Not once its 12 hours are up: then it has failed.
  const awaitingInterpretation =
    shownReading !== null &&
    !shownReading.expired &&
    (!shownReading.interpretation ||
      (resubmitId === shownReading.id && canResubmit(shownReading)));
  // Still to be completed (passed): the time left shows on the card.
  const readingOpen =
    shownReading !== null &&
    !shownReading.expired &&
    (!shownReading.interpretation || canResubmit(shownReading));
  const readingDeadline =
    shownReading && readingOpen ? deadlineOf(shownReading) : null;
  // The question comes first: nobody interprets until a clue is drawn for it.
  // A member may start a series first, but needn't.
  const clueDrawn = shownReading !== null;
  const canCapture = clueDrawn;
  const scrollRef = useRef<ScrollView>(null);
  // Where the path, and the last step within it, sit on the page.
  const pathYRef = useRef(0);
  const captureYRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  // Finalised text from every recognition segment of the current entry.
  const committedRef = useRef('');
  // In-progress (not yet final) text from the current segment.
  const interimRef = useRef('');
  // True from "Start speaking" until "Stop" is pressed.
  const shouldListenRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const isRecording = voiceStatus === 'recording';

  const refreshTranscript = () =>
    setLiveTranscript(joinText(committedRef.current, interimRef.current));

  // Shows the entry at once, then saves it. Notes are text only. Returns false
  // (with the reason in the status line) if it wasn't saved, so the caller can
  // keep the words. A note written while today's clue is current belongs to
  // that clue straight away.
  const saveEntry = async (text: string, source: EntrySource) => {
    const clientId = newClientId();
    const currentClue = shownReading
      ? { clue: shownReading.clue, generatedAt: shownReading.generatedAt }
      : null;
    await queryClient.cancelQueries({ queryKey: queryKeys.journalEntries });
    editEntries((pageEntries, index) =>
      index === 0
        ? [
            {
              id: `${PENDING_ID_PREFIX}${clientId}`,
              clientId,
              text,
              source,
              createdAt: new Date().toISOString(),
              clue: currentClue,
              photos: [],
            },
            ...pageEntries,
          ]
        : pageEntries,
    );
    try {
      const saved = await createJournalEntry({ text, source, clientId });
      if (!queryClient.getQueryData(queryKeys.journalEntries)) refetchJournal();
      editEntries(pageEntries =>
        pageEntries.map(item => (item.clientId === clientId ? saved : item)),
      );
      invalidateInsights();
      queryClient.invalidateQueries({ queryKey: queryKeys.journalCalendarAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
      return true;
    } catch (error) {
      editEntries(pageEntries =>
        pageEntries.filter(item => item.clientId !== clientId),
      );
      setStatusMessage(
        getErrorMessage(error, 'Could not save this entry. Please try again.'),
      );
      return false;
    }
  };

  const startListening = () => {
    if (!speechModule) return;
    try {
      speechModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        },
      });
    } catch (startError) {
      shouldListenRef.current = false;
      startedAtRef.current = null;
      setVoiceStatus('idle');
      setStatusMessage(
        startError instanceof Error
          ? startError.message
          : 'Could not start listening.',
      );
    }
  };

  useSpeechEvent('start', () => {
    if (shouldListenRef.current) setStatusMessage('Listening… speak freely.');
  });

  useSpeechEvent('result', event => {
    // Ignore late results arriving after Stop; the entry is already saved.
    if (!shouldListenRef.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      committedRef.current = joinText(committedRef.current, transcript);
      interimRef.current = '';
    } else {
      interimRef.current = transcript;
    }
    refreshTranscript();
  });

  useSpeechEvent('error', event => {
    if (event.error === 'aborted') return;
    if (FATAL_ERRORS.includes(event.error)) {
      shouldListenRef.current = false;
      startedAtRef.current = null;
      setVoiceStatus('idle');
      setStatusMessage(
        event.error === 'not-allowed'
          ? 'Microphone or speech permission was denied. Enable it in Settings.'
          : `Speech recognition stopped: ${event.message}`,
      );
    }
    // Silence and transient errors are ignored; 'end' restarts listening.
  });

  useSpeechEvent('end', () => {
    if (!shouldListenRef.current) return;
    // Keep any unfinished words from the segment that just ended.
    if (interimRef.current) {
      committedRef.current = joinText(committedRef.current, interimRef.current);
      interimRef.current = '';
      refreshTranscript();
    }
    // The recogniser ends on its own after pauses; keep going until Stop.
    startListening();
  });

  useEffect(
    () => () => {
      shouldListenRef.current = false;
      speechModule?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    if (!speechModule) {
      setStatusMessage(
        'Voice journaling needs the Papolona development build; it is not available in Expo Go.',
      );
      return;
    }
    const permission = await speechModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage(
        'Microphone and speech permission are needed to journal by voice.',
      );
      return;
    }
    setElapsedSeconds(0);
    committedRef.current = '';
    interimRef.current = '';
    setLiveTranscript('');
    startedAtRef.current = Date.now();
    shouldListenRef.current = true;
    setVoiceStatus('recording');
    setStatusMessage('Starting microphone…');
    startListening();
  };

  const stopRecording = () => {
    if (!isRecording) return;
    shouldListenRef.current = false;
    // stop() lets the recogniser deliver its last result; abort() would drop it.
    speechModule?.stop();
    startedAtRef.current = null;
    setVoiceStatus('idle');
    const transcript = joinText(committedRef.current, interimRef.current);
    committedRef.current = '';
    interimRef.current = '';
    setLiveTranscript('');
    if (!transcript) {
      setStatusMessage('Nothing was heard. Tap Start speaking and try again.');
      return;
    }
    if (awaitingInterpretation) {
      setMode('text');
      setDraft(current => joinText(current, transcript));
      setSpokeInterpretation(true);
      setStatusMessage(
        'Your words are in Write. Check them, then tap Submit.',
      );
      return;
    }
    setStatusMessage('Saving to your journal…');
    saveEntry(transcript, 'voice').then(saved => {
      if (saved) {
        setStatusMessage('Saved to your journal.');
        return;
      }
      // Keep the spoken words: they move to Write, ready to save again.
      setMode('text');
      setDraft(current => joinText(current, transcript));
      setStatusMessage(message => `${message} Your words were moved to Write.`);
    });
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Cached, and refetched only when stale, so returning from a thread doesn't
  // call the server again. If it can't load, the button still works: the
  // server checks the last clue was interpreted.
  const clueStatus = useClueStatus();
  useEffect(() => {
    if (clueStatus.data) setLastClue(clueStatus.data.lastClue);
  }, [clueStatus.data]);

  // Keeps the prompt allowance the status already had: drawing a clue doesn't change it.
  const cacheClueStatus = (status: ClueStatus) =>
    queryClient.setQueryData<ClueStatus>(queryKeys.clueStatus, old => ({
      prompts: old?.prompts,
      ...status,
    }));

  // This month's prompts: 90 while an apprentice, 30 once a member.
  const prompts = clueStatus.data?.prompts;

  // The split options open five minutes after the draw. If nothing has been
  // written by then they open by themselves (once per clue); each prompt taken
  // counts against the month.
  const promptOpensAt = shownReading ? promptOpensAtOf(shownReading) : null;
  const [autoPromptId, setAutoPromptId] = useState<string | null>(null);
  const autoPromptedRef = useRef<string | null>(null);
  const draftRef = useRef('');
  draftRef.current = draft;
  const firstAttemptId =
    shownReading &&
    awaitingInterpretation &&
    !shownReading.interpretation &&
    !shownReading.prompt
      ? shownReading.id
      : null;
  const promptsRemaining = prompts?.remaining ?? 0;
  useEffect(() => {
    if (
      !firstAttemptId ||
      promptOpensAt === null ||
      promptsRemaining <= 0 ||
      autoPromptedRef.current === firstAttemptId
    )
      return;
    const open = () => {
      // Writing their own interpretation: leave them to it.
      if (draftRef.current.trim()) return;
      autoPromptedRef.current = firstAttemptId;
      setAutoPromptId(firstAttemptId);
      setClue(null);
      setSheet(current => current ?? 'prompt');
    };
    const wait = promptOpensAt - Date.now();
    if (wait <= 0) {
      open();
      return;
    }
    const timer = setTimeout(open, wait);
    return () => clearTimeout(timer);
  }, [firstAttemptId, promptOpensAt, promptsRemaining]);
  // A prompt was given (or the allowance re-read): today's reading and the count.
  const onPrompted = (reading: Reading, allowance: PromptAllowance) => {
    cacheLastClue(reading);
    setLastClue(reading);
    queryClient.setQueryData<ClueStatus>(
      queryKeys.clueStatus,
      status => status && { ...status, prompts: allowance },
    );
  };
  // The member picked the split they prefer: it starts their interpretation.
  const onChooseSplit = (option: PromptOption) => {
    setSheet(null);
    setDraft(current =>
      current.trim() ? `${current.trimEnd()}
${splitDraft(option)}` : splitDraft(option),
    );
    setSpokeInterpretation(false);
    openComposer('text');
  };

  // The count of prompts left pops into the interpretation field for a moment
  // when a clue waits for its interpretation: best to work without them.
  const promptFlash = useRef(new Animated.Value(0)).current;
  const [promptFlashOn, setPromptFlashOn] = useState(false);
  const flashedForRef = useRef<string | null>(null);
  // Only once the clue modal is closed, so the field is in view.
  const awaitingId =
    awaitingInterpretation && clue === null ? shownReading?.id ?? null : null;
  useEffect(() => {
    if (!awaitingId || !prompts || flashedForRef.current === awaitingId) return;
    flashedForRef.current = awaitingId;
    setPromptFlashOn(true);
    const run = Animated.sequence([
      Animated.timing(promptFlash, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(4000),
      Animated.timing(promptFlash, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => finished && setPromptFlashOn(false));
    return () => run.stop();
  }, [awaitingId, prompts, promptFlash]);

  // Puts an updated reading into the cached status.
  const cacheLastClue = (reading: Reading) =>
    queryClient.setQueryData<ClueStatus>(
      queryKeys.clueStatus,
      status =>
        status && {
          ...status,
          canGenerate: !!reading.interpretation,
          lastClue: reading,
        },
    );

  // Pull to refresh: fetches the clue status and entries now, for changes made
  // elsewhere (another device).
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        clueStatus.refetch(),
        journal.refetch(),
        readings.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.probation }),
        queryClient.invalidateQueries({ queryKey: queryKeys.seriesActive }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.journalCalendarAll,
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Draws a clue for the user's question: no limit, once the last one is
  // interpreted. The notes already written are sealed with this clue, and later
  // ones with the next.
  const generateClue = async () => {
    const asked = question.trim();
    if (isGeneratingClue || awaitingInterpretation) return;
    Keyboard.dismiss();
    setIsGeneratingClue(true);
    setStatusMessage('');
    try {
      const result = await generateClueString(asked);
      const sealedWith = { clue: result.clue, generatedAt: result.generatedAt };
      editEntries(pageEntries =>
        pageEntries.map(item =>
          item.clue ? item : { ...item, clue: sealedWith },
        ),
      );
      const reading: Reading = {
        id: result.id,
        clue: result.clue,
        question: result.question,
        generatedAt: result.generatedAt,
        interpretation: result.interpretation ?? null,
        ratings: result.ratings ?? null,
        seriesId: result.seriesId ?? null,
        prompt: result.prompt ?? null,
        attempts: result.attempts,
        attemptsLeft: result.attemptsLeft,
        maxAttempts: result.maxAttempts,
        promptAvailableAt: result.promptAvailableAt,
        deadlineAt: result.deadlineAt,
        expired: result.expired,
      };
      // The clue is part of the day's reading, and one more reading toward membership.
      invalidateInsights();
      queryClient.invalidateQueries({ queryKey: queryKeys.probation });
      queryClient.invalidateQueries({ queryKey: queryKeys.readings });
      queryClient.invalidateQueries({ queryKey: queryKeys.journalCalendarAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
      // A clue drawn during a series joins it and moves its deadline on.
      if (result.series) {
        queryClient.setQueryData(queryKeys.seriesActive, result.series);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.seriesActive });
      }
      setJudgedSeries(null);
      setResubmitId(null);
      // Sets today's clue without asking the server again.
      cacheClueStatus({ canGenerate: false, lastClue: reading });
      setQuestion('');
      setClue(reading);
    } catch (error) {
      // The last clue still waits for its interpretation: show it again.
      if (
        error instanceof ApiRequestError &&
        error.code === 'INTERPRET_FIRST'
      ) {
        clueStatus.refetch();
      }
      setStatusMessage(
        getErrorMessage(error, 'Could not draw a clue. Please try again.'),
      );
    } finally {
      setIsGeneratingClue(false);
    }
  };

  // Sends the interpretation of today's clue to the AI judge. A pass counts
  // toward graduation; a fail may be reviewed and resubmitted, three judgements
  // in all. The last failed attempt closes the reading (and fails a member's
  // series).
  const submitInterpretation = async () => {
    const text = draft.trim();
    if (isJudging || !lastClue || text.length < MIN_INTERPRETATION_LENGTH)
      return;
    Keyboard.dismiss();
    setIsJudging(true);
    setStatusMessage('The judge is reading your interpretation…');
    try {
      const result = await interpretReading(lastClue.id, {
        text,
        source: spokeInterpretation ? 'voice' : 'text',
      });
      cacheLastClue(result.reading);
      // The verdict stays on the question card until the next question.
      setKeptJudgedId(result.reading.id);
      setResubmitId(null);
      // The verdict lands with the question, so that part opens to show it.
      setStepOpen(open => ({ ...open, question: true }));
      // Then asks how the reading felt, once the verdict has had a moment:
      // only once it is final (passed, or out of attempts).
      if (!canResubmit(result.reading)) {
        setTimeout(() => setSheet('rating'), 900);
      }
      queryClient.setQueryData<ProbationProgress>(
        queryKeys.probation,
        result.probation,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.readings });
      queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
      // A pass in a series revealed a tile; the last one completes it.
      if (result.series) {
        queryClient.setQueryData(
          queryKeys.seriesActive,
          result.series.status === 'active' ? result.series : null,
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
      }
      setJudgedSeries(result.series ?? null);
      setLastClue(result.reading);
      setDraft('');
      setSpokeInterpretation(false);
      setStatusMessage('');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'ALREADY_JUDGED' ||
          error.code === 'READING_CLOSED' ||
          error.code === 'NO_ATTEMPTS_LEFT' ||
          error.code === 'READING_EXPIRED')
      ) {
        clueStatus.refetch();
      }
      setStatusMessage(
        getErrorMessage(
          error,
          'Could not reach the judge. Your words are kept; please try again.',
        ),
      );
    } finally {
      setIsJudging(false);
    }
  };

  // Reopens a failed interpretation, with its words, to review and resubmit.
  const startResubmit = (reading: Reading) => {
    setResubmitId(reading.id);
    setDraft(reading.interpretation?.text ?? '');
    setSpokeInterpretation(false);
    setStatusMessage('');
    setStepOpen(open => ({ ...open, interpretation: true }));
    setTimeout(() => openComposer('text'), 0);
  };

  // The 12 hours ran out: the server now counts the reading as failed (and a
  // member's series with it).
  const onTimeUp = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.clueStatus });
    queryClient.invalidateQueries({ queryKey: queryKeys.seriesActive });
    queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
    setResubmitId(null);
  }, [queryClient]);

  // Leaves today's reading (judged) for a new question.
  const startNewReading = (reading: Reading) => {
    setKeptJudgedId(null);
    setResubmitId(null);
    setLeftId(reading.id);
    setDraft('');
  };

  // Saves the written note for today.
  const saveNote = async () => {
    const text = draft.trim();
    if (isSavingNote || !text) return;
    Keyboard.dismiss();
    setIsSavingNote(true);
    setStatusMessage('');
    try {
      if (await saveEntry(text, 'text')) {
        setDraft('');
        setStatusMessage('Saved to your journal.');
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const switchMode = (next: EntrySource) => {
    if (isRecording || next === mode) return;
    setMode(next);
    setStatusMessage('');
  };

  // Opens the interpretation to write or to speak, and brings it into view.
  const openComposer = (next: EntrySource) => {
    if (!canCapture && !isRecording) return;
    if (!isRecording) setMode(next);
    setStepOpen(open => ({ ...open, interpretation: true }));
    scrollRef.current?.scrollTo({
      y: Math.max(0, pathYRef.current + captureYRef.current - hp(12)),
      animated: true,
    });
    if (next === 'text') setTimeout(() => inputRef.current?.focus(), 300);
  };

  // Header button: stops a recording in progress, otherwise opens the writer.
  const onHeaderAction = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    openComposer('text');
  };

  // A thread's id is its day (YYYY-MM-DD).
  const openThread = (item: DiscoveryItem) =>
    navigation.navigate(SCREENS.journalThread, { day: item.id });
  const openDay = (day: string) =>
    navigation.navigate(SCREENS.journalThread, { day });

  const renderModeToggle = () => (
    <View style={styles.modeToggle}>
      {(
        [
          { key: 'text', label: 'Write', Icon: PenLine },
          { key: 'voice', label: 'Speak', Icon: Mic },
        ] as const
      ).map(({ key, label, Icon }) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active, disabled: isRecording }}
            disabled={isRecording}
            onPress={() => switchMode(key)}
            style={[
              styles.modeOption,
              active && styles.modeOptionActive,
              isRecording && !active && styles.modeOptionDisabled,
            ]}
          >
            <Icon
              size={18}
              color={active ? COLORS.gold : COLORS.cream}
              strokeWidth={1.7}
            />
          </Pressable>
        );
      })}
    </View>
  );

  const renderWriter = () => (
    <>
      <View style={styles.inputBox}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={
            awaitingInterpretation
              ? 'e.g. SSOT-DU: SSOT = Single Source Of Truth; DU = French for "from". Combined: everything comes from one true source.'
              : 'Journal your conclusions to set up a new question…'
          }
          placeholderTextColor="rgba(205, 214, 198, 0.42)"
          multiline
          maxLength={MAX_ENTRY_LENGTH}
          textAlignVertical="top"
          style={styles.input}
        />
        {awaitingInterpretation && promptFlashOn && prompts ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.promptFlash, { opacity: promptFlash }]}
          >
            <Text style={styles.promptFlashText}>
              {promptsLeftText(prompts)}
            </Text>
            <Text style={styles.promptFlashHint}>
              Best to work without them. Tap your clue if you need one.
            </Text>
          </Animated.View>
        ) : null}
        {/* Only near the limit: notes can otherwise be any length. */}
        {draft.length > MAX_ENTRY_LENGTH * 0.9 && (
          <Text style={styles.counter}>
            {draft.length}/{MAX_ENTRY_LENGTH}
          </Text>
        )}
      </View>
    </>
  );

  const renderInterpretationActions = () => {
    const canSubmit =
      !isJudging && draft.trim().length >= MIN_INTERPRETATION_LENGTH;
    return (
      <View style={styles.writerActions}>
        {draft.length > 0 && !isJudging && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft('');
              setSpokeInterpretation(false);
            }}
            hitSlop={8}
          >
            <Text style={styles.linkText}>Clear</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit"
          accessibilityState={{ busy: isJudging, disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submitInterpretation}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.saveButton,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isJudging ? (
            <ActivityIndicator size="small" color={COLORS.onGold} />
          ) : (
            <Text style={styles.primaryButtonText}>Submit</Text>
          )}
        </Pressable>
      </View>
    );
  };

  // Write only: Speak saves when Stop is tapped.
  const renderNoteActions = () => {
    const canSave = !isSavingNote && draft.trim().length > 0;
    return (
      <View style={styles.writerActions}>
        {draft.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft('')}
            hitSlop={8}
          >
            <Text style={styles.linkText}>Clear</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save note"
          accessibilityState={{ busy: isSavingNote, disabled: !canSave }}
          disabled={!canSave}
          onPress={saveNote}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.saveButton,
            !canSave && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {isSavingNote ? (
            <ActivityIndicator size="small" color={COLORS.onGold} />
          ) : (
            <Text style={styles.primaryButtonText}>Save note</Text>
          )}
        </Pressable>
      </View>
    );
  };

  const renderSpeaker = () => (
    <>
      <Text style={styles.cardDescription}>
        {awaitingInterpretation
          ? 'Speak your interpretation. When you tap Stop, your words go to Write so you can check them before submitting.'
          : 'Speak and your words appear as you talk. Listening continues through pauses until you tap Stop. Audio is not saved, only the text.'}
      </Text>

      <Pressable
        onPress={toggleRecording}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Stop and save' : 'Start speaking'}
        style={({ pressed }) => [
          styles.recordButton,
          isRecording && styles.recordButtonActive,
          pressed && styles.pressed,
        ]}
      >
        {isRecording ? (
          <Square size={15} color={COLORS.onGold} fill={COLORS.onGold} />
        ) : (
          <Mic size={17} color={COLORS.cream} strokeWidth={1.8} />
        )}
        <Text
          style={[
            styles.recordButtonText,
            isRecording && styles.recordButtonTextActive,
          ]}
        >
          {isRecording
            ? awaitingInterpretation
              ? 'Stop'
              : 'Stop & save'
            : 'Start speaking'}
        </Text>
      </Pressable>

      {isRecording && (
        <View style={styles.recordingMeta}>
          <View style={styles.liveDot} />
          <Text style={styles.recordingLabel}>Listening</Text>
          <Text style={styles.elapsedLabel}>
            {formatDuration(elapsedSeconds)}
          </Text>
        </View>
      )}

      <View style={styles.transcriptBox}>
        {liveTranscript ? (
          <Text style={styles.transcriptText}>{liveTranscript}</Text>
        ) : (
          <Text style={styles.transcriptPlaceholder}>
            {isRecording
              ? 'Listening… start speaking.'
              : 'Your spoken words will appear here.'}
          </Text>
        )}
      </View>
    </>
  );

  // Step three, on the page: the interpretation while today's clue waits for
  // one, and notes after that.
  const renderComposer = () => (
    <View style={styles.composer}>
      <View style={styles.composerHead}>
        <Text style={[styles.cardDescription, styles.flex]}>
          {awaitingInterpretation
            ? 'Split the clue string into bites you intuitively believe are meaningful, describe what each bite means, and combine them into one message.'
            : ''}
        </Text>
        {renderModeToggle()}
      </View>
      {mode === 'text' ? renderWriter() : renderSpeaker()}
      {mode === 'text' &&
        (awaitingInterpretation
          ? renderInterpretationActions()
          : renderNoteActions())}
      {statusMessage ? (
        <Text style={styles.statusText}>{statusMessage}</Text>
      ) : null}
    </View>
  );

  // The judge's verdict on today's interpretation, with how it read the split.
  // A saved rating updates today's reading everywhere it is shown.
  const onRated = (reading: Reading) => {
    cacheLastClue(reading);
    setLastClue(reading);
    setSheet(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.readings });
    queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
  };

  const renderVerdict = (reading: Reading) => {
    const result = reading.interpretation;
    if (!result) return null;
    const passed = result.verdict === 'pass';
    const progress = probation.data;
    const max = reading.maxAttempts ?? MAX_ATTEMPTS;
    const left = reading.attemptsLeft ?? 0;
    return (
      <View style={styles.verdict}>
        <View style={[styles.verdictBadge, !passed && styles.verdictBadgeFail]}>
          <Text
            style={[styles.verdictBadgeText, !passed && styles.verdictFailText]}
          >
            {passed ? 'Passed' : 'Not passed'}
          </Text>
        </View>
        {result.parts.length > 0 && (
          <View style={styles.verdictParts}>
            {result.parts.map(part => (
              <Text key={part.part} style={styles.verdictPart}>
                <Text style={styles.verdictPartLetters}>{part.part}</Text>
                {'  '}
                {part.meaning}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.verdictFeedback}>{result.feedback}</Text>
        {!passed && (
          <Text style={styles.verdictDays}>
            {reading.expired ? EXPIRED_TEXT : attemptsText(left, max)}
          </Text>
        )}
        {progress && progress.status !== 'member' && (
          <Text style={styles.verdictDays}>
            {progress.readingsDone >= progress.readingsRequired
              ? `Apprenticeship complete: ${progress.readingsDone} readings passed. Once you join, your prompts go from 90 to 30 a month.`
              : passed
              ? `Apprenticeship: ${progress.readingsDone} of ${progress.readingsRequired} readings passed.`
              : `Apprenticeship stays at ${progress.readingsDone} of ${progress.readingsRequired}.`}
          </Text>
        )}
        {judgedSeries && judgedSeries.id === lastClue?.seriesId && (
          <Text
            style={[
              styles.verdictDays,
              judgedSeries.status === 'failed' && styles.verdictFailText,
            ]}
          >
            {judgedSeries.status === 'completed'
              ? completionText(judgedSeries)
              : judgedSeries.status === 'failed'
              ? `Your series has failed: this reading failed all ${max} attempts. ${
                  judgedSeries.revealedCount > 0
                    ? `Its ${judgedSeries.revealedCount} ${
                        judgedSeries.revealedCount === 1 ? 'emblem stays' : 'emblems stay'
                      } in your gallery, but it can never become an NFT.`
                    : 'You can start a new series.'
                }`
              : passed
              ? `A butterfly lights up: ${judgedSeries.revealedCount} of ${judgedSeries.length} in your series.`
              : `No butterfly this time: ${judgedSeries.revealedCount} of ${judgedSeries.length} lit.`}
          </Text>
        )}
      </View>
    );
  };

  // The head of today's block: the date as a diary leaf, big numeral first, with
  // where the day's clue stands at the right.
  const renderDayHead = (status: React.ReactNode) => {
    const now = new Date();
    return (
      <View style={styles.dayHead}>
        <Text style={styles.dayNumeral}>{now.getDate()}</Text>
        <View style={styles.flex}>
          <Text style={styles.dayWeekday}>
            {now.toLocaleDateString([], { weekday: 'long' })}
          </Text>
          <Text style={styles.dayMonth}>
            {now.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        {status ? <View style={styles.dayStatus}>{status}</View> : null}
      </View>
    );
  };

  // The clue's letters as tiles in a row: empty until the clue is drawn.
  const renderClueTiles = (letters: string | null) => (
    <View style={styles.tiles}>
      {Array.from({ length: letters ? letters.length : 6 }, (_, i) => {
        const letter = letters?.[i];
        return (
          <View key={i} style={[styles.tile, !!letter && styles.tileFilled]}>
            {letter ? (
              <Text style={styles.tileLetter}>{letter}</Text>
            ) : (
              <View style={styles.tileDot} />
            )}
          </View>
        );
      })}
    </View>
  );

  // Before the draw: the user asks a question (or for advice) and draws the
  // clue on demand. After it: today's clue and question, until the next one.
  const renderTodaysReading = () => {
    if (shownReading) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your clue: ${shownReading.clue.split('').join(' ')}`}
          onPress={() => setClue(shownReading)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {renderDayHead(
            readingDeadline !== null ? (
              <ReadingTimeLeft
                until={readingDeadline}
                onDone={onTimeUp}
                style={styles.dayStatusText}
                urgentStyle={styles.dayStatusUrgent}
              />
            ) : null,
          )}
          {awaitingInterpretation ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Your clue: ${shownReading.clue
                .split('')
                .join(' ')}. Tap for a prompt.`}
              onPress={() => setSheet('prompt')}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {renderClueTiles(shownReading.clue)}
              <Text style={styles.promptHint}>
                {shownReading.prompt
                  ? 'Tap the clue to see your prompt again'
                  : promptOpensAt !== null && promptOpensAt > Date.now()
                    ? `Split options open 5 minutes after the draw${
                        prompts ? ` · ${prompts.remaining} left` : ''
                      }`
                    : prompts
                      ? `Tap the clue for a prompt · ${prompts.remaining} left`
                      : 'Tap the clue for a prompt'}
              </Text>
            </Pressable>
          ) : (
            renderClueTiles(shownReading.clue)
          )}
          {shownReading.question ? (
            <Text style={styles.todaysQuestion} numberOfLines={3}>
              {shownReading.question}
            </Text>
          ) : null}
          {shownReading.interpretation ? (
            <>
              {renderVerdict(shownReading)}
              {/* The rating itself is asked for in a sheet, not shown here. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet('rating')}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.rateLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.linkText}>
                  {shownReading.ratings?.user ? 'Your rating' : 'Rate this reading'}
                </Text>
              </Pressable>
              {awaitingInterpretation ? (
                // Resubmitting: the words are in the interpretation below.
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setResubmitId(null);
                    setDraft('');
                  }}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.rateLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.linkText}>Keep it as it is</Text>
                </Pressable>
              ) : (
                <>
                  {/* A fail with attempts left may be reviewed and resubmitted. */}
                  {canResubmit(shownReading) ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => startResubmit(shownReading)}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        styles.drawButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>
                        REVIEW AND RESUBMIT
                      </Text>
                    </Pressable>
                  ) : null}
                  {/* No daily limit: the next question can follow straight away. */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => startNewReading(shownReading)}
                    style={({ pressed }) => [
                      canResubmit(shownReading)
                        ? styles.secondaryDrawButton
                        : [styles.primaryButton, styles.drawButton],
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={
                        canResubmit(shownReading)
                          ? styles.secondaryDrawText
                          : styles.primaryButtonText
                      }
                    >
                      START NEW READING
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          ) : shownReading.expired ? (
            // Drawn but never interpreted in time.
            <>
              <Text style={[styles.verdictDays, styles.verdictFailText]}>
                {EXPIRED_TEXT}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => startNewReading(shownReading)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.drawButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>START NEW READING</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      );
    }
    const canDraw = !isGeneratingClue;
    return (
      <View>
        {renderDayHead(null)}
        {renderClueTiles(null)}
        {/* One field and one button: the field grows as the question is typed. */}
        <View style={styles.askRow}>
          <View style={[styles.inputBox, styles.askField]}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask your question, or leave it blank and let Papolona respond to your predicament"
              placeholderTextColor="rgba(205, 214, 198, 0.42)"
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={[styles.input, styles.questionInput]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start: get your clue string"
            accessibilityState={{ busy: isGeneratingClue, disabled: !canDraw }}
            disabled={!canDraw}
            onPress={generateClue}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.drawButton,
              !canDraw && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isGeneratingClue ? (
              <ActivityIndicator size="small" color={COLORS.onGold} />
            ) : (
              <Text style={styles.primaryButtonText}>START</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  // A collapsible part of the page: a heading that opens and closes it, with
  // one line on where it stands while closed, and what unlocks it while locked.
  const renderSection = (part: {
    id: SectionKey;
    title: string;
    content: React.ReactNode;
    summary: string;
    defaultOpen: boolean;
    locked?: boolean;
    hint?: string;
    done?: boolean;
  }) => {
    const open = !part.locked && (stepOpen[part.id] ?? part.defaultOpen);
    const Chevron = open ? ChevronUp : ChevronDown;
    return (
      <View key={part.id}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: !!part.locked }}
          disabled={part.locked}
          hitSlop={6}
          onPress={() =>
            setStepOpen(current => ({ ...current, [part.id]: !open }))
          }
          style={styles.partHead}
        >
          <View style={styles.flex}>
            <Text
              style={[styles.partTitle, part.locked && styles.partTitleLocked]}
            >
              {part.title}
            </Text>
            {part.locked ? (
              <Text style={styles.partHint}>{part.hint}</Text>
            ) : open ? null : (
              <Text style={styles.partSummary} numberOfLines={1}>
                {part.summary}
              </Text>
            )}
          </View>
          {part.done ? (
            <Check size={16} color={COLORS.gold} strokeWidth={2.4} />
          ) : null}
          {part.locked ? (
            <Lock size={16} color={COLORS.faint} strokeWidth={1.7} />
          ) : (
            <Chevron size={20} color="#6F8274" strokeWidth={1.6} />
          )}
        </Pressable>
        {/* Kept in place while closed, so what was typed stays. */}
        {part.locked ? null : (
          <View style={[styles.partBody, !open && styles.hidden]}>
            {part.content}
          </View>
        )}
      </View>
    );
  };

  // The day: one card with the question and, attached under it, its
  // interpretation (the clue is drawn for the question, so the question comes
  // first); then, for members, the series in a box of its own. A series is
  // optional: readings can be drawn without one.
  const renderToday = () => {
    // The verdict on the reading the question card shows (none before a draw).
    const judged = shownReading?.interpretation;
    const series = activeSeries.data;
    return (
      <View
        style={styles.today}
        onLayout={event => {
          pathYRef.current = event.nativeEvent.layout.y;
        }}
      >
        <View style={styles.box}>
          {renderSection({
            id: 'question',
            title: clueDrawn ? 'Your question' : 'Ask your question',
            content: renderTodaysReading(),
            summary:
              shownReading
                ? `${shownReading.clue} · ${
                    judged?.verdict === 'pass'
                      ? 'Passed'
                      : shownReading.expired
                      ? 'Time is up'
                      : judged
                      ? 'Not passed'
                      : 'Not interpreted yet'
                  }`
                : 'Ask a question, or leave it blank, and tap START',
            // Closed once judged; a verdict that has just arrived opens it.
            defaultOpen: !judged,
            done: clueDrawn,
          })}
          <View style={styles.partDivider} />
          <View
            onLayout={event => {
              captureYRef.current = event.nativeEvent.layout.y;
            }}
          >
            {renderSection({
              id: 'interpretation',
              title: judged ? 'Notes on your reading' : 'Interpretation',
              content: renderComposer(),
              summary:
                draft.trim() ||
                (awaitingInterpretation
                  ? 'Write or speak your interpretation'
                  : 'Journal your conclusions to set up a new question'),
              defaultOpen: awaitingInterpretation,
              locked: !canCapture,
              hint: 'Split the clue string above into bites you see as meaningful, and give your interpretation of them here.',
              done: judged?.verdict === 'pass',
            })}
          </View>
        </View>
        {isMember ? (
          <View style={[styles.box, styles.seriesBox]}>
            {renderSection({
              id: 'series',
              title: series ? 'Your series' : 'Series',
              content: <SeriesBox />,
              summary: series
                ? `${series.revealedCount} of ${series.length} revealed`
                : 'Optional · single, twin or a level',
              defaultOpen: true,
            })}
          </View>
        ) : null}
      </View>
    );
  };

  // The month across the full width: a day with a reading opens it in the
  // readings gallery, a day with only notes opens its thread.
  const renderCalendar = () => (
    <MonthTile
      onOpenDay={(day, hasReading) =>
        hasReading
          ? navigation.navigate(SCREENS.readingsGallery, { day })
          : openDay(day)
      }
      onOpenCalendar={() => setSheet('calendar')}
    />
  );

  const renderClueModal = () => (
    <Modal
      visible={clue !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setClue(null)}
    >
      <View style={styles.clueBackdrop}>
        <View style={styles.clueCard}>
          <Text style={styles.clueHeading}>Your clue</Text>
          <Text
            style={styles.clueText}
            adjustsFontSizeToFit
            numberOfLines={1}
            accessibilityLabel={
              clue ? clue.clue.split('').join(' ') : undefined
            }
          >
            {clue?.clue}
          </Text>
          {clue?.question ? (
            <Text style={styles.todaysQuestion}>{clue.question}</Text>
          ) : null}
          <Text style={styles.clueHint}>
            Split the clue string into bites that seem meaningful, say what
            each means, and combine them into one message in your journal.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setClue(null)}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.clueCloseButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // Every day the user journaled, newest first; tapping one opens its entries and AI reading.
  const renderThreads = () => {
    let body: React.ReactNode;
    if (journal.isPending) {
      body = <ActivityIndicator color={COLORS.gold} />;
    } else if (journal.isError && entries.length === 0) {
      body = (
        <>
          <Text style={styles.statusText}>
            {getErrorMessage(journal.error, 'Could not load your journal.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => journal.refetch()}
            hitSlop={8}
            style={styles.loadMore}
          >
            <Text style={styles.linkText}>Try again</Text>
          </Pressable>
        </>
      );
    } else if (days.length === 0) {
      body = (
        <Text style={styles.emptyThreads}>
          Each day you write or speak becomes a thread here.
        </Text>
      );
    } else {
      body = (
        <View style={styles.threadList}>
          {days.map((day, index) => (
            <ActiveThreads
              key={day.day}
              item={toThreadItem(day)}
              onPress={openThread}
              first={index === 0}
              last={index === days.length - 1 && !journal.hasNextPage}
            />
          ))}
          {journal.hasNextPage && (
            <Pressable
              accessibilityRole="button"
              disabled={journal.isFetchingNextPage}
              onPress={() => journal.fetchNextPage()}
              hitSlop={8}
              style={styles.loadMore}
            >
              {journal.isFetchingNextPage ? (
                <ActivityIndicator size="small" color={COLORS.gold} />
              ) : (
                <Text style={styles.linkText}>Show older days</Text>
              )}
            </Pressable>
          )}
        </View>
      );
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Threads</Text>
        {body}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../../../../assets/login_bg.png')}
      resizeMode="cover"
      // Steps back slightly while a sheet is open over the page.
      style={[styles.background, sheet !== null && styles.blurred]}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.flex} edges={['top']}>
          <CustomHeader
            title={
              <>
                My <Text style={styles.headerAccent}>Individuation</Text> journal
              </>
            }
            txtStyle={styles.headerTitle}
            rightIcon={
              canCapture || isRecording ? (
                <Pressable
                  onPress={onHeaderAction}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isRecording ? 'Stop and save' : 'Write a new entry'
                  }
                  style={({ pressed }) => [
                    styles.headerButton,
                    isRecording && styles.headerButtonRecording,
                    pressed && styles.pressed,
                  ]}
                >
                  {isRecording ? (
                    <Square
                      size={14}
                      color={COLORS.onGold}
                      fill={COLORS.onGold}
                    />
                  ) : (
                    <PenLine size={22} color={COLORS.cream} strokeWidth={1.7} />
                  )}
                </Pressable>
              ) : undefined
            }
          />

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshAll}
                tintColor={COLORS.gold}
                colors={[COLORS.goldButton]}
                progressBackgroundColor="#0B120D"
              />
            }
          >
            {renderToday()}
            {renderCalendar()}
            {renderThreads()}

            {/* <View style={styles.researchCard}>
              <View style={styles.researchHeading}>
                <Sparkles size={15} color={COLORS.gold} strokeWidth={1.7} />
                <Text style={styles.researchTitle}>Research contribution</Text>
              </View>
              <Text style={styles.researchText}>
                Your experiences remain private unless you explicitly contribute
                them to research. Aggregation is described as anonymised in the
                supplied architecture.
              </Text>
            </View> */}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
      {/* How the reading felt: asked once the judge has given a verdict. */}
      <AppBottomModal
        visible={sheet === 'rating' && !!lastClue?.interpretation}
        onClose={() => setSheet(null)}
        background={SHEET_ARTWORK}
      >
        {lastClue?.interpretation ? (
          <ReadingRating
            key={lastClue.id}
            reading={lastClue}
            onRated={onRated}
            plain
          />
        ) : null}
      </AppBottomModal>

      {/* Tapping the clue for a prompt: multiple-choice splits. */}
      <AppBottomModal
        visible={sheet === 'prompt' && awaitingInterpretation}
        onClose={() => setSheet(null)}
        background={SHEET_ARTWORK}
      >
        {shownReading && awaitingInterpretation ? (
          <CluePrompt
            key={shownReading.id}
            reading={shownReading}
            prompts={prompts}
            onPrompted={onPrompted}
            onChoose={onChooseSplit}
            onClose={() => setSheet(null)}
            opensAt={promptOpensAt ?? undefined}
            autoAsk={autoPromptId === shownReading.id}
          />
        ) : null}
      </AppBottomModal>

      {/* The full calendar, opened from the month tile. */}
      <AppBottomModal
        visible={sheet === 'calendar'}
        onClose={() => setSheet(null)}
        background={SHEET_ARTWORK}
      >
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Calendar
        </Text>
        <JournalCalendar
          fill
          onOpenDay={day => {
            setSheet(null);
            openDay(day);
          }}
          onToday={() => {
            setSheet(null);
            openComposer('text');
          }}
        />
      </AppBottomModal>

      {renderClueModal()}
    </ImageBackground>
  );
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// A reading is judged at most this many times (older backends don't say).
const MAX_ATTEMPTS = 3;
// The split options open this long after the draw.
const PROMPT_DELAY_MS = 5 * 60 * 1000;

/** A failed reading with attempts left: it may be reviewed and resubmitted. */
function canResubmit(reading: Reading) {
  return (
    reading.interpretation?.verdict === 'fail' && (reading.attemptsLeft ?? 0) > 0
  );
}

/** When the split options open, on this device's clock. */
function promptOpensAtOf(reading: Reading) {
  const at = reading.promptAvailableAt
    ? Date.parse(reading.promptAvailableAt)
    : NaN;
  return Number.isNaN(at) ? Date.parse(reading.generatedAt) + PROMPT_DELAY_MS : at;
}

// A reading must be passed within this long of its draw (older backends don't say).
const READING_WINDOW_MS = 12 * 60 * 60 * 1000;
const EXPIRED_TEXT =
  'Time is up: this reading was not completed within 12 hours, so it has failed. Start a new reading.';

/** When the reading must be completed by, on this device's clock. */
function deadlineOf(reading: Reading) {
  const at = reading.deadlineAt ? Date.parse(reading.deadlineAt) : NaN;
  return Number.isNaN(at)
    ? Date.parse(reading.generatedAt) + READING_WINDOW_MS
    : at;
}

/** Under a fail: how many attempts are left. */
function attemptsText(left: number, max: number) {
  if (left <= 0) {
    return `All ${max} attempts used: this reading is closed. Start a new reading.`;
  }
  return `${left} ${left === 1 ? 'attempt' : 'attempts'} left: review and resubmit your interpretation, or start a new reading.`;
}

/** What a completed series earned, for the verdict card. */
function completionText(series: NftSeries) {
  if (!series.nftEligible) {
    return hasEmblems(series)
      ? `Your practice series is complete: you earned ${series.length === 1 ? 'its emblem' : 'its emblems'}. Practice emblems stay in your gallery but cannot become an NFT.`
      : `Your practice series is complete: all ${series.length} tiles lit.`;
  }
  const parts = [
    `Your ${rarityOf(
      series.rarity,
    ).label.toLowerCase()} series is complete: all ${series.length} tiles lit.`,
    'You earned a butterfly emblem. Keep it in your gallery or convert it into an NFT.',
    'Find it in Gallery.',
  ];
  return parts.join(' ');
}

export default JournalTab;

// The onboarding artwork: butterflies round the edges, dark and calm in the middle.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

// The collapsible parts of the day, in order.
type SectionKey = 'question' | 'interpretation' | 'series';

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  goldButton: '#D9C77E',
  onGold: '#172016',
  cream: '#F1EEE0',
  sage: '#A1BE94',
  // Cream held back, for descriptions; still clears 4.5:1 on the dark.
  muted: '#B4B8AB',
  faint: '#979C8F',
  danger: '#E2A09A',
  // The edge of a field, and the dark wash under it, so it reads on the artwork.
  outline: 'rgba(161, 190, 148, 0.32)',
  fieldFill: 'rgba(4, 10, 7, 0.5)',
  tonal: 'rgba(232, 213, 138, 0.16)',
};

const styles = StyleSheet.create({
  promptHint: {
    marginTop: hp(8),
    textAlign: 'center',
    color: 'rgba(205, 214, 198, 0.7)',
    fontSize: font(13),
  },
  promptFlash: {
    position: 'absolute',
    left: wp(10),
    right: wp(10),
    bottom: hp(10),
    paddingVertical: hp(8),
    paddingHorizontal: wp(12),
    borderRadius: 12,
    backgroundColor: 'rgba(23, 32, 22, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 199, 126, 0.5)',
  },
  promptFlashText: { color: '#E8D58A', fontSize: font(14), fontWeight: '700' },
  promptFlashHint: {
    marginTop: hp(2),
    color: '#CDD6C6',
    fontSize: font(12.5),
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.bottomBg,
  },
  // As deep as the other tabs': the text here sits on the artwork.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  // Drawn by the platform: Android 12 and later blur, anything else stays sharp.
  blurred: { filter: [{ blur: 1.5 }] },
  flex: { flex: 1 },
  headerTitle: {
    color: COLORS.cream,
    fontSize: font(25),
    fontFamily: 'serif',
  },
  headerAccent: { color: ACCENT.orange },

  // The day: the question card, then the series box.
  today: { width: '90%', alignSelf: 'center', marginTop: hp(8) },
  box: {
    padding: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  seriesBox: { marginTop: hp(16) },
  partHead: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(10),
  },
  partTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  partTitleLocked: { color: COLORS.faint },
  partSummary: { marginTop: 2, color: COLORS.muted, fontSize: font(14) },
  partHint: {
    marginTop: 2,
    color: COLORS.faint,
    fontSize: font(14),
    lineHeight: font(20),
  },
  partBody: { marginTop: hp(6) },
  // Joins the interpretation to its question, inside the one card.
  partDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: hp(12),
    backgroundColor: 'rgba(161, 190, 148, 0.35)',
  },
  // A plain pencil in a 48 touch area; filled gold only while recording, to stop it.
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  headerButtonRecording: {
    backgroundColor: COLORS.goldButton,
  },
  pressed: { opacity: 0.78 },
  scrollContent: {
    // Starts clear of the fade the header lays over the top of the scroll.
    paddingTop: hp(20),
    // Clears the floating tab bar, like the other tabs.
    paddingBottom: hp(120),
  },

  // A quiet box, as on Collect and Discover: a dark wash and one thin edge.
  card: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(12),
    padding: wp(14),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  cardDescription: {
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },

  composerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    marginBottom: hp(8),
  },
  // Write / Speak: one small joined control beside the title, the option in use tinted.
  modeToggle: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
  },
  modeOption: {
    width: 46,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptionActive: { backgroundColor: COLORS.tonal },
  modeOptionDisabled: { opacity: 0.4 },

  inputBox: {
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    backgroundColor: COLORS.fieldFill,
    paddingHorizontal: wp(14),
    paddingTop: hp(10),
    paddingBottom: hp(8),
  },
  input: {
    minHeight: hp(84),
    maxHeight: hp(260),
    padding: 0,
    color: COLORS.cream,
    fontSize: font(16),
    lineHeight: font(23),
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: hp(6),
    color: COLORS.faint,
    fontSize: font(12),
    fontVariant: ['tabular-nums'],
  },
  writerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: wp(20),
    marginTop: hp(10),
  },
  primaryButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.goldButton,
  },
  saveButton: { minWidth: wp(140), paddingHorizontal: wp(22) },
  primaryButtonText: {
    color: COLORS.onGold,
    fontSize: font(15),
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.45 },

  clueBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(20),
    backgroundColor: 'rgba(0, 5, 2, 0.9)',
  },
  // The drawn clue on its own: one thin gold edge, the letters doing the rest.
  clueCard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: wp(20),
    paddingVertical: hp(32),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.5)',
    borderRadius: 20,
    backgroundColor: 'rgba(8, 14, 10, 0.96)',
  },
  clueHeading: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  clueText: {
    marginTop: hp(18),
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(48),
    letterSpacing: 8,
    textAlign: 'center',
  },
  clueHint: {
    marginTop: hp(18),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
    textAlign: 'center',
  },
  // The date as a diary leaf: the numeral large, the day and month beside it.
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
  },
  dayNumeral: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(40),
    lineHeight: font(46),
    fontVariant: ['tabular-nums'],
  },
  dayWeekday: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(17),
  },
  dayMonth: { marginTop: 2, color: COLORS.muted, fontSize: font(13) },
  dayStatus: { alignItems: 'flex-end' },
  dayStatusText: {
    color: COLORS.sage,
    fontSize: font(13),
    lineHeight: font(18),
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  // The last hour of a reading's 12.
  dayStatusUrgent: { color: COLORS.danger },
  // Six tiles for six letters: hollow until drawn, then lit.
  tiles: {
    flexDirection: 'row',
    gap: wp(6),
    marginTop: hp(10),
  },
  tile: {
    flex: 1,
    aspectRatio: 1.12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 10,
    backgroundColor: COLORS.fieldFill,
  },
  tileFilled: {
    borderColor: 'rgba(232, 213, 138, 0.55)',
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  tileLetter: {
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(22),
  },
  tileDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(161, 190, 148, 0.45)',
  },
  todaysQuestion: {
    alignSelf: 'stretch',
    marginTop: hp(10),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: font(16),
    lineHeight: font(23),
    textAlign: 'center',
  },
  verdict: { alignSelf: 'stretch', alignItems: 'center', marginTop: hp(16) },
  // The judge's verdict as a word with a dot, not a filled pill.
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.tonal,
  },
  verdictBadgeFail: {
    backgroundColor: 'rgba(226, 160, 154, 0.14)',
  },
  verdictBadgeText: {
    color: COLORS.gold,
    fontSize: font(14),
    fontWeight: '600',
  },
  verdictFailText: { color: COLORS.danger },
  verdictParts: { alignSelf: 'stretch', gap: hp(6), marginTop: hp(14) },
  verdictPart: {
    color: COLORS.cream,
    fontSize: font(15),
    lineHeight: font(22),
  },
  verdictPartLetters: {
    color: COLORS.gold,
    fontFamily: CLUE_FONT,
    fontSize: font(14),
    letterSpacing: 1.5,
  },
  verdictFeedback: {
    marginTop: hp(12),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
    textAlign: 'center',
  },
  verdictDays: {
    marginTop: hp(10),
    color: COLORS.sage,
    fontSize: font(14),
    textAlign: 'center',
  },
  // One line tall until it is used; it grows with what is typed.
  questionInput: {
    minHeight: hp(56),
    fontSize: font(18),
    lineHeight: font(25),
  },
  askRow: { marginTop: hp(12) },
  // The main thing on the block: full width, two lines tall, in larger type.
  askField: { paddingTop: hp(12), paddingBottom: hp(10) },
  drawButton: { height: 48, marginTop: hp(10), borderRadius: 24 },
  // Beside REVIEW AND RESUBMIT: moving on is the quieter choice.
  secondaryDrawButton: {
    height: 48,
    marginTop: hp(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  secondaryDrawText: { color: COLORS.gold, fontSize: font(15), fontWeight: '700' },
  clueCloseButton: {
    alignSelf: 'stretch',
    marginTop: hp(26),
  },
  linkText: { color: COLORS.gold, fontSize: font(15), fontWeight: '600' },

  recordButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: hp(14),
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 24,
    backgroundColor: COLORS.fieldFill,
  },
  recordButtonActive: {
    borderColor: COLORS.goldButton,
    backgroundColor: COLORS.goldButton,
  },
  recordButtonText: {
    color: COLORS.cream,
    fontSize: font(15),
    fontWeight: '600',
  },
  recordButtonTextActive: { color: COLORS.onGold, fontWeight: '700' },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(12),
  },
  liveDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#E75C4A',
    marginRight: 8,
  },
  recordingLabel: {
    color: COLORS.cream,
    fontSize: font(14),
    fontWeight: '600',
  },
  elapsedLabel: {
    color: COLORS.cream,
    fontSize: font(14),
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
  transcriptBox: {
    minHeight: hp(90),
    marginTop: hp(12),
    padding: wp(14),
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    backgroundColor: COLORS.fieldFill,
  },
  transcriptText: {
    color: COLORS.cream,
    fontSize: font(16),
    lineHeight: font(23),
  },
  transcriptPlaceholder: {
    color: COLORS.faint,
    fontSize: font(15),
    lineHeight: font(21),
  },
  statusText: {
    marginTop: hp(12),
    color: COLORS.muted,
    fontSize: font(13),
    lineHeight: font(19),
    textAlign: 'center',
  },

  // Space, not a box, sets each list apart, as on Collect.
  section: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(24),
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionHeading: {
    marginBottom: hp(8),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(20),
  },
  threadList: {},
  sheetTitle: {
    marginBottom: hp(12),
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  hidden: { display: 'none' },
  rateLink: {
    alignSelf: 'center',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: hp(6),
  },
  composer: { marginTop: hp(8) },
  emptyThreads: {
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  loadMore: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: hp(4),
  },

  researchCard: {
    width: '90%',
    alignSelf: 'center',
    marginTop: hp(22),
    paddingVertical: hp(14),
    paddingHorizontal: wp(16),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.22)',
    borderRadius: 16,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  researchHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  researchTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(18),
  },
  researchText: {
    marginTop: hp(8),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
});
