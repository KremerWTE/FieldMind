namespace FieldMind.Api.DTOs.Buildings;

public class CreateBuildingDto
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? PropTraxBuildingId { get; set; }
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public object? MetadataJson { get; set; }
}

public class UpdateBuildingDto
{
    public string? Name { get; set; }
    public string? Address { get; set; }
    public string? PropTraxBuildingId { get; set; }
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public object? MetadataJson { get; set; }
}

public class BuildingDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? PropTraxBuildingId { get; set; }
    public double? GeoLat { get; set; }
    public double? GeoLng { get; set; }
    public object? MetadataJson { get; set; }
    public string TeamId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int PhotoCount { get; set; }
    public int MaintenanceEventCount { get; set; }
}

public class BuildingListResponse
{
    public List<BuildingDto> Data { get; set; } = new();
    public PaginationMeta Meta { get; set; } = new();
}

public class PaginationMeta
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
}
