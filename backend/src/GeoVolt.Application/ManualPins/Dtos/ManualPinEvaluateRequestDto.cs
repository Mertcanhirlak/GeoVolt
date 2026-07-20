using System.ComponentModel.DataAnnotations;

namespace GeoVolt.Application.ManualPins.Dtos;

public sealed class ManualPinEvaluateRequestDto : IValidatableObject
{
    [Range(
        1,
        int.MaxValue,
        ErrorMessage = "Geçerli bir bölge kimliği gönderilmelidir.")]
    public int RegionId { get; set; }

    [Required]
    [Range(
        -90,
        90,
        ErrorMessage = "Enlem -90 ile 90 arasında olmalıdır.")]
    public double? Latitude { get; set; }

    [Required]
    [Range(
        -180,
        180,
        ErrorMessage = "Boylam -180 ile 180 arasında olmalıdır.")]
    public double? Longitude { get; set; }

    [Required]
    [RegularExpression(
        "^(AC|DC)$",
        ErrorMessage = "Sistem tipi AC veya DC olmalıdır.")]
    public string SystemType { get; set; } = string.Empty;

    [Range(
        1,
        1000,
        ErrorMessage = "Güç değeri geçerli bir kW değeri olmalıdır.")]
    public int PowerKw { get; set; }

    [Required]
    [RegularExpression(
        "^(Workplace|Mall|Highway)$",
        ErrorMessage =
            "Mekân türü Workplace, Mall veya Highway olmalıdır.")]
    public string VenueType { get; set; } = string.Empty;

    [Range(
        typeof(decimal),
        "0.01",
        "999999999999",
        ErrorMessage = "Bütçe sıfırdan büyük olmalıdır.")]
    public decimal? BudgetMax { get; set; }

    // Sistem tipi ile güç seçiminin uyumunu doğrular.
    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        var normalizedSystemType =
            SystemType.Trim().ToUpperInvariant();

        if (normalizedSystemType == "AC" && PowerKw != 22)
        {
            yield return new ValidationResult(
                "AC sistem tipi için güç 22 kW olmalıdır.",
                [nameof(PowerKw)]);
        }

        if (normalizedSystemType == "DC"
            && PowerKw != 60
            && PowerKw != 120)
        {
            yield return new ValidationResult(
                "DC sistem tipi için güç 60 veya 120 kW olmalıdır.",
                [nameof(PowerKw)]);
        }
    }
}