using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using FieldMind.Api.Data;
using FieldMind.Api.Models;

namespace FieldMind.Api.Services;

public class PDFReportService
{
    private readonly FieldMindDbContext _context;
    private readonly S3StorageService _s3Service;
    private readonly ILogger<PDFReportService> _logger;

    public PDFReportService(
        FieldMindDbContext context,
        S3StorageService s3Service,
        ILogger<PDFReportService> logger)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;

        // Configure QuestPDF license (Community license for open-source/personal projects)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GenerateBuildingReport(
        string buildingId,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        bool includeAI = true)
    {
        var building = await _context.Buildings
            .Include(b => b.Photos.Where(p =>
                (!dateFrom.HasValue || p.UploadedAt >= dateFrom) &&
                (!dateTo.HasValue || p.UploadedAt <= dateTo)))
            .ThenInclude(p => p.AiAnnotations.OrderByDescending(a => a.Version).Take(1))
            .Include(b => b.MaintenanceEvents)
            .Include(b => b.HealthStats)
            .FirstOrDefaultAsync(b => b.Id == buildingId);

        if (building == null)
            throw new InvalidOperationException("Building not found");

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(50);
                page.DefaultTextStyle(x => x.FontSize(11));

                // Header
                page.Header().Element(c => ComposeHeader(c, building, dateFrom, dateTo));

                // Content
                page.Content().Element(c => ComposeBuildingContent(c, building, includeAI));

                // Footer
                page.Footer().AlignCenter().Text(text =>
                {
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, Building building, DateTime? dateFrom, DateTime? dateTo)
    {
        container.Column(column =>
        {
            column.Item().PaddingBottom(10).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("FieldMind Inspection Report").FontSize(20).Bold();
                    c.Item().Text(building.Name).FontSize(16);
                    c.Item().Text(building.Address ?? "").FontSize(10).FontColor(Colors.Grey.Darken1);
                });

                row.ConstantItem(100).AlignRight().Column(c =>
                {
                    c.Item().Text(DateTime.UtcNow.ToString("MM/dd/yyyy")).FontSize(10);
                    if (dateFrom.HasValue || dateTo.HasValue)
                    {
                        var dateRange = dateFrom.HasValue && dateTo.HasValue
                            ? $"{dateFrom:MM/dd/yyyy} - {dateTo:MM/dd/yyyy}"
                            : dateFrom.HasValue
                            ? $"From {dateFrom:MM/dd/yyyy}"
                            : $"Until {dateTo:MM/dd/yyyy}";
                        c.Item().Text(dateRange).FontSize(9).FontColor(Colors.Grey.Darken1);
                    }
                });
            });
        });
    }

    private void ComposeBuildingContent(IContainer container, Building building, bool includeAI)
    {
        container.Column(column =>
        {
            column.Spacing(15);

            // Summary Section
            column.Item().Element(c => ComposeSummary(c, building));

            // Health Stats Section
            if (building.HealthStats.Any())
            {
                column.Item().PageBreak();
                column.Item().Element(c => ComposeHealthStats(c, building.HealthStats.ToList()));
            }

            // Maintenance Events Section
            if (building.MaintenanceEvents.Any())
            {
                column.Item().PageBreak();
                column.Item().Element(c => ComposeMaintenanceEvents(c, building.MaintenanceEvents.ToList()));
            }

            // Photos Section
            if (building.Photos.Any())
            {
                column.Item().PageBreak();
                column.Item().Element(c => ComposePhotos(c, building.Photos.ToList(), includeAI));
            }
        });
    }

    private void ComposeSummary(IContainer container, Building building)
    {
        container.Column(column =>
        {
            column.Item().Text("Building Summary").FontSize(16).Bold();
            column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            column.Item().PaddingVertical(5).Row(row =>
            {
                row.RelativeItem().Text("Building ID:").Bold();
                row.RelativeItem().Text(building.PropTraxBuildingId ?? "N/A");
            });

            column.Item().PaddingVertical(5).Row(row =>
            {
                row.RelativeItem().Text("Total Photos:").Bold();
                row.RelativeItem().Text(building.Photos.Count.ToString());
            });

            column.Item().PaddingVertical(5).Row(row =>
            {
                row.RelativeItem().Text("Active Maintenance Events:").Bold();
                row.RelativeItem().Text(building.MaintenanceEvents.Count(e => e.Status != MaintenanceEventStatus.Resolved).ToString());
            });

            if (building.GeoLat.HasValue && building.GeoLng.HasValue)
            {
                column.Item().PaddingVertical(5).Row(row =>
                {
                    row.RelativeItem().Text("Coordinates:").Bold();
                    row.RelativeItem().Text($"{building.GeoLat:F6}, {building.GeoLng:F6}");
                });
            }
        });
    }

    private void ComposeHealthStats(IContainer container, List<BuildingHealthStat> stats)
    {
        container.Column(column =>
        {
            column.Item().Text("Building Health Statistics").FontSize(16).Bold();
            column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            var groupedStats = stats.GroupBy(s => s.MetricType).ToList();

            foreach (var group in groupedStats)
            {
                var latestStat = group.OrderByDescending(s => s.RecordedAt).First();

                column.Item().PaddingVertical(8).Column(c =>
                {
                    c.Item().Row(row =>
                    {
                        row.RelativeItem().Text(group.Key.ToString()).FontSize(13).Bold();
                        row.ConstantItem(80).AlignRight().Text($"{latestStat.Value:F1}").FontSize(13)
                            .FontColor(GetHealthStatColor(group.Key, latestStat.Value));
                    });

                    c.Item().PaddingTop(3).Text($"Last updated: {latestStat.RecordedAt:MM/dd/yyyy HH:mm}")
                        .FontSize(9).FontColor(Colors.Grey.Darken1);
                });
            }
        });
    }

    private void ComposeMaintenanceEvents(IContainer container, List<MaintenanceEvent> events)
    {
        container.Column(column =>
        {
            column.Item().Text("Maintenance Events").FontSize(16).Bold();
            column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            foreach (var evt in events.OrderByDescending(e => e.CreatedAt).Take(20))
            {
                column.Item().PaddingVertical(8).Column(c =>
                {
                    c.Item().Row(row =>
                    {
                        row.RelativeItem().Text(evt.Title).FontSize(12).Bold();
                        row.ConstantItem(80).AlignRight().Text(evt.Severity.ToString())
                            .FontSize(10)
                            .FontColor(GetSeverityColor(evt.Severity));
                    });

                    c.Item().PaddingTop(3).Text(evt.Description).FontSize(10);

                    c.Item().PaddingTop(3).Row(row =>
                    {
                        row.RelativeItem().Text($"Detected by: {evt.DetectedBy}").FontSize(9).FontColor(Colors.Grey.Darken1);
                        row.RelativeItem().Text($"Status: {evt.Status}").FontSize(9).FontColor(Colors.Grey.Darken1);
                        row.RelativeItem().Text($"Date: {evt.CreatedAt:MM/dd/yyyy}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    });
                });

                column.Item().PaddingTop(5).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten3);
            }
        });
    }

    private void ComposePhotos(IContainer container, List<Photo> photos, bool includeAI)
    {
        container.Column(column =>
        {
            column.Item().Text($"Photos ({photos.Count})").FontSize(16).Bold();
            column.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            foreach (var photo in photos.Take(50)) // Limit to 50 photos for PDF size
            {
                column.Item().PaddingVertical(10).Column(c =>
                {
                    // Photo metadata
                    c.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Photo ID: {photo.Id.Substring(0, 8)}...").FontSize(10).Bold();
                        row.ConstantItem(150).AlignRight().Text($"Uploaded: {photo.UploadedAt:MM/dd/yyyy HH:mm}").FontSize(9);
                    });

                    // AI Analysis if available
                    if (includeAI)
                    {
                        var annotation = photo.AiAnnotations.FirstOrDefault();
                        if (annotation != null)
                        {
                            c.Item().PaddingTop(5).Column(aiColumn =>
                            {
                                aiColumn.Item().Text("AI Analysis").FontSize(11).Bold().FontColor(Colors.Blue.Darken1);

                                aiColumn.Item().PaddingTop(3).Text(annotation.ShortDescription).FontSize(10);

                                if (annotation.Tags.Any())
                                {
                                    aiColumn.Item().PaddingTop(3).Row(row =>
                                    {
                                        row.ConstantItem(50).Text("Tags:").FontSize(9).Bold();
                                        row.RelativeItem().Text(string.Join(", ", annotation.Tags)).FontSize(9);
                                    });
                                }

                                if (annotation.SeverityScore > 0)
                                {
                                    aiColumn.Item().PaddingTop(3).Row(row =>
                                    {
                                        row.ConstantItem(120).Text($"Severity Score: {annotation.SeverityScore}/100")
                                            .FontSize(9)
                                            .FontColor(GetSeverityScoreColor(annotation.SeverityScore));
                                        row.ConstantItem(120).Text($"Priority: {annotation.EstimatedRepairPriority}")
                                            .FontSize(9);
                                    });
                                }
                            });
                        }
                    }

                    // GPS if available
                    if (photo.GeoLat.HasValue && photo.GeoLng.HasValue)
                    {
                        c.Item().PaddingTop(3).Text($"Location: {photo.GeoLat:F6}, {photo.GeoLng:F6}")
                            .FontSize(8).FontColor(Colors.Grey.Darken1);
                    }
                });

                column.Item().PaddingTop(5).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten3);

                // Page break after every 3 photos
                if (photos.IndexOf(photo) % 3 == 2)
                {
                    column.Item().PageBreak();
                }
            }
        });
    }

    private string GetHealthStatColor(HealthMetricType type, double value)
    {
        return type switch
        {
            HealthMetricType.RoofIntegrity => value >= 80 ? Colors.Green.Darken1 : value >= 50 ? Colors.Orange.Darken1 : Colors.Red.Darken1,
            HealthMetricType.WaterRisk => value <= 20 ? Colors.Green.Darken1 : value <= 50 ? Colors.Orange.Darken1 : Colors.Red.Darken1,
            HealthMetricType.StructuralRisk => value <= 30 ? Colors.Green.Darken1 : value <= 60 ? Colors.Orange.Darken1 : Colors.Red.Darken1,
            _ => Colors.Grey.Darken1
        };
    }

    private string GetSeverityColor(IssueSeverity severity)
    {
        return severity switch
        {
            IssueSeverity.Critical => Colors.Red.Darken2,
            IssueSeverity.High => Colors.Orange.Darken2,
            IssueSeverity.Medium => Colors.Yellow.Darken2,
            _ => Colors.Green.Darken1
        };
    }

    private string GetSeverityScoreColor(int score)
    {
        return score >= 75 ? Colors.Red.Darken1 : score >= 50 ? Colors.Orange.Darken1 : Colors.Green.Darken1;
    }
}
