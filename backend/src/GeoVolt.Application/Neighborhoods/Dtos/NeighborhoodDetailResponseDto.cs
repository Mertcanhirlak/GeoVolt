namespace GeoVolt.Application.Neighborhoods.Dtos;
//Detaylı mahalle bilgilerini içeren veri transfer nesnesi
public sealed class NeighborhoodDetailResponseDto
{
    // Mahallenin kimliği
    public int Id { get; set; }

    // Mahallenin adı
    public string Name { get; set; } = string.Empty;

    // Mahallenin bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    public int Population { get; set; }

    // Haritada kullanılacak GeoJSON sınır verisi
    public string BoundaryGeoJson { get; set; } = string.Empty;
}
