using GeoVolt.Application.ManualPins.Dtos;

namespace GeoVolt.Application.ManualPins.Abstractions;

public interface IManualPinService
{
    // Haritaya bırakılan manuel pini değerlendirir
    Task<ManualPinEvaluateResponseDto?> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default);
}