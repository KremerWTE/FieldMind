using System.Security.Cryptography;
using System.Text.Json;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs;
using FieldMind.Api.DTOs.UserManagement;
using Microsoft.EntityFrameworkCore;

namespace FieldMind.Api.Services;

public class UserManagementService
{
    private readonly FieldMindDbContext _context;
    private readonly EmailService _emailService;
    private readonly SmsService _smsService;
    private readonly ILogger<UserManagementService> _logger;
    private readonly IConfiguration _configuration;

    public UserManagementService(
        FieldMindDbContext context,
        EmailService emailService,
        SmsService smsService,
        ILogger<UserManagementService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _smsService = smsService;
        _logger = logger;
        _configuration = configuration;
    }

    // Get users with filtering and pagination
    public async Task<(List<UserListDto> Users, int TotalCount)> GetUsers(
        string? teamId = null,
        string? role = null,
        bool? isActive = null,
        string? search = null,
        int page = 1,
        int pageSize = 20)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(teamId))
            query = query.Where(u => u.TeamId == teamId);

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role.ToString() == role);

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrEmpty(search))
        {
            search = search.ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(search) ||
                u.FirstName.ToLower().Contains(search) ||
                u.LastName.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserListDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FirstName + " " + u.LastName,
                Role = u.Role.ToString(),
                ProfilePictureUrl = u.ProfilePictureUrl,
                JobTitle = u.JobTitle,
                IsActive = u.IsActive,
                LastLoginAt = u.LastLoginAt,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return (users, totalCount);
    }

    // Get user by ID
    public async Task<DetailedUserDto?> GetUserById(string userId)
    {
        var user = await _context.Users
            .Include(u => u.Team)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return null;

        return new DetailedUserDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            ProfilePictureUrl = user.ProfilePictureUrl,
            PhoneNumber = user.PhoneNumber,
            JobTitle = user.JobTitle,
            Bio = user.Bio,
            EmailVerified = user.EmailVerified,
            IsActive = user.IsActive,
            LastLoginAt = user.LastLoginAt,
            SuspendedAt = user.SuspendedAt,
            SuspensionReason = user.SuspensionReason,
            TeamId = user.TeamId,
            Team = new TeamDto
            {
                Id = user.Team.Id,
                Name = user.Team.Name,
                Slug = user.Team.Slug
            },
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    // Update user (admin)
    public async Task<DetailedUserDto?> UpdateUser(string userId, UpdateUserRequest request, string? updatedById = null)
    {
        var user = await _context.Users
            .Include(u => u.Team)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return null;

        var changes = new List<string>();

        if (request.FirstName != null && request.FirstName != user.FirstName)
        {
            changes.Add($"FirstName: {user.FirstName} → {request.FirstName}");
            user.FirstName = request.FirstName;
        }

        if (request.LastName != null && request.LastName != user.LastName)
        {
            changes.Add($"LastName: {user.LastName} → {request.LastName}");
            user.LastName = request.LastName;
        }

        if (request.PhoneNumber != null && request.PhoneNumber != user.PhoneNumber)
        {
            changes.Add($"PhoneNumber updated");
            user.PhoneNumber = request.PhoneNumber;
        }

        if (request.JobTitle != null && request.JobTitle != user.JobTitle)
        {
            changes.Add($"JobTitle: {user.JobTitle} → {request.JobTitle}");
            user.JobTitle = request.JobTitle;
        }

        if (request.Role != null && request.Role != user.Role.ToString())
        {
            changes.Add($"Role: {user.Role} → {request.Role}");
            user.Role = Enum.Parse<UserRole>(request.Role);

            // Log role change activity
            await LogActivity(userId, ActivityType.RoleChanged, $"Role changed to {request.Role}", updatedById);
        }

        if (request.IsActive.HasValue && request.IsActive != user.IsActive)
        {
            changes.Add($"IsActive: {user.IsActive} → {request.IsActive}");
            user.IsActive = request.IsActive.Value;
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (changes.Any())
        {
            await LogActivity(userId, ActivityType.UserUpdated,
                $"User updated: {string.Join(", ", changes)}", updatedById);
        }

        return await GetUserById(userId);
    }

    // Update own profile
    public async Task<DetailedUserDto?> UpdateProfile(string userId, UpdateUserProfileRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return null;

        if (!string.IsNullOrEmpty(request.FirstName))
            user.FirstName = request.FirstName;

        if (!string.IsNullOrEmpty(request.LastName))
            user.LastName = request.LastName;

        if (request.PhoneNumber != null)
            user.PhoneNumber = request.PhoneNumber;

        if (request.JobTitle != null)
            user.JobTitle = request.JobTitle;

        if (request.Bio != null)
            user.Bio = request.Bio;

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(userId, ActivityType.ProfileUpdated, "Profile updated");

        return await GetUserById(userId);
    }

    // Change password
    public async Task<bool> ChangePassword(string userId, ChangePasswordRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return false;

        // Verify current password
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return false;

        // Update password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(userId, ActivityType.PasswordChanged, "Password changed");

        // Send notification email
        try
        {
            await _emailService.SendEmailAsync(
                user.Email,
                user.FullName,
                "Password Changed",
                $"<p>Hi {user.FirstName},</p>" +
                $"<p>Your password was successfully changed on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC.</p>" +
                $"<p>If you did not make this change, please contact support immediately.</p>"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password change notification email");
        }

        return true;
    }

    // Initiate password reset
    public async Task<bool> InitiatePasswordReset(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return false; // Don't reveal if email exists

        // Generate reset token
        user.PasswordResetToken = Guid.NewGuid().ToString();
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.PasswordResetRequested, "Password reset requested");

        // Send reset email
        var resetUrl = $"{_configuration["Frontend:Url"]}/reset-password?token={user.PasswordResetToken}";

        try
        {
            await _emailService.SendEmailAsync(
                user.Email,
                user.FullName,
                "Reset Your Password",
                $"<h2>Reset Your Password</h2>" +
                $"<p>Hello {user.FirstName},</p>" +
                $"<p>We received a request to reset your password. Click the link below to reset it:</p>" +
                $"<p><a href='{resetUrl}' style='background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reset Password</a></p>" +
                $"<p>This link will expire in 1 hour.</p>" +
                $"<p>If you didn't request this, please ignore this email.</p>"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email");
        }

        return true;
    }

    // Reset password with token
    public async Task<bool> ResetPassword(string token, string newPassword)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.PasswordResetToken == token &&
            u.PasswordResetExpiry > DateTime.UtcNow);

        if (user == null)
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.PasswordReset, "Password reset completed");

        return true;
    }

    // Invite user — generates an 8-digit PIN and SMS it if the user has a phone number
    public async Task<(DetailedUserDto? User, string Pin)> InviteUser(InviteUserRequest request, string teamId, string invitedById)
    {
        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            return (null, string.Empty);

        var rawPin = GeneratePin();
        var pinHash = AuthService.HashPin(rawPin);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = string.Empty,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = Enum.Parse<UserRole>(request.Role),
            JobTitle = request.JobTitle,
            PhoneNumber = request.PhoneNumber,
            TeamId = teamId,
            Pin = pinHash,
            EmailVerified = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.UserCreated, $"User invited by {invitedById}");

        // SMS the PIN if a phone number is provided
        if (!string.IsNullOrEmpty(request.PhoneNumber))
        {
            try
            {
                await _smsService.SendSmsAsync(
                    request.PhoneNumber,
                    $"Welcome to FieldMind, {user.FirstName}! Your login PIN is: {rawPin}"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invitation SMS");
            }
        }

        return (await GetUserById(user.Id), rawPin);
    }

    // Send a fresh PIN to a user who forgot theirs (looked up by phone number)
    public async Task<bool> SendNewPin(string phoneNumber)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber && u.IsActive);
        if (user == null)
            return false;

        var rawPin = GeneratePin();
        user.Pin = AuthService.HashPin(rawPin);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.PasswordReset, "PIN reset via SMS");

        try
        {
            await _smsService.SendSmsAsync(
                phoneNumber,
                $"Hi {user.FirstName}, your new FieldMind PIN is: {rawPin}"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send new PIN SMS");
        }

        return true;
    }

    public async Task<bool> ChangePin(string userId, string newPin)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || !user.IsActive)
            return false;

        user.Pin = AuthService.HashPin(newPin);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.ProfileUpdated, "PIN changed by user");
        return true;
    }

    // Verify email
    public async Task<bool> VerifyEmail(string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
        if (user == null)
            return false;

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        await _context.SaveChangesAsync();

        await LogActivity(user.Id, ActivityType.EmailVerified, "Email verified");

        return true;
    }

    // Suspend user
    public async Task<bool> SuspendUser(string userId, string reason, string suspendedById)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return false;

        user.IsActive = false;
        user.SuspendedAt = DateTime.UtcNow;
        user.SuspensionReason = reason;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(userId, ActivityType.UserSuspended, $"User suspended: {reason}", suspendedById);

        // Revoke all refresh tokens
        var tokens = await _context.RefreshTokens.Where(rt => rt.UserId == userId).ToListAsync();
        _context.RefreshTokens.RemoveRange(tokens);
        await _context.SaveChangesAsync();

        return true;
    }

    // Activate user
    public async Task<bool> ActivateUser(string userId, string activatedById)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return false;

        user.IsActive = true;
        user.SuspendedAt = null;
        user.SuspensionReason = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(userId, ActivityType.UserActivated, "User activated", activatedById);

        return true;
    }

    // Delete user
    public async Task<bool> DeleteUser(string userId, string deletedById)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return false;

        await LogActivity(userId, ActivityType.UserDeleted, $"User deleted by {deletedById}", deletedById);

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return true;
    }

    // Get user activity
    public async Task<List<UserActivityDto>> GetUserActivity(string userId, int limit = 50)
    {
        var activities = await _context.UserActivityLogs
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new UserActivityDto
            {
                Id = a.Id,
                ActivityType = a.ActivityType.ToString(),
                Description = a.Description,
                IpAddress = a.IpAddress,
                UserAgent = a.UserAgent,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return activities;
    }

    // Update user preferences
    public async Task<UserPreferences?> UpdatePreferences(string userId, UserPreferences preferences)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return null;

        user.PreferencesJson = JsonSerializer.Serialize(preferences);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogActivity(userId, ActivityType.PreferencesUpdated, "Preferences updated");

        return preferences;
    }

    // Get user preferences
    public async Task<UserPreferences?> GetPreferences(string userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || string.IsNullOrEmpty(user.PreferencesJson))
            return new UserPreferences();

        return JsonSerializer.Deserialize<UserPreferences>(user.PreferencesJson);
    }

    // Update last login
    public async Task UpdateLastLogin(string userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    // Helper: Log activity
    private async Task LogActivity(string userId, ActivityType activityType, string description, string? performedById = null)
    {
        var log = new UserActivityLog
        {
            UserId = userId,
            ActivityType = activityType,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };

        if (!string.IsNullOrEmpty(performedById) && performedById != userId)
        {
            log.MetadataJson = JsonSerializer.Serialize(new { performedBy = performedById });
        }

        _context.UserActivityLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    // Helper: Generate 8-digit numeric PIN using a cryptographic RNG
    private static string GeneratePin()
    {
        Span<byte> bytes = stackalloc byte[4];
        RandomNumberGenerator.Fill(bytes);
        var value = (BitConverter.ToUInt32(bytes) % 100_000_000);
        return value.ToString("D8");
    }
}
