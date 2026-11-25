import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import AppBottomModal from '@/components/AppBottomModal';
import AppButton from '@/components/AppButton';
import BillingOnFile, { useHasBilling } from '@/components/BillingOnFile';
import { getErrorMessage } from '@/services/api';
import {
  formatPrice,
  orderPackage,
  type Membership,
  type Package,
  type StoneAddress,
} from '@/services/session';
import { font, hp } from '@/utils/responsive';

const SHEET_ARTWORK = require('@assets/onboarding_bg.png');
const CREAM = '#F1EEE0';
const MUTED = '#B4B8AB';

const FIELDS: { key: keyof StoneAddress; label: string; optional?: boolean }[] =
  [
    { key: 'recipientName', label: 'Full name' },
    { key: 'addressLine1', label: 'Address' },
    { key: 'addressLine2', label: 'Address line 2 (optional)', optional: true },
    { key: 'city', label: 'City' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'country', label: 'Country' },
  ];

const AUTOCOMPLETE: Partial<
  Record<
    keyof StoneAddress,
    'name' | 'postal-code' | 'country' | 'address-line1' | 'address-line2'
  >
> = {
  recipientName: 'name',
  postcode: 'postal-code',
  country: 'country',
  addressLine1: 'address-line1',
  addressLine2: 'address-line2',
};

type Props = {
  // The package being bought; null keeps the sheet closed.
  pkg: Package | null;
  onClose: () => void;
  onOrdered: (membership: Membership) => void;
  // Opens Billing info (the sheet closes first).
  onEditBilling: () => void;
};

/** The package: where to post it, what it costs with postage, and the (demo) order. */
const PackageOrderSheet = ({
  pkg,
  onClose,
  onOrdered,
  onEditBilling,
}: Props) => {
  const { ready: hasBilling, billing } = useHasBilling();
  const [address, setAddress] = useState<StoneAddress>({
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const price = (amountCents: number) =>
    formatPrice({ amountCents, currency: pkg?.currency ?? 'USD' });
  const missing = FIELDS.some(f => !f.optional && !address[f.key]?.trim());

  // Each time the sheet opens, the postal address starts as the billing address from the Profile tab.
  useEffect(() => {
    if (!pkg || !billing) return;
    setAddress({
      recipientName: billing.fullName,
      addressLine1: billing.addressLine1,
      addressLine2: billing.addressLine2,
      city: billing.city,
      postcode: billing.postcode,
      country: billing.country,
    });
  }, [pkg, billing]);

  const order = async () => {
    if (busy || !pkg || !hasBilling) return;
    if (missing) {
      setMessage('Fill in your name and full address.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      onOrdered(await orderPackage(pkg.id, address));
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not order. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppBottomModal
      visible={Boolean(pkg)}
      onClose={() => {
        setMessage('');
        onClose();
      }}
      background={SHEET_ARTWORK}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {pkg?.title}
      </Text>
      <Text style={styles.text}>
        We post the meditation stone, the Enigma Prism Triptych and your
        initiation materials to your billing address, unless you change it here.
      </Text>
      <View style={styles.fields}>
        {FIELDS.map(field => (
          <TextInput
            key={field.key}
            accessibilityLabel={field.label}
            placeholder={field.label}
            placeholderTextColor="#7F8678"
            value={address[field.key] ?? ''}
            onChangeText={value =>
              setAddress(a => ({ ...a, [field.key]: value }))
            }
            autoComplete={AUTOCOMPLETE[field.key] ?? 'off'}
            style={styles.input}
            maxLength={field.key === 'postcode' ? 20 : 200}
          />
        ))}
      </View>
      {pkg ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{pkg.title}</Text>
            <Text style={styles.value}>{price(pkg.priceCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Postage</Text>
            <Text style={styles.value}>{price(pkg.postageCents)}</Text>
          </View>
          <View style={[styles.row, styles.total]}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.totalValue}>{price(pkg.totalCents)}</Text>
          </View>
        </>
      ) : null}
      <BillingOnFile onEdit={onEditBilling} />
      <Text style={styles.note}>Demo payment: nobody is charged.</Text>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <AppButton
        title={pkg ? `Buy for ${price(pkg.totalCents)}` : 'Buy'}
        onPress={order}
        disabled={busy || !hasBilling}
        loading={busy}
        variant="primary"
        style={styles.button}
        textStyle={styles.buttonText}
      />
    </AppBottomModal>
  );
};

export default PackageOrderSheet;

const styles = StyleSheet.create({
  title: { color: CREAM, fontFamily: 'serif', fontSize: font(22) },
  text: {
    marginTop: hp(8),
    color: MUTED,
    fontSize: font(14),
    lineHeight: font(20),
  },
  fields: { marginTop: hp(14), gap: 8 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    color: CREAM,
    fontSize: font(15),
    borderWidth: 1,
    borderColor: 'rgba(161, 190, 148, 0.32)',
    borderRadius: 12,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: hp(10),
  },
  total: {
    paddingTop: hp(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(161, 190, 148, 0.2)',
  },
  label: { flexShrink: 1, color: MUTED, fontSize: font(14) },
  value: { color: CREAM, fontSize: font(14) },
  totalValue: { color: '#E8D58A', fontSize: font(17), fontWeight: '600' },
  note: { marginTop: hp(12), color: MUTED, fontSize: font(12) },
  error: { marginTop: hp(8), color: '#F0A29A', fontSize: font(13) },
  button: { marginTop: hp(14), backgroundColor: '#D9C77E' },
  buttonText: { color: '#172016' },
});
