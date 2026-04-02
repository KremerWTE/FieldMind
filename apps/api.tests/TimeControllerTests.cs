using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Controllers;
using FieldMind.Api.Models;
using FieldMind.Api.Tests.Helpers;

namespace FieldMind.Api.Tests;

public class TimeControllerTests
{
    private const string TestTeamId = "team-001";

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private (TimeController controller, FieldMind.Api.Data.FieldMindDbContext db) Build(
        string userId = "user-001",
        string role = "FieldTech")
    {
        var db = TestDbContext.Create();
        var controller = new TimeController(db)
        {
            ControllerContext = FakeControllerContext.Create(userId, TestTeamId, role)
        };
        return (controller, db);
    }

    private async Task SeedUser(FieldMind.Api.Data.FieldMindDbContext db, string userId)
    {
        var team = new Team { Id = TestTeamId, Name = "Acme", Slug = "acme" };
        if (!db.Teams.Any()) db.Teams.Add(team);

        var user = new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "x",
            Role = UserRole.FieldTech,
            IsActive = true,
            TeamId = TestTeamId,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    // ── Clock In ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ClockIn_WhenNotClockedIn_Returns200()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var result = await ctrl.ClockIn(new ClockInDto { Location = "Site A" });

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task ClockIn_WhenAlreadyClockedIn_Returns400()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        // First clock-in succeeds
        await ctrl.ClockIn(new ClockInDto { Location = "Site A" });

        // Second clock-in should fail
        var result = await ctrl.ClockIn(new ClockInDto { Location = "Site B" });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── Clock Out ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ClockOut_WhenClockedIn_Returns200()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        await ctrl.ClockIn(new ClockInDto { Location = "Site A" });
        var result = await ctrl.ClockOut(new ClockOutDto());

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task ClockOut_WhenNotClockedIn_Returns400()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var result = await ctrl.ClockOut(new ClockOutDto());

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── Edit Own Entry ───────────────────────────────────────────────────────────

    [Fact]
    public async Task EditMyEntry_UnapprovedEntry_Returns200()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        // Create a completed entry
        var entry = new TimeEntry
        {
            UserId = "user-001",
            TeamId = TestTeamId,
            ClockIn = DateTime.UtcNow.AddHours(-8),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site A",
            IsApproved = false,
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        var newClockIn = DateTime.UtcNow.AddHours(-7);
        var result = await ctrl.EditMyEntry(entry.Id, new EditEntryDto
        {
            ClockIn = newClockIn,
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site B",
        });

        result.Should().BeOfType<OkObjectResult>();

        var updated = db.TimeEntries.Find(entry.Id)!;
        updated.Location.Should().Be("Site B");
    }

    [Fact]
    public async Task EditMyEntry_ApprovedEntry_Returns400()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var entry = new TimeEntry
        {
            UserId = "user-001",
            TeamId = TestTeamId,
            ClockIn = DateTime.UtcNow.AddHours(-8),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site A",
            IsApproved = true, // already approved
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        var result = await ctrl.EditMyEntry(entry.Id, new EditEntryDto
        {
            ClockIn = DateTime.UtcNow.AddHours(-7),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site C",
        });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EditMyEntry_SubmittedPayrollPeriod_Returns400()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        // Controller uses Monday-based weeks — match that logic
        var dow = (int)DateTime.UtcNow.DayOfWeek;
        var weekStart = DateTime.UtcNow.Date.AddDays(-(dow == 0 ? 6 : dow - 1));
        var period = new PayrollPeriod
        {
            TeamId = TestTeamId,
            PeriodStart = weekStart,
            PeriodEnd = weekStart.AddDays(6),
            Status = PayrollStatus.Submitted, // locked
        };
        db.PayrollPeriods.Add(period);

        var entry = new TimeEntry
        {
            UserId = "user-001",
            TeamId = TestTeamId,
            ClockIn = weekStart.AddHours(9),
            ClockOut = weekStart.AddHours(17),
            Location = "Site A",
            IsApproved = false,
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        var result = await ctrl.EditMyEntry(entry.Id, new EditEntryDto
        {
            ClockIn = weekStart.AddHours(8),
            ClockOut = weekStart.AddHours(16),
            Location = "Site A",
        });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EditMyEntry_ClockOutBeforeClockIn_Returns400()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var entry = new TimeEntry
        {
            UserId = "user-001",
            TeamId = TestTeamId,
            ClockIn = DateTime.UtcNow.AddHours(-8),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site A",
            IsApproved = false,
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        var clockIn = DateTime.UtcNow.AddHours(-2);
        var result = await ctrl.EditMyEntry(entry.Id, new EditEntryDto
        {
            ClockIn = clockIn,
            ClockOut = clockIn.AddMinutes(-30), // before clock-in!
            Location = "Site A",
        });

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task EditMyEntry_OtherUsersEntry_Returns404()
    {
        var (ctrl, db) = Build("user-001");
        await SeedUser(db, "user-001");
        await SeedUser(db, "user-002");

        // Entry belongs to user-002
        var entry = new TimeEntry
        {
            UserId = "user-002",
            TeamId = TestTeamId,
            ClockIn = DateTime.UtcNow.AddHours(-8),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Site A",
            IsApproved = false,
        };
        db.TimeEntries.Add(entry);
        await db.SaveChangesAsync();

        // user-001 tries to edit user-002's entry
        var result = await ctrl.EditMyEntry(entry.Id, new EditEntryDto
        {
            ClockIn = DateTime.UtcNow.AddHours(-7),
            ClockOut = DateTime.UtcNow.AddHours(-1),
            Location = "Sneaky Edit",
        });

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── Status ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_WhenClockedIn_ReturnsIsClockedInTrue()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        await ctrl.ClockIn(new ClockInDto { Location = "Site A" });
        var result = await ctrl.GetStatus();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value!;
        var isClockedIn = (bool)body.GetType().GetProperty("isClockedIn")!.GetValue(body)!;
        isClockedIn.Should().BeTrue();
    }

    [Fact]
    public async Task GetStatus_WhenNotClockedIn_ReturnsIsClockedInFalse()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var result = await ctrl.GetStatus();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value!;
        var isClockedIn = (bool)body.GetType().GetProperty("isClockedIn")!.GetValue(body)!;
        isClockedIn.Should().BeFalse();
    }
}
