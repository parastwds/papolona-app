import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import { formatPrice } from '@/services/session';
import {
  EMBLEM_GAP,
  useEmblemTileWidth,
} from '@/features/series/component/EmblemTile';
import { font, hp } from '@/utils/responsive';
import { DEMO_MERCH, type MerchItem } from '../merch';

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const GOLD = '#E8D58A';

const priceOf = (item: MerchItem) =>
  formatPrice({ amountCents: item.priceCents, currency: item.currency });

/** A "Demo" tag on an item, so nobody takes the preview for stock. */
const DemoTag = () => (
  <View style={styles.tag}>
    <Text style={styles.tagText}>DEMO</Text>
  </View>
);

/**
 * Papolona merchandise, three across like every grid in the app. Demo items:
 * each opens a preview that says it is not on sale yet.
 */
const MerchSection = () => {
  const width = useEmblemTileWidth();
  const [open, setOpen] = useState<MerchItem | null>(null);
  return (
    <View>
      <View style={styles.grid}>
        {DEMO_MERCH.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${priceOf(item)}, demo item. Open.`}
            onPress={() => setOpen(item)}
            style={({ pressed }) => [{ width }, pressed && styles.pressed]}
          >
            <View style={[styles.frame, { height: width }]}>
              <Image
                source={item.image}
                contentFit={item.emblem ? 'contain' : 'cover'}
                style={item.emblem ? styles.emblem : styles.photo}
              />
              <DemoTag />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.price}>{priceOf(item)}</Text>
          </Pressable>
        ))}
      </View>

      <AppBottomModal visible={open !== null} onClose={() => setOpen(null)}>
        {open ? (
          <View>
            <View style={styles.sheetHead}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>
                {open.title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(null)}
                hitSlop={10}
              >
                <X size={22} color={CREAM} strokeWidth={1.8} />
              </Pressable>
            </View>
            <View style={styles.sheetFrame}>
              <Image
                source={open.image}
                contentFit={open.emblem ? 'contain' : 'cover'}
                style={open.emblem ? styles.emblem : styles.photo}
              />
              <DemoTag />
            </View>
            <Text style={styles.sheetPrice}>{priceOf(open)}</Text>
            <Text style={styles.sheetText}>{open.description}</Text>
            <Text style={styles.sheetNote}>
              Preview only: Papolona merchandise is not on sale yet.
            </Text>
            <AppButton
              title="Coming soon"
              onPress={() => undefined}
              disabled
              variant="primary"
              style={styles.button}
              textStyle={styles.buttonText}
            />
          </View>
        ) : null}
      </AppBottomModal>
    </View>
  );
};

export default MerchSection;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: EMBLEM_GAP,
    rowGap: hp(18),
    marginTop: hp(14),
  },
  frame: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    backgroundColor: '#000',
  },
  photo: { width: '100%', height: '100%' },
  emblem: { width: '82%', height: '82%' },
  tag: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(11, 18, 13, 0.8)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.6)',
  },
  tagText: { color: GOLD, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  title: {
    marginTop: 8,
    color: CREAM,
    fontSize: font(13),
    fontWeight: '600',
  },
  price: { marginTop: 2, color: GOLD, fontSize: font(13), fontWeight: '600' },
  pressed: { opacity: 0.8 },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: hp(14),
  },
  sheetTitle: {
    flex: 1,
    color: CREAM,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  sheetFrame: {
    height: hp(240),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  sheetPrice: {
    marginTop: hp(14),
    color: GOLD,
    fontSize: font(18),
    fontWeight: '700',
  },
  sheetText: {
    marginTop: hp(6),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(21),
  },
  sheetNote: {
    marginTop: hp(12),
    color: '#A1BE94',
    fontSize: font(13),
    lineHeight: font(19),
  },
  button: { marginTop: hp(18), backgroundColor: '#D9C77E' },
  buttonText: { color: '#172016' },
});
