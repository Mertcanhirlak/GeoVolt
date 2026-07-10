using System.Globalization;
using System.Text;
using System.Text.Json;
using GeoVolt.Domain.Entities;
using NetTopologySuite.Geometries;

namespace GeoVolt.Infrastructure.Geospatial;

internal static class MahalleGeoJsonDataLoader
{
    private static readonly Lazy<IReadOnlyList<MahalleGeoRecord>> CachedRecords =
        new(
            LoadRecords,
            LazyThreadSafetyMode.ExecutionAndPublication);

    public static IReadOnlyList<Region> LoadRegions()
    {
        return CachedRecords.Value
            .Select(record => new Region
            {
                Id = record.Id,
                Name = record.Name,
                Boundary = record.Boundary.Copy()
            })
            .ToList();
    }

    public static IReadOnlyList<Neighborhood> LoadNeighborhoods()
    {
        /*
         * Geçici entegrasyon:
         * MAHALLE.geojson içindeki her polygon hem bölge hem mahalle
         * olarak kullanılır.
         *
         * 27 semt sınırı ve mahalle-semt eşleştirmesi geldiğinde
         * RegionId alanı gerçek semt ID'sine bağlanacaktır.
         */
        return CachedRecords.Value
            .Select(record => new Neighborhood
            {
                Id = record.Id,
                Name = record.Name,
                RegionId = record.Id,
                Boundary = record.Boundary.Copy()
            })
            .ToList();
    }

    private static IReadOnlyList<MahalleGeoRecord> LoadRecords()
    {
        var filePath = Path.Combine(
            AppContext.BaseDirectory,
            "Data",
            "MAHALLE.geojson");

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException(
                $"MAHALLE.geojson bulunamadı. Beklenen yol: {filePath}",
                filePath);
        }

        var json = File.ReadAllText(
            filePath,
            Encoding.UTF8);

        using var document = JsonDocument.Parse(json);

        if (!document.RootElement.TryGetProperty(
                "features",
                out var featuresElement) ||
            featuresElement.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidDataException(
                "MAHALLE.geojson içinde geçerli bir features dizisi bulunamadı.");
        }

        var geometryFactory = new GeometryFactory(
            new PrecisionModel(),
            4326);

        var records = new Dictionary<int, MahalleGeoRecord>();

        foreach (var featureElement in featuresElement.EnumerateArray())
        {
            try
            {
                if (!featureElement.TryGetProperty(
                        "properties",
                        out var propertiesElement) ||
                    !featureElement.TryGetProperty(
                        "geometry",
                        out var geometryElement))
                {
                    continue;
                }

                var id = ReadRequiredInteger(
                    propertiesElement,
                    "ID",
                    "id",
                    "Id");

                var name = ReadRequiredText(
                    propertiesElement,
                    "NAME",
                    "name",
                    "Name");

                var boundary = ParseGeometry(
                    geometryElement,
                    geometryFactory);

                boundary.SRID = 4326;

                if (boundary.IsEmpty)
                {
                    continue;
                }

                records[id] = new MahalleGeoRecord(
                    id,
                    name,
                    boundary);
            }
            catch
            {
                /*
                 * Tek bir bozuk feature yüzünden tüm veri yükleme
                 * işleminin durması engellenir.
                 */
            }
        }

        if (records.Count == 0)
        {
            throw new InvalidDataException(
                "MAHALLE.geojson içinden hiçbir geçerli polygon okunamadı.");
        }

        return records.Values
            .OrderBy(
                record => record.Name,
                StringComparer.Create(
                    new CultureInfo("tr-TR"),
                    ignoreCase: true))
            .ToList();
    }

    private static Geometry ParseGeometry(
        JsonElement geometryElement,
        GeometryFactory geometryFactory)
    {
        var geometryType = ReadRequiredText(
            geometryElement,
            "type",
            "Type");

        if (!TryGetAnyProperty(
                geometryElement,
                out var coordinatesElement,
                "coordinates",
                "Coordinates"))
        {
            throw new InvalidDataException(
                "GeoJSON geometrisinde coordinates alanı bulunamadı.");
        }

        return geometryType switch
        {
            "Polygon" => ParsePolygon(
                coordinatesElement,
                geometryFactory),

            "MultiPolygon" => ParseMultiPolygon(
                coordinatesElement,
                geometryFactory),

            _ => throw new NotSupportedException(
                $"Desteklenmeyen GeoJSON geometri tipi: {geometryType}")
        };
    }

    private static Polygon ParsePolygon(
        JsonElement polygonCoordinates,
        GeometryFactory geometryFactory)
    {
        var ringElements = polygonCoordinates
            .EnumerateArray()
            .ToArray();

        if (ringElements.Length == 0)
        {
            throw new InvalidDataException(
                "Polygon en az bir dış halka içermelidir.");
        }

        var shell = CreateLinearRing(
            ringElements[0],
            geometryFactory);

        var holes = ringElements
            .Skip(1)
            .Select(ringElement =>
                CreateLinearRing(
                    ringElement,
                    geometryFactory))
            .ToArray();

        return geometryFactory.CreatePolygon(
            shell,
            holes);
    }

    private static MultiPolygon ParseMultiPolygon(
        JsonElement multiPolygonCoordinates,
        GeometryFactory geometryFactory)
    {
        var polygons = multiPolygonCoordinates
            .EnumerateArray()
            .Select(polygonElement =>
                ParsePolygon(
                    polygonElement,
                    geometryFactory))
            .ToArray();

        if (polygons.Length == 0)
        {
            throw new InvalidDataException(
                "MultiPolygon en az bir polygon içermelidir.");
        }

        return geometryFactory.CreateMultiPolygon(
            polygons);
    }

    private static LinearRing CreateLinearRing(
        JsonElement ringElement,
        GeometryFactory geometryFactory)
    {
        var coordinates = ringElement
            .EnumerateArray()
            .Select(ReadCoordinate)
            .ToList();

        if (coordinates.Count < 3)
        {
            throw new InvalidDataException(
                "Polygon halkası en az üç koordinat içermelidir.");
        }

        if (!coordinates[0].Equals2D(
                coordinates[^1]))
        {
            coordinates.Add(
                new Coordinate(
                    coordinates[0].X,
                    coordinates[0].Y));
        }

        if (coordinates.Count < 4)
        {
            throw new InvalidDataException(
                "Kapalı polygon halkası en az dört koordinat içermelidir.");
        }

        return geometryFactory.CreateLinearRing(
            coordinates.ToArray());
    }

    private static Coordinate ReadCoordinate(
        JsonElement coordinateElement)
    {
        var coordinateValues = coordinateElement
            .EnumerateArray()
            .ToArray();

        if (coordinateValues.Length < 2)
        {
            throw new InvalidDataException(
                "GeoJSON koordinatı longitude ve latitude içermelidir.");
        }

        var longitude = ReadDouble(
            coordinateValues[0]);

        var latitude = ReadDouble(
            coordinateValues[1]);

        return new Coordinate(
            longitude,
            latitude);
    }

    private static int ReadRequiredInteger(
        JsonElement source,
        params string[] propertyNames)
    {
        if (!TryGetAnyProperty(
                source,
                out var valueElement,
                propertyNames))
        {
            throw new InvalidDataException(
                $"Zorunlu sayı alanı bulunamadı: {string.Join(", ", propertyNames)}");
        }

        var numericValue = ReadDouble(
            valueElement);

        if (numericValue < int.MinValue ||
            numericValue > int.MaxValue)
        {
            throw new InvalidDataException(
                $"ID değeri int sınırları dışında: {numericValue}");
        }

        return Convert.ToInt32(
            Math.Round(
                numericValue,
                MidpointRounding.AwayFromZero));
    }

    private static string ReadRequiredText(
        JsonElement source,
        params string[] propertyNames)
    {
        if (!TryGetAnyProperty(
                source,
                out var valueElement,
                propertyNames))
        {
            throw new InvalidDataException(
                $"Zorunlu metin alanı bulunamadı: {string.Join(", ", propertyNames)}");
        }

        var value = valueElement.ValueKind switch
        {
            JsonValueKind.String =>
                valueElement.GetString(),

            JsonValueKind.Number =>
                valueElement.GetRawText(),

            _ => null
        };

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidDataException(
                $"Metin alanı boş olamaz: {string.Join(", ", propertyNames)}");
        }

        return value.Trim();
    }

    private static double ReadDouble(
        JsonElement valueElement)
    {
        if (valueElement.ValueKind == JsonValueKind.Number &&
            valueElement.TryGetDouble(out var numberValue))
        {
            return numberValue;
        }

        if (valueElement.ValueKind == JsonValueKind.String)
        {
            var text = valueElement
                .GetString()
                ?.Trim()
                .Replace(",", ".");

            if (double.TryParse(
                    text,
                    NumberStyles.Float |
                    NumberStyles.AllowThousands,
                    CultureInfo.InvariantCulture,
                    out var parsedValue))
            {
                return parsedValue;
            }
        }

        throw new InvalidDataException(
            $"Geçerli sayı okunamadı: {valueElement}");
    }

    private static bool TryGetAnyProperty(
        JsonElement source,
        out JsonElement value,
        params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (source.TryGetProperty(
                    propertyName,
                    out value))
            {
                return true;
            }
        }

        value = default;

        return false;
    }

    private sealed record MahalleGeoRecord(
        int Id,
        string Name,
        Geometry Boundary);
}