using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.Register(request);
        if (result == null)
        {
            return BadRequest(new { message = "Email already in use" });
        }

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.Login(request);
        if (result == null)
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var result = await _authService.RefreshToken(request.RefreshToken);
        if (result == null)
        {
            return Unauthorized(new { message = "Invalid refresh token" });
        }

        return Ok(result);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _authService.Logout(request.RefreshToken);
        return Ok(new { message = "Logged out successfully" });
    }
}
