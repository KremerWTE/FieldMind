using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Models;
using BCrypt.Net;

namespace FieldMind.Api.Data;

public class DbSeeder
{
    private readonly FieldMindDbContext _context;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(FieldMindDbContext context, ILogger<DbSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seed...");

            // Check if data already exists
            if (await _context.Teams.AnyAsync())
            {
                _logger.LogInformation("Database already seeded. Skipping...");
                return;
            }

            // 1. Create Team
            var team = new Team
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Prop-Trax Demo",
                Slug = "prop-trax-demo",
                CreatedAt = DateTime.UtcNow
            };
            _context.Teams.Add(team);

            // 2. Create Users
            // Seed PINs: Admin=12345678, PM=87654321, Tech=11223344
            var adminUser = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = "admin@fieldmind.io",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Pin = HashPin("12345678"),
                FirstName = "Admin",
                LastName = "User",
                TeamId = team.Id,
                Role = UserRole.Admin,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            var pmUser = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = "pm@fieldmind.io",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Pin = HashPin("87654321"),
                FirstName = "Project",
                LastName = "Manager",
                TeamId = team.Id,
                Role = UserRole.PM,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            var fieldTech = new User
            {
                Id = Guid.NewGuid().ToString(),
                Email = "tech@fieldmind.io",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Pin = HashPin("11223344"),
                FirstName = "Field",
                LastName = "Technician",
                TeamId = team.Id,
                Role = UserRole.FieldTech,
                EmailVerified = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.AddRange(adminUser, pmUser, fieldTech);

            // 3. Create Buildings
            var building1 = new Building
            {
                Id = Guid.NewGuid().ToString(),
                PropTraxBuildingId = "PTX-001",
                Name = "Downtown Office Complex",
                Address = "123 Main Street, Chicago, IL 60601",
                GeoLat = 41.8781,
                GeoLng = -87.6298,
                TeamId = team.Id,
                CreatedAt = DateTime.UtcNow
            };

            var building2 = new Building
            {
                Id = Guid.NewGuid().ToString(),
                PropTraxBuildingId = "PTX-002",
                Name = "Riverside Apartments",
                Address = "456 River Road, Chicago, IL 60614",
                GeoLat = 41.9242,
                GeoLng = -87.6542,
                TeamId = team.Id,
                CreatedAt = DateTime.UtcNow
            };

            var building3 = new Building
            {
                Id = Guid.NewGuid().ToString(),
                PropTraxBuildingId = "PTX-003",
                Name = "Industrial Warehouse #7",
                Address = "789 Industrial Parkway, Chicago, IL 60632",
                GeoLat = 41.8119,
                GeoLng = -87.7006,
                TeamId = team.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.Buildings.AddRange(building1, building2, building3);

            // 4. Create Projects
            var project1 = new Project
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Q1 2025 Roof Inspection",
                ClientName = "Downtown Properties LLC",
                BuildingId = building1.Id,
                TeamId = team.Id,
                Status = ProjectStatus.Active,
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            };

            var project2 = new Project
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Storm Damage Assessment",
                ClientName = "Riverside Management Corp",
                BuildingId = building2.Id,
                TeamId = team.Id,
                Status = ProjectStatus.Active,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            };

            var project3 = new Project
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Annual Facility Inspection",
                ClientName = "Industrial Logistics Inc",
                BuildingId = building3.Id,
                TeamId = team.Id,
                Status = ProjectStatus.Active,
                CreatedAt = DateTime.UtcNow.AddDays(-7)
            };

            _context.Projects.AddRange(project1, project2, project3);

            // 5. Create Folders
            var folder1 = new Folder
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Exterior Shots",
                ProjectId = project1.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            };

            var folder2 = new Folder
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Roof Damage",
                ProjectId = project1.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            };

            var folder3 = new Folder
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Water Intrusion",
                ProjectId = project2.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-14)
            };

            _context.Folders.AddRange(folder1, folder2, folder3);

            // 6. Create Sample Photos (with mock S3 keys)
            var photo1 = new Photo
            {
                Id = Guid.NewGuid().ToString(),
                S3Key = $"{team.Id}/{building1.Id}/photo1.jpg",
                S3Url = "https://fieldmind-photos-dev.s3.amazonaws.com/sample/roof-damage-1.jpg",
                BuildingId = building1.Id,
                ProjectId = project1.Id,
                FolderId = folder2.Id,
                UploadedById = fieldTech.Id,
                GeoLat = 41.8781,
                GeoLng = -87.6298,
                CapturedAt = DateTime.UtcNow.AddDays(-20),
                UploadedAt = DateTime.UtcNow.AddDays(-20),
                AiProcessed = true,
                AiStatus = AiStatus.Complete
            };

            var photo2 = new Photo
            {
                Id = Guid.NewGuid().ToString(),
                S3Key = $"{team.Id}/{building1.Id}/photo2.jpg",
                S3Url = "https://fieldmind-photos-dev.s3.amazonaws.com/sample/roof-shingles-1.jpg",
                BuildingId = building1.Id,
                ProjectId = project1.Id,
                FolderId = folder2.Id,
                UploadedById = fieldTech.Id,
                GeoLat = 41.8782,
                GeoLng = -87.6299,
                CapturedAt = DateTime.UtcNow.AddDays(-19),
                UploadedAt = DateTime.UtcNow.AddDays(-19),
                AiProcessed = true,
                AiStatus = AiStatus.Complete
            };

            var photo3 = new Photo
            {
                Id = Guid.NewGuid().ToString(),
                S3Key = $"{team.Id}/{building2.Id}/photo3.jpg",
                S3Url = "https://fieldmind-photos-dev.s3.amazonaws.com/sample/water-damage-1.jpg",
                BuildingId = building2.Id,
                ProjectId = project2.Id,
                FolderId = folder3.Id,
                UploadedById = pmUser.Id,
                GeoLat = 41.9242,
                GeoLng = -87.6542,
                CapturedAt = DateTime.UtcNow.AddDays(-10),
                UploadedAt = DateTime.UtcNow.AddDays(-10),
                AiProcessed = true,
                AiStatus = AiStatus.Complete
            };

            var photo4 = new Photo
            {
                Id = Guid.NewGuid().ToString(),
                S3Key = $"{team.Id}/{building3.Id}/photo4.jpg",
                S3Url = "https://fieldmind-photos-dev.s3.amazonaws.com/sample/warehouse-exterior.jpg",
                BuildingId = building3.Id,
                ProjectId = project3.Id,
                UploadedById = fieldTech.Id,
                GeoLat = 41.8119,
                GeoLng = -87.7006,
                CapturedAt = DateTime.UtcNow.AddDays(-5),
                UploadedAt = DateTime.UtcNow.AddDays(-5),
                AiProcessed = true,
                AiStatus = AiStatus.Complete
            };

            _context.Photos.AddRange(photo1, photo2, photo3, photo4);

            // 7. Create AI Annotations
            var annotation1 = new AiAnnotation
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo1.Id,
                ShortDescription = "Severe hail damage detected on asphalt shingles with multiple impact craters and granule loss.",
                FullDescription = "The roof shows extensive hail damage across a large section of the asphalt shingle surface. Multiple impact craters are visible, ranging from 1-2 inches in diameter. Significant granule loss is evident, exposing the underlying mat. Several shingles show bruising and potential seal failures. The damage pattern is consistent with recent severe hailstorm activity. Immediate attention is required to prevent water intrusion and further deterioration. Recommend full roof replacement or extensive repair in the affected area.",
                Tags = new[] { "hail damage", "roof", "shingles", "severe", "granule loss", "impact craters", "storm damage" },
                Categories = new[] { "roof", "damage", "exterior", "storm-related" },
                DetectedIssuesJson = "[{\"type\":\"hail damage\",\"severity\":\"critical\",\"confidence\":0.92,\"description\":\"Multiple hail impact craters with granule loss across shingle surface\"},{\"type\":\"shingle deterioration\",\"severity\":\"high\",\"confidence\":0.88,\"description\":\"Exposed underlayment due to severe granule loss\"}]",
                SeverityScore = 88,
                ConfidenceScore = 0.90,
                EstimatedRepairPriority = RepairPriority.Urgent,
                StructuralImpactScore = 75,
                ModelUsed = "gpt-4o",
                Version = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            };

            var annotation2 = new AiAnnotation
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo2.Id,
                ShortDescription = "Minor wear and aging on asphalt shingles with some edge curling.",
                FullDescription = "The roof surface shows normal wear patterns consistent with age. Some shingles display slight edge curling and minor granule loss, typical for a roof approaching mid-life. No immediate structural concerns are visible. The overall condition is acceptable with no critical defects. Regular monitoring is recommended, with potential replacement consideration in 3-5 years. Flashing and seals appear intact. Color fading is consistent with UV exposure over time.",
                Tags = new[] { "roof", "shingles", "aging", "minor wear", "curling", "normal condition" },
                Categories = new[] { "roof", "exterior", "maintenance" },
                DetectedIssuesJson = "[{\"type\":\"minor aging\",\"severity\":\"low\",\"confidence\":0.82,\"description\":\"Slight edge curling and granule loss consistent with normal aging\"}]",
                SeverityScore = 25,
                ConfidenceScore = 0.82,
                EstimatedRepairPriority = RepairPriority.Low,
                StructuralImpactScore = 15,
                ModelUsed = "gpt-4o",
                Version = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-19)
            };

            var annotation3 = new AiAnnotation
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo3.Id,
                ShortDescription = "Active water intrusion with ceiling staining and visible moisture damage.",
                FullDescription = "Significant water damage is evident on the interior ceiling surface. Dark brown staining indicates active or recent water intrusion. The drywall shows signs of saturation with visible bubbling and peeling paint. Moisture patterns suggest the leak originates from the roof or upper-floor plumbing. Mold growth risk is high in the affected area. The extent of damage suggests this has been ongoing for some time. Immediate investigation of the source is critical. Ceiling material may require replacement after leak repair. Air quality testing for mold is recommended.",
                Tags = new[] { "water damage", "ceiling", "staining", "moisture", "leak", "interior", "active intrusion", "mold risk" },
                Categories = new[] { "interior", "water", "damage", "ceiling", "leak" },
                DetectedIssuesJson = "[{\"type\":\"water intrusion\",\"severity\":\"critical\",\"confidence\":0.95,\"description\":\"Active water leak causing ceiling damage and staining\"},{\"type\":\"moisture damage\",\"severity\":\"high\",\"confidence\":0.91,\"description\":\"Saturated drywall with paint failure and potential mold growth\"}]",
                SeverityScore = 92,
                ConfidenceScore = 0.93,
                EstimatedRepairPriority = RepairPriority.Urgent,
                StructuralImpactScore = 68,
                ModelUsed = "gpt-4o",
                Version = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };

            var annotation4 = new AiAnnotation
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo4.Id,
                ShortDescription = "Warehouse exterior in good condition with minor cosmetic wear.",
                FullDescription = "The warehouse exterior appears to be in solid structural condition. Minor surface rust is visible on metal panels, consistent with normal weathering. No significant structural defects or safety concerns are present. Paint is fading in some areas but protective coating remains intact. Loading dock area shows normal wear from regular use. Foundation appears stable with no visible cracking. Overall maintenance level is acceptable for an industrial facility of this age and use type.",
                Tags = new[] { "warehouse", "exterior", "metal siding", "good condition", "minor rust", "industrial" },
                Categories = new[] { "exterior", "industrial", "structural" },
                DetectedIssuesJson = "[{\"type\":\"surface rust\",\"severity\":\"low\",\"confidence\":0.75,\"description\":\"Minor surface oxidation on metal panels, no structural compromise\"}]",
                SeverityScore = 18,
                ConfidenceScore = 0.78,
                EstimatedRepairPriority = RepairPriority.Low,
                StructuralImpactScore = 10,
                ModelUsed = "gpt-4o",
                Version = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };

            _context.AiAnnotations.AddRange(annotation1, annotation2, annotation3, annotation4);

            // 8. Create Maintenance Events (for critical issues)
            var maintenanceEvent1 = new MaintenanceEvent
            {
                Id = Guid.NewGuid().ToString(),
                BuildingId = building1.Id,
                Type = MaintenanceEventType.MonitoringAlert,
                DetectedBy = DetectionSource.AI,
                Severity = IssueSeverity.Critical,
                Status = MaintenanceEventStatus.Open,
                Title = "AI Detected: hail damage",
                Description = "Automated analysis detected 2 issue(s): Multiple hail impact craters with granule loss across shingle surface; Exposed underlayment due to severe granule loss",
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            };

            var maintenanceEvent2 = new MaintenanceEvent
            {
                Id = Guid.NewGuid().ToString(),
                BuildingId = building2.Id,
                Type = MaintenanceEventType.MonitoringAlert,
                DetectedBy = DetectionSource.AI,
                Severity = IssueSeverity.Critical,
                Status = MaintenanceEventStatus.Open,
                Title = "AI Detected: water intrusion",
                Description = "Automated analysis detected 2 issue(s): Active water leak causing ceiling damage and staining; Saturated drywall with paint failure and potential mold growth",
                CreatedAt = DateTime.UtcNow.AddDays(-10)
            };

            _context.MaintenanceEvents.AddRange(maintenanceEvent1, maintenanceEvent2);

            // Link photos to maintenance events
            photo1.MaintenanceEventId = maintenanceEvent1.Id;
            photo3.MaintenanceEventId = maintenanceEvent2.Id;

            // 9. Create Building Health Stats
            var healthStats = new List<BuildingHealthStat>
            {
                // Building 1 - Roof Integrity declining due to hail damage
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building1.Id,
                    MetricType = HealthMetricType.RoofIntegrity,
                    Value = 95.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-20)
                },
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building1.Id,
                    MetricType = HealthMetricType.HailExposure,
                    Value = 1.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-20)
                },
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building1.Id,
                    MetricType = HealthMetricType.StructuralRisk,
                    Value = 75.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-20)
                },

                // Building 2 - High water risk
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building2.Id,
                    MetricType = HealthMetricType.WaterRisk,
                    Value = 85.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-10)
                },
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building2.Id,
                    MetricType = HealthMetricType.StructuralRisk,
                    Value = 68.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-10)
                },

                // Building 3 - Good overall health
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building3.Id,
                    MetricType = HealthMetricType.RoofIntegrity,
                    Value = 98.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-5)
                },
                new BuildingHealthStat
                {
                    Id = Guid.NewGuid().ToString(),
                    BuildingId = building3.Id,
                    MetricType = HealthMetricType.StructuralRisk,
                    Value = 10.0,
                    Source = MetricSource.AI,
                    RecordedAt = DateTime.UtcNow.AddDays(-5)
                }
            };

            _context.BuildingHealthStats.AddRange(healthStats);

            // 10. Create Photo Notes
            var note1 = new PhotoNote
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo1.Id,
                UserId = pmUser.Id,
                Content = "Confirmed on-site. Need to schedule roof replacement ASAP. Getting quotes from contractors.",
                CreatedAt = DateTime.UtcNow.AddDays(-18)
            };

            var note2 = new PhotoNote
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo3.Id,
                UserId = adminUser.Id,
                Content = "Contacted building manager. Plumber scheduled for tomorrow. Will need ceiling repair after leak is fixed.",
                CreatedAt = DateTime.UtcNow.AddDays(-9)
            };

            _context.PhotoNotes.AddRange(note1, note2);

            // 11. Create Photo Tasks
            var task1 = new PhotoTask
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo1.Id,
                Title = "Get 3 contractor quotes for roof replacement",
                Description = "Contact certified roofing contractors for competitive quotes on full roof replacement",
                Status = Models.TaskStatus.InProgress,
                AssigneeId = pmUser.Id,
                CreatedById = pmUser.Id,
                DueDate = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow.AddDays(-18)
            };

            var task2 = new PhotoTask
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo3.Id,
                Title = "Schedule plumber for leak repair",
                Description = "Emergency plumbing service to locate and repair ceiling leak source",
                Status = Models.TaskStatus.Done,
                AssigneeId = adminUser.Id,
                CreatedById = adminUser.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-9),
                UpdatedAt = DateTime.UtcNow.AddDays(-8)
            };

            var task3 = new PhotoTask
            {
                Id = Guid.NewGuid().ToString(),
                PhotoId = photo3.Id,
                Title = "Ceiling repair and repainting",
                Description = "Restore ceiling after leak repair, test for mold, repaint affected area",
                Status = Models.TaskStatus.Open,
                AssigneeId = pmUser.Id,
                CreatedById = pmUser.Id,
                DueDate = DateTime.UtcNow.AddDays(14),
                CreatedAt = DateTime.UtcNow.AddDays(-8)
            };

            _context.PhotoTasks.AddRange(task1, task2, task3);

            // 12. Create Alert Rules for Monitoring
            await SeedAlertRules();

            // Save all changes
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Database seeded successfully!");
            _logger.LogInformation("Created:");
            _logger.LogInformation("  - 1 Team: Prop-Trax Demo");
            _logger.LogInformation("  - 3 Users:");
            _logger.LogInformation("      admin@fieldmind.io  PIN: 12345678  (Admin)");
            _logger.LogInformation("      pm@fieldmind.io     PIN: 87654321  (PM)");
            _logger.LogInformation("      tech@fieldmind.io   PIN: 11223344  (FieldTech)");
            _logger.LogInformation("  - 3 Buildings");
            _logger.LogInformation("  - 3 Projects");
            _logger.LogInformation("  - 3 Folders");
            _logger.LogInformation("  - 4 Photos with AI annotations");
            _logger.LogInformation("  - 2 Critical maintenance events");
            _logger.LogInformation("  - 7 Building health stats");
            _logger.LogInformation("  - 2 Photo notes");
            _logger.LogInformation("  - 3 Photo tasks");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding database");
            throw;
        }
    }

    private static string HashPin(string pin)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(pin));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private async Task SeedAlertRules()
    {
        try
        {
            // Check if alert rules already exist
            var existingRules = await _context.Database
                .SqlQueryRaw<int>("SELECT COUNT(*)::int as Value FROM monitoring.alert_rules")
                .FirstOrDefaultAsync();

            if (existingRules > 0)
            {
                _logger.LogInformation("Alert rules already exist. Skipping...");
                return;
            }

            // Insert pre-configured alert rules
            await _context.Database.ExecuteSqlRawAsync(@"
                INSERT INTO monitoring.alert_rules
                (id, name, description, enabled, severity, query, threshold, notification_channels, throttle_minutes)
                VALUES
                (
                    'high-error-rate',
                    'High API Error Rate',
                    'API error rate exceeds 5% in last 5 minutes',
                    true,
                    'critical',
                    'SELECT COALESCE(CAST(COUNT(*) FILTER (WHERE status_code >= 500) AS FLOAT) / NULLIF(COUNT(*), 0) * 100, 0) FROM monitoring.api_metrics WHERE time > NOW() - INTERVAL ''5 minutes''',
                    5.0,
                    ARRAY['email'],
                    15
                ),
                (
                    'slow-api-response',
                    'Slow API Response Time',
                    'P95 API response time exceeds 2 seconds',
                    true,
                    'warning',
                    'SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) FROM monitoring.api_metrics WHERE time > NOW() - INTERVAL ''10 minutes''',
                    2000.0,
                    ARRAY['email'],
                    30
                ),
                (
                    'high-queue-depth',
                    'High Hangfire Queue Depth',
                    'More than 100 jobs in queue',
                    true,
                    'warning',
                    'SELECT COALESCE(COUNT(*)::float, 0) FROM hangfire.job WHERE state_name IN (''Enqueued'', ''Scheduled'')',
                    100.0,
                    ARRAY['email'],
                    15
                ),
                (
                    'critical-errors',
                    'Critical Errors from Web/Mobile',
                    'Critical or fatal errors reported in last 5 minutes',
                    true,
                    'critical',
                    'SELECT COALESCE(COUNT(*)::float, 0) FROM monitoring.error_logs WHERE severity IN (''critical'', ''fatal'') AND occurred_at > NOW() - INTERVAL ''5 minutes''',
                    0.5,
                    ARRAY['email'],
                    15
                ),
                (
                    'failed-jobs',
                    'Failed Background Jobs',
                    'More than 5 failed jobs in queue',
                    true,
                    'warning',
                    'SELECT COALESCE(COUNT(*)::float, 0) FROM hangfire.job WHERE state_name = ''Failed''',
                    5.0,
                    ARRAY['email'],
                    30
                )
            ");

            _logger.LogInformation("✅ Alert rules seeded successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed alert rules");
            // Don't throw - continue with other seeding
        }
    }
}
