using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public enum MaintenanceEventType
{
    Inspection,
    Repair,
    Damage,
    Warranty,
    MonitoringAlert
}

public enum MaintenanceEventStatus
{
    Open,
    Monitoring,
    Resolved
}

public enum DetectionSource
{
    AI,
    Manual,
    Integration
}

public class MaintenanceEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string BuildingId { get; set; } = string.Empty;
    public Building Building { get; set; } = null!;

    public MaintenanceEventType Type { get; set; }
    public DetectionSource DetectedBy { get; set; } = DetectionSource.AI;
    public IssueSeverity Severity { get; set; }
    public MaintenanceEventStatus Status { get; set; } = MaintenanceEventStatus.Open;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<Photo> RelatedPhotos { get; set; } = new List<Photo>();

    public string? ResolutionNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
