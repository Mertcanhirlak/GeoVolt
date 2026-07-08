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

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Id değerine göre mahalle detayını getirir
        var neighborhood =
            await _neighborhoodService.GetByIdAsync(
                id,
                cancellationToken);

        // Mahalle bulunamazsa 404 döner
        if (neighborhood is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Mahalle bulunamadı."
            });
        }

        return Ok(neighborhood);
    }
}