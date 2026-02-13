import * as FileSystem from 'expo-file-system';
import apiService from './api.service';

/**
 * Upload Service - Handles photo uploads to S3
 *
 * Features:
 * - Presigned URL upload to S3
 * - Progress tracking
 * - Retry logic
 * - Queue management
 */

export interface UploadProgress {
  photoId: string;
  uri: string;
  progress: number; // 0-100
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'failed';
  error?: string;
}

export interface PhotoUploadData {
  uri: string;
  buildingId: string;
  projectId: string;
  folderId?: string;
  tags?: string[];
  notes?: string;
  geoLat?: number;
  geoLng?: number;
  capturedAt?: Date;
}

class UploadService {
  private uploadQueue: Map<string, UploadProgress> = new Map();
  private listeners: Set<(progress: UploadProgress[]) => void> = new Set();

  /**
   * Subscribe to upload progress updates
   */
  subscribe(callback: (progress: UploadProgress[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current upload queue status
   */
  getQueue(): UploadProgress[] {
    return Array.from(this.uploadQueue.values());
  }

  /**
   * Notify all listeners of queue update
   */
  private notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach(listener => listener(queue));
  }

  /**
   * Upload a single photo
   */
  async uploadPhoto(data: PhotoUploadData): Promise<string> {
    const photoId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to queue
    this.uploadQueue.set(photoId, {
      photoId,
      uri: data.uri,
      progress: 0,
      status: 'queued',
    });
    this.notifyListeners();

    try {
      // Step 1: Get presigned upload URL
      const filename = this.getFilenameFromUri(data.uri);
      const contentType = this.getContentType(filename);

      const presignedData = await apiService.getPresignedUploadUrl({
        buildingId: data.buildingId,
        projectId: data.projectId,
        folderId: data.folderId,
        filename,
        contentType,
      });

      const { uploadUrl, key, photoId: realPhotoId } = presignedData;

      // Update with real photo ID
      const queueItem = this.uploadQueue.get(photoId)!;
      this.uploadQueue.delete(photoId);
      this.uploadQueue.set(realPhotoId, {
        ...queueItem,
        photoId: realPhotoId,
        status: 'uploading',
        progress: 10,
      });
      this.notifyListeners();

      // Step 2: Upload file to S3
      await this.uploadToS3(data.uri, uploadUrl, realPhotoId);

      // Update progress
      this.uploadQueue.set(realPhotoId, {
        photoId: realPhotoId,
        uri: data.uri,
        progress: 80,
        status: 'processing',
      });
      this.notifyListeners();

      // Step 3: Complete upload and trigger AI analysis
      await apiService.completeUpload({
        photoId: realPhotoId,
        geoLat: data.geoLat,
        geoLng: data.geoLng,
        capturedAt: data.capturedAt?.toISOString(),
        exifJson: {
          tags: data.tags || [],
          notes: data.notes || '',
        },
      });

      // Mark as complete
      this.uploadQueue.set(realPhotoId, {
        photoId: realPhotoId,
        uri: data.uri,
        progress: 100,
        status: 'complete',
      });
      this.notifyListeners();

      // Remove from queue after 2 seconds
      setTimeout(() => {
        this.uploadQueue.delete(realPhotoId);
        this.notifyListeners();
      }, 2000);

      return realPhotoId;
    } catch (error) {
      console.error('Upload failed:', error);

      // Mark as failed
      this.uploadQueue.set(photoId, {
        photoId,
        uri: data.uri,
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      this.notifyListeners();

      throw error;
    }
  }

  /**
   * Upload file to S3 using presigned URL
   */
  private async uploadToS3(
    fileUri: string,
    uploadUrl: string,
    photoId: string
  ): Promise<void> {
    try {
      // Read file as base64
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      // Upload using FileSystem.uploadAsync for progress tracking
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': this.getContentType(fileUri),
        },
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 204) {
        throw new Error(`S3 upload failed with status ${uploadResult.status}`);
      }
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple photos in batch
   */
  async uploadPhotos(photos: PhotoUploadData[]): Promise<{
    successful: string[];
    failed: { uri: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { uri: string; error: string }[] = [];

    for (const photo of photos) {
      try {
        const photoId = await this.uploadPhoto(photo);
        successful.push(photoId);
      } catch (error) {
        failed.push({
          uri: photo.uri,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Retry failed upload
   */
  async retryUpload(photoId: string, data: PhotoUploadData): Promise<string> {
    // Remove from queue first
    this.uploadQueue.delete(photoId);
    this.notifyListeners();

    // Upload again
    return this.uploadPhoto(data);
  }

  /**
   * Clear all completed/failed from queue
   */
  clearQueue() {
    const activeStatuses = new Set(['queued', 'uploading', 'processing']);
    Array.from(this.uploadQueue.entries()).forEach(([id, item]) => {
      if (!activeStatuses.has(item.status)) {
        this.uploadQueue.delete(id);
      }
    });
    this.notifyListeners();
  }

  /**
   * Get filename from URI
   */
  private getFilenameFromUri(uri: string): string {
    const parts = uri.split('/');
    let filename = parts[parts.length - 1];

    // Remove query params
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }

    // Ensure .jpg extension
    if (!filename.match(/\.(jpg|jpeg|png)$/i)) {
      filename += '.jpg';
    }

    return filename;
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'heic':
        return 'image/heic';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Calculate file size
   */
  async getFileSize(uri: string): Promise<number> {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.size || 0 : 0;
  }

  /**
   * Validate file size (max 10MB)
   */
  async validateFileSize(uri: string, maxSizeMB: number = 10): Promise<boolean> {
    const size = await this.getFileSize(uri);
    const maxBytes = maxSizeMB * 1024 * 1024;
    return size <= maxBytes;
  }
}

export default new UploadService();
