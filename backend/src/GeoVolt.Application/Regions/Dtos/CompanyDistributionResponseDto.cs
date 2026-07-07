namespace GeoVolt.Application.Regions.Dtos;

public sealed class CompanyDistributionResponseDto
{
    // Şarj istasyonu firmasının adı
    public string CompanyName { get; set; } = string.Empty;

    // Firmaya ait istasyon sayısı
    public int StationCount { get; set; }
}