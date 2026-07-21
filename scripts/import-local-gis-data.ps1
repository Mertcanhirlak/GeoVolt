[CmdletBinding()]
param(
    [string]$DataDirectory
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $repositoryRoot "backend"
if ([string]::IsNullOrWhiteSpace($DataDirectory)) {
    $DataDirectory = Join-Path $repositoryRoot "Data\data_1\Data"
}

$dataDirectoryPath = if ([System.IO.Path]::IsPathRooted($DataDirectory)) {
    $DataDirectory
}
else {
    Join-Path $repositoryRoot $DataDirectory
}

$resolvedDataDirectory = $dataDirectoryPath

if (-not (Test-Path -LiteralPath $resolvedDataDirectory -PathType Container)) {
    throw "Veri klasörü bulunamadı: $resolvedDataDirectory`nÖrnek kullanım: .\scripts\import-local-gis-data.ps1 -DataDirectory .\Data\data_1\Data"
}

Push-Location $backendRoot
try {
    Write-Host "[1/2] Veritabanı migration'ları uygulanıyor..." -ForegroundColor Cyan
    dotnet ef database update --configuration Release --project .\src\GeoVolt.Infrastructure --startup-project .\src\GeoVolt.Api
    if ($LASTEXITCODE -ne 0) {
        throw "Veritabanı migration'ı uygulanamadı."
    }

    Write-Host "[2/2] Yerel GIS verileri aktarılıyor..." -ForegroundColor Cyan
    dotnet run --configuration Release --project .\tools\GeoVolt.LocalDataImporter -- $resolvedDataDirectory --config-dir .\src\GeoVolt.Api
    if ($LASTEXITCODE -ne 0) {
        throw "Yerel GIS veri aktarımı başarısız oldu."
    }
}
finally {
    Pop-Location
}

Write-Host "Tamamlandı: İlçe, 28 semt, 124 mahalle ve şarj istasyonları yerel PostGIS veritabanına hazırlandı." -ForegroundColor Green
