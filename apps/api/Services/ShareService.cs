using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using System.Security.Cryptography;
using System.Text;

namespace FieldMind.Api.Services;

public class CreateShareLinkDto
{
    public string Scope { get; set; } = string.Empty; // "building", "project", "folder"
    public string ScopeId { get; set; } = string.Empty;
    public string? Password { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
}

public class ShareService
{
    private readonly FieldMindDbContext _context;
    private readonly S3StorageService _s3Service;
    private readonly ILogger<ShareService> _logger;

    public ShareService(
        FieldMindDbContext context,
        S3StorageService s3Service,
        ILogger<ShareService> logger)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
    }

    public async Task<ShareLink> CreateShareLink(string teamId, string userId, CreateShareLinkDto dto)
    {
        // Validate scope exists and belongs to team
        await ValidateScope(teamId, dto.Scope, dto.ScopeId);

        // Generate unique token
        var token = GenerateToken();

        // Hash password if provided
        string? passwordHash = null;
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }

        // Parse scope string to enum
        if (!Enum.TryParse<ShareScope>(dto.Scope, true, out var scopeEnum))
        {
            throw new InvalidOperationException($"Invalid scope: {dto.Scope}. Must be 'building', 'project', or 'folder'");
        }

        var shareLink = new ShareLink
        {
            Token = token,
            Scope = scopeEnum,
            ScopeId = dto.ScopeId,
            CreatedById = userId,
            TeamId = teamId,
            PasswordHash = passwordHash,
            ExpiresAt = dto.ExpiresAt,
            Title = dto.Title,
            Description = dto.Description
        };

        _context.ShareLinks.Add(shareLink);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created share link {Token} for {Scope} {ScopeId} by user {UserId}",
            token, dto.Scope, dto.ScopeId, userId);

        return shareLink;
    }

    public async Task<ShareLink?> GetShareLinkByToken(string token)
    {
        var link = await _context.ShareLinks
            .Include(sl => sl.CreatedBy)
            .FirstOrDefaultAsync(sl => sl.Token == token);

        if (link == null)
            return null;

        // Check if expired
        if (link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow)
        {
            _logger.LogWarning("Share link {Token} is expired", token);
            return null;
        }

        // Increment view count
        link.ViewCount++;
        link.LastAccessedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return link;
    }

    public bool ValidatePassword(ShareLink link, string? password)
    {
        if (string.IsNullOrEmpty(link.PasswordHash))
            return true; // No password required

        if (string.IsNullOrEmpty(password))
            return false; // Password required but not provided

        return BCrypt.Net.BCrypt.Verify(password, link.PasswordHash);
    }

    public async Task<object?> GetSharedContent(ShareLink link)
    {
        switch (link.Scope)
        {
            case ShareScope.Building:
                return await GetBuildingGallery(link.ScopeId);
            case ShareScope.Project:
                return await GetProjectGallery(link.ScopeId);
            case ShareScope.Folder:
                return await GetFolderGallery(link.ScopeId);
            default:
                return null;
        }
    }

    private async Task<object> GetBuildingGallery(string buildingId)
    {
        var building = await _context.Buildings
            .Include(b => b.Photos.OrderByDescending(p => p.UploadedAt).Take(100))
            .ThenInclude(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building == null)
            return new { error = "Building not found" };

        var photosWithUrls = new List<object>();

        foreach (var photo in building.Photos)
        {
            var viewUrl = await _s3Service.GeneratePresignedGetUrl(photo.S3Key, expiresIn: 3600);
            var annotation = photo.AiAnnotations.FirstOrDefault();

            photosWithUrls.Add(new
            {
                photo.Id,
                photo.CapturedAt,
                photo.UploadedAt,
                viewUrl,
                aiAnnotation = annotation != null ? new
                {
                    annotation.ShortDescription,
                    annotation.Tags,
                    annotation.Categories,
                    annotation.SeverityScore
                } : null
            });
        }

        return new
        {
            scope = "building",
            building = new
            {
                building.Id,
                building.Name,
                building.Address
            },
            photos = photosWithUrls,
            totalPhotos = photosWithUrls.Count
        };
    }

    private async Task<object> GetProjectGallery(string projectId)
    {
        var project = await _context.Projects
            .Include(p => p.Building)
            .Include(p => p.Photos.OrderByDescending(ph => ph.UploadedAt).Take(100))
            .ThenInclude(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .Include(p => p.Photos)
            .ThenInclude(p => p.Folder)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
            return new { error = "Project not found" };

        var photosWithUrls = new List<object>();

        foreach (var photo in project.Photos)
        {
            var viewUrl = await _s3Service.GeneratePresignedGetUrl(photo.S3Key, expiresIn: 3600);
            var annotation = photo.AiAnnotations.FirstOrDefault();

            photosWithUrls.Add(new
            {
                photo.Id,
                photo.CapturedAt,
                photo.UploadedAt,
                folder = photo.Folder != null ? new { photo.Folder.Id, photo.Folder.Name } : null,
                viewUrl,
                aiAnnotation = annotation != null ? new
                {
                    annotation.ShortDescription,
                    annotation.Tags,
                    annotation.Categories,
                    annotation.SeverityScore
                } : null
            });
        }

        return new
        {
            scope = "project",
            project = new
            {
                project.Id,
                project.Name,
                project.ClientName
            },
            building = new
            {
                project.Building.Id,
                project.Building.Name,
                project.Building.Address
            },
            photos = photosWithUrls,
            totalPhotos = photosWithUrls.Count
        };
    }

    private async Task<object> GetFolderGallery(string folderId)
    {
        var folder = await _context.Folders
            .Include(f => f.Project)
            .ThenInclude(p => p.Building)
            .Include(f => f.Photos.OrderByDescending(p => p.UploadedAt).Take(100))
            .ThenInclude(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .FirstOrDefaultAsync(f => f.Id == folderId);

        if (folder == null)
            return new { error = "Folder not found" };

        var photosWithUrls = new List<object>();

        foreach (var photo in folder.Photos)
        {
            var viewUrl = await _s3Service.GeneratePresignedGetUrl(photo.S3Key, expiresIn: 3600);
            var annotation = photo.AiAnnotations.FirstOrDefault();

            photosWithUrls.Add(new
            {
                photo.Id,
                photo.CapturedAt,
                photo.UploadedAt,
                viewUrl,
                aiAnnotation = annotation != null ? new
                {
                    annotation.ShortDescription,
                    annotation.Tags,
                    annotation.Categories,
                    annotation.SeverityScore
                } : null
            });
        }

        return new
        {
            scope = "folder",
            folder = new
            {
                folder.Id,
                folder.Name
            },
            project = new
            {
                folder.Project.Id,
                folder.Project.Name
            },
            building = new
            {
                folder.Project.Building.Id,
                folder.Project.Building.Name,
                folder.Project.Building.Address
            },
            photos = photosWithUrls,
            totalPhotos = photosWithUrls.Count
        };
    }

    public async Task<List<ShareLink>> GetUserShareLinks(string userId)
    {
        return await _context.ShareLinks
            .Where(sl => sl.CreatedById == userId)
            .OrderByDescending(sl => sl.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> RevokeShareLink(string token, string userId)
    {
        var link = await _context.ShareLinks
            .FirstOrDefaultAsync(sl => sl.Token == token && sl.CreatedById == userId);

        if (link == null)
            return false;

        _context.ShareLinks.Remove(link);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Revoked share link {Token} by user {UserId}", token, userId);

        return true;
    }

    private async Task ValidateScope(string teamId, string scope, string scopeId)
    {
        switch (scope.ToLower())
        {
            case "building":
                var building = await _context.Buildings
                    .FirstOrDefaultAsync(b => b.Id == scopeId && b.TeamId == teamId);
                if (building == null)
                    throw new InvalidOperationException("Building not found or access denied");
                break;

            case "project":
                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Id == scopeId && p.TeamId == teamId);
                if (project == null)
                    throw new InvalidOperationException("Project not found or access denied");
                break;

            case "folder":
                var folder = await _context.Folders
                    .Include(f => f.Project)
                    .FirstOrDefaultAsync(f => f.Id == scopeId && f.Project.TeamId == teamId);
                if (folder == null)
                    throw new InvalidOperationException("Folder not found or access denied");
                break;

            default:
                throw new InvalidOperationException($"Invalid scope: {scope}");
        }
    }

    private string GenerateToken()
    {
        // Generate a secure random token (URL-safe)
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);

        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .Replace("=", "");
    }
}
