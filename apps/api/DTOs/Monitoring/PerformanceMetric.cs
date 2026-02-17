namespace FieldMind.Api.DTOs.Monitoring;

public class PerformanceMetric
{
    public string Platform { get; set; } = string.Empty;
    public string MetricType { get; set; } = string.Empty; // web_vital, navigation, api_call
    public string Name { get; set; } = string.Empty;
    public double DurationMs { get; set; }
    public string? UserId { get; set; }
    public Guid? TeamId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public DateTime MeasuredAt { get; set; }
}

public class PerformanceMetricsBatch
{
    public List<PerformanceMetric> Metrics { get; set; } = new();
}
