using GeoVolt.Application.ManualPins.Abstractions;

namespace GeoVolt.Infrastructure.ManualPins;

public sealed class UnavailableSlopeRepository
    : ISlopeRepository
{
    public Task<double?> GetSlopePercentAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        // TIFF eğim kaynağı uygulamaya bağlanana kadar
        // sahte eğim değeri üretilmez.
        return Task.FromResult<double?>(null);
    }
}