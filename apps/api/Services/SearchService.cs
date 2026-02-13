using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using System.Text.RegularExpressions;

namespace FieldMind.Api.Services;

public class SearchResult
{
    public Photo Photo { get; set; } = null!;
    public AiAnnotation? AiAnnotation { get; set; }
    public Building Building { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public double RelevanceScore { get; set; }
    public List<string> MatchedFields { get; set; } = new();
}

public class SearchFilters
{
    public string? Query { get; set; }
    public string? BuildingId { get; set; }
    public string? ProjectId { get; set; }
    public string? FolderId { get; set; }
    public List<string>? Categories { get; set; }
    public List<string>? Tags { get; set; }
    public string? MinSeverity { get; set; } // low, medium, high, critical
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public AiStatus? AiStatus { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class SearchService
{
    private readonly FieldMindDbContext _context;
    private readonly ILogger<SearchService> _logger;

    public SearchService(FieldMindDbContext context, ILogger<SearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<(List<SearchResult> Results, int TotalCount)> SearchPhotos(
        string teamId,
        SearchFilters filters)
    {
        _logger.LogInformation("Searching photos for team {TeamId} with query: {Query}",
            teamId, filters.Query);

        // Start with base query - team scoped
        var query = _context.Photos
            .Include(p => p.Building)
            .Include(p => p.Project)
            .Include(p => p.Folder)
            .Include(p => p.UploadedBy)
            .Include(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .Where(p => p.Building.TeamId == teamId);

        // Apply filters
        if (!string.IsNullOrWhiteSpace(filters.BuildingId))
            query = query.Where(p => p.BuildingId == filters.BuildingId);

        if (!string.IsNullOrWhiteSpace(filters.ProjectId))
            query = query.Where(p => p.ProjectId == filters.ProjectId);

        if (!string.IsNullOrWhiteSpace(filters.FolderId))
            query = query.Where(p => p.FolderId == filters.FolderId);

        if (filters.AiStatus.HasValue)
            query = query.Where(p => p.AiStatus == filters.AiStatus.Value);

        if (filters.DateFrom.HasValue)
            query = query.Where(p => p.UploadedAt >= filters.DateFrom.Value);

        if (filters.DateTo.HasValue)
            query = query.Where(p => p.UploadedAt <= filters.DateTo.Value);

        // Get photos with annotations for further filtering
        var photos = await query.ToListAsync();

        // Filter and score results
        var results = new List<SearchResult>();

        foreach (var photo in photos)
        {
            var annotation = photo.AiAnnotations.FirstOrDefault();
            var score = 0.0;
            var matchedFields = new List<string>();

            // Text search
            if (!string.IsNullOrWhiteSpace(filters.Query))
            {
                var queryLower = filters.Query.ToLower();
                var searchTerms = queryLower.Split(' ', StringSplitOptions.RemoveEmptyEntries);

                // Search in AI annotation
                if (annotation != null)
                {
                    var shortDesc = annotation.ShortDescription?.ToLower() ?? "";
                    var fullDesc = annotation.FullDescription?.ToLower() ?? "";
                    var tags = string.Join(" ", annotation.Tags).ToLower();
                    var categories = string.Join(" ", annotation.Categories).ToLower();

                    foreach (var term in searchTerms)
                    {
                        if (shortDesc.Contains(term))
                        {
                            score += 10;
                            if (!matchedFields.Contains("Short Description"))
                                matchedFields.Add("Short Description");
                        }
                        if (fullDesc.Contains(term))
                        {
                            score += 5;
                            if (!matchedFields.Contains("Full Description"))
                                matchedFields.Add("Full Description");
                        }
                        if (tags.Contains(term))
                        {
                            score += 15; // Tags are highly relevant
                            if (!matchedFields.Contains("Tags"))
                                matchedFields.Add("Tags");
                        }
                        if (categories.Contains(term))
                        {
                            score += 12;
                            if (!matchedFields.Contains("Categories"))
                                matchedFields.Add("Categories");
                        }
                    }

                    // Search in detected issues
                    if (!string.IsNullOrEmpty(annotation.DetectedIssuesJson))
                    {
                        var issuesJson = annotation.DetectedIssuesJson.ToLower();
                        foreach (var term in searchTerms)
                        {
                            if (issuesJson.Contains(term))
                            {
                                score += 8;
                                if (!matchedFields.Contains("Detected Issues"))
                                    matchedFields.Add("Detected Issues");
                            }
                        }
                    }
                }

                // Search in building/project names
                var buildingName = photo.Building.Name?.ToLower() ?? "";
                var projectName = photo.Project.Name?.ToLower() ?? "";

                foreach (var term in searchTerms)
                {
                    if (buildingName.Contains(term))
                    {
                        score += 3;
                        if (!matchedFields.Contains("Building"))
                            matchedFields.Add("Building");
                    }
                    if (projectName.Contains(term))
                    {
                        score += 3;
                        if (!matchedFields.Contains("Project"))
                            matchedFields.Add("Project");
                    }
                }

                // Skip if no matches
                if (score == 0)
                    continue;
            }
            else
            {
                // No text query - include all
                score = 1;
            }

            // Filter by categories
            if (filters.Categories != null && filters.Categories.Any())
            {
                if (annotation == null || !annotation.Categories.Any(c =>
                    filters.Categories.Contains(c, StringComparer.OrdinalIgnoreCase)))
                {
                    continue; // Skip if doesn't match required categories
                }
                score += 5; // Boost for category match
            }

            // Filter by tags
            if (filters.Tags != null && filters.Tags.Any())
            {
                if (annotation == null || !annotation.Tags.Any(t =>
                    filters.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)))
                {
                    continue; // Skip if doesn't match required tags
                }
                score += 5; // Boost for tag match
            }

            // Filter by minimum severity
            if (!string.IsNullOrWhiteSpace(filters.MinSeverity) && annotation != null)
            {
                var minSeverityValue = GetSeverityValue(filters.MinSeverity);
                var photoSeverityValue = GetSeverityValue(GetMaxSeverity(annotation.DetectedIssuesJson));

                if (photoSeverityValue < minSeverityValue)
                    continue; // Skip if below minimum severity
            }

            results.Add(new SearchResult
            {
                Photo = photo,
                AiAnnotation = annotation,
                Building = photo.Building,
                Project = photo.Project,
                RelevanceScore = score,
                MatchedFields = matchedFields
            });
        }

        // Sort by relevance
        results = results.OrderByDescending(r => r.RelevanceScore)
                        .ThenByDescending(r => r.Photo.UploadedAt)
                        .ToList();

        var totalCount = results.Count;

        // Paginate
        results = results
            .Skip((filters.Page - 1) * filters.PageSize)
            .Take(filters.PageSize)
            .ToList();

        _logger.LogInformation("Search returned {Count} results (total {Total}) for query: {Query}",
            results.Count, totalCount, filters.Query);

        return (results, totalCount);
    }

    private int GetSeverityValue(string severity)
    {
        return severity?.ToLower() switch
        {
            "critical" => 4,
            "high" => 3,
            "medium" => 2,
            "low" => 1,
            _ => 0
        };
    }

    private string GetMaxSeverity(string detectedIssuesJson)
    {
        if (string.IsNullOrEmpty(detectedIssuesJson) || detectedIssuesJson == "[]")
            return "low";

        // Simple regex to find severity values in JSON
        var matches = Regex.Matches(detectedIssuesJson, @"""severity""\s*:\s*""([^""]+)""");
        var severities = matches.Select(m => m.Groups[1].Value).ToList();

        if (severities.Any(s => s.Equals("critical", StringComparison.OrdinalIgnoreCase)))
            return "critical";
        if (severities.Any(s => s.Equals("high", StringComparison.OrdinalIgnoreCase)))
            return "high";
        if (severities.Any(s => s.Equals("medium", StringComparison.OrdinalIgnoreCase)))
            return "medium";

        return "low";
    }

    public async Task<List<string>> GetPopularTags(string teamId, int limit = 20)
    {
        var annotations = await _context.AiAnnotations
            .Include(a => a.Photo)
            .ThenInclude(p => p.Building)
            .Where(a => a.Photo.Building.TeamId == teamId)
            .Select(a => a.Tags)
            .ToListAsync();

        var tagCounts = new Dictionary<string, int>();

        foreach (var tags in annotations)
        {
            foreach (var tag in tags)
            {
                if (!string.IsNullOrWhiteSpace(tag))
                {
                    var normalized = tag.ToLower();
                    tagCounts[normalized] = tagCounts.GetValueOrDefault(normalized, 0) + 1;
                }
            }
        }

        return tagCounts
            .OrderByDescending(kvp => kvp.Value)
            .Take(limit)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    public async Task<List<string>> GetPopularCategories(string teamId)
    {
        var annotations = await _context.AiAnnotations
            .Include(a => a.Photo)
            .ThenInclude(p => p.Building)
            .Where(a => a.Photo.Building.TeamId == teamId)
            .Select(a => a.Categories)
            .ToListAsync();

        var categoryCounts = new Dictionary<string, int>();

        foreach (var categories in annotations)
        {
            foreach (var category in categories)
            {
                if (!string.IsNullOrWhiteSpace(category))
                {
                    var normalized = category.ToLower();
                    categoryCounts[normalized] = categoryCounts.GetValueOrDefault(normalized, 0) + 1;
                }
            }
        }

        return categoryCounts
            .OrderByDescending(kvp => kvp.Value)
            .Select(kvp => kvp.Key)
            .ToList();
    }
}
