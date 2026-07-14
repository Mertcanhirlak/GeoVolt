using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Regions.Dtos;

public sealed class RegionPointRequestDto
{
    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }
}
