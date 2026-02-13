using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs.Buildings;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("buildings")]
[Authorize]
public class BuildingsController : ControllerBase
{
    private readonly BuildingsService _buildingsService;

    public BuildingsController(BuildingsService buildingsService)
    {
        _buildingsService = buildingsService;
    }

    private string GetTeamId()
    {
        return User.FindFirst("teamId")?.Value
            ?? throw new UnauthorizedAccessException("Team ID not found in token");
    }

    [HttpPost]
    public async Task<IActionResult> CreateBuilding([FromBody] CreateBuildingDto dto)
    {
        var teamId = GetTeamId();
        var building = await _buildingsService.CreateBuilding(teamId, dto);
        return Ok(building);
    }

    [HttpGet]
    public async Task<IActionResult> GetBuildings([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var teamId = GetTeamId();
        var result = await _buildingsService.GetBuildings(teamId, page, limit);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBuilding(string id)
    {
        var teamId = GetTeamId();
        var building = await _buildingsService.GetBuilding(id, teamId);

        if (building == null)
            return NotFound(new { message = "Building not found" });

        return Ok(building);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateBuilding(string id, [FromBody] UpdateBuildingDto dto)
    {
        var teamId = GetTeamId();
        var building = await _buildingsService.UpdateBuilding(id, teamId, dto);

        if (building == null)
            return NotFound(new { message = "Building not found" });

        return Ok(building);
    }

    [HttpGet("{id}/photos")]
    public async Task<IActionResult> GetBuildingPhotos(
        string id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var teamId = GetTeamId();
        var result = await _buildingsService.GetBuildingPhotos(id, teamId, page, limit);
        return Ok(result);
    }

    [HttpGet("{id}/maintenance-events")]
    public async Task<IActionResult> GetBuildingMaintenanceEvents(string id)
    {
        var teamId = GetTeamId();
        var events = await _buildingsService.GetBuildingMaintenanceEvents(id, teamId);
        return Ok(events);
    }

    [HttpGet("{id}/health-stats")]
    public async Task<IActionResult> GetBuildingHealthStats(string id)
    {
        var teamId = GetTeamId();
        var stats = await _buildingsService.GetBuildingHealthStats(id, teamId);
        return Ok(stats);
    }
}
