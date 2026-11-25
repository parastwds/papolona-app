import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CLUE_FONT } from '@/theme/fonts';
import { font, hp, wp } from '@/utils/responsive';
import { ApiRequestError, getErrorMessage } from '@/services/api';
import {
  PromptAllowance,
  PromptOption,
  Reading,
  promptReading,
} from '@/services/session';

interface CluePromptProps {
  reading: Reading;
  // This month's prompts; undefined while unknown.
  prompts?: PromptAllowance;
  // The reading as saved with its splits, and the allowance after this prompt.
  onPrompted: (reading: Reading, prompts: PromptAllowance) => void;
  // The split the member prefers.
  onChoose: (option: PromptOption) => void;
  onClose: () => void;
  // Device time (ms) when the split options open: five minutes after the draw.
  opensAt?: number;
  // Opened by itself at five minutes: takes the prompt straight away.
  autoAsk?: boolean;
}

/** "HELL-OW": the parts of a split, in order. */
export const splitLabel = (option: PromptOption) =>
  option.parts.map(p => p.part).join('-');

/** The chosen split as a start for the interpretation, for the member to finish. */
export const splitDraft = (option: PromptOption) =>
  `${splitLabel(option)}: ${option.parts
    .map(p => `${p.part} = ${p.meaning}`)
    .join('; ')}. `;

/** "87 of 90 prompts left this month". */
export const promptsLeftText = (prompts: PromptAllowance) =>
  `${prompts.remaining} of ${prompts.limit} prompts left this month`;

/** "4:05": minutes and seconds left. */
const minutesLeft = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The split options. They open five minutes after the draw: tapped earlier,
 * the sheet counts down. Tapped later it asks whether to use one (working
 * without them is best); opened by itself at five minutes it takes one at
 * once. Either way the prompt counts against the month. Then it offers a few
 * ways to split the clue as multiple choice; the member taps the split they
 * prefer and interprets it themselves.
 */
const CluePrompt = ({
  reading,
  prompts,
  onPrompted,
  onChoose,
  onClose,
  opensAt,
  autoAsk = false,
}: CluePromptProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const options = reading.prompt ?? null;
  const usedUp = !options && prompts !== undefined && prompts.remaining <= 0;
  // Ticks while the options are not open yet.
  const [now, setNow] = useState(Date.now());
  const waiting = !options && opensAt !== undefined && opensAt > now;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  const ask = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await promptReading(reading.id);
      onPrompted(result.reading, result.prompts);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'NO_PROMPTS_LEFT') {
        const details = err.details as
          | { prompts?: PromptAllowance }
          | undefined;
        if (details?.prompts) onPrompted(reading, details.prompts);
      }
      setError(getErrorMessage(err, 'Could not get a prompt. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Opened by itself: the options are shown without asking.
  const autoAsked = useRef(false);
  useEffect(() => {
    if (!autoAsk || autoAsked.current || options || usedUp || waiting) return;
    autoAsked.current = true;
    ask();
    // ask only once, when the sheet opens by itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk, options, usedUp, waiting]);

  return (
    <View>
      <Text accessibilityRole="header" style={styles.title}>
        {options ? 'Choose a split' : autoAsk ? 'Split options' : 'Need a prompt?'}
      </Text>
      <Text style={styles.clue}>{reading.clue}</Text>

      {options ? (
        <>
          <Text style={styles.body}>
            Tap the split that speaks to you. Then say what it means to you and
            combine the parts into one message.
          </Text>
          {options.map(option => (
            <Pressable
              key={splitLabel(option)}
              accessibilityRole="button"
              accessibilityLabel={`Split ${option.parts
                .map(p => p.part.split('').join(' '))
                .join(', ')}`}
              onPress={() => onChoose(option)}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionSplit}>{splitLabel(option)}</Text>
              {option.parts.map(part => (
                <Text key={part.part} style={styles.optionPart}>
                  <Text style={styles.optionPartLetters}>{part.part}</Text>
                  {`  ${part.meaning}`}
                </Text>
              ))}
            </Pressable>
          ))}
        </>
      ) : autoAsk && !usedUp && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#E8D58A" />
          <Text style={styles.body}>Five minutes have passed: finding ways to split your clue…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.body}>
            {waiting
              ? `Trust your own split first. If you have not written anything, the split options open by themselves in ${minutesLeft((opensAt ?? 0) - now)}.`
              : 'It is best to work without prompts: trust your own split first. When you are stuck, a prompt offers a few ways to split the clue, and you choose the one you prefer.'}
          </Text>
          {prompts ? (
            <Text style={styles.count}>{promptsLeftText(prompts)}</Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Try on my own</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: usedUp || waiting, busy: isLoading }}
              disabled={usedUp || waiting}
              onPress={ask}
              style={({ pressed }) => [
                styles.primary,
                (usedUp || waiting) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#172016" />
              ) : (
                <Text style={styles.primaryText}>
                  {usedUp
                    ? 'None left'
                    : waiting
                    ? `Opens in ${minutesLeft((opensAt ?? 0) - now)}`
                    : 'Use a prompt'}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default CluePrompt;

const styles = StyleSheet.create({
  title: { color: '#F1EEE0', fontFamily: 'serif', fontSize: font(20) },
  clue: {
    marginTop: hp(10),
    color: '#E8D58A',
    fontFamily: CLUE_FONT,
    fontSize: font(26),
    letterSpacing: 4,
  },
  body: {
    marginTop: hp(10),
    color: '#CDD6C6',
    fontSize: font(14),
    lineHeight: font(21),
  },
  count: {
    marginTop: hp(12),
    color: '#A1BE94',
    fontSize: font(14),
    fontWeight: '600',
  },
  actions: { flexDirection: 'row', gap: wp(12), marginTop: hp(18) },
  primary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#D9C77E',
  },
  primaryText: { color: '#172016', fontSize: font(15), fontWeight: '700' },
  secondary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.6)',
  },
  secondaryText: { color: '#E8D58A', fontSize: font(15), fontWeight: '600' },
  disabled: { opacity: 0.45 },
  loading: { alignItems: 'center', gap: hp(8), marginTop: hp(18) },
  option: {
    marginTop: hp(12),
    paddingVertical: hp(12),
    paddingHorizontal: wp(14),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.35)',
    backgroundColor: 'rgba(23, 32, 22, 0.55)',
  },
  optionSplit: {
    color: '#F1EEE0',
    fontFamily: CLUE_FONT,
    fontSize: font(20),
    letterSpacing: 2,
  },
  optionPart: {
    marginTop: hp(4),
    color: '#B4B8AB',
    fontSize: font(14),
    lineHeight: font(20),
  },
  optionPartLetters: { color: '#E8D58A', fontWeight: '700' },
  pressed: { opacity: 0.75 },
  error: { marginTop: hp(10), color: '#E2A09A', fontSize: font(13) },
});
