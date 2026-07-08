namespace GeoVolt.Application.ChargingStations.Dtos;
// Şarj istasyonlarındaki bağlantı noktalarının temel bilgilerini içeren DTO sınıfı
public sealed class ChargingConnectorResponseDto
{
    // Bağlantı noktasının kimliği
    public int Id { get; set; }

    // Soket tipi
    public string SocketType { get; set; } = string.Empty;

    // Şarj gücü
    public double PowerKw { get; set; }

    // Bu bağlantı tipinden kaç adet olduğunu belirtir
    public int Quantity { get; set; }
}