import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import type { MapPin } from '../pins';
import WorldMap, { MAP_ASPECT } from './WorldMap';

// Zoom is counted in screen widths: at 1 the whole world fits across the screen.
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const START_ZOOM = 2;
const BUTTON_STEP = 1.6;
const DOUBLE_TAP_MS = 280;
// The map is drawn this many screen widths wide and scaled from there, so it stays sharp
// while zooming in (a view scaled far beyond its drawn size turns soft).
const DRAWN = 3;

const distance = (event: GestureResponderEvent) => {
  const [a, b] = event.nativeEvent.touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

type Props = {
  // The viewport's width (the screen's).
  width: number;
  pins: MapPin[];
  // True while a gesture on the map must not also scroll the page around it.
  onLockScroll: (locked: boolean) => void;
};

/**
 * The world map in a window you can zoom: pinch, double-tap or the +/- buttons, and drag to move
 * around once zoomed in. The map can't be dragged out of its window.
 */
const ZoomableMap = ({ width, pins, onLockScroll }: Props) => {
  const height = (width / MAP_ASPECT) * START_ZOOM;
  const drawnWidth = width * DRAWN;
  const drawnHeight = drawnWidth / MAP_ASPECT;

  // `scale` is applied to the drawn map: zoom / DRAWN.
  const scale = useRef(new Animated.Value(START_ZOOM / DRAWN)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  // The zoom the map has come to rest at: pins are redrawn for it, so they keep their size.
  const [restZoom, setRestZoom] = useState(START_ZOOM);

  const controls = useMemo(() => {
    const state = {
      zoom: START_ZOOM,
      x: 0,
      y: 0,
      startZoom: START_ZOOM,
      startX: 0,
      startY: 0,
      startDistance: 0,
      pinching: false,
      lastTap: 0,
    };

    // How far the map's centre may sit from the window's centre before an edge would show.
    const clamp = (value: number, size: number, viewport: number) => {
      const max = Math.max(0, (size - viewport) / 2);
      return Math.min(max, Math.max(-max, value));
    };
    const clampX = (x: number, z: number) => clamp(x, width * z, width);
    const clampY = (y: number, z: number) =>
      clamp(y, (width / MAP_ASPECT) * z, height);

    const settle = (toZoom: number, toX: number, toY: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, toZoom));
      // Keep the same spot of the map in the middle of the window while the zoom changes.
      const ratio = z / state.zoom;
      state.x = clampX(toX * ratio, z);
      state.y = clampY(toY * ratio, z);
      state.zoom = z;
      setRestZoom(z);
      Animated.parallel(
        (
          [
            [scale, z / DRAWN],
            [panX, state.x],
            [panY, state.y],
          ] as const
        ).map(([value, toValue]) =>
          Animated.spring(value, {
            toValue,
            friction: 8,
            useNativeDriver: false,
          }),
        ),
      ).start();
    };

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Two fingers always belong to the map; one finger only once there is map to move to.
      onMoveShouldSetPanResponder: event =>
        event.nativeEvent.touches.length >= 2 || state.zoom > MIN_ZOOM,
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
            state.startX = state.x;
            state.startY = state.y;
          }
          const next = Math.min(
            MAX_ZOOM,
            Math.max(
              MIN_ZOOM * 0.85,
              (state.startZoom * distance(event)) / state.startDistance,
            ),
          );
          const ratio = next / state.startZoom;
          state.zoom = next;
          state.x = clampX(state.startX * ratio, next);
          state.y = clampY(state.startY * ratio, next);
          scale.setValue(next / DRAWN);
          panX.setValue(state.x);
          panY.setValue(state.y);
        } else if (!state.pinching) {
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
            // Double-tap steps in; at the closest zoom it steps back out to the whole world.
            if (state.zoom >= MAX_ZOOM - 0.05) settle(MIN_ZOOM, 0, 0);
            else settle(state.zoom * 2, state.x, state.y);
            return;
          }
          state.lastTap = now;
        }
        settle(state.zoom, state.x, state.y);
      },
      onPanResponderTerminate: () => settle(state.zoom, state.x, state.y),
      // While zoomed in or pinching, the page around the map must not take the gesture.
      onPanResponderTerminationRequest: () =>
        !state.pinching && state.zoom <= MIN_ZOOM,
    });

    return {
      responder,
      zoomBy: (factor: number) => settle(state.zoom * factor, state.x, state.y),
      // A touch that the map will use (a pinch, or a drag while zoomed in) must not scroll the page.
      wantsTouch: (touches: number) => touches >= 2 || state.zoom > MIN_ZOOM,
    };
  }, [scale, panX, panY, width, height]);

  return (
    <View
      style={[styles.window, { width, height }]}
      onTouchStart={event => {
        if (controls.wantsTouch(event.nativeEvent.touches.length))
          onLockScroll(true);
      }}
      onTouchEnd={event => {
        if (event.nativeEvent.touches.length === 0) onLockScroll(false);
      }}
      onTouchCancel={() => onLockScroll(false)}
      {...controls.responder.panHandlers}
    >
      <Animated.View
        style={[
          styles.map,
          {
            left: (width - drawnWidth) / 2,
            top: (height - drawnHeight) / 2,
            width: drawnWidth,
            height: drawnHeight,
            transform: [{ translateX: panX }, { translateY: panY }, { scale }],
          },
        ]}
      >
        <WorldMap
          width={drawnWidth}
          shownWidth={width * restZoom}
          pins={pins}
        />
      </Animated.View>

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          disabled={restZoom >= MAX_ZOOM}
          onPress={() => controls.zoomBy(BUTTON_STEP)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            restZoom >= MAX_ZOOM && styles.disabled,
          ]}
        >
          <Plus size={18} color="#F1EEE0" strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          disabled={restZoom <= MIN_ZOOM}
          onPress={() => controls.zoomBy(1 / BUTTON_STEP)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            restZoom <= MIN_ZOOM && styles.disabled,
          ]}
        >
          <Minus size={18} color="#F1EEE0" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
};

export default ZoomableMap;

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
  map: { position: 'absolute' },
  buttons: { position: 'absolute', right: 12, bottom: 12, gap: 8 },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217, 199, 126, 0.55)',
    borderRadius: 18,
    backgroundColor: 'rgba(2, 12, 7, 0.82)',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});
