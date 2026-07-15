using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.ManualPins.Dtos;

public sealed class ManualPinEvaluateRequestDto
{
    [Range(1, int.MaxValue)]
    public int RegionId { get; set; }

    [Required]
    [Range(-90, 90)]
    public double? Latitude { get; set; }

    [Required]
    [Range(-180, 180)]
    public double? Longitude { get; set; }
}
