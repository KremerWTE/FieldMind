import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_WIDTH - 4) / 3;

interface Photo {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  capturedAt?: string;
  notes?: string;
  aiAnalysisStatus?: string;
}

export default function PhotosScreen({ route, navigation }: any) {
  const { buildingId, projectId, title } = route?.params ?? {};
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Photo | null>(null);

  useEffect(() => {
    if (title) navigation.setOptions({ title });
    load();
  }, [buildingId, projectId]);

  const authHeader = async (): Promise<Record<string, string>> => {
    const token = await SecureStore.getItemAsync('accessToken');
    return { Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    try {
      const h = await authHeader();
      const params = new URLSearchParams({ limit: '200' });
      if (projectId) params.set('projectId', projectId);

      const endpoint = buildingId
        ? `${API_URL}/buildings/${buildingId}/photos?${params}`
        : `${API_URL}/photos?${params}`;

      const res = await fetch(endpoint, { headers: h });
      if (res.ok) {
        const data = await res.json();
        const items: Photo[] = Array.isArray(data)
          ? data
          : data.photos ?? data.items ?? [];
        setPhotos(items);
      }
    } catch {
      // offline — show empty
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No photos yet.</Text>
        <Text style={styles.emptyHint}>Use Quick Capture or Upload to add photos.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.8}>
            <Image
              source={{ uri: item.thumbnailUrl ?? item.url }}
              style={styles.thumb}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.grid}
      />

      {/* Fullscreen viewer */}
      <Modal visible={!!selected} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {selected && (
            <>
              <Image
                source={{ uri: selected.url }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              {(selected.notes || selected.capturedAt) && (
                <View style={styles.caption}>
                  {selected.capturedAt && (
                    <Text style={styles.captionDate}>{formatDate(selected.capturedAt)}</Text>
                  )}
                  {selected.notes && (
                    <Text style={styles.captionNotes}>{selected.notes}</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', padding: 24 },
  emptyText: { fontSize: 18, color: '#374151', fontWeight: '600', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  grid: { gap: 2 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 1 },
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, maxHeight: '80%' },
  caption: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 12,
  },
  captionDate: { color: '#d1d5db', fontSize: 12, marginBottom: 4 },
  captionNotes: { color: '#fff', fontSize: 14 },
});
