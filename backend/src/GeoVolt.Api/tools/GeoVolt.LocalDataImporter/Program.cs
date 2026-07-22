using GeoVolt.Application.DataImports.Abstractions;
using GeoVolt.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

var arguments = ImportArguments.Parse(args);

if (!Directory.Exists(arguments.DataDirectory))
{
    return Fail($"Veri klasörü bulunamadı: {arguments.DataDirectory}");
}

if (!File.Exists(Path.Combine(arguments.ConfigurationDirectory, "appsettings.json")))
{
    return Fail($"API ayar klasörü bulunamadı: {arguments.ConfigurationDirectory}");
}

var configuration = new ConfigurationBuilder()
    .SetBasePath(arguments.ConfigurationDirectory)
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile("appsettings.Development.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var services = new ServiceCollection();
services.AddInfrastructure(configuration);

await using var serviceProvider = services.BuildServiceProvider();
using var scope = serviceProvider.CreateScope();

var stagingService = scope.ServiceProvider.GetRequiredService<IDataImportStagingService>();
var promotionService = scope.ServiceProvider.GetRequiredService<IDataImportPromotionService>();

var datasets = new[]
{
    new DatasetFile("ILCE.geojson", "Ilce"),
    new DatasetFile("Semttt.geojson", "Semt"),
    new DatasetFile("MAHALLE.geojson", "Mahalle")
};

foreach (var dataset in datasets)
{
    var filePath = Path.Combine(arguments.DataDirectory, dataset.FileName);
    if (!File.Exists(filePath))
    {
        return Fail($"Gerekli dosya bulunamadı: {filePath}");
    }

    Console.WriteLine($"{dataset.DisplayName} aktarılıyor: {dataset.FileName}");
    await using var stream = File.OpenRead(filePath);
    var staging = await stagingService.StageGeoJsonAsync(stream, dataset.FileName, CancellationToken.None);

    if ((!staging.Success && !staging.IsDuplicate) || staging.DatasetImportId is null)
    {
        return Fail($"{dataset.DisplayName} staging aşamasında başarısız oldu: {staging.Message}");
    }

    var promotion = await promotionService.PromoteAsync(staging.DatasetImportId.Value, CancellationToken.None);
    if (!promotion.Success)
    {
        return Fail($"{dataset.DisplayName} PostGIS'e aktarılamadı: {promotion.Message}");
    }

    Console.WriteLine($"  Tamam: {promotion.PromotedFeatureCount}/{promotion.SourceFeatureCount} kayıt ({promotion.Status}).");
}

Console.WriteLine("Yerel GIS veri aktarımı başarıyla tamamlandı.");
return 0;

static int Fail(string message)
{
    Console.Error.WriteLine($"HATA: {message}");
    return 1;
}

file sealed record DatasetFile(string FileName, string DisplayName);

file sealed record ImportArguments(string DataDirectory, string ConfigurationDirectory)
{
    public static ImportArguments Parse(string[] args)
    {
        string? dataDirectory = null;
        string? configurationDirectory = null;

        for (var index = 0; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--config-dir" when index + 1 < args.Length:
                    configurationDirectory = args[++index];
                    break;
                case "--help" or "-h":
                    throw new ArgumentException("Kullanım: GeoVolt.LocalDataImporter <veri-klasörü> [--config-dir <api-ayar-klasörü>]");
                case var value when dataDirectory is null:
                    dataDirectory = value;
                    break;
                default:
                    throw new ArgumentException($"Bilinmeyen parametre: {args[index]}");
            }
        }

        if (string.IsNullOrWhiteSpace(dataDirectory))
        {
            throw new ArgumentException("Veri klasörü parametresi zorunludur.");
        }

        return new ImportArguments(
            Path.GetFullPath(dataDirectory),
            Path.GetFullPath(configurationDirectory ?? Path.Combine("backend", "src", "GeoVolt.Api")));
    }
}
