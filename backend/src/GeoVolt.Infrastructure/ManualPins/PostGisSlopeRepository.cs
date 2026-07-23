using System.Data;
using System.Globalization;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.ManualPins;

public sealed class PostGisSlopeRepository
    : ISlopeRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public PostGisSlopeRepository(
        GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<double?> GetSlopePercentAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        var connection =
            _dbContext.Database.GetDbConnection();

        var shouldCloseConnection =
            connection.State != ConnectionState.Open;

        if (shouldCloseConnection)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command =
                connection.CreateCommand();

            command.CommandText =
                """
                WITH point AS
                (
                    SELECT ST_Transform(
                        ST_SetSRID(
                            ST_MakePoint(
                                @longitude,
                                @latitude),
                            4326),
                        32636) AS geom
                )
                SELECT
                    ST_Value(
                        raster.rast,
                        1,
                        point.geom,
                        true)
                FROM gis.slope_raster_tiles AS raster
                CROSS JOIN point
                WHERE ST_Intersects(
                    raster.rast,
                    point.geom)
                LIMIT 1;
                """;

            var longitudeParameter =
                command.CreateParameter();

            longitudeParameter.ParameterName =
                "longitude";

            longitudeParameter.DbType =
                DbType.Double;

            longitudeParameter.Value =
                longitude;

            command.Parameters.Add(
                longitudeParameter);

            var latitudeParameter =
                command.CreateParameter();

            latitudeParameter.ParameterName =
                "latitude";

            latitudeParameter.DbType =
                DbType.Double;

            latitudeParameter.Value =
                latitude;

            command.Parameters.Add(
                latitudeParameter);

            var result =
                await command.ExecuteScalarAsync(
                    cancellationToken);

            if (result is null || result is DBNull)
            {
                return null;
            }

            return Convert.ToDouble(
                result,
                CultureInfo.InvariantCulture);
        }
        finally
        {
            if (shouldCloseConnection)
            {
                await connection.CloseAsync();
            }
        }
    }
}