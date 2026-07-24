using GeoVolt.Application.Common.Exceptions;
using GeoVolt.Application.CostEstimations.Abstractions;
using GeoVolt.Application.CostEstimations.Dtos;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Application.CostEstimations;

public sealed class CostProfileManagementService : ICostProfileManagementService
{
    private readonly ICostConfigurationRepository _repository;

    public CostProfileManagementService(
        ICostConfigurationRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<CostProfileResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var profiles = await _repository.GetProfilesAsync(cancellationToken);
        return profiles.Select(ToResponse).ToList();
    }

    public async Task<CostProfileResponse> UpdateAsync(
        int id,
        UpdateCostProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var profile = await _repository.GetProfileByIdAsync(
            id,
            cancellationToken)
            ?? throw new NotFoundException("Maliyet profili bulunamadı.");

        profile.EquipmentCost = request.EquipmentCost;
        profile.FixedElectricalInfrastructureCost =
            request.FixedElectricalInfrastructureCost;
        profile.CableUnitCostPerMeter = request.CableUnitCostPerMeter;
        profile.FixedSiteCost = request.FixedSiteCost;
        profile.TrenchRestorationUnitCostPerMeter =
            request.TrenchRestorationUnitCostPerMeter;
        profile.RiskRate = request.RiskRate;

        await _repository.SaveChangesAsync(cancellationToken);
        return ToResponse(profile);
    }

    private static CostProfileResponse ToResponse(CostProfile profile)
    {
        return new CostProfileResponse(
            profile.Id,
            profile.SystemType,
            profile.PowerKw,
            profile.EquipmentCost,
            profile.FixedElectricalInfrastructureCost,
            profile.CableUnitCostPerMeter,
            profile.FixedSiteCost,
            profile.TrenchRestorationUnitCostPerMeter,
            profile.RiskRate);
    }
}
