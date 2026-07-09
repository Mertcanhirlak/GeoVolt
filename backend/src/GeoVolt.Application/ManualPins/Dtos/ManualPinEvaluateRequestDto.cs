using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.ManualPins.Dtos;
//manuel pin değerlendirme isteği için kullanılan DTO sınıfı
public sealed class ManualPinEvaluateRequestDto
{
    // Kullanıcının seçtiği bölgenin kimliği
    [Range(1, int.MaxValue)]
    public int RegionId { get; set; }

    // Haritaya bırakılan pinin enlem bilgisi
    [Range(-90, 90)]
    public double Latitude { get; set; }

    // Haritaya bırakılan pinin boylam bilgisi
    [Range(-180, 180)]
    public double Longitude { get; set; }
}