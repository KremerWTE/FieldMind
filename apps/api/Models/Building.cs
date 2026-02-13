using System;
using System.Collections.Generic;
using System.Text.Json;

namespace FieldMind.Api.Models;

public class Building
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? PropTraxBuildingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public string? MetadataJson { get; set; }

    public string TeamId { get; set; } = string.Empty;
    public Team Team { get; set; } = null!;

    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<Photo> Photos { get; set; } = new List<Photo>();
    public ICollection<MaintenanceEvent> MaintenanceEvents { get; set; } = new List<MaintenanceEvent>();
    public ICollection<BuildingHealthStat> HealthStats { get; set; } = new List<BuildingHealthStat>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
