import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import BookOpen from 'lucide-react-native/icons/book-open';
import Compass from 'lucide-react-native/icons/compass';
import House from 'lucide-react-native/icons/house';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import UserRound from 'lucide-react-native/icons/user-round';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import ButterflySvg from '@assets/tabicon/butterfly.svg';

import type { RootTabParamList } from '@/navigation/types';
import EdgeFade from '@/components/EdgeFade';
import { useDmInbox } from '@/services/queries';

const TAB_BAR_HEIGHT = 66;
// How far above the bar's top edge the fade begins.
const FADE_ABOVE_BAR = 56;

const Butterfly = ({
  color = 'currentColor',
  size = 24,
  strokeWidth = 1.7,
}: LucideProps): ReactNode => (
  <ButterflySvg
    width={size}
    height={size}
    color={color}
    strokeWidth={strokeWidth}
  />
);

type TabName = keyof RootTabParamList;

type TabConfig = {
  label: string;
  icon: LucideIcon | ((props: LucideProps) => ReactNode);
};

const TAB_CONFIG: Record<TabName, TabConfig> = {
  Home: {
    label: 'Home',
    icon: House,
  },

  Journal: {
    label: 'Journal',
    icon: BookOpen,
  },

  Discover: {
    label: 'Discover',
    icon: Compass,
  },

  Messages: {
    label: 'Messages',
    icon: MessageCircle,
  },

  Collect: {
    label: 'Gallery',
    icon: Butterfly,
  },

  Profile: {
    label: 'Profile',
    icon: UserRound,
  },
};

// Gold-on-dark glass, matching the login screen and the tab screens.
const COLORS = {
  active: '#E8D58A',
  inactive: 'rgba(168, 176, 154, 0.72)',
  background: 'rgba(6, 11, 8, 0.94)',
  border: 'rgba(217, 199, 126, 0.32)',
  activePill: 'rgba(217, 199, 126, 0.14)',
};

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  // Unread messages and waiting requests, on the Messages tab.
  const unread = useDmInbox().data?.unreadCount ?? 0;
  const barBottom = Math.max(insets.bottom, 12) + 4;
  return (
    <>
      {/* All five tabs scroll behind this floating bar; the fade lets their content dissolve
          into the dark as it reaches the bar, instead of being cut off at the screen's edge. */}
      <EdgeFade height={barBottom + TAB_BAR_HEIGHT + FADE_ABOVE_BAR} />
      <View style={[styles.container, { bottom: barBottom }]}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const routeName = route.name as TabName;
            const config = TAB_CONFIG[routeName];
            const isFocused = state.index === index;
            const Icon = config.icon;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                style={({ pressed }) => [
                  styles.tabItem,
                  pressed && styles.tabItemPressed,
                ]}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: isFocused,
                }}
                accessibilityLabel={`${
                  descriptors[route.key].options.tabBarAccessibilityLabel ??
                  config.label
                }${routeName === 'Messages' && unread > 0 ? `, ${unread} unread` : ''}`}
                onPress={onPress}
                onLongPress={onLongPress}
              >
                <View style={styles.iconPill}>
                  {/* Mounted only when active: changing the background of a view already
                    on screen makes Android drop its rounded corners. */}
                  {isFocused && <View style={styles.activePill} />}
                  <Icon
                    size={20}
                    color={isFocused ? COLORS.active : COLORS.inactive}
                    strokeWidth={isFocused ? 1.9 : 1.6}
                  />
                  {routeName === 'Messages' && unread > 0 ? (
                    <View style={styles.unread}>
                      <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
};

export default CustomTabBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    left: 16,
  },

  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 33,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },

  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabItemPressed: {
    opacity: 0.7,
  },

  iconPill: {
    width: 46,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activePill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
    backgroundColor: COLORS.activePill,
  },

  tabLabel: {
    marginTop: 3,
    color: COLORS.inactive,
    fontSize: 10,
    letterSpacing: 0.3,
  },

  unread: {
    position: 'absolute',
    top: -3,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E8964A',
  },

  unreadText: { color: '#120C05', fontSize: 9, fontWeight: '700' },

  tabLabelActive: {
    color: COLORS.active,
    fontWeight: '600',
  },
});
