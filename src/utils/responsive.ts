import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DESIGN_WIDTH = 393;
export const DESIGN_HEIGHT = 832;

// SCREEN DIMENSIONS
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

/**
 * ============================================================
 * WIDTH SCALE

 * Use for:
 * - width
 * - horizontal margin
 * - horizontal padding
 * - left/right position
 * - horizontal spacing

 * Example:
 * wp(20)
 * ============================================================
 */

export const wp = (value: number): number => {
  return (SCREEN_WIDTH / DESIGN_WIDTH) * value;
};

/**
 * ============================================================
 * HEIGHT SCALE

 * Use for:
 * - height
 * - vertical margin
 * - vertical padding
 * - top/bottom position
 * - vertical spacing

 * Example:
 * hp(20)
 * ============================================================
 */

export const hp = (value: number): number => {
  return (SCREEN_HEIGHT / DESIGN_HEIGHT) * value;
};

/**
 * ============================================================
 * MODERATE SCALE
 *
 * Useful for:
 * - font sizes
 * - icons
 * - border radius
 * - elements that should scale gently
 *
 * factor:
 * 0   = no scaling
 * 0.5 = recommended default
 * 1   = full width scaling
 *
 * Example:
 * ms(20)
 * ============================================================
 */

export const ms = (value: number, factor: number = 0.5): number => {
  return value + (wp(value) - value) * factor;
};

/**
 * ============================================================
 * FONT SCALE
 *
 * Font size should generally not scale as aggressively
 * as layout dimensions.
 *
 * Example:
 * font(20)
 * ============================================================
 */

export const font = (value: number, factor: number = 0.5): number => {
  const scaled = ms(value, factor);

  return PixelRatio.roundToNearestPixel(scaled);
};

/**
 * ============================================================
 * WIDTH PERCENTAGE
 *
 * Example:
 * rw(50) = 50% of screen width
 * ============================================================
 */

export const rw = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * ============================================================
 * HEIGHT PERCENTAGE
 *
 * Example:
 * rh(50) = 50% of screen height
 * ============================================================
 */

export const rh = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

/**
 * ============================================================
 * CLAMP
 *
 * Keeps a value between minimum and maximum.
 *
 * Example:
 * clamp(16, font(20), 24)
 * ============================================================
 */

export const clamp = (min: number, value: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * ============================================================
 * RESPONSIVE FONT
 *
 * Prevents fonts from becoming too small or too large.
 *
 * Example:
 * responsiveFont(16, 14, 20)
 * ============================================================
 */

export const responsiveFont = (
  value: number,
  min: number = value * 0.85,
  max: number = value * 1.15,
): number => {
  return clamp(min, font(value), max);
};

/**
 * ============================================================
 * TABLET DETECTION
 * ============================================================
 */

export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;

  return (
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600 &&
    aspectRatio < 1.8
  );
};

/**
 * ============================================================
 * DEVICE TYPE
 * ============================================================
 */

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 360;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 430;
};

/**
 * ============================================================
 * PIXEL ROUNDING
 *
 * Useful for borders and exact measurements.
 * ============================================================
 */

export const pixel = (value: number): number => {
  return PixelRatio.roundToNearestPixel(value);
};
