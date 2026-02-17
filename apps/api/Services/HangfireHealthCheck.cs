using Microsoft.Extensions.Diagnostics.HealthChecks;
using Hangfire;

namespace FieldMind.Api.Services;

public class HangfireHealthCheck : IHealthCheck
{
    private readonly ILogger<HangfireHealthCheck> _logger;

    public HangfireHealthCheck(ILogger<HangfireHealthCheck> logger)
    {
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Try to get monitoring API statistics
            var monitoringApi = JobStorage.Current.GetMonitoringApi();
            var stats = monitoringApi.GetStatistics();

            // Check if there are too many failed jobs
            var failedCount = stats.Failed;
            if (failedCount > 10)
            {
                return Task.FromResult(
                    HealthCheckResult.Degraded($"Hangfire has {failedCount} failed jobs"));
            }

            return Task.FromResult(
                HealthCheckResult.Healthy($"Hangfire is healthy. Processed: {stats.Succeeded}, Failed: {stats.Failed}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hangfire health check failed");
            return Task.FromResult(
                HealthCheckResult.Unhealthy("Hangfire is not available", ex));
        }
    }
}
