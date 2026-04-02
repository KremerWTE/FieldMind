import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface UploadItem {
  uri: string;
  fileName: string;
  type: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadScreen({ route }: any) {
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState(route?.params?.buildingId ?? '');
  const [selectedProject, setSelectedProject] = useState(route?.params?.projectId ?? '');
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMeta();
  }, []);

  // Update selection if navigation params change (e.g. navigated from JobSiteSelectScreen)
  useEffect(() => {
    if (route?.params?.buildingId) setSelectedBuilding(route.params.buildingId);
    if (route?.params?.projectId) setSelectedProject(route.params.projectId);
  }, [route?.params?.buildingId, route?.params?.projectId]);

  const authHeaders = async (json = false): Promise<Record<string, string>> => {
    const token = await SecureStore.getItemAsync('accessToken');
    return {
      Authorization: `Bearer ${token}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  };

  const loadMeta = async () => {
    try {
      const h = await authHeaders();
      const [bRes, pRes] = await Promise.all([
        fetch(`${API_URL}/buildings?limit=100`, { headers: h }),
        fetch(`${API_URL}/projects`, { headers: h }),
      ]);
      if (bRes.ok) {
        const d = await bRes.json();
        setBuildings(Array.isArray(d) ? d : d.buildings ?? []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setProjects(Array.isArray(d) ? d : d.projects ?? []);
      }
    } catch {
      // offline — show empty lists
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.92,
    });
    if (!result.canceled) {
      const items: UploadItem[] = result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName ?? `photo_${Date.now()}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
        status: 'pending',
      }));
      setQueue((prev) => [...prev, ...items]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.92 });
    if (!result.canceled) {
      const a = result.assets[0];
      setQueue((prev) => [
        ...prev,
        {
          uri: a.uri,
          fileName: a.fileName ?? `capture_${Date.now()}.jpg`,
          type: a.mimeType ?? 'image/jpeg',
          status: 'pending',
        },
      ]);
    }
  };

  const removeItem = (uri: string) => {
    setQueue((prev) => prev.filter((i) => i.uri !== uri));
  };

  const uploadAll = async () => {
    if (!selectedBuilding) {
      Alert.alert('Select a building', 'Please choose a building before uploading.');
      return;
    }
    if (queue.filter((i) => i.status === 'pending').length === 0) return;
    setUploading(true);

    for (let idx = 0; idx < queue.length; idx++) {
      const item = queue[idx];
      if (item.status !== 'pending') continue;

      setQueue((prev) =>
        prev.map((i) => (i.uri === item.uri ? { ...i, status: 'uploading' } : i))
      );

      try {
        const h = await authHeaders(true);

        // Step 1: presign
        const presignRes = await fetch(`${API_URL}/photos/presign-upload`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            buildingId: selectedBuilding,
            projectId: selectedProject || undefined,
            filename: item.fileName,
            contentType: item.type,
          }),
        });
        if (!presignRes.ok) throw new Error('Presign failed');
        const { uploadUrl, photoId } = await presignRes.json();

        // Step 2: PUT to S3
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.type },
          body: { uri: item.uri } as any,
        });
        if (!putRes.ok) throw new Error('S3 upload failed');

        // Step 3: complete
        const completeH = await authHeaders(true);
        await fetch(`${API_URL}/photos/complete-upload`, {
          method: 'POST',
          headers: completeH,
          body: JSON.stringify({ photoId, capturedAt: new Date().toISOString() }),
        });

        setQueue((prev) =>
          prev.map((i) => (i.uri === item.uri ? { ...i, status: 'done' } : i))
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((i) =>
            i.uri === item.uri
              ? { ...i, status: 'error', error: err?.message ?? 'Upload failed' }
              : i
          )
        );
      }
    }
    setUploading(false);
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const doneCount = queue.filter((i) => i.status === 'done').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;

  const Selector = ({
    label,
    value,
    items,
    onSelect,
  }: {
    label: string;
    value: string;
    items: { id: string; name: string }[];
    onSelect: (id: string) => void;
  }) => (
    <View style={styles.selectorRow}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, value === '' && styles.chipSelected]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.chipText, value === '' && styles.chipTextSelected]}>None</Text>
        </TouchableOpacity>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, value === item.id && styles.chipSelected]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.chipText, value === item.id && styles.chipTextSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Photos</Text>

      {/* Building / Project selectors */}
      <View style={styles.metaSection}>
        <Selector
          label="Building *"
          value={selectedBuilding}
          items={buildings}
          onSelect={setSelectedBuilding}
        />
        <Selector
          label="Project"
          value={selectedProject}
          items={projects}
          onSelect={setSelectedProject}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={takePhoto}>
          <Text style={styles.buttonText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.libraryButton]} onPress={pickImages}>
          <Text style={styles.buttonText}>🖼 Library</Text>
        </TouchableOpacity>
      </View>

      {/* Queue */}
      {queue.length > 0 && (
        <>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>
              {queue.length} photo{queue.length !== 1 ? 's' : ''} queued
              {doneCount > 0 && ` · ${doneCount} uploaded`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </Text>
            <TouchableOpacity onPress={() => setQueue([])}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={queue}
            keyExtractor={(item) => item.uri}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.queueItem}>
                <View style={styles.queueItemLeft}>
                  <Text style={styles.queueItemName} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  {item.status === 'error' && (
                    <Text style={styles.errorText}>{item.error}</Text>
                  )}
                </View>
                <View style={styles.queueItemRight}>
                  {item.status === 'uploading' ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : item.status === 'done' ? (
                    <Text style={styles.doneText}>✓</Text>
                  ) : item.status === 'error' ? (
                    <Text style={styles.errorIcon}>✗</Text>
                  ) : (
                    <TouchableOpacity onPress={() => removeItem(item.uri)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />

          <TouchableOpacity
            style={[
              styles.uploadButton,
              (uploading || pendingCount === 0) && styles.uploadButtonDisabled,
            ]}
            onPress={uploadAll}
            disabled={uploading || pendingCount === 0}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>
                Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 16 },
  metaSection: { marginBottom: 16, gap: 10 },
  selectorRow: { marginBottom: 6 },
  selectorLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  cameraButton: { backgroundColor: '#16a34a' },
  libraryButton: { backgroundColor: '#2563eb' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  queueTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  clearText: { fontSize: 13, color: '#ef4444' },
  list: { flex: 1, marginBottom: 12 },
  queueItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#e5e7eb',
  },
  queueItemLeft: { flex: 1, marginRight: 8 },
  queueItemName: { fontSize: 13, color: '#111827' },
  queueItemRight: { width: 28, alignItems: 'center' },
  doneText: { fontSize: 16, color: '#16a34a', fontWeight: '700' },
  errorIcon: { fontSize: 16, color: '#ef4444', fontWeight: '700' },
  removeText: { fontSize: 16, color: '#9ca3af' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 2 },
  uploadButton: {
    backgroundColor: '#2563eb', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  uploadButtonDisabled: { backgroundColor: '#93c5fd' },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
