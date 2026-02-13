# Mobile App API Integration Guide 📱↔️🔌

## Overview

The FieldMind mobile app now has **complete backend integration** with three specialized services for API communication, uploads, and offline support.

## Services Architecture

```
┌─────────────────────────────────────────┐
│         Mobile App Screens              │
│  (QuickCapture, JobSiteSelect, etc.)    │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│   API   │  │  Upload  │  │ Offline  │
│ Service │  │ Service  │  │ Service  │
└────┬────┘  └────┬─────┘  └────┬─────┘
     │            │              │
     ▼            ▼              ▼
┌─────────────────────────────────────────┐
│     Backend (.NET 10 API + S3)          │
└─────────────────────────────────────────┘
```

---

## 1. API Service (`api.service.ts`)

### Purpose
Central API client for all backend communication with automatic JWT token management.

### Features
- ✅ **Automatic token refresh** - Handles 401 errors transparently
- ✅ **Secure token storage** - Uses Expo SecureStore
- ✅ **Request/response interceptors** - Adds auth headers automatically
- ✅ **Type-safe API calls** - All endpoints strongly typed
- ✅ **Error handling** - Consistent error responses

### Usage Examples

#### Login
```typescript
import apiService from './services/api.service';

// Login user
const { user, token } = await apiService.login(
  'admin@fieldmind.io',
  'password123'
);

// Token automatically saved and used in subsequent requests
```

#### Get Buildings
```typescript
// Get all buildings
const buildings = await apiService.getBuildings({
  search: 'downtown',
  page: 1,
  pageSize: 20
});

// Get specific building
const building = await apiService.getBuilding('building-id');

// Get building photos
const photos = await apiService.getBuildingPhotos('building-id', {
  folderId: 'folder-id',
  dateFrom: '2025-01-01',
  page: 1
});
```

#### Get Projects
```typescript
// Get all projects
const projects = await apiService.getProjects({
  buildingId: 'building-id',
  status: 'active'
});

// Get project folders
const folders = await apiService.getFolders('project-id');

// Create new folder
const folder = await apiService.createFolder('project-id', 'Storm Damage');
```

#### Search Photos
```typescript
// Full-text search
const results = await apiService.searchPhotos({
  query: 'roof damage',
  buildingId: 'building-id',
  severity: 'high',
  tags: ['roof', 'damage'],
  dateFrom: '2025-01-01'
});

// Get all tags
const tags = await apiService.getTags();

// Get categories
const categories = await apiService.getCategories();
```

### Available Endpoints

**Authentication:**
- `login(email, password)` - Login and get JWT
- `register(data)` - Create new account
- `logout()` - Logout and clear tokens
- `getCurrentUser()` - Get current user info

**Buildings:**
- `getBuildings(params)` - List buildings
- `getBuilding(id)` - Get building details
- `getBuildingPhotos(id, params)` - Get building photos
- `getBuildingMaintenanceEvents(id)` - Get maintenance timeline
- `getBuildingHealthStats(id, params)` - Get health metrics

**Projects:**
- `getProjects(params)` - List projects
- `getProject(id)` - Get project details
- `getFolders(projectId)` - List folders
- `createFolder(projectId, name)` - Create folder

**Photos:**
- `getPresignedUploadUrl(data)` - Get S3 upload URL
- `completeUpload(data)` - Finalize upload & trigger AI
- `getPhoto(id)` - Get photo details
- `updatePhoto(id, data)` - Update photo
- `deletePhoto(id)` - Delete photo
- `addPhotoNote(photoId, content)` - Add note
- `getPhotoTasks(photoId)` - Get tasks
- `createPhotoTask(photoId, data)` - Create task
- `updateTask(taskId, data)` - Update task

**Search:**
- `searchPhotos(params)` - Full-text search
- `getTags()` - Get all tags
- `getCategories()` - Get all categories

**Share Links:**
- `createShareLink(data)` - Create public share link
- `getShareLinks()` - List share links

**Reports:**
- `generateReport(data)` - Generate PDF report
- `getReportStatus(jobId)` - Check report status
- `getReports()` - List all reports

**Features & Company:**
- `getFeatures()` - Get product features
- `getCompanyInfo()` - Get company info
- `getCompanyStats()` - Get company stats
- `getPricing()` - Get pricing plans

---

## 2. Upload Service (`upload.service.ts`)

### Purpose
Handles photo uploads to S3 with progress tracking and error handling.

### Features
- ✅ **Presigned URL upload** - Secure direct-to-S3 upload
- ✅ **Progress tracking** - Real-time upload progress (0-100%)
- ✅ **Retry logic** - Automatic retry on failure
- ✅ **Queue management** - Track multiple uploads
- ✅ **File validation** - Size and type checking

### Upload Flow

```
1. Get presigned upload URL from backend
   ↓
2. Upload file directly to S3 (bypasses backend)
   ↓
3. Complete upload API call (triggers AI analysis)
   ↓
4. Photo processed in background
```

### Usage Examples

#### Single Photo Upload
```typescript
import uploadService from './services/upload.service';

// Upload single photo
const photoId = await uploadService.uploadPhoto({
  uri: 'file:///path/to/photo.jpg',
  buildingId: 'building-id',
  projectId: 'project-id',
  folderId: 'folder-id', // optional
  tags: ['roof', 'damage'],
  notes: 'North corner, severe hail damage',
  geoLat: 41.8781,
  geoLng: -87.6298,
  capturedAt: new Date()
});

console.log('Photo uploaded:', photoId);
```

#### Batch Upload
```typescript
// Upload multiple photos
const photos = [
  { uri: 'photo1.jpg', buildingId: 'b1', projectId: 'p1', ... },
  { uri: 'photo2.jpg', buildingId: 'b1', projectId: 'p1', ... },
  { uri: 'photo3.jpg', buildingId: 'b1', projectId: 'p1', ... }
];

const { successful, failed } = await uploadService.uploadPhotos(photos);

console.log(`Uploaded: ${successful.length}, Failed: ${failed.length}`);
```

#### Track Upload Progress
```typescript
// Subscribe to upload progress
const unsubscribe = uploadService.subscribe((progress) => {
  progress.forEach(item => {
    console.log(`${item.photoId}: ${item.progress}% (${item.status})`);
  });
});

// Upload photo
await uploadService.uploadPhoto({ ... });

// Unsubscribe when done
unsubscribe();
```

#### Validate File Size
```typescript
// Check if file is under 10MB
const isValid = await uploadService.validateFileSize(
  'file:///photo.jpg',
  10 // Max 10MB
);

if (!isValid) {
  alert('Photo too large. Max 10MB.');
}
```

### Progress Statuses

- **queued** - Waiting to upload
- **uploading** - Uploading to S3
- **processing** - Backend processing (AI analysis)
- **complete** - Upload and processing done
- **failed** - Upload failed (check error property)

---

## 3. Offline Service (`offline.service.ts`)

### Purpose
Manages photo upload queue when device is offline with automatic retry.

### Features
- ✅ **Persistent queue** - Survives app restarts
- ✅ **Auto-retry** - Retries when connection restored
- ✅ **Network monitoring** - Detects online/offline status
- ✅ **Max retry limit** - Prevents infinite loops (3 attempts)
- ✅ **Queue statistics** - Track pending/failed uploads

### How It Works

```
1. Device goes offline
   ↓
2. User takes photos
   ↓
3. Photos added to offline queue (saved to AsyncStorage)
   ↓
4. Connection restored (automatic detection)
   ↓
5. Queue automatically processes
   ↓
6. Photos upload one by one
   ↓
7. Queue clears as uploads succeed
```

### Usage Examples

#### Add to Queue
```typescript
import offlineService from './services/offline.service';

// Add single photo to queue
const queueId = await offlineService.addToQueue({
  uri: 'file:///photo.jpg',
  buildingId: 'building-id',
  projectId: 'project-id',
  tags: ['roof'],
  geoLat: 41.8781,
  geoLng: -87.6298
});

// Photo will upload automatically when online
```

#### Add Multiple to Queue
```typescript
// Add batch to queue
const photos = [ /* array of PhotoUploadData */ ];
const queueIds = await offlineService.addMultipleToQueue(photos);

console.log(`Added ${queueIds.length} photos to queue`);
```

#### Monitor Queue
```typescript
// Subscribe to queue updates
const unsubscribe = offlineService.subscribe((queue) => {
  console.log(`Queue: ${queue.length} items`);

  queue.forEach(item => {
    console.log(`${item.id}: ${item.attempts} attempts, ${item.error || 'pending'}`);
  });
});

// Get current queue
const queue = offlineService.getQueue();

// Get queue stats
const stats = offlineService.getStats();
console.log(`Pending: ${stats.pending}, Failed: ${stats.failed}`);
```

#### Manual Control
```typescript
// Manually process queue
await offlineService.processQueue();

// Retry specific item
await offlineService.retryItem('queue-item-id');

// Retry all failed items
await offlineService.retryAll();

// Clear entire queue
await offlineService.clearQueue();

// Remove single item
await offlineService.removeFromQueue('queue-item-id');
```

#### Check Network Status
```typescript
// Get current network status
const isOnline = offlineService.getNetworkStatus();

// Force network check
const status = await offlineService.checkNetworkStatus();
console.log('Online:', status);
```

### Queue Item Properties

```typescript
interface QueuedUpload {
  id: string;                    // Unique queue ID
  uri: string;                   // Local file URI
  buildingId: string;
  projectId: string;
  folderId?: string;
  tags?: string[];
  notes?: string;
  geoLat?: number;
  geoLng?: number;
  capturedAt?: Date;
  addedAt: Date;                 // When added to queue
  attempts: number;              // Retry count (max 3)
  lastAttemptAt?: Date;          // Last retry timestamp
  error?: string;                // Error message if failed
}
```

---

## Integration into Screens

### QuickCaptureScreen Integration

```typescript
import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';
import uploadService from '../services/upload.service';
import offlineService from '../services/offline.service';

export default function QuickCaptureScreen({ route }: any) {
  const { project, building } = route.params;
  const [photos, setPhotos] = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Subscribe to upload progress
    const unsubUpload = uploadService.subscribe(setUploadProgress);

    // Subscribe to offline queue
    const unsubOffline = offlineService.subscribe((queue) => {
      console.log(`Offline queue: ${queue.length} items`);
    });

    // Monitor network status
    const checkOnline = () => {
      setIsOnline(offlineService.getNetworkStatus());
    };
    const interval = setInterval(checkOnline, 5000);

    return () => {
      unsubUpload();
      unsubOffline();
      clearInterval(interval);
    };
  }, []);

  const uploadAllPhotos = async () => {
    for (const photo of photos) {
      try {
        if (isOnline) {
          // Upload immediately
          await uploadService.uploadPhoto({
            uri: photo.uri,
            buildingId: building.id,
            projectId: project.id,
            folderId: selectedFolder?.id,
            tags: photo.tags,
            notes: photo.notes,
            geoLat: photo.location?.lat,
            geoLng: photo.location?.lng,
            capturedAt: photo.timestamp
          });
        } else {
          // Add to offline queue
          await offlineService.addToQueue({
            uri: photo.uri,
            buildingId: building.id,
            projectId: project.id,
            folderId: selectedFolder?.id,
            tags: photo.tags,
            notes: photo.notes,
            geoLat: photo.location?.lat,
            geoLng: photo.location?.lng,
            capturedAt: photo.timestamp
          });
        }
      } catch (error) {
        console.error('Upload failed:', error);
        // Fallback to offline queue
        await offlineService.addToQueue({ /* ... */ });
      }
    }

    Alert.alert(
      'Success!',
      isOnline
        ? 'Photos uploaded successfully'
        : 'Photos queued. Will upload when online.'
    );
  };

  return (
    <View>
      {/* Show network status */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text>📶 Offline - Photos will queue for upload</Text>
        </View>
      )}

      {/* Show upload progress */}
      {uploadProgress.map(item => (
        <View key={item.photoId}>
          <Text>{item.progress}% - {item.status}</Text>
        </View>
      ))}

      {/* Rest of UI... */}
    </View>
  );
}
```

### JobSiteSelectScreen Integration

```typescript
import apiService from '../services/api.service';

export default function JobSiteSelectScreen() {
  const [buildings, setBuildings] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get buildings from API
      const buildingsData = await apiService.getBuildings();
      setBuildings(buildingsData.items);

      // Get projects from API
      const projectsData = await apiService.getProjects({
        status: 'active'
      });
      setProjects(projectsData.items);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback to cached data
    }
  };

  return (/* UI */);
}
```

---

## Environment Configuration

Create `.env` file in `apps/mobile/`:

```env
# API URL
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000

# For Android Emulator, use:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# For iOS Simulator, use:
# EXPO_PUBLIC_API_URL=http://localhost:5000
```

**Note:** Replace `192.168.1.100` with your computer's local IP address.

---

## Testing Guide

### 1. Start Backend API
```bash
cd apps/api
dotnet run
```

### 2. Find Your Local IP
**Windows:**
```bash
ipconfig
# Look for "IPv4 Address"
```

**Mac/Linux:**
```bash
ifconfig
# Look for "inet" under your network adapter
```

### 3. Update Mobile .env
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:5000
```

### 4. Run Mobile App
```bash
cd apps/mobile
npm start
```

### 5. Test Complete Flow

**Login:**
1. Open app
2. Login with: `admin@fieldmind.io` / `password123`
3. Should see buildings list

**Upload Photo:**
1. Select job site
2. Take photo
3. Add tags
4. Upload
5. Check API logs for upload confirmation
6. Check Hangfire dashboard for AI job

**Offline Mode:**
1. Enable airplane mode
2. Take photos and tag
3. Upload → Should queue
4. Disable airplane mode
5. Photos should upload automatically

---

## Troubleshooting

### "Network request failed"
- ✅ Check API is running (`dotnet run`)
- ✅ Check IP address in `.env` is correct
- ✅ Disable firewall temporarily
- ✅ Try different port if 5000 is blocked

### "401 Unauthorized"
- ✅ Re-login to get new token
- ✅ Check token in SecureStore
- ✅ Check API JWT secret is configured

### "Photos not uploading"
- ✅ Check AWS S3 credentials in API
- ✅ Check S3 bucket exists
- ✅ Check CORS configured on bucket
- ✅ Check presigned URL generation

### "Offline queue not processing"
- ✅ Check network status indicator
- ✅ Manually trigger with `offlineService.processQueue()`
- ✅ Check AsyncStorage has queue saved
- ✅ Check max retries not exceeded

---

## Best Practices

### 1. Always Use Services
❌ **Don't**: Make direct axios calls
✅ **Do**: Use apiService methods

### 2. Handle Offline Gracefully
```typescript
try {
  await uploadService.uploadPhoto(data);
} catch (error) {
  // Fallback to offline queue
  await offlineService.addToQueue(data);
  showToast('Queued for upload when online');
}
```

### 3. Show Upload Progress
```typescript
const [uploadProgress, setUploadProgress] = useState([]);

useEffect(() => {
  const unsubscribe = uploadService.subscribe(setUploadProgress);
  return unsubscribe;
}, []);

// Show progress in UI
{uploadProgress.map(item => (
  <ProgressBar key={item.photoId} value={item.progress} />
))}
```

### 4. Cache Data Locally
```typescript
// Cache buildings for offline access
const buildings = await apiService.getBuildings();
await AsyncStorage.setItem('cachedBuildings', JSON.stringify(buildings));

// Use cache if offline
if (!isOnline) {
  const cached = await AsyncStorage.getItem('cachedBuildings');
  setBuildings(JSON.parse(cached));
}
```

---

## Security Notes

- ✅ JWT tokens stored in **Expo SecureStore** (encrypted)
- ✅ Refresh tokens for long sessions
- ✅ Automatic token refresh on 401 errors
- ✅ No passwords stored locally
- ✅ S3 uploads use presigned URLs (time-limited)

---

## Performance Optimization

### 1. Batch Operations
```typescript
// Instead of uploading one-by-one in a loop
for (const photo of photos) {
  await uploadService.uploadPhoto(photo); // Slow
}

// Use batch upload
await uploadService.uploadPhotos(photos); // Fast
```

### 2. Compress Images Before Upload
```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const compressedImage = await ImageManipulator.manipulateAsync(
  photo.uri,
  [{ resize: { width: 1920 } }], // Max width 1920px
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);

await uploadService.uploadPhoto({
  uri: compressedImage.uri,
  // ...
});
```

### 3. Pagination
```typescript
// Don't load all photos at once
const photos = await apiService.getBuildingPhotos(buildingId, {
  page: 1,
  pageSize: 20 // Load 20 at a time
});
```

---

**Mobile app is now fully integrated with the backend! 🎉**

All services work together to provide a seamless online/offline experience.
