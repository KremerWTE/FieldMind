using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.Tests.Helpers;

namespace FieldMind.Api.Tests;

public class DbSeederTests
{
    private static async Task<FieldMindDbContext> SeedFresh()
    {
        var db = TestDbContext.Create();
        var seeder = new DbSeeder(db, NullLogger<DbSeeder>.Instance);
        await seeder.SeedAsync();
        return db;
    }

    [Fact]
    public async Task Seed_CreatesOneTeam()
    {
        var db = await SeedFresh();
        db.Teams.Count().Should().Be(1);
    }

    [Fact]
    public async Task Seed_CreatesThreeUsers_WithCorrectRoles()
    {
        var db = await SeedFresh();
        db.Users.Count().Should().Be(3);
        db.Users.Count(u => u.Role == UserRole.Admin).Should().Be(1);
        db.Users.Count(u => u.Role == UserRole.PM).Should().Be(1);
        db.Users.Count(u => u.Role == UserRole.FieldTech).Should().Be(1);
    }

    [Fact]
    public async Task Seed_AllUsers_HavePinSet()
    {
        var db = await SeedFresh();
        db.Users.All(u => !string.IsNullOrEmpty(u.Pin)).Should().BeTrue();
    }

    [Fact]
    public async Task Seed_AllUsers_HaveEmailVerified()
    {
        var db = await SeedFresh();
        db.Users.All(u => u.EmailVerified).Should().BeTrue();
    }

    [Fact]
    public async Task Seed_CreatesThreeBuildings()
    {
        var db = await SeedFresh();
        db.Buildings.Count().Should().Be(3);
    }

    [Fact]
    public async Task Seed_CreatesThreeProjects_AllActive()
    {
        var db = await SeedFresh();
        db.Projects.Count().Should().Be(3);
        db.Projects.All(p => p.Status == ProjectStatus.Active).Should().BeTrue();
    }

    [Fact]
    public async Task Seed_CreatesFourPhotos_AllAiComplete()
    {
        var db = await SeedFresh();
        db.Photos.Count().Should().Be(4);
        db.Photos.All(p => p.AiStatus == AiStatus.Complete).Should().BeTrue();
    }

    [Fact]
    public async Task Seed_CreatesFourAnnotations()
    {
        var db = await SeedFresh();
        db.AiAnnotations.Count().Should().Be(4);
    }

    [Fact]
    public async Task Seed_CreatesTwoCriticalMaintenanceEvents()
    {
        var db = await SeedFresh();
        db.MaintenanceEvents.Count().Should().Be(2);
        db.MaintenanceEvents.All(e => e.Severity == IssueSeverity.Critical).Should().BeTrue();
    }

    [Fact]
    public async Task Seed_CreatesThreePayrollPeriods()
    {
        var db = await SeedFresh();
        db.PayrollPeriods.Count().Should().Be(3);
    }

    [Fact]
    public async Task Seed_PayrollPeriods_HaveDistinctStatuses()
    {
        var db = await SeedFresh();
        var statuses = db.PayrollPeriods.Select(p => p.Status).ToHashSet();
        statuses.Should().Contain(PayrollStatus.Draft);
        statuses.Should().Contain(PayrollStatus.Approved);
        statuses.Should().Contain(PayrollStatus.Submitted);
    }

    [Fact]
    public async Task Seed_CreatesTimeEntries()
    {
        var db = await SeedFresh();
        db.TimeEntries.Count().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Seed_IsIdempotent_RunningTwiceDoesNotDuplicate()
    {
        var db = TestDbContext.Create();
        var seeder = new DbSeeder(db, NullLogger<DbSeeder>.Instance);

        await seeder.SeedAsync();
        await seeder.SeedAsync(); // second run should skip

        db.Teams.Count().Should().Be(1);
        db.Users.Count().Should().Be(3);
    }
}
