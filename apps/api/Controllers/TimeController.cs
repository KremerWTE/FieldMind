using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FieldMind.Api.Data;
using FieldMind.Api.Models;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("time")]
[Authorize]
public class TimeController : ControllerBase
{
    private readonly FieldMindDbContext _context;

    public TimeController(FieldMindDbContext context)
    {
        _context = context;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found in token");

    private string GetTeamId() => User.FindFirst("teamId")?.Value
        ?? throw new UnauthorizedAccessException("Team ID not found in token");

    private bool IsAdminOrPm() =>
        User.FindFirst(ClaimTypes.Role)?.Value is "Admin" or "PM";

    // ─── Employee: Clock In ────────────────────────────────────────────────────

    [HttpPost("clock-in")]
    public async Task<IActionResult> ClockIn([FromBody] ClockInDto dto)
    {
        var userId = GetUserId();
        var teamId = GetTeamId();

        var open = await _context.TimeEntries
            .FirstOrDefaultAsync(e => e.UserId == userId && e.ClockOut == null);

        if (open != null)
            return BadRequest(new { message = "You are already clocked in. Clock out first." });

        DateTime clockIn;
        if (dto.ClockInTime.HasValue)
        {
            clockIn = dto.ClockInTime.Value.ToUniversalTime();
            if (clockIn > DateTime.UtcNow)
                return BadRequest(new { message = "Clock-in time cannot be in the future." });
            if (clockIn < DateTime.UtcNow.AddHours(-24))
                return BadRequest(new { message = "Clock-in time cannot be more than 24 hours ago." });
        }
        else
        {
            clockIn = DateTime.UtcNow;
        }

        var entry = new TimeEntry
        {
            UserId = userId,
            TeamId = teamId,
            ClockIn = clockIn,
            Location = dto.Location,
            Notes = dto.Notes,
        };

        _context.TimeEntries.Add(entry);
        await _context.SaveChangesAsync();
        return Ok(MapEntry(entry, null));
    }

    // ─── Employee: Clock Out ───────────────────────────────────────────────────

    [HttpPost("clock-out")]
    public async Task<IActionResult> ClockOut([FromBody] ClockOutDto dto)
    {
        var userId = GetUserId();

        var entry = await _context.TimeEntries
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.UserId == userId && e.ClockOut == null);

        if (entry == null)
            return BadRequest(new { message = "You are not currently clocked in." });

        entry.ClockOut = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
            entry.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return Ok(MapEntry(entry, entry.User));
    }

    // ─── Employee: Current Status ──────────────────────────────────────────────

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userId = GetUserId();
        var open = await _context.TimeEntries
            .FirstOrDefaultAsync(e => e.UserId == userId && e.ClockOut == null);

        return Ok(new { isClockedIn = open != null, entry = open != null ? MapEntry(open, null) : null });
    }

    // ─── Employee: My Entries ──────────────────────────────────────────────────

    [HttpGet("my-entries")]
    public async Task<IActionResult> GetMyEntries([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var userId = GetUserId();

        var query = _context.TimeEntries.Where(e => e.UserId == userId);
        if (from.HasValue) query = query.Where(e => e.ClockIn >= from.Value.ToUniversalTime());
        if (to.HasValue)   query = query.Where(e => e.ClockIn <= to.Value.ToUniversalTime().AddDays(1));

        var entries = await query
            .Include(e => e.User)
            .OrderByDescending(e => e.ClockIn)
            .Take(200)
            .ToListAsync();

        return Ok(new { entries = entries.Select(e => MapEntry(e, e.User)) });
    }

    // ─── Employee: Edit Own Entry ──────────────────────────────────────────────
    // Allowed only while the entry is not yet approved and the period is not submitted.

    [HttpPut("my-entries/{id}")]
    public async Task<IActionResult> EditMyEntry(string id, [FromBody] EditEntryDto dto)
    {
        var userId = GetUserId();
        var teamId = GetTeamId();

        var entry = await _context.TimeEntries
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (entry == null) return NotFound(new { message = "Entry not found." });
        if (entry.IsApproved) return BadRequest(new { message = "This entry has been approved and can no longer be edited. Contact your admin." });

        var period = await GetPeriodForEntry(teamId, entry.ClockIn);
        if (period?.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "This week's payroll has been submitted and is locked." });

        if (dto.ClockOut.HasValue && dto.ClockOut.Value <= dto.ClockIn)
            return BadRequest(new { message = "Clock-out must be after clock-in." });

        entry.ClockIn  = dto.ClockIn.ToUniversalTime();
        entry.ClockOut = dto.ClockOut?.ToUniversalTime();
        entry.Location = dto.Location;
        entry.Notes    = dto.Notes;

        await _context.SaveChangesAsync();
        return Ok(MapEntry(entry, entry.User));
    }

    // ─── Admin: All Team Entries ───────────────────────────────────────────────

    [HttpGet("entries")]
    public async Task<IActionResult> GetAllEntries(
        [FromQuery] string? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var query = _context.TimeEntries.Where(e => e.TeamId == teamId);
        if (!string.IsNullOrEmpty(userId)) query = query.Where(e => e.UserId == userId);
        if (from.HasValue) query = query.Where(e => e.ClockIn >= from.Value.ToUniversalTime());
        if (to.HasValue)   query = query.Where(e => e.ClockIn <= to.Value.ToUniversalTime().AddDays(1));

        var entries = await query
            .Include(e => e.User)
            .OrderByDescending(e => e.ClockIn)
            .Take(500)
            .ToListAsync();

        return Ok(new { entries = entries.Select(e => MapEntry(e, e.User)) });
    }

    // ─── Admin: Edit Entry ─────────────────────────────────────────────────────

    [HttpPut("entries/{id}")]
    public async Task<IActionResult> EditEntry(string id, [FromBody] EditEntryDto dto)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var entry = await _context.TimeEntries
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.TeamId == teamId);

        if (entry == null) return NotFound(new { message = "Entry not found." });

        // Check if the period is locked (submitted)
        var period = await GetPeriodForEntry(teamId, entry.ClockIn);
        if (period?.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "Cannot edit entries in a submitted payroll period." });

        entry.ClockIn = dto.ClockIn.ToUniversalTime();
        entry.ClockOut = dto.ClockOut?.ToUniversalTime();
        entry.Location = dto.Location;
        entry.Notes = dto.Notes;

        await _context.SaveChangesAsync();
        return Ok(MapEntry(entry, entry.User));
    }

    // ─── Admin: Delete Entry ───────────────────────────────────────────────────

    [HttpDelete("entries/{id}")]
    public async Task<IActionResult> DeleteEntry(string id)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var entry = await _context.TimeEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.TeamId == teamId);

        if (entry == null) return NotFound(new { message = "Entry not found." });

        var period = await GetPeriodForEntry(teamId, entry.ClockIn);
        if (period?.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "Cannot delete entries in a submitted payroll period." });

        _context.TimeEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Entry deleted." });
    }

    // ─── Admin: Approve Individual Entry ──────────────────────────────────────

    [HttpPost("entries/{id}/approve")]
    public async Task<IActionResult> ApproveEntry(string id)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var entry = await _context.TimeEntries
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.TeamId == teamId);

        if (entry == null) return NotFound(new { message = "Entry not found." });

        entry.IsApproved = !entry.IsApproved; // toggle
        await _context.SaveChangesAsync();
        return Ok(MapEntry(entry, entry.User));
    }

    // ─── Admin: Payroll Summary ────────────────────────────────────────────────

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var entries = await _context.TimeEntries
            .Where(e => e.TeamId == teamId
                && e.ClockIn >= from.ToUniversalTime()
                && e.ClockIn <= to.ToUniversalTime().AddDays(1)
                && e.ClockOut != null)
            .Include(e => e.User)
            .ToListAsync();

        var summary = entries
            .GroupBy(e => e.UserId)
            .Select(g => new
            {
                userId = g.Key,
                fullName = $"{g.First().User.FirstName} {g.First().User.LastName}",
                email = g.First().User.Email,
                totalHours = Math.Round(g.Sum(e => e.DurationHours ?? 0), 2),
                entryCount = g.Count(),
                approvedCount = g.Count(e => e.IsApproved),
                entries = g.OrderBy(e => e.ClockIn).Select(e => MapEntry(e, e.User)),
            })
            .OrderBy(s => s.fullName)
            .ToList();

        return Ok(new { summary, from, to });
    }

    // ─── Payroll Periods ───────────────────────────────────────────────────────

    /// <summary>Get or create the payroll period for a specific week start (Monday).</summary>
    [HttpPost("payroll-periods/get-or-create")]
    public async Task<IActionResult> GetOrCreatePeriod([FromBody] GetOrCreatePeriodDto dto)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var periodStart = dto.PeriodStart.Date.ToUniversalTime();
        var periodEnd   = periodStart.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);

        var existing = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.TeamId == teamId && p.PeriodStart == periodStart);

        if (existing != null)
            return Ok(MapPeriod(existing));

        var period = new PayrollPeriod
        {
            TeamId      = teamId,
            PeriodStart = periodStart,
            PeriodEnd   = periodEnd,
        };

        _context.PayrollPeriods.Add(period);
        await _context.SaveChangesAsync();
        return Ok(MapPeriod(period));
    }

    /// <summary>Get the payroll period that contains a given date (no create). Available to all team members.</summary>
    [HttpGet("payroll-periods/for-date")]
    public async Task<IActionResult> GetPeriodForDate([FromQuery] DateTime date)
    {
        var teamId = GetTeamId();
        var dayOfWeek = (int)date.DayOfWeek;
        var monday = date.Date.AddDays(-(dayOfWeek == 0 ? 6 : dayOfWeek - 1)).ToUniversalTime();

        var period = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.TeamId == teamId && p.PeriodStart == monday);

        if (period == null) return NotFound();
        return Ok(MapPeriod(period));
    }

    /// <summary>List all payroll periods for the team.</summary>
    [HttpGet("payroll-periods")]
    public async Task<IActionResult> GetPeriods()
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var periods = await _context.PayrollPeriods
            .Where(p => p.TeamId == teamId)
            .OrderByDescending(p => p.PeriodStart)
            .Take(52)
            .ToListAsync();

        return Ok(new { periods = periods.Select(MapPeriod) });
    }

    /// <summary>Approve a payroll period (lock for editing, ready for submit).</summary>
    [HttpPost("payroll-periods/{id}/approve")]
    public async Task<IActionResult> ApprovePeriod(string id)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var period = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.Id == id && p.TeamId == teamId);

        if (period == null) return NotFound();
        if (period.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "Period is already submitted." });

        period.Status    = PayrollStatus.Approved;
        period.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(MapPeriod(period));
    }

    /// <summary>Submit a payroll period — marks it as sent to payroll (irreversible).</summary>
    [HttpPost("payroll-periods/{id}/submit")]
    public async Task<IActionResult> SubmitPeriod(string id)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId   = GetTeamId();
        var userId   = GetUserId();

        var period = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.Id == id && p.TeamId == teamId);

        if (period == null) return NotFound();
        if (period.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "Period is already submitted." });

        // Compute total hours for the period
        var hours = await _context.TimeEntries
            .Where(e => e.TeamId == teamId
                && e.ClockIn >= period.PeriodStart
                && e.ClockIn <= period.PeriodEnd
                && e.ClockOut != null)
            .ToListAsync();

        period.Status          = PayrollStatus.Submitted;
        period.SubmittedById   = userId;
        period.SubmittedAt     = DateTime.UtcNow;
        period.UpdatedAt       = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapPeriod(period));
    }

    /// <summary>Reopen an approved (not submitted) period back to Draft.</summary>
    [HttpPost("payroll-periods/{id}/reopen")]
    public async Task<IActionResult> ReopenPeriod(string id)
    {
        if (!IsAdminOrPm()) return Forbid();
        var teamId = GetTeamId();

        var period = await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.Id == id && p.TeamId == teamId);

        if (period == null) return NotFound();
        if (period.Status == PayrollStatus.Submitted)
            return BadRequest(new { message = "Cannot reopen a submitted period." });

        period.Status    = PayrollStatus.Draft;
        period.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(MapPeriod(period));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private async Task<PayrollPeriod?> GetPeriodForEntry(string teamId, DateTime clockIn)
    {
        // Find the Monday of the week containing clockIn
        var dayOfWeek = (int)clockIn.DayOfWeek;
        var monday = clockIn.Date.AddDays(-(dayOfWeek == 0 ? 6 : dayOfWeek - 1));
        var mondayUtc = monday.ToUniversalTime();

        return await _context.PayrollPeriods
            .FirstOrDefaultAsync(p => p.TeamId == teamId && p.PeriodStart == mondayUtc);
    }

    private static object MapEntry(TimeEntry e, User? user) => new
    {
        id           = e.Id,
        userId       = e.UserId,
        fullName     = user != null ? $"{user.FirstName} {user.LastName}" : null,
        email        = user?.Email,
        clockIn      = e.ClockIn,
        clockOut     = e.ClockOut,
        location     = e.Location,
        notes        = e.Notes,
        isApproved   = e.IsApproved,
        durationHours = e.DurationHours.HasValue ? Math.Round(e.DurationHours.Value, 2) : (double?)null,
        createdAt    = e.CreatedAt,
    };

    private static object MapPeriod(PayrollPeriod p) => new
    {
        id            = p.Id,
        teamId        = p.TeamId,
        periodStart   = p.PeriodStart,
        periodEnd     = p.PeriodEnd,
        status        = p.Status.ToString(),
        notes         = p.Notes,
        submittedById = p.SubmittedById,
        submittedAt   = p.SubmittedAt,
        createdAt     = p.CreatedAt,
        updatedAt     = p.UpdatedAt,
    };
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────

public class ClockInDto
{
    public string Location { get; set; } = string.Empty;
    public string? Notes { get; set; }
    /// <summary>Optional backdated clock-in time. Must be in the past and within the last 24 hours.</summary>
    public DateTime? ClockInTime { get; set; }
}

public class ClockOutDto
{
    public string? Notes { get; set; }
}

public class EditEntryDto
{
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }
    public string Location { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class GetOrCreatePeriodDto
{
    public DateTime PeriodStart { get; set; }
}
