import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Coins } from 'lucide-react-native';

import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { useWallet } from '@/services/queries';
import { formatPennies } from '@/services/session';
import { font, hp } from '@/utils/responsive';

/**
 * Under a price: the user's pennies, whether they cover it, and a way to buy
 * more (the wallet screen). `onBuy` runs first, to close the sheet it sits in.
 */
const PennyBalance = ({ needed, onBuy }: { needed?: number; onBuy?: () => void }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const wallet = useWallet();
  const balance = wallet.data?.balance;
  if (balance === undefined) return null;
  const short = needed !== undefined && balance < needed;
  return (
    <View style={styles.row}>
      <Coins size={16} color={short ? WARN : GOLD} strokeWidth={1.8} />
      <Text style={[styles.text, short && styles.warn]}>
        {short
          ? `You have ${formatPennies(balance)}: ${formatPennies(needed - balance)} short.`
          : `You have ${formatPennies(balance)}.`}
      </Text>
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        onPress={() => {
          onBuy?.();
          navigation.navigate(SCREENS.wallet);
        }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>Buy pennies</Text>
      </Pressable>
    </View>
  );
};

export default PennyBalance;

const GOLD = '#E8D58A';
const WARN = '#E2A09A';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: hp(10) },
  text: { flexShrink: 1, color: '#B4B8AB', fontSize: font(13) },
  warn: { color: WARN },
  link: { color: GOLD, fontSize: font(13), fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
