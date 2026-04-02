using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs.UserManagement;
using System.Security.Claims;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("profile")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly UserManagementService _userService;

    public UserProfileController(UserManagementService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var user = await _userService.GetUserById(userId);

        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var user = await _userService.UpdateProfile(userId, request);

        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    [HttpPost("change-pin")]
    public async Task<IActionResult> ChangePin([FromBody] ChangePinRequest request)
    {
        if (string.IsNullOrEmpty(request.Pin) || request.Pin.Length != 8 || !request.Pin.All(char.IsDigit))
            return BadRequest(new { message = "PIN must be exactly 8 digits." });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var success = await _userService.ChangePin(userId, request.Pin);

        if (!success)
            return NotFound(new { message = "User not found" });

        return Ok(new { message = "PIN updated successfully." });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var success = await _userService.ChangePassword(userId, request);

        if (!success)
            return BadRequest(new { message = "Current password is incorrect" });

        return Ok(new { message = "Password changed successfully" });
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity([FromQuery] int limit = 50)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var activities = await _userService.GetUserActivity(userId, limit);
        return Ok(activities);
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var preferences = await _userService.GetPreferences(userId);
        return Ok(preferences);
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UserPreferences preferences)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var updated = await _userService.UpdatePreferences(userId, preferences);

        if (updated == null)
            return NotFound(new { message = "User not found" });

        return Ok(updated);
    }
}
