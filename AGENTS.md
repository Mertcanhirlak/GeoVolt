# GeoVolt Project Context

Bu dosya, yeni bir Codex sohbetinin projeyi baştan incelemeden mevcut durumu hızlıca anlaması için hazırlanmıştır. Çalışmaya başlamadan önce bu dosyayı ve `git status` çıktısını oku. Kullanıcının mevcut isteği her zaman bu notlardan önceliklidir.

## Proje Özeti

- Çalışma dizini: `C:\Users\ramze\GeoVolt`
- Teknoloji: .NET 10 Clean Architecture backend, React frontend, PostgreSQL 18 + PostGIS.
- Backend katmanları: `GeoVolt.Api`, `GeoVolt.Application`, `GeoVolt.Domain`, `GeoVolt.Infrastructure`.
- Geliştirme API adresi: `http://localhost:5000`.
- Aktif geliştirme dalı: `feature/candidate-points-mock-api`.
- Paylaşım hedefi: `origin/mertcan-branch`.
- `Data/Data`, `Data/data_1`, `Data/Data_ek`, `Data/__MACOSX` ve `Data/semtt_oznitelik_tablosu.xlsx` ham/veri kaynaklarıdır; kullanıcı açıkça istemedikçe commit'e ekleme.

## Tamamlanan Çalışmalar

### Yönetim ve Yetkilendirme

- Rol yönetimi üç popup olacak şekilde düzenlendi.
- Kullanıcıya gösterilen metinler ve hata mesajları Türkçeleştirildi.
- Kullanıcı atanmış rollerin silinememesi beklenen davranıştır ve kullanıcıya bildirim gösterilir.
- İlgili son arayüz commit'i: `1f92c8d Türkçe arayüz metinleri ve rol yönetimi düzenlendi`.

### PostGIS Temeli

- `Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite` bağlandı.
- PostGIS 3.6.2 geliştirme veritabanında etkin.
- `gis`, `analysis` ve `staging` şemaları oluşturuldu.
- `District`, `Region`, `Neighborhood`, `ChargingStation`, `ChargingConnector`, `Poi`, `PowerTransformer`, `Road`, `CandidatePoint`, `DatasetImport` ve `ScoringProfile` modelleri/eşlemeleri hazırlandı.
- Uzamsal kolonlar SRID 4326 ve uygun GiST indeksleriyle oluşturuldu.
- Migration: `20260711091026_AddPostGisFoundation`.
- Commit ve push: `67de88a PostGIS tabanini ve GIS veri modelini ekle` -> `mertcan-branch`.
- Mock repository'ler veri dönüşümü tamamlanana kadar bilinçli olarak korunuyor.

### GeoJSON Doğrulama

- Endpoint: `POST /api/admin/data-imports/validate`.
- Yetki: `data.import.validate`.
- Desteklenen dosyalar: `ILCE`, `MAHALLE`, `TRAFO`, `ARAC_SARJ`, `YOL`, `POI` GeoJSON dosyaları.
- Dosya adı, boyut, FeatureCollection yapısı, geometri tipi, zorunlu kolonlar, kayıt sayısı, CRS uyarısı ve SHA-256 kontrol ediliyor.
- Altı gerçek dosya doğrulamadan geçti.
- Commit ve push: `abc6281 Add GeoJSON dataset validation endpoint` -> `mertcan-branch`.

### GeoJSON Staging

- Bu bölüm çalışma ağacında tamamlandı fakat henüz commit/push edilmedi.
- Endpoint: `POST /api/admin/data-imports/stage`.
- Yetki: `data.import.execute`.
- Yeni tablo: `staging.geojson_features`.
- Migration: `20260713063802_AddGeoJsonStaging`; geliştirme veritabanına uygulandı.
- Her ham feature için kaynak ID, sıra, geometri türü, `properties` JSONB ve `geometry` JSONB saklanıyor.
- Aktarım üst bilgisi `gis.dataset_imports` tablosunda tutuluyor.
- Aynı SHA-256 dosyası tekrar gönderilirse `409 Conflict` dönüyor.
- Başarısız aktarım tekrar denenebilir.
- PostgreSQL binary `COPY` kullanılıyor. EF tekil INSERT denemesi büyük dosyalarda yavaş olduğu için bırakıldı.
- Test performansı: 50.452 YOL yaklaşık 4,66 saniye; 73.271 POI yaklaşık 4,25 saniye.
- Geliştirme veritabanında staging sayıları:
  - ILCE: 1
  - MAHALLE: 124
  - TRAFO: 942
  - ARAC_SARJ: 1.767
  - YOL: 50.452
  - POI: 73.271
- Son temiz backend build: 0 hata, 0 uyarı.

### Staging'den Gerçek GIS Tablosuna Dönüşüm

- Bu bölüm çalışma ağacında tamamlandı fakat henüz commit/push edilmedi.
- Endpoint: `POST /api/admin/data-imports/{datasetImportId}/promote`.
- Desteklenen veri setleri: `district` (`ILCE.geojson`), `regions` (`Semttt.geojson`) ve `neighborhoods` (`MAHALLE.geojson`).
- Ham Polygon geometri `ST_GeomFromGeoJSON`, SRID 4326, `ST_MakeValid`, polygon extraction ve `ST_Multi` zinciriyle `gis.districts.boundary` alanına dönüştürülüyor.
- Upsert kaynak ID üzerinden idempotent çalışıyor.
- ILCE import ID 1 başarıyla `Promoted` oldu.
- Doğrulanan sonuç: Çankaya, source ID 1231, population 952198, MultiPolygon, SRID 4326, geçerli geometri, yaklaşık 452,73 km2.
- GeoJSON sayısal alanları `1231.0` biçiminde geldiği için SQL dönüşümü `numeric -> integer` olarak yapılmalı.
- Semt import ID 13 başarıyla `Promoted` oldu; 28 semtin tamamı aktarıldı.
- Semtlere kod içinde sabit ve yeniden numaralandırılmayacak 1-28 kaynak ID'leri verildi.
- Mahalle import ID 2 başarıyla `Promoted` oldu; 124 mahallenin tamamı en az yüzde 95 alan çakışmasıyla tek bir semte bağlandı.
- Mahalle sınırları ve semt sınırları `MultiPolygon`, SRID 4326 olarak saklanıyor.
- Semt nüfusları bağlı mahalle nüfuslarından hesaplandı; toplam 952198.
- API ve Excel karşılaştırmasında 124 mahallenin ID, ad, nüfus ve semt alanlarında 0 uyumsuzluk; 28 semt nüfusunda 0 uyumsuzluk bulundu.

### Gerçek Semt ve Mahalle API'leri

- `RegionRepository` ve `NeighborhoodRepository` artık bellek içi mock yerine `GeoVoltDbContext`/PostGIS kullanıyor.
- Public semt ID'leri `Region.SourceId` üzerinden 1-28 olarak sabit tutuluyor.
- Public mahalle ID'leri Başarsoft kaynak ID'leri üzerinden sabit tutuluyor.
- `GET /api/regions`, `GET /api/regions/{id}`, `GET /api/regions/{id}/neighborhoods`, `GET /api/neighborhoods` ve `GET /api/neighborhoods/{id}` gerçek veri döndürüyor.
- Region cevaplarına nüfus; mahalle cevaplarına semt ID'si, semt adı ve nüfus eklendi.
- Frontend `regionsApi.js` artık JWT gönderiyor, backend ID'lerini yeniden numaralandırmıyor ve gerçek nüfus/eşleşme alanlarını koruyor.
- Backend build: 0 hata, 0 uyarı. Frontend build başarılı. Lint: 0 hata, bu değişikliklerden bağımsız mevcut 13 uyarı.

## Veri Setleri

- Ayrıntılı analiz: `Data/data_analizi.md`.
- GeoJSON dosyaları CRS84/lon-lat; veritabanı hedefi SRID 4326.
- Raster dosyaları:
  - `Kendi_Sinirim_Derece_UTM36N.tif`
  - `Kendi_Sinirim_Yuzde_UTM36N.tif`
- Rasterlar EPSG:32636, 30 metre çözünürlük, 1465x1036, BigTIFF/LZW olarak analiz edildi.
- Datacı teyidi: kaynak NASA/USGS SRTM V3 1 arc-second DEM, ölçüm tarihi Şubat 2000, hücre tipi Float32 sürekli veri.
- Eğim rasterı ön eleme ve maliyet/skor cezası için faydalıdır; nihai mühendislik kararı değildir.
- Derece ve yüzde aynı eğimin iki gösterimidir; tek ana raster yeterlidir. NoData ve lisans/kullanım bilgisi hâlâ netleştirilmelidir.

## Datacı Dönüşü

- Datacı bilgisine göre semtler resmî/idari bir katman değildir; Sahibinden'deki semt ayrımına göre ekip tarafından analitik amaçla oluşturulmuştur.
- Kaynakta semt ID'si yoktur. GeoVolt tarafında 1'den başlayan kalıcı ID'ler atanabilir; ilk atamadan sonra isim sırası değişse bile bu ID'leri yeniden numaralandırma.
- Datacı, 124 mahalle-semt eşleşmesinin `Data/data_1` içinde olduğunu belirtti.
- Dosya bulundu: `Data/data_1/Data/Semttt.geojson`.
- Dosyada 28 feature ve 28 benzersiz `Semt` değeri var. Kullanıcı 28 semtle devam edilmesini onayladı; artık 27 bekleme.
- `Data/data_1/Data/MAHALLE.geojson` 124 feature içeriyor fakat yalnızca `ID`, `NAME`, `POPULATION` alanları var; `Semt`/`SEMT_ID` kolonu yok ve eski MAHALLE dosyasıyla SHA-256 değeri aynıdır.
- `Semttt.geojson` 28 dissolve edilmiş semt geometrisi içeriyor. `ID`, `NAME` ve `POPULATION` alanları semte değil, dissolve sırasında seçilmiş tek bir mahalleye ait görünüyor; bunları semt kimliği/nüfusu olarak doğrudan kullanma.
- Datacının gönderdiği öznitelik tablosu ekran görüntüsü de yalnızca 28 satır gösteriyor: örneğin `NAME=Yücetepe, Semt=Anıttepe`. Bu, her semt için dissolve sırasında tek bir mahalle kaydının alanlarının korunduğunu doğruluyor; 124 mahallenin üyelik listesini göstermiyor.
- Datacıya dissolve öncesindeki 124 feature'lık katman istenmeli. Tercih edilen teslim: her mahallede `ID`, `NAME`, `POPULATION`, `Semt` alanları bulunan GeoJSON veya aynı alanlarla 124 satırlık CSV/Excel.
- `Data/semtt_oznitelik_tablosu.xlsx` teslim edildi: 124 benzersiz mahalle, 28 semt, boş/tekrar kayıt yok; ID/ad/nüfus değerleri `MAHALLE.geojson`, semt adları `Semttt.geojson` ile birebir eşleşiyor.
- `data_1` içindeki ARAC_SARJ, ILCE, MAHALLE, POI, TRAFO, YOL ve iki TIF dosyasının SHA-256 değerleri önceki `Data/Data` paketindekilerle birebir aynıdır; paketteki tek yeni gerçek veri dosyası `Semttt.geojson` dosyasıdır.
- Tüm `Data` ağacında CSV, Excel, GeoPackage, Shapefile DBF veya arşiv biçiminde ayrı bir mahalle-semt eşleme dosyası bulunmamaktadır. `__MACOSX/._*` dosyaları Apple metadata/resource fork dosyalarıdır, veri seti değildir.
- Ayrı 124 satırlık eşleme tablosu mevcut dosyalarda görünmüyor. Mahalle-semt ilişkisini semt ve mahalle geometrilerinin en büyük alan çakışmasına göre üret, her mahallenin tam bir semte bağlandığını ve belirsiz çakışma olmadığını raporla.
- Semt nüfusunu bağlı mahallelerin `POPULATION` toplamından hesapla.
- GeoVolt için kabul edilen semt sayısı 28'dir.
- Nüfus, POI ve şarj verileri Başarsoft kaynaklı.
- Kesin veri tarihi/yılı ve lisans/kullanım şartları mentor görüşmesinden sonra bildirilecek.
- Aday nokta evreni, mesafe ve yoğunluk hesapları backend/GeoVolt ekibinin sorumluluğunda.
- Yol standardizasyonuyla kastedilen:
  - `ID` benzersizliği ve kalıcılığı,
  - `TYPES` kontrollü kategori listesi ve yazım birliği,
  - `SPEED`/`SPEED_AVG` birimi ve boş değer anlamı,
  - `DF`, `ANNAME`, `TR`, `VTR` alan sözlüğü,
  - CRS, geometri türü, tekrar/çakışma ve varsa tek yön bilgisidir.
- Datacılardan yol hesabı istenmiyor; yalnızca veri sözlüğü ve standart alan anlamları bekleniyor.

## Sıradaki Teknik İşler

1. Mevcut district/region/neighborhood promotion ve gerçek repository değişikliklerini kullanıcı isterse İngilizce commit ile `mertcan-branch`e pushla; ham `Data/` kaynaklarını ekleme.
2. TRAFO, POI, YOL ve ARAC_SARJ verilerini gerçek `gis` tablolarına dönüştür.
3. Noktaların Çankaya sınırı içinde olmasını, kaynak ID tekrarlarını ve geometrik hataları raporla.
4. Şarj istasyonu repository'sini gerçek PostGIS verisine geçir; bölge özetindeki istasyon alanları o zamana kadar mock/eksik kabul edilmeli.
5. Aday nokta evreni, yakınlık/yoğunluk metrikleri ve puanlama algoritmasına geç.
6. Raster eğim örneklemesini aday noktalar oluştuktan sonra ekle; ilk aşamada rasterı EF entity gibi ele alma.

## Çalışma Kuralları ve Notlar

- Önce `git status` kontrol et; kullanıcının veya başka bir ajanın değişikliklerini koru.
- API açıkken build sırasında `MSB3026/MSB3027/MSB3021` oluşursa DLL'yi kilitleyen `GeoVolt.Api` sürecini kontrol et.
- API testi için açılan süreci test sonunda kapat.
- Veritabanı migration'larını üretmeden önce build al, üretilen migration'ı incele, sonra `database update` uygula.
- Kullanıcı yapılan işleri adım adım ve sade Türkçe açıklanmış şekilde görmek istiyor.
- Commit mesajı istenirse İngilizce yaz; ham `Data/` klasörlerini dahil etme.
