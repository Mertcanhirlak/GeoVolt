using GeoVolt.Application.Regions.Models;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Regions.Abstractions;

public interface IRegionRepository
{
    // Tüm bölgeleri getirir
    Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default);

    // Id değerine göre tek bölgeyi getirir
    Task<Region?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    // Bölgenin özet verilerini getirir
    Task<RegionSummaryData?> GetSummaryAsync(
        int id,
        CancellationToken cancellationToken = default);
}