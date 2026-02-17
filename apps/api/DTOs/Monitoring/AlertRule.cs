namespace FieldMind.Api.DTOs.Monitoring;

public class AlertRule
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Enabled { get; set; } = true;
    public string Severity { get; set; } = string.Empty; // info, warning, critical
    public string Query { get; set; } = string.Empty;
    public double Threshold { get; set; }
    public int EvaluationIntervalSeconds { get; set; } = 60;
    public string[]? NotificationChannels { get; set; }
    public int ThrottleMinutes { get; set; } = 15;
    public Dictionary<string, object>? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}
