import { NavigatorScreenParams, ParamListBase } from '@react-navigation/native';
import type { PackageId } from '@/services/session';

export type RootStackParamList = {
  Welcome: undefined;
  Opening: undefined;
  OpeningHowItWorks: undefined;
  OpeningFeedback: undefined;
  OpeningEnigmaPrism: undefined;
  OpeningLivingExperiment: undefined;
  Questionnaire: undefined;
  IntroVideo: { questionnaireSubmissionId: string } | undefined;

  Login: undefined;
  Signup: { questionnaireSubmissionId: string } | undefined;
  ForgotPassword: undefined;
  VerifyOTP: {
    email: string;
    resendAfterSeconds: number;
    expiresInMinutes: number;
  };
  NewPassword: { email: string; code: string };
  PasswordResetSuccess: undefined;

  // Bottom Tabs
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;

  // Home // qrng
  Home: undefined;

  // Profile or setting
  Settings: undefined;
  BillingInfo: undefined;
  Donate: undefined;
  Purchases: undefined;
  HelpInformation: undefined;

  // Discover
  PyramidArtStory: undefined;

  // Journal: one day's thread (YYYY-MM-DD in the device's time zone)
  JournalThread: { day: string };
  // With a day (YYYY-MM-DD), that day's reading opens.
  ReadingsGallery: { day?: string } | undefined;
  // Profile: the user's emailed reminders.
  Reminders: undefined;
  // After probation: join the collective (free).
  Membership: undefined;
  // Members: choose the length of the next series.
  StartSeries: undefined;
  // One of the member's completed series (from the Collect list).
  SeriesDetail: { seriesId: string };
  // The collective artwork, one tile opened, and a member's gallery.
  CollectiveArtwork: undefined;
  WallTile: { id: string };
  MemberGallery: { userId: string; name?: string };
  // Every user as a pin on the world map.
  CommunityMap: undefined;
  // The marketplace (from Discover) and one listing opened.
  Marketplace: undefined;
  Listing: { id: string };
  PackageDetail: { id: PackageId };
  RetreatDetail: undefined;
  // Direct messages.
  Conversation: { threadId: string; name?: string };
  BlockedMembers: undefined;
  MemberProfile: { userId: string; name?: string };
};

export type RootTabParamList = {
  Home: undefined;
  Journal: undefined;
  Discover: undefined;
  Messages: undefined;
  Collect: undefined;
  Profile: undefined;
};

// Optional: useful when a generic ParamListBase is required elsewhere.
export type AppTabParamList = RootTabParamList & ParamListBase;
