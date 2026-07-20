using GeoVolt.Domain.Entities;
//maliyet tahminleri için yapılandırma verilerini almak için bir depo arayüzü
namespace GeoVolt.Application.CostEstimations.Abstractions;

public interface ICostConfigurationRepository
{
    Task<CostModelSetting?> GetModelSettingAsync(
        CancellationToken cancellationToken = default);

    Task<CostProfile?> GetProfileAsync(
        string systemType,
        int powerKw,
        CancellationToken cancellationToken = default);

    Task<SlopeCostBand?> GetSlopeBandAsync(
        decimal slopePercent,
        CancellationToken cancellationToken = default);

    Task<VenueCostMultiplier?> GetVenueMultiplierAsync(
        string venueType,
        CancellationToken cancellationToken = default);
}