using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoVolt.Api.Controllers;
// Bölge ve istasyon verilerini yönetmek için API controller sınıfı
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
        // Tüm bölgeleri getirir
        var regions = await _regionService.GetAllAsync(
            cancellationToken);

        return Ok(regions);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetByIdAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Id değerine göre bölgeyi getirir
        var region = await _regionService.GetByIdAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (region is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge bulunamadı."
            });
        }

        return Ok(region);
    }

    [HttpGet("{id:int}/summary")]
    public async Task<IActionResult> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken)
    {
        // Bölgenin özet bilgilerini getirir
        var summary = await _regionService.GetSummaryAsync(
            id,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (summary is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge özeti bulunamadı."
            });
        }

        return Ok(summary);
    }
    // Verilen noktanın seçilen bölge sınırları içinde olup olmadığını kontrol eder
    [HttpPost("{id:int}/validate-point")]
    public async Task<IActionResult> ValidatePointAsync(
        int id,
        [FromBody] ValidateRegionPointRequestDto request,
        CancellationToken cancellationToken)
    {
        // Verilen noktanın seçilen bölge sınırları içinde
        // olup olmadığını kontrol eder
        var result = await _regionService.ValidatePointAsync(
            id,
            request,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (result is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge bulunamadı."
            });
        }

        return Ok(result);
    }
    // Verilen noktanın seçilen bölge içinde olup olmadığını ve hangi mahalleye denk geldiğini bulur
    [HttpPost("{id:int}/locate-point")]
    public async Task<IActionResult> LocatePointAsync(
    int id,
    [FromBody] ValidateRegionPointRequestDto request,
    CancellationToken cancellationToken)
    {
        // Verilen noktanın seçilen bölge içinde olup olmadığını
        // ve hangi mahalleye denk geldiğini bulur
        var result = await _regionService.LocatePointAsync(
            id,
            request,
            cancellationToken);

        // Bölge bulunamazsa 404 döner
        if (result is null)
        {
            return NotFound(new
            {
                success = false,
                message = "Bölge bulunamadı."
            });
        }

        return Ok(result);
    }
}