namespace GeoVolt.Application.Regions.Dtos;
// Kontrol edilen noktanın hangi bölgede ve mahallede olduğunu belirlemek için kullanılan DTO sınıfı
public sealed class LocateRegionPointResponseDto
{
    // Bölgenin kaynak kimliği.
    public int RegionId { get; set; }

    // Kontrol edilen bölgenin adı
    public string RegionName { get; set; } = string.Empty;

    // Noktanın seçilen bölge içinde olup olmadığını belirtir
    public bool IsInsideRegion { get; set; }

    // Noktanın bulunduğu mahallenin kimliği
    public int? NeighborhoodId { get; set; }

    // Noktanın bulunduğu mahallenin adı
    public string? NeighborhoodName { get; set; }

    // Kontrol edilen noktanın enlem bilgisi
    public double Latitude { get; set; }

    // Kontrol edilen noktanın boylam bilgisi
    public double Longitude { get; set; }
}