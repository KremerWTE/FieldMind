using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs.UserManagement;
using System.Security.Claims;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManagementService _userService;

    public UsersController(UserManagementService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,PM")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? teamId = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (users, totalCount) = await _userService.GetUsers(teamId, role, isActive, search, page, pageSize);

        return Ok(new
        {
            users,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            }
        });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,PM")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _userService.GetUserById(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    [HttpPost("invite")]
    [Authorize(Roles = "Admin,PM")]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var teamId = User.FindFirst("teamId")?.Value!;

        var (user, rawPin) = await _userService.InviteUser(request, teamId, userId);
        if (user == null)
            return BadRequest(new { message = "Email already in use" });

        return Ok(new { user, pin = rawPin });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userService.UpdateUser(id, request, userId);

        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    [HttpPost("{id}/suspend")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SuspendUser(string id, [FromBody] SuspendUserRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var success = await _userService.SuspendUser(id, request.Reason, userId);

        if (!success)
            return NotFound(new { message = "User not found" });

        return Ok(new { message = "User suspended successfully" });
    }

    [HttpPost("{id}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActivateUser(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var success = await _userService.ActivateUser(id, userId);

        if (!success)
            return NotFound(new { message = "User not found" });

        return Ok(new { message = "User activated successfully" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var success = await _userService.DeleteUser(id, userId);

        if (!success)
            return NotFound(new { message = "User not found" });

        return Ok(new { message = "User deleted successfully" });
    }

    [HttpGet("{id}/activity")]
    [Authorize(Roles = "Admin,PM")]
    public async Task<IActionResult> GetUserActivity(string id, [FromQuery] int limit = 50)
    {
        var activities = await _userService.GetUserActivity(id, limit);
        return Ok(activities);
    }
}
