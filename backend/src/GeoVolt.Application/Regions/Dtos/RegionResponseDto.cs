namespace GeoVolt.Application.Regions.Dtos;

public sealed class RegionResponseDto
{
    // Bölgenin kimliği
    public int Id { get; set; }

    // Bölgenin adı
    public string Name { get; set; } = string.Empty;

    public int Population { get; set; }

    // React haritasında kullanılacak GeoJSON sınır verisi
    public string BoundaryGeoJson { get; set; } = string.Empty;
}
