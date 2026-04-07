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

            // 1. Create Team — fixed ID so tokens survive restarts
            var team = new Team
            {
                Id = "00000000-0000-0000-0000-000000000001",
                Name = "Prop-Trax Demo",
                Slug = "prop-trax-demo",
                CreatedAt = DateTime.UtcNow
            };
            _context.Teams.Add(team);

            // 2. Create Users — fixed IDs so tokens survive restarts
            // Seed PINs: Admin=12345678, PM=87654321, Tech=11223344
            var adminUser = new User
            {
                Id = "00000000-0000-0000-0000-000000000010",
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
                Id = "00000000-0000-0000-0000-000000000011",
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
                Id = "00000000-0000-0000-0000-000000000012",
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

            // Timesheet workers (week of March 23, 2026)
            var sergio = new User { Id = "00000000-0000-0000-0000-000000000020", Email = "sergio@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("11111111"), FirstName = "Sergio", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };
            var placido = new User { Id = "00000000-0000-0000-0000-000000000021", Email = "placido@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("22222222"), FirstName = "Placido", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };
            var esau = new User { Id = "00000000-0000-0000-0000-000000000022", Email = "esau@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("33333333"), FirstName = "Esau", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };
            var geobert = new User { Id = "00000000-0000-0000-0000-000000000023", Email = "geobert@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("44444444"), FirstName = "Geobert", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };
            var frank = new User { Id = "00000000-0000-0000-0000-000000000024", Email = "frank@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("55555555"), FirstName = "Frank", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };
            var jaime = new User { Id = "00000000-0000-0000-0000-000000000025", Email = "jaime@fieldmind.io", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), Pin = HashPin("66666666"), FirstName = "Jaime", LastName = "", TeamId = team.Id, Role = UserRole.FieldTech, EmailVerified = true, CreatedAt = DateTime.UtcNow };

            _context.Users.AddRange(adminUser, pmUser, fieldTech, sergio, placido, esau, geobert, frank, jaime);

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

            // 12. Create Payroll Periods
            var today = DateTime.UtcNow.Date;
            var currentMonday = today.AddDays(-(int)today.DayOfWeek == 0 ? 6 : (int)today.DayOfWeek - 1);
            var lastMonday = currentMonday.AddDays(-7);
            var twoWeeksAgoMonday = currentMonday.AddDays(-14);

            var currentPeriod = new PayrollPeriod
            {
                Id = Guid.NewGuid().ToString(),
                TeamId = team.Id,
                PeriodStart = currentMonday,
                PeriodEnd = currentMonday.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59),
                Status = PayrollStatus.Draft,
                CreatedAt = currentMonday,
                UpdatedAt = currentMonday
            };

            var lastPeriod = new PayrollPeriod
            {
                Id = Guid.NewGuid().ToString(),
                TeamId = team.Id,
                PeriodStart = lastMonday,
                PeriodEnd = lastMonday.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59),
                Status = PayrollStatus.Approved,
                SubmittedById = adminUser.Id,
                SubmittedAt = currentMonday.AddHours(9),
                CreatedAt = lastMonday,
                UpdatedAt = currentMonday
            };

            var olderPeriod = new PayrollPeriod
            {
                Id = Guid.NewGuid().ToString(),
                TeamId = team.Id,
                PeriodStart = twoWeeksAgoMonday,
                PeriodEnd = twoWeeksAgoMonday.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59),
                Status = PayrollStatus.Submitted,
                SubmittedById = adminUser.Id,
                SubmittedAt = lastMonday.AddHours(9),
                CreatedAt = twoWeeksAgoMonday,
                UpdatedAt = lastMonday
            };

            _context.PayrollPeriods.AddRange(currentPeriod, lastPeriod, olderPeriod);

            // 13. Create Time Entries — last 2 weeks + current week
            var timeEntries = new List<TimeEntry>
            {
                // Current week — field tech, 3 days
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Downtown Office Complex", ClockIn = currentMonday.AddHours(7).AddMinutes(45), ClockOut = currentMonday.AddHours(16).AddMinutes(30), IsApproved = false, CreatedAt = currentMonday },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Riverside Apartments", ClockIn = currentMonday.AddDays(1).AddHours(8), ClockOut = currentMonday.AddDays(1).AddHours(17), IsApproved = false, CreatedAt = currentMonday.AddDays(1) },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Industrial Warehouse #7", ClockIn = currentMonday.AddDays(2).AddHours(7).AddMinutes(30), ClockOut = currentMonday.AddDays(2).AddHours(15).AddMinutes(45), IsApproved = false, CreatedAt = currentMonday.AddDays(2) },
                // Current week — PM
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = pmUser.Id, TeamId = team.Id, Location = "Office", ClockIn = currentMonday.AddHours(8), ClockOut = currentMonday.AddHours(17), IsApproved = false, CreatedAt = currentMonday },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = pmUser.Id, TeamId = team.Id, Location = "Downtown Office Complex", ClockIn = currentMonday.AddDays(1).AddHours(8).AddMinutes(30), ClockOut = currentMonday.AddDays(1).AddHours(16), IsApproved = false, CreatedAt = currentMonday.AddDays(1) },

                // Last week — field tech, full week
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Downtown Office Complex", ClockIn = lastMonday.AddHours(7).AddMinutes(50), ClockOut = lastMonday.AddHours(16).AddMinutes(20), IsApproved = true, CreatedAt = lastMonday },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Riverside Apartments", ClockIn = lastMonday.AddDays(1).AddHours(8), ClockOut = lastMonday.AddDays(1).AddHours(17).AddMinutes(15), IsApproved = true, CreatedAt = lastMonday.AddDays(1) },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Industrial Warehouse #7", ClockIn = lastMonday.AddDays(2).AddHours(7).AddMinutes(45), ClockOut = lastMonday.AddDays(2).AddHours(16), IsApproved = true, CreatedAt = lastMonday.AddDays(2) },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Downtown Office Complex", ClockIn = lastMonday.AddDays(3).AddHours(8), ClockOut = lastMonday.AddDays(3).AddHours(17), IsApproved = true, CreatedAt = lastMonday.AddDays(3) },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = fieldTech.Id, TeamId = team.Id, Location = "Office", ClockIn = lastMonday.AddDays(4).AddHours(8).AddMinutes(15), ClockOut = lastMonday.AddDays(4).AddHours(15).AddMinutes(30), IsApproved = true, CreatedAt = lastMonday.AddDays(4) },
                // Last week — PM
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = pmUser.Id, TeamId = team.Id, Location = "Office", ClockIn = lastMonday.AddHours(8), ClockOut = lastMonday.AddHours(17), IsApproved = true, CreatedAt = lastMonday },
                new TimeEntry { Id = Guid.NewGuid().ToString(), UserId = pmUser.Id, TeamId = team.Id, Location = "Riverside Apartments", ClockIn = lastMonday.AddDays(2).AddHours(9), ClockOut = lastMonday.AddDays(2).AddHours(14).AddMinutes(30), IsApproved = true, CreatedAt = lastMonday.AddDays(2) },
            };

            _context.TimeEntries.AddRange(timeEntries);

            // Timesheet workers — week of March 23, 2026 (twoWeeksAgoMonday)
            // Sergio: M8 T8 W8 T6 F9
            // Placido, Esau, Geobert, Frank, Jaime: M8 T8 W8 T8 F8
            var sheetWeek = twoWeeksAgoMonday;
            var timesheetEntries = new List<TimeEntry>();
            void AddWeek(string userId, double[] hours) {
                for (int d = 0; d < hours.Length; d++) {
                    if (hours[d] <= 0) continue;
                    timesheetEntries.Add(new TimeEntry {
                        Id = Guid.NewGuid().ToString(), UserId = userId, TeamId = team.Id,
                        Location = "Downtown Office Complex",
                        ClockIn = sheetWeek.AddDays(d).AddHours(7),
                        ClockOut = sheetWeek.AddDays(d).AddHours(7 + hours[d]),
                        IsApproved = true, CreatedAt = sheetWeek.AddDays(d)
                    });
                }
            }
            AddWeek(sergio.Id,  new[] { 8.0, 8, 8, 6, 9 });
            AddWeek(placido.Id, new[] { 8.0, 8, 8, 8, 8 });
            AddWeek(esau.Id,    new[] { 8.0, 8, 8, 8, 8 });
            AddWeek(geobert.Id, new[] { 8.0, 8, 8, 8, 8 });
            AddWeek(frank.Id,   new[] { 8.0, 8, 8, 8, 8 });
            AddWeek(jaime.Id,   new[] { 8.0, 8, 8, 8, 8 });
            _context.TimeEntries.AddRange(timesheetEntries);

            // 14. Create Alert Rules for Monitoring
            await SeedAlertRules();

            // Save all changes
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Database seeded successfully!");
            _logger.LogInformation("Created:");
            _logger.LogInformation("  - 1 Team: Prop-Trax Demo");
            _logger.LogInformation("  - 9 Users:");
            _logger.LogInformation("      admin@fieldmind.io  PIN: 12345678  (Admin)");
            _logger.LogInformation("      pm@fieldmind.io     PIN: 87654321  (PM)");
            _logger.LogInformation("      tech@fieldmind.io   PIN: 11223344  (FieldTech)");
            _logger.LogInformation("      sergio@fieldmind.io PIN: 11111111  (FieldTech)");
            _logger.LogInformation("      placido@fieldmind.io PIN: 22222222 (FieldTech)");
            _logger.LogInformation("      esau@fieldmind.io   PIN: 33333333  (FieldTech)");
            _logger.LogInformation("      geobert@fieldmind.io PIN: 44444444 (FieldTech)");
            _logger.LogInformation("      frank@fieldmind.io  PIN: 55555555  (FieldTech)");
            _logger.LogInformation("      jaime@fieldmind.io  PIN: 66666666  (FieldTech)");
            _logger.LogInformation("  - 3 Buildings");
            _logger.LogInformation("  - 3 Projects");
            _logger.LogInformation("  - 3 Folders");
            _logger.LogInformation("  - 4 Photos with AI annotations");
            _logger.LogInformation("  - 2 Critical maintenance events");
            _logger.LogInformation("  - 7 Building health stats");
            _logger.LogInformation("  - 2 Photo notes");
            _logger.LogInformation("  - 3 Photo tasks");
            _logger.LogInformation("  - 3 Payroll periods (current/last/older week)");
            _logger.LogInformation("  - 12 Time entries across 2 weeks");
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

    private Task SeedAlertRules()
    {
        // Monitoring tables not used in SQLite mode
        return Task.CompletedTask;
    }
}
