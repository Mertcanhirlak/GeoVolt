namespace GeoVolt.Application.ManualPins.Abstractions;
//pin noktalarının eğim yüzdesini almak için bir depo arayüzü
public interface ISlopeRepository
{
    Task<double?> GetSlopePercentAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);
}