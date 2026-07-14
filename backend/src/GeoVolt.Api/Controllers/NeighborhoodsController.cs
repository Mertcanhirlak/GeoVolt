using GeoVolt.Application.Neighborhoods.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

// Mahalle endpointlerini yönetir.
[ApiController]
[Route("api/neighborhoods")]
[Authorize]
public sealed class NeighborhoodsController : ControllerBase
{
    private readonly INeighborhoodService _neighborhoodService;

    public NeighborhoodsController(
        INeighborhoodService neighborhoodService)
    {
        _neighborhoodService = neighborhoodService;
    }

    // Tüm mahalleleri getirir.
    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var neighborhoods =
            await _neighborhoodService.GetAllAsync(
                cancellationToken);

        return Ok(neighborhoods);
    }

    // Kaynak kimliğine göre mahalle detayını getirir.
    [HttpGet("{sourceId:int}")]
    public async Task<IActionResult> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken)
    {
        var neighborhood =
            await _neighborhoodService.GetBySourceIdAsync(
                sourceId,
                cancellationToken);

        return Ok(neighborhood);
    }
}