interface ErrorReport {
  type: string;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  severity: string;
  platform: string;
  sessionId?: string;
  userId?: string;
  componentStack?: string;
  occurredAt?: string;
}

interface PerformanceMetric {
  type: string;
  name: string;
  duration: number;
  metadata?: Record<string, any>;
}

class MonitoringClient {
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private flushInterval: NodeJS.Timeout | null = null;
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    this.apiKey = process.env.NEXT_PUBLIC_MONITORING_KEY || 'change-this-in-production';

    // Only set up in browser environment
    if (typeof window !== 'undefined') {
      this.setupErrorHandlers();
      this.setupPerformanceObserver();
      this.startAutoFlush();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public setUserId(userId: string | null) {
    this.userId = userId;
  }

  private setupErrorHandlers() {
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        severity: 'error',
        platform: 'web'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        severity: 'error',
        platform: 'web'
      });
    });
  }

  private setupPerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      // LCP - Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lcpEntry = entry as any;
          this.capturePerformance({
            type: 'web_vital',
            name: 'LCP',
            duration: lcpEntry.renderTime || lcpEntry.loadTime
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID - First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any;
          this.capturePerformance({
            type: 'web_vital',
            name: 'FID',
            duration: fidEntry.processingStart - fidEntry.startTime
          });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS - Cumulative Layout Shift (track on visibility change)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as any;
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.capturePerformance({
            type: 'web_vital',
            name: 'CLS',
            duration: clsValue * 1000 // Convert to ms for consistency
          });
        }
      });
    } catch (e) {
      console.warn('Failed to set up performance observers:', e);
    }
  }

  public captureError(error: Partial<ErrorReport>) {
    const fullError: ErrorReport = {
      ...error,
      sessionId: this.sessionId,
      userId: this.userId || undefined,
      occurredAt: new Date().toISOString(),
      platform: 'web',
      type: error.type || 'unknown',
      message: error.message || 'Unknown error',
      severity: error.severity || 'error'
    };

    this.errorQueue.push(fullError);

    // Flush immediately if queue is large or error is critical
    if (this.errorQueue.length >= 50 || error.severity === 'critical' || error.severity === 'fatal') {
      this.flush();
    }
  }

  public capturePerformance(metric: PerformanceMetric) {
    this.performanceQueue.push({
      ...metric,
      metadata: {
        ...metric.metadata,
        sessionId: this.sessionId,
        userId: this.userId
      }
    });

    if (this.performanceQueue.length >= 50) {
      this.flush();
    }
  }

  private async flush() {
    const errorsToSend = [...this.errorQueue];
    const metricsToSend = [...this.performanceQueue];

    this.errorQueue = [];
    this.performanceQueue = [];

    try {
      // Send errors
      if (errorsToSend.length > 0) {
        await fetch(`${this.apiUrl}/monitoring/errors/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Monitoring-Key': this.apiKey
          },
          body: JSON.stringify({ errors: errorsToSend }),
          // Use keepalive to ensure request completes even if page is closing
          keepalive: true
        }).catch(err => {
          console.error('Failed to send error reports:', err);
          // Re-queue on failure
          this.errorQueue.push(...errorsToSend);
        });
      }

      // Send performance metrics
      if (metricsToSend.length > 0) {
        await fetch(`${this.apiUrl}/monitoring/performance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Monitoring-Key': this.apiKey
          },
          body: JSON.stringify({
            metrics: metricsToSend.map(m => ({
              platform: 'web',
              metricType: m.type,
              name: m.name,
              durationMs: m.duration,
              metadata: m.metadata,
              measuredAt: new Date().toISOString()
            }))
          }),
          keepalive: true
        }).catch(err => {
          console.error('Failed to send performance metrics:', err);
        });
      }
    } catch (err) {
      console.error('Failed to flush monitoring data:', err);
    }
  }

  private startAutoFlush() {
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10000);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });

      // Also flush on visibility change (mobile browsers often don't fire beforeunload)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Export singleton instance
export const monitoring = new MonitoringClient();

// Export types for use in other files
export type { ErrorReport, PerformanceMetric };
