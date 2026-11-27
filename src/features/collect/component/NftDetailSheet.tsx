import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import { formatPrice, type Listing, type NftSeries } from '@/services/session';
import { rarityOf, readingLevelOf } from '@/features/series/artworks';
import EmblemSet from '@/features/series/component/EmblemSet';
import RarityMark from '@/features/series/component/RarityMark';
import { font, hp } from '@/utils/responsive';

// What the card shows: an NFT the user holds (converted or bought), or one they sold.
export type NftDetail =
  | { kind: 'own'; series: NftSeries }
  | { kind: 'sold'; listing: Listing };

const dateOf = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

const price = (amountCents: number, currency: string) =>
  formatPrice({ amountCents, currency });

/** The facts of one NFT, as rows: level, value, status, who it went to, when, and its reference. */
const factsOf = (detail: NftDetail) => {
  const series = detail.kind === 'own' ? detail.series : detail.listing.series;
  const level = readingLevelOf(series.rarity);
  const rows: { label: string; value: string; gold?: boolean }[] = [];
  rows.push({
    label: 'Reference',
    value: series.reference ?? 'Not numbered',
    gold: true,
  });
  rows.push({
    label: 'Level',
    value: `${level ? `Level ${level.level} · ` : ''}${series.length} ${
      series.length === 1 ? 'reading' : 'readings'
    }`,
  });

  if (detail.kind === 'sold') {
    const { listing } = detail;
    rows.push({
      label: 'Value',
      value: `Sold for ${price(listing.priceCents, listing.currency)}`,
    });
    rows.push({ label: 'Status', value: 'Sold' });
    rows.push({ label: 'Sold to', value: listing.buyer?.name ?? 'A member' });
    rows.push({ label: 'Date', value: `Sold ${dateOf(listing.soldAt) ?? '—'}` });
    return rows;
  }

  const sale = series.lastSale;
  const value = series.listing
    ? `${price(series.listing.priceCents, series.listing.currency)} (asking)`
    : sale
    ? `${price(sale.priceCents, sale.currency)} (last sale)`
    : series.suggestedResalePrice
    ? `${formatPrice(series.suggestedResalePrice)} (suggested)`
    : '—';
  rows.push({ label: 'Value', value });
  rows.push({
    label: 'Status',
    value: series.listing
      ? 'For sale on the marketplace'
      : series.acquired
      ? 'In your collection, bought'
      : 'In your collection',
  });
  if (series.acquired && sale) {
    rows.push({ label: 'Bought from', value: sale.seller });
  } else {
    rows.push({ label: 'Sold to', value: 'Not sold' });
  }
  rows.push({
    label: 'Date',
    value:
      series.acquired && sale
        ? `Bought ${dateOf(sale.soldAt)}`
        : series.convertedAt
        ? `Converted ${dateOf(series.convertedAt)}`
        : `Completed ${dateOf(series.completedAt) ?? '—'}`,
  });
  return rows;
};

/**
 * A card for an NFT in the Gallery: the emblem set in its gold frame, then its
 * level, value, who it was sold to, the date and its reference number, and a
 * way into its full page.
 */
const NftDetailSheet = ({
  detail,
  onClose,
  onOpen,
}: {
  detail: NftDetail | null;
  onClose: () => void;
  onOpen: (detail: NftDetail) => void;
}) => {
  if (!detail) return null;
  const series = detail.kind === 'own' ? detail.series : detail.listing.series;
  const facts = factsOf(detail);
  return (
    <AppBottomModal visible onClose={onClose}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <RarityMark rarity={series.rarity} size={14} />
          <Text accessibilityRole="header" style={styles.title}>
            {`${rarityOf(series.rarity).label} NFT`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
        >
          <X size={22} color={CREAM} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.frame}>
        <EmblemSet
          artworkKey={series.artworkKey}
          length={series.length}
          framed={false}
          maxHeight={hp(200)}
        />
      </View>

      <View style={styles.facts}>
        {facts.map(f => (
          <View key={f.label} style={styles.fact}>
            <Text style={styles.factLabel}>{f.label}</Text>
            <Text
              style={[styles.factValue, f.gold && styles.factGold]}
              numberOfLines={2}
            >
              {f.value}
            </Text>
          </View>
        ))}
      </View>

      <AppButton
        title={detail.kind === 'sold' ? 'Open the sale' : 'Open the full page'}
        onPress={() => onOpen(detail)}
        variant="primary"
        style={styles.button}
        textStyle={styles.buttonText}
      />
    </AppBottomModal>
  );
};

export default NftDetailSheet;

const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const GOLD = '#E8D58A';

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(14),
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: CREAM, fontFamily: 'serif', fontSize: font(22) },
  // Gold, like a converted NFT on the wall.
  frame: {
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9C77E',
    backgroundColor: '#000',
  },
  facts: { marginTop: hp(16) },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: hp(9),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(161, 190, 148, 0.25)',
  },
  factLabel: { color: MUTED, fontSize: font(14) },
  factValue: {
    flex: 1,
    color: CREAM,
    fontSize: font(14),
    fontWeight: '600',
    textAlign: 'right',
  },
  factGold: { color: GOLD, letterSpacing: 0.6 },
  button: { marginTop: hp(20), backgroundColor: '#D9C77E' },
  buttonText: { color: '#172016' },
});
