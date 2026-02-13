using Microsoft.EntityFrameworkCore;
using FieldMind.Api.Data;
using FieldMind.Api.Models;
using FieldMind.Api.DTOs.Projects;

namespace FieldMind.Api.Services;

public class ProjectsService
{
    private readonly FieldMindDbContext _context;

    public ProjectsService(FieldMindDbContext context)
    {
        _context = context;
    }

    public async Task<Project> CreateProject(string teamId, CreateProjectDto dto)
    {
        // Verify building belongs to team
        var building = await _context.Buildings
            .FirstOrDefaultAsync(b => b.Id == dto.BuildingId && b.TeamId == teamId);

        if (building == null)
            throw new InvalidOperationException("Building not found or doesn't belong to team");

        var project = new Project
        {
            Name = dto.Name,
            BuildingId = dto.BuildingId,
            ClientName = dto.ClientName,
            Status = dto.Status,
            TeamId = teamId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        // Reload with relations
        return (await _context.Projects
            .Include(p => p.Building)
            .FirstAsync(p => p.Id == project.Id))!;
    }

    public async Task<List<ProjectDto>> GetProjects(string teamId, ProjectStatus? status = null)
    {
        var query = _context.Projects
            .Where(p => p.TeamId == teamId);

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ProjectDto
            {
                Id = p.Id,
                Name = p.Name,
                ClientName = p.ClientName,
                Status = p.Status,
                BuildingId = p.BuildingId,
                TeamId = p.TeamId,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
                PhotoCount = p.Photos.Count,
                FolderCount = p.Folders.Count
            })
            .ToListAsync();
    }

    public async Task<Project?> GetProject(string id, string teamId)
    {
        return await _context.Projects
            .Include(p => p.Building)
            .Include(p => p.Folders)
            .FirstOrDefaultAsync(p => p.Id == id && p.TeamId == teamId);
    }

    public async Task<Project?> UpdateProject(string id, string teamId, UpdateProjectDto dto)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == id && p.TeamId == teamId);

        if (project == null)
            return null;

        if (dto.Name != null) project.Name = dto.Name;
        if (dto.ClientName != null) project.ClientName = dto.ClientName;
        if (dto.Status.HasValue) project.Status = dto.Status.Value;

        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return project;
    }

    public async Task<List<Folder>> GetFolders(string projectId, string teamId)
    {
        return await _context.Folders
            .Where(f => f.ProjectId == projectId && f.Project.TeamId == teamId)
            .OrderBy(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<Folder> CreateFolder(string projectId, string teamId, CreateFolderDto dto)
    {
        // Verify project belongs to team
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId && p.TeamId == teamId);

        if (project == null)
            throw new InvalidOperationException("Project not found or doesn't belong to team");

        var folder = new Folder
        {
            Name = dto.Name,
            ProjectId = projectId
        };

        _context.Folders.Add(folder);
        await _context.SaveChangesAsync();

        return folder;
    }
}
