import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { font } from '@/utils/responsive';

/** A member's photo, or their initials on a gold-tinted disc. */
const MemberAvatar = ({
  name,
  avatarUrl,
  size = 44,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.fill} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: font(size * 0.36) }]}>
          {initials || '·'}
        </Text>
      )}
    </View>
  );
};

export default MemberAvatar;

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.45)',
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  fill: { width: '100%', height: '100%' },
  initials: { color: '#E8D58A', fontWeight: '600' },
});
