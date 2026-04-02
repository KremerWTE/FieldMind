import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from '../screens/LoginScreen';
import ForgotPinScreen from '../screens/ForgotPinScreen';
import JobSiteSelectScreen from '../screens/JobSiteSelectScreen';
import QuickCaptureScreen from '../screens/QuickCaptureScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import UploadScreen from '../screens/UploadScreen';
import TimeClockScreen from '../screens/TimeClockScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tab.Screen
        name="JobSites"
        component={JobSiteSelectScreen}
        options={{ title: 'Job Sites', headerShown: false }}
      />
      <Tab.Screen
        name="TimeClock"
        component={TimeClockScreen}
        options={{ title: 'Time Clock' }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{ title: 'Upload' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      setIsAuthenticated(!!token);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="ForgotPin"
            component={ForgotPinScreen}
            options={{ headerShown: true, title: 'Reset PIN' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main">
            {(props) => <MainTabs {...props} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen
            name="QuickCapture"
            component={QuickCaptureScreen}
            options={{ headerShown: true, title: 'Capture Photo' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
