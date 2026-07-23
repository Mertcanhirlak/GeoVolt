namespace GeoVolt.Application.ManualPins.Abstractions;
//en yakın trafoya olan mesafeyi almak için bir depo arayüzü
public interface ITransformerRepository
{
    Task<double?> GetNearestDistanceMetersAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);
}