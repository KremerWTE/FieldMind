namespace FieldMind.Api.DTOs.Monitoring;

public class AlertInstance
{
    public Guid Id { get; set; }
    public string RuleId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // firing, resolved, acknowledged
    public DateTime TriggeredAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public double Value { get; set; }
    public string? Message { get; set; }
    public string[]? NotifiedChannels { get; set; }
    public string? AcknowledgedBy { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
}
