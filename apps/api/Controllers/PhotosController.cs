using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.DTOs.Photos;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("photos")]
[Authorize]
public class PhotosController : ControllerBase
{
    private readonly PhotosService _photosService;

    public PhotosController(PhotosService photosService)
    {
        _photosService = photosService;
    }

    private string GetTeamId()
    {
        return User.FindFirst("teamId")?.Value
            ?? throw new UnauthorizedAccessException("Team ID not found in token");
    }

    private string GetUserId()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? throw new UnauthorizedAccessException("User ID not found in token");
    }

    [HttpPost("presign-upload")]
    public async Task<IActionResult> PresignUpload([FromBody] PresignUploadDto dto)
    {
        try
        {
            var teamId = GetTeamId();
            var userId = GetUserId();
            var result = await _photosService.PresignUpload(teamId, userId, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("complete-upload")]
    public async Task<IActionResult> CompleteUpload([FromBody] CompleteUploadDto dto)
    {
        try
        {
            var userId = GetUserId();
            var photo = await _photosService.CompleteUpload(userId, dto);
            return Ok(photo);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetPhotos(
        [FromQuery] string? buildingId,
        [FromQuery] string? projectId,
        [FromQuery] string? folderId,
        [FromQuery] string? aiStatus)
    {
        var teamId = GetTeamId();
        var photos = await _photosService.GetPhotos(teamId, buildingId, projectId, folderId, aiStatus);
        return Ok(photos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPhoto(string id)
    {
        var teamId = GetTeamId();
        var result = await _photosService.GetPhoto(id, teamId);

        if (result == null)
            return NotFound(new { message = "Photo not found" });

        return Ok(result);
    }

    [HttpPost("{id}/notes")]
    public async Task<IActionResult> CreateNote(string id, [FromBody] CreateNoteDto dto)
    {
        var userId = GetUserId();
        var note = await _photosService.CreateNote(id, userId, dto);
        return Ok(note);
    }

    [HttpGet("{id}/tasks")]
    public async Task<IActionResult> GetTasks(string id)
    {
        var tasks = await _photosService.GetTasks(id);
        return Ok(tasks);
    }

    [HttpPost("{id}/tasks")]
    public async Task<IActionResult> CreateTask(string id, [FromBody] CreatePhotoTaskDto dto)
    {
        var userId = GetUserId();
        var task = await _photosService.CreateTask(id, userId, dto);
        return Ok(task);
    }

    [HttpPatch("tasks/{taskId}")]
    public async Task<IActionResult> UpdateTask(string taskId, [FromBody] UpdatePhotoTaskDto dto)
    {
        var task = await _photosService.UpdateTask(taskId, dto);

        if (task == null)
            return NotFound(new { message = "Task not found" });

        return Ok(task);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePhoto(string id)
    {
        var teamId = GetTeamId();
        var deleted = await _photosService.DeletePhoto(id, teamId);

        if (!deleted)
            return NotFound(new { message = "Photo not found" });

        return Ok(new { message = "Photo deleted" });
    }
}
