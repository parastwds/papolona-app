import React, { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import type { MapPin } from '../pins';
import { BORDERS_PATH, LAND_PATH, MAP_HEIGHT, MAP_WIDTH } from '../data/worldMap';

export const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT;

export const MAP_COLORS = {
  // Muted moss and sage, like the app's cards and text, rather than a bright green.
  land: '#33452F',
  landEdge: '#A1BE94',
  border: 'rgba(4, 12, 7, 0.7)',
  // Registered users (still on probation) and full members.
  registered: '#F4F1E4',
  member: '#F2C94C',
  pinEdge: '#06180E',
};

// A dropped pin whose tip is at (0, 0); about 12 units tall before scaling.
const PIN = 'M0 0C-2.6-4.2-4.2-6.3-4.2-8.4a4.2 4.2 0 1 1 8.4 0C4.2-6.3 2.6-4.2 0 0Z';

type Props = {
  // The size the map is drawn at.
  width: number;
  // The width it appears on screen, when a parent scales it (zooming). Defaults to `width`.
  shownWidth?: number;
  pins: MapPin[];
};

/** The flat green world map with one dropped pin per user. */
const WorldMap = ({ width, shownWidth = width, pins }: Props) => {
  // Keep pins about the same size on screen however far the map is zoomed.
  const scale = (MAP_WIDTH / shownWidth) * 1.15;
  return (
    <Svg
      width={width}
      height={width / MAP_ASPECT}
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      accessibilityLabel="World map of Papolona users"
    >
      <Path
        d={LAND_PATH}
        fill={MAP_COLORS.land}
        stroke={MAP_COLORS.landEdge}
        strokeWidth={0.5}
        strokeOpacity={0.35}
      />
      <Path d={BORDERS_PATH} fill="none" stroke={MAP_COLORS.border} strokeWidth={0.6} />
      {pins.map(pin => (
        <G key={pin.key} transform={`translate(${pin.x} ${pin.y}) scale(${scale})`}>
          <Path
            d={PIN}
            fill={pin.member ? MAP_COLORS.member : MAP_COLORS.registered}
            stroke={MAP_COLORS.pinEdge}
            strokeWidth={0.7}
          />
          <Circle cx={0} cy={-8.4} r={1.5} fill={MAP_COLORS.pinEdge} />
        </G>
      ))}
    </Svg>
  );
};

export default memo(WorldMap);
