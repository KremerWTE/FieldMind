using FieldMind.Api.DTOs.Monitoring;
using FieldMind.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("monitoring")]
public class MonitoringController : ControllerBase
{
    private readonly MonitoringService _monitoringService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MonitoringController> _logger;

    public MonitoringController(
        MonitoringService monitoringService,
        IConfiguration configuration,
        ILogger<MonitoringController> logger)
    {
        _monitoringService = monitoringService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("metrics")]
    [AllowAnonymous]
    public async Task<IActionResult> IngestMetrics([FromBody] MetricsBatch batch)
    {
        if (!ValidateApiKey())
            return Unauthorized(new { error = "Invalid API key" });

        if (batch.Metrics == null || batch.Metrics.Count == 0)
            return BadRequest(new { error = "No metrics provided" });

        await _monitoringService.IngestMetrics(batch);
        return Ok(new { received = batch.Metrics.Count });
    }

    [HttpPost("errors")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackError([FromBody] ErrorReport error)
    {
        if (!ValidateApiKey())
            return Unauthorized(new { error = "Invalid API key" });

        if (string.IsNullOrEmpty(error.Message))
            return BadRequest(new { error = "Error message is required" });

        await _monitoringService.TrackError(error);
        return Ok(new { status = "recorded" });
    }

    [HttpPost("errors/batch")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackErrors([FromBody] ErrorReportBatch batch)
    {
        if (!ValidateApiKey())
            return Unauthorized(new { error = "Invalid API key" });

        if (batch.Errors == null || batch.Errors.Count == 0)
            return BadRequest(new { error = "No errors provided" });

        foreach (var error in batch.Errors)
        {
            await _monitoringService.TrackError(error);
        }

        return Ok(new { received = batch.Errors.Count });
    }

    [HttpPost("performance")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackPerformance([FromBody] PerformanceMetricsBatch batch)
    {
        if (!ValidateApiKey())
            return Unauthorized(new { error = "Invalid API key" });

        if (batch.Metrics == null || batch.Metrics.Count == 0)
            return BadRequest(new { error = "No metrics provided" });

        await _monitoringService.TrackPerformance(batch);
        return Ok(new { received = batch.Metrics.Count });
    }

    [HttpGet("dashboard")]
    [Authorize(Roles = "Admin,PM")]
    public async Task<IActionResult> GetDashboardData([FromQuery] string timeRange = "1h")
    {
        var validRanges = new[] { "15m", "1h", "6h", "24h", "7d" };
        if (!validRanges.Contains(timeRange))
        {
            return BadRequest(new { error = "Invalid time range. Use: 15m, 1h, 6h, 24h, 7d" });
        }

        var data = await _monitoringService.GetDashboardData(timeRange);
        return Ok(data);
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult HealthCheck()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            service = "monitoring"
        });
    }

    private bool ValidateApiKey()
    {
        var apiKey = Request.Headers["X-Monitoring-Key"].FirstOrDefault();
        var validKey = _configuration["Monitoring:ApiKey"];

        if (string.IsNullOrEmpty(validKey) || validKey == "change-this-in-production")
        {
            _logger.LogWarning("Monitoring API key not properly configured");
            // In development, allow if no key is set
            return HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment();
        }

        return !string.IsNullOrEmpty(apiKey) && apiKey == validKey;
    }
}
