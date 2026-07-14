using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
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
        return Ok(await _regionService.GetAllAsync(cancellationToken));
    }

    [HttpGet("{sourceId:int}")]
    public async Task<IActionResult> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken)
    {
        return Ok(await _regionService.GetBySourceIdAsync(
            sourceId,
            cancellationToken));
    }

    [HttpGet("{sourceId:int}/summary")]
    public async Task<IActionResult> GetSummaryAsync(
        int sourceId,
        CancellationToken cancellationToken)
    {
        return Ok(await _regionService.GetSummaryBySourceIdAsync(
            sourceId,
            cancellationToken));
    }

    [HttpPost("{sourceId:int}/locate-point")]
    public async Task<IActionResult> LocatePointAsync(
        int sourceId,
        [FromBody] RegionPointRequestDto request,
        CancellationToken cancellationToken)
    {
        return Ok(await _regionService.LocatePointAsync(
            sourceId,
            request,
            cancellationToken));
    }
}
