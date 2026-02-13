namespace FieldMind.Api.Services.AI;

public class MockVisionAnnotator : IVisionAnnotator
{
    private readonly Random _random = new();

    public Task<VisionAnnotationOutput> AnnotateAsync(VisionAnnotationInput input)
    {
        // Simulate AI processing delay
        Task.Delay(500).Wait();

        var severity = GetRandomSeverity();
        var categories = GetRandomCategories();
        var issues = GenerateIssues(severity, categories);

        var output = new VisionAnnotationOutput
        {
            ShortDescription = "Mock AI analysis of construction photo",
            FullDescription = $"This is a simulated AI analysis for development purposes. The photo has been analyzed and categorized as {string.Join(", ", categories)}. The overall condition assessment indicates {severity} priority concerns. In a production environment, this would be replaced with actual AI vision model analysis providing detailed technical insights about materials, structural condition, and maintenance requirements.",
            Tags = new List<string> { "mock", "development", "construction", "building" },
            Categories = categories,
            DetectedIssues = issues,
            EstimatedRepairPriority = severity,
            StructuralImpactScore = GetStructuralScore(severity)
        };

        return Task.FromResult(output);
    }

    private string GetRandomSeverity()
    {
        var severities = new[] { "low", "low", "medium", "medium", "high", "urgent" };
        return severities[_random.Next(severities.Length)];
    }

    private List<string> GetRandomCategories()
    {
        var allCategories = new[] { "roof", "exterior", "interior", "foundation", "damage", "moisture", "structural" };
        var count = _random.Next(1, 4);
        return allCategories.OrderBy(_ => _random.Next()).Take(count).ToList();
    }

    private List<DetectedIssue> GenerateIssues(string severity, List<string> categories)
    {
        var issues = new List<DetectedIssue>();

        if (severity == "high" || severity == "urgent")
        {
            issues.Add(new DetectedIssue
            {
                Type = $"{categories.First()} damage",
                Severity = severity == "urgent" ? "critical" : "high",
                Confidence = 0.75 + (_random.NextDouble() * 0.2),
                Description = $"Mock detected issue in {categories.First()} area requiring attention"
            });
        }
        else if (severity == "medium")
        {
            issues.Add(new DetectedIssue
            {
                Type = "general wear",
                Severity = "medium",
                Confidence = 0.6 + (_random.NextDouble() * 0.2),
                Description = "Minor maintenance concern detected"
            });
        }

        return issues;
    }

    private int GetStructuralScore(string severity)
    {
        return severity switch
        {
            "urgent" => _random.Next(80, 100),
            "high" => _random.Next(60, 80),
            "medium" => _random.Next(30, 60),
            _ => _random.Next(0, 30)
        };
    }
}
