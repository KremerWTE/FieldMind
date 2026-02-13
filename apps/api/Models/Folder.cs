using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public class Folder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;

    public string ProjectId { get; set; } = string.Empty;
    public Project Project { get; set; } = null!;

    public ICollection<Photo> Photos { get; set; } = new List<Photo>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
