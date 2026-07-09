using GeoVolt.Application.CandidatePoints.Abstractions;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Application.ManualPins.Dtos;
using GeoVolt.Application.Neighborhoods.Abstractions;
using GeoVolt.Application.Regions.Abstractions;
using GeoVolt.Application.Regions.Dtos;

namespace GeoVolt.Application.ManualPins;

public sealed class ManualPinService : IManualPinService
{
    private readonly IRegionService _regionService;
    private readonly INeighborhoodRepository _neighborhoodRepository;
    private readonly ICandidatePointRepository _candidatePointRepository;

    public ManualPinService(
        IRegionService regionService,
        INeighborhoodRepository neighborhoodRepository,
        ICandidatePointRepository candidatePointRepository)
    {
        _regionService = regionService;
        _neighborhoodRepository = neighborhoodRepository;
        _candidatePointRepository = candidatePointRepository;
    }

    public async Task<ManualPinEvaluateResponseDto?> EvaluateAsync(
        ManualPinEvaluateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Mevcut locate-point mantığını kullanarak noktanın
        // bölge ve mahalle bilgisini bulur
        var location = await _regionService.LocatePointAsync(
            request.RegionId,
            new ValidateRegionPointRequestDto
            {
                Latitude = request.Latitude,
                Longitude = request.Longitude
            },
            cancellationToken);

        // Bölge bulunamazsa null döner
        if (location is null)
        {
            return null;
        }

        // Pin seçilen bölge dışındaysa geçersiz sonuç döner
        if (!location.IsInsideRegion)
        {
            return new ManualPinEvaluateResponseDto
            {
                IsValid = false,
                RegionId = location.RegionId,
                RegionName = location.RegionName,
                NeighborhoodId = null,
                NeighborhoodName = null,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                EstimatedCost = null,
                CostSource = "not_available",
                Message = "Seçilen nokta bölge sınırları dışında."
            };
        }

        // Seçilen bölgeye bağlı mahalleleri getirir
        var neighborhoods = await _neighborhoodRepository.GetByRegionIdAsync(
            request.RegionId,
            cancellationToken);

        // Bölge ve mahalle adlarını maliyet eşleştirmesi için hazırlar
        var areaNames = neighborhoods
            .Select(neighborhood => NormalizeAreaName(neighborhood.Name))
            .Append(NormalizeAreaName(location.RegionName))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Mevcut mock aday noktaları getirir
        var candidatePoints =
            await _candidatePointRepository.GetCandidatePointsAsync(
                cancellationToken);

        // Seçilen bölge veya bölgeye bağlı mahallelerle ilişkili
        // maliyet verilerini bulur
        var relatedCosts = candidatePoints
            .Where(candidatePoint =>
                candidatePoint.EstimatedCost.HasValue)
            .Where(candidatePoint =>
                MatchesArea(candidatePoint.Region, areaNames)
                || MatchesArea(candidatePoint.Neighborhood, areaNames))
            .Select(candidatePoint =>
                candidatePoint.EstimatedCost!.Value)
            .ToList();

        // Uygun maliyet verileri varsa ortalama tahmini maliyeti hesaplar
        decimal? estimatedCost = relatedCosts.Count > 0
            ? Math.Round(relatedCosts.Average(), 2)
            : null;

        // Geçerli manuel pin değerlendirme sonucunu döndürür
        return new ManualPinEvaluateResponseDto
        {
            IsValid = true,
            RegionId = location.RegionId,
            RegionName = location.RegionName,
            NeighborhoodId = location.NeighborhoodId,
            NeighborhoodName = location.NeighborhoodName,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            EstimatedCost = estimatedCost,

            // Şimdilik mock aday nokta maliyetlerinden hesaplanır
            CostSource = estimatedCost.HasValue
                ? "mock_candidate_average"
                : "not_available",

            Message = estimatedCost.HasValue
                ? "Manuel pin başarıyla değerlendirildi."
                : "Nokta geçerli ancak tahmini maliyet verisi bulunamadı."
        };
    }

    private static bool MatchesArea(
        string value,
        IReadOnlySet<string> areaNames)
    {
        var normalizedValue = NormalizeAreaName(value);

        // Boş alan adlarında eşleşme yapılmaz
        if (string.IsNullOrWhiteSpace(normalizedValue))
        {
            return false;
        }

        // Bölge veya mahalle adıyla eşleşme kontrolü yapar
        return areaNames.Any(areaName =>
            normalizedValue.Contains(
                areaName,
                StringComparison.OrdinalIgnoreCase)
            || areaName.Contains(
                normalizedValue,
                StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeAreaName(
        string value)
    {
        var normalizedValue = value.Trim();

        const string neighborhoodSuffix = " Mahallesi";

        // "Çukurambar Mahallesi" ve "Çukurambar"
        // değerlerinin eşleşmesini sağlar
        if (normalizedValue.EndsWith(
            neighborhoodSuffix,
            StringComparison.OrdinalIgnoreCase))
        {
            normalizedValue = normalizedValue[
                ..^neighborhoodSuffix.Length];
        }

        return normalizedValue.Trim();
    }
}