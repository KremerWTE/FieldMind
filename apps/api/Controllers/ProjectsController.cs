using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs.Projects;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly ProjectsService _projectsService;

    public ProjectsController(ProjectsService projectsService)
    {
        _projectsService = projectsService;
    }

    private string GetTeamId()
    {
        return User.FindFirst("teamId")?.Value
            ?? throw new UnauthorizedAccessException("Team ID not found in token");
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectDto dto)
    {
        try
        {
            var teamId = GetTeamId();
            var project = await _projectsService.CreateProject(teamId, dto);
            return Ok(project);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects([FromQuery] string? status)
    {
        var teamId = GetTeamId();
        ProjectStatus? statusEnum = null;

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ProjectStatus>(status, true, out var parsed))
            statusEnum = parsed;

        var projects = await _projectsService.GetProjects(teamId, statusEnum);
        return Ok(projects);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProject(string id)
    {
        var teamId = GetTeamId();
        var project = await _projectsService.GetProject(id, teamId);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        return Ok(project);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateProject(string id, [FromBody] UpdateProjectDto dto)
    {
        var teamId = GetTeamId();
        var project = await _projectsService.UpdateProject(id, teamId, dto);

        if (project == null)
            return NotFound(new { message = "Project not found" });

        return Ok(project);
    }

    [HttpGet("{id}/folders")]
    public async Task<IActionResult> GetFolders(string id)
    {
        var teamId = GetTeamId();
        var folders = await _projectsService.GetFolders(id, teamId);
        return Ok(folders);
    }

    [HttpPost("{id}/folders")]
    public async Task<IActionResult> CreateFolder(string id, [FromBody] CreateFolderDto dto)
    {
        try
        {
            var teamId = GetTeamId();
            var folder = await _projectsService.CreateFolder(id, teamId, dto);
            return Ok(folder);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
