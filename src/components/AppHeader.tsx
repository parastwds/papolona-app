import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '@/navigation';
import { Back } from '@assets/icon';
import { hp } from '@/utils/responsive';

type Props = NativeStackNavigationProp<RootStackParamList>;

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  // Customization
  titleStyle?: StyleProp<TextStyle>;
  titleFontSize?: number;
  iconWidth?: number;
  iconHeight?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const AppHeader = ({
  title,
  showBackButton = true,
  onBackPress,
  rightComponent,
  titleStyle,
  titleFontSize = 24,
  iconWidth = 34,
  iconHeight = 34,
  containerStyle,
}: AppHeaderProps) => {
  const navigation = useNavigation<Props>();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    navigation.goBack();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.left}>
        {showBackButton ? (
          <Pressable onPress={handleBack} hitSlop={15}>
            <Back width={iconWidth} height={iconHeight} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <Text
        style={[styles.title, { fontSize: titleFontSize }, titleStyle]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <View style={styles.right}>
        {rightComponent ?? <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: hp(1),
    width: '95%',
    alignSelf: 'center',
  },

  left: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  right: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    right: 13,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 10,
  },

  placeholder: {
    width: 24,
    height: 24,
  },
});
