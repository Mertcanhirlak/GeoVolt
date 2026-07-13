using NetTopologySuite.Geometries;

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

    public int? EnergyScore { get; set; }

    public int? AccessScore { get; set; }

    public int? CompetitionPenalty { get; set; }

    public Point? Location { get; set; }

    public int? RegionId { get; set; }

    public int? NeighborhoodId { get; set; }

    public double? NearestTransformerMeters { get; set; }

    public double? NearestMajorRoadMeters { get; set; }

    public double? NearestStationMeters { get; set; }

    public int? PoiCount300Meters { get; set; }

    public int? PoiCount500Meters { get; set; }

    public int? PoiCount1000Meters { get; set; }

    public int? Population { get; set; }

    public double? SuitabilityDegree { get; set; }

    public double? SuitabilityPercent { get; set; }

    public string AlgorithmVersion { get; set; } = "v1";

    public DateTime? CalculatedAtUtc { get; set; }

    public double Latitude
    {
        get => Location?.Y ?? _latitude;
        set => _latitude = value;
    }

    public double Longitude
    {
        get => Location?.X ?? _longitude;
        set => _longitude = value;
    }

    public string SystemType { get; set; } = string.Empty;

    public string PlaceType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    private double _latitude;

    private double _longitude;
}
