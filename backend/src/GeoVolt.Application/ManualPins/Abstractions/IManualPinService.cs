using GeoVolt.Application.ManualPins.Dtos;

namespace GeoVolt.Application.ManualPins.Abstractions;

public interface IManualPinService
{
    Task<ManualPinEvaluateResponseDto> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default);
}
