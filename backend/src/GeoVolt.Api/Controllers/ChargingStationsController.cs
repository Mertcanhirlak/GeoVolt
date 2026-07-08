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
        CancellationToken cancellationToken)
    {
        // Tüm istasyonları veya bölgeye göre filtrelenmiş istasyonları getirir
        var stations = await _chargingStationService.GetAllAsync(
            regionId,
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

        // İstasyon bulunamazsa 404 döner
        if (station is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Şarj istasyonu bulunamadı."
            });
        }

        return Ok(station);
    }
}