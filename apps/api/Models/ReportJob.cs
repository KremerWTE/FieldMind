namespace FieldMind.Api.Models;

public enum ReportStatus
{
    Pending,
    Processing,
    Complete,
    Failed
}

public enum ReportType
{
    Building,
    Project,
    Folder
}

public class ReportJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string TeamId { get; set; } = string.Empty;
    public string CreatedById { get; set; } = string.Empty;
    public User CreatedBy { get; set; } = null!;

    public ReportType Type { get; set; }
    public string EntityId { get; set; } = string.Empty; // building/project/folder ID

    public ReportStatus Status { get; set; } = ReportStatus.Pending;

    public string? S3Key { get; set; }
    public string? S3Url { get; set; }
    public string? DownloadUrl { get; set; } // Presigned URL

    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public bool IncludeAI { get; set; } = true;
    public bool IncludeMaintenanceEvents { get; set; } = true;
    public bool IncludeHealthStats { get; set; } = true;

    public string? ErrorMessage { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
