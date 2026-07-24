# GeoVolt yerel veritabanı kurulum ve veri aktarım rehberi

Bu rehber, GeoVolt'u başka bir bilgisayarda çalıştırmak ve mevcut coğrafi veri
setlerini eksiksiz olarak PostgreSQL/PostGIS'e aktarmak içindir. Uygulama .NET
10, PostgreSQL 18 ve PostGIS kullanır. Frontend veritabanına doğrudan bağlanmaz;
veri aktarımı yetkili kullanıcının API çağrılarıyla yapılır.

> Bu rehberdeki `Data/` dosyaları ham kaynak veridir. Repoya veya commit'e
> eklenmemelidir. Arkadaşa güvenli bir dosya paylaşım kanalıyla ayrıca verin.

## 1. Gereksinimler

- .NET SDK 10
- PostgreSQL 18 ve kurulu/etkin PostGIS eklentisi
- `psql` (kontrol sorguları için isteğe bağlı)
- GeoVolt kaynak kodunun, veri aktarım/promotion özelliğini içeren güncel dalı
- GeoJSON dosyalarını içeren `Data` klasörü

PowerShell ile sürümleri kontrol edin:

```powershell
dotnet --version
psql --version
```

PostgreSQL kurulurken `postgres` kullanıcısının parolasını belirleyin. Daha
sonra bir veritabanı oluşturun (örnekte adı `geovolt_db`):

```sql
CREATE DATABASE geovolt_db;
```

PostGIS uzantısı EF migration tarafından tanımlanır; yine de PostgreSQL
sunucusunda PostGIS paketinin kurulu olması gerekir. Kurulumdan sonra şu sorgu
ile doğrulayın:

```sql
\c geovolt_db
SELECT PostGIS_Version();
```

## 2. Yerel bağlantı ayarı

Parola ve JWT anahtarını repoya yazmayın. `backend/src/GeoVolt.Api` altında
gitignore kapsamındaki `appsettings.Development.json` dosyasını oluşturun:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=BURAYA_GUCLU_YEREL_PAROLA"
  },
  "Jwt": {
    "SecretKey": "yalnizca-yerel-gelistirme-icin-uzun-rastgele-bir-anahtar"
  },
  "DefaultAdmin": {
    "FullName": "System Admin",
    "Email": "admin@geovolt.com",
    "Password": "DegistirilecekGucluParola123!"
  }
}
```

Alternatif olarak sadece bu oturum için bağlantıyı ortam değişkeniyle verin:

```powershell
$env:DATABASE_CONNECTION_STRING = 'Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=...'
$env:JWT_SECRET_KEY = 'yalnizca-yerel-gelistirme-icin-uzun-rastgele-bir-anahtar'
```

`DATABASE_CONNECTION_STRING`, `ConnectionStrings:DefaultConnection` değerinin
önüne geçer.

## 3. Şemayı kurma

API başlarken roller, izinler ve varsayılan yönetici hesabı seed edilir; ancak
migration'lar otomatik uygulanmaz. Önce migration'ları uygulayın:

```powershell
cd backend
dotnet restore
dotnet build GeoVolt.slnx
dotnet ef database update --project src/GeoVolt.Infrastructure --startup-project src/GeoVolt.Api
dotnet run --project src/GeoVolt.Api
```

API varsayılan olarak `http://localhost:5000` adresinde çalışır. Swagger
arayüzü: `http://localhost:5000/swagger`.

İlk API açılışında yukarıdaki `DefaultAdmin` bilgileriyle yönetici kullanıcısı
oluşturulur. Aynı e-posta zaten varsa mevcut kullanıcı korunur; parolayı
değiştirmek için veritabanını silmek yerine yönetim akışını kullanın.

## 4. Veri setleri ve doğru aktarım sırası

Her dosya üç aşamadan geçer:

1. **Validate**: dosya adı, GeoJSON yapısı, geometri ve zorunlu alanlar kontrol edilir.
2. **Stage**: ham feature'lar `staging.geojson_features` tablosuna yazılır ve
   `gis.dataset_imports` içinde bir aktarım kaydı oluşur.
3. **Promote**: staging verisi gerçek `gis` tablolarına dönüştürülür.

Aktarım sırası önemlidir:

| Sıra | Dosya | Hedef | Neden |
| --- | --- | --- | --- |
| 1 | `ILCE.geojson` | `gis.districts` | Semtlerin bağlı olduğu Çankaya ilçe kaydını oluşturur. |
| 2 | `Semttt.geojson` | `gis.regions` | Kalıcı 1-28 semt kimliklerini oluşturur. |
| 3 | `MAHALLE.geojson` | `gis.neighborhoods` | Mahalleleri alan çakışmasına göre semtlere bağlar. |
| 4 | `ARAC_SARJ.geojson` | `gis.charging_stations`, `gis.charging_connectors` | İstasyonun tek bir mahalleyle eşleşmesi gerekir. |
| 5 | `POI.geojson` | `gis.pois` | Bağımsızdır, ancak temel sınırlar önce kurulmuş olmalıdır. |
| 6 | `TRAFO.geojson` | `gis.power_transformers` | Bağımsızdır, ancak temel sınırlar önce kurulmuş olmalıdır. |
| 7 | `YOL.geojson` | `gis.roads` | Bağımsızdır, ancak temel sınırlar önce kurulmuş olmalıdır. |

Mevcut kaynak pakette beklenen feature sayıları: ILCE 1, Semttt 28, MAHALLE
124, ARAC_SARJ 1.767, TRAFO 942, YOL 50.452 ve POI 73.271. Bunlar kaynak
dosyanın sürümüne bağlı kontrol değerleridir.

## 5. API ile aktarım

Swagger'dan yapılabilir: önce `/api/auth/login`, ardından sağ üstteki
**Authorize** düğmesine `Bearer <token>` değerini verin. Yönetici hesabı
`data.import.validate` ve `data.import.execute` izinleriyle gelir.

PowerShell örneği aşağıdadır. `curl.exe` kullanımı PowerShell'in `curl` takma
adından kaynaklanan karışıklığı önler.

```powershell
$login = @{ email = 'admin@geovolt.com'; password = 'DegistirilecekGucluParola123!' } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -ContentType 'application/json' -Body $login
$token = $response.data.token
$headers = @{ Authorization = "Bearer $token" }
```

Her dosya için önce validate, sonra stage yapın. Örnek `ARAC_SARJ.geojson`:

```powershell
curl.exe -X POST http://localhost:5000/api/admin/data-imports/validate -H "Authorization: Bearer $token" -F "file=@C:\veri\ARAC_SARJ.geojson"
curl.exe -X POST http://localhost:5000/api/admin/data-imports/stage -H "Authorization: Bearer $token" -F "file=@C:\veri\ARAC_SARJ.geojson"
```

Stage yanıtındaki `data.datasetImportId` değerini kaydedin ve promotion çağrısı
ile tamamlayın:

```powershell
curl.exe -X POST http://localhost:5000/api/admin/data-imports/42/promote -H "Authorization: Bearer $token"
```

`42` örnek ID'dir; her makinede ve her aktarımda değişir. Aynı SHA-256 değerine
sahip dosyayı tekrar stage etmeye çalışmak `409 Conflict` döndürür. Bu durumda
eski aktarımı tekrar promote edebilir veya gerçekten güncel dosyayı kullanın;
staging kayıtlarını elle silmeyin.

GeoJSON başına istenen temel alanlar:

| Dosya | Geometri | Zorunlu alanlar |
| --- | --- | --- |
| `ARAC_SARJ.geojson` | Point | `ISTASYON_NO`, `ISTASYON_ADI`, `HIZMET_SEKLI`, `SARJ_AGI_ISLETMECISI`, `ADRES`, `SOKET_NO`, `SOKET_TIPI`, `SOKET_TURU`, `SOKET_GUCU_KW` |
| `POI.geojson` | Point | `ID`, `NAME`, `CATEGORY` |
| `TRAFO.geojson` | Point | `ID`, `CATEGORY`, `SUB_CATEGORY` |
| `YOL.geojson` | LineString/MultiLineString | `ID`, `TYPES` |

Dosya yükleme üst limiti 64 MB'tır. Daha büyük bir dosya için dosyayı keyfi
olarak bölmeyin; önce veri formatı/aktarımı geliştiren ekiple konuşun.

## 6. Promotion'ın yaptığı dönüşümler

- Semt isimleri kodda tanımlı sabit kayıtla eşleştirilir; public semt ID'leri
  1-28 olarak kalır ve yeniden numaralandırılmaz.
- Mahalleler semt poligonlarıyla en büyük alan çakışmasına göre eşleştirilir;
  kabul için en az %95 çakışma gerekir. Semt nüfusu bağlı mahallelerin
  nüfuslarından hesaplanır.
- Şarj verisinde aynı `ISTASYON_NO` altındaki soketler tek bir istasyon ve
  çoklu connector olarak yazılır. İstasyon, tam olarak bir mahalle poligonu
  tarafından kapsanmalıdır; bu yüzden mahalleler önce aktarılmalıdır.
- POI, trafo ve yol kayıtları kaynak ID üzerinden upsert edilir. Aynı kaynak
  ID'siyle güncel veri aktarılırsa mevcut kayıt güncellenir.

## 7. Eğim rasterını (GeoTIFF) yükleme

Eğim dosyası GeoJSON değildir; `/api/admin/data-imports` endpointleriyle
yüklenmez. GeoVolt, eğim değerini PostGIS raster tablosu
`gis.slope_raster_tiles` üzerinden okur. Bu bölümdeki işlem yalnızca tüm EF
migration'ları uygulandıktan sonra yapılmalıdır; ilgili migration
`postgis_raster` eklentisini ve hedef tabloyu oluşturur.

Kaynak paketinde iki gösterim bulunur:

- `Kendi_Sinirim_Yuzde_UTM36N.tif`: yüzde eğim. Analiz/skorlama için **bu
  dosyayı** yükleyin.
- `Kendi_Sinirim_Derece_UTM36N.tif`: aynı eğimin derece gösterimidir. Mevcut
  skor eşikleri yüzde birimindedir; bu dosyayı aynı tabloya ayrıca yüklemeyin.

Raster SRID'si EPSG:32636 (UTM 36N), çözünürlüğü 30 metredir. Uygulama analiz
noktalarını örnekleme sırasında bu SRID'ye dönüştürür; rasterı EPSG:4326'ya
yeniden projekte etmeyin.

### 7.1 Gerekli araçları kontrol etme

PostgreSQL/PostGIS kurulumuyla gelen `raster2pgsql.exe` ve `psql.exe`
komutlarının kullanılabildiğini doğrulayın. PATH'te değillerse genellikle şu
klasördedir: `C:\Program Files\PostgreSQL\18\bin`.

```powershell
raster2pgsql.exe -G
psql --version
```

GeoTIFF'in koordinat sistemi ve NoData bilgisini GDAL ile inceleyin. `gdalinfo`
PostGIS/GDAL kurulumunda yoksa QGIS'in terminalinden de çalıştırılabilir.

```powershell
gdalinfo 'C:\veri\Kendi_Sinirim_Yuzde_UTM36N.tif'
```

Çıktıda EPSG:32636 görünmelidir. Çıktı bir `NoData Value` gösteriyorsa aşağıdaki
yükleme komutuna `-N <NoData-değeri>` ekleyin. NoData değeri kesinleşmeden
rastgele bir değer yazmayın.

### 7.2 Rasterı tabloya yazma

Bu işlem mevcut eğim rasterını silip yüzde rasterını yeniden yükler. Yalnızca
`gis.slope_raster_tiles` hedeflenir; GeoJSON tablolarını etkilemez. Önce yerel
parolayı ve dosya yolunu kendi ortamınıza göre ayarlayın:

```powershell
$pgPassword = 'BURAYA_POSTGRES_PAROLASI'
$rasterFile = 'C:\veri\Kendi_Sinirim_Yuzde_UTM36N.tif'
$raster2pgsql = 'C:\Program Files\PostgreSQL\18\bin\raster2pgsql.exe'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$env:PGPASSWORD = $pgPassword
```

Önce hedef tablonun hazır olduğunu doğrulayın:

```powershell
& $psql -h localhost -p 5432 -U postgres -d geovolt_db -v ON_ERROR_STOP=1 -c 'SELECT PostGIS_Raster_Lib_Version();'
& $psql -h localhost -p 5432 -U postgres -d geovolt_db -v ON_ERROR_STOP=1 -c 'SELECT to_regclass(''gis.slope_raster_tiles'');'
```

İkinci komut `gis.slope_raster_tiles` döndürmelidir. Boş/yarım kalmış eski
yüklemeyi temizleyip yüklemeyi başlatın:

```powershell
& $psql -h localhost -p 5432 -U postgres -d geovolt_db -v ON_ERROR_STOP=1 -c 'TRUNCATE TABLE gis.slope_raster_tiles;'
& $raster2pgsql -a -F -s 32636 -t 256x256 -Y $rasterFile gis.slope_raster_tiles |
  & $psql -h localhost -p 5432 -U postgres -d geovolt_db -v ON_ERROR_STOP=1
```

Komuttaki seçenekler: `-a` migration'ın oluşturduğu tabloya ekler, `-F` zorunlu
dosya adı bilgisini yazar, `-s 32636` raster SRID'sini tanımlar, `-t 256x256`
rasterı makul boyutlu tile'lara böler, `-Y` ise hızlı `COPY` aktarımını kullanır.
Mevcut tabloda zaten indeks bulunduğundan bu komutta `-I` veya `-C`
kullanmayın.

Dosyada doğrulanmış bir NoData değeri varsa yukarıdaki `raster2pgsql` satırını
örneğin `-N -9999` ekleyerek çalıştırın. Değer yalnızca örnektir; `gdalinfo`
çıktısındaki gerçek değer kullanılmalıdır.

Son olarak kaynak dosyanın SHA-256 bilgisini tile kayıtlarına yazın. Bu metadata
analiz sonucunda hangi rasterın kullanıldığını izlemek içindir:

```powershell
$sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $rasterFile).Hash.ToLowerInvariant()
& $psql -h localhost -p 5432 -U postgres -d geovolt_db -v ON_ERROR_STOP=1 -c "UPDATE gis.slope_raster_tiles SET filename = 'Kendi_Sinirim_Yuzde_UTM36N.tif', sha256 = '$sha256', source_srid = 32636;"
Remove-Item Env:PGPASSWORD
```

### 7.3 Raster aktarımını doğrulama

```sql
SELECT
    count(*) AS tile_count,
    min(filename) AS filename,
    min(source_srid) AS source_srid,
    min(ST_SRID(rast)) AS raster_srid,
    min(ST_BandNoDataValue(rast, 1)) AS nodata_value,
    round(sum(ST_Width(rast) * ST_Height(rast)) / 1000000.0, 2) AS million_pixels
FROM gis.slope_raster_tiles;

SELECT
    count(*) AS tiles,
    ST_AsText(ST_Envelope(ST_Collect(ST_ConvexHull(rast)))) AS raster_extent_utm36n
FROM gis.slope_raster_tiles;
```

İlk sorguda `source_srid` ve `raster_srid` 32636 olmalı, `tile_count` sıfırdan
büyük olmalıdır. Başarılı yüklemeden sonra yeni veya mevcut bir uygunluk analizi
için metrik hesaplama çalıştırıldığında hücrelerde `slope_percent` değeri
oluşur. Eğim rasterını değiştirdikten sonra daha önce hesaplanmış metrikler
kendiliğinden güncellenmez; metrik ve skor hesaplamasını yeniden çalıştırın.

`TRUNCATE` komutu yanlışlıkla çalıştırıldıysa yalnızca eğim tile'larını siler;
tekrar yüklemek için bu bölümdeki aynı komutu kullanın. Yine de canlı/ortak
veritabanında işlem öncesi yedek alın.

## 8. Aktarım sonrası kontroller

`psql` ile aşağıdaki sorgular, tabloların dolduğunu hızlıca kontrol eder:

```sql
SELECT 'districts' AS table_name, count(*) FROM gis.districts
UNION ALL SELECT 'regions', count(*) FROM gis.regions
UNION ALL SELECT 'neighborhoods', count(*) FROM gis.neighborhoods
UNION ALL SELECT 'charging_stations', count(*) FROM gis.charging_stations
UNION ALL SELECT 'charging_connectors', count(*) FROM gis.charging_connectors
UNION ALL SELECT 'pois', count(*) FROM gis.pois
UNION ALL SELECT 'power_transformers', count(*) FROM gis.power_transformers
UNION ALL SELECT 'roads', count(*) FROM gis.roads;

SELECT "DatasetName", "Status", "FeatureCount", "ErrorMessage", "ImportedAtUtc"
FROM gis.dataset_imports
ORDER BY "Id";
```

Başarılı importlarda `Status` değeri `Promoted` olmalıdır. `Failed` ise
`ErrorMessage` alanını ve API yanıtındaki reddedilen kayıt sayısını inceleyin.
Şarj istasyonlarında hata varsa önce `gis.neighborhoods` içinde 124 mahalle
olduğunu ve istasyon noktasının bir mahalle içinde kaldığını kontrol edin.

## 9. Sık karşılaşılan sorunlar

- **PostGIS bulunamadı:** PostgreSQL'e sadece sunucu değil PostGIS bileşenini
  de kurun. `SELECT PostGIS_Version();` çalışmalıdır.
- **401/403:** Login sonrası alınan token'ı `Bearer ` önekiyle gönderin;
  aktarım için yönetici veya gerekli iki izne sahip kullanıcı gerekir.
- **Promotion semt/mahallede başarısız:** Sıralamayı kontrol edin: ILCE →
  Semttt → MAHALLE. `Semttt.geojson` dosyası 28 semt içermelidir.
- **Şarj promotion başarısız:** Mahalle promotion'ı başarılı olmadan şarj
  verisini dönüştürmeyin. Geçersiz ya da mahalle sınırı dışında kalan kaynak
  noktaları ayrıca incelenmelidir.
- **409 duplicate:** Aynı dosya zaten stage edilmiştir. Veri değişmemişse
  tekrar yükleme gerekmez; daha önceki import ID'sini kullanın.
- **Migration hatası:** API kapalıyken `dotnet build` çalıştırın, bağlantı
  bilgisini doğrulayın, ardından `dotnet ef database update` komutunu tekrar
  çalıştırın.
- **`raster2pgsql` bulunamadı:** PostGIS istemci araçlarını kurun veya
  `C:\Program Files\PostgreSQL\18\bin\raster2pgsql.exe` tam yolunu kullanın.
- **Raster sorgusunda SRID/NoData hatası:** Kaynak GeoTIFF'i `gdalinfo` ile
  kontrol edin; SRID 32636 olmalı ve varsa gerçek NoData değeri `-N` ile
  verilmelidir. Yüzde ve derece rasterlarını aynı hedef tabloya birlikte
  yüklemeyin.

## 10. Güncelleme yaklaşımı

Yeni kaynak veri geldiğinde önce ayrı bir yedek alın. Ardından dosyayı
validate → stage → promote akışıyla içeri aktarın. Kaynak ID'ler kalıcı kabul
edildiğinden promotion işlemi upsert yapar. Her güncellemeden sonra bölüm 8'deki
sayımlar ve `gis.dataset_imports` durumu kontrol edilmelidir.
