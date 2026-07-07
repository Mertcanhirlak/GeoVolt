namespace GeoVolt.Application.Regions.Models;

public sealed class RegionSummaryData
{
    // Bölgedeki toplam istasyon sayısı
    public int ChargingStationCount { get; set; }

    // Bölgenin trafik yoğunluğu
    public string TrafficLevel { get; set; } = string.Empty;

    // En yaygın soket tipi
    public string? MostCommonSocketType { get; set; }

    // En yaygın güç kapasitesi
    public double? MostCommonPowerKw { get; set; }

    // Firmalara göre istasyon dağılımı
    public IReadOnlyList<CompanyDistributionData> CompanyDistribution { get; set; }
        = Array.Empty<CompanyDistributionData>();
}

public sealed class CompanyDistributionData
{
    // Firma adı
    public string CompanyName { get; set; } = string.Empty;

    // Firmaya ait istasyon sayısı
    public int StationCount { get; set; }
}