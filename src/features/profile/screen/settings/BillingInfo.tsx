import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import AppButton from '@/components/AppButton';
import { getErrorMessage } from '@/services/api';
import { useBilling } from '@/services/queries';
import { queryKeys } from '@/services/queryKeys';
import {
  saveBilling,
  type BillingInfo,
  type BillingStatus,
} from '@/services/session';
import { font, hp } from '@/utils/responsive';
import ProfileSubScreen, {
  SubSection,
  SUB_COLORS as COLORS,
  subText,
} from '../../component/ProfileSubScreen';

type Field = {
  key: keyof BillingInfo;
  label: string;
  optional?: boolean;
  keyboard?: 'email-address' | 'phone-pad';
  autoComplete?:
    | 'name'
    | 'email'
    | 'tel'
    | 'address-line1'
    | 'address-line2'
    | 'postal-code'
    | 'country';
  maxLength: number;
};

const CONTACT: Field[] = [
  { key: 'fullName', label: 'Full name', autoComplete: 'name', maxLength: 120 },
  {
    key: 'email',
    label: 'Email for receipts',
    keyboard: 'email-address',
    autoComplete: 'email',
    maxLength: 200,
  },
  {
    key: 'phone',
    label: 'Phone (optional)',
    optional: true,
    keyboard: 'phone-pad',
    autoComplete: 'tel',
    maxLength: 30,
  },
];

const ADDRESS: Field[] = [
  {
    key: 'addressLine1',
    label: 'Address',
    autoComplete: 'address-line1',
    maxLength: 200,
  },
  {
    key: 'addressLine2',
    label: 'Address line 2 (optional)',
    optional: true,
    autoComplete: 'address-line2',
    maxLength: 200,
  },
  { key: 'city', label: 'City', maxLength: 100 },
  {
    key: 'postcode',
    label: 'Postcode',
    autoComplete: 'postal-code',
    maxLength: 20,
  },
  { key: 'country', label: 'Country', autoComplete: 'country', maxLength: 80 },
];

const EMPTY: BillingInfo = {
  fullName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  country: '',
};

/** The form's starting values: what was saved, or the account's name, email and phone. */
const startFrom = (status: BillingStatus): BillingInfo => {
  if (status.billing) {
    const { fullName, email, phone, addressLine1, addressLine2, city } =
      status.billing;
    const { postcode, country } = status.billing;
    return {
      fullName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      postcode,
      country,
    };
  }
  return { ...EMPTY, ...status.suggested };
};

/**
 * Billing info, from the Profile tab: who pays and where they live. Every payment uses it (NFT conversions,
 * buying an NFT, the package), and the package is posted to this address.
 */
const BillingInfoScreen = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const billing = useBilling();
  const [form, setForm] = useState<BillingInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Filled once, when the saved info (or the account's details) arrives.
  useEffect(() => {
    if (billing.data && !form) setForm(startFrom(billing.data));
  }, [billing.data, form]);

  const save = async () => {
    if (!form || busy) return;
    const missing = [...CONTACT, ...ADDRESS].some(
      f => !f.optional && !form[f.key].trim(),
    );
    if (missing) {
      setMessage('Fill in your name, email and full address.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const saved = await saveBilling(form);
      queryClient.setQueryData<BillingStatus>(queryKeys.billing, old =>
        old ? { ...old, billing: saved } : old,
      );
      navigation.goBack();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const renderFields = (fields: Field[]) =>
    fields.map(field => (
      <TextInput
        key={field.key}
        accessibilityLabel={field.label}
        placeholder={field.label}
        placeholderTextColor="#7F8678"
        value={form?.[field.key] ?? ''}
        onChangeText={value =>
          setForm(f => (f ? { ...f, [field.key]: value } : f))
        }
        keyboardType={field.keyboard ?? 'default'}
        autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
        autoComplete={field.autoComplete ?? 'off'}
        maxLength={field.maxLength}
        style={styles.input}
      />
    ));

  const renderBody = () => {
    if (billing.isPending || (!form && !billing.isError)) {
      return <ActivityIndicator color={COLORS.gold} style={styles.center} />;
    }
    if (billing.isError) {
      return (
        <SubSection>
          <Text style={subText.error}>
            {getErrorMessage(
              billing.error,
              'Could not load your billing info.',
            )}
          </Text>
        </SubSection>
      );
    }
    return (
      <>
        <SubSection>
          <Text style={subText.rowDescription}>
            Used for every payment: converting an emblem into an NFT, buying an
            NFT, and your package, which is posted to this address. Payments are
            demo payments for now.
          </Text>
        </SubSection>
        <SubSection title="Contact">
          <View style={styles.fields}>{renderFields(CONTACT)}</View>
        </SubSection>
        <SubSection title="Billing address">
          <View style={styles.fields}>{renderFields(ADDRESS)}</View>
        </SubSection>
        <SubSection>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <AppButton
            title="Save billing info"
            onPress={save}
            disabled={busy}
            loading={busy}
            variant="primary"
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </SubSection>
      </>
    );
  };

  return (
    <ProfileSubScreen title="Billing info">{renderBody()}</ProfileSubScreen>
  );
};

export default BillingInfoScreen;

const styles = StyleSheet.create({
  center: { marginTop: hp(40) },
  fields: { gap: 8 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    color: COLORS.cream,
    fontSize: font(15),
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    backgroundColor: 'rgba(4, 10, 7, 0.55)',
  },
  error: { marginBottom: hp(10), color: COLORS.red, fontSize: font(13) },
  button: { backgroundColor: COLORS.goldSolid },
  buttonText: { color: COLORS.onGold },
});
