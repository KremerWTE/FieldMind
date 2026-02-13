import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import apiService from '../services/api.service';
import uploadService from '../services/upload.service';
import offlineService from '../services/offline.service';

/**
 * QuickCaptureScreen - Optimized for field workers
 *
 * Features:
 * - One-tap camera access
 * - Auto-GPS tagging
 * - Quick folder selection
 * - Pre-defined tag buttons
 * - Batch upload queue
 * - Offline support
 */

interface Photo {
  uri: string;
  id: string;
  tags: string[];
  notes: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
}

export default function QuickCaptureScreen({ navigation, route }: any) {
  const { project, building } = route.params || {};

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  // Common tags for quick selection
  const commonTags = [
    'Roof', 'Exterior', 'Interior', 'Damage',
    'Water', 'Foundation', 'HVAC', 'Electrical',
    'Plumbing', 'Windows', 'Doors', 'Walls',
    'Ceiling', 'Floor', 'Before', 'After'
  ];

  useEffect(() => {
    (async () => {
      // Request camera permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

      setHasPermission(cameraStatus === 'granted' && libraryStatus === 'granted');

      // Get current location
      if (locationStatus === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }

      // Load folders for this project
      loadFolders();
    })();
  }, []);

  const loadFolders = async () => {
    if (!project?.id) return;

    try {
      const foldersData = await apiService.getFolders(project.id);
      setFolders(foldersData || []);
    } catch (error) {
      console.error('Failed to load folders:', error);
      // Use empty array if API fails
      setFolders([]);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8, // Good quality but smaller file size for mobile upload
        exif: true, // Include GPS data if available
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: Photo = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
          tags: [],
          notes: '',
          location: currentLocation,
          timestamp: new Date(),
        };
        setPhotos([newPhoto, ...photos]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          id: Date.now().toString() + Math.random(),
          tags: [],
          notes: '',
          location: currentLocation,
          timestamp: new Date(),
        }));
        setPhotos([...newPhotos, ...photos]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const toggleTag = (photoId: string, tag: string) => {
    setPhotos(photos.map(photo => {
      if (photo.id === photoId) {
        const tags = photo.tags.includes(tag)
          ? photo.tags.filter(t => t !== tag)
          : [...photo.tags, tag];
        return { ...photo, tags };
      }
      return photo;
    }));
  };

  const updateNotes = (photoId: string, notes: string) => {
    setPhotos(photos.map(photo =>
      photo.id === photoId ? { ...photo, notes } : photo
    ));
  };

  const removePhoto = (photoId: string) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  const uploadAllPhotos = async () => {
    if (!selectedFolder) {
      Alert.alert('Select Folder', 'Please select a folder first');
      return;
    }

    if (photos.length === 0) {
      Alert.alert('No Photos', 'Take some photos first');
      return;
    }

    if (!building?.id || !project?.id) {
      Alert.alert('Error', 'Building and project information is missing');
      return;
    }

    setIsUploading(true);

    try {
      // Check if online
      const isOnline = await offlineService.checkNetworkStatus();

      let successCount = 0;
      let queuedCount = 0;

      for (const photo of photos) {
        const uploadData = {
          uri: photo.uri,
          buildingId: building.id,
          projectId: project.id,
          folderId: selectedFolder.id,
          tags: photo.tags,
          notes: photo.notes,
          geoLat: photo.location?.lat,
          geoLng: photo.location?.lng,
          capturedAt: photo.timestamp
        };

        if (isOnline) {
          try {
            // Try to upload immediately
            await uploadService.uploadPhoto(uploadData);
            successCount++;
          } catch (error) {
            // If upload fails, queue for later
            console.error('Upload failed, queueing:', error);
            await offlineService.addToQueue(uploadData);
            queuedCount++;
          }
        } else {
          // Offline - add to queue
          await offlineService.addToQueue(uploadData);
          queuedCount++;
        }
      }

      const message = isOnline
        ? `${successCount} photo(s) uploaded successfully! ${queuedCount > 0 ? `${queuedCount} queued for retry.` : ''} AI analysis will begin shortly.`
        : `${queuedCount} photo(s) queued. Will upload when connection is restored.`;

      Alert.alert('Success!', message, [
        {
          text: 'OK',
          onPress: () => {
            setPhotos([]);
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to process photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const createNewFolder = () => {
    Alert.prompt(
      'New Folder',
      'Enter folder name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (folderName) => {
            if (folderName && project?.id) {
              try {
                const newFolder = await apiService.createFolder(project.id, folderName);
                setFolders([...folders, newFolder]);
                setSelectedFolder(newFolder);
              } catch (error) {
                console.error('Failed to create folder:', error);
                Alert.alert('Error', 'Failed to create folder. Please try again.');
              }
            }
          }
        }
      ],
      'plain-text'
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera and photo library access required
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Capture</Text>
        <Text style={styles.headerSubtitle}>
          {building?.name || 'Select Building'} • {project?.name || 'Select Project'}
        </Text>
      </View>

      {/* Camera Buttons - Big and easy to tap */}
      <View style={styles.captureButtons}>
        <TouchableOpacity
          style={[styles.bigButton, styles.cameraButton]}
          onPress={takePhoto}
        >
          <Text style={styles.bigButtonIcon}>📷</Text>
          <Text style={styles.bigButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigButton, styles.galleryButton]}
          onPress={pickFromGallery}
        >
          <Text style={styles.bigButtonIcon}>🖼️</Text>
          <Text style={styles.bigButtonText}>Choose Photos</Text>
        </TouchableOpacity>
      </View>

      {/* Folder Selection */}
      <View style={styles.folderSection}>
        <Text style={styles.sectionTitle}>Save to Folder:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {folders.map(folder => (
            <TouchableOpacity
              key={folder.id}
              style={[
                styles.folderChip,
                selectedFolder?.id === folder.id && styles.folderChipSelected
              ]}
              onPress={() => setSelectedFolder(folder)}
            >
              <Text style={[
                styles.folderChipText,
                selectedFolder?.id === folder.id && styles.folderChipTextSelected
              ]}>
                📁 {folder.name}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.folderChip, styles.newFolderChip]}
            onPress={createNewFolder}
          >
            <Text style={styles.folderChipText}>➕ New Folder</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Photo Queue */}
      <View style={styles.photoQueueHeader}>
        <Text style={styles.sectionTitle}>
          Photos Ready ({photos.length})
        </Text>
        {photos.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setPhotos([])}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.photoQueue}>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              📸 No photos yet. Tap "Take Photo" to start!
            </Text>
          </View>
        ) : (
          photos.map(photo => (
            <View key={photo.id} style={styles.photoCard}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />

              <View style={styles.photoDetails}>
                {/* Quick Tags */}
                <Text style={styles.photoLabel}>Quick Tags:</Text>
                <View style={styles.tagGrid}>
                  {commonTags.slice(0, 8).map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagButton,
                        photo.tags.includes(tag) && styles.tagButtonSelected
                      ]}
                      onPress={() => toggleTag(photo.id, tag)}
                    >
                      <Text style={[
                        styles.tagButtonText,
                        photo.tags.includes(tag) && styles.tagButtonTextSelected
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (optional)..."
                  placeholderTextColor="#999"
                  value={photo.notes}
                  onChangeText={(text) => updateNotes(photo.id, text)}
                  multiline
                />

                {/* Location indicator */}
                {photo.location && (
                  <Text style={styles.locationText}>
                    📍 GPS: {photo.location.lat.toFixed(4)}, {photo.location.lng.toFixed(4)}
                  </Text>
                )}

                {/* Remove button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(photo.id)}
                >
                  <Text style={styles.removeButtonText}>🗑️ Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Upload Button - Fixed at bottom */}
      {photos.length > 0 && (
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={uploadAllPhotos}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadButtonText}>
                  Uploading {photos.length} photo(s)...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.uploadButtonIcon}>☁️</Text>
                <Text style={styles.uploadButtonText}>
                  Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.uploadHint}>
            Photos will be uploaded and analyzed by AI automatically
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 4,
  },
  captureButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  bigButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraButton: {
    backgroundColor: '#10b981',
  },
  galleryButton: {
    backgroundColor: '#3b82f6',
  },
  bigButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  bigButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  folderSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  folderChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  folderChipSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  folderChipText: {
    fontSize: 14,
    color: '#333',
  },
  folderChipTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  newFolderChip: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  photoQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  photoQueue: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  photoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  photoDetails: {
    padding: 12,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  tagButtonText: {
    fontSize: 12,
    color: '#4b5563',
  },
  tagButtonTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#10b981',
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#ef4444',
  },
  uploadSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  uploadButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  uploadButtonIcon: {
    fontSize: 24,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
});
