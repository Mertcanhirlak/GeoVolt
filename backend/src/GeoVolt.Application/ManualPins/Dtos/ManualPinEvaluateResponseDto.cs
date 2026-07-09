namespace GeoVolt.Application.ManualPins.Dtos;
// Manuel pin değerlendirme yanıtı için kullanılan DTO sınıfı
public sealed class ManualPinEvaluateResponseDto
{
    // Manuel pinin geçerli olup olmadığını belirtir
    public bool IsValid { get; set; }

    // Seçilen bölgenin kimliği
    public int RegionId { get; set; }

    // Seçilen bölgenin adı
    public string RegionName { get; set; } = string.Empty;

    // Pin herhangi bir mahalleye denk gelirse mahalle kimliği
    public int? NeighborhoodId { get; set; }

    // Pin herhangi bir mahalleye denk gelirse mahalle adı
    public string? NeighborhoodName { get; set; }

    // Pinin enlem bilgisi
    public double Latitude { get; set; }

    // Pinin boylam bilgisi
    public double Longitude { get; set; }

    // Geçici veya gerçek tahmini kurulum maliyeti
    public decimal? EstimatedCost { get; set; }

    // Maliyet bilgisinin hangi kaynaktan üretildiğini belirtir
    public string CostSource { get; set; } = string.Empty;

    // Değerlendirme sonucuna ait açıklama
    public string Message { get; set; } = string.Empty;
}