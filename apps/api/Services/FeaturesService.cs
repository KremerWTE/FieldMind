using FieldMind.Api.Models;

namespace FieldMind.Api.Services;

public class FeaturesService
{
    public FeatureHighlight GetProductFeatures()
    {
        return new FeatureHighlight
        {
            Title = "FieldMind Management Platform",
            Subtitle = "Comprehensive Property & Asset Intelligence",
            Description = "AI-powered inspection and monitoring platform for proactive maintenance management",
            Features = new List<ProductFeature>
            {
                new ProductFeature
                {
                    Title = "Digitize Inspection Tests",
                    Description = "Transform manual inspections into digital workflows with AI-powered photo analysis and automated reporting",
                    Category = FeatureCategory.CoreInspection,
                    Icon = "clipboard-check",
                    DisplayOrder = 1,
                    KeyBenefits = new List<string>
                    {
                        "Eliminate paper-based inspection forms",
                        "AI automatically detects and categorizes issues",
                        "Generate professional inspection reports instantly",
                        "Photo documentation with GPS and timestamps",
                        "Maintenance event tracking and history"
                    }
                },
                new ProductFeature
                {
                    Title = "Leak and Freeze Detection",
                    Description = "Early warning system for water damage and freeze risks using AI vision analysis and real-time monitoring",
                    Category = FeatureCategory.Detection,
                    Icon = "droplet-alert",
                    DisplayOrder = 2,
                    KeyBenefits = new List<string>
                    {
                        "AI detects water intrusion and moisture in photos",
                        "Automatic severity assessment (low to critical)",
                        "Instant alerts for high-risk conditions",
                        "Track water damage trends across properties",
                        "Prevent costly freeze damage with early detection"
                    }
                },
                new ProductFeature
                {
                    Title = "Rounds and Readings",
                    Description = "Streamline daily property walkthroughs and equipment readings with mobile-first data collection",
                    Category = FeatureCategory.Monitoring,
                    Icon = "route",
                    DisplayOrder = 3,
                    KeyBenefits = new List<string>
                    {
                        "Digital checklist for daily rounds",
                        "Record equipment readings and meter values",
                        "Photo documentation at each checkpoint",
                        "Track completion rates and compliance",
                        "Historical data for trend analysis"
                    }
                },
                new ProductFeature
                {
                    Title = "Safety Inspections",
                    Description = "Comprehensive safety compliance tracking with automated issue detection and prioritization",
                    Category = FeatureCategory.Safety,
                    Icon = "shield-check",
                    DisplayOrder = 4,
                    KeyBenefits = new List<string>
                    {
                        "AI identifies structural and safety hazards",
                        "Priority-based issue tracking (urgent to low)",
                        "Compliance documentation and audit trails",
                        "Assign corrective actions to team members",
                        "Due date tracking and completion verification"
                    }
                },
                new ProductFeature
                {
                    Title = "Real-Time Metering & IoT Tracking",
                    Description = "Continuous monitoring and data collection from connected sensors and smart meters",
                    Category = FeatureCategory.Automation,
                    Icon = "activity",
                    DisplayOrder = 5,
                    KeyBenefits = new List<string>
                    {
                        "Connect IoT sensors and smart meters",
                        "Real-time data dashboards and alerts",
                        "Energy consumption tracking and optimization",
                        "Automated anomaly detection",
                        "Integration with building management systems"
                    }
                }
            }
        };
    }

    public List<ProductFeature> GetFeaturesByCategory(FeatureCategory category)
    {
        var allFeatures = GetProductFeatures();
        return allFeatures.Features
            .Where(f => f.Category == category && f.IsEnabled)
            .OrderBy(f => f.DisplayOrder)
            .ToList();
    }

    public ProductFeature? GetFeatureById(string featureId)
    {
        var allFeatures = GetProductFeatures();
        return allFeatures.Features.FirstOrDefault(f => f.Id == featureId);
    }

    public Dictionary<string, object> GetPlatformStats()
    {
        return new Dictionary<string, object>
        {
            { "totalFeatures", 5 },
            { "categories", new[] { "Inspection", "Detection", "Monitoring", "Safety", "Automation" } },
            { "aiPowered", true },
            { "mobileFirst", true },
            { "realTimeMonitoring", true }
        };
    }
}
