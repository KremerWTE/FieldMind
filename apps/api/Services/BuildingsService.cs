using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs.Buildings;

namespace FieldMind.Api.Services;

public class BuildingsService
{
    private readonly FieldMindDbContext _context;

    public BuildingsService(FieldMindDbContext context)
    {
        _context = context;
    }

    public async Task<Building> CreateBuilding(string teamId, CreateBuildingDto dto)
    {
        var building = new Building
        {
            Name = dto.Name,
            Address = dto.Address,
            PropTraxBuildingId = dto.PropTraxBuildingId,
            GeoLat = dto.GeoLat,
            GeoLng = dto.GeoLng,
            MetadataJson = dto.MetadataJson != null
                ? System.Text.Json.JsonSerializer.Serialize(dto.MetadataJson)
                : null,
            TeamId = teamId
        };

        _context.Buildings.Add(building);
        await _context.SaveChangesAsync();

        return building;
    }

    public async Task<BuildingListResponse> GetBuildings(string teamId, int page = 1, int limit = 20)
    {
        var skip = (page - 1) * limit;

        var query = _context.Buildings
            .Where(b => b.TeamId == teamId);

        var total = await query.CountAsync();

        var buildings = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Select(b => new BuildingDto
            {
                Id = b.Id,
                Name = b.Name,
                Address = b.Address,
                PropTraxBuildingId = b.PropTraxBuildingId,
                GeoLat = b.GeoLat,
                GeoLng = b.GeoLng,
                TeamId = b.TeamId,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt,
                PhotoCount = b.Photos.Count,
                MaintenanceEventCount = b.MaintenanceEvents.Count
            })
            .ToListAsync();

        return new BuildingListResponse
        {
            Data = buildings,
            Meta = new PaginationMeta
            {
                Total = total,
                Page = page,
                Limit = limit,
                TotalPages = (int)Math.Ceiling(total / (double)limit)
            }
        };
    }

    public async Task<Building?> GetBuilding(string id, string teamId)
    {
        return await _context.Buildings
            .Include(b => b.Projects)
            .FirstOrDefaultAsync(b => b.Id == id && b.TeamId == teamId);
    }

    public async Task<Building?> UpdateBuilding(string id, string teamId, UpdateBuildingDto dto)
    {
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == id && b.TeamId == teamId);

        if (building == null)
            return null;

        if (dto.Name != null) building.Name = dto.Name;
        if (dto.Address != null) building.Address = dto.Address;
        if (dto.PropTraxBuildingId != null) building.PropTraxBuildingId = dto.PropTraxBuildingId;
        if (dto.GeoLat.HasValue) building.GeoLat = dto.GeoLat;
        if (dto.GeoLng.HasValue) building.GeoLng = dto.GeoLng;
        if (dto.MetadataJson != null)
            building.MetadataJson = System.Text.Json.JsonSerializer.Serialize(dto.MetadataJson);

        building.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return building;
    }

    public async Task<object> GetBuildingPhotos(string buildingId, string teamId, int page = 1, int limit = 50)
    {
        var skip = (page - 1) * limit;

        var query = _context.Photos
            .Where(p => p.BuildingId == buildingId && p.Building.TeamId == teamId);

        var total = await query.CountAsync();

        var photos = await query
            .OrderByDescending(p => p.UploadedAt)
            .Skip(skip)
            .Take(limit)
            .Include(p => p.UploadedBy)
            .Include(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .ToListAsync();

        return new
        {
            data = photos,
            meta = new
            {
                total,
                page,
                limit,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            }
        };
    }

    public async Task<List<object>> GetAllMaintenanceEvents(string teamId, string? severity, string? status, int limit)
    {
        var query = _context.MaintenanceEvents
            .Where(me => me.Building.TeamId == teamId)
            .Include(me => me.Building)
            .AsQueryable();

        if (!string.IsNullOrEmpty(severity) && Enum.TryParse<IssueSeverity>(severity, true, out var sev))
            query = query.Where(me => me.Severity == sev);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<MaintenanceEventStatus>(status, true, out var st))
            query = query.Where(me => me.Status == st);

        var events = await query
            .OrderByDescending(me => me.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return events.Select(me => (object)new
        {
            me.Id,
            me.Title,
            me.Description,
            me.Type,
            me.Severity,
            me.Status,
            me.DetectedBy,
            me.CreatedAt,
            me.ResolvedAt,
            me.ResolutionNotes,
            BuildingId = me.BuildingId,
            BuildingName = me.Building?.Name,
        }).ToList();
    }

    public async Task<MaintenanceEvent?> ResolveMaintenanceEvent(string eventId, string teamId, MaintenanceEventStatus newStatus, string? resolutionNotes)
    {
        var evt = await _context.MaintenanceEvents
            .Include(me => me.Building)
            .FirstOrDefaultAsync(me => me.Id == eventId && me.Building.TeamId == teamId);

        if (evt == null) return null;

        evt.Status = newStatus;
        evt.ResolutionNotes = resolutionNotes;
        if (newStatus == MaintenanceEventStatus.Resolved)
            evt.ResolvedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return evt;
    }

    public async Task<List<MaintenanceEvent>> GetBuildingMaintenanceEvents(string buildingId, string teamId)
    {
        return await _context.MaintenanceEvents
            .Where(me => me.BuildingId == buildingId && me.Building.TeamId == teamId)
            .OrderByDescending(me => me.CreatedAt)
            .Include(me => me.RelatedPhotos.Take(1))
            .ToListAsync();
    }

    public async Task<object> GetBuildingHealthStats(string buildingId, string teamId)
    {
        var stats = await _context.BuildingHealthStats
            .Where(s => s.BuildingId == buildingId && s.Building.TeamId == teamId)
            .OrderByDescending(s => s.RecordedAt)
            .ToListAsync();

        // Group by metric type and return latest values
        var grouped = stats
            .GroupBy(s => s.MetricType)
            .Select(g => g.OrderByDescending(s => s.RecordedAt).First())
            .ToList();

        return grouped;
    }
}
