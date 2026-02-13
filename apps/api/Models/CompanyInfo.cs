namespace FieldMind.Api.Models;

public class CompanyInfo
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TeamId { get; set; } = string.Empty;

    // Basic Information
    public string CompanyName { get; set; } = "FieldMind";
    public string Tagline { get; set; } = "AI-Powered Property Intelligence Platform";
    public string Description { get; set; } = "Transform property management with intelligent photo analysis and proactive maintenance monitoring";

    // Contact Information
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    // Branding
    public string LogoUrl { get; set; } = string.Empty;
    public string PrimaryColor { get; set; } = "#2563EB"; // Blue
    public string SecondaryColor { get; set; } = "#1E40AF"; // Dark Blue

    // Service Areas
    public List<string> ServiceAreas { get; set; } = new() { "Property Management", "Facility Maintenance", "Building Inspections" };
    public List<string> Industries { get; set; } = new() { "Commercial Real Estate", "Multi-Family Housing", "Industrial Facilities" };

    // Features Offered
    public List<string> CoreServices { get; set; } = new()
    {
        "AI-Powered Photo Analysis",
        "Automated Maintenance Detection",
        "Building Health Monitoring",
        "Digital Inspections",
        "Real-Time Alerts"
    };

    // Stats/Numbers
    public int YearsInBusiness { get; set; } = 5;
    public int TotalBuildings { get; set; } = 0;
    public int TotalInspections { get; set; } = 0;
    public int TeamMembers { get; set; } = 0;

    // Social Media
    public string LinkedInUrl { get; set; } = string.Empty;
    public string TwitterUrl { get; set; } = string.Empty;
    public string FacebookUrl { get; set; } = string.Empty;

    // Certifications & Compliance
    public List<string> Certifications { get; set; } = new();
    public List<string> Compliance { get; set; } = new() { "SOC 2 Type II", "GDPR Compliant", "HIPAA Ready" };

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
