import {
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import React from 'react';

import { COLORS } from '@/theme/colors';
import { font, hp } from '@/utils/responsive';
import EdgeFade from './EdgeFade';

const TOP_FADE_HEIGHT = 40;

interface Props {
  title: React.ReactNode;
  // Optional: without it the header is just the title, with no empty line below.
  subTitle?: string;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  txtStyle?: StyleProp<TextStyle>;
  subTitleStyle?: StyleProp<TextStyle>;
}

const CustomHeader = ({
  title,
  subTitle,
  rightIcon,
  containerStyle,
  txtStyle,
  subTitleStyle,
}: Props) => {
  return (
    <>
      <View style={[styles.container, containerStyle]}>
        {/* Darkens gradually down through the header to meet the strip below at full
            strength, so the background image shows no seam where the strip begins. */}
        <EdgeFade edge="bottom" fill />

        {/* Left Side */}
        <View style={styles.leftSide}>
          <Text style={[styles.txt, txtStyle]}>{title}</Text>
          {subTitle ? (
            <Text style={[styles.subtitle, subTitleStyle]}>{subTitle}</Text>
          ) : null}
        </View>

        {/* Right Side */}
        {rightIcon ? <View style={styles.rightSide}>{rightIcon}</View> : null}
      </View>

      {/* A strip just below the header, laid over the top of the scrolling content (its
          negative margin keeps the content where it was), so content scrolling up fades into
          the dark instead of being cut off at a hard line. A child hanging outside the header
          instead would be clipped to the header on Android. */}
      <View pointerEvents="none" style={styles.fadeStrip}>
        <EdgeFade edge="top" height={TOP_FADE_HEIGHT} />
      </View>
    </>
  );
};

export default CustomHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: hp(14),
    paddingVertical: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fadeStrip: {
    height: TOP_FADE_HEIGHT,
    marginBottom: -TOP_FADE_HEIGHT,
    // Draws the strip above the ScrollView that follows it.
    zIndex: 1,
  },
  txt: {
    color: '#A1BE94',
    fontSize: font(16),
  },
  subtitle: {
    color: COLORS.white,
    fontSize: font(25),
  },

  leftSide: {},
  rightSide: {},
});
