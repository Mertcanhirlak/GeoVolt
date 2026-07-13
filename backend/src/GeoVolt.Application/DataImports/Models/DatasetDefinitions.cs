namespace GeoVolt.Application.DataImports.Models;

public static class DatasetDefinitions
{
    private static readonly IReadOnlyDictionary<string, DatasetDefinition> Definitions =
        new Dictionary<string, DatasetDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["ARAC_SARJ.geojson"] = Create("charging-stations", "ARAC_SARJ.geojson", ["Point"],
                ["ISTASYON_NO", "ISTASYON_ADI", "SARJ_AGI_ISLETMECISI", "ADRES", "SOKET_NO", "SOKET_TIPI", "SOKET_GUCU_KW"]),
            ["POI.geojson"] = Create("poi", "POI.geojson", ["Point"], ["ID", "NAME", "CATEGORY"]),
            ["YOL.geojson"] = Create("roads", "YOL.geojson", ["LineString", "MultiLineString"], ["ID", "TYPES"]),
            ["TRAFO.geojson"] = Create("power-transformers", "TRAFO.geojson", ["Point"], ["ID", "CATEGORY", "SUB_CATEGORY"]),
            ["MAHALLE.geojson"] = Create("neighborhoods", "MAHALLE.geojson", ["Polygon", "MultiPolygon"], ["ID", "NAME", "POPULATION"]),
            ["ILCE.geojson"] = Create("district", "ILCE.geojson", ["Polygon", "MultiPolygon"], ["Id", "Name", "Population"])
        };

    public static DatasetDefinition? FindByFileName(string fileName)
    {
        return Definitions.GetValueOrDefault(Path.GetFileName(fileName));
    }

    public static IReadOnlyCollection<DatasetDefinition> All => Definitions.Values.ToArray();

    private static DatasetDefinition Create(string code, string fileName, string[] geometryTypes, string[] requiredProperties)
    {
        return new DatasetDefinition(
            code,
            fileName,
            geometryTypes.ToHashSet(StringComparer.OrdinalIgnoreCase),
            requiredProperties.ToHashSet(StringComparer.OrdinalIgnoreCase));
    }
}
