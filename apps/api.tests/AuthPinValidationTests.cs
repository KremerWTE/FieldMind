using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Controllers;
using FieldMind.Api.Models;
using FieldMind.Api.Services;
using FieldMind.Api.Tests.Helpers;
using Microsoft.Extensions.Configuration;

namespace FieldMind.Api.Tests;

/// <summary>
/// Tests for the AuthController PIN login endpoint validation rules.
/// </summary>
public class AuthPinValidationTests
{
    private AuthController CreateController()
    {
        var db = TestDbContext.Create();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:Secret"] = "test-secret-key-that-is-long-enough-for-hmac-sha256",
                ["JWT:ExpirationMinutes"] = "60",
                ["JWT:RefreshExpirationDays"] = "7",
            })
            .Build();

        var authService = new AuthService(db, config);

        var config2 = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var userService = new UserManagementService(
            db,
            null!, // EmailService - not called by LoginWithPin
            null!, // SmsService - not called by LoginWithPin
            Microsoft.Extensions.Logging.Abstractions.NullLogger<UserManagementService>.Instance,
            config2
        );

        return new AuthController(authService, userService);
    }

    [Theory]
    [InlineData("1234567")]      // 7 digits - too short
    [InlineData("123456789")]    // 9 digits - too long
    [InlineData("abcdefgh")]     // letters
    [InlineData("1234 678")]     // space in middle
    [InlineData("")]             // empty
    public async Task LoginWithPin_InvalidFormat_Returns400(string pin)
    {
        var ctrl = CreateController();

        var result = await ctrl.LoginWithPin(new LoginPinRequest(pin));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task LoginWithPin_ValidFormat_WrongPin_Returns401()
    {
        var ctrl = CreateController();

        var result = await ctrl.LoginWithPin(new LoginPinRequest("00000000"));

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }
}
