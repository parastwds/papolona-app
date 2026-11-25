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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, Mail, Repeat } from 'lucide-react-native';

import { hp, wp } from '@/utils/responsive';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { queryKeys } from '@/services/queryKeys';
import { useCurrentUser, useReminders } from '@/services/queries';
import { useSyncTimeZone } from '@/services/useSyncTimeZone';
import {
  Reminder,
  ReminderInput,
  createReminder,
  deleteReminder,
  updateReminder,
} from '@/services/session';
import AppMenuItem from '../component/AppMenuItem';
import RecentNotifications from '../component/RecentNotifications';
import ProfileSubScreen, {
  ComingSoon,
  GUTTER,
  HeaderAction,
  RowDivider,
  SUB_COLORS as COLORS,
  SUB_RIPPLE,
  SubSection,
  subText,
} from '../component/ProfileSubScreen';
import ReminderEditor from '../component/ReminderEditor';

const REPEAT_LABELS: Record<Reminder['repeat'], string> = {
  none: 'Once',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Notifications & reminders, one screen from the Profile tab: the user's
 * reminders (emailed by the server at the time they set, added with New), then
 * what has happened lately (judge verdicts, reminders sent, a clue waiting),
 * and the email settings.
 */
const Reminders = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const reminders = useReminders();
  const zone = useSyncTimeZone();

  const [editing, setEditing] = useState<Reminder | 'new' | null>(null);
  const [message, setMessage] = useState('');

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reminders });

  const save = async (input: ReminderInput) => {
    if (editing === 'new') await createReminder(input);
    else if (editing)
      await updateReminder(editing.id, { ...input, active: true });
    setEditing(null);
    refresh();
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    await deleteReminder(editing.id);
    setEditing(null);
    refresh();
  };

  const toggle = async (reminder: Reminder, active: boolean) => {
    // A sent one-off has no time left: turning it on means picking a new one.
    if (
      active &&
      reminder.repeat === 'none' &&
      new Date(reminder.remindAt) < new Date()
    ) {
      setEditing(reminder);
      return;
    }
    queryClient.setQueryData<Reminder[]>(queryKeys.reminders, list =>
      list?.map(r => (r.id === reminder.id ? { ...r, active } : r)),
    );
    setMessage('');
    try {
      await updateReminder(reminder.id, { active });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not change the reminder.'));
    } finally {
      refresh();
    }
  };

  const renderList = () => {
    if (reminders.isPending) {
      return <ActivityIndicator color={COLORS.gold} style={styles.state} />;
    }
    if (!reminders.data) {
      return (
        <Text style={[subText.error, styles.gutter]}>
          {getErrorMessage(reminders.error, 'Could not load your reminders.')}
        </Text>
      );
    }
    if (reminders.data.length === 0) {
      return (
        <View style={styles.gutter}>
          <Text style={subText.rowTitle}>No reminders yet</Text>
          <Text style={subText.rowDescription}>
            Add one and it will be emailed to you at the time you pick: once, or
            every day, week or month.
          </Text>
        </View>
      );
    }
    return reminders.data.map((reminder, index) => {
      const sent =
        !reminder.active && reminder.repeat === 'none' && !!reminder.lastSentAt;
      // Its time has passed and the server is about to send it.
      const due =
        reminder.active && Date.parse(reminder.remindAt) <= Date.now();
      const Icon = reminder.repeat === 'none' ? Bell : Repeat;
      return (
        <View key={reminder.id}>
          {index > 0 ? <RowDivider inset="icon" /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Edit this reminder"
            onPress={() => setEditing(reminder)}
            android_ripple={SUB_RIPPLE}
            style={({ pressed }) => [
              styles.reminder,
              pressed && styles.pressed,
            ]}
          >
            {/* Dimmed while off; the switch beside it keeps its full strength. */}
            <View style={[styles.reminderMain, !reminder.active && styles.off]}>
              <Icon size={20} color={COLORS.sage} strokeWidth={1.6} />
              <View style={styles.reminderBody}>
                <Text style={subText.rowTitle} numberOfLines={1}>
                  {reminder.title}
                </Text>
                <Text style={subText.rowDescription}>
                  {sent
                    ? `Sent ${formatWhen(reminder.lastSentAt!)}`
                    : due
                    ? `Due now · ${formatWhen(reminder.remindAt)}`
                    : `${reminder.active ? 'Next' : 'Paused'} · ${formatWhen(
                        reminder.remindAt,
                      )}`}
                  {reminder.repeat !== 'none'
                    ? ` · ${REPEAT_LABELS[reminder.repeat]}`
                    : ''}
                </Text>
              </View>
            </View>
            <Switch
              value={reminder.active}
              onValueChange={value => toggle(reminder, value)}
              trackColor={{
                false: 'rgba(220, 224, 214, 0.22)',
                true: COLORS.goldSolid,
              }}
              thumbColor={COLORS.cream}
              accessibilityLabel={`${reminder.title} on`}
            />
          </Pressable>
        </View>
      );
    });
  };

  return (
    <ProfileSubScreen
      title="Notifications"
      blurred={editing !== null}
      action={
        <HeaderAction
          title="New"
          accessibilityLabel="New reminder"
          onPress={() => setEditing('new')}
        />
      }
    >
      <SubSection title="Your reminders" bleed>
        {message ? (
          <Text style={[subText.error, styles.gutter, styles.message]}>
            {message}
          </Text>
        ) : null}
        {renderList()}
      </SubSection>

      <SubSection>
        <Text style={subText.note}>
          Reminders are emailed to {user.data?.email ?? 'your email'} at the
          time you set, in {zone.replace(/_/g, ' ')}. Your daily reading
          reminder and other emails are in Settings.
        </Text>
      </SubSection>

      <SubSection title="Recent" bleed>
        <RecentNotifications />
      </SubSection>

      <SubSection title="By email" bleed>
        <AppMenuItem
          title="Email notification settings"
          icon={Mail}
          onPress={() => navigation.navigate(SCREENS.settings)}
        />
      </SubSection>

      <SubSection>
        <ComingSoon
          title="Push notifications"
          text="Alerts on your phone for verdicts, reminders and when a clue can be drawn. For now these arrive by email."
        />
      </SubSection>

      {editing !== null && (
        <ReminderEditor
          reminder={editing === 'new' ? null : editing}
          onSave={save}
          onDelete={editing === 'new' ? undefined : remove}
          onClose={() => setEditing(null)}
        />
      )}
    </ProfileSubScreen>
  );
};

export default Reminders;

const styles = StyleSheet.create({
  state: { marginVertical: hp(24) },
  gutter: { paddingHorizontal: GUTTER },
  message: { marginBottom: hp(12) },
  reminder: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: 'rgba(232, 213, 138, 0.07)' },
  reminderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
  },
  off: { opacity: 0.55 },
  reminderBody: { flex: 1 },
});
