namespace GeoVolt.Application.Neighborhoods.Dtos;
// Mahalle ile ilgili veri transfer nesnesi
public sealed class NeighborhoodResponseDto
{
    // Mahallenin kimliği
    public int Id { get; set; }

    // Mahallenin adı
    public string Name { get; set; } = string.Empty;

    // Mahallenin bağlı olduğu bölge kimliği
    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    public int Population { get; set; }
}
