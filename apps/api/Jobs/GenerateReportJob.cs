using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.Services;
using Amazon.S3;
using Amazon.S3.Model;

namespace FieldMind.Api.Jobs;

public class GenerateReportJob
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GenerateReportJob> _logger;
    private readonly IConfiguration _configuration;

    public GenerateReportJob(
        IServiceProvider serviceProvider,
        ILogger<GenerateReportJob> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task ProcessReportAsync(string reportJobId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FieldMindDbContext>();
        var pdfService = scope.ServiceProvider.GetRequiredService<PDFReportService>();
        var s3Service = scope.ServiceProvider.GetRequiredService<S3StorageService>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        try
        {
            _logger.LogInformation("Starting report generation for job {JobId}", reportJobId);

            // Fetch report job
            var reportJob = await context.ReportJobs
                .FirstOrDefaultAsync(r => r.Id == reportJobId);

            if (reportJob == null)
            {
                _logger.LogWarning("Report job {JobId} not found", reportJobId);
                return;
            }

            // Update status to processing
            reportJob.Status = ReportStatus.Processing;
            await context.SaveChangesAsync();

            // Generate PDF
            byte[] pdfBytes;

            switch (reportJob.Type)
            {
                case ReportType.Building:
                    pdfBytes = await pdfService.GenerateBuildingReport(
                        reportJob.EntityId,
                        reportJob.DateFrom,
                        reportJob.DateTo,
                        reportJob.IncludeAI);
                    break;

                case ReportType.Project:
                    pdfBytes = await pdfService.GenerateProjectReport(
                        reportJob.EntityId,
                        reportJob.DateFrom,
                        reportJob.DateTo,
                        reportJob.IncludeAI);
                    break;

                case ReportType.Folder:
                    pdfBytes = await pdfService.GenerateFolderReport(
                        reportJob.EntityId,
                        reportJob.DateFrom,
                        reportJob.DateTo,
                        reportJob.IncludeAI);
                    break;

                default:
                    throw new InvalidOperationException($"Unknown report type: {reportJob.Type}");
            }

            // Upload to S3
            var s3Key = $"reports/{reportJob.TeamId}/{reportJob.Id}.pdf";
            await UploadPdfToS3(s3Key, pdfBytes);

            // Update report job
            reportJob.S3Key = s3Key;
            reportJob.S3Url = $"https://{GetS3BucketName()}.s3.amazonaws.com/{s3Key}";
            reportJob.Status = ReportStatus.Complete;
            reportJob.CompletedAt = DateTime.UtcNow;

            // Generate presigned download URL (valid for 7 days)
            reportJob.DownloadUrl = await s3Service.GeneratePresignedGetUrl(s3Key, expiresIn: 7 * 24 * 3600);

            await context.SaveChangesAsync();

            _logger.LogInformation("Report generation completed for job {JobId}, S3 key: {S3Key}",
                reportJobId, s3Key);

            // Send email notification
            await SendReportReadyNotification(context, reportJob, emailService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating report for job {JobId}", reportJobId);

            // Update job status to failed
            var reportJob = await context.ReportJobs.FirstOrDefaultAsync(r => r.Id == reportJobId);
            if (reportJob != null)
            {
                reportJob.Status = ReportStatus.Failed;
                reportJob.ErrorMessage = ex.Message;
                reportJob.CompletedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
            }

            throw;
        }
    }

    private async Task UploadPdfToS3(string key, byte[] pdfBytes)
    {
        var bucketName = GetS3BucketName();
        var region = _configuration["AWS:Region"] ?? "us-east-1";
        var awsAccessKey = _configuration["AWS:AccessKeyId"];
        var awsSecretKey = _configuration["AWS:SecretAccessKey"];

        IAmazonS3 s3Client;
        if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey))
        {
            s3Client = new AmazonS3Client(
                awsAccessKey,
                awsSecretKey,
                Amazon.RegionEndpoint.GetBySystemName(region)
            );
        }
        else
        {
            s3Client = new AmazonS3Client(Amazon.RegionEndpoint.GetBySystemName(region));
        }

        using var stream = new MemoryStream(pdfBytes);

        var request = new PutObjectRequest
        {
            BucketName = bucketName,
            Key = key,
            InputStream = stream,
            ContentType = "application/pdf",
            ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256
        };

        await s3Client.PutObjectAsync(request);

        _logger.LogInformation("Uploaded PDF to S3: {Key}", key);
    }

    private string GetS3BucketName()
    {
        return _configuration["AWS:S3Bucket"] ?? "fieldmind-photos-dev";
    }

    private async Task SendReportReadyNotification(
        FieldMindDbContext context,
        ReportJob reportJob,
        EmailService emailService)
    {
        try
        {
            // Get user who requested the report
            var user = await context.Users
                .FirstOrDefaultAsync(u => u.Id == reportJob.CreatedById);

            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for report notification", reportJob.CreatedById);
                return;
            }

            // Get entity name based on report type
            string entityName = "Report";
            switch (reportJob.Type)
            {
                case ReportType.Building:
                    var building = await context.Buildings
                        .FirstOrDefaultAsync(b => b.Id == reportJob.EntityId);
                    entityName = building?.Name ?? "Building";
                    break;
                case ReportType.Project:
                    var project = await context.Projects
                        .FirstOrDefaultAsync(p => p.Id == reportJob.EntityId);
                    entityName = project?.Name ?? "Project";
                    break;
                case ReportType.Folder:
                    var folder = await context.Folders
                        .FirstOrDefaultAsync(f => f.Id == reportJob.EntityId);
                    entityName = folder?.Name ?? "Folder";
                    break;
            }

            await emailService.SendReportReadyNotification(
                user.Email,
                $"{user.FirstName} {user.LastName}",
                reportJob.Type.ToString(),
                entityName,
                reportJob.DownloadUrl ?? ""
            );

            _logger.LogInformation("Sent report ready notification for job {JobId} to {Email}",
                reportJob.Id, user.Email);
        }
        catch (Exception ex)
        {
            // Don't fail the job if email fails
            _logger.LogError(ex, "Failed to send report ready notification for job {JobId}", reportJob.Id);
        }
    }
}
