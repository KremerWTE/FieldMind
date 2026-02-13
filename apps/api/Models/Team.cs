using System;
using System.Collections.Generic;

namespace FieldMind.Api.Models;

public class Team
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Building> Buildings { get; set; } = new List<Building>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
