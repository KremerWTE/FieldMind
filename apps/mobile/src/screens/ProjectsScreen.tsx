import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface Project {
  id: string;
  name: string;
  status: string;
  buildingId: string;
  buildingName?: string;
  photoCount?: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#d1fae5', text: '#065f46' },
  completed: { bg: '#dbeafe', text: '#1e40af' },
  on_hold:   { bg: '#fef3c7', text: '#92400e' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export default function ProjectsScreen({ navigation }: any) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const authHeader = async (): Promise<Record<string, string>> => {
    const token = await SecureStore.getItemAsync('accessToken');
    return { Authorization: `Bearer ${token}` };
  };

  const load = useCallback(async () => {
    try {
      const h = await authHeader();
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`${API_URL}/projects?${params}`, { headers: h });
      if (res.ok) {
        const data = await res.json();
        const items: Project[] = (Array.isArray(data) ? data : data.items ?? data.projects ?? []).map(
          (p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status ?? 'active',
            buildingId: p.buildingId,
            buildingName: p.building?.name ?? p.buildingName,
            photoCount: p.photoCount,
          })
        );
        setProjects(items);
        setFiltered(items);
      }
    } catch {
      // offline — keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.buildingName ?? '').toLowerCase().includes(q)
          )
        : projects
    );
  }, [search, projects]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const s = STATUS_COLORS[status.toLowerCase()] ?? { bg: '#f3f4f6', text: '#374151' };
    const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{label}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search projects…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'active',    label: 'Active' },
          { key: 'completed', label: 'Done' },
          { key: '',          label: 'All' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key || 'all'}
            style={[styles.chip, statusFilter === key && styles.chipActive]}
            onPress={() => setStatusFilter(key)}
          >
            <Text style={[styles.chipText, statusFilter === key && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {search ? 'No projects match your search.' : 'No projects found.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.projectName} numberOfLines={2}>{item.name}</Text>
              <StatusBadge status={item.status} />
            </View>

            {item.buildingName && (
              <Text style={styles.building}>🏢 {item.buildingName}</Text>
            )}

            {item.photoCount !== undefined && (
              <Text style={styles.photoCount}>
                📷 {item.photoCount} photo{item.photoCount !== 1 ? 's' : ''}
              </Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() =>
                  navigation.navigate('Photos', {
                    buildingId: item.buildingId,
                    projectId: item.id,
                    title: item.name,
                  })
                }
              >
                <Text style={styles.btnPrimaryText}>📷 View Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'Upload',
                    params: { buildingId: item.buildingId, projectId: item.id },
                  })
                }
              >
                <Text style={styles.btnSecondaryText}>☁️ Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyContainer: { flexGrow: 1 },
  list: { padding: 12 },
  searchRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  search: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  building: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  photoCount: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  btnPrimary: { flex: 1, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  btnSecondary: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  btnSecondaryText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 16, color: '#9ca3af', textAlign: 'center' },
});
