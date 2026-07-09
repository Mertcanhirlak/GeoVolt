namespace GeoVolt.Application.Regions.Dtos;
//manuel nokta kontrolü için kullanılan DTO sınıfı
public sealed class ValidateRegionPointResponseDto
{
    // Kontrol edilen bölgenin kimliği
    public int RegionId { get; set; }

    // Kontrol edilen bölgenin adı
    public string RegionName { get; set; } = string.Empty;

    // Noktanın bölge sınırları içinde olup olmadığını belirtir
    public bool IsInsideRegion { get; set; }

    // Kontrol edilen noktanın enlem bilgisi
    public double Latitude { get; set; }

    // Kontrol edilen noktanın boylam bilgisi
    public double Longitude { get; set; }
}