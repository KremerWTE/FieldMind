using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FieldMind.Api.Data;
using FieldMind.Api.Models;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("receipts")]
[Authorize]
public class ReceiptsController : ControllerBase
{
    private readonly FieldMindDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<ReceiptsController> _logger;

    public ReceiptsController(FieldMindDbContext context, IWebHostEnvironment env, ILogger<ReceiptsController> logger)
    {
        _context = context;
        _env = env;
        _logger = logger;
    }

    private string GetUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException();

    private string GetTeamId() => User.FindFirst("teamId")?.Value
        ?? throw new UnauthorizedAccessException();

    private string GetRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

    private bool CanUpload() => GetRole() is "Admin" or "PM";

    // GET /receipts
    [HttpGet]
    public async Task<IActionResult> GetReceipts([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var teamId = GetTeamId();
        var query = _context.Receipts
            .Include(r => r.UploadedBy)
            .Where(r => r.TeamId == teamId)
            .OrderByDescending(r => r.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * limit).Take(limit)
            .Select(r => new {
                r.Id, r.FileName, r.FileUrl, r.FileSizeBytes,
                r.Amount, r.Vendor, r.Category, r.Description,
                r.BuildingId, r.ProjectId, r.ReceiptDate, r.CreatedAt,
                uploadedBy = new { r.UploadedBy.Id, r.UploadedBy.FirstName, r.UploadedBy.LastName }
            })
            .ToListAsync();

        return Ok(new { data = items, meta = new { total, page, limit, totalPages = (int)Math.Ceiling(total / (double)limit) } });
    }

    // POST /receipts
    [HttpPost]
    public async Task<IActionResult> UploadReceipt(
        [FromForm] IFormFile file,
        [FromForm] decimal? amount,
        [FromForm] string? vendor,
        [FromForm] string? category,
        [FromForm] string? description,
        [FromForm] string? buildingId,
        [FromForm] string? projectId,
        [FromForm] DateTime? receiptDate)
    {
        if (!CanUpload())
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "application/pdf" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPG, PNG, WebP, or PDF files are allowed." });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File size must be under 10MB." });

        // Save to local uploads folder
        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "receipts");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var savedFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, savedFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        var receipt = new Receipt
        {
            TeamId = GetTeamId(),
            UploadedById = GetUserId(),
            FileName = file.FileName,
            FileUrl = $"/receipts/file/{savedFileName}",
            FileSizeBytes = file.Length,
            Amount = amount,
            Vendor = vendor,
            Category = category,
            Description = description,
            BuildingId = string.IsNullOrEmpty(buildingId) ? null : buildingId,
            ProjectId = string.IsNullOrEmpty(projectId) ? null : projectId,
            ReceiptDate = receiptDate ?? DateTime.UtcNow,
        };

        _context.Receipts.Add(receipt);
        await _context.SaveChangesAsync();

        return Ok(new { receipt.Id, receipt.FileUrl, receipt.FileName });
    }

    // GET /receipts/file/{fileName} — serve the uploaded file
    [HttpGet("file/{fileName}")]
    public IActionResult GetFile(string fileName)
    {
        // Prevent path traversal
        fileName = Path.GetFileName(fileName);
        var filePath = Path.Combine(_env.ContentRootPath, "uploads", "receipts", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var ext = Path.GetExtension(fileName).ToLower();
        var contentType = ext switch {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };

        return PhysicalFile(filePath, contentType);
    }

    // DELETE /receipts/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReceipt(string id)
    {
        if (!CanUpload())
            return Forbid();

        var teamId = GetTeamId();
        var receipt = await _context.Receipts.FirstOrDefaultAsync(r => r.Id == id && r.TeamId == teamId);
        if (receipt == null) return NotFound();

        // Delete file
        var fileName = Path.GetFileName(receipt.FileUrl.Replace("/receipts/file/", ""));
        var filePath = Path.Combine(_env.ContentRootPath, "uploads", "receipts", fileName);
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _context.Receipts.Remove(receipt);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Receipt deleted." });
    }
}
