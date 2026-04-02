using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using FieldMind.Api.Models;
using FieldMind.Api.Services;
using FieldMind.Api.Tests.Helpers;

namespace FieldMind.Api.Tests;

public class AuthServiceTests
{
    private AuthService CreateService(FieldMind.Api.Data.FieldMindDbContext db)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT:Secret"] = "test-secret-key-that-is-long-enough-for-hmac-sha256",
                ["JWT:ExpirationMinutes"] = "60",
                ["JWT:RefreshExpirationDays"] = "7",
            })
            .Build();

        return new AuthService(db, config);
    }

    // ── PIN Hashing ─────────────────────────────────────────────────────────────

    [Fact]
    public void HashPin_ProducesDeterministicHexString()
    {
        var hash1 = AuthService.HashPin("12345678");
        var hash2 = AuthService.HashPin("12345678");

        hash1.Should().Be(hash2);
        hash1.Should().HaveLength(64); // SHA-256 = 32 bytes = 64 hex chars
        hash1.Should().MatchRegex("^[0-9a-f]+$");
    }

    [Fact]
    public void HashPin_DifferentPinsProduceDifferentHashes()
    {
        var hash1 = AuthService.HashPin("12345678");
        var hash2 = AuthService.HashPin("87654321");

        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void HashPin_MatchesManualSha256()
    {
        var pin = "12345678";
        var expected = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pin))).ToLowerInvariant();

        AuthService.HashPin(pin).Should().Be(expected);
    }

    // ── PIN Login ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginWithPin_ValidPin_ReturnsAuthResponse()
    {
        using var db = TestDbContext.Create();
        var team = new Team { Name = "Test Team", Slug = "test-team" };
        db.Teams.Add(team);

        var user = new User
        {
            Email = "tech@example.com",
            FirstName = "Alice",
            LastName = "Smith",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("unused"),
            Pin = AuthService.HashPin("12345678"),
            Role = UserRole.FieldTech,
            IsActive = true,
            TeamId = team.Id,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.LoginWithPin("12345678");

        result.Should().NotBeNull();
        result!.AccessToken.Should().NotBeNullOrEmpty();
        result.User.Email.Should().Be("tech@example.com");
    }

    [Fact]
    public async Task LoginWithPin_WrongPin_ReturnsNull()
    {
        using var db = TestDbContext.Create();
        var team = new Team { Name = "Test Team", Slug = "test-team" };
        db.Teams.Add(team);

        var user = new User
        {
            Email = "tech@example.com",
            FirstName = "Bob",
            LastName = "Jones",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("unused"),
            Pin = AuthService.HashPin("12345678"),
            Role = UserRole.FieldTech,
            IsActive = true,
            TeamId = team.Id,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.LoginWithPin("99999999");

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginWithPin_InactiveUser_ReturnsNull()
    {
        using var db = TestDbContext.Create();
        var team = new Team { Name = "Test Team", Slug = "test-team" };
        db.Teams.Add(team);

        var user = new User
        {
            Email = "suspended@example.com",
            FirstName = "Dave",
            LastName = "Doe",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("unused"),
            Pin = AuthService.HashPin("12345678"),
            Role = UserRole.FieldTech,
            IsActive = false, // suspended
            TeamId = team.Id,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var result = await service.LoginWithPin("12345678");

        result.Should().BeNull();
    }
}
