namespace FieldMind.Api.Models;

public enum FeatureCategory
{
    CoreInspection,
    Detection,
    Monitoring,
    Safety,
    Automation
}

public class ProductFeature
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FeatureCategory Category { get; set; }
    public string Icon { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public int DisplayOrder { get; set; }
    public List<string> KeyBenefits { get; set; } = new();
}

public class FeatureHighlight
{
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<ProductFeature> Features { get; set; } = new();
}
