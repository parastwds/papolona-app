import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import type {
  Reminder,
  ReminderInput,
  ReminderRepeat,
} from '@/services/session';
import { SUB_COLORS as COLORS, Segmented } from './ProfileSubScreen';

const DAYS_AHEAD = 90;
const MINUTE_STEP = 5;
// The onboarding artwork: butterflies round the edges, dark and calm behind the form.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

const REPEATS: { key: ReminderRepeat; label: string }[] = [
  { key: 'none', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const digits = (text: string) => text.replace(/\D/g, '');
const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** The next whole MINUTE_STEP after now plus an hour: a sensible default. */
function defaultTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / MINUTE_STEP) * MINUTE_STEP, 0, 0);
  return d;
}

/** A typed number of at most `max`, or null while the box is empty or over. */
const parsePart = (text: string, max: number) => {
  if (!/^\d{1,2}$/.test(text)) return null;
  const value = Number(text);
  return value <= max ? value : null;
};

interface ReminderEditorProps {
  // The reminder to edit, or null for a new one.
  reminder: Reminder | null;
  onSave: (input: ReminderInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

/**
 * A reminder's title, note, day, time and repeat. The day is picked from a
 * strip of the coming days, and the time is typed as hour and minute.
 */
const ReminderEditor = ({
  reminder,
  onSave,
  onDelete,
  onClose,
}: ReminderEditorProps) => {
  const initial = useMemo(() => {
    const at = reminder ? new Date(reminder.remindAt) : defaultTime();
    if (at.getTime() >= Date.now()) return at;
    // A past one-off being edited starts from the same time tomorrow.
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      at.getHours(),
      at.getMinutes(),
    );
  }, [reminder]);

  const [title, setTitle] = useState(reminder?.title ?? '');
  const [note, setNote] = useState(reminder?.note ?? '');
  const [day, setDay] = useState(startOfDay(initial));
  // Kept as typed, so a box can be emptied on the way to a new value.
  const [hourText, setHourText] = useState(pad(initial.getHours()));
  const [minuteText, setMinuteText] = useState(pad(initial.getMinutes()));
  const [repeat, setRepeat] = useState<ReminderRepeat>(
    reminder?.repeat ?? 'none',
  );
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');

  const today = startOfDay(new Date());
  const days = useMemo(
    () =>
      Array.from(
        { length: DAYS_AHEAD },
        (_, i) =>
          new Date(today.getFullYear(), today.getMonth(), today.getDate() + i),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today.getTime()],
  );
  // Keep a day further out than the strip (an existing reminder) pickable.
  const dayChoices = days.some(d => sameDay(d, day)) ? days : [day, ...days];

  const hour = parsePart(hourText, 23);
  const minute = parsePart(minuteText, 59);
  const when =
    hour === null || minute === null
      ? null
      : new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          hour,
          minute,
        );
  const inPast = !!when && when.getTime() <= Date.now();
  const canSave = title.trim().length > 0 && !!when && !inPast && busy === null;

  const dayLabel = (d: Date) => {
    if (sameDay(d, today)) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (sameDay(d, tomorrow)) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short' });
  };

  const save = async () => {
    if (!canSave || !when) return;
    setBusy('save');
    setError('');
    try {
      await onSave({
        title: title.trim(),
        note: note.trim(),
        remindAt: when.toISOString(),
        repeat,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the reminder.'));
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!onDelete || busy) return;
    setBusy('delete');
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete the reminder.'));
      setBusy(null);
    }
  };

  const close = () => {
    if (!busy) onClose();
  };

  const timePart = (
    label: string,
    text: string,
    onChange: (next: string) => void,
    value: number | null,
  ) => (
    <View>
      <TextInput
        accessibilityLabel={label}
        value={text}
        onChangeText={next => onChange(digits(next))}
        // Typing replaces what is there, and leaving tidies 7 into 07.
        selectTextOnFocus
        onBlur={() => value !== null && onChange(pad(value))}
        keyboardType="number-pad"
        maxLength={2}
        editable={!busy}
        style={[styles.timeInput, value === null && styles.timeInputInvalid]}
      />
    </View>
  );

  const summary = !when
    ? 'Enter a time from 00:00 to 23:59.'
    : inPast
    ? 'That time has passed: pick a later one.'
    : `We'll email you on ${when.toLocaleString([], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })}${
        repeat === 'none'
          ? '.'
          : `, then ${REPEATS.find(
              r => r.key === repeat,
            )!.label.toLowerCase()}.`
      }`;

  return (
    <AppBottomModal visible onClose={close} background={SHEET_ARTWORK}>
      <Text accessibilityRole="header" style={styles.heading}>
        {reminder ? 'Edit reminder' : 'New reminder'}
      </Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What should we remind you of?"
        placeholderTextColor={COLORS.faint}
        maxLength={120}
        editable={!busy}
        style={styles.input}
        accessibilityLabel="Reminder title"
      />

      <Text style={styles.label}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Added to the email (optional)"
        placeholderTextColor={COLORS.faint}
        maxLength={1000}
        multiline
        editable={!busy}
        style={[styles.input, styles.noteInput]}
        accessibilityLabel="Reminder note"
      />

      <Text style={styles.label}>Day</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.dayStrip}
        contentContainerStyle={styles.dayStripContent}
      >
        {dayChoices.map(d => {
          const selected = sameDay(d, day);
          return (
            <Pressable
              key={d.getTime()}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={d.toLocaleDateString([], {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              onPress={() => setDay(d)}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
            >
              <Text
                style={[styles.dayChipTop, selected && styles.selectedText]}
              >
                {dayLabel(d)}
              </Text>
              <Text
                style={[styles.dayChipDate, selected && styles.selectedText]}
              >
                {d.getDate()} {d.toLocaleDateString([], { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>Time</Text>
      <View style={styles.timeRow}>
        {timePart('Hour', hourText, setHourText, hour)}
        <Text style={styles.colon}>:</Text>
        {timePart('Minute', minuteText, setMinuteText, minute)}
        <Text style={styles.timeNote}>24-hour clock</Text>
      </View>

      <Text style={styles.label}>Repeat</Text>
      <View style={styles.repeat}>
        <Segmented
          accessibilityLabel="Repeat"
          options={REPEATS}
          value={repeat}
          onChange={setRepeat}
        />
      </View>

      <Text style={[styles.summary, (!when || inPast) && styles.errorText]}>
        {summary}
      </Text>
      {error ? (
        <Text style={[styles.summary, styles.errorText]}>{error}</Text>
      ) : null}

      <AppButton
        title={reminder ? 'Save changes' : 'Save reminder'}
        onPress={save}
        disabled={!canSave}
        loading={busy === 'save'}
        variant="primary"
        style={styles.saveButton}
        textStyle={styles.saveText}
      />
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          disabled={busy !== null}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          {busy === 'delete' ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <Text style={styles.deleteText}>Delete reminder</Text>
          )}
        </Pressable>
      ) : null}
    </AppBottomModal>
  );
};

export default ReminderEditor;

// A dark wash under each control, so it reads as a surface on the artwork.
const FIELD_FILL = 'rgba(4, 10, 7, 0.5)';

const styles = StyleSheet.create({
  heading: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  // More room above than below, so each label belongs to the control under it.
  label: {
    marginTop: hp(14),
    marginBottom: hp(6),
    color: COLORS.sage,
    fontSize: font(13),
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    color: COLORS.cream,
    fontSize: font(16),
    backgroundColor: FIELD_FILL,
  },
  noteInput: {
    minHeight: 60,
    paddingVertical: 10,
    lineHeight: font(21),
    textAlignVertical: 'top',
  },
  // More days than fit: the strip scrolls sideways within the sheet.
  dayStrip: { flexGrow: 0 },
  dayStripContent: { gap: wp(8) },
  dayChip: {
    minWidth: wp(64),
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: wp(12),
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    backgroundColor: FIELD_FILL,
  },
  // Tinted, not solid: the one solid gold on the sheet is Save.
  dayChipSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  dayChipTop: { color: COLORS.cream, fontSize: font(14), fontWeight: '600' },
  dayChipDate: { marginTop: 1, color: COLORS.muted, fontSize: font(12) },
  selectedText: { color: COLORS.gold },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: wp(8) },
  timeInput: {
    width: 64,
    height: 48,
    padding: 0,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    color: COLORS.cream,
    fontSize: font(22),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    backgroundColor: FIELD_FILL,
  },
  timeInputInvalid: { borderColor: COLORS.red },
  colon: { color: COLORS.muted, fontSize: font(22), fontWeight: '600' },
  timeNote: { marginLeft: wp(6), color: COLORS.faint, fontSize: font(13) },
  repeat: { borderRadius: 12, backgroundColor: FIELD_FILL },
  summary: {
    marginTop: hp(12),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  errorText: { color: COLORS.red },
  saveButton: { marginTop: hp(14), backgroundColor: COLORS.goldSolid },
  saveText: { color: COLORS.onGold },
  delete: {
    minHeight: 48,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  deleteText: { color: COLORS.red, fontSize: font(15), fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
