using System;

namespace FieldMind.Api.Models;

public enum TaskStatus
{
    Open,
    InProgress,
    Done
}

public class PhotoTask
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string PhotoId { get; set; } = string.Empty;
    public Photo Photo { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Open;

    public string? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public string CreatedById { get; set; } = string.Empty;
    public User CreatedBy { get; set; } = null!;

    public DateTime? DueDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
