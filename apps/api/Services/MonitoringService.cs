using FieldMind.Api.DTOs.Monitoring;

namespace FieldMind.Api.Services;

public class MonitoringService
{
    public Task IngestMetrics(MetricsBatch batch) => Task.CompletedTask;

    public Task TrackApiRequest(ApiRequestMetric metric) => Task.CompletedTask;

    public Task TrackError(ErrorReport error) => Task.CompletedTask;

    public Task TrackPerformance(PerformanceMetricsBatch batch) => Task.CompletedTask;

    public Task<DashboardData> GetDashboardData(string timeRange) =>
        Task.FromResult(new DashboardData
        {
            SystemHealth = new SystemHealthSummary { DatabaseHealthy = true, HangfireHealthy = true }
        });
}
