import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { wp, hp, font, ms } from '@/utils/responsive';
import { PALETTE } from '@/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeOpacity?: number;
}

const AppButton = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  width,
  height = 52,
  style,
  textStyle,
  activeOpacity = 0.95,
}: AppButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        width !== undefined && {
          width: wp(width),
        },
        {
          height: hp(height),
        },
        styles[`${variant}Button`],
        isDisabled && styles.disabledButton,
        pressed &&
          !isDisabled && {
            opacity: activeOpacity,
            transform: [{ scale: 0.99 }],
          },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor(variant)} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

          <Text
            numberOfLines={1}
            style={[styles.text, styles[`${variant}Text`], textStyle]}
          >
            {title}
          </Text>

          {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

const getLoaderColor = (variant: ButtonVariant) => {
  switch (variant) {
    case 'secondary':
      return '#000000';
    case 'outline':
      return '#FFFFFF';
    case 'ghost':
      return '#FFFFFF';
    case 'primary':
    default:
      return '#000000';
  }
};

export default AppButton;

const styles = StyleSheet.create({
  button: {
    borderRadius: ms(28),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(20),
  },

  fullWidth: {
    width: '100%',
  },

  content: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  text: {
    fontSize: font(15),
    lineHeight: font(30),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.81,
  },

  leftIcon: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightIcon: {
    marginLeft: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * PRIMARY
   */
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },

  primaryText: {
    color: '#000000',
  },

  /*
   * SECONDARY
   */
  secondaryButton: {
    backgroundColor: '#B8C7A8',
  },

  secondaryText: {
    color: '#000000',
  },

  /*
   * OUTLINE
   */
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.8,
    borderColor: PALETTE.cardBorder,
  },
  outlineText: {
    color: '#FFFFFF',
  },

  /*
   * GHOST
   */
  ghostButton: {
    backgroundColor: 'transparent',
  },

  ghostText: {
    color: '#FFFFFF',
  },

  /*
   * DISABLED
   */
  disabledButton: {
    opacity: 0.45,
  },
});
