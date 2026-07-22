using System.Data;
using System.Globalization;
using GeoVolt.Application.ManualPins.Abstractions;
using GeoVolt.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GeoVolt.Infrastructure.ManualPins;

public sealed class PostGisTransformerRepository
    : ITransformerRepository
{
    private readonly GeoVoltDbContext _dbContext;

    public PostGisTransformerRepository(
        GeoVoltDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<double?> GetNearestDistanceMetersAsync(
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
    SELECT
        ST_Distance(
            transformer."Location"::geography,
            ST_SetSRID(
                ST_MakePoint(
                    @longitude,
                    @latitude),
                4326)::geography)
    FROM gis.power_transformers AS transformer
    ORDER BY
        transformer."Location" <->
        ST_SetSRID(
            ST_MakePoint(
                @longitude,
                @latitude),
            4326)
    LIMIT 1;
    """;

            var latitudeParameter =
                command.CreateParameter();

            latitudeParameter.ParameterName = "latitude";
            latitudeParameter.Value = latitude;

            command.Parameters.Add(latitudeParameter);

            var longitudeParameter =
                command.CreateParameter();

            longitudeParameter.ParameterName = "longitude";
            longitudeParameter.Value = longitude;

            command.Parameters.Add(longitudeParameter);

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