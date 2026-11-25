import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronRight,
  Globe,
  Maximize2,
  ShieldCheck,
  Store,
  type LucideIcon,
} from 'lucide-react-native';
import EmblemSet, { EmblemSetViewer } from '../component/EmblemSet';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import BillingOnFile, { useHasBilling } from '@/components/BillingOnFile';
import { SCREENS } from '@/constants/screens';
import { RootStackParamList } from '@/navigation/types';
import { getErrorMessage } from '@/services/api';
import { useMembership, useSeriesList } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  NftSeries,
  cancelListing,
  convertSeries,
  createListing,
  formatPrice,
  publishSeries,
  unpublishSeries,
} from '@/services/session';
import ProfileSubScreen, {
  GUTTER,
  RowDivider,
  SUB_COLORS as COLORS,
  SUB_RIPPLE,
  SubSection,
  subText,
} from '@/features/profile/component/ProfileSubScreen';
import { font, hp, wp } from '@/utils/responsive';
import { hasEmblems, rarityOf } from '../artworks';
import RarityMark from '../component/RarityMark';
import { activeSummary } from '@/features/collect/component/ActiveBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'SeriesDetail'>;

// The onboarding artwork: butterflies round the edges, dark and calm in the middle.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

// Papolona's share of a marketplace sale (the server's MARKET_FEE_PERCENT).
export const MARKET_FEE_PERCENT = 50;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const CONVERT_OPTIONS = [
  {
    poc: false,
    title: 'Convert into an NFT',
    text: 'A blockchain certificate of your achievement, yours to keep or sell.',
  },
  {
    poc: true,
    title: 'Convert and join the POC ecosystem',
    text: 'The certificate, plus participation in the crypto hybrid rewards.',
  },
];

type Sheet = 'convert' | 'sell' | 'withdraw' | null;
type Busy = Exclude<Sheet, null> | null;

/** Something to do with the emblem: what it is, where it stands, and the next step if there is one. */
const ActionRow = ({
  icon: Icon,
  title,
  status,
  action,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  action?: string;
  onPress?: () => void;
}) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={`${title}: ${status}.${action ? ` ${action}.` : ''}`}
    onPress={onPress}
    disabled={!onPress}
    android_ripple={onPress ? SUB_RIPPLE : undefined}
    style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
  >
    <Icon size={20} color={COLORS.sage} strokeWidth={1.6} />
    <View style={styles.flex}>
      <Text style={subText.rowTitle}>{title}</Text>
      <Text style={subText.rowDescription} numberOfLines={2}>
        {status}
      </Text>
    </View>
    {action ? <Text style={styles.actionText}>{action}</Text> : null}
    {onPress ? (
      <ChevronRight size={18} color="#6F8274" strokeWidth={1.6} />
    ) : null}
  </Pressable>
);

/** Dollars typed by the member ("120" or "120.50") as cents, or null when it isn't a price. */
const toCents = (text: string) => {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
};

const usd = (amountCents: number) =>
  formatPrice({ amountCents, currency: 'USD' });

/**
 * One emblem: the butterfly of a completed Triple, Hexa, Dozen or Double Dozen
 * series. The member keeps it in their gallery or converts it into an NFT
 * (paid; each conversion keeps them an active member), and puts an NFT up for
 * sale (active members): it then shows on the marketplace and the collective
 * artwork, both in Discover.
 */
const SeriesDetail = ({ navigation, route }: Props) => {
  const { seriesId } = route.params;
  const queryClient = useQueryClient();
  const list = useSeriesList();
  const membership = useMembership();
  const series = list.data?.find(s => s.id === seriesId);
  const [zoomed, setZoomed] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<Busy>(null);
  // Every payment uses the billing info from the Profile tab.
  const { ready: hasBilling } = useHasBilling();
  const [message, setMessage] = useState('');
  const [poc, setPoc] = useState(false);
  const [priceText, setPriceText] = useState('');
  // The public/private switch for the collective artwork, and why it failed.
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  const replace = (updated: NftSeries) =>
    queryClient.setQueryData<NftSeries[]>(queryKeys.seriesList, old =>
      old?.map(s => (s.id === updated.id ? updated : s)),
    );

  const openSheet = (next: Exclude<Sheet, null>) => {
    setMessage('');
    setSheet(next);
  };

  const closeSheet = () => {
    setSheet(null);
    setMessage('');
  };

  // Runs one sheet's action, then closes it; on failure the sheet stays open with the reason.
  const run = async (
    kind: Exclude<Busy, null>,
    action: () => Promise<void>,
    fallback: string,
  ) => {
    if (busy) return;
    setBusy(kind);
    setMessage('');
    try {
      await action();
      setSheet(null);
    } catch (error) {
      setMessage(getErrorMessage(error, fallback));
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
    } finally {
      setBusy(null);
    }
  };

  const convert = () =>
    run(
      'convert',
      async () => {
        replace(await convertSeries(seriesId, poc));
        // A conversion keeps the member active.
        queryClient.invalidateQueries({ queryKey: queryKeys.membership });
      },
      'Could not convert. Please try again.',
    );

  const sell = () => {
    const cents = toCents(priceText);
    if (!cents) {
      setMessage('Enter a price, such as 120.');
      return;
    }
    run(
      'sell',
      async () => {
        await createListing(seriesId, cents);
        await queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketAll });
        // Selling it placed it on the collective artwork too.
        queryClient.invalidateQueries({ queryKey: queryKeys.artworkAll });
      },
      'Could not put it up for sale. Please try again.',
    );
  };

  const withdraw = (listingId: string) =>
    run(
      'withdraw',
      async () => {
        await cancelListing(listingId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketAll });
      },
      'Could not take it off sale. Please try again.',
    );

  // Public: on the collective artwork in Discover, without being for sale.
  // Private: only the member sees it. A series for sale is always public.
  const setPublic = async (makePublic: boolean) => {
    if (savingVisibility) return;
    setSavingVisibility(true);
    setVisibilityError('');
    try {
      replace(
        await (makePublic
          ? publishSeries(seriesId)
          : unpublishSeries(seriesId)),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.artworkAll });
    } catch (error) {
      setVisibilityError(
        getErrorMessage(
          error,
          makePublic
            ? 'Could not make it public. Please try again.'
            : 'Could not make it private. Please try again.',
        ),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.seriesList });
    } finally {
      setSavingVisibility(false);
    }
  };

  // The emblem leads the screen; tap it to see it full screen.
  const renderEmblem = (item: NftSeries) => (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Open the emblem full screen"
      onPress={() => setZoomed(true)}
      style={({ pressed }) => [styles.frame, pressed && styles.framePressed]}
    >
      <View style={styles.setWrap}>
        <EmblemSet
          artworkKey={item.artworkKey}
          length={item.length}
          revealedTiles={item.revealedTiles}
          framed={false}
        />
      </View>
      <View style={styles.zoomHint}>
        <Maximize2 size={16} color={COLORS.cream} strokeWidth={1.8} />
      </View>
    </Pressable>
  );

  // What it is, as label and value, the way the Profile tab lists an account.
  const renderFacts = (item: NftSeries) => {
    const rarity = rarityOf(item.rarity);
    return (
      <View style={styles.facts}>
        <View
          accessible
          accessibilityLabel={`Category: ${rarity.label}`}
          style={styles.factRow}
        >
          <Text style={styles.factLabel}>Category</Text>
          <RarityMark rarity={item.rarity} size={14} />
          <Text style={[styles.factValue, { color: rarity.color }]}>
            {rarity.label}
          </Text>
        </View>
        <RowDivider />
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>Readings</Text>
          <Text style={styles.factValue}>{item.length}</Text>
        </View>
        <RowDivider />
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>
            {item.acquired ? 'Made' : 'Completed'}
          </Text>
          <Text style={styles.factValue}>
            {item.completedAt ? fullDate(item.completedAt) : 'Not recorded'}
          </Text>
        </View>
      </View>
    );
  };

  // The NFT, the marketplace and the collective artwork: where each stands and its next step.
  const renderActions = (item: NftSeries) => {
    // Single and twin are practice: their emblems stay here, nothing more.
    if (!item.nftEligible) {
      return (
        <ActionRow
          icon={ShieldCheck}
          title="Practice"
          status="Practice emblems stay in your gallery: they cannot become an NFT or be sold"
        />
      );
    }
    // An unfinished series keeps its emblems but can never be converted.
    const unfinished = item.status !== 'completed';
    // Explorers cannot convert or sell: they upgrade first.
    const canProfit = membership.data?.canProfit !== false && !unfinished;
    const conversion = item.conversionPrice
      ? formatPrice(item.conversionPrice)
      : null;
    const nftStatus = item.convertedAt
      ? item.acquired
        ? 'Bought on the marketplace'
        : `NFT since ${shortDate(item.convertedAt)}${
            item.mintChoice === 'mint_poc' ? ' · POC ecosystem' : ''
          }`
      : unfinished
      ? `Unfinished: ${item.revealedCount} of ${item.length} emblems, cannot be converted`
      : canProfit
      ? 'Kept in your gallery'
      : 'Explorers keep emblems: upgrade to Creator or Collector to convert';
    return (
      <>
        <ActionRow
          icon={ShieldCheck}
          title="NFT"
          status={nftStatus}
          action={
            item.convertedAt || !canProfit
              ? undefined
              : conversion
              ? `Convert · ${conversion}`
              : 'Convert'
          }
          onPress={
            item.convertedAt || !canProfit
              ? undefined
              : () => {
                  setPoc(false);
                  openSheet('convert');
                }
          }
        />
        <RowDivider inset="icon" />
        <ActionRow
          icon={Store}
          title="Marketplace"
          status={
            unfinished
              ? 'Only a completed series can be sold'
              : !canProfit
              ? 'Explorers cannot sell: upgrade to Creator or Collector'
              : !item.convertedAt
              ? 'Convert it into an NFT to sell it'
              : item.listing
              ? `For sale in Discover at ${usd(item.listing.priceCents)}`
              : 'Private: not for sale'
          }
          action={
            !item.convertedAt || !canProfit
              ? undefined
              : item.listing
              ? 'Withdraw'
              : 'Sell'
          }
          onPress={
            !item.convertedAt || !canProfit
              ? undefined
              : item.listing
              ? () => openSheet('withdraw')
              : () => {
                  // Starts at Papolona's recommended minimum for the level.
                  const suggested =
                    item.suggestedResalePrice ?? item.conversionPrice;
                  setPriceText(
                    suggested ? String(suggested.amountCents / 100) : '',
                  );
                  openSheet('sell');
                }
          }
        />
        <RowDivider inset="icon" />
        {renderVisibility(item, unfinished)}
      </>
    );
  };

  // Public or private on the collective artwork: the member's choice, except
  // that a series for sale stays public. Public ones open on the artwork.
  const renderVisibility = (item: NftSeries, unfinished: boolean) => {
    const isPublic = !!item.publishedAt;
    const locked = unfinished || !!item.listing || savingVisibility;
    const status = unfinished
      ? 'Only a completed series can be public'
      : item.listing
      ? 'Public while it is for sale'
      : isPublic
      ? `Public since ${shortDate(
          item.publishedAt!,
        )}: anyone can see it in Discover`
      : 'Private: only you can see it';
    return (
      <>
        <View style={styles.actionRow}>
          <Globe size={20} color={COLORS.sage} strokeWidth={1.6} />
          <Pressable
            accessibilityRole={isPublic ? 'link' : undefined}
            accessibilityLabel={`Collective artwork: ${status}.${
              isPublic ? ' Open it on the artwork.' : ''
            }`}
            disabled={!isPublic}
            onPress={() =>
              navigation.navigate(SCREENS.wallTile, { id: item.id })
            }
            style={({ pressed }) => [styles.flex, pressed && styles.rowPressed]}
          >
            <Text style={subText.rowTitle}>Collective artwork</Text>
            <Text style={subText.rowDescription} numberOfLines={2}>
              {status}
            </Text>
            {isPublic ? (
              <Text style={[styles.actionText, styles.viewLink]}>View</Text>
            ) : null}
          </Pressable>
          {savingVisibility ? (
            <ActivityIndicator size="small" color={COLORS.goldSolid} />
          ) : null}
          <Switch
            value={isPublic}
            onValueChange={setPublic}
            disabled={locked}
            trackColor={{
              false: 'rgba(220, 224, 214, 0.22)',
              true: COLORS.goldSolid,
            }}
            thumbColor={COLORS.cream}
            accessibilityLabel="Public on the collective artwork"
            accessibilityHint={
              item.listing
                ? 'Withdraw it from sale to make it private.'
                : undefined
            }
          />
        </View>
        {visibilityError ? (
          <Text style={[subText.error, styles.visibilityError]}>
            {visibilityError}
          </Text>
        ) : null}
      </>
    );
  };

  const demoNote = (
    <Text style={[subText.note, styles.sheetNote]}>
      Demo payment: nobody is charged.
    </Text>
  );
  const errorNote = message ? (
    <Text style={[subText.error, styles.sheetNote]}>{message}</Text>
  ) : null;

  const renderConvertSheet = (item: NftSeries) => {
    const price = item.conversionPrice
      ? formatPrice(item.conversionPrice)
      : null;
    const windowDays = membership.data?.active?.windowDays ?? 60;
    return (
      <>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Convert into an NFT
        </Text>
        <Text style={styles.sheetText}>
          The NFT certifies your achievement; it isn’t the achievement. Each
          conversion keeps you an active member for {windowDays} days, and an
          NFT can be sold on the marketplace.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {CONVERT_OPTIONS.map(option => {
            const selected = poc === option.poc;
            return (
              <Pressable
                key={option.title}
                accessibilityRole="radio"
                accessibilityState={{
                  selected,
                  checked: selected,
                  disabled: busy !== null,
                }}
                disabled={busy !== null}
                onPress={() => setPoc(option.poc)}
                android_ripple={SUB_RIPPLE}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? (
                    <Check size={13} color={COLORS.onGold} strokeWidth={3} />
                  ) : null}
                </View>
                <View style={styles.flex}>
                  <Text style={[subText.rowTitle, styles.optionTitle]}>
                    {option.title}
                  </Text>
                  <Text style={subText.rowDescription}>{option.text}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.fee}>
          <Text style={styles.factLabel}>Conversion</Text>
          <Text style={styles.feeValue}>{price ?? 'Not set'}</Text>
        </View>
        <BillingOnFile
          onEdit={() => {
            setSheet(null);
            navigation.navigate(SCREENS.billingInfo);
          }}
        />
        {demoNote}
        {errorNote}
        <AppButton
          title={price ? `Convert for ${price}` : 'Convert'}
          onPress={convert}
          disabled={busy !== null || !hasBilling}
          loading={busy === 'convert'}
          variant="primary"
          style={styles.publishButton}
          textStyle={styles.publishText}
        />
      </>
    );
  };

  const renderSellSheet = (item: NftSeries) => {
    const active = membership.data?.active;
    if (active && !active.isActive) {
      return (
        <>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            Selling is for active members
          </Text>
          <Text style={styles.sheetText}>
            {activeSummary(active).text} Each conversion keeps you active for{' '}
            {active.windowDays} days.
          </Text>
          <AppButton
            title="See active membership"
            onPress={() => {
              closeSheet();
              navigation.navigate(SCREENS.membership);
            }}
            variant="primary"
            style={styles.publishButton}
            textStyle={styles.publishText}
          />
        </>
      );
    }
    const cents = toCents(priceText);
    const proceeds = cents
      ? usd(cents - Math.round((cents * MARKET_FEE_PERCENT) / 100))
      : null;
    // The price is negotiable, but not below Papolona's suggested minimum.
    const minimum = item.suggestedResalePrice?.amountCents ?? null;
    const belowMinimum = cents !== null && minimum !== null && cents < minimum;
    return (
      <>
        <Text accessibilityRole="header" style={styles.sheetTitle}>
          Put it up for sale
        </Text>
        <Text style={styles.sheetText}>
          It becomes public in Discover, on the marketplace and the collective
          artwork. Anyone in Papolona can buy it; the NFT then moves to them.
          Papolona, as your agent, shares the sale with you equally: it keeps{' '}
          {MARKET_FEE_PERCENT}%, reinvested in the ecosystem.
        </Text>
        {item.suggestedResalePrice ? (
          <Text
            style={[
              styles.sheetText,
              belowMinimum ? styles.belowMinimum : styles.suggested,
            ]}
          >
            Papolona’s suggested minimum for this level is{' '}
            {usd(item.suggestedResalePrice.amountCents)}. You can negotiate the
            price, provided it is no lower.
          </Text>
        ) : null}
        <View style={styles.priceField}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            accessibilityLabel="Price in dollars"
            value={priceText}
            onChangeText={setPriceText}
            keyboardType="decimal-pad"
            placeholder="120"
            placeholderTextColor={COLORS.faint}
            style={styles.priceInput}
            maxLength={9}
          />
        </View>
        <View style={styles.fee}>
          <Text style={styles.factLabel}>You receive</Text>
          <Text style={styles.feeValue}>{proceeds ?? '—'}</Text>
        </View>
        {demoNote}
        {errorNote}
        <AppButton
          title={cents ? `Sell for ${usd(cents)}` : 'Sell'}
          onPress={sell}
          disabled={busy !== null || belowMinimum}
          loading={busy === 'sell'}
          variant="primary"
          style={styles.publishButton}
          textStyle={styles.publishText}
        />
      </>
    );
  };

  const renderWithdrawSheet = (item: NftSeries) => (
    <>
      <Text accessibilityRole="header" style={styles.sheetTitle}>
        Take it off sale?
      </Text>
      <Text style={styles.sheetText}>
        It leaves the marketplace and stays yours, still on the collective
        artwork. You can sell it again later.
      </Text>
      {errorNote}
      <AppButton
        title="Take off sale"
        onPress={() => item.listing && withdraw(item.listing.id)}
        disabled={busy !== null}
        loading={busy === 'withdraw'}
        variant="primary"
        style={styles.publishButton}
        textStyle={styles.publishText}
      />
    </>
  );

  const renderBody = () => {
    if (list.isPending) {
      return <ActivityIndicator color={COLORS.gold} style={styles.state} />;
    }
    if (!series) {
      return (
        <Text style={[subText.body, styles.message]}>
          {list.isError
            ? getErrorMessage(list.error, 'Could not load this series.')
            : 'This series is not in your collection.'}
        </Text>
      );
    }
    // Practice series from before singles and twins earned emblems: nothing to show.
    if (!hasEmblems(series)) {
      return (
        <Text style={[subText.body, styles.message]}>
          This practice series was made before singles and twins earned
          emblems.
        </Text>
      );
    }
    return (
      <>
        <SubSection>
          {renderEmblem(series)}
          {renderFacts(series)}
        </SubSection>
        <SubSection bleed>{renderActions(series)}</SubSection>

        <AppBottomModal
          visible={sheet !== null}
          onClose={closeSheet}
          background={SHEET_ARTWORK}
        >
          {sheet === 'convert' ? renderConvertSheet(series) : null}
          {sheet === 'sell' ? renderSellSheet(series) : null}
          {sheet === 'withdraw' ? renderWithdrawSheet(series) : null}
        </AppBottomModal>

        {zoomed && (
          <EmblemSetViewer
            artworkKey={series.artworkKey}
            length={series.length}
            revealedTiles={series.revealedTiles}
            label={`${rarityOf(series.rarity).label} Papolona emblem`}
            onClose={() => setZoomed(false)}
          />
        )}
      </>
    );
  };

  return (
    <ProfileSubScreen
      title={
        series?.nftEligible
          ? rarityOf(series.rarity).label
          : series
          ? `${series.length}-reading series`
          : 'Series'
      }
      blurred={sheet !== null}
    >
      {renderBody()}
    </ProfileSubScreen>
  );
};

export default SeriesDetail;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  state: { marginTop: hp(40) },
  message: { marginTop: hp(24), paddingHorizontal: GUTTER },

  // Black, as the emblems were made to be seen, with one thin edge.
  frame: {
    width: '100%',
    aspectRatio: 1.1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 138, 0.3)',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  framePressed: { opacity: 0.9 },
  emblem: { width: '100%', height: '100%' },
  suggested: { color: '#E8D58A' },
  belowMinimum: { color: '#E2A09A' },
  // The set of emblems, centred in the frame.
  setWrap: { flex: 1, justifyContent: 'center', padding: 8 },
  // A plain mark on a dark disc, so it stays readable over a bright emblem.
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
    borderColor: COLORS.hairline,
  },
  factRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // One column for every label, so the values line up down the page.
  factLabel: { width: wp(108), color: COLORS.muted, fontSize: font(14) },
  factValue: { flexShrink: 1, color: COLORS.cream, fontSize: font(15) },

  // Full width, so the press feedback runs edge to edge like a system list.
  actionRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingHorizontal: GUTTER,
    paddingVertical: 10,
  },
  rowPressed: { backgroundColor: 'rgba(232, 213, 138, 0.07)' },
  actionText: {
    marginRight: -wp(10),
    color: COLORS.gold,
    fontSize: font(15),
    fontWeight: '600',
  },

  sheetTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  sheetText: {
    marginTop: hp(8),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  sheetNote: { marginTop: hp(12) },
  options: { marginTop: hp(14), gap: 8 },
  // Each choice is a surface of its own, with a dark wash so it reads on the artwork.
  option: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(14),
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  optionSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(58, 52, 28, 0.9)',
  },
  optionTitle: { flexShrink: 1 },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.faint,
    borderRadius: 12,
  },
  radioSelected: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold,
  },
  priceField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: hp(16),
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 14,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  currency: { color: COLORS.muted, fontSize: font(18) },
  priceInput: {
    flex: 1,
    color: COLORS.cream,
    fontSize: font(18),
    paddingVertical: 10,
  },
  fee: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  feeValue: { color: COLORS.cream, fontSize: font(18), fontWeight: '600' },
  publishButton: { marginTop: hp(16), backgroundColor: COLORS.goldSolid },
  viewLink: { marginTop: hp(4), marginRight: 0 },
  visibilityError: { paddingHorizontal: GUTTER, marginBottom: hp(8) },
  publishText: { color: COLORS.onGold },
});
