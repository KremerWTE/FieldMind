using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.Models;
using System.Security.Claims;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly SearchService _searchService;
    private readonly S3StorageService _s3Service;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        SearchService searchService,
        S3StorageService s3Service,
        ILogger<SearchController> logger)
    {
        _searchService = searchService;
        _s3Service = s3Service;
        _logger = logger;
    }

    private string GetTeamId() => User.FindFirst("teamId")?.Value
        ?? throw new UnauthorizedAccessException("Team ID not found in token");

    [HttpPost]
    public async Task<IActionResult> Search([FromBody] SearchFilters filters)
    {
        try
        {
            var teamId = GetTeamId();
            var (results, totalCount) = await _searchService.SearchPhotos(teamId, filters);

            // Generate presigned URLs for photos
            var enrichedResults = new List<object>();

            foreach (var result in results)
            {
                string? viewUrl = null;
                if (!string.IsNullOrEmpty(result.Photo.S3Key))
                {
                    try
                    {
                        viewUrl = await _s3Service.GeneratePresignedGetUrl(result.Photo.S3Key, expiresIn: 3600);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to generate presigned URL for photo {PhotoId}", result.Photo.Id);
                    }
                }

                enrichedResults.Add(new
                {
                    photo = new
                    {
                        result.Photo.Id,
                        result.Photo.S3Key,
                        result.Photo.BuildingId,
                        result.Photo.ProjectId,
                        result.Photo.FolderId,
                        result.Photo.UploadedById,
                        result.Photo.GeoLat,
                        result.Photo.GeoLng,
                        result.Photo.CapturedAt,
                        result.Photo.UploadedAt,
                        result.Photo.AiProcessed,
                        result.Photo.AiStatus,
                        uploadedBy = new
                        {
                            result.Photo.UploadedBy.Id,
                            result.Photo.UploadedBy.FirstName,
                            result.Photo.UploadedBy.LastName,
                            result.Photo.UploadedBy.Email
                        }
                    },
                    building = new
                    {
                        result.Building.Id,
                        result.Building.Name,
                        result.Building.Address
                    },
                    project = new
                    {
                        result.Project.Id,
                        result.Project.Name
                    },
                    folder = result.Photo.Folder != null ? new
                    {
                        result.Photo.Folder.Id,
                        result.Photo.Folder.Name
                    } : null,
                    aiAnnotation = result.AiAnnotation != null ? new
                    {
                        result.AiAnnotation.Id,
                        result.AiAnnotation.ShortDescription,
                        result.AiAnnotation.FullDescription,
                        result.AiAnnotation.Tags,
                        result.AiAnnotation.Categories,
                        result.AiAnnotation.SeverityScore,
                        result.AiAnnotation.ConfidenceScore,
                        result.AiAnnotation.EstimatedRepairPriority,
                        result.AiAnnotation.StructuralImpactScore,
                        DetectedIssuesJson = result.AiAnnotation.DetectedIssuesJson
                    } : null,
                    viewUrl,
                    relevanceScore = result.RelevanceScore,
                    matchedFields = result.MatchedFields
                });
            }

            return Ok(new
            {
                results = enrichedResults,
                totalCount,
                page = filters.Page,
                pageSize = filters.PageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)filters.PageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching photos");
            return StatusCode(500, new { error = "Search failed" });
        }
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetPopularTags([FromQuery] int limit = 20)
    {
        try
        {
            var teamId = GetTeamId();
            var tags = await _searchService.GetPopularTags(teamId, limit);

            return Ok(new { tags });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular tags");
            return StatusCode(500, new { error = "Failed to get tags" });
        }
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetPopularCategories()
    {
        try
        {
            var teamId = GetTeamId();
            var categories = await _searchService.GetPopularCategories(teamId);

            return Ok(new { categories });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular categories");
            return StatusCode(500, new { error = "Failed to get categories" });
        }
    }

    [HttpGet("suggestions")]
    public async Task<IActionResult> GetSearchSuggestions([FromQuery] string query)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                return Ok(new { suggestions = new List<string>() });

            var teamId = GetTeamId();

            // Get tags and categories that match the query
            var allTags = await _searchService.GetPopularTags(teamId, 100);
            var allCategories = await _searchService.GetPopularCategories(teamId);

            var queryLower = query.ToLower();
            var suggestions = new List<string>();

            // Match tags
            suggestions.AddRange(allTags
                .Where(t => t.Contains(queryLower))
                .Take(5));

            // Match categories
            suggestions.AddRange(allCategories
                .Where(c => c.Contains(queryLower))
                .Where(c => !suggestions.Contains(c))
                .Take(3));

            return Ok(new { suggestions = suggestions.Distinct().Take(8).ToList() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search suggestions");
            return StatusCode(500, new { error = "Failed to get suggestions" });
        }
    }
}
