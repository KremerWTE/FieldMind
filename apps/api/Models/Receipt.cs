namespace FieldMind.Api.Models;

public class Receipt
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TeamId { get; set; } = string.Empty;
    public Team Team { get; set; } = null!;

    public string UploadedById { get; set; } = string.Empty;
    public User UploadedBy { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;  // local path or S3 URL
    public long FileSizeBytes { get; set; }

    public decimal? Amount { get; set; }
    public string? Vendor { get; set; }
    public string? Category { get; set; }   // fuel, materials, equipment, meals, other
    public string? Description { get; set; }
    public string? BuildingId { get; set; }
    public string? ProjectId { get; set; }

    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
