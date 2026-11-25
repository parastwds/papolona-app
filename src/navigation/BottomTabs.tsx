import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import { RootTabParamList } from './types';
import { BOTTOMTABSCREN } from '@/constants/screens';
import CustomTabbar from './customBottom/CustomTabbar';

// SCREEN
import HomeTab from '@/features/home/screen/HomeTab';
import JournalTab from '@/features/journal/screen/JournalTab';
import DiscoverTab from '@/features/discover/screen/DiscoverTab';
import CollectTab from '@/features/collect/screen/CollectTab';
import ProfileTab from '@/features/profile/screen/ProfileTab';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Stable Tab bar render only once.
const rednerTabBar = (props: BottomTabBarProps) => {
  return <CustomTabbar {...props} />;
};

export default function BottomTabs() {
  return (
    <Tab.Navigator tabBar={rednerTabBar} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name={BOTTOMTABSCREN.home}
        component={HomeTab}
        options={{ title: BOTTOMTABSCREN.home }}
      />
      <Tab.Screen
        name={BOTTOMTABSCREN.journal}
        component={JournalTab}
        options={{ title: BOTTOMTABSCREN.journal }}
      />
      <Tab.Screen
        name={BOTTOMTABSCREN.discover}
        component={DiscoverTab}
        options={{ title: BOTTOMTABSCREN.journal }}
      />
      <Tab.Screen
        name={BOTTOMTABSCREN.collect}
        component={CollectTab}
        options={{ title: BOTTOMTABSCREN.journal }}
      />
      <Tab.Screen
        name={BOTTOMTABSCREN.profile}
        component={ProfileTab}
        options={{ title: BOTTOMTABSCREN.journal }}
      />
    </Tab.Navigator>
  );
}
