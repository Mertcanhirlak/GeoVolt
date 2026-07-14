namespace GeoVolt.Application.Regions.Dtos;

public sealed class LocateRegionPointResponseDto
{
    public int RegionId { get; set; }

    public string RegionName { get; set; } = string.Empty;

    public bool IsInsideRegion { get; set; }

    public int? NeighborhoodId { get; set; }

    public string? NeighborhoodName { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }
}
