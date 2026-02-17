namespace FieldMind.Api.DTOs.Monitoring;

public class ErrorReport
{
    public string Platform { get; set; } = string.Empty; // web, mobile-ios, mobile-android
    public string ErrorType { get; set; } = string.Empty; // javascript, promise, boundary, fatal
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public string Severity { get; set; } = string.Empty; // info, warning, error, critical, fatal
    public string? UserId { get; set; }
    public Guid? TeamId { get; set; }
    public string? SessionId { get; set; }
    public Dictionary<string, object>? DeviceInfo { get; set; }
    public List<Breadcrumb>? Breadcrumbs { get; set; }
    public Dictionary<string, object>? Context { get; set; }
    public DateTime? OccurredAt { get; set; }
}

public class Breadcrumb
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

public class ErrorReportBatch
{
    public List<ErrorReport> Errors { get; set; } = new();
}
