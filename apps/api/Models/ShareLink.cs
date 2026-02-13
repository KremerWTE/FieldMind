using System;

namespace FieldMind.Api.Models;

public enum ShareScope
{
    Project,
    Folder,
    Building
}

public class ShareLink
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Token { get; set; } = Guid.NewGuid().ToString();

    public ShareScope Scope { get; set; }
    public string ScopeId { get; set; } = string.Empty;

    public string CreatedById { get; set; } = string.Empty;
    public User CreatedBy { get; set; } = null!;

    public string TeamId { get; set; } = string.Empty;

    public string? PasswordHash { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public string? Title { get; set; }
    public string? Description { get; set; }

    public int ViewCount { get; set; } = 0;
    public DateTime? LastAccessedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
