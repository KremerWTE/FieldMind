import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import uploadService, { PhotoUploadData } from './upload.service';

/**
 * Offline Queue Service - Manages photo upload queue when offline
 *
 * Features:
 * - Persistent queue storage
 * - Auto-retry when connection restored
 * - Queue management (add, remove, clear)
 * - Network status monitoring
 */

const QUEUE_STORAGE_KEY = '@fieldmind_upload_queue';
const MAX_RETRY_ATTEMPTS = 3;

export interface QueuedUpload extends PhotoUploadData {
  id: string;
  addedAt: Date;
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
}

class OfflineService {
  private queue: QueuedUpload[] = [];
  private isProcessing: boolean = false;
  private isOnline: boolean = true;
  private listeners: Set<(queue: QueuedUpload[]) => void> = new Set();

  constructor() {
    this.init();
  }

  /**
   * Initialize service
   */
  private async init() {
    // Load queue from storage
    await this.loadQueue();

    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Connection restored - process queue
      if (wasOffline && this.isOnline && this.queue.length > 0) {
        console.log('Connection restored, processing queue...');
        this.processQueue();
      }
    });

    // Process queue on startup if online
    if (this.isOnline && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(callback: (queue: QueuedUpload[]) => void) {
    this.listeners.add(callback);
    callback(this.queue); // Send current state immediately
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of queue update
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.queue]));
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueue() {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson, (key, value) => {
          // Convert date strings back to Date objects
          if (key === 'addedAt' || key === 'lastAttemptAt' || key === 'capturedAt') {
            return value ? new Date(value) : undefined;
          }
          return value;
        });
        console.log(`Loaded ${this.queue.length} items from offline queue`);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  /**
   * Add photo to upload queue
   */
  async addToQueue(photo: PhotoUploadData): Promise<string> {
    const queuedUpload: QueuedUpload = {
      ...photo,
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date(),
      attempts: 0,
    };

    this.queue.push(queuedUpload);
    await this.saveQueue();
    this.notifyListeners();

    // Try to process immediately if online
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return queuedUpload.id;
  }

  /**
   * Add multiple photos to queue
   */
  async addMultipleToQueue(photos: PhotoUploadData[]): Promise<string[]> {
    const ids: string[] = [];

    for (const photo of photos) {
      const id = await this.addToQueue(photo);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Remove item from queue
   */
  async removeFromQueue(id: string) {
    this.queue = this.queue.filter(item => item.id !== id);
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Clear entire queue
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedUpload[] {
    return [...this.queue];
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      total: this.queue.length,
      failed: this.queue.filter(item => item.attempts >= MAX_RETRY_ATTEMPTS).length,
      pending: this.queue.filter(item => item.attempts < MAX_RETRY_ATTEMPTS).length,
      oldestItem: this.queue.length > 0
        ? this.queue.reduce((oldest, item) =>
            item.addedAt < oldest.addedAt ? item : oldest
          ).addedAt
        : null,
    };
  }

  /**
   * Process upload queue
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue already processing');
      return;
    }

    if (!this.isOnline) {
      console.log('Offline - queue processing delayed');
      return;
    }

    if (this.queue.length === 0) {
      console.log('Queue is empty');
      return;
    }

    this.isProcessing = true;
    console.log(`Processing queue: ${this.queue.length} items`);

    // Process items one at a time
    while (this.queue.length > 0 && this.isOnline) {
      const item = this.queue[0];

      // Skip items that have exceeded retry limit
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        console.log(`Skipping item ${item.id} - max retries exceeded`);
        // Move to end of queue so we don't get stuck
        this.queue.shift();
        this.queue.push(item);
        await this.saveQueue();
        this.notifyListeners();
        continue;
      }

      try {
        console.log(`Uploading item ${item.id} (attempt ${item.attempts + 1})`);

        // Update attempt count
        item.attempts++;
        item.lastAttemptAt = new Date();
        await this.saveQueue();
        this.notifyListeners();

        // Attempt upload
        await uploadService.uploadPhoto({
          uri: item.uri,
          buildingId: item.buildingId,
          projectId: item.projectId,
          folderId: item.folderId,
          tags: item.tags,
          notes: item.notes,
          geoLat: item.geoLat,
          geoLng: item.geoLng,
          capturedAt: item.capturedAt,
        });

        // Success - remove from queue
        console.log(`Successfully uploaded item ${item.id}`);
        this.queue.shift();
        await this.saveQueue();
        this.notifyListeners();
      } catch (error) {
        console.error(`Failed to upload item ${item.id}:`, error);

        // Update error message
        item.error = error instanceof Error ? error.message : 'Upload failed';
        await this.saveQueue();
        this.notifyListeners();

        // If max retries reached, move to end and continue
        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          this.queue.shift();
          this.queue.push(item);
          await this.saveQueue();
          this.notifyListeners();
          continue;
        }

        // If network error, stop processing
        if (this.isNetworkError(error)) {
          console.log('Network error detected - stopping queue processing');
          break;
        }

        // Otherwise, move to end and try next item
        this.queue.shift();
        this.queue.push(item);
        await this.saveQueue();
        this.notifyListeners();
      }

      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
    console.log('Queue processing complete');
  }

  /**
   * Retry failed upload
   */
  async retryItem(id: string) {
    const item = this.queue.find(item => item.id === id);
    if (!item) {
      throw new Error('Item not found in queue');
    }

    // Reset attempts
    item.attempts = 0;
    item.error = undefined;
    await this.saveQueue();
    this.notifyListeners();

    // Process queue
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Retry all failed items
   */
  async retryAll() {
    this.queue.forEach(item => {
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        item.attempts = 0;
        item.error = undefined;
      }
    });

    await this.saveQueue();
    this.notifyListeners();

    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const networkErrors = [
      'Network request failed',
      'timeout',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return networkErrors.some(msg => errorMessage.includes(msg.toLowerCase()));
  }

  /**
   * Get network status
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Force network check
   */
  async checkNetworkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }
}

export default new OfflineService();
