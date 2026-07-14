using GeoVolt.Application.ChargingStations.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;

// Şarj istasyonu endpointlerini yönetir.
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

    // İstasyonları isteğe bağlı bölge ve mahalle filtreleriyle getirir.
    [HttpGet]
    public async Task<IActionResult> GetAllAsync(
        [FromQuery] int? regionId,
        [FromQuery] int? neighborhoodId,
        CancellationToken cancellationToken)
    {
        var stations = await _chargingStationService.GetAllAsync(
            regionSourceId: regionId,
            neighborhoodSourceId: neighborhoodId,
            cancellationToken: cancellationToken);

        return Ok(stations);
    }

    // Internal veritabanı kimliğine göre istasyon detayını getirir.
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var station = await _chargingStationService.GetByIdAsync(
            id,
            cancellationToken);

        return Ok(station);
    }
}