namespace GeoVolt.Application.ChargingStations.Dtos;
// Şarj istasyonlarındaki bağlantı noktalarının temel bilgilerini içeren DTO sınıfı
public sealed class ChargingConnectorResponseDto
{
    // Bağlantı noktasının kimliği
    public int Id { get; set; }

    public string SourceSocketNumber { get; set; } = string.Empty;

    // Soket tipi
    public string SocketType { get; set; } = string.Empty;

    public string? ConnectorType { get; set; }

    // Şarj gücü
    public double PowerKw { get; set; }

    // Bu bağlantı tipinden kaç adet olduğunu belirtir
    public int Quantity { get; set; }
}
