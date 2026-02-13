using FieldMind.Api.Models;

namespace FieldMind.Api.DTOs.Projects;

public class CreateProjectDto
{
    public string Name { get; set; } = string.Empty;
    public string BuildingId { get; set; } = string.Empty;
    public string? ClientName { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
}

public class UpdateProjectDto
{
    public string? Name { get; set; }
    public string? ClientName { get; set; }
    public ProjectStatus? Status { get; set; }
}

public class CreateFolderDto
{
    public string Name { get; set; } = string.Empty;
}

public class ProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ClientName { get; set; }
    public ProjectStatus Status { get; set; }
    public string BuildingId { get; set; } = string.Empty;
    public string TeamId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int PhotoCount { get; set; }
    public int FolderCount { get; set; }
}
