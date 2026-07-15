using GeoVolt.Application.Neighborhoods.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
// Controller, mahalleler ile ilgili işlemleri yönetir
namespace GeoVolt.Api.Controllers;

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

    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var neighborhoods = await _neighborhoodService.GetAllAsync(cancellationToken);
        return Ok(neighborhoods);
    }

    [HttpGet("{sourceId:int}")]
    public async Task<IActionResult> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken)
    {
        // Id değerine göre mahalle detayını getirir
        var neighborhood =
            await _neighborhoodService.GetBySourceIdAsync(
                sourceId,
                cancellationToken);

        return Ok(neighborhood);
    }
}
