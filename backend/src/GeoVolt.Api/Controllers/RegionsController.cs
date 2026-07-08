using GeoVolt.Application.Regions.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/regions")]
[Authorize]
public sealed class RegionsController : ControllerBase
{
    private readonly IRegionService _regionService;

    public RegionsController(IRegionService regionService)
    {
        _regionService = regionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        CancellationToken cancellationToken)
    {
        // Tüm bölgeleri getirir
        var regions = await _regionService.GetAllAsync(
            cancellationToken);

        return Ok(regions);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Id değerine göre bölgeyi getirir
        var region = await _regionService.GetByIdAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (region is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge bulunamadı."
            });
        }

        return Ok(region);
    }

    [HttpGet("{id:int}/summary")]
    public async Task<IActionResult> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Bölgenin özet bilgilerini getirir
        var summary = await _regionService.GetSummaryAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (summary is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge özeti bulunamadı."
            });
        }

        return Ok(summary);
    }
}