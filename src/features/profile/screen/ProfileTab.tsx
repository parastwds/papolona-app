import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Camera,
  CircleHelp,
  CreditCard,
  Heart,
  ShoppingBag,
  Settings,
  UserRound,
} from 'lucide-react-native';

import AppButton from '@/components/AppButton';
import AppBottomModal from '@/components/AppBottomModal';
import AppSpace from '@/components/AppSpace';
import { COLORS as THEME_COLORS } from '@/theme/colors';
import { SCREENS } from '@/constants/screens';
import { font, hp, wp } from '@/utils/responsive';
import { RootStackParamList } from '@/navigation/types';
import CustomHeader from '@/components/CustomHeader';
import { probationCompact } from '@/features/home/probation';
import AppMenuItem from '../component/AppMenuItem';
import EditProfileSheet from '../component/EditProfileSheet';
import PhotoViewer from '@/components/PhotoViewer';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import {
  CurrentUser,
  logout,
  uploadCurrentUserAvatar,
} from '@/services/session';
import {
  useCurrentUser,
  useMembership,
  useMyListings,
  useProbation,
  useProfileAccessRequests,
} from '@/services/queries';
import { formatPrice } from '@/services/session';
import { useSyncTimeZone } from '@/services/useSyncTimeZone';
import { useCachedAvatar } from '@/services/avatarCache';
import { queryKeys } from '@/services/queryKeys';

// The same artwork the other sheets lay behind their content.
const SHEET_ARTWORK = require('@assets/onboarding_bg.png');

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** 'IN' -> 'India', in the phone's language; the code itself if unknown. */
const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames([], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

const ProfileTab = () => {
  const [logoutConfirmationVisible, setLogoutConfirmationVisible] =
    useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const queryClient = useQueryClient();
  // Cached profile: shown instantly, refreshed on focus/foreground when stale.
  const {
    data: user,
    error: loadError,
    isLoading: isUserLoading,
  } = useCurrentUser();
  const setUser = (updated: CurrentUser) =>
    queryClient.setQueryData(queryKeys.currentUser, updated);
  const loadErrorMessage = loadError
    ? user
      ? 'Could not refresh your profile. Showing saved details.'
      : loadError instanceof Error
      ? loadError.message
      : 'Unable to load your profile.'
    : '';
  const profileError = uploadError || loadErrorMessage;
  const navigation = useNavigation<RootNavigationProp>();
  // Saves the phone's time zone, which reminder emails are timed by.
  const timeZone = useSyncTimeZone();
  const probation = useProbation();
  const accessRequests = useProfileAccessRequests();
  const membership = useMembership(user?.status === 'member');
  // NFTs the user has sold on the marketplace, and what they received.
  const sold = (useMyListings(!!user).data?.listings ?? []).filter(
    l => l.status === 'sold',
  );
  const received = sold.reduce((n, l) => n + (l.sellerProceedsCents ?? 0), 0);
  const progress = probation.data;
  const canUpgrade =
    user?.status === 'member' &&
    (membership.data?.membershipType ?? 'explorer') === 'explorer';
  // "Creator", from the membership chosen at graduation; empty until chosen.
  const typeTitle =
    membership.data?.membershipTypes?.find(
      t => t.id === membership.data?.membershipType,
    )?.title ?? '';
  const statusText = !user
    ? ''
    : user.status === 'member'
    ? membership.data?.active?.isActive
      ? `Active ${typeTitle ? `${typeTitle} ` : ''}member`
      : `${typeTitle ? `${typeTitle} ` : ''}Member`
    : progress?.complete
    ? 'Apprenticeship complete'
    : progress
    ? `Apprentice · ${probationCompact(progress)}`
    : user.status.charAt(0).toUpperCase() + user.status.slice(1);
  // What the account holds, as label and value; null where nothing is set yet.
  const details: { label: string; value: string | null }[] = user
    ? [
        { label: 'Email', value: user.email },
        { label: 'Mobile', value: user.phone || null },
        {
          label: 'Country',
          value: user.profile.country
            ? countryName(user.profile.country)
            : null,
        },
        {
          label: 'Time zone',
          value: (user.profile.timezone ?? timeZone).replace(/_/g, ' '),
        },
        ...(sold.length > 0
          ? [
              {
                label: 'NFTs sold',
                value: `${sold.length} · ${formatPrice({
                  amountCents: received,
                  currency: sold[0].currency,
                })} received`,
              },
            ]
          : []),
        ...(user.createdAt
          ? [
              {
                label: 'Joined',
                value: new Date(user.createdAt).toLocaleDateString([], {
                  month: 'long',
                  year: 'numeric',
                }),
              },
            ]
          : []),
      ]
    : [];
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const logoutHandler = () => {
    setLogoutConfirmationVisible(true);
  };

  const chooseAndUploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;

    setIsUploadingAvatar(true);
    setUploadError('');
    try {
      // The new user lands in the cache, which updates this screen.
      await uploadCurrentUserAvatar(result.assets[0].uri);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Unable to update your photo. Please try again.',
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const hasAvatar = !!user?.profile.avatarUrl;
  // Saved as a local file once per photo URL; no network after the first load.
  const avatar = useCachedAvatar(user?.profile.avatarUrl);

  const confirmLogout = async () => {
    setLogoutConfirmationVisible(false);
    try {
      await logout();
    } catch {
      // The local tokens are cleared even if the server cannot be reached.
    } finally {
      rootNavigation?.reset({
        index: 0,
        routes: [{ name: SCREENS.welcome }],
      });
    }
  };

  return (
    <ImageBackground
      source={require('../../../../assets/profile_bg.png')}
      resizeMode="cover"
      style={[
        styles.background,
        (editProfileVisible || logoutConfirmationVisible) && styles.blurred,
      ]}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CustomHeader
          title="Profile"
          rightIcon={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile details"
              disabled={!user || isUserLoading}
              hitSlop={8}
              android_ripple={EDIT_RIPPLE}
              onPress={() => setEditProfileVisible(true)}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.pressed,
                (!user || isUserLoading) && styles.disabled,
              ]}
            >
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          }
          txtStyle={styles.headerTitle}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Who this is: photo, name and standing, read left to right. */}
          <View style={styles.identity}>
            <Pressable
              accessibilityRole={hasAvatar ? 'imagebutton' : 'button'}
              accessibilityLabel={
                hasAvatar ? 'View full profile photo' : 'Add profile photo'
              }
              disabled={!user || isUserLoading || isUploadingAvatar}
              onPress={
                hasAvatar ? () => setIsPhotoOpen(true) : chooseAndUploadAvatar
              }
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View style={styles.avatar}>
                {isUserLoading || avatar.loading ? (
                  <ActivityIndicator color={COLORS.gold} />
                ) : hasAvatar ? (
                  <Image
                    source={avatar.uri}
                    contentFit="cover"
                    // Already a local file; keep decoded copies in memory only.
                    cachePolicy="memory"
                    transition={200}
                    style={styles.avatarImage}
                    accessibilityLabel={`${user!.name} profile photo`}
                  />
                ) : (
                  <UserRound size={34} color={COLORS.gold} strokeWidth={1.3} />
                )}
                {isUploadingAvatar ? (
                  <View style={styles.avatarUploading}>
                    <ActivityIndicator color={COLORS.gold} />
                  </View>
                ) : null}
              </View>
              {user && !isUserLoading ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    hasAvatar ? 'Change profile photo' : 'Add profile photo'
                  }
                  disabled={isUploadingAvatar}
                  // The mark is small; the area that takes the touch is 48 across.
                  hitSlop={10}
                  onPress={chooseAndUploadAvatar}
                  style={({ pressed }) => [
                    styles.avatarBadge,
                    pressed && styles.pressed,
                  ]}
                >
                  <Camera size={14} color={COLORS.ink} strokeWidth={2} />
                </Pressable>
              ) : null}
            </Pressable>

            <View style={styles.identityText}>
              <Text
                style={[styles.name, !user && styles.nameMuted]}
                numberOfLines={2}
              >
                {isUserLoading
                  ? 'Loading…'
                  : user?.name || 'Profile unavailable'}
              </Text>
              {statusText ? (
                <Text style={styles.status} numberOfLines={1}>
                  {statusText}
                </Text>
              ) : null}
            </View>
          </View>

          {user?.profile.bio ? (
            <Text style={styles.bio} numberOfLines={4}>
              {user.profile.bio}
            </Text>
          ) : null}
          {profileError ? (
            <Text style={styles.error}>{profileError}</Text>
          ) : null}

          {details.length > 0 ? (
            <View style={styles.details}>
              {details.map(({ label, value }, index) => (
                <View
                  key={label}
                  accessible
                  accessibilityLabel={`${label}: ${value ?? 'not set'}`}
                  style={[styles.detailRow, index > 0 && styles.rowDivider]}
                >
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={[
                      styles.detailValue,
                      !value && styles.detailValueUnset,
                    ]}
                  >
                    {value ?? 'Not set'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.menu}>
            <AppMenuItem
              title="Notifications & reminders"
              icon={Bell}
              // Members waiting to see your readings and NFTs.
              badge={
                accessRequests.data?.length
                  ? `${accessRequests.data.length} NEW`
                  : undefined
              }
              onPress={() => navigation.navigate(SCREENS.reminders)}
            />
            <View style={styles.menuDivider} />
            <AppMenuItem
              title="Membership & purchases"
              icon={ShoppingBag}
              // Explorers can move up to Creator or Collector.
              badge={canUpgrade ? 'UPGRADE!' : undefined}
              onPress={() => navigation.navigate(SCREENS.purchases)}
            />
            <View style={styles.menuDivider} />
            <AppMenuItem
              title="Billing info"
              icon={CreditCard}
              onPress={() => navigation.navigate(SCREENS.billingInfo)}
            />
            <View style={styles.menuDivider} />
            <AppMenuItem
              title="Settings"
              icon={Settings}
              onPress={() => navigation.navigate(SCREENS.settings)}
            />
            <View style={styles.menuDivider} />
            <AppMenuItem
              title="Help & information"
              icon={CircleHelp}
              onPress={() => navigation.navigate(SCREENS.helpInformation)}
            />
            <View style={styles.menuDivider} />
            <AppMenuItem
              title="Support Papolona"
              icon={Heart}
              onPress={() => navigation.navigate(SCREENS.donate)}
            />
          </View>

          {/* Set apart from the places above: this one ends the session. */}
          <View style={styles.logout}>
            <AppButton
              title="Log out"
              onPress={logoutHandler}
              variant="outline"
              style={styles.logoutButton}
              textStyle={styles.logoutText}
            />
          </View>
        </ScrollView>

        {hasAvatar ? (
          <PhotoViewer
            uri={avatar.uri ?? user!.profile.avatarUrl!}
            name={user!.name}
            visible={isPhotoOpen}
            onClose={() => setIsPhotoOpen(false)}
          />
        ) : null}

        <EditProfileSheet
          visible={editProfileVisible}
          user={user ?? null}
          onClose={() => setEditProfileVisible(false)}
          onUserUpdated={setUser}
        />

        <AppBottomModal
          visible={logoutConfirmationVisible}
          onClose={() => setLogoutConfirmationVisible(false)}
          background={SHEET_ARTWORK}
        >
          <Text style={styles.logoutModalTitle}>Log out of Papolona?</Text>
          <Text style={styles.logoutModalDescription}>
            Your readings and series stay with your account. Sign back in
            whenever you are ready.
          </Text>
          <AppButton
            title="Log out"
            onPress={confirmLogout}
            variant="primary"
            style={styles.confirmLogoutButton}
            textStyle={styles.confirmLogoutText}
          />
          <AppSpace size={12} />
          <AppButton
            title="Stay logged in"
            onPress={() => setLogoutConfirmationVisible(false)}
            variant="outline"
            style={styles.cancelLogoutButton}
            textStyle={styles.cancelLogoutText}
          />
        </AppBottomModal>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default ProfileTab;

const COLORS = {
  bottomBg: THEME_COLORS.bottomBg,
  gold: '#E8D58A',
  // Warm off-white, and the dark green that sits on gold.
  cream: '#F1EEE0',
  ink: '#172016',
  sage: '#A1BE94',
  // Cream held back, for labels and unset values; still clears 4.5:1 on the dark.
  muted: '#A3A89B',
  hairline: 'rgba(161, 190, 148, 0.2)',
};

const AVATAR_SIZE = 80;
const GUTTER = wp(20);
// The log out button's tint: the same soft red as other actions that end something.
const LOGOUT_RED = '#F2B8B1';
const EDIT_RIPPLE = { color: 'rgba(232, 213, 138, 0.18)', borderless: true };

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.bottomBg,
  },
  // While the edit sheet is open, the tab falls slightly out of focus behind it.
  // Drawn by the platform: Android 12 and later blur, anything else stays sharp.
  blurred: { filter: [{ blur: 1.5 }] },
  // Deeper than on the other tabs: the text here sits on the artwork, not on cards.
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 8, 5, 0.8)',
  },
  safeArea: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(25),
  },
  editButton: {
    minWidth: 48,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  editText: {
    color: COLORS.gold,
    fontSize: font(15),
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: hp(16),
    // Clears the floating tab bar, like the other tabs.
    paddingBottom: hp(120),
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(16),
    paddingHorizontal: GUTTER,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 213, 138, 0.7)',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(232, 213, 138, 0.08)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarUploading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 5, 2, 0.55)',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // The ring is the page's own colour, so the mark reads as cut into the photo.
    borderWidth: 2,
    borderColor: '#060B08',
    borderRadius: 14,
    backgroundColor: COLORS.gold,
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(28),
    lineHeight: font(34),
  },
  nameMuted: {
    color: COLORS.muted,
  },
  status: {
    marginTop: 4,
    color: COLORS.gold,
    fontSize: font(14),
  },
  bio: {
    marginTop: hp(16),
    paddingHorizontal: GUTTER,
    color: '#D5D8CB',
    fontSize: font(15),
    lineHeight: font(22),
  },
  error: {
    marginTop: hp(12),
    paddingHorizontal: GUTTER,
    color: '#F0A29A',
    fontSize: font(13),
    lineHeight: font(18),
  },
  details: {
    marginTop: hp(28),
    marginHorizontal: GUTTER,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  detailRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.hairline,
  },
  // One column for every label, so the values line up down the page.
  detailLabel: {
    width: wp(88),
    color: COLORS.muted,
    fontSize: font(14),
  },
  detailValue: {
    flex: 1,
    color: COLORS.cream,
    fontSize: font(15),
  },
  detailValueUnset: {
    color: COLORS.muted,
  },
  menu: {
    marginTop: hp(20),
  },
  // Starts under the titles, past the icons, as a system list's dividers do.
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: GUTTER + 20 + wp(16),
    marginRight: GUTTER,
    backgroundColor: COLORS.hairline,
  },
  logout: {
    marginTop: hp(28),
    paddingHorizontal: GUTTER,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(217, 112, 102, 0.85)',
    backgroundColor: 'rgba(196, 72, 62, 0.28)',
  },
  logoutText: { color: LOGOUT_RED, letterSpacing: 0 },
  logoutModalTitle: {
    color: COLORS.cream,
    fontFamily: 'serif',
    fontSize: font(24),
    textAlign: 'center',
  },
  logoutModalDescription: {
    marginTop: hp(8),
    marginBottom: hp(22),
    color: '#C9CDBF',
    fontSize: font(14),
    lineHeight: font(21),
    textAlign: 'center',
  },
  confirmLogoutButton: {
    backgroundColor: '#D9C77E',
  },
  confirmLogoutText: {
    color: COLORS.ink,
  },
  cancelLogoutButton: {
    borderColor: 'rgba(168, 176, 154, 0.36)',
  },
  cancelLogoutText: {
    color: '#D7DCCF',
  },
});
