using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public enum AiStatus
{
    Pending,
    Processing,
    Complete,
    Failed
}

public class Photo
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string S3Key { get; set; } = string.Empty;
    public string S3Url { get; set; } = string.Empty;

    public string BuildingId { get; set; } = string.Empty;
    public Building Building { get; set; } = null!;

    public string ProjectId { get; set; } = string.Empty;
    public Project Project { get; set; } = null!;

    public string? FolderId { get; set; }
    public Folder? Folder { get; set; }

    public string? MaintenanceEventId { get; set; }
    public MaintenanceEvent? MaintenanceEvent { get; set; }

    public string UploadedById { get; set; } = string.Empty;
    public User UploadedBy { get; set; } = null!;

    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public DateTime? CapturedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? ExifJson { get; set; }

    public bool AiProcessed { get; set; } = false;
    public AiStatus AiStatus { get; set; } = AiStatus.Pending;

    public ICollection<AiAnnotation> AiAnnotations { get; set; } = new List<AiAnnotation>();
    public ICollection<PhotoNote> Notes { get; set; } = new List<PhotoNote>();
    public ICollection<PhotoTask> Tasks { get; set; } = new List<PhotoTask>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
