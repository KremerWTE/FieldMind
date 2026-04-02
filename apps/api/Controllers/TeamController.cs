using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FieldMind.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("team")]
[Authorize]
public class TeamController : ControllerBase
{
    private readonly FieldMindDbContext _context;

    public TeamController(FieldMindDbContext context)
    {
        _context = context;
    }

    private string GetTeamId() =>
        User.FindFirst("teamId")?.Value
            ?? throw new UnauthorizedAccessException("Team ID not found in token");

    [HttpGet]
    public async Task<IActionResult> GetTeam()
    {
        var teamId = GetTeamId();
        var team = await _context.Teams
            .Include(t => t.Users)
            .FirstOrDefaultAsync(t => t.Id == teamId);

        if (team == null) return NotFound();

        return Ok(new
        {
            team.Id,
            team.Name,
            team.Slug,
            team.CreatedAt,
            MemberCount = team.Users.Count(u => u.IsActive),
        });
    }

    [HttpPatch]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTeam([FromBody] UpdateTeamDto dto)
    {
        var teamId = GetTeamId();
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == teamId);

        if (team == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name))
            team.Name = dto.Name.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { team.Id, team.Name, team.Slug });
    }
}

public class UpdateTeamDto
{
    public string? Name { get; set; }
}
