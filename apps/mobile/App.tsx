import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/services/notifications.service';

export const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notification received]', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      handleNotificationTap(data);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const handleNotificationTap = (data: any) => {
    if (!navigationRef.isReady() || !data) return;

    if (data.screen === 'Photos' && data.buildingId) {
      navigationRef.navigate('Photos', { buildingId: data.buildingId, title: data.buildingName });
    } else if (data.screen === 'TimeClock') {
      navigationRef.navigate('Main', { screen: 'TimeClock' });
    } else if (data.screen === 'Upload') {
      navigationRef.navigate('Main', { screen: 'Upload' });
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
