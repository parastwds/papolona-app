import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BellRing,
  CircleCheck,
  CircleX,
  Hourglass,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

import { font, hp, wp } from '@/utils/responsive';
import { BOTTOMTABSCREN, SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { useClueStatus, useReadings, useReminders } from '@/services/queries';
import {
  GUTTER,
  RowDivider,
  SUB_COLORS,
  SUB_RIPPLE,
  subText,
} from './ProfileSubScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Item = {
  key: string;
  icon: LucideIcon;
  tone: 'gold' | 'red' | 'sage';
  title: string;
  text: string;
  at: number;
  onPress?: () => void;
};

// The latest few: older verdicts are in the readings gallery.
const MAX_ITEMS = 8;

const timeAgo = (at: number) => {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(at).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Recent notifications, on the Notifications & reminders screen: what has
 * happened lately, gathered from the user's readings (judge verdicts),
 * reminders already emailed, and whether a clue is waiting. Push
 * notifications are not built yet.
 */
const RecentNotifications = () => {
  const navigation = useNavigation<Nav>();
  const readings = useReadings();
  const reminders = useReminders();
  const clueStatus = useClueStatus();

  const openJournal = () =>
    navigation.navigate(SCREENS.mainTabs, { screen: BOTTOMTABSCREN.journal });

  const items: Item[] = [];
  // The latest reading has entered the last hour of its 12.
  const last = clueStatus.data?.lastClue;
  const deadline = last?.deadlineAt ? Date.parse(last.deadlineAt) : NaN;
  const stillOpen =
    last &&
    !last.expired &&
    last.interpretation?.verdict !== 'pass' &&
    (!last.interpretation || (last.attemptsLeft ?? 0) > 0);
  if (stillOpen && deadline - Date.now() < 60 * 60 * 1000 && deadline > Date.now()) {
    items.push({
      key: `last-hour-${last.id}`,
      icon: Hourglass,
      tone: 'red',
      title: `Less than an hour left for ${last.clue}`,
      text: 'Complete your reading in the Journal before its 12 hours are up, or it fails.',
      at: deadline - 60 * 60 * 1000,
      onPress: openJournal,
    });
  }
  if (clueStatus.data?.canGenerate) {
    items.push({
      key: 'clue-ready',
      icon: Sparkles,
      tone: 'gold',
      title: 'You can draw a clue',
      text: 'Ask a question in the Journal and draw it.',
      at: Date.now(),
      onPress: openJournal,
    });
  }
  for (const reading of readings.data?.pages[0]?.readings ?? []) {
    const verdict = reading.interpretation;
    if (!verdict) continue;
    const passed = verdict.verdict === 'pass';
    items.push({
      key: `reading-${reading.id}`,
      icon: passed ? CircleCheck : CircleX,
      tone: passed ? 'gold' : 'red',
      title: passed
        ? `Your interpretation of ${reading.clue} passed`
        : `Your interpretation of ${reading.clue} did not pass`,
      text: verdict.feedback,
      at: Date.parse(verdict.judgedAt),
      onPress: () => navigation.navigate(SCREENS.readingsGallery),
    });
  }
  for (const reminder of reminders.data ?? []) {
    if (!reminder.lastSentAt) continue;
    items.push({
      key: `reminder-${reminder.id}-${reminder.lastSentAt}`,
      icon: BellRing,
      tone: 'sage',
      title: `Reminder emailed: ${reminder.title}`,
      text: reminder.note || 'Sent to your email address.',
      at: Date.parse(reminder.lastSentAt),
    });
  }
  items.sort((a, b) => b.at - a.at);
  const shown = items.slice(0, MAX_ITEMS);
  const loading = readings.isPending || reminders.isPending;

  const renderRecent = () => {
    if (loading) {
      return <ActivityIndicator color={SUB_COLORS.gold} style={styles.state} />;
    }
    if (!shown.length) {
      return (
        <View style={styles.empty}>
          <Text style={subText.rowTitle}>Nothing here yet</Text>
          <Text style={subText.rowDescription}>
            Judge verdicts on your readings and the reminders we email you will
            appear here.
          </Text>
        </View>
      );
    }
    return shown.map((item, index) => {
      const Icon = item.icon;
      const color =
        item.tone === 'red'
          ? SUB_COLORS.red
          : item.tone === 'sage'
          ? SUB_COLORS.sage
          : SUB_COLORS.gold;
      return (
        <View key={item.key}>
          {index > 0 ? <RowDivider inset="icon" /> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!item.onPress}
            onPress={item.onPress}
            android_ripple={SUB_RIPPLE}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Icon
              size={20}
              color={color}
              strokeWidth={1.6}
              style={styles.icon}
            />
            <View style={styles.body}>
              <View style={styles.heading}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.time}>{timeAgo(item.at)}</Text>
              </View>
              <Text style={subText.rowDescription} numberOfLines={2}>
                {item.text}
              </Text>
            </View>
          </Pressable>
        </View>
      );
    });
  };

  return <>{renderRecent()}</>;
};

export default RecentNotifications;

const styles = StyleSheet.create({
  state: { marginVertical: hp(24) },
  empty: { paddingHorizontal: GUTTER, paddingVertical: hp(8) },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(16),
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
  },
  pressed: { backgroundColor: 'rgba(232, 213, 138, 0.07)' },
  // Level with the first line of the title beside it.
  icon: { marginTop: 1 },
  body: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: wp(12) },
  title: {
    flex: 1,
    color: SUB_COLORS.cream,
    fontSize: font(16),
    lineHeight: font(22),
  },
  time: { color: SUB_COLORS.faint, fontSize: font(13) },
});
