using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.Services;
using FieldMind.Api.Services.AI;

namespace FieldMind.Api.Jobs;

public class PhotoAIAnalysisJob
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PhotoAIAnalysisJob> _logger;

    public PhotoAIAnalysisJob(
        IServiceProvider serviceProvider,
        ILogger<PhotoAIAnalysisJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task ProcessPhotoAsync(string photoId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FieldMindDbContext>();
        var s3Service = scope.ServiceProvider.GetRequiredService<S3StorageService>();
        var aiService = scope.ServiceProvider.GetRequiredService<AIService>();

        try
        {
            _logger.LogInformation("Starting AI analysis for photo {PhotoId}", photoId);

            // Fetch photo
            var photo = await context.Photos
                .Include(p => p.Building)
                .FirstOrDefaultAsync(p => p.Id == photoId);

            if (photo == null)
            {
                _logger.LogWarning("Photo {PhotoId} not found", photoId);
                return;
            }

            // Update status to processing
            photo.AiStatus = AiStatus.Processing;
            await context.SaveChangesAsync();

            // Generate presigned GET URL for AI to access photo
            var viewUrl = await s3Service.GeneratePresignedGetUrl(photo.S3Key, expiresIn: 3600);

            // Call AI service
            var aiInput = new VisionAnnotationInput
            {
                ImageUrl = viewUrl,
                PhotoId = photoId
            };

            var aiOutput = await aiService.AnalyzePhotoAsync(aiInput);

            // Calculate severity score
            var severityScore = CalculateSeverityScore(aiOutput);
            var confidenceScore = CalculateConfidenceScore(aiOutput);

            // Parse repair priority from string to enum
            var repairPriority = Enum.TryParse<RepairPriority>(aiOutput.EstimatedRepairPriority, true, out var parsedPriority)
                ? parsedPriority
                : RepairPriority.Low;

            // Save AI annotation
            var annotation = new AiAnnotation
            {
                PhotoId = photoId,
                ShortDescription = aiOutput.ShortDescription,
                FullDescription = aiOutput.FullDescription,
                Tags = aiOutput.Tags.ToArray(),
                Categories = aiOutput.Categories.ToArray(),
                DetectedIssuesJson = System.Text.Json.JsonSerializer.Serialize(aiOutput.DetectedIssues),
                SeverityScore = severityScore,
                ConfidenceScore = confidenceScore,
                EstimatedRepairPriority = repairPriority,
                StructuralImpactScore = aiOutput.StructuralImpactScore,
                ModelUsed = "gpt-4o", // or from config
                Version = 1
            };

            context.AiAnnotations.Add(annotation);

            // Update photo status
            photo.AiProcessed = true;
            photo.AiStatus = AiStatus.Complete;

            await context.SaveChangesAsync();

            _logger.LogInformation("AI analysis completed for photo {PhotoId}, severity: {Severity}",
                photoId, severityScore);

            // Auto-create maintenance event if high/critical severity
            await CreateMaintenanceEventIfNeeded(context, photo, aiOutput, annotation);

            // Update building health stats
            await UpdateBuildingHealthStats(context, photo, aiOutput);

            _logger.LogInformation("Photo {PhotoId} processing complete", photoId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing AI analysis for photo {PhotoId}", photoId);

            // Update photo status to failed
            var photo = await context.Photos.FirstOrDefaultAsync(p => p.Id == photoId);
            if (photo != null)
            {
                photo.AiStatus = AiStatus.Failed;
                await context.SaveChangesAsync();
            }

            throw;
        }
    }

    private int CalculateSeverityScore(VisionAnnotationOutput output)
    {
        // Base score on detected issues
        var maxSeverity = output.DetectedIssues.Count > 0
            ? output.DetectedIssues.Max(i => i.Severity switch
            {
                "critical" => 90,
                "high" => 70,
                "medium" => 40,
                "low" => 20,
                _ => 10
            })
            : 0;

        // Factor in structural impact
        var structuralFactor = output.StructuralImpactScore / 2;

        return Math.Min(100, maxSeverity + structuralFactor);
    }

    private double CalculateConfidenceScore(VisionAnnotationOutput output)
    {
        if (output.DetectedIssues.Count == 0)
            return 0.8; // Base confidence for photos with no issues

        return output.DetectedIssues.Average(i => i.Confidence);
    }

    private async Task CreateMaintenanceEventIfNeeded(
        FieldMindDbContext context,
        Photo photo,
        VisionAnnotationOutput aiOutput,
        AiAnnotation annotation)
    {
        // Create maintenance event for high/critical severity issues
        var criticalIssues = aiOutput.DetectedIssues
            .Where(i => i.Severity == "high" || i.Severity == "critical")
            .ToList();

        if (criticalIssues.Count == 0)
            return;

        var highestSeverity = criticalIssues.Any(i => i.Severity == "critical") ? "critical" : "high";
        var issueDescriptions = string.Join("; ", criticalIssues.Select(i => i.Description));

        var maintenanceEvent = new MaintenanceEvent
        {
            BuildingId = photo.BuildingId,
            Type = MaintenanceEventType.MonitoringAlert,
            DetectedBy = DetectionSource.AI,
            Severity = highestSeverity == "critical" ? IssueSeverity.Critical : IssueSeverity.High,
            Status = MaintenanceEventStatus.Open,
            Title = $"AI Detected: {criticalIssues.First().Type}",
            Description = $"Automated analysis detected {criticalIssues.Count} issue(s): {issueDescriptions}"
        };

        context.MaintenanceEvents.Add(maintenanceEvent);
        await context.SaveChangesAsync();

        // Link photo to maintenance event
        photo.MaintenanceEventId = maintenanceEvent.Id;

        await context.SaveChangesAsync();

        _logger.LogWarning("Auto-created maintenance event {EventId} for photo {PhotoId} due to {Severity} severity issues",
            maintenanceEvent.Id, photo.Id, highestSeverity);
    }

    private async Task UpdateBuildingHealthStats(
        FieldMindDbContext context,
        Photo photo,
        VisionAnnotationOutput aiOutput)
    {
        var categories = aiOutput.Categories.Select(c => c.ToLower()).ToList();
        var hasSevereIssues = aiOutput.DetectedIssues.Any(i => i.Severity == "high" || i.Severity == "critical");

        // Roof Integrity
        if (categories.Any(c => c.Contains("roof") || c.Contains("shingle") || c.Contains("flashing")))
        {
            await UpdateHealthStat(context, photo.BuildingId, HealthMetricType.RoofIntegrity,
                hasSevereIssues ? -5.0 : -1.0);
        }

        // Water Risk
        if (categories.Any(c => c.Contains("water") || c.Contains("moisture") || c.Contains("leak")))
        {
            await UpdateHealthStat(context, photo.BuildingId, HealthMetricType.WaterRisk,
                hasSevereIssues ? 10.0 : 3.0);
        }

        // Hail Exposure (cumulative count)
        if (aiOutput.DetectedIssues.Any(i => i.Type.ToLower().Contains("hail")))
        {
            await UpdateHealthStat(context, photo.BuildingId, HealthMetricType.HailExposure, 1.0);
        }

        // Structural Risk
        if (aiOutput.StructuralImpactScore > 50)
        {
            await UpdateHealthStat(context, photo.BuildingId, HealthMetricType.StructuralRisk,
                (double)aiOutput.StructuralImpactScore);
        }
    }

    private async Task UpdateHealthStat(
        FieldMindDbContext context,
        string buildingId,
        HealthMetricType metricType,
        double delta)
    {
        // Get current value
        var currentStat = await context.BuildingHealthStats
            .Where(s => s.BuildingId == buildingId && s.MetricType == metricType)
            .OrderByDescending(s => s.RecordedAt)
            .FirstOrDefaultAsync();

        double newValue;

        if (metricType == HealthMetricType.RoofIntegrity)
        {
            // Starts at 100, decreases with issues
            var currentValue = currentStat?.Value ?? 100.0;
            newValue = Math.Max(0, currentValue + delta); // delta is negative
        }
        else if (metricType == HealthMetricType.HailExposure)
        {
            // Cumulative count
            var currentValue = currentStat?.Value ?? 0.0;
            newValue = currentValue + delta;
        }
        else if (metricType == HealthMetricType.StructuralRisk)
        {
            // Max value over time
            var currentValue = currentStat?.Value ?? 0.0;
            newValue = Math.Max(currentValue, delta);
        }
        else // WaterRisk
        {
            // Increases with issues
            var currentValue = currentStat?.Value ?? 0.0;
            newValue = Math.Min(100, currentValue + delta);
        }

        var newStat = new BuildingHealthStat
        {
            BuildingId = buildingId,
            MetricType = metricType,
            Value = newValue,
            Source = MetricSource.AI
        };

        context.BuildingHealthStats.Add(newStat);
        await context.SaveChangesAsync();

        _logger.LogInformation("Updated building {BuildingId} health stat {MetricType}: {Value}",
            buildingId, metricType, newValue);
    }
}
