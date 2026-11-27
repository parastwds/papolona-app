import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { donate, formatPennies } from '@/services/session';
import ProfileSubScreen, {
  SUB_COLORS,
  SubSection,
  subText,
} from '../component/ProfileSubScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Gifts are in Papolona pennies, like everything in the app.
const PRESETS = [100, 250, 500, 1000, 2500, 5000];
const MIN_CENTS = 100;
const MAX_CENTS = 1000000;

const money = formatPennies;

/** Whole pennies typed in the field; null when it isn't an amount. */
const toCents = (text: string) => {
  const value = Number(text.replace(/[,\s]/g, ''));
  return Number.isInteger(value) && value > 0 ? value : null;
};

/**
 * Support Papolona: a gift of any amount to the ecosystem, from anyone signed
 * in, in pennies. A preset amount or one of the user's own, then a thank-you.
 */
const Donate = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<number | null>(500);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [given, setGiven] = useState<number | null>(null);

  const customCents = custom.trim() ? toCents(custom) : null;
  const amount = custom.trim() ? customCents : preset;
  const valid = amount !== null && amount >= MIN_CENTS && amount <= MAX_CENTS;

  const give = async () => {
    if (!valid || amount === null || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await donate(amount);
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases });
      queryClient.invalidateQueries({ queryKey: queryKeys.penniesAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.membership });
      setGiven(amount);
    } catch (error) {
      setMessage(
        getErrorMessage(
          error,
          'Your gift did not go through. Please try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  if (given !== null) {
    return (
      <ProfileSubScreen title="Support Papolona">
        <SubSection>
          <View style={styles.thanks}>
            <View style={styles.heart}>
              <Heart size={34} color={SUB_COLORS.gold} fill={SUB_COLORS.gold} />
            </View>
            <Text accessibilityRole="header" style={styles.thanksTitle}>
              Thank you
            </Text>
            <Text style={[subText.body, styles.center]}>
              Your gift of {money(given)} goes to the Papolona ecosystem: the
              platform, its members, research into the method and the projects
              chosen together.
            </Text>
            <Text style={[subText.note, styles.center]}>
              You will find it in Membership & purchases.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.button,
                styles.doneButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          </View>
        </SubSection>
      </ProfileSubScreen>
    );
  }

  return (
    <ProfileSubScreen title="Support Papolona">
      <SubSection>
        <Text style={subText.body}>
          Papolona grows with its members. A gift, of any amount, helps keep the
          platform running and goes to member support, research into the method
          and projects chosen through collective guidance.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => navigation.navigate(SCREENS.helpInformation)}
          hitSlop={6}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        >
          <Text style={styles.link}>Where Papolona's share goes</Text>
        </Pressable>
      </SubSection>

      <SubSection title="Choose an amount">
        <View accessibilityRole="radiogroup" style={styles.presets}>
          {PRESETS.map(cents => {
            const on = !custom.trim() && preset === cents;
            return (
              <Pressable
                key={cents}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setPreset(cents);
                  setCustom('');
                }}
                style={({ pressed }) => [
                  styles.preset,
                  on && styles.presetOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.presetText, on && styles.presetTextOn]}>
                  {money(cents)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[subText.rowDescription, styles.otherLabel]}>
          Or your own amount
        </Text>
        <View style={[styles.field, custom.trim() && styles.fieldOn]}>
          <TextInput
            accessibilityLabel="Your own amount in pennies"
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder="e.g. 750"
            placeholderTextColor={SUB_COLORS.faint}
            maxLength={8}
            style={styles.input}
          />
          <Text style={styles.currency}>pennies</Text>
        </View>
        {custom.trim() && !valid ? (
          <Text style={[subText.note, styles.warn]}>
            Choose an amount between {money(MIN_CENTS)} and {money(MAX_CENTS)}.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !valid || busy, busy }}
          disabled={!valid || busy}
          onPress={give}
          style={({ pressed }) => [
            styles.button,
            !valid && !busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={SUB_COLORS.onGold} />
          ) : (
            <View style={styles.buttonRow}>
              <Heart size={18} color={SUB_COLORS.onGold} strokeWidth={2} />
              <Text style={styles.buttonText}>
                {valid && amount !== null ? `Give ${money(amount)}` : 'Give'}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="link"
          onPress={() => navigation.navigate(SCREENS.wallet)}
          hitSlop={6}
          style={({ pressed }) => [styles.more, styles.centerSelf, pressed && styles.pressed]}
        >
          <Text style={styles.link}>Your pennies</Text>
        </Pressable>
        {message ? (
          <Text style={[subText.error, styles.center]}>{message}</Text>
        ) : null}
      </SubSection>
    </ProfileSubScreen>
  );
};

export default Donate;

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  center: { textAlign: 'center' },
  centerSelf: { alignSelf: 'center' },
  warn: { color: SUB_COLORS.red },
  more: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  link: { color: SUB_COLORS.gold, fontSize: font(15), fontWeight: '600' },
  // Three to a row, wrapping: big enough to tap without aiming.
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(10) },
  preset: {
    width: '31%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SUB_COLORS.outline,
    borderRadius: 14,
  },
  presetOn: { borderColor: SUB_COLORS.gold, backgroundColor: SUB_COLORS.tonal },
  presetText: {
    color: SUB_COLORS.cream,
    fontSize: font(18),
    fontWeight: '600',
  },
  presetTextOn: { color: SUB_COLORS.gold },
  otherLabel: { marginTop: hp(18), marginBottom: hp(8) },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: wp(14),
    borderWidth: 1,
    borderColor: SUB_COLORS.outline,
    borderRadius: 14,
  },
  fieldOn: { borderColor: SUB_COLORS.gold },
  currency: { marginLeft: 8, color: SUB_COLORS.gold, fontSize: font(16) },
  input: {
    flex: 1,
    padding: 0,
    color: SUB_COLORS.cream,
    fontSize: font(20),
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(20),
    marginBottom: hp(8),
    borderRadius: 26,
    backgroundColor: SUB_COLORS.goldSolid,
  },
  // The thank-you centres its content; the button still spans the width.
  doneButton: { alignSelf: 'stretch' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: {
    color: SUB_COLORS.onGold,
    fontSize: font(16),
    fontWeight: '700',
  },
  disabled: { opacity: 0.45 },
  thanks: { alignItems: 'center', gap: hp(12), paddingTop: hp(24) },
  heart: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: SUB_COLORS.tonal,
  },
  thanksTitle: {
    color: SUB_COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(28),
  },
});
