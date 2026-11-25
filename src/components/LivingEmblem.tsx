import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  GestureResponderEvent,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

// Two frames of the same butterfly; only the antennae differ, so swapping them makes it twitch.
const FRAME_A = require('../../assets/butterfly_frame_a.png');
const FRAME_B = require('../../assets/butterfly_frame_b.png');
const EMBLEM_ASPECT_RATIO = 842 / 592;
// Antenna cycle: an instant switch to the other frame, a hold, and back. No fade: while two
// frames are both partly visible, both pairs of antennae show at once.

// The source is about 1000 pixels across; beyond 4x it only gets softer.
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 280;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The Papolona butterfly, alive: it holds still while its antennae move, by swapping between
 * two frames of the image at random moments.
 */
const EmblemBody = ({ size }: { size: number | `${number}%` }) => {
  const antenna = useRef(new Animated.Value(0)).current; // opacity of the second frame

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const swap = (toValue: number) =>
      Animated.timing(antenna, {
        toValue,
        duration: 0,
        useNativeDriver: true,
      });
    const step = () => {
      if (stopped) return;
      // Rare and brief, so it reads as "did that just move?": usually one twitch, now and then
      // a quick double.
      const twice = Math.random() < 0.15;
      const hold = random(700, 1400);
      const anim = twice
        ? Animated.sequence([
            swap(1),
            Animated.delay(hold),
            swap(0),
            Animated.delay(180),
            swap(1),
            Animated.delay(hold),
            swap(0),
          ])
        : Animated.sequence([swap(1), Animated.delay(hold), swap(0)]);
      anim.start(() => {
        if (!stopped) timer = setTimeout(step, random(4000, 8000));
      });
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduce => {
        if (!stopped && !reduce) timer = setTimeout(step, random(3000, 6000));
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      antenna.stopAnimation();
    };
  }, [antenna]);

  const frameAOpacity = antenna.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={{ width: size, aspectRatio: EMBLEM_ASPECT_RATIO }}>
      {/* Kept at full resolution so they stay sharp when zoomed. */}
      {/* Only one frame is ever visible: the first hides while the second shows. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: frameAOpacity }]}>
        <Image
          source={FRAME_A}
          contentFit="contain"
          allowDownscaling={false}
          style={styles.fill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: antenna }]}>
        <Image
          source={FRAME_B}
          contentFit="contain"
          allowDownscaling={false}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
};

const distance = (event: GestureResponderEvent) => {
  const [a, b] = event.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

/** Full screen: pinch or double-tap to zoom, drag to look around. */
const EmblemViewer = ({ onClose }: { onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const zoom = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const responder = useMemo(() => {
    const state = {
      zoom: 1,
      x: 0,
      y: 0,
      // Where the current gesture started.
      startZoom: 1,
      startX: 0,
      startY: 0,
      startDistance: 0,
      pinching: false,
      lastTap: 0,
    };

    const settle = (toZoom: number, toX: number, toY: number) => {
      state.zoom = toZoom;
      state.x = toX;
      state.y = toY;
      Animated.parallel(
        [
          [zoom, toZoom],
          [panX, toX],
          [panY, toY],
        ].map(([value, toValue]) =>
          Animated.spring(value as Animated.Value, {
            toValue: toValue as number,
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
          state.x = state.startX + gesture.dx;
          state.y = state.startY + gesture.dy;
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
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [zoom, panX, panY]);

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
        <Animated.View
          style={{
            transform: [
              { translateX: panX },
              { translateY: panY },
              { scale: zoom },
            ],
          }}
        >
          <EmblemBody size={Math.round(width * 0.78)} />
        </Animated.View>
      </View>
      <Text style={[styles.viewerHint, { bottom: insets.bottom + 28 }]}>
        Pinch or double-tap to zoom
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close the butterfly"
        hitSlop={10}
        onPress={onClose}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color="#F1EEE0" strokeWidth={1.8} />
      </Pressable>
    </Modal>
  );
};

interface LivingEmblemProps {
  // Width on the page; the height follows the emblem's proportions.
  size?: number | `${number}%`;
}

/** The living emblem on a page; tapping it opens the zoomable full-screen view. */
const LivingEmblem = ({ size = 200 }: LivingEmblemProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="The Papolona butterfly"
        accessibilityHint="Opens the butterfly full screen, where you can zoom in"
        onPress={() => setOpen(true)}
        style={styles.inline}
      >
        <EmblemBody size={size} />
        <Text style={styles.inlineHint}>Tap to zoom</Text>
      </Pressable>
      {open && <EmblemViewer onClose={() => setOpen(false)} />}
    </>
  );
};

export default LivingEmblem;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  inline: {
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  inlineHint: {
    marginTop: 6,
    color: '#A8B09A',
    fontSize: 11,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  viewerHint: {
    position: 'absolute',
    left: 20,
    right: 20,
    color: '#A8B09A',
    fontSize: 12,
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
