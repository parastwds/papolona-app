import React, { useMemo, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Image as RNImage,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 280;

const distance = (event: GestureResponderEvent) => {
  const [a, b] = event.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

interface ZoomableImageViewerProps {
  // A bundled image from require().
  source: number;
  label: string;
  onClose: () => void;
}

/**
 * Full screen: the image spans the screen's width (height from its proportions).
 * Pinch or double-tap to zoom, drag to look around; the image can't be dragged off screen.
 */
const ZoomableImageViewer = ({
  source,
  label,
  onClose,
}: ZoomableImageViewerProps) => {
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const asset = RNImage.resolveAssetSource(source);
  const imageHeight = asset?.width
    ? (width * asset.height) / asset.width
    : width;

  const zoom = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const responder = useMemo(() => {
    const state = {
      zoom: 1,
      x: 0,
      y: 0,
      startZoom: 1,
      startX: 0,
      startY: 0,
      startDistance: 0,
      pinching: false,
      lastTap: 0,
    };

    // How far the zoomed image may move before its edge would leave the screen's edge.
    const clamp = (
      value: number,
      size: number,
      viewport: number,
      z: number,
    ) => {
      const max = Math.max(0, (size * z - viewport) / 2);
      return Math.min(max, Math.max(-max, value));
    };
    const clampX = (x: number, z: number) => clamp(x, width, width, z);
    const clampY = (y: number, z: number) =>
      clamp(y, imageHeight, screenHeight, z);

    const settle = (toZoom: number, toX: number, toY: number) => {
      state.zoom = toZoom;
      state.x = clampX(toX, toZoom);
      state.y = clampY(toY, toZoom);
      Animated.parallel(
        (
          [
            [zoom, state.zoom],
            [panX, state.x],
            [panY, state.y],
          ] as const
        ).map(([value, toValue]) =>
          Animated.spring(value, {
            toValue,
            friction: 7,
            useNativeDriver: false,
          }),
        ),
      ).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        state.startZoom = state.zoom;
        state.startX = state.x;
        state.startY = state.y;
        state.pinching = false;
      },
      onPanResponderMove: (event, gesture) => {
        if (event.nativeEvent.touches.length >= 2) {
          if (!state.pinching) {
            state.pinching = true;
            state.startDistance = distance(event);
            state.startZoom = state.zoom;
          }
          const next = Math.min(
            MAX_ZOOM,
            Math.max(
              0.8,
              (state.startZoom * distance(event)) / state.startDistance,
            ),
          );
          state.zoom = next;
          zoom.setValue(next);
        } else if (!state.pinching && state.zoom > 1) {
          state.x = clampX(state.startX + gesture.dx, state.zoom);
          state.y = clampY(state.startY + gesture.dy, state.zoom);
          panX.setValue(state.x);
          panY.setValue(state.y);
        }
      },
      onPanResponderRelease: (_event, gesture) => {
        const isTap =
          !state.pinching &&
          Math.abs(gesture.dx) < 6 &&
          Math.abs(gesture.dy) < 6;
        if (isTap) {
          const now = Date.now();
          if (now - state.lastTap < DOUBLE_TAP_MS) {
            state.lastTap = 0;
            if (state.zoom > 1.05) settle(1, 0, 0);
            else settle(DOUBLE_TAP_ZOOM, 0, 0);
            return;
          }
          state.lastTap = now;
        }
        if (state.zoom < 1.05) settle(1, 0, 0);
        else settle(state.zoom, state.x, state.y);
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [zoom, panX, panY, width, imageHeight, screenHeight]);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop} {...responder.panHandlers}>
        {/* Drawn before the image so the image covers it as it grows, sits just under the
            unzoomed image, and fades out once the user starts zooming. */}
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.hint,
            {
              top: Math.min(
                (screenHeight + imageHeight) / 2 + 20,
                screenHeight - insets.bottom - 40,
              ),
              opacity: zoom.interpolate({
                inputRange: [1, 1.15],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          Zoom this picture
        </Animated.Text>
        <Animated.View
          style={{
            transform: [
              { translateX: panX },
              { translateY: panY },
              { scale: zoom },
            ],
          }}
        >
          <Image
            source={source}
            contentFit="contain"
            style={{ width, height: imageHeight }}
            accessibilityLabel={label}
          />
        </Animated.View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close image"
        hitSlop={10}
        onPress={onClose}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color="#F1EEE0" strokeWidth={1.8} />
      </Pressable>
    </Modal>
  );
};

export default ZoomableImageViewer;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  hint: {
    position: 'absolute',
    left: 20,
    right: 20,
    color: '#A8B09A',
    fontSize: 16,
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.42)',
    borderRadius: 20,
    backgroundColor: 'rgba(8, 14, 10, 0.7)',
  },
});
