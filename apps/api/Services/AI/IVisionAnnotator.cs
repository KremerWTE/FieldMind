namespace FieldMind.Api.Services.AI;

public class VisionAnnotationInput
{
    public string ImageUrl { get; set; } = string.Empty;
    public string PhotoId { get; set; } = string.Empty;
}

public class DetectedIssue
{
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty; // low, medium, high, critical
    public double Confidence { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class VisionAnnotationOutput
{
    public string ShortDescription { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public List<DetectedIssue> DetectedIssues { get; set; } = new();
    public string EstimatedRepairPriority { get; set; } = string.Empty; // low, medium, high, urgent
    public int StructuralImpactScore { get; set; } // 0-100
}

public interface IVisionAnnotator
{
    Task<VisionAnnotationOutput> AnnotateAsync(VisionAnnotationInput input);
}
