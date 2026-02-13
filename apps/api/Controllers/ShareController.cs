using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using System.Security.Claims;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class ShareController : ControllerBase
{
    private readonly ShareService _shareService;
    private readonly ILogger<ShareController> _logger;

    public ShareController(ShareService shareService, ILogger<ShareController> logger)
    {
        _shareService = shareService;
        _logger = logger;
    }

    private string GetTeamId() => User.FindFirst("teamId")?.Value
        ?? throw new UnauthorizedAccessException("Team ID not found in token");

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found in token");

    [HttpPost("links")]
    [Authorize]
    public async Task<IActionResult> CreateShareLink([FromBody] CreateShareLinkDto dto)
    {
        try
        {
            var teamId = GetTeamId();
            var userId = GetUserId();

            var shareLink = await _shareService.CreateShareLink(teamId, userId, dto);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var shareUrl = $"{baseUrl}/share/{shareLink.Token}";

            return Ok(new
            {
                shareLink = new
                {
                    shareLink.Id,
                    shareLink.Token,
                    shareLink.Scope,
                    shareLink.ScopeId,
                    shareLink.ExpiresAt,
                    shareLink.Title,
                    shareLink.Description,
                    shareLink.CreatedAt,
                    hasPassword = !string.IsNullOrEmpty(shareLink.PasswordHash)
                },
                shareUrl,
                message = "Share link created successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating share link");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("links")]
    [Authorize]
    public async Task<IActionResult> GetMyShareLinks()
    {
        try
        {
            var userId = GetUserId();
            var links = await _shareService.GetUserShareLinks(userId);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var linksWithUrls = links.Select(link => new
            {
                link.Id,
                link.Token,
                link.Scope,
                link.ScopeId,
                link.Title,
                link.Description,
                link.ExpiresAt,
                link.CreatedAt,
                link.ViewCount,
                link.LastAccessedAt,
                hasPassword = !string.IsNullOrEmpty(link.PasswordHash),
                shareUrl = $"{baseUrl}/share/{link.Token}",
                isExpired = link.ExpiresAt.HasValue && link.ExpiresAt.Value < DateTime.UtcNow
            });

            return Ok(new { links = linksWithUrls });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting share links");
            return StatusCode(500, new { error = "Failed to get share links" });
        }
    }

    [HttpDelete("links/{token}")]
    [Authorize]
    public async Task<IActionResult> RevokeShareLink(string token)
    {
        try
        {
            var userId = GetUserId();
            var success = await _shareService.RevokeShareLink(token, userId);

            if (!success)
                return NotFound(new { error = "Share link not found or access denied" });

            return Ok(new { message = "Share link revoked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking share link");
            return StatusCode(500, new { error = "Failed to revoke share link" });
        }
    }

    [HttpGet("{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSharedGallery(string token, [FromQuery] string? password = null)
    {
        try
        {
            var link = await _shareService.GetShareLinkByToken(token);

            if (link == null)
                return NotFound(new { error = "Share link not found or expired" });

            // Check password if required
            if (!string.IsNullOrEmpty(link.PasswordHash))
            {
                if (!_shareService.ValidatePassword(link, password))
                {
                    return Unauthorized(new
                    {
                        error = "Password required",
                        requiresPassword = true
                    });
                }
            }

            // Get gallery content
            var content = await _shareService.GetSharedContent(link);

            return Ok(new
            {
                shareInfo = new
                {
                    link.Title,
                    link.Description,
                    link.CreatedAt,
                    createdBy = new
                    {
                        link.CreatedBy.FirstName,
                        link.CreatedBy.LastName
                    }
                },
                content
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shared gallery for token {Token}", token);
            return StatusCode(500, new { error = "Failed to load gallery" });
        }
    }

    [HttpPost("{token}/validate-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidatePassword(string token, [FromBody] PasswordValidationDto dto)
    {
        try
        {
            var link = await _shareService.GetShareLinkByToken(token);

            if (link == null)
                return NotFound(new { error = "Share link not found or expired" });

            var isValid = _shareService.ValidatePassword(link, dto.Password);

            return Ok(new { valid = isValid });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating password for token {Token}", token);
            return StatusCode(500, new { error = "Validation failed" });
        }
    }
}

public class PasswordValidationDto
{
    public string Password { get; set; } = string.Empty;
}
