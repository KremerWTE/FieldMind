using System;

namespace FieldMind.Api.Models;

public class TimeEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string TeamId { get; set; } = string.Empty;
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Location { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsApproved { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Team Team { get; set; } = null!;

    public double? DurationHours =>
        ClockOut.HasValue ? (ClockOut.Value - ClockIn).TotalHours : null;
}
