import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut?: string;
  durationMinutes?: number;
  notes?: string;
  buildingId?: string;
  buildingName?: string;
  isApproved: boolean;
}

interface ClockStatus {
  isClockedIn: boolean;
  currentEntry?: TimeEntry;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function TimeClockScreen() {
  const [status, setStatus] = useState<ClockStatus>({ isClockedIn: false });
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [locationText, setLocationText] = useState('');
  const [lateStart, setLateStart] = useState(false);
  const [lateStartTime, setLateStartTime] = useState(''); // HH:MM format

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const headers = await authHeader();
      const [statusRes, entriesRes] = await Promise.all([
        fetch(`${API_URL}/time/status`, { headers }),
        fetch(`${API_URL}/time/my-entries`, { headers }),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch (error) {
      console.error('Failed to load time data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };

      let geoLat: number | undefined;
      let geoLng: number | undefined;

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        geoLat = loc.coords.latitude;
        geoLng = loc.coords.longitude;
      }

      let clockInTime: string | undefined;
      if (lateStart && lateStartTime) {
        const [hours, minutes] = lateStartTime.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const d = new Date();
          d.setHours(hours, minutes, 0, 0);
          // If the time is in the future (e.g. 11pm entered at midnight), subtract a day
          if (d > new Date()) d.setDate(d.getDate() - 1);
          clockInTime = d.toISOString();
        }
      }

      const response = await fetch(`${API_URL}/time/clock-in`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          location: locationText.trim() || 'On-site',
          geoLat,
          geoLng,
          ...(clockInTime ? { clockInTime } : {}),
        }),
      });

      if (response.ok) {
        setLocationText('');
        setLateStart(false);
        setLateStartTime('');
        await loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Failed to clock in.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };

      let geoLat: number | undefined;
      let geoLng: number | undefined;

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        geoLat = loc.coords.latitude;
        geoLng = loc.coords.longitude;
      }

      const response = await fetch(`${API_URL}/time/clock-out`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ geoLat, geoLng }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Failed to clock out.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to clock out. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const elapsedMinutes = status.currentEntry?.clockIn
    ? Math.floor((now.getTime() - new Date(status.currentEntry.clockIn).getTime()) / 60000)
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Live Clock */}
      <View style={styles.clockHeader}>
        <Text style={styles.clockTime}>
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={styles.clockDate}>
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Clock In/Out Card */}
      <View style={styles.actionCard}>
        {status.isClockedIn && status.currentEntry ? (
          <>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Clocked In</Text>
            </View>
            <Text style={styles.elapsedLabel}>Time elapsed</Text>
            <Text style={styles.elapsedTime}>{formatDuration(elapsedMinutes)}</Text>
            <Text style={styles.clockedSince}>
              Since {formatTime(status.currentEntry.clockIn)}
            </Text>
            <TouchableOpacity
              style={[styles.clockButton, styles.clockOutButton, actionLoading && styles.buttonDisabled]}
              onPress={handleClockOut}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.clockButtonText}>Clock Out</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.statusBadge, styles.statusBadgeOff]}>
              <View style={[styles.statusDot, styles.statusDotOff]} />
              <Text style={[styles.statusText, styles.statusTextOff]}>Not Clocked In</Text>
            </View>
            <TextInput
              style={styles.locationInput}
              placeholder="Job site / location (optional)"
              placeholderTextColor="#9ca3af"
              value={locationText}
              onChangeText={setLocationText}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.clockButton, styles.clockInButton, actionLoading && styles.buttonDisabled]}
              onPress={handleClockIn}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.clockButtonText}>Clock In</Text>
              )}
            </TouchableOpacity>
            {/* Late start toggle */}
            <TouchableOpacity
              style={styles.lateStartToggle}
              onPress={() => {
                if (!lateStart) {
                  const d = new Date(Date.now() - 30 * 60 * 1000);
                  setLateStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                }
                setLateStart(!lateStart);
              }}
            >
              <Text style={styles.lateStartToggleText}>
                {lateStart ? '✕ Cancel start time adjustment' : 'I arrived earlier — set actual start time'}
              </Text>
            </TouchableOpacity>
            {lateStart && (
              <View style={styles.lateStartRow}>
                <Text style={styles.lateStartLabel}>Start time (HH:MM, 24h)</Text>
                <TextInput
                  style={styles.lateStartInput}
                  value={lateStartTime}
                  onChangeText={setLateStartTime}
                  placeholder="e.g. 07:30"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={styles.lateStartHint}>Within the last 24 hours</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Recent Entries */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Time Entries</Text>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>No time entries yet</Text>
        ) : (
          entries.slice(0, 10).map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDate(entry.clockIn)}</Text>
                {entry.isApproved ? (
                  <View style={styles.approvedBadge}>
                    <Text style={styles.approvedText}>Approved</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>
              <View style={styles.entryTimes}>
                <Text style={styles.entryTime}>In: {formatTime(entry.clockIn)}</Text>
                <Text style={styles.entryTime}>
                  Out: {entry.clockOut ? formatTime(entry.clockOut) : '—'}
                </Text>
                {entry.durationMinutes != null && (
                  <Text style={styles.entryDuration}>
                    {formatDuration(entry.durationMinutes)}
                  </Text>
                )}
              </View>
              {entry.buildingName && (
                <Text style={styles.entryBuilding}>{entry.buildingName}</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockHeader: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  clockTime: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  clockDate: {
    fontSize: 16,
    color: '#dbeafe',
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusBadgeOff: {
    backgroundColor: '#f3f4f6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusDotOff: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  statusTextOff: {
    color: '#6b7280',
  },
  elapsedLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  elapsedTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1f2937',
    fontVariant: ['tabular-nums'],
  },
  clockedSince: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
  },
  clockButton: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  clockInButton: {
    backgroundColor: '#2563eb',
    marginTop: 24,
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  locationInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  lateStartToggle: {
    marginTop: 12,
    paddingVertical: 6,
  },
  lateStartToggleText: {
    fontSize: 13,
    color: '#2563eb',
    textAlign: 'center',
  },
  lateStartRow: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
  },
  lateStartLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  lateStartInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: 2,
    textAlign: 'center',
  },
  lateStartHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  approvedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  approvedText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  entryTimes: {
    flexDirection: 'row',
    gap: 16,
  },
  entryTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  entryDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
    marginLeft: 'auto',
  },
  entryBuilding: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
  },
});
