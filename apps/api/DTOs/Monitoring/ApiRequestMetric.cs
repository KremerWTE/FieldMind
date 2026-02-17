namespace FieldMind.Api.DTOs.Monitoring;

public class ApiRequestMetric
{
    public DateTime Timestamp { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public int DurationMs { get; set; }
    public string? UserId { get; set; }
    public Guid? TeamId { get; set; }
    public string? ErrorMessage { get; set; }
}
