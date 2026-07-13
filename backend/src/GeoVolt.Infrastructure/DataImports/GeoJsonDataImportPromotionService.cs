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
        return datasetName is "district" or "regions" or "neighborhoods";
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
            _ => 0
        };
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
            _ => "Veri seti gerçek PostGIS tablosuna aktarıldı."
        };
    }
}
