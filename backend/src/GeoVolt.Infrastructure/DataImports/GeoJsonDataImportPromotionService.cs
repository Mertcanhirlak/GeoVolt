using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Application.DataImports.Models;
using GeoVolt.Domain.Constants;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace GeoVolt.Infrastructure.DataImports;

public sealed class GeoJsonDataImportPromotionService : IDataImportPromotionService
{
    private readonly GeoVoltDbContext _dbContext;

    public GeoJsonDataImportPromotionService(GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DatasetPromotionResult> PromoteAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        var datasetImport = await _dbContext.DatasetImports
            .FirstOrDefaultAsync(item => item.Id == datasetImportId, cancellationToken);

        if (datasetImport is null)
        {
            return Result(false, string.Empty, 0, 0, 0, "NotFound", "Aktarım kaydı bulunamadı.");
        }

        if (datasetImport.Status is not (
            DatasetImportStatuses.Staged
            or DatasetImportStatuses.Promoted
            or DatasetImportStatuses.Failed))
        {
            return Result(
                false,
                datasetImport.DatasetName,
                datasetImport.FeatureCount,
                0,
                datasetImport.FeatureCount,
                datasetImport.Status,
                "Yalnızca staging işlemi tamamlanmış veri setleri dönüştürülebilir.");
        }

        if (!IsSupported(datasetImport.DatasetName))
        {
            return Result(
                false,
                datasetImport.DatasetName,
                datasetImport.FeatureCount,
                0,
                datasetImport.FeatureCount,
                datasetImport.Status,
                "Bu veri seti için gerçek GIS tablosuna dönüşüm henüz desteklenmiyor.");
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var promotedCount = await PromoteDatasetAsync(
                datasetImport.DatasetName,
                datasetImportId,
                cancellationToken);
            var rejectedCount = datasetImport.FeatureCount - promotedCount;

            if (promotedCount == 0 || rejectedCount > 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                await transaction.DisposeAsync();
                datasetImport.Status = DatasetImportStatuses.Failed;
                datasetImport.ErrorMessage = FailureMessage(datasetImport.DatasetName);
                await _dbContext.SaveChangesAsync(cancellationToken);

                return Result(
                    false,
                    datasetImport.DatasetName,
                    datasetImport.FeatureCount,
                    promotedCount,
                    rejectedCount,
                    DatasetImportStatuses.Failed,
                    datasetImport.ErrorMessage);
            }

            datasetImport.Status = DatasetImportStatuses.Promoted;
            datasetImport.ErrorMessage = null;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Result(
                true,
                datasetImport.DatasetName,
                datasetImport.FeatureCount,
                promotedCount,
                rejectedCount,
                datasetImport.Status,
                SuccessMessage(datasetImport.DatasetName));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            await transaction.RollbackAsync(cancellationToken);
            await transaction.DisposeAsync();
            datasetImport.Status = DatasetImportStatuses.Failed;
            datasetImport.ErrorMessage = exception.Message.Length <= 4000
                ? exception.Message
                : exception.Message[..4000];
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Result(
                false,
                datasetImport.DatasetName,
                datasetImport.FeatureCount,
                0,
                datasetImport.FeatureCount,
                datasetImport.Status,
                "GIS dönüşümü sırasında hata oluştu.");
        }

        DatasetPromotionResult Result(
            bool success,
            string datasetCode,
            int sourceCount,
            int promotedCount,
            int rejectedCount,
            string status,
            string message)
        {
            return new DatasetPromotionResult(
                success,
                datasetImportId,
                datasetCode,
                sourceCount,
                promotedCount,
                rejectedCount,
                status,
                message);
        }
    }

    private static bool IsSupported(string datasetName)
    {
        return datasetName is
            "district"
            or "regions"
            or "neighborhoods"
            or "charging-stations"
            or "poi"
            or "power-transformers"
            or "roads";
    }

    private async Task<int> PromoteDatasetAsync(
        string datasetName,
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return datasetName switch
        {
            "district" => await PromoteDistrictAsync(datasetImportId, cancellationToken),
            "regions" => await PromoteRegionsAsync(datasetImportId, cancellationToken),
            "neighborhoods" => await PromoteNeighborhoodsAsync(datasetImportId, cancellationToken),
            "charging-stations" => await PromoteChargingStationsAsync(datasetImportId, cancellationToken),
            "poi" => await PromotePoisAsync(datasetImportId, cancellationToken),
            "power-transformers" => await PromotePowerTransformersAsync(datasetImportId, cancellationToken),
            "roads" => await PromoteRoadsAsync(datasetImportId, cancellationToken),
            _ => 0
        };
    }

    private async Task<int> PromotePoisAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH source AS (
                SELECT
                    (f."PropertiesJson" ->> 'ID')::numeric::bigint AS source_id,
                    NULLIF(btrim(f."PropertiesJson" ->> 'NAME'), '') AS name,
                    NULLIF(btrim(f."PropertiesJson" ->> 'CATEGORY'), '') AS category,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SUB_CATEGORY'), '') AS sub_category,
                    NULLIF(btrim(f."PropertiesJson" ->> 'PHONE'), '') AS phone,
                    NULLIF(btrim(f."PropertiesJson" ->> 'EMAIL'), '') AS email,
                    NULLIF(btrim(f."PropertiesJson" ->> 'WEB'), '') AS website,
                    ST_SetSRID(
                        ST_Force2D(ST_GeomFromGeoJSON(f."GeometryJson"::text)),
                        4326
                    )::geometry(Point, 4326) AS location
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT *
                FROM source
                WHERE source_id IS NOT NULL
                  AND name IS NOT NULL
                  AND category IS NOT NULL
                  AND location IS NOT NULL
                  AND NOT ST_IsEmpty(location)
                  AND ST_IsValid(location)
            ),
            upserted AS (
                INSERT INTO gis.pois (
                    "SourceId",
                    "Name",
                    "Category",
                    "SubCategory",
                    "Phone",
                    "Email",
                    "Website",
                    "Location"
                )
                SELECT
                    source_id,
                    name,
                    category,
                    sub_category,
                    phone,
                    email,
                    website,
                    location
                FROM valid_source
                ON CONFLICT ("SourceId") DO UPDATE SET
                    "Name" = EXCLUDED."Name",
                    "Category" = EXCLUDED."Category",
                    "SubCategory" = EXCLUDED."SubCategory",
                    "Phone" = EXCLUDED."Phone",
                    "Email" = EXCLUDED."Email",
                    "Website" = EXCLUDED."Website",
                    "Location" = EXCLUDED."Location"
                RETURNING "Id"
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> PromotePowerTransformersAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH source AS (
                SELECT
                    (f."PropertiesJson" ->> 'ID')::numeric::bigint AS source_id,
                    NULLIF(btrim(f."PropertiesJson" ->> 'NAME'), '') AS name,
                    COALESCE(
                        NULLIF(btrim(f."PropertiesJson" ->> 'SUB_CATEGORY'), ''),
                        NULLIF(btrim(f."PropertiesJson" ->> 'CATEGORY'), '')
                    ) AS transformer_type,
                    ST_SetSRID(
                        ST_Force2D(ST_GeomFromGeoJSON(f."GeometryJson"::text)),
                        4326
                    )::geometry(Point, 4326) AS location
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT *
                FROM source
                WHERE source_id IS NOT NULL
                  AND location IS NOT NULL
                  AND NOT ST_IsEmpty(location)
                  AND ST_IsValid(location)
            ),
            upserted AS (
                INSERT INTO gis.power_transformers (
                    "SourceId",
                    "Name",
                    "TransformerType",
                    "Location"
                )
                SELECT source_id, name, transformer_type, location
                FROM valid_source
                ON CONFLICT ("SourceId") DO UPDATE SET
                    "Name" = EXCLUDED."Name",
                    "TransformerType" = EXCLUDED."TransformerType",
                    "Location" = EXCLUDED."Location"
                RETURNING "Id"
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> PromoteRoadsAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH source AS (
                SELECT
                    (f."PropertiesJson" ->> 'ID')::numeric::bigint AS source_id,
                    NULLIF(btrim(f."PropertiesJson" ->> 'NAME'), '') AS name,
                    NULLIF(btrim(f."PropertiesJson" ->> 'TYPES'), '') AS road_type,
                    NULLIF(replace(btrim(f."PropertiesJson" ->> 'SPEED'), ',', '.'), '')::double precision AS speed,
                    NULLIF(replace(btrim(f."PropertiesJson" ->> 'SPEED_AVG'), ',', '.'), '')::double precision AS average_speed,
                    ST_Multi(
                        ST_CollectionExtract(
                            ST_MakeValid(
                                ST_SetSRID(
                                    ST_Force2D(ST_GeomFromGeoJSON(f."GeometryJson"::text)),
                                    4326
                                )
                            ),
                            2
                        )
                    )::geometry(MultiLineString, 4326) AS geometry
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT *
                FROM source
                WHERE source_id IS NOT NULL
                  AND road_type IS NOT NULL
                  AND geometry IS NOT NULL
                  AND NOT ST_IsEmpty(geometry)
                  AND ST_IsValid(geometry)
            ),
            upserted AS (
                INSERT INTO gis.roads (
                    "SourceId",
                    "Name",
                    "RoadType",
                    "Speed",
                    "AverageSpeed",
                    "Geometry"
                )
                SELECT
                    source_id,
                    name,
                    road_type,
                    speed,
                    average_speed,
                    geometry
                FROM valid_source
                ON CONFLICT ("SourceId") DO UPDATE SET
                    "Name" = EXCLUDED."Name",
                    "RoadType" = EXCLUDED."RoadType",
                    "Speed" = EXCLUDED."Speed",
                    "AverageSpeed" = EXCLUDED."AverageSpeed",
                    "Geometry" = EXCLUDED."Geometry"
                RETURNING "Id"
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> PromoteChargingStationsAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH raw_source AS (
                SELECT
                    NULLIF(btrim(f."PropertiesJson" ->> 'ISTASYON_NO'), '') AS source_station_number,
                    NULLIF(btrim(f."PropertiesJson" ->> 'ISTASYON_ADI'), '') AS station_name,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SARJ_AGI_ISLETMECISI'), '') AS operator_name,
                    NULLIF(btrim(f."PropertiesJson" ->> 'MARKAADI'), '') AS brand_name,
                    NULLIF(btrim(f."PropertiesJson" ->> 'HIZMET_SEKLI'), '') AS service_type,
                    NULLIF(btrim(f."PropertiesJson" ->> 'ADRES'), '') AS address,
                    NULLIF(btrim(f."PropertiesJson" ->> 'YESIL_SARJ_ISTASYONU_MU'), '') AS green_station,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SOKET_NO'), '') AS source_socket_number,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SOKET_TIPI'), '') AS socket_type,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SOKET_TURU'), '') AS connector_type,
                    NULLIF(btrim(f."PropertiesJson" ->> 'SOKET_GUCU_KW'), '') AS power_kw_text,
                    f."GeometryJson"::text AS geometry_json
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            station_groups AS (
                SELECT
                    source_station_number,
                    min(station_name) AS station_name,
                    min(operator_name) AS operator_name,
                    min(brand_name) AS brand_name,
                    CASE min(service_type)
                        WHEN 'HALKA_ACIK' THEN 'Public'
                        WHEN 'OZEL' THEN 'Private'
                    END AS access_type,
                    min(address) AS address,
                    bool_or(green_station = 'Evet') AS is_green_station,
                    ST_SetSRID(
                        ST_Force2D(ST_GeomFromGeoJSON(min(geometry_json))),
                        4326
                    )::geometry(Point, 4326) AS location
                FROM raw_source
                WHERE source_station_number IS NOT NULL
                GROUP BY source_station_number
                HAVING count(DISTINCT station_name) = 1
                   AND count(DISTINCT operator_name) = 1
                   AND count(DISTINCT service_type) = 1
                   AND count(DISTINCT address) = 1
                   AND count(DISTINCT geometry_json) = 1
            ),
            spatially_matched AS (
                SELECT
                    station.*,
                    neighborhood_match.neighborhood_id,
                    neighborhood_match.region_id,
                    neighborhood_match.match_count
                FROM station_groups station
                CROSS JOIN LATERAL (
                    SELECT
                        count(*)::integer AS match_count,
                        min(neighborhood.id) AS neighborhood_id,
                        min(neighborhood.region_id) AS region_id
                    FROM gis.neighborhoods neighborhood
                    WHERE ST_Covers(neighborhood.boundary, station.location)
                ) neighborhood_match
            ),
            accepted_stations AS (
                SELECT *
                FROM spatially_matched
                WHERE match_count = 1
                  AND station_name IS NOT NULL
                  AND operator_name IS NOT NULL
                  AND access_type IS NOT NULL
                  AND address IS NOT NULL
                  AND location IS NOT NULL
                  AND NOT ST_IsEmpty(location)
                  AND ST_IsValid(location)
            ),
            upserted_stations AS (
                INSERT INTO gis.charging_stations (
                    source_station_number,
                    name,
                    operator_name,
                    brand_name,
                    access_type,
                    region_id,
                    neighborhood_id,
                    address,
                    location,
                    is_active,
                    is_green_station
                )
                SELECT
                    source_station_number,
                    station_name,
                    operator_name,
                    brand_name,
                    access_type,
                    region_id,
                    neighborhood_id,
                    address,
                    location,
                    true,
                    is_green_station
                FROM accepted_stations
                ON CONFLICT (source_station_number) DO UPDATE SET
                    name = EXCLUDED.name,
                    operator_name = EXCLUDED.operator_name,
                    brand_name = EXCLUDED.brand_name,
                    access_type = EXCLUDED.access_type,
                    region_id = EXCLUDED.region_id,
                    neighborhood_id = EXCLUDED.neighborhood_id,
                    address = EXCLUDED.address,
                    location = EXCLUDED.location,
                    is_active = EXCLUDED.is_active,
                    is_green_station = EXCLUDED.is_green_station
                RETURNING id, source_station_number
            ),
            valid_connectors AS (
                SELECT
                    station.id AS charging_station_id,
                    source.source_socket_number,
                    source.socket_type,
                    source.connector_type,
                    replace(source.power_kw_text, ',', '.')::double precision AS power_kw
                FROM raw_source source
                INNER JOIN upserted_stations station
                    ON station.source_station_number = source.source_station_number
                WHERE source.source_socket_number IS NOT NULL
                  AND source.socket_type IS NOT NULL
                  AND source.connector_type IS NOT NULL
                  AND source.power_kw_text ~ '^[0-9]+([.,][0-9]+)?$'
            ),
            upserted_connectors AS (
                INSERT INTO gis.charging_connectors (
                    charging_station_id,
                    source_socket_number,
                    socket_type,
                    connector_type,
                    power_kw,
                    quantity
                )
                SELECT
                    charging_station_id,
                    source_socket_number,
                    socket_type,
                    connector_type,
                    power_kw,
                    1
                FROM valid_connectors
                ON CONFLICT (charging_station_id, source_socket_number) DO UPDATE SET
                    socket_type = EXCLUDED.socket_type,
                    connector_type = EXCLUDED.connector_type,
                    power_kw = EXCLUDED.power_kw,
                    quantity = EXCLUDED.quantity
                RETURNING id
            )
            SELECT count(*)::integer FROM upserted_connectors;
            """,
            cancellationToken);
    }

    private async Task<int> PromoteDistrictAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH source AS (
                SELECT
                    (f."PropertiesJson" ->> 'Id')::numeric::integer AS source_id,
                    f."PropertiesJson" ->> 'Name' AS name,
                    NULLIF(f."PropertiesJson" ->> 'Population', '')::numeric::integer AS population,
                    ST_Multi(
                        ST_CollectionExtract(
                            ST_MakeValid(
                                ST_SetSRID(ST_GeomFromGeoJSON(f."GeometryJson"::text), 4326)
                            ),
                            3
                        )
                    )::geometry(MultiPolygon, 4326) AS boundary
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT *
                FROM source
                WHERE source_id IS NOT NULL
                  AND name IS NOT NULL
                  AND boundary IS NOT NULL
                  AND NOT ST_IsEmpty(boundary)
                  AND ST_IsValid(boundary)
            ),
            upserted AS (
                INSERT INTO gis.districts (source_id, name, population, boundary)
                SELECT source_id, name, population, boundary
                FROM valid_source
                ON CONFLICT (source_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    population = EXCLUDED.population,
                    boundary = EXCLUDED.boundary
                RETURNING id
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> PromoteRegionsAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH region_registry(source_id, name) AS (
                VALUES
                    (1, 'Ahlatlıbel'),
                    (2, 'Anıttepe'),
                    (3, 'Ayrancı'),
                    (4, 'Bademlidere'),
                    (5, 'Bahçelievler'),
                    (6, 'Balgat'),
                    (7, 'Beşevler'),
                    (8, 'Beysukent'),
                    (9, 'Beytepe'),
                    (10, 'Cebeci'),
                    (11, 'Çayyolu'),
                    (12, 'Dikmen'),
                    (13, 'Gaziosmanpaşa'),
                    (14, 'Hürriyet'),
                    (15, 'Kavaklıdere'),
                    (16, 'Kırkkonaklar'),
                    (17, 'Kızılay'),
                    (18, 'Kurtuluş'),
                    (19, 'Küçükesat'),
                    (20, 'Maltepe'),
                    (21, 'Merkez'),
                    (22, 'ODTÜ'),
                    (23, 'Öveçler'),
                    (24, 'Sıhhiye'),
                    (25, 'Tunalı Hilmi'),
                    (26, 'Turan Güneş'),
                    (27, 'Yıldız'),
                    (28, 'Zafertepe')
            ),
            normalized AS (
                SELECT
                    registry.source_id,
                    registry.name,
                    ST_Multi(
                        ST_CollectionExtract(
                            ST_MakeValid(
                                ST_SetSRID(ST_GeomFromGeoJSON(f."GeometryJson"::text), 4326)
                            ),
                            3
                        )
                    )::geometry(MultiPolygon, 4326) AS boundary
                FROM staging.geojson_features f
                INNER JOIN region_registry registry
                    ON registry.name = f."PropertiesJson" ->> 'Semt'
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT
                    source_id,
                    name,
                    boundary
                FROM normalized
                WHERE boundary IS NOT NULL
                  AND NOT ST_IsEmpty(boundary)
                  AND ST_IsValid(boundary)
            ),
            district AS (
                SELECT id
                FROM gis.districts
                WHERE source_id = 1231
                LIMIT 1
            ),
            upserted AS (
                INSERT INTO gis.regions (source_id, district_id, name, population, boundary)
                SELECT source.source_id, district.id, source.name, 0, source.boundary
                FROM valid_source source
                CROSS JOIN district
                ON CONFLICT (source_id) DO UPDATE SET
                    district_id = EXCLUDED.district_id,
                    name = EXCLUDED.name,
                    boundary = EXCLUDED.boundary
                RETURNING id
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> PromoteNeighborhoodsAsync(
        int datasetImportId,
        CancellationToken cancellationToken)
    {
        return await ExecuteCountAsync(
            datasetImportId,
            """
            WITH normalized AS (
                SELECT
                    (f."PropertiesJson" ->> 'ID')::numeric::integer AS source_id,
                    f."PropertiesJson" ->> 'NAME' AS name,
                    (f."PropertiesJson" ->> 'POPULATION')::numeric::integer AS population,
                    ST_Multi(
                        ST_CollectionExtract(
                            ST_MakeValid(
                                ST_SetSRID(ST_GeomFromGeoJSON(f."GeometryJson"::text), 4326)
                            ),
                            3
                        )
                    )::geometry(MultiPolygon, 4326) AS boundary
                FROM staging.geojson_features f
                WHERE f."DatasetImportId" = @datasetImportId
            ),
            valid_source AS (
                SELECT *
                FROM normalized
                WHERE source_id IS NOT NULL
                  AND name IS NOT NULL
                  AND population IS NOT NULL
                  AND population >= 0
                  AND boundary IS NOT NULL
                  AND NOT ST_IsEmpty(boundary)
                  AND ST_IsValid(boundary)
            ),
            matched AS (
                SELECT
                    source.*,
                    match.region_id,
                    match.overlap_area
                        / NULLIF(ST_Area(ST_Transform(source.boundary, 32636)), 0) AS overlap_ratio
                FROM valid_source source
                CROSS JOIN LATERAL (
                    SELECT
                        region.id AS region_id,
                        ST_Area(
                            ST_Transform(
                                ST_Intersection(source.boundary, region.boundary),
                                32636
                            )
                        ) AS overlap_area
                    FROM gis.regions region
                    WHERE ST_Intersects(source.boundary, region.boundary)
                    ORDER BY overlap_area DESC
                    LIMIT 1
                ) match
            ),
            accepted AS (
                SELECT *
                FROM matched
                WHERE overlap_ratio >= 0.95
            ),
            totals AS (
                SELECT region_id, sum(population)::integer AS population
                FROM accepted
                GROUP BY region_id
            ),
            updated_regions AS (
                UPDATE gis.regions region
                SET population = totals.population
                FROM totals
                WHERE region.id = totals.region_id
                RETURNING region.id
            ),
            upserted AS (
                INSERT INTO gis.neighborhoods (source_id, region_id, name, population, boundary)
                SELECT source_id, region_id, name, population, boundary
                FROM accepted
                ON CONFLICT (source_id) DO UPDATE SET
                    region_id = EXCLUDED.region_id,
                    name = EXCLUDED.name,
                    population = EXCLUDED.population,
                    boundary = EXCLUDED.boundary
                RETURNING id
            )
            SELECT count(*)::integer FROM upserted;
            """,
            cancellationToken);
    }

    private async Task<int> ExecuteCountAsync(
        int datasetImportId,
        string commandText,
        CancellationToken cancellationToken)
    {
        var connection = (NpgsqlConnection)_dbContext.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.Transaction = (NpgsqlTransaction)_dbContext.Database.CurrentTransaction!.GetDbTransaction();
        command.CommandText = commandText;
        command.Parameters.AddWithValue("datasetImportId", datasetImportId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result);
    }

    private static string FailureMessage(string datasetName)
    {
        return datasetName switch
        {
            "district" => "Bazı ilçe kayıtları geçerli PostGIS geometrisine dönüştürülemedi.",
            "regions" => "Bazı semt kayıtları dönüştürülemedi veya Çankaya ilçe kaydı bulunamadı.",
            "neighborhoods" => "Bazı mahalleler geçerli bir semtle en az yüzde 95 oranında eşleştirilemedi.",
            "charging-stations" => "Bazı şarj soketleri geçerli bir istasyon veya mahalle ile eşleştirilemedi.",
            "poi" => "Bazı POI kayıtları geçerli bir PostGIS noktasına dönüştürülemedi.",
            "power-transformers" => "Bazı trafo kayıtları geçerli bir PostGIS noktasına dönüştürülemedi.",
            "roads" => "Bazı yol kayıtları geçerli bir PostGIS çizgisine dönüştürülemedi.",
            _ => "Bazı kayıtlar gerçek GIS tablosuna dönüştürülemedi."
        };
    }

    private static string SuccessMessage(string datasetName)
    {
        return datasetName switch
        {
            "district" => "İlçe verisi gerçek PostGIS tablosuna aktarıldı.",
            "regions" => "Semt verisi gerçek PostGIS tablosuna aktarıldı.",
            "neighborhoods" => "Mahalleler semtlerle eşleştirilerek gerçek PostGIS tablosuna aktarıldı.",
            "charging-stations" => "Şarj istasyonları ve soketleri gerçek PostGIS tablolarına aktarıldı.",
            "poi" => "POI verileri gerçek PostGIS tablosuna aktarıldı.",
            "power-transformers" => "Trafo verileri gerçek PostGIS tablosuna aktarıldı.",
            "roads" => "Yol verileri gerçek PostGIS tablosuna aktarıldı.",
            _ => "Veri seti gerçek PostGIS tablosuna aktarıldı."
        };
    }
}
