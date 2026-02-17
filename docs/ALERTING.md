# FieldMind Alerting System Guide

## Overview

FieldMind's alerting system monitors key metrics and automatically notifies teams when thresholds are exceeded. Alerts are evaluated every 60 seconds and can send notifications via email, Slack, or webhooks.

## How It Works

```
┌─────────────────────────────────────┐
│   Alert Rules (monitoring.alert_rules)  │
│   - Query to evaluate                    │
│   - Threshold value                      │
│   - Notification channels                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   AlertEvaluationService             │
│   - Runs every 60 seconds            │
│   - Executes all enabled rules       │
│   - Compares result to threshold     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   AlertingService                    │
│   - Creates alert instances          │
│   - Sends notifications              │
│   - Applies throttling               │
└─────────────────────────────────────┘
```

## Pre-configured Alerts

### 1. High API Error Rate
- **ID**: `high-error-rate`
- **Description**: API error rate exceeds 5% in last 5 minutes
- **Severity**: Critical
- **Threshold**: 5.0 (percent)
- **Query**:
  ```sql
  SELECT COALESCE(
    CAST(COUNT(*) FILTER (WHERE status_code >= 500) AS FLOAT) /
    NULLIF(COUNT(*), 0) * 100,
    0
  )
  FROM monitoring.api_metrics
  WHERE time > NOW() - INTERVAL '5 minutes'
  ```
- **Notifications**: Email
- **Throttle**: 15 minutes

### 2. Slow API Response Time
- **ID**: `slow-api-response`
- **Description**: P95 response time exceeds 2 seconds
- **Severity**: Warning
- **Threshold**: 2000.0 (milliseconds)
- **Query**:
  ```sql
  SELECT COALESCE(
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms),
    0
  )
  FROM monitoring.api_metrics
  WHERE time > NOW() - INTERVAL '10 minutes'
  ```
- **Notifications**: Email
- **Throttle**: 30 minutes

### 3. High Hangfire Queue Depth
- **ID**: `high-queue-depth`
- **Description**: More than 100 jobs waiting in queue
- **Severity**: Warning
- **Threshold**: 100.0
- **Query**:
  ```sql
  SELECT COALESCE(COUNT(*)::float, 0)
  FROM hangfire.job
  WHERE state_name IN ('Enqueued', 'Scheduled')
  ```
- **Notifications**: Email
- **Throttle**: 15 minutes

### 4. Critical Errors from Web/Mobile
- **ID**: `critical-errors`
- **Description**: Critical or fatal errors in last 5 minutes
- **Severity**: Critical
- **Threshold**: 0.5 (triggers if >= 1 error)
- **Query**:
  ```sql
  SELECT COALESCE(COUNT(*)::float, 0)
  FROM monitoring.error_logs
  WHERE severity IN ('critical', 'fatal')
    AND occurred_at > NOW() - INTERVAL '5 minutes'
  ```
- **Notifications**: Email
- **Throttle**: 15 minutes

### 5. Failed Background Jobs
- **ID**: `failed-jobs`
- **Description**: More than 5 failed jobs in queue
- **Severity**: Warning
- **Threshold**: 5.0
- **Query**:
  ```sql
  SELECT COALESCE(COUNT(*)::float, 0)
  FROM hangfire.job
  WHERE state_name = 'Failed'
  ```
- **Notifications**: Email
- **Throttle**: 30 minutes

## Creating Custom Alerts

### Step 1: Define Your Alert Rule

```sql
INSERT INTO monitoring.alert_rules (
  id,
  name,
  description,
  enabled,
  severity,
  query,
  threshold,
  notification_channels,
  throttle_minutes
) VALUES (
  'database-connection-errors',           -- Unique ID
  'Database Connection Errors',            -- Human-readable name
  'More than 10 database errors in 5 min', -- Description
  true,                                    -- Enabled
  'critical',                              -- Severity: info, warning, critical
  $SQL$                                    -- Query must return a single number
    SELECT COALESCE(COUNT(*)::float, 0)
    FROM monitoring.error_logs
    WHERE message LIKE '%database%'
      AND occurred_at > NOW() - INTERVAL '5 minutes'
  $SQL$,
  10.0,                                    -- Threshold value
  ARRAY['email', 'slack'],                 -- Notification channels
  15                                       -- Throttle in minutes
);
```

### Step 2: Test Your Query

Before creating an alert, test the query returns a single numeric value:

```sql
-- Should return a single number
SELECT COALESCE(COUNT(*)::float, 0)
FROM monitoring.error_logs
WHERE message LIKE '%database%'
  AND occurred_at > NOW() - INTERVAL '5 minutes';
```

### Step 3: Verify Alert Creation

```sql
SELECT * FROM monitoring.alert_rules WHERE id = 'database-connection-errors';
```

The alert will start evaluating within 60 seconds.

## Alert Query Requirements

### Must Return Single Numeric Value

✅ **Good queries**:
```sql
-- Count
SELECT COUNT(*)::float FROM table;

-- Average
SELECT AVG(column)::float FROM table;

-- Percentage
SELECT (COUNT(*) FILTER (WHERE condition)::float / NULLIF(COUNT(*), 0)) * 100
FROM table;

-- Percentile
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) FROM table;
```

❌ **Bad queries**:
```sql
-- Multiple rows
SELECT column FROM table;

-- Multiple columns
SELECT COUNT(*), AVG(value) FROM table;

-- No result (use COALESCE to return 0)
SELECT COUNT(*) FROM table WHERE false;
```

### Use COALESCE for Safety

Always wrap queries in `COALESCE()` to handle NULL or no results:

```sql
SELECT COALESCE(AVG(duration)::float, 0)
FROM monitoring.api_metrics
WHERE time > NOW() - INTERVAL '5 minutes';
```

### Time Windows

Use appropriate time windows based on alert type:

- **Real-time issues**: 5 minutes
- **Performance trends**: 10-30 minutes
- **Capacity planning**: 1-24 hours

## Notification Channels

### Email (Default)

**Configuration** (`appsettings.json`):
```json
{
  "Email": {
    "Enabled": true,
    "FromName": "FieldMind Alerts",
    "FromAddress": "alerts@yourcompany.com",
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "UseSsl": true
  },
  "Monitoring": {
    "AlertEmail": "ops@yourcompany.com"
  }
}
```

**Email content includes**:
- Alert name and severity
- Current value vs threshold
- Triggered timestamp
- Link to Grafana dashboard

### Slack

**Configuration**:
```json
{
  "Monitoring": {
    "SlackWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }
}
```

**Setup Slack webhook**:
1. Go to https://api.slack.com/apps
2. Create new app → Incoming Webhooks
3. Activate incoming webhooks
4. Add webhook to workspace
5. Copy webhook URL to appsettings.json

**Slack message includes**:
- Color-coded by severity (red/yellow/green)
- Alert title and message
- Value and threshold
- Timestamp

### Custom Webhook

**Configuration**:
```json
{
  "Monitoring": {
    "WebhookUrl": "https://your-service.com/alerts"
  }
}
```

**Webhook payload**:
```json
{
  "alertId": "123e4567-e89b-12d3-a456-426614174000",
  "ruleId": "high-error-rate",
  "ruleName": "High API Error Rate",
  "severity": "critical",
  "status": "firing",
  "value": 8.5,
  "threshold": 5.0,
  "message": "High API Error Rate: 8.50 exceeds threshold 5",
  "triggeredAt": "2026-02-16T10:30:00Z"
}
```

## Alert Lifecycle

### 1. Trigger (Firing)

When query result exceeds threshold:
- Alert instance created with status `firing`
- Notifications sent to all configured channels
- Alert appears in Grafana dashboards

### 2. Throttling

To prevent alert spam:
- After alert fires, same rule won't fire again for `throttle_minutes`
- Applies even if alert resolves and re-triggers
- Prevents notification fatigue

### 3. Resolution

When query result drops below threshold:
- Alert status changes to `resolved`
- `resolved_at` timestamp recorded
- No notification sent (optional: can enable resolution notifications)

### 4. Acknowledgment (Future)

```sql
-- Acknowledge an alert (stops notifications until resolved)
UPDATE monitoring.alert_instances
SET
  status = 'acknowledged',
  acknowledged_by = 'user@example.com',
  acknowledged_at = NOW()
WHERE id = 'alert-id';
```

## Managing Alerts

### View Active Alerts

```sql
SELECT
  ai.id,
  ar.name,
  ar.severity,
  ai.triggered_at,
  ai.value,
  ar.threshold,
  ai.message
FROM monitoring.alert_instances ai
JOIN monitoring.alert_rules ar ON ai.rule_id = ar.id
WHERE ai.status = 'firing'
ORDER BY ai.triggered_at DESC;
```

### Alert History

```sql
SELECT
  ar.name,
  ai.triggered_at,
  ai.resolved_at,
  ai.value,
  ar.threshold,
  EXTRACT(EPOCH FROM (ai.resolved_at - ai.triggered_at))/60 as duration_minutes
FROM monitoring.alert_instances ai
JOIN monitoring.alert_rules ar ON ai.rule_id = ar.id
WHERE ai.resolved_at IS NOT NULL
ORDER BY ai.triggered_at DESC
LIMIT 50;
```

### Disable an Alert

```sql
UPDATE monitoring.alert_rules
SET enabled = false
WHERE id = 'alert-id';
```

### Modify Threshold

```sql
UPDATE monitoring.alert_rules
SET threshold = 10.0
WHERE id = 'high-error-rate';
```

### Delete an Alert

```sql
DELETE FROM monitoring.alert_rules WHERE id = 'alert-id';
```

## Best Practices

### 1. Set Appropriate Thresholds

- Start conservative (higher thresholds)
- Adjust based on false positive rate
- Use historical data to inform thresholds

```sql
-- Find P95 response time to set threshold
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)
FROM monitoring.api_metrics
WHERE time > NOW() - INTERVAL '7 days';
```

### 2. Use Proper Time Windows

- **Too short** (1 min): Noisy, false positives
- **Too long** (1 hour): Delayed response to issues
- **Recommended**: 5-10 minutes for most alerts

### 3. Apply Throttling

- Prevents alert fatigue
- Gives team time to investigate
- Typical values: 15-30 minutes

### 4. Severity Levels

- **Critical**: Immediate action required (pages on-call)
- **Warning**: Needs attention soon (email notification)
- **Info**: FYI only (log, no urgent action)

### 5. Alert Naming

Use clear, actionable names:
- ✅ "High API Error Rate"
- ✅ "Database Connection Pool Exhausted"
- ❌ "Something Wrong"
- ❌ "Alert 1"

## Troubleshooting

### Alert Not Firing When Expected

**Check**:
1. Is alert enabled?
   ```sql
   SELECT enabled FROM monitoring.alert_rules WHERE id = 'alert-id';
   ```

2. Run query manually:
   ```sql
   -- Copy query from alert rule
   SELECT ...
   ```

3. Check AlertEvaluationService logs:
   ```bash
   # In Seq, filter by:
   SourceContext = 'FieldMind.Api.BackgroundServices.AlertEvaluationService'
   ```

4. Was alert recently resolved (throttled)?
   ```sql
   SELECT * FROM monitoring.alert_instances
   WHERE rule_id = 'alert-id'
   ORDER BY triggered_at DESC
   LIMIT 5;
   ```

### Alert Firing Too Often

**Solutions**:
- Increase threshold
- Increase throttle duration
- Use longer time window in query
- Use percentile instead of average

### Notifications Not Sending

**Check**:
1. Email configuration in appsettings.json
2. Seq logs for notification errors
3. Test email service manually
4. Verify notification channels array:
   ```sql
   SELECT notification_channels FROM monitoring.alert_rules WHERE id = 'alert-id';
   ```

### Query Errors

Common issues:
- Query returns NULL → Use `COALESCE()`
- Query returns multiple rows → Use aggregate function
- Query returns multiple columns → Select single value
- Division by zero → Use `NULLIF()`

## Example Alert Recipes

### High Memory Usage

```sql
INSERT INTO monitoring.alert_rules (id, name, description, enabled, severity, query, threshold, notification_channels, throttle_minutes)
VALUES (
  'high-memory',
  'High Memory Usage',
  'System memory usage exceeds 80%',
  true,
  'warning',
  'SELECT COALESCE(value, 0) FROM monitoring.system_metrics WHERE metric_name = ''memory_percent'' ORDER BY time DESC LIMIT 1',
  80.0,
  ARRAY['email'],
  30
);
```

### Slow Database Queries

```sql
INSERT INTO monitoring.alert_rules (id, name, description, enabled, severity, query, threshold, notification_channels, throttle_minutes)
VALUES (
  'slow-db-queries',
  'Slow Database Queries',
  'Average query time exceeds 500ms',
  true,
  'warning',
  'SELECT COALESCE(AVG(duration_ms)::float, 0) FROM monitoring.api_metrics WHERE endpoint LIKE ''%db%'' AND time > NOW() - INTERVAL ''10 minutes''',
  500.0,
  ARRAY['email'],
  20
);
```

### No Health Checks Received

```sql
INSERT INTO monitoring.alert_rules (id, name, description, enabled, severity, query, threshold, notification_channels, throttle_minutes)
VALUES (
  'missing-health-checks',
  'Missing Health Checks',
  'No health check in last 5 minutes',
  true,
  'critical',
  'SELECT EXTRACT(EPOCH FROM (NOW() - MAX(time)))::float FROM monitoring.system_metrics WHERE metric_name = ''health_check''',
  300.0,
  ARRAY['email', 'slack'],
  15
);
```

---

**Last Updated**: 2026-02-16
**Version**: 1.0.0
