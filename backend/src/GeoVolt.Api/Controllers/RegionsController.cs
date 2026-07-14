using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

// Bölge verilerini yöneten API controller sınıfı.
[ApiController]
[Route("api/regions")]
[Authorize]
public sealed class RegionsController : ControllerBase
{
    private readonly IRegionService _regionService;

    public RegionsController(
        IRegionService regionService)
    {
        _regionService = regionService;
    }

    // Tüm bölgeleri getirir.
    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var regions = await _regionService.GetAllAsync(
            cancellationToken);

        return Ok(regions);
    }

    // Kaynak kimliğine göre bölgeyi getirir.
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var region = await _regionService.GetBySourceIdAsync(
            id,
            cancellationToken);

        return Ok(region);
    }

    // Kaynak kimliğine göre bölgenin özetini getirir.
    [HttpGet("{id:int}/summary")]
    public async Task<IActionResult> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var summary =
            await _regionService.GetSummaryBySourceIdAsync(
                id,
                cancellationToken);

        return Ok(summary);
    }

    // Noktanın seçilen bölge içinde olup olmadığını
    // ve hangi mahalleye denk geldiğini bulur.
    [HttpPost("{id:int}/locate-point")]
    public async Task<IActionResult> LocatePointAsync(
        int id,
        [FromBody] RegionPointRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await _regionService.LocatePointAsync(
            id,
            request,
            cancellationToken);

        return Ok(result);
    }
}