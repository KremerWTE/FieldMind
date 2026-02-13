using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;
using FieldMind.Api.Models;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class FeaturesController : ControllerBase
{
    private readonly FeaturesService _featuresService;

    public FeaturesController(FeaturesService featuresService)
    {
        _featuresService = featuresService;
    }

    [HttpGet]
    public IActionResult GetAllFeatures()
    {
        var features = _featuresService.GetProductFeatures();
        return Ok(features);
    }

    [HttpGet("category/{category}")]
    public IActionResult GetFeaturesByCategory(FeatureCategory category)
    {
        var features = _featuresService.GetFeaturesByCategory(category);
        return Ok(new { category = category.ToString(), features });
    }

    [HttpGet("{id}")]
    public IActionResult GetFeatureById(string id)
    {
        var feature = _featuresService.GetFeatureById(id);
        if (feature == null)
            return NotFound(new { error = "Feature not found" });

        return Ok(feature);
    }

    [HttpGet("stats")]
    public IActionResult GetPlatformStats()
    {
        var stats = _featuresService.GetPlatformStats();
        return Ok(stats);
    }
}
