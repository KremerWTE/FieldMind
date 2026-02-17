using System.Diagnostics;
using System.Security.Claims;
using FieldMind.Api.DTOs.Monitoring;
using FieldMind.Api.Services;

namespace FieldMind.Api.Middleware;

public class MetricsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MetricsMiddleware> _logger;
    private readonly IConfiguration _configuration;

    public MetricsMiddleware(
        RequestDelegate next,
        ILogger<MetricsMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, MonitoringService monitoring)
    {
        // Skip monitoring for monitoring endpoints to avoid recursion
        if (context.Request.Path.StartsWithSegments("/monitoring"))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        Exception? caughtException = null;

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            caughtException = ex;
            throw;
        }
        finally
        {
            stopwatch.Stop();

            // Only track if metrics are enabled
            var metricsEnabled = _configuration.GetValue<bool>("Monitoring:EnableMetrics", true);
            if (metricsEnabled)
            {
                var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var teamIdClaim = context.User?.FindFirst("teamId")?.Value;
                Guid? teamId = teamIdClaim != null && Guid.TryParse(teamIdClaim, out var tid) ? tid : null;

                var metric = new ApiRequestMetric
                {
                    Timestamp = DateTime.UtcNow,
                    Endpoint = context.Request.Path,
                    Method = context.Request.Method,
                    StatusCode = context.Response.StatusCode,
                    DurationMs = (int)stopwatch.ElapsedMilliseconds,
                    UserId = userId,
                    TeamId = teamId,
                    ErrorMessage = caughtException?.Message
                };

                // Fire and forget - don't await to avoid blocking the request
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await monitoring.TrackApiRequest(metric);
                    }
                    catch (Exception ex)
                    {
                        // Silently fail - monitoring should never break the app
                        _logger.LogError(ex, "Failed to track API request in background");
                    }
                });

                // Log slow requests
                var slowThreshold = _configuration.GetValue<int>("Monitoring:SlowRequestThresholdMs", 1000);
                if (stopwatch.ElapsedMilliseconds > slowThreshold)
                {
                    _logger.LogWarning(
                        "Slow request: {Method} {Path} took {Duration}ms (User: {UserId})",
                        context.Request.Method,
                        context.Request.Path,
                        stopwatch.ElapsedMilliseconds,
                        userId ?? "anonymous");
                }

                // Log errors
                if (context.Response.StatusCode >= 500)
                {
                    _logger.LogError(
                        "Server error: {Method} {Path} returned {StatusCode} in {Duration}ms (User: {UserId})",
                        context.Request.Method,
                        context.Request.Path,
                        context.Response.StatusCode,
                        stopwatch.ElapsedMilliseconds,
                        userId ?? "anonymous");
                }
            }
        }
    }
}
