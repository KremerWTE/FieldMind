using Microsoft.AspNetCore.Mvc;
using FieldMind.Api.Services;

namespace FieldMind.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class CompanyController : ControllerBase
{
    private readonly CompanyService _companyService;

    public CompanyController(CompanyService companyService)
    {
        _companyService = companyService;
    }

    [HttpGet("info")]
    public IActionResult GetCompanyInfo([FromQuery] string? teamId = null)
    {
        var info = _companyService.GetCompanyInfo(teamId);
        return Ok(info);
    }

    [HttpGet("stats")]
    public IActionResult GetCompanyStats([FromQuery] string? teamId = null)
    {
        var stats = _companyService.GetCompanyStats(teamId);
        return Ok(stats);
    }

    [HttpGet("testimonials")]
    public IActionResult GetTestimonials()
    {
        var testimonials = _companyService.GetTestimonials();
        return Ok(new { testimonials });
    }

    [HttpGet("pricing")]
    public IActionResult GetPricing()
    {
        var pricing = _companyService.GetPricingInfo();
        return Ok(pricing);
    }
}
