using System;

namespace FieldMind.Api.Models;

public class PhotoNote
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string PhotoId { get; set; } = string.Empty;
    public Photo Photo { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
