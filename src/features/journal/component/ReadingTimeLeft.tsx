import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface ReadingTimeLeftProps {
  // Device time (ms) by which the reading must be completed.
  until: number;
  // Called once when the time is up.
  onDone?: () => void;
  style?: StyleProp<TextStyle>;
  // Style for the last hour, when time is short.
  urgentStyle?: StyleProp<TextStyle>;
}

const HOUR = 60 * 60 * 1000;

/** "11:42:03": hours, minutes and seconds left. */
export function formatTimeLeft(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(
    Math.floor((total % 3600) / 60),
  )}:${pad(total % 60)}`;
}

// "Complete within 11:42:03", ticking every second. A reading must be passed
// within 12 hours of its draw. It owns its timer so only this text re-renders,
// and it recomputes from the clock, so it stays right after the app has been in
// the background.
const ReadingTimeLeft = ({
  until,
  onDone,
  style,
  urgentStyle,
}: ReadingTimeLeftProps) => {
  const [now, setNow] = useState(Date.now());
  const remaining = until - now;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const done = remaining <= 0;
  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <Text
      style={[style, remaining < HOUR && urgentStyle]}
      accessibilityLiveRegion="none"
    >
      {done ? 'Time is up' : `Complete within ${formatTimeLeft(remaining)}`}
    </Text>
  );
};

export default ReadingTimeLeft;
