# Yerel Gerçek GIS Verisi Kurulumu

Bu kurulum her geliştiricinin kendi bilgisayarındaki PostgreSQL/PostGIS veritabanına gerçek ilçe, semt ve mahalle verisini aktarır. Veri dosyaları Git'e eklenmez; ekipteki herkes kendi `Data` klasörünü kullanır.

## Gerekenler

- .NET 10 SDK
- EF Core aracı (bir kez kurulur): `dotnet tool install --global dotnet-ef --version 10.*`
- PostgreSQL ve PostGIS kurulu/çalışır durumda
- Proje kökünde `Data/data_1/Data` klasörü
- Bu klasörde şu dört dosya:
  - `ILCE.geojson`
  - `Semttt.geojson`
  - `MAHALLE.geojson`
  - `ARAC_SARJ.geojson`

Veritabanı bağlantısını kendi bilgisayarına göre `backend/src/GeoVolt.Api/appsettings.Development.json` içinde ayarla. İstersen `DATABASE_CONNECTION_STRING` ortam değişkeni de kullanabilirsin; bu değer dosyadaki ayarın önüne geçer.

## Tek Komut

Proje kökünde PowerShell açıp şu tek komutu çalıştır:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-local-gis-data.ps1
```

Komut otomatik olarak:

1. Eksik migration'ları uygular ve PostGIS tablolarını hazırlar.
2. `ILCE.geojson` dosyasını aktarır.
3. `Semttt.geojson` dosyasından 28 semti aktarır.
4. `MAHALLE.geojson` dosyasından 124 mahalleyi aktarır, alan çakışmasına göre semte bağlar ve semt nüfuslarını mahallelerden hesaplar.
5. `ARAC_SARJ.geojson` dosyasını istasyon ve soket tablolarına ayırır, istasyonları mahalle ve semtlerle eşleştirir.

Veri klasörü başka konumdaysa:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-local-gis-data.ps1 -DataDirectory "C:\veriler\GeoVolt\Data"
```

Komut tekrar güvenle çalıştırılabilir. Aynı dosya daha önce staging'e alınmışsa mevcut aktarımı kullanır; veriyi iki kez çoğaltmaz.

## Aktarımdan Sonra

Backend'i başlat:

```powershell
dotnet run --project .\backend\src\GeoVolt.Api
```

Frontend varsayılan olarak `http://localhost:5000` adresindeki API'ye bağlanır. Gerçek veriyle kullanılabilen endpointler:

- `GET /api/regions` — 28 semt ve nüfusları
- `GET /api/regions/{id}/neighborhoods` — ilgili semtin mahalleleri
- `GET /api/neighborhoods` — 124 mahalle
- `GET /api/neighborhoods/{id}` — mahalle ayrıntısı ve sınırı
- `GET /api/charging-stations` — mevcut şarj istasyonları
- `GET /api/charging-stations/{id}` — istasyon ve soket ayrıntıları

Aday nokta verileri bu komutun kapsamı dışındadır; bu alan gerçek veri dönüşümü tamamlanana kadar mock/eksik kabul edilmelidir.
