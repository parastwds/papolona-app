import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SCREENS } from '../constants/screens';
import { RootStackParamList } from './types';

import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import QuestionnaireScreen from '@/features/onboarding/screens/QuestionnaireScreen';
import {
  OpeningEnigmaPrismScreen,
  OpeningFeedbackScreen,
  OpeningHowItWorksScreen,
  OpeningLivingExperimentScreen,
  OpeningScreen,
} from '@/features/onboarding/screens/StoryIntroScreens';
import IntroVideoScreen from '@/features/onboarding/screens/IntroVideoScreen';
import Login from '@/features/auth/screens/Login';
import Signup from '@/features/auth/screens/Signup';
import ForgotPassword from '@/features/auth/screens/forgot/ForgotPassword';
import VerifyOTP from '@/features/auth/screens/forgot/VerifyOTP';
import ResetPassword from '@/features/auth/screens/forgot/NewPassword';
import PasswordReserSuccess from '@/features/auth/screens/forgot/PasswordResetSuccess';

// Profile or setting
import Settings from '@/features/profile/screen/settings/Settings';
import BillingInfoScreen from '@/features/profile/screen/settings/BillingInfo';
import Donate from '@/features/profile/screen/Donate';
import Purchases from '@/features/profile/screen/Purchases';
import HelpInformation from '@/features/profile/screen/settings/HelpInformation';

// Discover
import PyramidArtStory from '@/features/discover/screen/PyramidArtStory';

// Journal
import JournalThread from '@/features/journal/screen/JournalThread';
import ReadingsGallery from '@/features/journal/screen/ReadingsGallery';
import Reminders from '@/features/profile/screen/Reminders';
import Membership from '@/features/membership/screen/Membership';
import StartSeries from '@/features/series/screen/StartSeries';
import SeriesDetail from '@/features/series/screen/SeriesDetail';
import CollectiveArtwork from '@/features/artwork/screen/CollectiveArtwork';
import WallTile from '@/features/artwork/screen/WallTile';
import MemberGallery from '@/features/artwork/screen/MemberGallery';
import CommunityMap from '@/features/community/screen/CommunityMap';
import Marketplace from '@/features/market/screen/Marketplace';
import ListingDetail from '@/features/market/screen/ListingDetail';
import PackageDetail from '@/features/market/screen/PackageDetail';
import RetreatDetail from '@/features/market/screen/RetreatDetail';

import BottomTabs from './BottomTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialRouteName?: keyof RootStackParamList;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({
  initialRouteName = SCREENS.welcome,
}) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#020905' },
      }}
    >
      <Stack.Screen name={SCREENS.welcome} component={WelcomeScreen} />
      <Stack.Screen name={SCREENS.opening} component={OpeningScreen} />
      <Stack.Screen
        name={SCREENS.openingHowItWorks}
        component={OpeningHowItWorksScreen}
      />
      <Stack.Screen
        name={SCREENS.openingFeedback}
        component={OpeningFeedbackScreen}
      />
      <Stack.Screen
        name={SCREENS.openingEnigmaPrism}
        component={OpeningEnigmaPrismScreen}
      />
      <Stack.Screen
        name={SCREENS.openingLivingExperiment}
        component={OpeningLivingExperimentScreen}
      />
      <Stack.Screen
        name={SCREENS.questionnaire}
        component={QuestionnaireScreen}
      />
      <Stack.Screen name={SCREENS.introVideo} component={IntroVideoScreen} />
      <Stack.Screen name={SCREENS.login} component={Login} />
      <Stack.Screen name={SCREENS.signup} component={Signup} />
      <Stack.Screen name={SCREENS.forgotPassword} component={ForgotPassword} />
      <Stack.Screen name={SCREENS.verifyOTP} component={VerifyOTP} />
      <Stack.Screen name={SCREENS.newPassword} component={ResetPassword} />
      <Stack.Screen
        name={SCREENS.passwordResetSuccess}
        component={PasswordReserSuccess}
      />

      {/* Profile or Setting screens */}
      <Stack.Screen name={SCREENS.settings} component={Settings} />
      <Stack.Screen name={SCREENS.billingInfo} component={BillingInfoScreen} />
      <Stack.Screen name={SCREENS.donate} component={Donate} />
      <Stack.Screen name={SCREENS.purchases} component={Purchases} />
      <Stack.Screen
        name={SCREENS.helpInformation}
        component={HelpInformation}
      />

      {/* Discover screens */}
      <Stack.Screen
        name={SCREENS.pyramidArtStory}
        component={PyramidArtStory}
      />

      {/* Journal */}
      <Stack.Screen name={SCREENS.journalThread} component={JournalThread} />
      <Stack.Screen
        name={SCREENS.readingsGallery}
        component={ReadingsGallery}
      />
      <Stack.Screen name={SCREENS.reminders} component={Reminders} />
      <Stack.Screen name={SCREENS.membership} component={Membership} />
      <Stack.Screen name={SCREENS.startSeries} component={StartSeries} />
      <Stack.Screen name={SCREENS.seriesDetail} component={SeriesDetail} />
      <Stack.Screen
        name={SCREENS.collectiveArtwork}
        component={CollectiveArtwork}
      />
      <Stack.Screen name={SCREENS.wallTile} component={WallTile} />
      <Stack.Screen name={SCREENS.memberGallery} component={MemberGallery} />
      <Stack.Screen name={SCREENS.communityMap} component={CommunityMap} />
      <Stack.Screen name={SCREENS.marketplace} component={Marketplace} />
      <Stack.Screen name={SCREENS.listing} component={ListingDetail} />
      <Stack.Screen name={SCREENS.packageDetail} component={PackageDetail} />
      <Stack.Screen name={SCREENS.retreatDetail} component={RetreatDetail} />

      {/*  */}
      <Stack.Screen name={SCREENS.mainTabs} component={BottomTabs} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
