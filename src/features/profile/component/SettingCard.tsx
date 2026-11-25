import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font, wp } from '@/utils/responsive';
import { RowDivider, SUB_COLORS as COLORS, subText } from './ProfileSubScreen';

// Types
export type SettingType =
  | 'status'
  | 'language'
  | 'research-sharing'
  | 'biometric';

export interface SettingItem {
  id: string;
  title: string;
  description: string;
  value: string;
  type: SettingType;
}

interface SettingCardProps {
  item: SettingItem;
  // Draws a divider above the row when it follows another in the same group.
  divided?: boolean;
}

/**
 * One setting: its title and description, with its current value at the right.
 * The value is read-only text until the setting can be changed.
 */
const SettingCard = ({ item, divided }: SettingCardProps) => (
  <>
    {divided ? <RowDivider /> : null}
    <View
      accessible
      accessibilityLabel={`${item.title}: ${item.value}. ${item.description}`}
      style={styles.row}
    >
      <View style={styles.content}>
        <Text style={subText.rowTitle}>{item.title}</Text>
        <Text style={subText.rowDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {item.value}
      </Text>
    </View>
  </>
);

export default SettingCard;

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingVertical: 12,
  },
  content: { flex: 1, minWidth: 0 },
  value: { color: COLORS.sage, fontSize: font(15) },
});
