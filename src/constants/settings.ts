import { SettingItem } from '@/features/profile/component/SettingCard';

export const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'language',
    title: 'Language',
    description: 'Prompts and journal language',
    value: 'English',
    type: 'language',
  },
  {
    id: 'research-sharing',
    title: 'Research sharing',
    description: 'Private unless you contribute',
    value: 'Private',
    type: 'research-sharing',
  },
  {
    id: 'biometric-unlock',
    title: 'Biometric unlock',
    description: 'Device-level convenience',
    value: 'Off',
    type: 'biometric',
  },
];
