import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { ApiRequestError, apiRequest } from './api';
import { getGoogleIdToken, signOutOfGoogle } from './googleSignIn';
import { clearQueryCache, queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

const STORAGE_KEY = 'papolona.auth.tokens';
const QUESTIONNAIRE_SUBMISSION_KEY = 'papolona.onboarding.submissionId';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

type AuthResponse = {
  user: { id: string; name: string; email: string };
  tokens: AuthTokens;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  // The membership chosen at graduation; null for apprentices and members who haven't chosen yet.
  membershipType?: MembershipTypeId | null;
  emailVerified?: boolean;
  profile: {
    avatarUrl: string | null;
    bio?: string;
    // ISO 3166 code, e.g. 'IN'.
    country?: string | null;
    // IANA zone, e.g. 'Asia/Kolkata': times reminder emails.
    timezone?: string | null;
  };
  createdAt?: string;
};

export type ChangeCodeSent = {
  message: string;
  sentTo: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
};

let refreshInFlight: Promise<AuthTokens> | null = null;

export async function login(email: string, password: string) {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await clearQueryCache();
  await saveTokens(result.tokens);
  return result;
}

/**
 * Continue with Google. Logs in an existing account (linking Google to an
 * email account with the same address), or creates one when a questionnaire
 * submission is given. Returns null if the user closes the Google picker.
 *
 * Without a submission, a new Google user gets ApiRequestError code
 * ACCOUNT_NOT_FOUND: send them to the questionnaire first.
 */
/**
 * `phone` is only used when this creates the account (Google shares no number); without it
 * the backend answers PHONE_REQUIRED for a new user.
 */
export async function signInWithGoogle(
  questionnaireSubmissionId?: string,
  phone?: string,
) {
  const idToken = await getGoogleIdToken();
  if (!idToken) return null;

  let result: AuthResponse;
  try {
    result = await apiRequest<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        ...(questionnaireSubmissionId && { questionnaireSubmissionId }),
        ...(phone && { phone }),
      }),
    });
  } catch (error) {
    // Show the account picker again on the next try, e.g. to choose another account.
    await signOutOfGoogle();
    throw error;
  }
  await clearQueryCache();
  await saveTokens(result.tokens);
  if (questionnaireSubmissionId) await clearQuestionnaireSubmissionId();
  return result;
}

export type PasswordResetCodeSent = {
  message: string;
  resendAfterSeconds: number;
  expiresInMinutes: number;
};

/**
 * Forgot password, step 1: the backend emails a 6-digit code. It answers the
 * same way whether or not the email has an account.
 */
export function requestPasswordReset(email: string) {
  return apiRequest<PasswordResetCodeSent>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Step 2: checks the code without using it up. */
export function verifyPasswordResetCode(email: string, code: string) {
  return apiRequest<{ valid: true }>('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

/** Step 3: sets the new password and signs the account out everywhere. */
export function resetPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export async function register(
  input: {
    name: string;
    email: string;
    password: string;
    // With country code, e.g. +919876543210: it places the user on the world map.
    phone: string;
  },
  submissionIdFromFlow?: string,
) {
  const questionnaireSubmissionId =
    submissionIdFromFlow || (await getQuestionnaireSubmissionId());
  if (!questionnaireSubmissionId) {
    throw new Error(
      'We could not find your questionnaire submission. Please go back and complete the questionnaire again.',
    );
  }

  const config = await apiRequest<{
    legal: { termsVersion: string; privacyVersion: string };
  }>('/app/config');
  if (!config.legal.termsVersion || !config.legal.privacyVersion) {
    throw new Error(
      'The current Terms and Privacy versions are not available. Please try again later.',
    );
  }

  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      questionnaireSubmissionId,
      acceptTerms: true,
      termsVersion: config.legal.termsVersion,
      privacyVersion: config.legal.privacyVersion,
    }),
  });

  await clearQueryCache();
  await saveTokens(result.tokens);
  await clearQuestionnaireSubmissionId();
  return result;
}

export async function saveQuestionnaireSubmissionId(submissionId: string) {
  await SecureStore.setItemAsync(QUESTIONNAIRE_SUBMISSION_KEY, submissionId);
}

export async function getQuestionnaireSubmissionId() {
  return SecureStore.getItemAsync(QUESTIONNAIRE_SUBMISSION_KEY);
}

export async function clearQuestionnaireSubmissionId() {
  await SecureStore.deleteItemAsync(QUESTIONNAIRE_SUBMISSION_KEY);
}

export async function saveTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

/** Signs out locally. Cached responses belong to the old session, so they go too. */
export async function clearTokens() {
  await clearQueryCache();
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/** Stores the latest user from a mutation so cached screens update at once. */
function cacheUser(user: CurrentUser) {
  queryClient.setQueryData(queryKeys.currentUser, user);
  return user;
}

async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
) {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!stored)
    throw new Error('Your session has expired. Please log in again.');

  const tokens = JSON.parse(stored) as AuthTokens;
  try {
    return await apiRequest<T>(path, {
      ...options,
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.code !== 'TOKEN_EXPIRED') {
      if (error instanceof ApiRequestError && error.status === 401)
        await clearTokens();
      throw error;
    }
  }

  try {
    const refreshed = await refreshSession();
    return await apiRequest<T>(path, {
      ...options,
      headers: { Authorization: `Bearer ${refreshed.accessToken}` },
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401)
      await clearTokens();
    throw error;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const result = await authenticatedRequest<{ user: CurrentUser }>('/users/me');
  return result.user;
}

// Notification choices and the daily reading reminder time (24-hour HH:mm).
export type UserSettings = {
  notifications: {
    readingReminders: boolean;
    sequenceDeadline: boolean;
    productUpdates: boolean;
    marketing: boolean;
  };
  reminderTime: string;
  language: string;
};

export type UserSettingsChanges = {
  notifications?: Partial<UserSettings['notifications']>;
  reminderTime?: string;
};

export async function fetchUserSettings() {
  const result = await authenticatedRequest<{ settings: UserSettings }>(
    '/users/me/settings',
  );
  return result.settings;
}

export async function updateUserSettings(changes: UserSettingsChanges) {
  const result = await authenticatedRequest<{ settings: UserSettings }>(
    '/users/me/settings',
    { method: 'PATCH', body: JSON.stringify(changes) },
  );
  return result.settings;
}

/** The phone's IANA time zone (e.g. 'Asia/Kolkata'); 'UTC' if it can't be read. */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Saves the time zone that reminder emails are timed by. */
export async function updateTimeZone(timezone: string) {
  const result = await authenticatedRequest<{ user: CurrentUser }>(
    '/users/me',
    { method: 'PATCH', body: JSON.stringify({ timezone }) },
  );
  return result.user;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

// A reminder the user set in the Journal; emailed at remindAt.
export type Reminder = {
  id: string;
  title: string;
  note: string;
  startsAt: string;
  // When it is next due.
  remindAt: string;
  repeat: ReminderRepeat;
  timeZone: string;
  // False once a one-off has been sent, or while paused.
  active: boolean;
  lastSentAt: string | null;
  createdAt: string;
};

export type ReminderInput = {
  title: string;
  note: string;
  remindAt: string;
  repeat: ReminderRepeat;
};

export async function fetchReminders() {
  const result = await authenticatedRequest<{ reminders: Reminder[] }>(
    '/reminders',
  );
  return result.reminders;
}

export async function createReminder(input: ReminderInput) {
  const result = await authenticatedRequest<{ reminder: Reminder }>(
    '/reminders',
    {
      method: 'POST',
      body: JSON.stringify({ ...input, timeZone: deviceTimeZone() }),
    },
  );
  return result.reminder;
}

export async function updateReminder(
  id: string,
  changes: Partial<ReminderInput> & { active?: boolean },
) {
  const body =
    changes.remindAt || changes.repeat
      ? { ...changes, timeZone: deviceTimeZone() }
      : changes;
  const result = await authenticatedRequest<{ reminder: Reminder }>(
    `/reminders/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return result.reminder;
}

export function deleteReminder(id: string) {
  return authenticatedRequest<{ id: string }>(
    `/reminders/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

// The apprenticeship: at least `daysRequired` (28) days from sign-up, and at least `readingsRequired`
// (30) passed readings in a multiple of `readingsStep` (3): 30, 33, 36…
export type ProbationProgress = {
  status: string;
  // Readings the judge has passed so far.
  readingsDone: number;
  // The minimum number of passed readings.
  readingsRequired: number;
  readingsStep: number;
  // The count to reach next: the minimum, or the next multiple of the step (31 → 33).
  readingsTarget: number;
  readingsMet: boolean;
  // Whole days since sign-up, and the apprenticeship's length.
  daysDone: number;
  daysRequired: number;
  daysMet: boolean;
  // When the apprenticeship's days are up (ISO).
  endsAt: string;
  // Days and readings both met (or already a member): the user can join and choose a membership.
  complete: boolean;
};

export function fetchProbation() {
  return authenticatedRequest<ProbationProgress>('/users/me/probation');
}

export type Price = { amountCents: number; currency: string };

export type MembershipTypeId = 'explorer' | 'creator' | 'collector';

// A membership chosen at graduation: its price per month (0 for Collector, who pays per transaction) and
// what it includes.
export type MembershipType = {
  id: MembershipTypeId;
  title: string;
  tagline: string;
  benefits: string[];
  priceCents: number;
  currency: string;
};

// Membership: once the apprenticeship is complete the user joins and chooses Explorer, Creator or
// Collector; it unlocks series.
export type Membership = {
  status: string;
  isMember: boolean;
  memberSince: string | null;
  // The chosen membership; null before joining, and for members from before the choice existed.
  membershipType?: MembershipTypeId | null;
  membershipTypes?: MembershipType[];
  // The series lengths this member may start (Explorers: 1, 2 and 6); empty before membership.
  allowedSeriesLengths?: number[];
  // False for Explorers: they cannot convert emblems into NFTs or sell.
  canProfit?: boolean;
  // What a Creator or Collector must do each period to keep their membership.
  standing?: Standing;
  // Set once, when the member was just moved back to Explorer: the membership they lost.
  demotedFrom?: MembershipTypeId | null;
  // The member's wallet (demo payments only for now).
  wallet?: { balanceCents: number; currency: string };
  // The one the questionnaire's cohort suggests.
  suggestedType?: MembershipTypeId;
  probation: ProbationProgress;
  free: boolean;
  // Probation is complete and the user isn't a member yet.
  canJoin: boolean;
  demoPayments: boolean;
  active: ActiveStatus;
  stone: StoneInfo;
  // The package active membership asks for: the Sensitisation Package, bought once (stone.order).
  packages: Package[];
  // The Château de Puycharnaud retreat, by application.
  retreat?: RetreatInfo;
};

// The retreat: a few days, a few places a year, by application. Nothing is charged when applying.
export type RetreatInfo = {
  days: number;
  priceFromCents: number;
  priceToCents: number;
  currency: string;
  application: RetreatApplication | null;
};

export type RetreatApplication = {
  id: string;
  motivation: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

/** Applies for the retreat with a few words on why. Resolves to the updated membership. */
export async function applyForRetreat(motivation: string) {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/retreat',
    { method: 'POST', body: JSON.stringify({ motivation }) },
  );
  return result.membership;
}

export type PackageId = 'stone_triptych' | 'retreat';

// A package: the Sensitisation Package (the stone, the Enigma Prism Triptych, initiation materials and a
// first advanced reading sequence). 'retreat' is only on orders placed before the retreat became an
// application. Postage is added to the price.
export type Package = {
  id: PackageId;
  title: string;
  subtitle?: string;
  includes: string[];
  priceCents: number;
  postageCents: number;
  totalCents: number;
  currency: string;
};

// Active membership: a member who has ordered the meditation stone and converted an emblem into an NFT
// within the last windowDays. Each conversion opens a new window.
export type ActiveStatus = {
  isActive: boolean;
  stoneOrdered: boolean;
  lastConversionAt: string | null;
  // When the current window closes; null before the first conversion.
  activeUntil: string | null;
  windowDays: number;
};

export type StoneAddress = {
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
};

export type StoneOrder = Required<StoneAddress> & {
  id: string;
  createdAt: string;
  package: PackageId;
};

// The meditation stone active membership asks for: its price, postage, and the user's order if placed.
export type StoneInfo = {
  priceCents: number;
  postageCents: number;
  totalCents: number;
  currency: string;
  order: StoneOrder | null;
};

/** Orders a package (demo payment: price + postage). Resolves to the updated membership. */
export async function orderPackage(
  packageId: PackageId,
  address: StoneAddress,
) {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/stone',
    {
      method: 'POST',
      body: JSON.stringify({ ...address, package: packageId }),
    },
  );
  return result.membership;
}

// Who pays: set once in the Profile tab, used for every payment and to fill the package's postal address.
export type BillingInfo = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
};

export type BillingStatus = {
  // null until the user saves it.
  billing: (BillingInfo & { updatedAt: string }) | null;
  // The account's name, email and phone, to start the form with.
  suggested: Pick<BillingInfo, 'fullName' | 'email' | 'phone'>;
};

// One thing the user paid for: a membership, the package, an NFT conversion or an NFT bought on the
// marketplace (with its series, and who sold it).
export type Purchase = {
  id: string;
  purpose:
    | 'membership'
    | 'stone'
    | 'conversion'
    | 'nft_purchase'
    | 'publish'
    | 'wallet_deposit'
    | 'collector_fee'
    | 'donation';
  amountCents: number;
  currency: string;
  createdAt: string;
  packageId: PackageId | null;
  seller: string | null;
  series: {
    id: string;
    rarity: string;
    length: number;
    artworkKey: string;
  } | null;
};

/** The user's purchases, newest first. */
export async function fetchPurchases() {
  const result = await authenticatedRequest<{ purchases: Purchase[] }>(
    '/users/me/purchases',
  );
  return result.purchases;
}

export function fetchBilling() {
  return authenticatedRequest<BillingStatus>('/users/me/billing');
}

/** Saves the user's billing info. Resolves to it. */
export async function saveBilling(info: BillingInfo) {
  const result = await authenticatedRequest<{
    billing: BillingStatus['billing'];
  }>('/users/me/billing', { method: 'PUT', body: JSON.stringify(info) });
  return result.billing;
}

export function fetchMembership() {
  return authenticatedRequest<Membership>('/membership');
}

/**
 * Joins the collective once probation is complete, as the chosen membership (the first month of a paid
 * one is a demo payment). Fails with PROBATION_INCOMPLETE or ALREADY_MEMBER.
 */
export async function joinMembership(type: MembershipTypeId) {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/join',
    { method: 'POST', body: JSON.stringify({ type }) },
  );
  return result.membership;
}

/** Chooses or changes a member's membership (first month of a paid one charged, demo). */
// A Creator or Collector keeps their membership by meeting its terms within each period (two months);
// otherwise they return to Explorer. Explorers have no terms (required: false).
export type Standing = {
  required: boolean;
  type: MembershipTypeId | null;
  met: boolean;
  // When the current period ends unless a new qualifying step is taken.
  dueBy: string | null;
  periodDays: number;
  walletCents?: number;
  currency?: string;
  // Creator
  lastConversionAt?: string | null;
  depositCents?: number;
  // Collector
  lastFeeAt?: string | null;
  lastPurchaseAt?: string | null;
  walletOk?: boolean;
  minWalletCents?: number;
  feeCents?: number;
  // Art (members' NFTs) bought in the last 12 months; reaching the target
  // keeps a Collector until artCoveredUntil.
  artYearCents?: number;
  artYearTargetCents?: number;
  artCoveredUntil?: string | null;
};

/** A gift to Papolona from any signed-in user (demo). Resolves to the payment. */
export async function donate(amountCents: number) {
  const result = await authenticatedRequest<{ payment: { id: string } }>(
    '/membership/donation',
    { method: 'POST', body: JSON.stringify({ amountCents }) },
  );
  return result.payment;
}

/** Puts money into the member's wallet (demo). Resolves to the updated membership. */
export async function depositToWallet(amountCents: number) {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/wallet',
    { method: 'POST', body: JSON.stringify({ amountCents }) },
  );
  return result.membership;
}

/** Pays the Collector fee for the current period (demo). Resolves to the updated membership. */
export async function payCollectorFee() {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/collector-fee',
    { method: 'POST', body: JSON.stringify({}) },
  );
  return result.membership;
}

export async function chooseMembershipType(type: MembershipTypeId) {
  const result = await authenticatedRequest<{ membership: Membership }>(
    '/membership/type',
    { method: 'PUT', body: JSON.stringify({ type }) },
  );
  return result.membership;
}

/** "€10 / month", or "Free" for a membership with no monthly price. */
// Collector has no price but has terms to meet: "Terms", not "Free".
export const membershipPrice = (
  t: Pick<MembershipType, 'priceCents' | 'currency'> & { id?: string },
) =>
  t.priceCents === 0
    ? t.id === 'collector'
      ? 'Terms'
      : 'Free'
    : `${formatPrice({
        amountCents: t.priceCents,
        currency: t.currency,
      })} / month`;

/** "$10" or "$10.50" in the given currency. */
export function formatPrice({ amountCents, currency }: Price) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

// The user's interpretation of a clue, as judged by the AI.
export type Interpretation = {
  text: string;
  source: JournalEntrySource;
  verdict: 'pass' | 'fail';
  // How the judge read the split: each part of the clue and its meaning.
  parts: { part: string; meaning: string }[];
  feedback: string;
  judgedAt: string;
};

// How eerie (uncanny, synchronous) and how satisfying a reading felt, 1–10.
export type Rating = { eeriness: number; satisfaction: number };

// The user's own rating and the AI judge's; null until each has rated. The
// member now rates satisfaction alone, in stars, so their eeriness may be null.
export type ReadingRatings = {
  user: { eeriness: number | null; satisfaction: number; ratedAt: string } | null;
  ai: Rating | null;
};

/** A 1–10 score as 1–5 stars (ratings are stored out of 10). */
export const starsOf = (score?: number | null) =>
  score == null ? null : Math.min(5, Math.max(1, Math.round(score / 2)));

// A reading: one clue drawn, the question it was drawn for, its judged
// interpretation (null until the user interprets it) and its ratings.
export type Reading = {
  id: string;
  clue: string;
  question: string;
  generatedAt: string;
  interpretation: Interpretation | null;
  ratings: ReadingRatings | null;
  // The NFT series it was drawn in, and the tile its pass revealed.
  seriesId?: string | null;
  tileIndex?: number | null;
  // The splits the AI offered as a prompt (null if none was taken).
  prompt?: PromptOption[] | null;
  // Judged attempts so far and how many are left: a fail may be resubmitted
  // until maxAttempts (3). Missing from older backends.
  attempts?: number;
  attemptsLeft?: number;
  maxAttempts?: number;
  // When the split options open: five minutes after the draw.
  promptAvailableAt?: string;
  // It must be passed by deadlineAt (12 hours after the draw), or it fails:
  // expired is then true.
  deadlineAt?: string;
  expired?: boolean;
};

// One way to split a clue, offered as a prompt: its parts in order, each with
// a short hint of what it could mean. The member picks the split they prefer.
export type PromptOption = { parts: { part: string; meaning: string }[] };

// Prompts this month: 90 a month while an apprentice, 30 once a member.
export type PromptAllowance = {
  stage: 'apprentice' | 'member';
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export type ClueString = Reading & {
  // The NFT series this reading joined, if one is active.
  series?: NftSeries | null;
};

// 3 common, 6 epic, 12 mythic, 24 legendary (singles and twins: common, no reward).
export type SeriesRarity = 'common' | 'epic' | 'mythic' | 'legendary';

export type MintChoice = 'keep' | 'mint' | 'mint_poc';

// A length a member can choose: its grid, rarity and reward.
export type SeriesOption = {
  length: 1 | 2 | 3 | 6 | 12 | 24;
  label: string;
  rows: number;
  cols: number;
  rarity: SeriesRarity;
  // Completing it earns a butterfly emblem with mint rights (3, 6, 12 and 24).
  nftEligible: boolean;
  minDays: number;
};

export type PublishInfo = { price: Price; demoPayments: boolean };

// A member's series: each passed reading reveals one tile of the grid.
export type NftSeries = {
  id: string;
  length: number;
  label: string;
  rows: number;
  cols: number;
  rarity: SeriesRarity;
  // abandoned: a deadline was missed; failed: a reading failed all its attempts.
  status: 'active' | 'completed' | 'abandoned' | 'failed';
  // A placeholder artwork bundled in the app (see features/series/artworks).
  artworkKey: string;
  // Tile indexes (row by row from the top left) revealed so far, in order.
  revealedTiles: number[];
  revealedCount: number;
  startedAt: string;
  lastReadingAt: string | null;
  // The next clue must be drawn by then, or the series and its NFT are lost.
  // null once it is no longer active.
  deadlineAt: string | null;
  completedAt: string | null;
  // Completing it earns a butterfly emblem with mint rights (3, 6, 12 and 24).
  nftEligible: boolean;
  // On the collective artwork since then, or null.
  publishedAt: string | null;
  // What the member chose for a mint-eligible series, or null.
  mintChoice: MintChoice | null;
  // Converted into an NFT (then it can be sold), or null; and what converting costs (null for practice).
  convertedAt?: string | null;
  conversionPrice?: Price | null;
  // Papolona's recommended minimum resale price for the level (a suggestion).
  suggestedResalePrice?: Price | null;
  // Bought on the marketplace rather than made by its owner.
  acquired?: boolean;
  // Its open marketplace listing, if any.
  listing?: {
    id: string;
    priceCents: number;
    currency: string;
    createdAt: string;
  } | null;
};

export async function fetchSeriesOptions() {
  return authenticatedRequest<{
    options: SeriesOption[];
    publish: PublishInfo;
  }>('/series/options');
}

/** The member's active series, or null. */
export async function fetchActiveSeries() {
  const result = await authenticatedRequest<{ series: NftSeries | null }>(
    '/series/active',
  );
  return result.series;
}

/** Active and completed series, newest first (abandoned and failed ones are lost). */
export async function fetchSeriesList() {
  const result = await authenticatedRequest<{ series: NftSeries[] }>('/series');
  return result.series;
}

/**
 * Starts a series of `length` readings. Fails with MEMBERSHIP_REQUIRED or
 * SERIES_ACTIVE.
 */
export async function startSeries(length: SeriesOption['length']) {
  const result = await authenticatedRequest<{ series: NftSeries }>('/series', {
    method: 'POST',
    body: JSON.stringify({ length }),
  });
  return result.series;
}

/**
 * Makes a completed emblem series public: it joins the collective artwork in
 * Discover, free, without being for sale. Fails with SERIES_NOT_COMPLETED,
 * ALREADY_PUBLISHED or NOT_PUBLISHABLE.
 */
export async function publishSeries(id: string) {
  const result = await authenticatedRequest<{ series: NftSeries }>(
    `/series/${encodeURIComponent(id)}/publish`,
    { method: 'POST' },
  );
  return result.series;
}

/**
 * Makes a series private again: off the collective artwork. Fails with
 * LISTED_FOR_SALE: a series for sale stays public until it is withdrawn.
 */
export async function unpublishSeries(id: string) {
  const result = await authenticatedRequest<{ series: NftSeries }>(
    `/series/${encodeURIComponent(id)}/publish`,
    { method: 'DELETE' },
  );
  return result.series;
}

/**
 * Converts a completed emblem into an NFT for its conversion price (demo payment), optionally joining the
 * POC ecosystem. Keeps the member active.
 */
export async function convertSeries(id: string, poc: boolean) {
  const result = await authenticatedRequest<{ series: NftSeries }>(
    `/series/${encodeURIComponent(id)}/convert`,
    { method: 'POST', body: JSON.stringify({ poc }) },
  );
  return result.series;
}

// A marketplace listing: an NFT an active member sells. feeCents and sellerProceedsCents are only there
// for the seller.
export type Listing = {
  id: string;
  priceCents: number;
  currency: string;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: string;
  soldAt: string | null;
  seller: { id: string; name: string };
  mine: boolean;
  feeCents?: number;
  sellerProceedsCents?: number;
  // Who bought it, once sold (seller only).
  buyer?: { id: string; name: string } | null;
  series: NftSeries;
};

export type ListingPage = {
  listings: Listing[];
  nextBefore: string | null;
  feePercent: number;
};

/** A page of the marketplace, newest first. */
export function fetchListings(before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return authenticatedRequest<ListingPage>(`/market/listings${query}`);
}

export async function fetchListing(id: string) {
  const result = await authenticatedRequest<{ listing: Listing }>(
    `/market/listings/${encodeURIComponent(id)}`,
  );
  return result.listing;
}

/** The user's own listings, open and closed. */
export function fetchMyListings() {
  return authenticatedRequest<{ listings: Listing[]; feePercent: number }>(
    '/market/mine',
  );
}

/** Puts one of the user's NFTs up for sale. Active members only. */
export async function createListing(seriesId: string, priceCents: number) {
  const result = await authenticatedRequest<{ listing: Listing }>(
    '/market/listings',
    { method: 'POST', body: JSON.stringify({ seriesId, priceCents }) },
  );
  return result.listing;
}

/** Takes the user's open listing off the marketplace. */
export async function cancelListing(id: string) {
  const result = await authenticatedRequest<{ listing: Listing }>(
    `/market/listings/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  return result.listing;
}

/** Buys a listing (demo payment): the NFT becomes the user's. */
export async function buyListing(id: string) {
  return authenticatedRequest<{ listing: Listing; series: NftSeries }>(
    `/market/listings/${encodeURIComponent(id)}/buy`,
    { method: 'POST' },
  );
}

/** Records the mint choice for a completed emblem; 'mint' and 'mint_poc' convert it (paid). */
export async function setMintChoice(id: string, choice: MintChoice) {
  const result = await authenticatedRequest<{ series: NftSeries }>(
    `/series/${encodeURIComponent(id)}/mint-choice`,
    { method: 'PUT', body: JSON.stringify({ choice }) },
  );
  return result.series;
}

// A published series on the collective artwork, with its owner's public name.
// A series on the collective artwork: who owns it now, and who completed it (the same until it is sold).
export type WallTile = NftSeries & {
  owner: { id: string; name: string };
  creator?: { id: string; name: string };
};

export type WallPage = { tiles: WallTile[]; nextBefore: string | null };

/** A page of the collective artwork, newest first. */
export function fetchWall(before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return authenticatedRequest<WallPage>(`/artwork/wall${query}`);
}

// One tile opened: each of its readings in full.
export type WallReading = {
  id: string;
  clue: string;
  interpretation: string | null;
  parts: { part: string; meaning: string }[];
  // What the AI judge said about the interpretation.
  feedback?: string | null;
  tileIndex: number | null;
  generatedAt: string;
};

export function fetchWallTile(id: string) {
  return authenticatedRequest<{ tile: WallTile; readings: WallReading[] }>(
    `/artwork/wall/${encodeURIComponent(id)}`,
  );
}

export type MemberGallery = {
  member: { id: string; name: string; memberSince: string | null };
  tiles: WallTile[];
};

/** A member's published series. */
export function fetchMemberGallery(userId: string) {
  return authenticatedRequest<MemberGallery>(
    `/artwork/members/${encodeURIComponent(userId)}`,
  );
}

// The world map: users per country (of their mobile number), on probation or full members.
export type CommunityCountry = {
  code: string;
  registered: number;
  members: number;
};

export type CommunityMap = {
  // Totals, including users with no mobile number (who are in no country).
  registered: number;
  members: number;
  countries: CommunityCountry[];
};

// The Discover screen's figures for the whole collective.
export type CommunityStats = {
  // Readings drawn by everyone.
  sessions: number;
  // Series completed: each one an artwork.
  artworks: number;
  // Countries users come from, by mobile number.
  countries: number;
  members: number;
};

export function fetchCommunityStats() {
  return authenticatedRequest<CommunityStats>('/community/stats');
}

export function fetchCommunityMap() {
  return authenticatedRequest<CommunityMap>('/community/map');
}

export type ClueStatus = {
  // False while the latest clue waits for its interpretation.
  canGenerate: boolean;
  lastClue: Reading | null;
  // Missing from a backend older than prompts.
  prompts?: PromptAllowance;
};

/** Whether a clue can be drawn now, and the latest clue. */
export function fetchClueStatus() {
  return authenticatedRequest<ClueStatus>('/clue-string');
}

/**
 * A fresh six-letter clue drawn from quantum random numbers for the user's
 * question. No limit, but the last clue must be interpreted first
 * (INTERPRET_FIRST).
 */
export function generateClueString(question: string) {
  return authenticatedRequest<ClueString>('/clue-string', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

/**
 * Sends the user's interpretation of their latest clue to the AI judge. A fail
 * may be resubmitted, three judgements in all; the last failed attempt fails a
 * member's series. Fails with NO_ATTEMPTS_LEFT, ALREADY_JUDGED or
 * READING_CLOSED, or AI_UNAVAILABLE (nothing saved, no attempt used).
 */
export function interpretReading(
  id: string,
  input: { text: string; source: JournalEntrySource },
) {
  return authenticatedRequest<{
    reading: Reading;
    probation: ProbationProgress;
    // The NFT series the reading was in (a pass reveals a tile), or null.
    series?: NftSeries | null;
  }>(`/clue-string/${encodeURIComponent(id)}/interpretation`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * A prompt: a few ways to split the latest clue, for the user to choose from.
 * They open five minutes after the draw (PROMPT_NOT_YET before). One prompt per
 * clue (asking again returns the same splits without using another); each
 * counts against the monthly allowance. Fails with NO_PROMPTS_LEFT,
 * NO_ATTEMPTS_LEFT, ALREADY_JUDGED, READING_CLOSED or AI_UNAVAILABLE.
 */
export function promptReading(id: string) {
  return authenticatedRequest<{ reading: Reading; prompts: PromptAllowance }>(
    `/clue-string/${encodeURIComponent(id)}/prompt`,
    { method: 'POST' },
  );
}

/**
 * The user's satisfaction with a reading, 1–5 stars (stored out of 10, like
 * the judge's); they can change it.
 */
export function rateReading(id: string, stars: number) {
  return authenticatedRequest<Reading>(
    `/clue-string/${encodeURIComponent(id)}/rating`,
    { method: 'PUT', body: JSON.stringify({ satisfaction: stars * 2 }) },
  );
}

export type StatsUnit = 'day' | 'month' | 'year';

// One bucket (a local day, month or year): activity and average ratings.
export type StatsBucket = {
  // Local start date, YYYY-MM-DD.
  start: string;
  readings: number;
  passed: number;
  failed: number;
  notes: number;
  userEeriness: number | null;
  userSatisfaction: number | null;
  aiEeriness: number | null;
  aiSatisfaction: number | null;
};

export type Stats = {
  unit: StatsUnit;
  from: string;
  to: string;
  today: string;
  firstActivity: string | null;
  series: StatsBucket[];
  totals: Omit<StatsBucket, 'start'>;
  streak: { current: number; best: number };
};

/**
 * Activity per day, month or year in the device's time zone. Without `from`
 * it starts at the first activity; without `to` it ends today.
 */
export function fetchStats(query: {
  unit: StatsUnit;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams({
    unit: query.unit,
    tzOffset: String(-new Date().getTimezoneOffset()),
  });
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return authenticatedRequest<Stats>(`/stats?${params.toString()}`);
}

export type ReadingsPage = { readings: Reading[]; nextCursor: string | null };

/** The user's readings, newest first; pass nextCursor as `before`. */
export function fetchReadings(before?: string) {
  return authenticatedRequest<ReadingsPage>(
    before
      ? `/clue-string/history?before=${encodeURIComponent(before)}`
      : '/clue-string/history',
  );
}

export type JournalEntrySource = 'text' | 'voice';

export type JournalEntry = {
  id: string;
  clientId: string;
  text: string;
  source: JournalEntrySource;
  createdAt: string;
  // The clue this entry belongs to; null until the next clue is drawn.
  clue: { clue: string; generatedAt: string } | null;
  photos: JournalPhoto[];
};

export type JournalPhoto = {
  publicId: string;
  url: string;
  width: number;
  height: number;
};

export type JournalPage = {
  entries: JournalEntry[];
  nextCursor: string | null;
};

/** One page of the journal, newest first; pass nextCursor as `before`. */
export function fetchJournalEntries(before?: string) {
  return authenticatedRequest<JournalPage>(
    before ? `/journal?before=${encodeURIComponent(before)}` : '/journal',
  );
}

/**
 * Saves an entry. Written while today's clue is current, it belongs to that
 * clue at once; otherwise it is sealed by the next clue drawn. Photos must be
 * uploaded first with uploadJournalPhoto.
 */
export async function createJournalEntry(input: {
  text: string;
  source: JournalEntrySource;
  clientId: string;
  photos?: Pick<JournalPhoto, 'publicId' | 'width' | 'height'>[];
}) {
  const result = await authenticatedRequest<{ entry: JournalEntry }>(
    '/journal',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return result.entry;
}

/** Uploads one photo for an entry about to be saved. */
export async function uploadJournalPhoto(uri: string) {
  // A Blob-like File, as for the avatar: expo/fetch can't send { uri } parts.
  const formData = new FormData();
  formData.append('photo', new File(uri) as unknown as Blob);
  const result = await authenticatedRequest<{ photo: JournalPhoto }>(
    '/journal/photos',
    { method: 'POST', body: formData },
  );
  return result.photo;
}

/** When the user wrote and drew clues in [from, to), for the calendar. */
export type JournalCalendar = { entries: string[]; readings: string[] };

export function fetchJournalCalendar(from: string, to: string) {
  const query = new URLSearchParams({ from, to }).toString();
  return authenticatedRequest<JournalCalendar>(`/journal/calendar?${query}`);
}

/** One local day: its date, and its start and end as instants. */
export type JournalDayRange = { day: string; from: string; to: string };

export type JournalInsights = {
  day: string;
  // The day's entries rewritten as one reflection.
  refined: string;
  model: string;
  generatedAt: string;
  entryCount: number;
};

/**
 * The AI reading of a journal day. The first request for a day waits for the
 * model (several seconds); after that the saved reading comes back at once
 * until the day's entries change.
 */
export function fetchJournalInsights(range: JournalDayRange) {
  const query = new URLSearchParams(range).toString();
  return authenticatedRequest<JournalInsights>(`/journal/insights?${query}`);
}

/** Asks the AI again for a day, replacing the saved reading. */
export function regenerateJournalInsights(range: JournalDayRange) {
  return authenticatedRequest<JournalInsights>('/journal/insights', {
    method: 'POST',
    body: JSON.stringify(range),
  });
}

export function deleteJournalEntry(id: string) {
  return authenticatedRequest<{ id: string }>(
    `/journal/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

/** Deletes the entries not yet sealed by a clue. */
export function clearOpenJournalEntries() {
  return authenticatedRequest<{ deleted: number }>('/journal', {
    method: 'DELETE',
  });
}

export async function updateCurrentUserName(
  name: string,
): Promise<CurrentUser> {
  const result = await authenticatedRequest<{ user: CurrentUser }>(
    '/users/me',
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
  );
  return cacheUser(result.user);
}

export async function uploadCurrentUserAvatar(
  uri: string,
): Promise<CurrentUser> {
  // Expo replaces the global fetch with expo/fetch, which cannot encode React
  // Native's { uri, name, type } FormData parts; it needs a Blob-like File,
  // whose file name and MIME type are sent with the part.
  const formData = new FormData();
  formData.append('avatar', new File(uri) as unknown as Blob);
  const result = await authenticatedRequest<{ user: CurrentUser }>(
    '/users/me/avatar',
    { method: 'PUT', body: formData },
  );
  return cacheUser(result.user);
}

/** Email change, step 1: the backend emails a 6-digit code to the new address. */
export function requestEmailChange(email: string, currentPassword: string) {
  return authenticatedRequest<ChangeCodeSent>('/users/me/email', {
    method: 'POST',
    body: JSON.stringify({ email, currentPassword }),
  });
}

export async function confirmEmailChange(code: string): Promise<CurrentUser> {
  const result = await authenticatedRequest<{ user: CurrentUser }>(
    '/users/me/email/confirm',
    { method: 'POST', body: JSON.stringify({ code }) },
  );
  return cacheUser(result.user);
}

/** Phone change, step 1: the code goes to the account email. `null` removes the number. */
export function requestPhoneChange(phone: string | null) {
  return authenticatedRequest<ChangeCodeSent>('/users/me/phone', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function confirmPhoneChange(code: string): Promise<CurrentUser> {
  const result = await authenticatedRequest<{ user: CurrentUser }>(
    '/users/me/phone/confirm',
    { method: 'POST', body: JSON.stringify({ code }) },
  );
  return cacheUser(result.user);
}

export async function logout() {
  try {
    await authenticatedRequest('/auth/logout', { method: 'POST' });
  } finally {
    await clearTokens();
    await signOutOfGoogle();
  }
}

export async function refreshSession(): Promise<AuthTokens> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) throw new Error('No saved session.');

    const previousTokens = JSON.parse(stored) as AuthTokens;
    const result = await apiRequest<{ tokens: AuthTokens }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: previousTokens.refreshToken }),
    });
    await saveTokens(result.tokens);
    return result.tokens;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Rotate a stored refresh token before routing an existing user into the app. */
export async function restoreSession(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) return false;
    await refreshSession();
    return true;
  } catch {
    await clearTokens();
    return false;
  }
}
