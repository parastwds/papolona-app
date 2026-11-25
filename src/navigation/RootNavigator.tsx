import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppNavigator from './AppNavigator';
import { SCREENS } from '@/constants/screens';
import { restoreSession } from '@/services/session';
import { RootStackParamList } from './types';

const RootNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);

  useEffect(() => {
    let active = true;
    restoreSession().then(hasSession => {
      if (active)
        setInitialRoute(hasSession ? SCREENS.mainTabs : SCREENS.welcome);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#D9C77E" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
};

export default RootNavigator;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020905',
  },
});
