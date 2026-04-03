using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.Jobs;
using FieldMind.Api.Services;
using System.Security.Claims;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly FieldMindDbContext _context;
    private readonly S3StorageService _s3Service;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(FieldMindDbContext context, S3StorageService s3Service, ILogger<ReportsController> logger)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
    }

    private string GetTeamId() => User.FindFirst("teamId")?.Value
        ?? throw new UnauthorizedAccessException("Team ID not found in token");

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found in token");

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateReport([FromBody] GenerateReportDto dto)
    {
        try
        {
            var teamId = GetTeamId();
            var userId = GetUserId();

            // Validate entity exists and belongs to team
            await ValidateEntity(teamId, dto.Type, dto.EntityId);

            // Parse report type
            if (!Enum.TryParse<ReportType>(dto.Type, true, out var reportType))
            {
                return BadRequest(new { error = $"Invalid report type: {dto.Type}" });
            }

            // Create report job
            var reportJob = new ReportJob
            {
                TeamId = teamId,
                CreatedById = userId,
                Type = reportType,
                EntityId = dto.EntityId,
                DateFrom = dto.DateFrom,
                DateTo = dto.DateTo,
                IncludeAI = dto.IncludeAI ?? true,
                IncludeMaintenanceEvents = dto.IncludeMaintenanceEvents ?? true,
                IncludeHealthStats = dto.IncludeHealthStats ?? true,
                Status = ReportStatus.Pending
            };

            _context.ReportJobs.Add(reportJob);
            await _context.SaveChangesAsync();

            // Enqueue background job
            BackgroundJob.Enqueue<GenerateReportJob>(job => job.ProcessReportAsync(reportJob.Id));

            _logger.LogInformation("Report job {JobId} created and enqueued for {Type} {EntityId}",
                reportJob.Id, dto.Type, dto.EntityId);

            return Ok(new
            {
                jobId = reportJob.Id,
                status = reportJob.Status.ToString(),
                message = "Report generation started. Use the jobId to check status."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating report job");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetReportStatus(string jobId)
    {
        try
        {
            var teamId = GetTeamId();

            var reportJob = await _context.ReportJobs
                .Include(r => r.CreatedBy)
                .FirstOrDefaultAsync(r => r.Id == jobId && r.TeamId == teamId);

            if (reportJob == null)
                return NotFound(new { error = "Report job not found" });

            return Ok(new
            {
                jobId = reportJob.Id,
                status = reportJob.Status.ToString(),
                type = reportJob.Type.ToString(),
                entityId = reportJob.EntityId,
                createdAt = reportJob.CreatedAt,
                completedAt = reportJob.CompletedAt,
                downloadUrl = reportJob.DownloadUrl,
                errorMessage = reportJob.ErrorMessage,
                createdBy = new
                {
                    reportJob.CreatedBy.FirstName,
                    reportJob.CreatedBy.LastName,
                    reportJob.CreatedBy.Email
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting report status for job {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to get report status" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetMyReports()
    {
        try
        {
            var teamId = GetTeamId();

            var reports = await _context.ReportJobs
                .Where(r => r.TeamId == teamId)
                .OrderByDescending(r => r.CreatedAt)
                .Take(50)
                .Select(r => new
                {
                    r.Id,
                    status = r.Status.ToString(),
                    type = r.Type.ToString(),
                    r.EntityId,
                    r.CreatedAt,
                    r.CompletedAt,
                    hasDownload = r.DownloadUrl != null,
                    r.ErrorMessage
                })
                .ToListAsync();

            return Ok(new { reports });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting reports list");
            return StatusCode(500, new { error = "Failed to get reports" });
        }
    }

    [HttpDelete("{jobId}")]
    public async Task<IActionResult> DeleteReport(string jobId)
    {
        try
        {
            var teamId = GetTeamId();

            var reportJob = await _context.ReportJobs
                .FirstOrDefaultAsync(r => r.Id == jobId && r.TeamId == teamId);

            if (reportJob == null)
                return NotFound(new { error = "Report job not found" });

            _context.ReportJobs.Remove(reportJob);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrEmpty(reportJob.S3Key))
            {
                try { await _s3Service.DeleteObject(reportJob.S3Key); }
                catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete report from S3: {Key}", reportJob.S3Key); }
            }

            return Ok(new { message = "Report deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting report {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to delete report" });
        }
    }

    private async Task ValidateEntity(string teamId, string type, string entityId)
    {
        switch (type.ToLower())
        {
            case "building":
                var building = await _context.Buildings
                    .FirstOrDefaultAsync(b => b.Id == entityId && b.TeamId == teamId);
                if (building == null)
                    throw new InvalidOperationException("Building not found or access denied");
                break;

            case "project":
                var project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Id == entityId && p.TeamId == teamId);
                if (project == null)
                    throw new InvalidOperationException("Project not found or access denied");
                break;

            case "folder":
                var folder = await _context.Folders
                    .Include(f => f.Project)
                    .FirstOrDefaultAsync(f => f.Id == entityId && f.Project.TeamId == teamId);
                if (folder == null)
                    throw new InvalidOperationException("Folder not found or access denied");
                break;

            default:
                throw new InvalidOperationException($"Invalid type: {type}");
        }
    }
}

public class GenerateReportDto
{
    public string Type { get; set; } = string.Empty; // "building", "project", "folder"
    public string EntityId { get; set; } = string.Empty;
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public bool? IncludeAI { get; set; }
    public bool? IncludeMaintenanceEvents { get; set; }
    public bool? IncludeHealthStats { get; set; }
}
