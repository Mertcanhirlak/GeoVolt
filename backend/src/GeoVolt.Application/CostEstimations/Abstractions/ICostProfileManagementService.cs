using GeoVolt.Application.CostEstimations.Dtos;

namespace GeoVolt.Application.CostEstimations.Abstractions;

public interface ICostProfileManagementService
{
    Task<IReadOnlyList<CostProfileResponse>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<CostProfileResponse> UpdateAsync(
        int id,
        UpdateCostProfileRequest request,
        CancellationToken cancellationToken = default);
}
