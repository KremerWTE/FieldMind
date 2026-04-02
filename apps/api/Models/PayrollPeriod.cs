using System;

namespace FieldMind.Api.Models;

public enum PayrollStatus
{
    Draft,
    Approved,
    Submitted
}

public class PayrollPeriod
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TeamId { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }   // Monday 00:00 UTC
    public DateTime PeriodEnd { get; set; }     // Sunday end-of-day UTC
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public string? Notes { get; set; }
    public string? SubmittedById { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Team Team { get; set; } = null!;
    public User? SubmittedBy { get; set; }
}
