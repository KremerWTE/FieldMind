using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Controllers;
using FieldMind.Api.Models;
using FieldMind.Api.Tests.Helpers;

namespace FieldMind.Api.Tests;

public class PayrollPeriodTests
{
    private const string TestTeamId = "team-001";

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
        if (!db.Teams.Any())
            db.Teams.Add(new Team { Id = TestTeamId, Name = "Acme", Slug = "acme" });

        db.Users.Add(new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "x",
            Role = UserRole.FieldTech,
            IsActive = true,
            TeamId = TestTeamId,
        });
        await db.SaveChangesAsync();
    }

    private static DateTime ThisMonday()
    {
        var today = DateTime.UtcNow.Date;
        var dow = (int)today.DayOfWeek;
        return today.AddDays(-(dow == 0 ? 6 : dow - 1));
    }

    // ── GetPeriodForDate ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPeriodForDate_WhenPeriodExists_Returns200WithPeriod()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var monday = ThisMonday();
        db.PayrollPeriods.Add(new PayrollPeriod
        {
            TeamId = TestTeamId,
            PeriodStart = monday.ToUniversalTime(),
            PeriodEnd = monday.AddDays(6).ToUniversalTime(),
            Status = PayrollStatus.Draft,
        });
        await db.SaveChangesAsync();

        // Query for Wednesday of this week — should resolve to the Monday period
        var wednesday = monday.AddDays(2);
        var result = await ctrl.GetPeriodForDate(wednesday);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetPeriodForDate_WhenNoPeriodExists_Returns404()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        // No payroll periods seeded
        var result = await ctrl.GetPeriodForDate(DateTime.UtcNow);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetPeriodForDate_SundayInput_ResolvesToSameWeekMonday()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var monday = ThisMonday();
        db.PayrollPeriods.Add(new PayrollPeriod
        {
            TeamId = TestTeamId,
            PeriodStart = monday.ToUniversalTime(),
            PeriodEnd = monday.AddDays(6).ToUniversalTime(),
            Status = PayrollStatus.Draft,
        });
        await db.SaveChangesAsync();

        // Sunday of the same week should still hit Monday's period
        var sunday = monday.AddDays(6);
        var result = await ctrl.GetPeriodForDate(sunday);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetPeriodForDate_WrongTeam_Returns404()
    {
        var (ctrl, db) = Build();
        await SeedUser(db, "user-001");

        var monday = ThisMonday();
        // Period belongs to a different team
        db.PayrollPeriods.Add(new PayrollPeriod
        {
            TeamId = "other-team",
            PeriodStart = monday.ToUniversalTime(),
            PeriodEnd = monday.AddDays(6).ToUniversalTime(),
            Status = PayrollStatus.Draft,
        });
        await db.SaveChangesAsync();

        var result = await ctrl.GetPeriodForDate(monday);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── Payroll Period Status Flow ───────────────────────────────────────────────

    [Fact]
    public async Task ApprovePeriod_AsPm_ChangesDraftToApproved()
    {
        var (ctrl, db) = Build("pm-001", "PM");
        db.Teams.Add(new Team { Id = TestTeamId, Name = "Acme", Slug = "acme" });
        db.Users.Add(new User { Id = "pm-001", Email = "pm@test.com", FirstName = "PM", LastName = "User", PasswordHash = "x", Role = UserRole.PM, IsActive = true, TeamId = TestTeamId });
        var monday = ThisMonday();
        var period = new PayrollPeriod
        {
            TeamId = TestTeamId,
            PeriodStart = monday.ToUniversalTime(),
            PeriodEnd = monday.AddDays(6).ToUniversalTime(),
            Status = PayrollStatus.Draft,
        };
        db.PayrollPeriods.Add(period);
        await db.SaveChangesAsync();

        var result = await ctrl.ApprovePeriod(period.Id);

        result.Should().BeOfType<OkObjectResult>();
        var updated = db.PayrollPeriods.Find(period.Id)!;
        updated.Status.Should().Be(PayrollStatus.Approved);
    }

    [Fact]
    public async Task ApprovePeriod_AsFieldTech_ReturnsForbid()
    {
        var (ctrl, db) = Build("user-001", "FieldTech");
        await SeedUser(db, "user-001");
        var monday = ThisMonday();
        var period = new PayrollPeriod
        {
            TeamId = TestTeamId,
            PeriodStart = monday.ToUniversalTime(),
            PeriodEnd = monday.AddDays(6).ToUniversalTime(),
            Status = PayrollStatus.Draft,
        };
        db.PayrollPeriods.Add(period);
        await db.SaveChangesAsync();

        var result = await ctrl.ApprovePeriod(period.Id);

        result.Should().BeOfType<ForbidResult>();
    }
}
