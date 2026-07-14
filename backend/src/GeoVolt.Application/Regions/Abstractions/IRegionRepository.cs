using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.Regions.Abstractions;

public interface IRegionRepository
{
    Task<IReadOnlyList<Region>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<Region?> GetBySourceIdAsync(
        int sourceId,
        CancellationToken cancellationToken = default);
}
