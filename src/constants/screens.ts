export const SCREENS = {
  welcome: 'Welcome',
  opening: 'Opening',
  openingHowItWorks: 'OpeningHowItWorks',
  openingFeedback: 'OpeningFeedback',
  openingEnigmaPrism: 'OpeningEnigmaPrism',
  openingLivingExperiment: 'OpeningLivingExperiment',
  questionnaire: 'Questionnaire',
  introVideo: 'IntroVideo',
  login: 'Login',
  signup: 'Signup',
  forgotPassword: 'ForgotPassword',
  verifyOTP: 'VerifyOTP',
  newPassword: 'NewPassword',
  passwordResetSuccess: 'PasswordResetSuccess',

  mainTabs: 'MainTabs',
  // Home
  home: 'Home',

  // Settting / Profile
  settings: 'Settings',
  helpInformation: 'HelpInformation',
  // Profile: who pays, used for every payment.
  billingInfo: 'BillingInfo',
  // Profile: the member's membership (and switching it) and their purchases (a placeholder for now).
  purchases: 'Purchases',
  // Profile: a gift to Papolona.
  donate: 'Donate',
  // Papolona pennies: the balance, the daily bonus, packs and history.
  wallet: 'Wallet',

  // Discover
  pyramidArtStory: 'PyramidArtStory',

  // Journal
  journalThread: 'JournalThread',
  readingsGallery: 'ReadingsGallery',
  // Profile: notifications & reminders (the user's emailed reminders and recent activity).
  reminders: 'Reminders',
  // After probation: join the collective (free).
  membership: 'Membership',
  // Members: choose the length of the next series.
  startSeries: 'StartSeries',
  // A completed series: its emblem, the mint choice and publishing.
  seriesDetail: 'SeriesDetail',
  // The collective artwork: every published series, one wall.
  collectiveArtwork: 'CollectiveArtwork',
  wallTile: 'WallTile',
  memberGallery: 'MemberGallery',
  // Every user as a pin on the world map.
  communityMap: 'CommunityMap',
  // The marketplace: NFTs members have put up for sale, and one listing.
  marketplace: 'Marketplace',
  listing: 'Listing',
  // One of the two packages, opened from the marketplace or Membership.
  packageDetail: 'PackageDetail',
  // The Château de Puycharnaud retreat, by application.
  retreatDetail: 'RetreatDetail',
  // Direct messages: one conversation, and the members the user blocked.
  conversation: 'Conversation',
  blockedMembers: 'BlockedMembers',
  // A member's profile, opened from search in Discover.
  memberProfile: 'MemberProfile',
} as const;

export type ScreenName = (typeof SCREENS)[keyof typeof SCREENS];

export const BOTTOMTABSCREN = {
  home: 'Home',
  journal: 'Journal',
  discover: 'Discover',
  messages: 'Messages',
  collect: 'Collect',
  profile: 'Profile',
} as const;

export type BottomTabScreenName =
  (typeof BOTTOMTABSCREN)[keyof typeof BOTTOMTABSCREN];
