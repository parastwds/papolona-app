import React from 'react';
import { View, ViewStyle } from 'react-native';

interface AppSpaceProps {
  size?: number;
  horizontal?: boolean;
  style?: ViewStyle;
}

const AppSpace: React.FC<AppSpaceProps> = ({
  size = 8,
  horizontal = false,
  style,
}) => {
  const spacingStyle: ViewStyle = horizontal
    ? { width: size }
    : { height: size };

  return <View style={[spacingStyle, style]} />;
};

export default AppSpace;
