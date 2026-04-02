using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Security.Cryptography;
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

    // ── PropTrax Integration Config ───────────────────────────────────────────

    [HttpGet("proptrax-config")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPropTraxConfig()
    {
        var teamId = GetTeamId();
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == teamId);
        if (team == null) return NotFound();

        return Ok(new
        {
            HasApiKey = !string.IsNullOrEmpty(team.PropTraxApiKey),
            ApiKeyPreview = team.PropTraxApiKey != null
                ? team.PropTraxApiKey[..8] + "..." : null,
            WebhookUrl = team.PropTraxWebhookUrl,
        });
    }

    [HttpPut("proptrax-config")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdatePropTraxConfig([FromBody] UpdatePropTraxConfigDto dto)
    {
        var teamId = GetTeamId();
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == teamId);
        if (team == null) return NotFound();

        if (dto.WebhookUrl != null)
            team.PropTraxWebhookUrl = string.IsNullOrWhiteSpace(dto.WebhookUrl) ? null : dto.WebhookUrl.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { team.PropTraxWebhookUrl });
    }

    [HttpPost("proptrax-config/regenerate-key")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RegeneratePropTraxApiKey()
    {
        var teamId = GetTeamId();
        var team = await _context.Teams.FirstOrDefaultAsync(t => t.Id == teamId);
        if (team == null) return NotFound();

        // Generate a cryptographically secure API key: "ptx_" + 32 hex bytes
        var keyBytes = RandomNumberGenerator.GetBytes(32);
        team.PropTraxApiKey = "ptx_" + Convert.ToHexString(keyBytes).ToLowerInvariant();

        await _context.SaveChangesAsync();

        // Return the full key ONCE — cannot be retrieved again
        return Ok(new
        {
            ApiKey = team.PropTraxApiKey,
            Message = "Store this key securely — it will not be shown again."
        });
    }
}

public class UpdateTeamDto
{
    public string? Name { get; set; }
}

public class UpdatePropTraxConfigDto
{
    public string? WebhookUrl { get; set; }
}
