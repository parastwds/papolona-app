import React from 'react';

import ProfileSubScreen, { SubSection } from '../../component/ProfileSubScreen';
import SettingCard from '../../component/SettingCard';
import NotificationSettings from '../../component/NotificationSettings';
import { useSyncTimeZone } from '@/services/useSyncTimeZone';
import { SETTINGS_ITEMS } from '@/constants/settings';

// Settings Screen
const Settings = () => {
  // The reading reminder is emailed at the set time in the user's zone.
  const timeZone = useSyncTimeZone();

  return (
    <ProfileSubScreen title="Settings">
      <NotificationSettings timeZone={timeZone} />
      {/* Language, research sharing and biometric unlock are not built yet:
          each shows its value, with nothing to press. */}
      <SubSection title="Preferences">
        {SETTINGS_ITEMS.map((item, index) => (
          <SettingCard key={item.id} item={item} divided={index > 0} />
        ))}
      </SubSection>
    </ProfileSubScreen>
  );
};

export default Settings;
