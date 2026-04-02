using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.Services;

namespace FieldMind.Api.Controllers;

/// <summary>
/// Read-only API consumed by PropTrax to pull building data, AI photo analysis,
/// and maintenance events. Authenticated via X-Api-Key header (team's PropTraxApiKey).
/// </summary>
[ApiController]
[Route("proptrax")]
public class PropTraxController : ControllerBase
{
    private readonly FieldMindDbContext _context;
    private readonly S3StorageService _s3;
    private readonly ILogger<PropTraxController> _logger;

    public PropTraxController(
        FieldMindDbContext context,
        S3StorageService s3,
        ILogger<PropTraxController> logger)
    {
        _context = context;
        _s3 = s3;
        _logger = logger;
    }

    // ── Auth helper ──────────────────────────────────────────────────────────

    private async Task<Team?> AuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Api-Key", out var key) || string.IsNullOrWhiteSpace(key))
            return null;

        return await _context.Teams
            .FirstOrDefaultAsync(t => t.PropTraxApiKey == key.ToString());
    }

    // ── Buildings ─────────────────────────────────────────────────────────────

    /// <summary>
    /// List all buildings linked to PropTrax (those with a PropTraxBuildingId).
    /// </summary>
    [HttpGet("buildings")]
    public async Task<IActionResult> GetBuildings()
    {
        var team = await AuthenticateAsync();
        if (team == null) return Unauthorized(new { error = "Invalid or missing X-Api-Key header." });

        var buildings = await _context.Buildings
            .Where(b => b.TeamId == team.Id && b.PropTraxBuildingId != null)
            .Select(b => new
            {
                b.Id,
                b.PropTraxBuildingId,
                b.Name,
                b.Address,
                b.GeoLat,
                b.GeoLng,
                b.CreatedAt,
                PhotoCount = b.Photos.Count,
                OpenIssueCount = b.MaintenanceEvents.Count(e => e.Status != MaintenanceEventStatus.Resolved),
            })
            .ToListAsync();

        return Ok(new { buildings });
    }

    /// <summary>
    /// Building detail by PropTrax building ID, including current health scores.
    /// </summary>
    [HttpGet("buildings/{proptraxId}")]
    public async Task<IActionResult> GetBuilding(string proptraxId)
    {
        var team = await AuthenticateAsync();
        if (team == null) return Unauthorized(new { error = "Invalid or missing X-Api-Key header." });

        var building = await _context.Buildings
            .Where(b => b.TeamId == team.Id && b.PropTraxBuildingId == proptraxId)
            .FirstOrDefaultAsync();

        if (building == null)
            return NotFound(new { error = $"No building found with PropTrax ID '{proptraxId}'." });

        // Latest health stats per metric type
        var healthStats = await _context.BuildingHealthStats
            .Where(s => s.BuildingId == building.Id)
            .GroupBy(s => s.MetricType)
            .Select(g => new
            {
                Metric = g.Key.ToString(),
                Value = g.OrderByDescending(s => s.RecordedAt).First().Value,
                RecordedAt = g.OrderByDescending(s => s.RecordedAt).First().RecordedAt,
            })
            .ToListAsync();

        var photoCount = await _context.Photos.CountAsync(p => p.BuildingId == building.Id);
        var openIssueCount = await _context.MaintenanceEvents
            .CountAsync(e => e.BuildingId == building.Id && e.Status != MaintenanceEventStatus.Resolved);

        return Ok(new
        {
            building.Id,
            building.PropTraxBuildingId,
            building.Name,
            building.Address,
            building.GeoLat,
            building.GeoLng,
            building.CreatedAt,
            PhotoCount = photoCount,
            OpenIssueCount = openIssueCount,
            HealthScores = healthStats,
        });
    }

    /// <summary>
    /// AI analysis results for all photos of a building.
    /// Returns the latest annotation per photo with presigned thumbnail URLs.
    /// </summary>
    [HttpGet("buildings/{proptraxId}/analysis")]
    public async Task<IActionResult> GetBuildingAnalysis(string proptraxId, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var team = await AuthenticateAsync();
        if (team == null) return Unauthorized(new { error = "Invalid or missing X-Api-Key header." });

        var building = await _context.Buildings
            .Where(b => b.TeamId == team.Id && b.PropTraxBuildingId == proptraxId)
            .FirstOrDefaultAsync();

        if (building == null)
            return NotFound(new { error = $"No building found with PropTrax ID '{proptraxId}'." });

        var photos = await _context.Photos
            .Where(p => p.BuildingId == building.Id && p.AiStatus == AiStatus.Complete)
            .OrderByDescending(p => p.CapturedAt ?? p.UploadedAt)
            .Skip(offset)
            .Take(limit)
            .Include(p => p.AiAnnotations)
            .ToListAsync();

        var results = new List<object>();
        foreach (var photo in photos)
        {
            var annotation = photo.AiAnnotations.OrderByDescending(a => a.CreatedAt).FirstOrDefault();
            if (annotation == null) continue;

            var presignedUrl = await _s3.GeneratePresignedGetUrl(photo.S3Key, expiresIn: 3600);

            var issues = new List<object>();
            try
            {
                issues = JsonSerializer.Deserialize<List<JsonElement>>(annotation.DetectedIssuesJson)
                    ?.Select(i => (object)new
                    {
                        type = i.GetProperty("type").GetString(),
                        description = i.GetProperty("description").GetString(),
                        severity = i.GetProperty("severity").GetString(),
                        confidence = i.TryGetProperty("confidence", out var c) ? c.GetDouble() : 0,
                    })
                    .ToList() ?? [];
            }
            catch { /* malformed JSON — skip issues */ }

            results.Add(new
            {
                photo_id = photo.Id,
                captured_at = photo.CapturedAt ?? photo.UploadedAt,
                geo_lat = photo.GeoLat,
                geo_lng = photo.GeoLng,
                image_url = presignedUrl,
                ai = new
                {
                    short_description = annotation.ShortDescription,
                    full_description = annotation.FullDescription,
                    tags = annotation.Tags,
                    categories = annotation.Categories,
                    severity_score = annotation.SeverityScore,
                    confidence_score = annotation.ConfidenceScore,
                    repair_priority = annotation.EstimatedRepairPriority.ToString(),
                    structural_impact_score = annotation.StructuralImpactScore,
                    model = annotation.ModelUsed,
                    analyzed_at = annotation.CreatedAt,
                    detected_issues = issues,
                }
            });
        }

        var total = await _context.Photos.CountAsync(p => p.BuildingId == building.Id && p.AiStatus == AiStatus.Complete);

        return Ok(new { total, offset, limit, photos = results });
    }

    /// <summary>
    /// Open and monitoring maintenance events for a building.
    /// </summary>
    [HttpGet("buildings/{proptraxId}/issues")]
    public async Task<IActionResult> GetBuildingIssues(string proptraxId, [FromQuery] string? status = null)
    {
        var team = await AuthenticateAsync();
        if (team == null) return Unauthorized(new { error = "Invalid or missing X-Api-Key header." });

        var building = await _context.Buildings
            .Where(b => b.TeamId == team.Id && b.PropTraxBuildingId == proptraxId)
            .FirstOrDefaultAsync();

        if (building == null)
            return NotFound(new { error = $"No building found with PropTrax ID '{proptraxId}'." });

        var query = _context.MaintenanceEvents
            .Where(e => e.BuildingId == building.Id);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<MaintenanceEventStatus>(status, true, out var parsedStatus))
            query = query.Where(e => e.Status == parsedStatus);

        var events = await query
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                Type = e.Type.ToString(),
                Severity = e.Severity.ToString(),
                Status = e.Status.ToString(),
                DetectedBy = e.DetectedBy.ToString(),
                e.CreatedAt,
                e.ResolvedAt,
                e.ResolutionNotes,
            })
            .ToListAsync();

        return Ok(new { issues = events });
    }

    /// <summary>
    /// Ping endpoint — verify the API key is valid and the integration is active.
    /// </summary>
    [HttpGet("ping")]
    public async Task<IActionResult> Ping()
    {
        var team = await AuthenticateAsync();
        if (team == null) return Unauthorized(new { error = "Invalid or missing X-Api-Key header." });

        var linkedBuildingCount = await _context.Buildings
            .CountAsync(b => b.TeamId == team.Id && b.PropTraxBuildingId != null);

        return Ok(new
        {
            status = "ok",
            team = team.Name,
            linked_buildings = linkedBuildingCount,
        });
    }
}
