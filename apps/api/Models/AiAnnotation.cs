using System;

namespace FieldMind.Api.Models;

public enum IssueSeverity
{
    Low,
    Medium,
    High,
    Critical
}

public enum RepairPriority
{
    Low,
    Medium,
    High,
    Urgent
}

public class AiAnnotation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string PhotoId { get; set; } = string.Empty;
    public Photo Photo { get; set; } = null!;

    public string ShortDescription { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public string[] Tags { get; set; } = Array.Empty<string>();
    public string[] Categories { get; set; } = Array.Empty<string>();

    public string DetectedIssuesJson { get; set; } = "[]";
    public int SeverityScore { get; set; }
    public double ConfidenceScore { get; set; }

    public RepairPriority EstimatedRepairPriority { get; set; } = RepairPriority.Low;
    public int StructuralImpactScore { get; set; }

    public string ModelUsed { get; set; } = string.Empty;
    public int Version { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
