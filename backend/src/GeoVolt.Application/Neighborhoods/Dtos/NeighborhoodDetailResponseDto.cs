namespace GeoVolt.Application.Neighborhoods.Dtos;

// Detaylı mahalle bilgilerini içerir.
public sealed class NeighborhoodDetailResponseDto
{
    // Mahallenin API'de kullanılan kimliği.
    public int Id { get; set; }

    // Mahallenin adı.
    public string Name { get; set; } = string.Empty;

    // Bağlı olduğu bölgenin API'de kullanılan kimliği.
    public int RegionId { get; set; }

    // Bağlı olduğu bölgenin adı.
    public string RegionName { get; set; } = string.Empty;

    // Mahallenin nüfusu.
    public int Population { get; set; }

    // Haritada kullanılacak GeoJSON sınır verisi.
    public string BoundaryGeoJson { get; set; } = string.Empty;
}