namespace GeoVolt.Domain.Entities;

public sealed class CandidatePoint
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string EstimatedAddress { get; set; } = string.Empty;

    public string Region { get; set; } = string.Empty;

    public string Neighborhood { get; set; } = string.Empty;

    public decimal? EstimatedCost { get; set; }

    public int? CostScore { get; set; }

    public int? DemandScore { get; set; }

    public int? GeneralScore { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public string SystemType { get; set; } = string.Empty;

    public string PlaceType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}
