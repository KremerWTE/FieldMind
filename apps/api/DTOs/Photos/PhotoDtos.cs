namespace FieldMind.Api.DTOs.Photos;

public class PresignUploadDto
{
    public string BuildingId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string? FolderId { get; set; }
    public string Filename { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
}

public class PresignUploadResponse
{
    public string UploadUrl { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string PhotoId { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
}

public class CompleteUploadDto
{
    public string PhotoId { get; set; } = string.Empty;
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public DateTime? CapturedAt { get; set; }
    public object? ExifJson { get; set; }
}

public class CreateNoteDto
{
    public string Content { get; set; } = string.Empty;
}

public class CreatePhotoTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AssigneeId { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdatePhotoTaskDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? AssigneeId { get; set; }
}
