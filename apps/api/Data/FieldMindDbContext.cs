using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Models;

namespace FieldMind.Api.Data;

public class FieldMindDbContext : DbContext
{
    public FieldMindDbContext(DbContextOptions<FieldMindDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UserActivityLog> UserActivityLogs => Set<UserActivityLog>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<AiAnnotation> AiAnnotations => Set<AiAnnotation>();
    public DbSet<MaintenanceEvent> MaintenanceEvents => Set<MaintenanceEvent>();
    public DbSet<BuildingHealthStat> BuildingHealthStats => Set<BuildingHealthStat>();
    public DbSet<PhotoNote> PhotoNotes => Set<PhotoNote>();
    public DbSet<PhotoTask> PhotoTasks => Set<PhotoTask>();
    public DbSet<ShareLink> ShareLinks => Set<ShareLink>();
    public DbSet<ReportJob> ReportJobs => Set<ReportJob>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.TeamId);

            entity.HasOne(e => e.Team)
                .WithMany(t => t.Users)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Team
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Building
        modelBuilder.Entity<Building>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TeamId);
            entity.HasIndex(e => e.PropTraxBuildingId);
            entity.HasIndex(e => new { e.GeoLat, e.GeoLng });

            entity.HasOne(e => e.Team)
                .WithMany(t => t.Buildings)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Project
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TeamId);
            entity.HasIndex(e => e.BuildingId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Team)
                .WithMany(t => t.Projects)
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Building)
                .WithMany(b => b.Projects)
                .HasForeignKey(e => e.BuildingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Folder
        modelBuilder.Entity<Folder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Folders)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Photo
        modelBuilder.Entity<Photo>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.S3Key).IsUnique();
            entity.HasIndex(e => e.BuildingId);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.FolderId);
            entity.HasIndex(e => e.UploadedById);
            entity.HasIndex(e => e.AiStatus);
            entity.HasIndex(e => e.CapturedAt);
            entity.HasIndex(e => e.UploadedAt);

            entity.HasOne(e => e.Building)
                .WithMany(b => b.Photos)
                .HasForeignKey(e => e.BuildingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Photos)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Folder)
                .WithMany(f => f.Photos)
                .HasForeignKey(e => e.FolderId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.UploadedBy)
                .WithMany(u => u.UploadedPhotos)
                .HasForeignKey(e => e.UploadedById)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.MaintenanceEvent)
                .WithMany(m => m.RelatedPhotos)
                .HasForeignKey(e => e.MaintenanceEventId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // AiAnnotation
        modelBuilder.Entity<AiAnnotation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PhotoId);
            entity.HasIndex(e => e.SeverityScore);

            entity.HasOne(e => e.Photo)
                .WithMany(p => p.AiAnnotations)
                .HasForeignKey(e => e.PhotoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // MaintenanceEvent
        modelBuilder.Entity<MaintenanceEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.BuildingId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Severity);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Building)
                .WithMany(b => b.MaintenanceEvents)
                .HasForeignKey(e => e.BuildingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // BuildingHealthStat
        modelBuilder.Entity<BuildingHealthStat>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.BuildingId, e.MetricType });
            entity.HasIndex(e => e.RecordedAt);

            entity.HasOne(e => e.Building)
                .WithMany(b => b.HealthStats)
                .HasForeignKey(e => e.BuildingId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PhotoNote
        modelBuilder.Entity<PhotoNote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PhotoId);
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.Photo)
                .WithMany(p => p.Notes)
                .HasForeignKey(e => e.PhotoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.PhotoNotes)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PhotoTask
        modelBuilder.Entity<PhotoTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PhotoId);
            entity.HasIndex(e => e.AssigneeId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Photo)
                .WithMany(p => p.Tasks)
                .HasForeignKey(e => e.PhotoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Assignee)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(e => e.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedBy)
                .WithMany(u => u.CreatedTasks)
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ShareLink
        modelBuilder.Entity<ShareLink>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => new { e.Scope, e.ScopeId });
        });

        // UserActivityLog
        modelBuilder.Entity<UserActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ActivityType);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.User)
                .WithMany(u => u.ActivityLogs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
