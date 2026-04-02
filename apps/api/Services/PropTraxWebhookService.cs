using System.Text;
using System.Text.Json;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FieldMind.Api.Services;

/// <summary>
/// Fires outbound webhook events to PropTrax when significant FieldMind events occur
/// (photo AI analysis complete, maintenance event created).
/// </summary>
public class PropTraxWebhookService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PropTraxWebhookService> _logger;

    public PropTraxWebhookService(
        IHttpClientFactory httpClientFactory,
        ILogger<PropTraxWebhookService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendPhotoAnalyzedAsync(
        FieldMindDbContext context,
        Photo photo,
        AiAnnotation annotation,
        MaintenanceEvent? maintenanceEvent)
    {
        var building = await context.Buildings
            .Include(b => b.Team)
            .FirstOrDefaultAsync(b => b.Id == photo.BuildingId);

        if (building == null || string.IsNullOrEmpty(building.PropTraxBuildingId))
            return;

        var team = building.Team;
        if (team == null || string.IsNullOrEmpty(team.PropTraxWebhookUrl))
            return;

        var payload = new
        {
            @event = "photo.analyzed",
            proptrax_building_id = building.PropTraxBuildingId,
            photo_id = photo.Id,
            captured_at = photo.CapturedAt ?? photo.UploadedAt,
            geo_lat = photo.GeoLat,
            geo_lng = photo.GeoLng,
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
            },
            maintenance_event = maintenanceEvent == null ? null : new
            {
                id = maintenanceEvent.Id,
                title = maintenanceEvent.Title,
                severity = maintenanceEvent.Severity.ToString(),
                status = maintenanceEvent.Status.ToString(),
            }
        };

        await PostWebhookAsync(team.PropTraxWebhookUrl, team.PropTraxApiKey, payload);
    }

    public async Task SendMaintenanceEventCreatedAsync(
        FieldMindDbContext context,
        MaintenanceEvent evt)
    {
        var building = await context.Buildings
            .Include(b => b.Team)
            .FirstOrDefaultAsync(b => b.Id == evt.BuildingId);

        if (building == null || string.IsNullOrEmpty(building.PropTraxBuildingId))
            return;

        if (string.IsNullOrEmpty(building.Team?.PropTraxWebhookUrl))
            return;

        var payload = new
        {
            @event = "maintenance.created",
            proptrax_building_id = building.PropTraxBuildingId,
            maintenance_event = new
            {
                id = evt.Id,
                title = evt.Title,
                description = evt.Description,
                type = evt.Type.ToString(),
                severity = evt.Severity.ToString(),
                status = evt.Status.ToString(),
                detected_by = evt.DetectedBy.ToString(),
                created_at = evt.CreatedAt,
            }
        };

        await PostWebhookAsync(building.Team.PropTraxWebhookUrl, building.Team.PropTraxApiKey, payload);
    }

    private async Task PostWebhookAsync(string url, string? apiKey, object payload)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("proptrax-webhook");
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            });
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            if (!string.IsNullOrEmpty(apiKey))
                client.DefaultRequestHeaders.Add("X-FieldMind-Key", apiKey);

            var response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("PropTrax webhook returned {StatusCode} for {Url}", response.StatusCode, url);
            else
                _logger.LogInformation("PropTrax webhook delivered to {Url}", url);
        }
        catch (Exception ex)
        {
            // Never block the main job — webhook delivery is best-effort
            _logger.LogWarning(ex, "PropTrax webhook delivery failed for {Url}", url);
        }
    }
}
