using GeoVolt.Application.ChargingStations.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

[ApiController]
[Route("api/charging-stations")]
[Authorize]
public sealed class ChargingStationsController : ControllerBase
{
    private readonly IChargingStationService _chargingStationService;

    public ChargingStationsController(
        IChargingStationService chargingStationService)
    {
        _chargingStationService = chargingStationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        [FromQuery] int? regionId,
        [FromQuery] int? neighborhoodId,
        CancellationToken cancellationToken)
    {
        // Tüm istasyonları veya bölge ve mahalleye göre
        // filtrelenmiş istasyonları getirir
        var stations = await _chargingStationService.GetAllAsync(
            regionSourceId: regionId,
            neighborhoodSourceId: neighborhoodId,
            cancellationToken);

        return Ok(stations);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Id değerine göre istasyon detayını getirir
        var station = await _chargingStationService.GetByIdAsync(
            id,
            cancellationToken);

        return Ok(station);
    }
}
