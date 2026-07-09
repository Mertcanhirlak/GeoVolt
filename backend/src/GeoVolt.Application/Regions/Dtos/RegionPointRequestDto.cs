using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Regions.Dtos;

public sealed class RegionPointRequestDto
{
    // Haritaya bırakılan noktanın enlem bilgisi
    [Range(-90, 90)]
    public double Latitude { get; set; }

    // Haritaya bırakılan noktanın boylam bilgisi
    [Range(-180, 180)]
    public double Longitude { get; set; }
}