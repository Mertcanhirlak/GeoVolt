namespace GeoVolt.Application.Regions.Dtos;

public sealed class RegionSummaryResponseDto
{
    // Bölgenin kimliği
    public int RegionId { get; set; }

    // Bölgenin adı
    public string RegionName { get; set; } = string.Empty;

    // Seçilen bölgedeki toplam şarj istasyonu sayısı
    public int ChargingStationCount { get; set; }

    // Sistemdeki toplam şarj istasyonu sayısı
    public int TotalChargingStationCount { get; set; }

    // Seçilen bölgedeki istasyonların tüm istasyonlar içindeki yüzdesi
    public double ChargingStationPercentage { get; set; }

    // Seçilen bölgedeki toplam AC soket sayısı
    public int AcCount { get; set; }

    // Seçilen bölgedeki toplam DC soket sayısı
    public int DcCount { get; set; }

    // Seçilen bölgedeki AC soketlerin yüzdesi
    public double AcPercentage { get; set; }

    // Seçilen bölgedeki DC soketlerin yüzdesi
    public double DcPercentage { get; set; }

    // Bölgenin trafik yoğunluk seviyesi
    public string TrafficLevel { get; set; } = string.Empty;

    // Bölgedeki en yaygın soket tipi
    public string? MostCommonSocketType { get; set; }

    // Bölgedeki en yaygın güç kapasitesi
    public double? MostCommonPowerKw { get; set; }

    // Bölgedeki firmaların istasyon dağılımı
    public IReadOnlyList<CompanyDistributionResponseDto> CompanyDistribution
    {
        get;
        set;
    } = Array.Empty<CompanyDistributionResponseDto>();
}