using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs.Photos;
using Hangfire;

namespace FieldMind.Api.Services;

public class PhotosService
{
    private readonly FieldMindDbContext _context;
    private readonly S3StorageService _s3Service;

    public PhotosService(FieldMindDbContext context, S3StorageService s3Service)
    {
        _context = context;
        _s3Service = s3Service;
    }

    public async Task<PresignUploadResponse> PresignUpload(
        string teamId,
        string userId,
        PresignUploadDto dto)
    {
        // Verify building and project belong to team
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == dto.BuildingId && b.TeamId == teamId);
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == dto.ProjectId && p.TeamId == teamId);

        if (building == null || project == null)
            throw new InvalidOperationException("Building or project not found");

        // Create photo record
        var photo = new Photo
        {
            BuildingId = dto.BuildingId,
            ProjectId = dto.ProjectId,
            FolderId = dto.FolderId,
            UploadedById = userId,
            S3Key = "", // Will be set below
            S3Url = "",
            AiStatus = AiStatus.Pending
        };

        _context.Photos.Add(photo);
        await _context.SaveChangesAsync();

        // Generate S3 key
        var s3Key = _s3Service.GenerateKey(teamId, dto.BuildingId, photo.Id, dto.Filename);

        // Generate presigned PUT URL
        var (uploadUrl, expiresIn) = await _s3Service.GeneratePresignedPutUrl(s3Key, dto.ContentType);

        // Update photo with S3 info
        photo.S3Key = s3Key;
        photo.S3Url = _s3Service.GetPublicUrl(s3Key);
        await _context.SaveChangesAsync();

        return new PresignUploadResponse
        {
            UploadUrl = uploadUrl,
            Key = s3Key,
            PhotoId = photo.Id,
            ExpiresIn = expiresIn
        };
    }

    public async Task<Photo> CompleteUpload(string userId, CompleteUploadDto dto)
    {
        var photo = await _context.Photos
            .FirstOrDefaultAsync(p => p.Id == dto.PhotoId);

        if (photo == null)
            throw new InvalidOperationException("Photo not found");

        photo.UploadedById = userId;
        photo.GeoLat = dto.GeoLat;
        photo.GeoLng = dto.GeoLng;
        photo.CapturedAt = dto.CapturedAt;
        photo.ExifJson = dto.ExifJson != null
            ? System.Text.Json.JsonSerializer.Serialize(dto.ExifJson)
            : null;

        await _context.SaveChangesAsync();

        // Enqueue AI analysis job
        BackgroundJob.Enqueue<Jobs.PhotoAIAnalysisJob>(job => job.ProcessPhotoAsync(photo.Id));
        Console.WriteLine($"📸 Photo {photo.Id} uploaded, AI analysis job enqueued");

        return photo;
    }

    public async Task<List<Photo>> GetPhotos(
        string teamId,
        string? buildingId = null,
        string? projectId = null,
        string? folderId = null,
        string? aiStatus = null)
    {
        var query = _context.Photos
            .Where(p => p.Building.TeamId == teamId);

        if (!string.IsNullOrEmpty(buildingId))
            query = query.Where(p => p.BuildingId == buildingId);

        if (!string.IsNullOrEmpty(projectId))
            query = query.Where(p => p.ProjectId == projectId);

        if (!string.IsNullOrEmpty(folderId))
            query = query.Where(p => p.FolderId == folderId);

        if (!string.IsNullOrEmpty(aiStatus) && Enum.TryParse<AiStatus>(aiStatus, true, out var status))
            query = query.Where(p => p.AiStatus == status);

        return await query
            .OrderByDescending(p => p.UploadedAt)
            .Take(50)
            .Include(p => p.UploadedBy)
            .Include(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .ToListAsync();
    }

    public async Task<object?> GetPhoto(string photoId, string teamId)
    {
        var photo = await _context.Photos
            .Include(p => p.Building)
            .Include(p => p.Project)
            .Include(p => p.Folder)
            .Include(p => p.UploadedBy)
            .Include(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .Include(p => p.MaintenanceEvent)
            .Include(p => p.Notes).ThenInclude(n => n.User)
            .Include(p => p.Tasks).ThenInclude(t => t.Assignee)
            .FirstOrDefaultAsync(p => p.Id == photoId && p.Building.TeamId == teamId);

        if (photo == null)
            return null;

        // Generate fresh presigned GET URL
        var viewUrl = await _s3Service.GeneratePresignedGetUrl(photo.S3Key);

        return new
        {
            photo,
            viewUrl
        };
    }

    public async Task<PhotoNote> CreateNote(string photoId, string userId, CreateNoteDto dto)
    {
        var note = new PhotoNote
        {
            PhotoId = photoId,
            UserId = userId,
            Content = dto.Content
        };

        _context.PhotoNotes.Add(note);
        await _context.SaveChangesAsync();

        // Reload with user
        return (await _context.PhotoNotes
            .Include(n => n.User)
            .FirstAsync(n => n.Id == note.Id))!;
    }

    public async Task<List<PhotoTask>> GetTasks(string photoId)
    {
        return await _context.PhotoTasks
            .Where(t => t.PhotoId == photoId)
            .Include(t => t.Assignee)
            .Include(t => t.CreatedBy)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<PhotoTask> CreateTask(string photoId, string userId, CreatePhotoTaskDto dto)
    {
        var task = new PhotoTask
        {
            PhotoId = photoId,
            CreatedById = userId,
            Title = dto.Title,
            Description = dto.Description,
            AssigneeId = dto.AssigneeId,
            DueDate = dto.DueDate
        };

        _context.PhotoTasks.Add(task);
        await _context.SaveChangesAsync();

        // Reload with relations
        return (await _context.PhotoTasks
            .Include(t => t.Assignee)
            .FirstAsync(t => t.Id == task.Id))!;
    }

    public async Task<PhotoTask?> UpdateTask(string taskId, UpdatePhotoTaskDto dto)
    {
        var task = await _context.PhotoTasks.FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return null;

        if (dto.Title != null) task.Title = dto.Title;
        if (dto.Description != null) task.Description = dto.Description;
        if (dto.Status != null && Enum.TryParse<Models.TaskStatus>(dto.Status, true, out var status))
            task.Status = status;
        if (dto.AssigneeId != null) task.AssigneeId = dto.AssigneeId;

        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return task;
    }

    public async Task<bool> DeletePhoto(string photoId, string teamId)
    {
        var photo = await _context.Photos
            .FirstOrDefaultAsync(p => p.Id == photoId && p.Building.TeamId == teamId);

        if (photo == null)
            return false;

        _context.Photos.Remove(photo);
        await _context.SaveChangesAsync();

        return true;
    }
}
