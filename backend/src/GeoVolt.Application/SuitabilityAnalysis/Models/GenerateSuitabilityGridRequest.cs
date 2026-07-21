using System.ComponentModel.DataAnnotations;
using GeoVolt.Domain.Constants;

namespace GeoVolt.Application.SuitabilityAnalysis.Models;

public sealed class GenerateSuitabilityGridRequest
{
    [Range(50, 1000)]
    public int GridEdgeMeters { get; set; } = SuitabilityGridDefaults.EdgeMeters;
}
