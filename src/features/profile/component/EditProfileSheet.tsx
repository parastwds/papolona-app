import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import AppBottomModal from '@/components/AppBottomModal';
import { font, hp, wp } from '@/utils/responsive';
import { getErrorMessage } from '@/services/api';
import {
  ChangeCodeSent,
  CurrentUser,
  confirmEmailChange,
  confirmPhoneChange,
  requestEmailChange,
  requestPhoneChange,
  updateCurrentUserName,
} from '@/services/session';

type Step = 'details' | 'email' | 'phone' | 'code';
type ContactField = 'email' | 'phone';

interface EditProfileSheetProps {
  visible: boolean;
  user: CurrentUser | null;
  onClose: () => void;
  onUserUpdated: (user: CurrentUser) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

const EditProfileSheet = ({
  visible,
  user,
  onClose,
  onUserUpdated,
}: EditProfileSheetProps) => {
  const [step, setStep] = useState<Step>('details');
  const [codeFor, setCodeFor] = useState<ContactField>('email');
  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState<ChangeCodeSent | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep('details');
    setName(user?.name || '');
    setError('');
    setNotice('');
    // Only reset when the sheet opens; `user` changes while it is open after each save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const goTo = (next: Step) => {
    setError('');
    setNotice('');
    setStep(next);
  };

  const run = async (action: () => Promise<void>, fallback: string) => {
    setIsBusy(true);
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError, fallback));
    } finally {
      setIsBusy(false);
    }
  };

  const trimmedName = name.trim();
  const nameChanged = !!user && trimmedName !== user.name;

  const saveName = () => {
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError('Your name must be between 2 and 80 characters.');
      return;
    }
    run(async () => {
      const updated = await updateCurrentUserName(trimmedName);
      onUserUpdated(updated);
      setNotice('Your name has been updated.');
    }, 'Unable to update your name. Please try again.');
  };

  const openEmail = () => {
    setNewEmail('');
    setCurrentPassword('');
    goTo('email');
  };

  const openPhone = () => {
    setNewPhone(user?.phone || '');
    goTo('phone');
  };

  const normalizedPhone = newPhone.replace(/[\s\-().]/g, '');

  const sendCode = (field: ContactField) => {
    if (field === 'email') {
      const email = newEmail.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        setError('Enter a valid email address.');
        return;
      }
      if (email === user?.email) {
        setError('This is already your email.');
        return;
      }
      if (!currentPassword) {
        setError('Enter your current password.');
        return;
      }
    } else if (normalizedPhone && !PHONE_PATTERN.test(normalizedPhone)) {
      setError('Enter your number with country code, e.g. +919876543210.');
      return;
    }

    run(async () => {
      const sent =
        field === 'email'
          ? await requestEmailChange(
              newEmail.trim().toLowerCase(),
              currentPassword,
            )
          : await requestPhoneChange(normalizedPhone || null);
      setCodeSent(sent);
      setCodeFor(field);
      setCode('');
      setStep('code');
      setNotice('');
    }, 'Unable to send a code. Please try again.');
  };

  const confirmCode = () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    run(async () => {
      const updated =
        codeFor === 'email'
          ? await confirmEmailChange(code)
          : await confirmPhoneChange(code);
      onUserUpdated(updated);
      setStep('details');
      setNotice(
        codeFor === 'email'
          ? 'Your email has been changed.'
          : updated.phone
          ? 'Your mobile number has been changed.'
          : 'Your mobile number has been removed.',
      );
    }, 'Unable to confirm the code. Please try again.');
  };

  const close = () => {
    if (!isBusy) onClose();
  };

  // The title of the step, with a back arrow on every step after the first.
  const renderHeader = (title: string, back = true) => (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          disabled={isBusy}
          android_ripple={BACK_RIPPLE}
          onPress={() => goTo(step === 'code' ? codeFor : 'details')}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <ArrowLeft size={22} color={COLORS.text} strokeWidth={1.7} />
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    </View>
  );

  const renderMessages = () => (
    <>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </>
  );

  const renderDetails = () => (
    <>
      {renderHeader('Edit profile', false)}
      <Field
        label="Full name"
        value={name}
        onChangeText={value => {
          setName(value);
          setNotice('');
        }}
        autoCapitalize="words"
        maxLength={80}
        placeholder="Your name"
        editable={!isBusy}
      />
      <View style={styles.contact}>
        <ContactRow
          label="Email"
          value={user?.email || '—'}
          onPress={openEmail}
          disabled={isBusy}
        />
        <View style={styles.divider} />
        <ContactRow
          label="Mobile"
          value={user?.phone || 'Not set'}
          muted={!user?.phone}
          onPress={openPhone}
          disabled={isBusy}
        />
      </View>
      <Text style={styles.hint}>
        Email and mobile changes are confirmed with a code sent by email.
      </Text>
      {renderMessages()}
      <AppButton
        title={nameChanged ? (isBusy ? 'Saving…' : 'Save changes') : 'Done'}
        onPress={nameChanged ? saveName : close}
        disabled={isBusy}
        variant="primary"
        style={styles.primaryButton}
        textStyle={styles.primaryButtonText}
      />
    </>
  );

  const renderEmail = () => (
    <>
      {renderHeader('Change email')}
      <Text style={styles.description}>
        Currently {user?.email}. We will send a code to the new address.
      </Text>
      <Field
        label="New email"
        autoFocus
        value={newEmail}
        onChangeText={setNewEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        editable={!isBusy}
      />
      <Field
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        placeholder="Confirm it's you"
        editable={!isBusy}
      />
      {renderMessages()}
      <AppButton
        title={isBusy ? 'Sending…' : 'Send code'}
        onPress={() => sendCode('email')}
        disabled={isBusy}
        variant="primary"
        style={styles.primaryButton}
        textStyle={styles.primaryButtonText}
      />
    </>
  );

  const renderPhone = () => (
    <>
      {renderHeader(user?.phone ? 'Change mobile number' : 'Add mobile number')}
      <Text style={styles.description}>
        Include your country code. We will email a code to {user?.email} to
        confirm.
        {user?.phone ? ' Leave it empty to remove your number.' : ''}
      </Text>
      <Field
        label="Mobile number"
        autoFocus
        value={newPhone}
        onChangeText={setNewPhone}
        autoComplete="tel"
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        editable={!isBusy}
      />
      {renderMessages()}
      <AppButton
        title={
          isBusy
            ? 'Sending…'
            : !normalizedPhone && user?.phone
            ? 'Send code to remove'
            : 'Send code'
        }
        onPress={() => sendCode('phone')}
        disabled={isBusy || (!normalizedPhone && !user?.phone)}
        variant="primary"
        style={styles.primaryButton}
        textStyle={styles.primaryButtonText}
      />
    </>
  );

  const renderCode = () => (
    <>
      {renderHeader('Enter the code')}
      <Text style={styles.description}>
        {codeSent?.message ||
          'We sent a 6-digit code to your email. Enter it to confirm.'}
      </Text>
      <TextInput
        accessibilityLabel="6-digit code"
        autoComplete="one-time-code"
        autoFocus
        editable={!isBusy}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={value => setCode(value.replace(/\D/g, ''))}
        placeholder="••••••"
        placeholderTextColor={COLORS.placeholder}
        style={[styles.input, styles.codeInput]}
        textContentType="oneTimeCode"
        value={code}
      />
      {codeSent ? (
        <Text style={styles.hint}>
          The code expires in {codeSent.expiresInMinutes} minutes.
        </Text>
      ) : null}
      {renderMessages()}
      <AppButton
        title={isBusy ? 'Confirming…' : 'Confirm'}
        onPress={confirmCode}
        disabled={isBusy || code.length !== 6}
        variant="primary"
        style={styles.primaryButton}
        textStyle={styles.primaryButtonText}
      />
      <Pressable
        accessibilityRole="button"
        disabled={isBusy}
        onPress={() => sendCode(codeFor)}
        style={({ pressed }) => [styles.resend, pressed && styles.pressed]}
      >
        <Text style={styles.resendText}>Resend code</Text>
      </Pressable>
    </>
  );

  return (
    <AppBottomModal
      visible={visible}
      onClose={close}
      background={SHEET_ARTWORK}
    >
      {step === 'details' && renderDetails()}
      {step === 'email' && renderEmail()}
      {step === 'phone' && renderPhone()}
      {step === 'code' && renderCode()}
    </AppBottomModal>
  );
};

export default EditProfileSheet;

const Field = ({
  label,
  ...inputProps
}: TextInputProps & { label: string }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label.toLowerCase()}
      placeholderTextColor={COLORS.placeholder}
      style={styles.input}
      {...inputProps}
    />
  </View>
);

/** A contact detail and its value, with "Change" to open the step that changes it. */
const ContactRow = ({
  label,
  value,
  muted,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  muted?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Change ${label.toLowerCase()}`}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
  >
    <View style={styles.contactText}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        style={[styles.contactValue, muted && styles.contactValueMuted]}
      >
        {value}
      </Text>
    </View>
    <Text style={styles.changeText}>{muted ? 'Add' : 'Change'}</Text>
  </Pressable>
);

const COLORS = {
  gold: '#E8D58A',
  text: '#F1EEE0',
  sage: '#A1BE94',
  // Cream held back, for descriptions and labels; both clear 4.5:1 on the sheet.
  muted: '#B4B8AB',
  placeholder: '#8F9488',
  outline: 'rgba(161, 190, 148, 0.32)',
  hairline: 'rgba(161, 190, 148, 0.2)',
  error: '#F0A29A',
  success: '#A9CF95',
};

// The onboarding artwork: butterflies round the edges, dark and calm behind the form.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

const BACK_RIPPLE = {
  color: 'rgba(232, 213, 138, 0.14)',
  borderless: true,
  radius: 24,
};

const styles = StyleSheet.create({
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    marginBottom: hp(8),
  },
  // A 48 touch area; pulled left so the arrow itself lines up with the text below.
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -13,
  },
  title: {
    flex: 1,
    color: COLORS.text,
    fontFamily: 'serif',
    fontSize: font(22),
  },
  description: {
    marginBottom: hp(14),
    color: COLORS.muted,
    fontSize: font(14),
    lineHeight: font(20),
  },
  field: {
    marginBottom: hp(12),
  },
  label: {
    marginBottom: hp(6),
    color: COLORS.sage,
    fontSize: font(13),
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.outline,
    borderRadius: 12,
    // A dark wash, so the field reads as a surface on the artwork.
    backgroundColor: 'rgba(4, 10, 7, 0.5)',
    color: COLORS.text,
    fontSize: font(16),
  },
  codeInput: {
    minHeight: 60,
    fontSize: font(24),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 10,
    textAlign: 'center',
  },
  contact: {
    marginTop: hp(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  contactRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingVertical: 10,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    color: COLORS.muted,
    fontSize: font(13),
  },
  contactValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: font(16),
  },
  contactValueMuted: {
    color: COLORS.muted,
  },
  changeText: {
    color: COLORS.gold,
    fontSize: font(15),
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
  },
  hint: {
    marginTop: hp(12),
    color: COLORS.muted,
    fontSize: font(13),
    lineHeight: font(19),
  },
  error: {
    marginTop: hp(12),
    color: COLORS.error,
    fontSize: font(14),
    lineHeight: font(20),
  },
  notice: {
    marginTop: hp(12),
    color: COLORS.success,
    fontSize: font(14),
    lineHeight: font(20),
  },
  primaryButton: {
    marginTop: hp(16),
    backgroundColor: '#D9C77E',
  },
  primaryButtonText: {
    color: '#172016',
  },
  resend: {
    minHeight: 44,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: hp(8),
    paddingHorizontal: 12,
  },
  resendText: {
    color: COLORS.gold,
    fontSize: font(15),
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
