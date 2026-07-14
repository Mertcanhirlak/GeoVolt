using GeoVolt.Application.Neighborhoods.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

// Belirli bir bölgeye bağlı mahalle endpointlerini yönetir.
[ApiController]
[Route("api/regions/{regionSourceId:int}/neighborhoods")]
[Authorize]
public sealed class RegionNeighborhoodsController : ControllerBase
{
    private readonly INeighborhoodService _neighborhoodService;

    public RegionNeighborhoodsController(
        INeighborhoodService neighborhoodService)
    {
        _neighborhoodService = neighborhoodService;
    }

    // Bölgenin kaynak kimliğine bağlı mahalleleri getirir.
    [HttpGet]
    public async Task<IActionResult> GetByRegionSourceIdAsync(
        int regionSourceId,
        CancellationToken cancellationToken)
    {
        var neighborhoods =
            await _neighborhoodService.GetByRegionSourceIdAsync(
                regionSourceId,
                cancellationToken);

        return Ok(neighborhoods);
    }
}