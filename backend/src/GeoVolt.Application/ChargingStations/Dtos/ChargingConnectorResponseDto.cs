namespace GeoVolt.Application.ChargingStations.Dtos;

// Şarj istasyonundaki bağlantı tipi bilgilerini içerir.
public sealed class ChargingConnectorResponseDto
{
    // Connector kaydının internal veritabanı kimliği.
    public int Id { get; set; }

    // Soket türü.
    public string SocketType { get; set; } = string.Empty;

    // Fiziksel bağlantı türü.
    public string? ConnectorType { get; set; }

    // Şarj gücü, kW cinsindendir.
    public double PowerKw { get; set; }

    // Aynı özelliklere sahip connector adedi.
    public int Quantity { get; set; }
}