import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Maximize2 } from 'lucide-react-native';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import BillingOnFile, { useHasBilling } from '@/components/BillingOnFile';
import TabBackground from '@/components/TabBackground';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useListing } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import { buyListing, cancelListing, placeBid } from '@/services/session';
import ScreenHeader, { GOLD } from '@/features/artwork/component/ScreenHeader';
import { rarityOf } from '@/features/series/artworks';
import RarityMark from '@/features/series/component/RarityMark';
import EmblemSet, {
  EmblemSetViewer,
} from '@/features/series/component/EmblemSet';
import { font, hp, wp } from '@/utils/responsive';
import { auctionTimeLeft, inAuction, listingPrice } from './Marketplace';

type Props = NativeStackScreenProps<RootStackParamList, 'Listing'>;

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
const GUTTER = wp(20);
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';
const HAIRLINE = 'rgba(161, 190, 148, 0.2)';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** "120" or "120.50" from cents, for the bid field. */
const dollarsText = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);

/** Cents from what was typed in the bid field ("$1,250.5" → 125050), or null. */
const parseDollars = (text: string) => {
  const n = Number(text.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/**
 * One NFT for sale: the emblem, what it is, who sells it and its price.
 * Papolona offers it to Collectors first: during its Collectors' auction they
 * bid (each bid beating the highest) and the highest bid wins when it closes.
 * Without bids it then opens to everyone, who can buy it outright (demo
 * payment) and it moves to their Gallery. The seller sees their share and the
 * leading bid, and can take it off sale while nobody has bid.
 */
const ListingDetail = ({ navigation, route }: Props) => {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const query = useListing(id);
  const [zoomed, setZoomed] = useState(false);
  // The sheet open over the listing: buying outright, or placing a bid.
  const [sheet, setSheet] = useState<'buy' | 'bid' | null>(null);
  const confirming = sheet !== null;
  const setConfirming = (open: boolean) => setSheet(open ? 'buy' : null);
  const [bidText, setBidText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { ready: hasBilling } = useHasBilling();

  const bid = async () => {
    const cents = parseDollars(bidText);
    if (busy || !hasBilling || cents === null) return;
    setBusy(true);
    setMessage('');
    try {
      const listing = await placeBid(id, cents);
      queryClient.setQueryData(queryKeys.marketListing(id), listing);
      queryClient.invalidateQueries({ queryKey: queryKeys.marketAll });
      setSheet(null);
      setMessage('');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not place your bid. Please try again.'));
      queryClient.invalidateQueries({ queryKey: queryKeys.marketListing(id) });
    } finally {
      setBusy(false);
    }
  };

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.marketAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.seriesAll });
  };

  const buy = async () => {
    if (busy || !hasBilling) return;
    setBusy(true);
    setMessage('');
    try {
      const { series } = await buyListing(id);
      setConfirming(false);
      afterChange();
      // Straight to the NFT, now in the buyer's Gallery.
      navigation.replace(SCREENS.seriesDetail, { seriesId: series.id });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not buy it. Please try again.'));
      afterChange();
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await cancelListing(id);
      afterChange();
      navigation.goBack();
    } catch (error) {
      setMessage(
        getErrorMessage(error, 'Could not take it off sale. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const renderBody = () => {
    if (query.isPending) {
      return <ActivityIndicator color={GOLD} style={styles.center} />;
    }
    if (query.isError) {
      return (
        <Text style={[styles.body, styles.message]}>
          {getErrorMessage(query.error, 'Could not open this listing.')}
        </Text>
      );
    }
    const listing = query.data;
    const { series } = listing;
    const rarity = rarityOf(series.rarity);
    const price = listingPrice(listing);
    const open = listing.status === 'active';
    const auction = listing.auction;
    const auctioning = inAuction(listing);
    const money = (cents: number) =>
      listingPrice({ priceCents: cents, currency: listing.currency });
    const minBid = auction ? money(auction.minNextBidCents) : price;

    const facts: [string, React.ReactNode][] = [
      [
        'Category',
        <View key="c" style={styles.factInline}>
          <RarityMark rarity={series.rarity} size={14} />
          <Text style={[styles.factValue, { color: rarity.color }]}>
            {rarity.label}
          </Text>
        </View>,
      ],
      ['Readings', <Text style={styles.factValue}>{series.length}</Text>],
      [
        'Seller',
        <Text style={styles.factValue}>
          {listing.mine ? 'You' : listing.seller.name}
        </Text>,
      ],
    ];
    if (auctioning && auction) {
      // During the Collectors' auction: the starting price, the bids and when it closes.
      facts.push(
        ['Starting price', <Text style={styles.factValue}>{price}</Text>],
        [
          'Top bid',
          <Text style={auction.highestBidCents !== null ? styles.priceValue : styles.factValue}>
            {auction.highestBidCents !== null
              ? `${money(auction.highestBidCents)}${auction.highestBidMine ? ' (yours)' : ''}`
              : 'No bids yet'}
          </Text>,
        ],
        ['Bids', <Text style={styles.factValue}>{auction.bidCount}</Text>],
      );
      if (listing.mine && auction.highestBidder) {
        facts.push([
          'Leading',
          <Text style={styles.factValue}>{auction.highestBidder.name}</Text>,
        ]);
      }
      if (auction.collectorsUntil) {
        facts.push([
          'Closes',
          <Text style={styles.factValue}>
            {formatDate(auction.collectorsUntil)} · {auctionTimeLeft(listing)}
          </Text>,
        ]);
      }
    } else {
      facts.push([
        listing.status === 'sold' ? 'Sold for' : 'Price',
        <Text style={styles.priceValue}>{price}</Text>,
      ]);
    }
    if (listing.mine && listing.buyer) {
      facts.push([
        'Bought by',
        <Text style={styles.factValue}>{listing.buyer.name}</Text>,
      ]);
    }
    // While bids are still coming in, the seller's share isn't known yet.
    if (listing.mine && listing.sellerProceedsCents !== undefined && !auctioning) {
      facts.push([
        open ? 'You receive' : 'You received',
        <Text style={styles.factValue}>
          {listingPrice({
            priceCents: listing.sellerProceedsCents,
            currency: listing.currency,
          })}
        </Text>,
      ]);
    }

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel="Open the emblem full screen"
          onPress={() => setZoomed(true)}
          style={({ pressed }) => [styles.frame, pressed && styles.pressed]}
        >
          <View style={styles.setWrap}>
            <EmblemSet
              artworkKey={series.artworkKey}
              length={series.length}
              framed={false}
            />
          </View>
          <View style={styles.zoomHint}>
            <Maximize2 size={16} color={CREAM} strokeWidth={1.8} />
          </View>
        </Pressable>

        <View style={styles.facts}>
          {facts.map(([label, value], i) => (
            <View key={label}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{label}</Text>
                {value}
              </View>
            </View>
          ))}
        </View>

        {!open ? (
          <Text style={[styles.body, styles.status]}>
            {listing.status === 'sold'
              ? `Sold${
                  listing.soldAt ? ` on ${formatDate(listing.soldAt)}` : ''
                }.${listing.mine ? ' It now belongs to the buyer.' : ''}`
              : 'No longer for sale.'}
          </Text>
        ) : listing.mine ? (
          <>
            <Text style={[styles.body, styles.status]}>
              {auctioning
                ? `Papolona, as your agent, is offering your NFT to Collector members in an auction until ${
                    auction?.collectorsUntil ? formatDate(auction.collectorsUntil) : 'it closes'
                  }: the highest bid then wins. With no bids it opens to everyone at ${price}. Papolona keeps half of the sale.`
                : 'Your NFT is for sale to everyone. Papolona keeps half of the sale.'}
            </Text>
            {auction && auction.bidCount > 0 ? (
              <Text style={[styles.body, styles.status]}>
                Collectors have bid, so it stays in the auction until it closes.
              </Text>
            ) : (
              <AppButton
                title="Take off sale"
                onPress={withdraw}
                disabled={busy}
                loading={busy}
                variant="outline"
                style={styles.secondaryButton}
                textStyle={styles.secondaryText}
              />
            )}
          </>
        ) : auctioning ? (
          <>
            <Text style={[styles.body, styles.status]}>
              {auction?.highestBidMine
                ? 'You have the highest bid. If nobody outbids you before the auction closes, the NFT is yours at your bid.'
                : 'Collectors’ auction: Papolona offers this NFT to Collector members first. Each bid must beat the highest so far, and the highest bid when it closes wins.'}
            </Text>
            {auction?.canBid ? (
              <AppButton
                title={`Bid ${minBid} or more`}
                onPress={() => {
                  setMessage('');
                  setBidText(dollarsText(auction.minNextBidCents));
                  setSheet('bid');
                }}
                variant="primary"
                style={styles.button}
                textStyle={styles.buttonText}
              />
            ) : null}
          </>
        ) : auction && !auction.canBuy ? null : (
          <AppButton
            title={`Buy for ${price}`}
            onPress={() => {
              setMessage('');
              setConfirming(true);
            }}
            variant="primary"
            style={styles.button}
            textStyle={styles.buttonText}
          />
        )}
        {message && !confirming ? (
          <Text style={[styles.error, styles.status]}>{message}</Text>
        ) : null}

        <AppBottomModal
          visible={sheet === 'bid'}
          onClose={() => setSheet(null)}
          background={SHEET_ARTWORK}
        >
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            Bid on this {rarity.label}
          </Text>
          <Text style={styles.sheetText}>
            If yours is the highest bid when the auction closes
            {auction?.collectorsUntil
              ? ` on ${formatDate(auction.collectorsUntil)}`
              : ''}
            , the NFT is yours and you pay your bid. It then moves to your
            Gallery, under My NFT investments.
          </Text>
          <View style={styles.fee}>
            <Text style={styles.factLabel}>Your bid</Text>
            <View style={styles.bidField}>
              <Text style={styles.priceValue}>$</Text>
              <TextInput
                value={bidText}
                onChangeText={setBidText}
                keyboardType="decimal-pad"
                accessibilityLabel="Your bid in dollars"
                style={styles.bidInput}
                selectionColor={GOLD}
              />
            </View>
          </View>
          <Text style={styles.note}>At least {minBid}.</Text>
          <BillingOnFile
            onEdit={() => {
              setSheet(null);
              navigation.navigate(SCREENS.billingInfo);
            }}
          />
          <Text style={styles.note}>Demo payment: nobody is charged.</Text>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <AppButton
            title="Place bid"
            onPress={bid}
            disabled={busy || !hasBilling || parseDollars(bidText) === null}
            loading={busy}
            variant="primary"
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </AppBottomModal>

        <AppBottomModal
          visible={sheet === 'buy'}
          onClose={() => setConfirming(false)}
          background={SHEET_ARTWORK}
        >
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            Buy this {rarity.label}?
          </Text>
          <Text style={styles.sheetText}>
            It becomes yours and moves to your Gallery, under My NFT
            investments. You can sell it again later as an active member.
          </Text>
          <View style={styles.fee}>
            <Text style={styles.factLabel}>Price</Text>
            <Text style={styles.priceValue}>{price}</Text>
          </View>
          <BillingOnFile
            onEdit={() => {
              setConfirming(false);
              navigation.navigate(SCREENS.billingInfo);
            }}
          />
          <Text style={styles.note}>Demo payment: nobody is charged.</Text>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <AppButton
            title={`Buy for ${price}`}
            onPress={buy}
            disabled={busy || !hasBilling}
            loading={busy}
            variant="primary"
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </AppBottomModal>

        {zoomed && (
          <EmblemSetViewer
            artworkKey={series.artworkKey}
            length={series.length}
            label={`${rarity.label} NFT`}
            onClose={() => setZoomed(false)}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <TabBackground deep blurred={confirming}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScreenHeader
          title={
            query.data
              ? `${rarityOf(query.data.series.rarity).label} ${
                  query.data.status === 'sold'
                    ? 'sold'
                    : query.data.status !== 'active'
                    ? '· off sale'
                    : inAuction(query.data)
                    ? 'at auction'
                    : 'for sale'
                }`
              : 'For sale'
          }
          onBack={() => navigation.goBack()}
        />
        {renderBody()}
      </SafeAreaView>
    </TabBackground>
  );
};

export default ListingDetail;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: GUTTER },
  content: {
    paddingTop: hp(16),
    paddingHorizontal: GUTTER,
    paddingBottom: hp(40),
  },
  frame: {
    width: '100%',
    aspectRatio: 1.1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  pressed: { opacity: 0.9 },
  fill: { width: '100%', height: '100%' },
  // The set of emblems, centred in the frame.
  setWrap: { flex: 1, justifyContent: 'center', padding: 8 },
  zoomHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  facts: {
    marginTop: hp(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: HAIRLINE },
  factRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factLabel: { width: wp(108), color: MUTED, fontSize: font(14) },
  factValue: { flexShrink: 1, color: CREAM, fontSize: font(15) },
  priceValue: { color: GOLD, fontSize: font(18), fontWeight: '600' },
  body: { color: MUTED, fontSize: font(14), lineHeight: font(21) },
  status: { marginTop: hp(16) },
  error: { marginTop: hp(10), color: '#F0A29A', fontSize: font(14) },
  button: { marginTop: hp(20), backgroundColor: '#D9C77E' },
  buttonText: { color: '#172016' },
  secondaryButton: { marginTop: hp(14) },
  secondaryText: { color: GOLD },
  sheetTitle: { color: CREAM, fontFamily: 'serif', fontSize: font(22) },
  sheetText: {
    marginTop: hp(8),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(20),
  },
  fee: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
  },
  note: { marginTop: hp(12), color: MUTED, fontSize: font(12) },
  bidField: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bidInput: {
    minWidth: wp(110),
    paddingVertical: hp(6),
    paddingHorizontal: wp(10),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.45)',
    color: GOLD,
    fontSize: font(18),
    fontWeight: '600',
    textAlign: 'right',
  },
});
