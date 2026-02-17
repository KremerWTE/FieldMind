using System.Text.Json;
using FieldMind.Api.Data;
using FieldMind.Api.DTOs.Monitoring;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FieldMind.Api.Services;

public class MonitoringService
{
    private readonly FieldMindDbContext _context;
    private readonly ILogger<MonitoringService> _logger;

    public MonitoringService(FieldMindDbContext context, ILogger<MonitoringService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task IngestMetrics(MetricsBatch batch)
    {
        try
        {
            foreach (var metric in batch.Metrics)
            {
                var tagsJson = metric.Tags != null ? JsonSerializer.Serialize(metric.Tags) : null;

                await _context.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO monitoring.system_metrics (time, metric_name, value, tags)
                    VALUES (@p0, @p1, @p2, @p3::jsonb)
                    ON CONFLICT (time, metric_name) DO UPDATE SET value = EXCLUDED.value",
                    batch.Timestamp,
                    metric.Name,
                    metric.Value,
                    tagsJson ?? "{}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to ingest metrics batch");
            throw;
        }
    }

    public async Task TrackApiRequest(ApiRequestMetric metric)
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync(@"
                INSERT INTO monitoring.api_metrics
                (time, endpoint, method, status_code, duration_ms, user_id, team_id, error_message)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7)",
                metric.Timestamp,
                metric.Endpoint,
                metric.Method,
                metric.StatusCode,
                metric.DurationMs,
                metric.UserId ?? (object)DBNull.Value,
                metric.TeamId ?? (object)DBNull.Value,
                metric.ErrorMessage ?? (object)DBNull.Value);
        }
        catch (Exception ex)
        {
            // Don't throw - we don't want monitoring to break the app
            _logger.LogError(ex, "Failed to track API request metric");
        }
    }

    public async Task TrackError(ErrorReport error)
    {
        try
        {
            var deviceInfoJson = error.DeviceInfo != null ? JsonSerializer.Serialize(error.DeviceInfo) : null;
            var breadcrumbsJson = error.Breadcrumbs != null ? JsonSerializer.Serialize(error.Breadcrumbs) : null;
            var contextJson = error.Context != null ? JsonSerializer.Serialize(error.Context) : null;

            await _context.Database.ExecuteSqlRawAsync(@"
                INSERT INTO monitoring.error_logs
                (platform, error_type, message, stack_trace, severity, user_id, team_id,
                 session_id, device_info, breadcrumbs, context, occurred_at)
                VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8::jsonb, @p9::jsonb, @p10::jsonb, @p11)",
                error.Platform,
                error.ErrorType,
                error.Message,
                error.StackTrace ?? (object)DBNull.Value,
                error.Severity,
                error.UserId ?? (object)DBNull.Value,
                error.TeamId ?? (object)DBNull.Value,
                error.SessionId ?? (object)DBNull.Value,
                deviceInfoJson ?? "{}",
                breadcrumbsJson ?? "[]",
                contextJson ?? "{}",
                error.OccurredAt ?? DateTime.UtcNow);

            // If critical error, log it
            if (error.Severity == "critical" || error.Severity == "fatal")
            {
                _logger.LogCritical("Critical error reported from {Platform}: {Message}", error.Platform, error.Message);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track error");
        }
    }

    public async Task TrackPerformance(PerformanceMetricsBatch batch)
    {
        try
        {
            foreach (var metric in batch.Metrics)
            {
                var metadataJson = metric.Metadata != null ? JsonSerializer.Serialize(metric.Metadata) : null;

                await _context.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO monitoring.performance_metrics
                    (platform, metric_type, name, duration_ms, user_id, team_id, metadata, measured_at)
                    VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6::jsonb, @p7)",
                    metric.Platform,
                    metric.MetricType,
                    metric.Name,
                    metric.DurationMs,
                    metric.UserId ?? (object)DBNull.Value,
                    metric.TeamId ?? (object)DBNull.Value,
                    metadataJson ?? "{}",
                    metric.MeasuredAt);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track performance metrics");
        }
    }

    public async Task<DashboardData> GetDashboardData(string timeRange)
    {
        var interval = timeRange switch
        {
            "15m" => "15 minutes",
            "1h" => "1 hour",
            "6h" => "6 hours",
            "24h" => "24 hours",
            "7d" => "7 days",
            _ => "1 hour"
        };

        var dashboardData = new DashboardData();

        // API Metrics Summary
        var apiMetrics = await _context.Database.SqlQuery<ApiMetricsQueryResult>($@"
            SELECT
                COUNT(*)::int as TotalRequests,
                AVG(duration_ms) as AverageResponseTimeMs,
                (COUNT(*) FILTER (WHERE status_code >= 500)::float / NULLIF(COUNT(*), 0) * 100) as ErrorRate
            FROM monitoring.api_metrics
            WHERE time > NOW() - INTERVAL '{interval}'
        ").FirstOrDefaultAsync();

        if (apiMetrics != null)
        {
            dashboardData.ApiMetrics.TotalRequests = apiMetrics.TotalRequests;
            dashboardData.ApiMetrics.AverageResponseTimeMs = apiMetrics.AverageResponseTimeMs;
            dashboardData.ApiMetrics.ErrorRate = apiMetrics.ErrorRate;
        }

        // Slowest endpoints
        var slowestEndpoints = await _context.Database.SqlQuery<EndpointStats>($@"
            SELECT
                endpoint as Endpoint,
                method as Method,
                COUNT(*)::int as RequestCount,
                AVG(duration_ms) as AverageDurationMs,
                (COUNT(*) FILTER (WHERE status_code >= 500)::float / NULLIF(COUNT(*), 0) * 100) as ErrorRate
            FROM monitoring.api_metrics
            WHERE time > NOW() - INTERVAL '{interval}'
            GROUP BY endpoint, method
            ORDER BY AVG(duration_ms) DESC
            LIMIT 10
        ").ToListAsync();

        dashboardData.ApiMetrics.SlowestEndpoints = slowestEndpoints;

        // Recent errors
        var recentErrors = await _context.Database.SqlQuery<ErrorSummary>($@"
            SELECT
                id as Id,
                platform as Platform,
                error_type as ErrorType,
                message as Message,
                severity as Severity,
                occurred_at as OccurredAt,
                1 as OccurrenceCount
            FROM monitoring.error_logs
            WHERE occurred_at > NOW() - INTERVAL '{interval}'
            ORDER BY occurred_at DESC
            LIMIT 50
        ").ToListAsync();

        dashboardData.RecentErrors = recentErrors;

        // Active alerts
        var activeAlerts = await _context.Database.SqlQuery<AlertInstance>($@"
            SELECT
                id as Id,
                rule_id as RuleId,
                status as Status,
                triggered_at as TriggeredAt,
                resolved_at as ResolvedAt,
                value as Value,
                message as Message
            FROM monitoring.alert_instances
            WHERE status = 'firing'
            ORDER BY triggered_at DESC
            LIMIT 20
        ").ToListAsync();

        dashboardData.ActiveAlerts = activeAlerts;

        // System health (from Hangfire)
        try
        {
            var jobStats = await _context.Database.SqlQuery<JobStatsResult>($@"
                SELECT
                    COUNT(*) FILTER (WHERE state_name IN ('Enqueued', 'Scheduled'))::int as PendingJobs,
                    COUNT(*) FILTER (WHERE state_name = 'Failed')::int as FailedJobs
                FROM hangfire.job
            ").FirstOrDefaultAsync();

            if (jobStats != null)
            {
                dashboardData.SystemHealth.PendingJobs = jobStats.PendingJobs;
                dashboardData.SystemHealth.FailedJobs = jobStats.FailedJobs;
            }

            dashboardData.SystemHealth.DatabaseHealthy = true;
            dashboardData.SystemHealth.HangfireHealthy = true;
        }
        catch
        {
            dashboardData.SystemHealth.DatabaseHealthy = false;
            dashboardData.SystemHealth.HangfireHealthy = false;
        }

        return dashboardData;
    }
}

// Helper classes for SQL queries
internal class ApiMetricsQueryResult
{
    public int TotalRequests { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double ErrorRate { get; set; }
}

internal class JobStatsResult
{
    public int PendingJobs { get; set; }
    public int FailedJobs { get; set; }
}
