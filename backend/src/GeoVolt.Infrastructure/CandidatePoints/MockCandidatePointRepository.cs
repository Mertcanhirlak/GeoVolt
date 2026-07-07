using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Domain.Entities;

namespace GeoVolt.Infrastructure.CandidatePoints;

public sealed class MockCandidatePointRepository : ICandidatePointRepository
{
    private static readonly IReadOnlyList<CandidatePoint> CandidatePoints =
    [
        new CandidatePoint
        {
            Id = 1,
            Name = "Aday Nokta 1",
            EstimatedAddress = "\u00c7ankaya / K\u0131z\u0131lay",
            Region = "K\u0131z\u0131lay",
            Neighborhood = "K\u0131z\u0131lay Mahallesi",
            EstimatedCost = 450000,
            CostScore = 82,
            DemandScore = 91,
            GeneralScore = 87,
            Latitude = 39.9208,
            Longitude = 32.8541,
            SystemType = "AC",
            PlaceType = "\u0130\u015f Yeri",
            Status = "ready"
        },
        new CandidatePoint
        {
            Id = 2,
            Name = "Aday Nokta 2",
            EstimatedAddress = "\u00c7ankaya / Armada AVM Yak\u0131n\u0131",
            Region = "S\u00f6\u011f\u00fct\u00f6z\u00fc",
            Neighborhood = "S\u00f6\u011f\u00fct\u00f6z\u00fc Mahallesi",
            EstimatedCost = 780000,
            CostScore = 64,
            DemandScore = 96,
            GeneralScore = 80,
            Latitude = 39.9124,
            Longitude = 32.8091,
            SystemType = "DC",
            PlaceType = "AVM",
            Status = "ready"
        },
        new CandidatePoint
        {
            Id = 3,
            Name = "Aday Nokta 3",
            EstimatedAddress = "\u00c7ankaya / Bah\u00e7elievler",
            Region = "Bah\u00e7elievler",
            Neighborhood = "Bah\u00e7elievler Mahallesi",
            EstimatedCost = 520000,
            CostScore = 74,
            DemandScore = 78,
            GeneralScore = 76,
            Latitude = 39.9292,
            Longitude = 32.8244,
            SystemType = "AC",
            PlaceType = "\u0130\u015f Yeri",
            Status = "ready"
        },
        new CandidatePoint
        {
            Id = 4,
            Name = "Aday Nokta 4",
            EstimatedAddress = "\u00c7ankaya / Oran",
            Region = "Oran",
            Neighborhood = "Oran Mahallesi",
            EstimatedCost = null,
            CostScore = null,
            DemandScore = 69,
            GeneralScore = null,
            Latitude = 39.8508,
            Longitude = 32.8406,
            SystemType = "DC",
            PlaceType = "Otoyol",
            Status = "missing"
        },
        new CandidatePoint
        {
            Id = 5,
            Name = "Aday Nokta 5",
            EstimatedAddress = "\u00c7ankaya / Tunal\u0131 Hilmi",
            Region = "Tunal\u0131",
            Neighborhood = "Kavakl\u0131dere Mahallesi",
            EstimatedCost = 610000,
            CostScore = 70,
            DemandScore = 88,
            GeneralScore = 79,
            Latitude = 39.9115,
            Longitude = 32.8596,
            SystemType = "AC",
            PlaceType = "\u0130\u015f Yeri",
            Status = "ready"
        }
    ];

    public Task<IReadOnlyList<CandidatePoint>> GetCandidatePointsAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(CandidatePoints);
    }
}
