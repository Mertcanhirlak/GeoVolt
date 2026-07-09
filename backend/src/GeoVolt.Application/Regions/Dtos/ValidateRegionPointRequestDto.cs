using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.Regions.Dtos;
//enlem ve boylam bilgilerini içeren manuel nokta kontrolü için kullanılan DTO sınıfı
public sealed class ValidateRegionPointRequestDto
{
    // Haritaya bırakılan noktanın enlem bilgisi
    [Range(-90, 90)]
    public double Latitude { get; set; }

    // Haritaya bırakılan noktanın boylam bilgisi
    [Range(-180, 180)]
    public double Longitude { get; set; }
}