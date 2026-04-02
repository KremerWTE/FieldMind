import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Config from '../config';

interface ErrorReport {
  type: string;
  message: string;
  stack?: string;
  severity: string;
  platform: string;
  sessionId?: string;
  userId?: string;
  deviceInfo?: any;
  occurredAt?: string;
}

interface PerformanceMetric {
  platform: string;
  metricType: string;
  name: string;
  durationMs: number;
  metadata?: any;
  measuredAt: string;
}

class MobileMonitoringService {
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private sessionId: string = '';
  private userId: string | null = null;
  private isOnline: boolean = true;
  private flushInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  private readonly STORAGE_KEY = '@monitoring_queue';
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds

  async init() {
    if (this.initialized) return;

    this.sessionId = await this.generateSessionId();
    await this.loadQueueFromStorage();
    this.setupErrorHandlers();
    this.setupNetworkListener();
    this.startAutoFlush();
    this.initialized = true;

    console.log('[Monitoring] Service initialized');
  }

  private async generateSessionId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  public setUserId(userId: string | null) {
    this.userId = userId;
  }

  private setupErrorHandlers() {
    // Global error handler for uncaught errors
    const defaultHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.captureError({
        type: isFatal ? 'fatal' : 'javascript',
        message: error.message,
        stack: error.stack,
        severity: isFatal ? 'fatal' : 'error',
        platform: Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android',
        deviceInfo: this.getDeviceInfo()
      });

      // If fatal, flush immediately before crash
      if (isFatal) {
        this.flush(true);
      }

      // Call the default handler
      if (defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });

    // Promise rejection handler
    const defaultRejectionHandler = (global as any).HermesInternal?.enablePromiseRejectionTracker;
    if (defaultRejectionHandler) {
      global.Promise = class extends Promise<any> {
        static rejectionTracking(rejection: any) {
          mobileMonitoring.captureError({
            type: 'promise',
            message: rejection.reason?.message || String(rejection.reason),
            stack: rejection.reason?.stack,
            severity: 'error',
            platform: Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android'
          });
        }
      };
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came back online, flush the queue
      if (wasOffline && this.isOnline) {
        console.log('[Monitoring] Back online, flushing queue');
        this.flush();
      }
    });
  }

  private getDeviceInfo() {
    return {
      brand: Device.brand,
      model: Device.modelName,
      os: Device.osName,
      osVersion: Device.osVersion,
      platform: Platform.OS,
      isDevice: Device.isDevice,
      manufacturer: Device.manufacturer
    };
  }

  public captureError(error: Partial<ErrorReport>) {
    const fullError: ErrorReport = {
      type: error.type || 'unknown',
      message: error.message || 'Unknown error',
      stack: error.stack,
      severity: error.severity || 'error',
      platform: error.platform || (Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android'),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      deviceInfo: error.deviceInfo || this.getDeviceInfo(),
      occurredAt: new Date().toISOString()
    };

    this.errorQueue.push(fullError);

    // Save to storage
    this.saveQueueToStorage();

    // Flush immediately if critical or queue is large
    if (error.severity === 'fatal' || error.severity === 'critical' || this.errorQueue.length >= 50) {
      this.flush(error.severity === 'fatal');
    }
  }

  public capturePerformance(metric: Omit<PerformanceMetric, 'platform' | 'measuredAt'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      platform: Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android',
      measuredAt: new Date().toISOString(),
      metadata: {
        ...metric.metadata,
        sessionId: this.sessionId,
        userId: this.userId
      }
    };

    this.performanceQueue.push(fullMetric);

    if (this.performanceQueue.length >= 50) {
      this.flush();
    }
  }

  private async saveQueueToStorage() {
    try {
      const data = {
        errors: this.errorQueue.slice(-this.MAX_QUEUE_SIZE),
        performance: this.performanceQueue.slice(-this.MAX_QUEUE_SIZE)
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[Monitoring] Failed to save queue to storage:', error);
    }
  }

  private async loadQueueFromStorage() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.errorQueue = parsed.errors || [];
        this.performanceQueue = parsed.performance || [];
        console.log(`[Monitoring] Loaded ${this.errorQueue.length} errors and ${this.performanceQueue.length} metrics from storage`);
      }
    } catch (error) {
      console.error('[Monitoring] Failed to load queue from storage:', error);
    }
  }

  private async flush(immediate = false) {
    // Don't flush if offline, unless it's a fatal error
    if (!this.isOnline && !immediate) {
      console.log('[Monitoring] Offline, skipping flush');
      return;
    }

    const errorsToSend = [...this.errorQueue];
    const metricsToSend = [...this.performanceQueue];

    if (errorsToSend.length === 0 && metricsToSend.length === 0) {
      return;
    }

    // Clear queues immediately
    this.errorQueue = [];
    this.performanceQueue = [];
    await this.saveQueueToStorage();

    const token = await SecureStore.getItemAsync('accessToken').catch(() => null);
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Monitoring-Key': Config.MONITORING_KEY || '',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      // Send errors
      if (errorsToSend.length > 0) {
        await fetch(`${Config.API_URL}/monitoring/errors/batch`, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({ errors: errorsToSend }),
        });
        console.log(`[Monitoring] Sent ${errorsToSend.length} errors`);
      }

      // Send performance metrics
      if (metricsToSend.length > 0) {
        await fetch(`${Config.API_URL}/monitoring/performance`, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({ metrics: metricsToSend }),
        });
        console.log(`[Monitoring] Sent ${metricsToSend.length} performance metrics`);
      }
    } catch (error) {
      console.error('[Monitoring] Failed to flush:', error);
      // Re-queue on failure
      this.errorQueue.push(...errorsToSend);
      this.performanceQueue.push(...metricsToSend);
      await this.saveQueueToStorage();
    }
  }

  private startAutoFlush() {
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(true);
  }
}

export const mobileMonitoring = new MobileMonitoringService();
