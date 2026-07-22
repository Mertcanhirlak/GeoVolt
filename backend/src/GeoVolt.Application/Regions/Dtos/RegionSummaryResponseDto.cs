namespace GeoVolt.Application.Regions.Dtos;

public sealed class RegionSummaryResponseDto
{
    // Bölgenin kimliği
    public int RegionId { get; set; }

    // Bölgenin adı
    public string RegionName { get; set; } = string.Empty;

    // Bölgedeki toplam şarj istasyonu sayısı
    public int ChargingStationCount { get; set; }

    public int TotalChargingStationCount { get; set; }

    public double ChargingStationPercentage { get; set; }

    public int AcCount { get; set; }

    public int DcCount { get; set; }

    public double AcPercentage { get; set; }

    public double DcPercentage { get; set; }

    // Bölgenin trafik yoğunluk seviyesi
    public string TrafficLevel { get; set; } = string.Empty;

    // Bölgedeki en yaygın soket tipi
    public string? MostCommonSocketType { get; set; }

    // Bölgedeki en yaygın güç kapasitesi
    public double? MostCommonPowerKw { get; set; }

    // Bölgedeki firmaların istasyon dağılımı
    public IReadOnlyList<CompanyDistributionResponseDto> CompanyDistribution { get; set; }
        = Array.Empty<CompanyDistributionResponseDto>();
}
