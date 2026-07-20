using GeoVolt.Application.CostEstimations.Dtos;

namespace GeoVolt.Application.CostEstimations.Abstractions;

public interface ICostEstimationService
{
    CostEstimationResultDto Calculate(
        CostEstimationInputDto input);
}