using GeoVolt.Application.Neighborhoods.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
// Controller, belirli bir bölgeye bağlı mahalleleri yönetir
namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/regions/{regionId:int}/neighborhoods")]
[Authorize]
public sealed class RegionNeighborhoodsController : ControllerBase
{
    private readonly INeighborhoodService _neighborhoodService;

    public RegionNeighborhoodsController(
        INeighborhoodService neighborhoodService)
    {
        _neighborhoodService = neighborhoodService;
    }

    [HttpGet]
    public async Task<IActionResult> GetByRegionIdAsync(
        int regionId,
        CancellationToken cancellationToken)
    {
        // Seçilen bölgeye bağlı mahalleleri getirir
        var neighborhoods =
            await _neighborhoodService.GetByRegionIdAsync(
                regionId,
                cancellationToken);

        return Ok(neighborhoods);
    }
}