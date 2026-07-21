using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Domain.Entities;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.CostEstimations;

public sealed class CostConfigurationRepository
    : ICostConfigurationRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public CostConfigurationRepository(
        GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<CostModelSetting?> GetModelSettingAsync(
        CancellationToken cancellationToken = default)
    {
        return _dbContext
            .Set<CostModelSetting>()
            .AsNoTracking()
            .OrderByDescending(setting =>
                setting.UpdatedAtUtc)
            .ThenByDescending(setting =>
                setting.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<CostProfile?> GetProfileAsync(
        string systemType,
        int powerKw,
        CancellationToken cancellationToken = default)
    {
        var normalizedSystemType =
            systemType.Trim().ToUpperInvariant();

        return _dbContext
            .Set<CostProfile>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                profile =>
                    profile.PowerKw == powerKw
                    && profile.SystemType.ToUpper()
                        == normalizedSystemType,
                cancellationToken);
    }

    public Task<SlopeCostBand?> GetSlopeBandAsync(
        decimal slopePercent,
        CancellationToken cancellationToken = default)
    {
        return _dbContext
            .Set<SlopeCostBand>()
            .AsNoTracking()
            .Where(band =>
                band.MinSlopePercent <= slopePercent
                && (!band.MaxSlopePercent.HasValue
                    || slopePercent
                    < band.MaxSlopePercent.Value))
            .OrderByDescending(band =>
                band.MinSlopePercent)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<VenueCostMultiplier?>
        GetVenueMultiplierAsync(
            string venueType,
            CancellationToken cancellationToken = default)
    {
        var normalizedVenueType =
            venueType.Trim().ToUpperInvariant();

        return _dbContext
            .Set<VenueCostMultiplier>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                multiplier =>
                    multiplier.VenueType.ToUpper()
                        == normalizedVenueType,
                cancellationToken);
    }
}