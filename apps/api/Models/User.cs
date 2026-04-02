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

    // Profile fields
    public string? ProfilePictureUrl { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? Bio { get; set; }

    // Email verification
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationSentAt { get; set; }

    // PIN login (SHA-256 hash of the 8-digit numeric code)
    public string? Pin { get; set; }

    // Password reset
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }

    // Account status
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }

    // User preferences (stored as JSON)
    public string? PreferencesJson { get; set; }

    public string TeamId { get; set; } = string.Empty;
    public Team Team { get; set; } = null!;

    public ICollection<Photo> UploadedPhotos { get; set; } = new List<Photo>();
    public ICollection<PhotoNote> PhotoNotes { get; set; } = new List<PhotoNote>();
    public ICollection<PhotoTask> AssignedTasks { get; set; } = new List<PhotoTask>();
    public ICollection<PhotoTask> CreatedTasks { get; set; } = new List<PhotoTask>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<UserActivityLog> ActivityLogs { get; set; } = new List<UserActivityLog>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Computed property
    public string FullName => $"{FirstName} {LastName}".Trim();
}
