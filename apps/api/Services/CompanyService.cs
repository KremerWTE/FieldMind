using FieldMind.Api.Models;

namespace FieldMind.Api.Services;

public class CompanyService
{
    // This would typically be stored in database per team
    // For now, returning default company information

    public CompanyInfo GetCompanyInfo(string? teamId = null)
    {
        return new CompanyInfo
        {
            TeamId = teamId ?? "default",
            CompanyName = "FieldMind",
            Tagline = "AI-Powered Property & Asset Intelligence Platform",
            Description = "FieldMind transforms traditional property management into an intelligent, proactive operation. Our AI-powered platform automatically detects maintenance issues, tracks building health, and streamlines inspections—saving time, reducing costs, and preventing problems before they become critical.",

            Phone = "(555) 123-4567",
            Email = "contact@fieldmind.io",
            Website = "https://fieldmind.io",
            Address = "123 Innovation Drive, Austin, TX 78701",

            LogoUrl = "/logo.svg",
            PrimaryColor = "#2563EB",
            SecondaryColor = "#1E40AF",

            ServiceAreas = new List<string>
            {
                "Property Management",
                "Facility Maintenance",
                "Building Inspections",
                "Asset Intelligence",
                "Preventive Maintenance"
            },

            Industries = new List<string>
            {
                "Commercial Real Estate",
                "Multi-Family Housing",
                "Industrial Facilities",
                "Retail Properties",
                "Healthcare Facilities",
                "Educational Institutions"
            },

            CoreServices = new List<string>
            {
                "AI-Powered Photo Analysis - Automatic issue detection in every photo",
                "Automated Maintenance Detection - High-severity alerts in real-time",
                "Building Health Monitoring - Track roof integrity, water risk, structural issues",
                "Digital Inspections - Paperless workflows with instant reporting",
                "Intelligent Search - Find any issue across your entire portfolio",
                "Leak & Freeze Detection - Early warning for water damage",
                "Safety Inspections - Compliance tracking and hazard identification",
                "Real-Time IoT Integration - Connect sensors and smart meters"
            },

            YearsInBusiness = 5,

            LinkedInUrl = "https://linkedin.com/company/fieldmind",
            TwitterUrl = "https://twitter.com/fieldmind",

            Certifications = new List<string>
            {
                "AWS Partner Network",
                "Microsoft Azure Certified",
                "ISO 27001 Certified"
            },

            Compliance = new List<string>
            {
                "SOC 2 Type II Compliant",
                "GDPR Compliant",
                "CCPA Compliant",
                "HIPAA Ready"
            }
        };
    }

    public Dictionary<string, object> GetCompanyStats(string? teamId = null)
    {
        // In production, these would be real-time stats from database
        return new Dictionary<string, object>
        {
            { "buildingsManaged", "5,000+" },
            { "photosAnalyzed", "250,000+" },
            { "issuesDetected", "50,000+" },
            { "costSavings", "$2.5M+" },
            { "customerSatisfaction", "98%" },
            { "averageResponseTime", "< 2 hours" }
        };
    }

    public List<object> GetTestimonials()
    {
        return new List<object>
        {
            new
            {
                name = "Sarah Johnson",
                title = "Director of Property Management",
                company = "Premier Properties Group",
                quote = "FieldMind's AI analysis caught a critical roof issue before our inspection team even arrived. The early detection saved us over $50,000 in emergency repairs.",
                rating = 5
            },
            new
            {
                name = "Michael Chen",
                title = "Facilities Manager",
                company = "TechCorp Industries",
                quote = "The mobile app makes daily rounds so much easier. Our team loves the instant AI feedback, and management loves the automatic reporting.",
                rating = 5
            },
            new
            {
                name = "Jennifer Martinez",
                title = "VP of Operations",
                company = "Residential Living Partners",
                quote = "We've reduced inspection time by 60% and improved issue detection by 85%. FieldMind pays for itself every single month.",
                rating = 5
            }
        };
    }

    public object GetPricingInfo()
    {
        return new
        {
            plans = new object[]
            {
                new
                {
                    name = "Starter",
                    price = "$99/month",
                    description = "Perfect for small property managers",
                    features = new[]
                    {
                        "Up to 5 buildings",
                        "1,000 photos/month",
                        "AI analysis included",
                        "Mobile app access",
                        "Email support"
                    }
                },
                new
                {
                    name = "Professional",
                    price = "$299/month",
                    description = "For growing portfolios",
                    features = new[]
                    {
                        "Up to 25 buildings",
                        "5,000 photos/month",
                        "Advanced AI features",
                        "Team collaboration",
                        "Priority support",
                        "Custom reports"
                    },
                    popular = true
                },
                new
                {
                    name = "Enterprise",
                    price = "Custom",
                    description = "For large organizations",
                    features = new[]
                    {
                        "Unlimited buildings",
                        "Unlimited photos",
                        "Dedicated account manager",
                        "Custom integrations",
                        "SLA guarantees",
                        "On-premise deployment option"
                    }
                }
            },
            trialPeriod = "14 days free trial",
            moneyBackGuarantee = "30-day money-back guarantee"
        };
    }
}
