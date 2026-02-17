namespace FieldMind.Api.DTOs.Monitoring;

public class MetricsBatch
{
    public DateTime Timestamp { get; set; }
    public List<Metric> Metrics { get; set; } = new();
}

public class Metric
{
    public string Name { get; set; } = string.Empty;
    public double Value { get; set; }
    public Dictionary<string, string>? Tags { get; set; }
}
