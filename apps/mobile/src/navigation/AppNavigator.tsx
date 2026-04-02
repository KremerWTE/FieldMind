import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import offlineService from '../services/offline.service';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from '../screens/LoginScreen';
import ForgotPinScreen from '../screens/ForgotPinScreen';
import JobSiteSelectScreen from '../screens/JobSiteSelectScreen';
import QuickCaptureScreen from '../screens/QuickCaptureScreen';
import PhotosScreen from '../screens/PhotosScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import UploadScreen from '../screens/UploadScreen';
import TimeClockScreen from '../screens/TimeClockScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({
  navigation,
  onLogout,
  pendingUploads,
}: {
  navigation: any;
  onLogout: () => void;
  pendingUploads: number;
}) {
  const ProfileButton = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={styles.profileBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.profileBtnText}>👤</Text>
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerRight: () => <ProfileButton />,
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
        options={{
          title: 'Upload',
          tabBarBadge: pendingUploads > 0 ? pendingUploads : undefined,
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotosScreen}
        options={{ title: 'Photos' }}
        initialParams={{ title: 'All Photos' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = offlineService.subscribe((queue) => {
      setPendingUploads(queue.length);
    });
    return unsubscribe;
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

  const handleLoginSuccess = () => setIsAuthenticated(true);

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
            {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
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
            {(props) => (
              <MainTabs {...props} onLogout={handleLogout} pendingUploads={pendingUploads} />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="QuickCapture"
            component={QuickCaptureScreen}
            options={{ headerShown: true, title: 'Capture Photo' }}
          />
          <Stack.Screen
            name="Photos"
            component={PhotosScreen}
            options={{ headerShown: true, title: 'Photos' }}
          />
          <Stack.Screen
            name="Profile"
            options={{ headerShown: true, title: 'My Profile' }}
          >
            {(props) => <ProfileScreen {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  profileBtn: {
    marginRight: 16,
  },
  profileBtnText: {
    fontSize: 22,
  },
});
