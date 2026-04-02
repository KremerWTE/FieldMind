import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProfileScreen({ navigation, onLogout }: { navigation: any; onLogout: () => void }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUser(await res.json());
    } catch {
      // offline
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          onLogout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user ? (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') : '?'}
          </Text>
        </View>
        {user && (
          <>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.role}>{user.role}</Text>
          </>
        )}
      </View>

      {/* Info card */}
      {user && (
        <View style={styles.card}>
          <Row label="Email" value={user.email} />
          {user.jobTitle && <Row label="Job Title" value={user.jobTitle} />}
          {user.phoneNumber && <Row label="Phone" value={user.phoneNumber} />}
          {user.team?.name && <Row label="Team" value={user.team.name} />}
        </View>
      )}

      {/* Actions */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Photos', { title: 'My Uploads' })}>
          <Text style={styles.actionLabel}>📷  Browse All Photos</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Main', { screen: 'Upload' })}>
          <Text style={styles.actionLabel}>☁️  Upload Photos</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 16 : 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, color: '#fff', fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#111827', flex: 1, textAlign: 'right', marginLeft: 16 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: { fontSize: 15, color: '#111827' },
  chevron: { fontSize: 20, color: '#9ca3af' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
