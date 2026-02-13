using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public enum UserRole
{
    Admin,
    PM,
    FieldTech,
    Office,
    ClientViewer
}

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.FieldTech;

    public string TeamId { get; set; } = string.Empty;
    public Team Team { get; set; } = null!;

    public ICollection<Photo> UploadedPhotos { get; set; } = new List<Photo>();
    public ICollection<PhotoNote> PhotoNotes { get; set; } = new List<PhotoNote>();
    public ICollection<PhotoTask> AssignedTasks { get; set; } = new List<PhotoTask>();
    public ICollection<PhotoTask> CreatedTasks { get; set; } = new List<PhotoTask>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
