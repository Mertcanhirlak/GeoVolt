using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.ManualPins.Dtos;

public sealed class ManualPinEvaluateRequestDto
{
    // Seçilen bölgenin API kimliği.
    [Range(1, int.MaxValue)]
    public int RegionId { get; set; }

    // Haritadan seçilen enlem bilgisi.
    [Required]
    [Range(-90, 90)]
    public double? Latitude { get; set; }

    // Haritadan seçilen boylam bilgisi.
    [Required]
    [Range(-180, 180)]
    public double? Longitude { get; set; }

    // Şarj sistemi tipi: AC veya DC.
    [Required]
    [RegularExpression(
        "^(AC|DC)$",
        ErrorMessage = "Sistem tipi AC veya DC olmalıdır.")]
    public string SystemType { get; set; } = string.Empty;

    // AC için 22; DC için 60 veya 120 kW.
    [Range(
        1,
        1000,
        ErrorMessage = "Güç değeri geçerli bir kW değeri olmalıdır.")]
    public int PowerKw { get; set; }

    // Kurulum yapılacak mekân türü.
    [Required]
    [RegularExpression(
        "^(Workplace|Mall|Highway)$",
        ErrorMessage =
            "Mekân türü Workplace, Mall veya Highway olmalıdır.")]
    public string VenueType { get; set; } = string.Empty;

    // Firmanın opsiyonel maksimum bütçesi.
    [Range(
        typeof(decimal),
        "0.01",
        "999999999999",
        ErrorMessage = "Bütçe sıfırdan büyük olmalıdır.")]
    public decimal? BudgetMax { get; set; }
}