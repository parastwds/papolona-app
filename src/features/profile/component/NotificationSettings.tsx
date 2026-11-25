import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useUserSettings } from '@/services/queries';
import {
  RowDivider,
  SUB_COLORS as COLORS,
  SubSection,
  subText,
} from './ProfileSubScreen';
import {
  UserSettings,
  UserSettingsChanges,
  updateUserSettings,
} from '@/services/session';

const NOTIFICATION_ROWS: {
  key: keyof UserSettings['notifications'];
  title: string;
  description: string;
}[] = [
  {
    key: 'readingReminders',
    title: 'Daily reading reminder',
    description:
      "An email at your reminder time if you haven't drawn today's clue.",
  },
  {
    key: 'sequenceDeadline',
    title: 'Apprenticeship milestones',
    description: 'Emails about your progress through the 28 readings.',
  },
  {
    key: 'productUpdates',
    title: 'Papolona updates',
    description: 'New features and changes to the app.',
  },
  {
    key: 'marketing',
    title: 'News and offers',
    description: 'Occasional news about artworks, NFTs and events.',
  },
];

const TIME_STEP = 15;
const pad = (n: number) => String(n).padStart(2, '0');

/** Email notification switches and the daily reading reminder time. */
const NotificationSettings = ({ timeZone }: { timeZone: string }) => {
  const queryClient = useQueryClient();
  const settings = useUserSettings();
  const [time, setTime] = useState<string | null>(null);
  const [savingTime, setSavingTime] = useState(false);
  const [message, setMessage] = useState('');

  const save = async (changes: UserSettingsChanges) => {
    const previous = queryClient.getQueryData<UserSettings>(
      queryKeys.userSettings,
    );
    if (previous) {
      queryClient.setQueryData<UserSettings>(queryKeys.userSettings, {
        ...previous,
        ...(changes.reminderTime && { reminderTime: changes.reminderTime }),
        notifications: { ...previous.notifications, ...changes.notifications },
      });
    }
    setMessage('');
    try {
      queryClient.setQueryData(
        queryKeys.userSettings,
        await updateUserSettings(changes),
      );
    } catch (error) {
      if (previous) queryClient.setQueryData(queryKeys.userSettings, previous);
      setMessage(getErrorMessage(error, 'Could not save your settings.'));
    }
  };

  const shownTime = time ?? settings.data?.reminderTime ?? '09:00';
  const [hour, minute] = shownTime.split(':').map(Number);
  const moveTime = (minutes: number) => {
    const total = (hour * 60 + minute + minutes + 24 * 60) % (24 * 60);
    setTime(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };
  const saveTime = async () => {
    if (!time) return;
    setSavingTime(true);
    await save({ reminderTime: time });
    setSavingTime(false);
    setTime(null);
  };

  const renderRows = () => {
    if (settings.isPending) {
      return <ActivityIndicator style={styles.loading} color={COLORS.gold} />;
    }
    if (!settings.data) {
      return (
        <Text style={subText.error}>
          {getErrorMessage(settings.error, 'Could not load your settings.')}
        </Text>
      );
    }
    const { notifications } = settings.data;
    return NOTIFICATION_ROWS.map((row, index) => (
      <View key={row.key}>
        {index > 0 ? <RowDivider /> : null}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={subText.rowTitle}>{row.title}</Text>
            <Text style={subText.rowDescription}>{row.description}</Text>
          </View>
          <Switch
            value={notifications[row.key]}
            onValueChange={value =>
              save({ notifications: { [row.key]: value } })
            }
            trackColor={{
              false: 'rgba(220, 224, 214, 0.22)',
              true: COLORS.goldSolid,
            }}
            thumbColor={COLORS.cream}
            accessibilityLabel={row.title}
          />
        </View>
        {row.key === 'readingReminders' && notifications.readingReminders && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Email me at</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Earlier"
              onPress={() => moveTime(-TIME_STEP)}
              hitSlop={6}
              android_ripple={STEP_RIPPLE}
              style={styles.stepButton}
            >
              <Minus size={16} color={COLORS.gold} strokeWidth={2} />
            </Pressable>
            <Text style={styles.timeValue}>{shownTime}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Later"
              onPress={() => moveTime(TIME_STEP)}
              hitSlop={6}
              android_ripple={STEP_RIPPLE}
              style={styles.stepButton}
            >
              <Plus size={16} color={COLORS.gold} strokeWidth={2} />
            </Pressable>
            {time && time !== settings.data!.reminderTime ? (
              <Pressable
                accessibilityRole="button"
                onPress={saveTime}
                style={styles.smallSave}
              >
                {savingTime ? (
                  <ActivityIndicator size="small" color={COLORS.onGold} />
                ) : (
                  <Text style={styles.smallSaveText}>Save</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    ));
  };

  return (
    <SubSection title="Email notifications">
      {renderRows()}
      {message ? (
        <Text style={[subText.error, styles.message]}>{message}</Text>
      ) : null}
      <Text style={[subText.note, styles.footnote]}>
        Email times are in {timeZone.replace(/_/g, ' ')}.
      </Text>
    </SubSection>
  );
};

export default NotificationSettings;

const STEP_RIPPLE = { color: COLORS.ripple, borderless: true, radius: 22 };

const styles = StyleSheet.create({
  loading: { marginVertical: hp(16) },
  message: { marginTop: hp(8) },
  footnote: { marginTop: hp(8) },
  toggleRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingVertical: 12,
  },
  toggleText: { flex: 1 },
  // Belongs to the reminder switch above it, so it sits close under that row.
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(8),
    paddingBottom: 14,
  },
  timeLabel: { flex: 1, color: COLORS.muted, fontSize: font(14) },
  stepButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.tonal,
  },
  timeValue: {
    minWidth: wp(64),
    textAlign: 'center',
    color: COLORS.cream,
    fontSize: font(18),
    fontVariant: ['tabular-nums'],
  },
  smallSave: {
    minWidth: 64,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(4),
    paddingHorizontal: wp(14),
    borderRadius: 20,
    backgroundColor: COLORS.goldSolid,
  },
  smallSaveText: {
    color: COLORS.onGold,
    fontSize: font(14),
    fontWeight: '700',
  },
});
