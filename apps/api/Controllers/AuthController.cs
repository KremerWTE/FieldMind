using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs;
using FieldMind.Api.DTOs.UserManagement;
using System.ComponentModel.DataAnnotations;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly UserManagementService _userService;

    public AuthController(AuthService authService, UserManagementService userService)
    {
        _authService = authService;
        _userService = userService;
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

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        await _userService.InitiatePasswordReset(request.Email);
        // Always return success to prevent email enumeration
        return Ok(new { message = "If an account with that email exists, a password reset link has been sent" });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var success = await _userService.ResetPassword(request.Token, request.NewPassword);

        if (!success)
            return BadRequest(new { message = "Invalid or expired reset token" });

        return Ok(new { message = "Password reset successfully" });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var success = await _userService.VerifyEmail(request.Token);

        if (!success)
            return BadRequest(new { message = "Invalid verification token" });

        return Ok(new { message = "Email verified successfully" });
    }

    [HttpPost("login-pin")]
    public async Task<IActionResult> LoginWithPin([FromBody] LoginPinRequest request)
    {
        if (string.IsNullOrEmpty(request.Pin) || request.Pin.Length != 8 || !request.Pin.All(char.IsDigit))
            return BadRequest(new { message = "PIN must be exactly 8 digits." });

        var result = await _authService.LoginWithPin(request.Pin);
        if (result == null)
            return Unauthorized(new { message = "Invalid PIN." });

        return Ok(result);
    }

    [HttpPost("forgot-pin")]
    public async Task<IActionResult> ForgotPin([FromBody] ForgotPinRequest request)
    {
        await _userService.SendNewPin(request.PhoneNumber);
        // Always return success to prevent enumeration
        return Ok(new { message = "If a matching account exists, a new PIN has been sent to that number." });
    }
}

public record LoginPinRequest([Required] string Pin);
public record ForgotPinRequest([Required] string PhoneNumber);
