# FieldMind Monitoring & Analytics System

## Overview

FieldMind uses a comprehensive, self-hosted monitoring stack to track application performance, errors, and system health across all components:

- **.NET 10 Backend API** - Request metrics, error tracking, performance monitoring
- **Hangfire Background Jobs** - Job queue metrics, failure tracking
- **Next.js Web Frontend** - Error tracking, Web Vitals, user analytics
- **React Native Mobile App** - Crash reporting, performance metrics, offline queueing

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│  .NET API    │  Hangfire    │  Next.js     │  React Native   │
│  (Serilog)   │  (Metrics)   │  (Errors)    │  (Crashes)      │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│              Monitoring API Endpoints (.NET)                 │
│  POST /monitoring/errors  │  POST /monitoring/metrics       │
│  POST /monitoring/logs    │  POST /monitoring/analytics     │
└──────┬────────────────────┬───────────────────────┬─────────┘
       │                    │                       │
       ▼                    ▼                       ▼
┌─────────────┐     ┌──────────────┐      ┌─────────────────┐
│    Seq      │     │ TimescaleDB  │      │  PostgreSQL     │
│   (Logs)    │     │  (Metrics)   │      │  (Alerts DB)    │
└──────┬──────┘     └──────┬───────┘      └────────┬────────┘
       │                   │                       │
       ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Visualization & Alerting Layer                  │
│         Grafana              │    Alert Evaluation Service  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Monitoring Infrastructure
- **Serilog** - Structured logging for .NET
- **Seq** - Self-hosted log aggregation and search (http://localhost:5341)
- **TimescaleDB** - PostgreSQL extension for time-series metrics
- **Grafana** - Visualization dashboards (http://localhost:3002)
- **Custom .NET Alerting Service** - Alert evaluation and notifications

### Why This Stack?
- ✅ Fully self-hosted (no external SaaS dependencies)
- ✅ Extends existing PostgreSQL (no new database system)
- ✅ Industry-proven open-source tools
- ✅ Free for core features
- ✅ Excellent .NET integration
- ✅ Scales to production workloads

## Quick Start

### 1. Start Infrastructure

```bash
# Start PostgreSQL (TimescaleDB), Seq, and Grafana
docker compose up -d

# Run database migrations
cd apps/api
dotnet ef database update

# Start API (Serilog and monitoring will auto-configure)
dotnet run
```

### 2. Access Dashboards

#### Seq (Structured Logs)
- URL: http://localhost:5341
- No login required (development mode)
- Real-time log streaming
- Powerful query language
- Alert signals

#### Grafana (Metrics Visualization)
- URL: http://localhost:3002
- Default login: `admin` / `admin`
- Pre-built dashboards:
  - **API Performance** - Request rates, response times, errors
  - **System Health** - Alerts, job queues, recent errors

#### Health Checks
- **Full health**: http://localhost:5000/health
- **Readiness**: http://localhost:5000/health/ready
- **Liveness**: http://localhost:5000/health/live

## Features

### 1. API Request Tracking

**Automatic tracking** via `MetricsMiddleware`:
- Request method, endpoint, status code
- Duration (P50, P95, P99 percentiles)
- User context (userId, teamId)
- Error messages for failed requests

**View in**:
- Grafana → API Performance dashboard
- Query directly: `SELECT * FROM monitoring.api_metrics`

### 2. Error Tracking

**Web (Next.js)**:
```typescript
import { monitoring } from '@/lib/monitoring';

// Automatic error catching via ErrorBoundary
// Manual error reporting:
monitoring.captureError({
  type: 'api_error',
  message: 'Failed to fetch projects',
  severity: 'error',
  stack: error.stack
});
```

**Mobile (React Native)**:
```typescript
import { mobileMonitoring } from '@/services/monitoring.service';

// Automatic crash reporting via global error handler
// Manual error reporting:
mobileMonitoring.captureError({
  type: 'navigation_error',
  message: 'Screen failed to load',
  severity: 'warning'
});
```

**View errors**:
- Seq: Filter by `@l = 'Error'`
- Grafana: System Health → Recent Errors table
- Query: `SELECT * FROM monitoring.error_logs ORDER BY occurred_at DESC`

### 3. Performance Monitoring

**Web Vitals** (automatically tracked):
- **LCP** - Largest Contentful Paint
- **FID** - First Input Delay
- **CLS** - Cumulative Layout Shift

**Custom metrics**:
```typescript
monitoring.capturePerformance({
  type: 'api_call',
  name: 'fetch_projects',
  duration: 245 // ms
});
```

**View in**:
- Query: `SELECT * FROM monitoring.performance_metrics WHERE metric_type = 'web_vital'`

### 4. Background Job Monitoring

**Automatic tracking**:
- Hangfire dashboard: http://localhost:5000/hangfire (dev only)
- Queue depth, failed jobs, processing times

**Alerts**:
- High queue depth (>100 jobs)
- Failed job count (>5 failed)

### 5. Alerting

**Pre-configured alerts**:
1. **High API Error Rate** - >5% errors in 5 minutes
2. **Slow API Response** - P95 > 2 seconds
3. **High Queue Depth** - >100 pending jobs
4. **Critical Errors** - Any critical/fatal errors from web/mobile
5. **Failed Jobs** - >5 failed background jobs

**Alert evaluation**:
- Runs every 60 seconds via `AlertEvaluationService`
- Throttling prevents alert spam (15-30 min cooldown)
- Notifications via email (Slack/webhook configurable)

**View alerts**:
```sql
-- Active alerts
SELECT * FROM monitoring.alert_instances WHERE status = 'firing';

-- All alert rules
SELECT * FROM monitoring.alert_rules;
```

**Create custom alert**:
```sql
INSERT INTO monitoring.alert_rules
(id, name, description, enabled, severity, query, threshold, notification_channels, throttle_minutes)
VALUES (
  'my-custom-alert',
  'My Custom Alert',
  'Description of what triggers this alert',
  true,
  'warning',
  'SELECT COUNT(*)::float FROM my_table WHERE condition = true',
  10.0,
  ARRAY['email'],
  30
);
```

## Common Queries

### API Performance Analysis

```sql
-- Request rate over time
SELECT
  time_bucket('5 minutes', time) as bucket,
  COUNT(*) as requests
FROM monitoring.api_metrics
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket
ORDER BY bucket DESC;

-- Slowest endpoints
SELECT
  endpoint,
  method,
  COUNT(*) as requests,
  ROUND(AVG(duration_ms)::numeric, 2) as avg_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) as p95_ms
FROM monitoring.api_metrics
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY p95_ms DESC
LIMIT 10;

-- Error rate by endpoint
SELECT
  endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status_code >= 500) as errors,
  ROUND((COUNT(*) FILTER (WHERE status_code >= 500)::float / COUNT(*)) * 100, 2) as error_rate
FROM monitoring.api_metrics
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
HAVING COUNT(*) FILTER (WHERE status_code >= 500) > 0
ORDER BY error_rate DESC;
```

### Error Analysis

```sql
-- Error breakdown by platform
SELECT
  platform,
  severity,
  COUNT(*) as count
FROM monitoring.error_logs
WHERE occurred_at > NOW() - INTERVAL '24 hours'
GROUP BY platform, severity
ORDER BY count DESC;

-- Most common errors
SELECT
  error_type,
  message,
  COUNT(*) as occurrences,
  MAX(occurred_at) as last_occurred
FROM monitoring.error_logs
WHERE occurred_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, message
ORDER BY occurrences DESC
LIMIT 20;
```

### Job Monitoring

```sql
-- Job queue status
SELECT
  state_name,
  COUNT(*) as count
FROM hangfire.job
GROUP BY state_name;

-- Recent failed jobs
SELECT
  id,
  created_at,
  state_name,
  reason
FROM hangfire.job
WHERE state_name = 'Failed'
ORDER BY created_at DESC
LIMIT 20;
```

## Troubleshooting

### High Error Rate

**Symptom**: Alert triggered for high API error rate

**Steps**:
1. Check Grafana → API Performance → Error Rate panel
2. Identify which endpoints are failing
3. Open Seq → Filter: `@l = 'Error' AND StatusCode >= 500`
4. Examine stack traces and error messages
5. Check recent deployments or infrastructure changes

### Slow API Performance

**Symptom**: Users reporting slow response times

**Steps**:
1. Grafana → API Performance → Response Time panel
2. Identify if slowdown is global or specific endpoints
3. Check "Slowest Endpoints" table
4. Seq → Filter: `Duration > 1000` (requests over 1 second)
5. Look for slow database queries: `@l = 'Information' AND CommandType = 'Text'`
6. Check database load and connection pool

### Failed Background Jobs

**Symptom**: Jobs stuck in Failed state

**Steps**:
1. Open Hangfire Dashboard: http://localhost:5000/hangfire
2. Navigate to "Failed Jobs" tab
3. Click on failed job to see exception details
4. Check if issue is transient (retry) or requires code fix
5. Query: `SELECT * FROM hangfire.job WHERE state_name = 'Failed'`

### Mobile App Crashes

**Symptom**: Crashes reported from mobile devices

**Steps**:
1. Query recent fatal errors:
   ```sql
   SELECT * FROM monitoring.error_logs
   WHERE platform IN ('mobile-ios', 'mobile-android')
     AND severity = 'fatal'
   ORDER BY occurred_at DESC
   LIMIT 50;
   ```
2. Group by error message to find common crash
3. Check device_info JSONB field for affected devices
4. Review stack traces and breadcrumbs

### Alerts Not Firing

**Symptom**: Expected alert didn't trigger

**Steps**:
1. Check alert rule is enabled:
   ```sql
   SELECT * FROM monitoring.alert_rules WHERE id = 'alert-id';
   ```
2. Verify `AlertEvaluationService` is running (check logs)
3. Manually run the alert query to see current value
4. Check if alert was recently resolved (throttled)
5. Verify notification channels are configured

## Configuration

### appsettings.json

```json
{
  "Serilog": {
    "SeqUrl": "http://localhost:5341",
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Hangfire": "Information"
      }
    }
  },
  "Monitoring": {
    "ApiKey": "change-this-in-production",
    "EnableMetrics": true,
    "SlowRequestThresholdMs": 1000,
    "SlowQueryThresholdMs": 500,
    "AlertEmail": "ops@yourcompany.com",
    "SlackWebhook": "https://hooks.slack.com/...",
    "WebhookUrl": "https://your-webhook-endpoint.com/alerts"
  }
}
```

### Environment Variables

```bash
# docker-compose.yml or .env
SEQ_API_KEY=your-seq-api-key
GRAFANA_PASSWORD=your-grafana-password
NEXT_PUBLIC_MONITORING_KEY=your-monitoring-api-key
```

## Production Deployment

### Security

1. **Change default passwords**:
   - Grafana admin password
   - Monitoring API key
   - Seq API key

2. **Network isolation**:
   - Keep Seq, Grafana on internal network
   - Use reverse proxy with authentication
   - Restrict monitoring endpoint access

3. **Data retention**:
   - Logs: 30 days (auto-cleanup via TimescaleDB retention policies)
   - Metrics: 30 days raw, 90 days compressed
   - Adjust based on storage capacity

### Performance

- **Metrics middleware overhead**: <5ms per request
- **Error tracking**: Fire-and-forget (non-blocking)
- **Database write optimization**: Batched writes where possible
- **Compression**: Automatic for data >7 days old

### Scaling

- **PostgreSQL/TimescaleDB**:
  - Supports millions of metrics per day
  - Automatic compression and retention
  - Consider read replicas for heavy query load

- **Seq**:
  - Handles 10,000+ events/second on standard hardware
  - Clustered deployment for high availability

- **Grafana**:
  - Stateless, can run multiple instances behind load balancer

## FAQ

**Q: Does monitoring impact application performance?**
A: Minimal impact (<5ms per request). Metrics are written asynchronously.

**Q: How much storage does monitoring use?**
A: ~100MB per million metrics. TimescaleDB compression reduces by 90% after 7 days.

**Q: Can I use Datadog/New Relic instead?**
A: Yes, but this setup is 100% self-hosted with no recurring SaaS costs.

**Q: How do I add custom metrics?**
A: Use `MonitoringService.IngestMetrics()` or write directly to `monitoring.system_metrics`.

**Q: Can I disable monitoring in development?**
A: Set `"Monitoring:EnableMetrics": false` in appsettings.Development.json.

## Support

- **Documentation**: `/docs/MONITORING.md` (this file), `/docs/ALERTING.md`
- **Issues**: Check Seq logs and Grafana dashboards first
- **Database queries**: All monitoring data is in `monitoring.*` schema

---

**Last Updated**: 2026-02-16
**Version**: 1.0.0
