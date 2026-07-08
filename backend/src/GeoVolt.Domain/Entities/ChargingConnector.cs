namespace GeoVolt.Domain.Entities;
// Şarj bağlantı noktası sınıfı, elektrikli araçlar için şarj istasyonlarındaki bağlantı noktalarını temsil eder.
public sealed class ChargingConnector
{
    // Bağlantı noktasının benzersiz kimliği
    public int Id { get; set; }

    // Bağlı olduğu şarj istasyonunun kimliği
    public int ChargingStationId { get; set; }

    // Soket tipi
    public string SocketType { get; set; } = string.Empty;

    // Şarj gücü
    public double PowerKw { get; set; }

    // Bu tip bağlantı noktasından kaç adet olduğunu belirtir
    public int Quantity { get; set; }
}