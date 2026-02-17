namespace FieldMind.Api.Models;

public enum ActivityType
{
    Login,
    Logout,
    PasswordChanged,
    PasswordResetRequested,
    PasswordReset,
    EmailVerified,
    ProfileUpdated,
    AvatarUploaded,
    PreferencesUpdated,
    UserCreated,
    UserUpdated,
    UserSuspended,
    UserActivated,
    UserDeleted,
    RoleChanged,
    TeamJoined,
    TeamLeft
}

public class UserActivityLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public ActivityType ActivityType { get; set; }
    public string Description { get; set; } = string.Empty;

    // Request metadata
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? DeviceInfo { get; set; }

    // Additional context (stored as JSON)
    public string? MetadataJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
