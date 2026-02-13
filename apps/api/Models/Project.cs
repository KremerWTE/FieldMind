using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public enum ProjectStatus
{
    Active,
    Completed,
    Archived
}

public class Project
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string? ClientName { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;

    public string BuildingId { get; set; } = string.Empty;
    public Building Building { get; set; } = null!;

    public string TeamId { get; set; } = string.Empty;
    public Team Team { get; set; } = null!;

    public ICollection<Folder> Folders { get; set; } = new List<Folder>();
    public ICollection<Photo> Photos { get; set; } = new List<Photo>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
