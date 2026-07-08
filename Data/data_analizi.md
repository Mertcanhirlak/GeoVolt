# GeoVolt Data Analizi

Bu dosya, `Data/Data` klasorundeki veri setlerini tekrar tekrar incelemek zorunda kalmamak icin hazirlanmistir. Amac; hangi dosyanin ne tuttugunu, GeoVolt icinde nerede kullanilabilecegini ve bu veriler projeye dahil edilirken nelere dikkat edilmesi gerektigini tek yerde toplamaktir.

## Kisa Ozet

Bu veri setleri GeoVolt'u mock veriden gercek CBS tabanli analiz uygulamasina tasimak icin uygundur. Mevcut backend tarafinda `ChargingStation`, `Neighborhood`, `Region` ve `CandidatePoint` gibi domain modelleri bulunuyor, ancak bu modeller su anda buyuk olcude mock/static repository'ler ile besleniyor. Bu klasordeki veriler PostGIS'e aktarildiginda mevcut endpointler gercek veriye baglanabilir.

En mantikli ilk adim, `ARAC_SARJ.geojson` ve `MAHALLE.geojson` verilerini PostGIS'e import edip mevcut sarj istasyonu ve mahalle ekranlarini gercek veriye cevirmektir.

## Veri Envanteri

| Dosya | Icerik | Geometri | Adet | Kullanim |
|---|---:|---:|---:|---|
| `ARAC_SARJ.geojson` | Mevcut arac sarj istasyon/soket verileri | Point | 1.767 | Mevcut sarj haritasi, operator dagilimi, soket/guc analizi |
| `POI.geojson` | Ilgi noktalari | Point | 73.271 | Talep skoru, yogunluk analizi, aday nokta uretimi |
| `YOL.geojson` | Yol agi | LineString | 50.452 | Erisilebilirlik skoru, yol tipi, hiz ortalamasi |
| `TRAFO.geojson` | Elektrik trafo noktalari | Point | 942 | Enerji altyapisina yakinlik, maliyet skoru |
| `MAHALLE.geojson` | Cankaya mahalle sinirlari | Polygon | 124 | Mahalle bazli filtreleme, ozet dashboard |
| `ILCE.geojson` | Cankaya ilce siniri | Polygon | 1 | Calisma alani siniri |
| `Kendi_Sinirim_Derece_UTM36N.tif` | Raster analiz katmani | Raster | 1465x1036 | Uygunluk/skor katmani olabilir |
| `Kendi_Sinirim_Yuzde_UTM36N.tif` | Raster analiz katmani | Raster | 1465x1036 | Yuzdelik uygunluk katmani olabilir |

## Koordinat Sistemi Notu

GeoJSON dosyalari `CRS84` kullanir. Yani koordinatlar derece cinsindedir ve siralama lon/lat seklindedir.

Raster `.tif` dosyalari ise BigTIFF formatinda ve `EPSG:32636` kullanir:

```text
WGS 84 / UTM zone 36N
Pixel scale: 30 x 30 metre
Boyut: 1465 x 1036
```

Bu nedenle GeoJSON verileri ile raster veriler ayni analizde kullanilacaksa projeksiyon donusumu gerekir. En saglikli yontem, import sirasinda tum verileri PostGIS tarafinda ortak SRID mantigina oturtmaktir. Frontend harita icin genellikle `EPSG:4326`/lon-lat cevap donmek daha pratiktir.

## Dosya Bazli Analiz

### ARAC_SARJ.geojson

Mevcut elektrikli arac sarj verilerini tutar. Bu veri `ChargingStation` ve `ChargingConnector` tablolarina ayrilabilir.

Onemli kolonlar:

| Kolon | Anlam |
|---|---|
| `ISTASYON_NO` | Istasyon kimligi gibi kullanilabilir |
| `ISTASYON_ADI` | Istasyon adi |
| `SARJ_AGI_ISLETMECISI` | Sarj agi isletmecisi |
| `MARKAADI` | Marka adi |
| `ADRES` | Acik adres |
| `SOKET_NO` | Soket kimligi gibi kullanilabilir |
| `SOKET_TIPI` | AC/DC bilgisi |
| `SOKET_TURU` | AC_TYPE2, DC_CCS, DC_CHADEMO vb. |
| `SOKET_GUCU_KW` | Sarj gucu |
| `YESIL_SARJ_ISTASYONU_MU` | Yesil sarj bilgisi |

Veri ozeti:

- Toplam nokta/soket: 1.767
- AC soket: 1.126
- DC soket: 641
- Ortalama guc: yaklasik 60.92 kW
- Minimum guc: 3 kW
- Maksimum guc: 400 kW
- Yesil sarj bilgisi dolu olan kayit: 483

En cok gorulen markalar:

- Neva Sarj: 179
- Epsis: 160
- Esarj: 124
- Voltrun: 99
- Zes: 93
- Ecobox: 83
- Astor: 77
- WAT Mobilite: 64
- Trugo: 62

Kullanim onerisi:

- `ChargingStation` tablosu istasyon bazli tekil kayitlari tutmali.
- `ChargingConnector` tablosu soketleri tutmali.
- Ayni istasyonda birden fazla soket olabilecegi icin import sirasinda `ISTASYON_NO` ile gruplanmali.
- Frontend mevcut sarj noktasi marker'lari bu veriden beslenebilir.
- Admin dashboard'a operator, marka, AC/DC ve guc dagilimi kartlari eklenebilir.

### POI.geojson

Ilgi noktalari veri setidir. Aday sarj noktasi uretimi icin en guclu talep verisi budur.

Onemli kolonlar:

| Kolon | Anlam |
|---|---|
| `NAME` | POI adi |
| `CATEGORY` | Ana kategori |
| `SUB_CATEGORY` | Alt kategori |
| `PHONE`, `FAX`, `EMAIL`, `WEB` | Iletisim bilgileri |
| `ID` | Kaynak veri kimligi |

Veri ozeti:

- Toplam POI: 73.271
- Telefon bilgisi olan: 20.443
- Web bilgisi olan: 10.453
- E-posta bilgisi olan: 2.072

En yogun kategoriler:

- Konut Alanlari: 22.440
- Ticaret Alanlari: 13.662
- Alisveris: 9.069
- Yeme-Icme Yerleri: 5.348
- Karayolu: 4.053
- Saglik Kurumlari: 3.453
- Egitim Kurumlari: 2.698
- Finansal Kurumlar: 2.524

Kullanim onerisi:

- Aday nokta demand score hesaplamasinda kullanilmali.
- Ornegin aday noktanin 300/500/1000 metre cevresindeki POI sayisi ve POI turu hesaplanabilir.
- AVM, kafe, restoran, banka, okul, hastane, konut ve otobus duragi gibi kategoriler agirliklandirilabilir.
- POI yogunlugu mahalle bazli dashboard'a eklenebilir.

### YOL.geojson

Yol agi veri setidir. Aday noktanin erisilebilirligini olcmek icin kullanilir.

Onemli kolonlar:

| Kolon | Anlam |
|---|---|
| `ID` | Yol segment kimligi |
| `NAME` | Yol adi |
| `TYPES` | Yol tipi |
| `SPEED` | Hiz bilgisi |
| `SPEED_AVG` | Ortalama hiz |

Veri ozeti:

- Toplam yol segmenti: 50.452
- Ortalama `SPEED_AVG`: yaklasik 21.45
- Minimum `SPEED_AVG`: 4
- Maksimum `SPEED_AVG`: 110

En cok gorulen yol tipleri:

- Ic Yol: 17.149
- Cadde: 14.806
- Sokak: 13.743
- Bulvar: 2.153
- Ana Arter: 1.164

Kullanim onerisi:

- Aday noktanin ana yol, cadde veya bulvara yakinligi erisim skorunu artirabilir.
- Cok dar/ic yollara yakinlik her senaryoda avantajli olmayabilir.
- Yol segmentleri frontend'e ham olarak verilmemeli; ihtiyaca gore sade GeoJSON veya tile mantigi dusunulmeli.

### TRAFO.geojson

Elektrik trafo noktalarini tutar. Enerji altyapisina yakinlik ve kurulum maliyeti icin cok degerlidir.

Veri ozeti:

- Toplam trafo: 942
- Sehirici trafo: 922
- Trafo dagitim merkezi: 4

Kullanim onerisi:

- Aday noktanin en yakin trafosuna olan mesafesi hesaplanmali.
- Trafoya yakin aday noktalarda tahmini maliyet daha dusuk, cost score daha yuksek olabilir.
- Admin dashboard'da "trafo kapsama yogunlugu" veya "enerji altyapisina yakin adaylar" gibi metrikler uretilir.

### MAHALLE.geojson

Cankaya mahalle sinirlarini ve nufus bilgisini tutar.

Onemli kolonlar:

| Kolon | Anlam |
|---|---|
| `ID` | Mahalle kimligi |
| `NAME` | Mahalle adi |
| `POPULATION` | Nufus |

Veri ozeti:

- Toplam mahalle: 124

Nufusu en yuksek mahallelerden bazilari:

- Alacaatli: 46.632
- Universiteler: 34.242
- Birlik: 30.598
- Yasamkent: 22.677
- Emek: 22.420
- Beytepe: 20.608
- Mutlukent: 20.458
- Kirkkonaklar: 19.146

Kullanim onerisi:

- Mahalle bazli sarj istasyonu sayisi hesaplanabilir.
- `nufus / soket sayisi` gibi ihtiyac metrikleri cikartilabilir.
- Aday nokta skoru mahalle nufusuyla agirliklandirilabilir.
- Frontend filtrelerinde mahalle secimi gercek veriye baglanabilir.

### ILCE.geojson

Cankaya ilce sinirini tutar.

Veri ozeti:

- Ilce: Cankaya
- Population: 952.198

Kullanim onerisi:

- Haritada ana calisma alani siniri olarak kullanilabilir.
- Import sirasinda aday noktalarin Cankaya siniri icinde kalip kalmadigi kontrol edilebilir.

### Raster TIF Dosyalari

Dosyalar:

- `Kendi_Sinirim_Derece_UTM36N.tif`
- `Kendi_Sinirim_Yuzde_UTM36N.tif`

Teknik ozellikler:

- BigTIFF formatinda
- Projeksiyon: `EPSG:32636`
- Pixel scale: 30 metre
- Boyut: 1465 x 1036
- Compression: LZW

Kullanim onerisi:

- Bu dosyalar muhtemelen hazir uygunluk/skor/limit katmanlari olarak dusunulmeli.
- Dogrudan frontend'e verilmemeli.
- GDAL veya PostGIS raster destegi ile okunup aday noktalara skor olarak islenmeli.
- Alternatif olarak rasterdan belirli grid/candidate point skor tablosu uretilip veritabanina yazilabilir.

## Mevcut Kodda Baglanacak Yerler

Backend tarafinda su alanlar onemli:

- `backend/src/GeoVolt.Domain/Entities/ChargingStation.cs`
- `backend/src/GeoVolt.Domain/Entities/ChargingConnector.cs`
- `backend/src/GeoVolt.Domain/Entities/Neighborhood.cs`
- `backend/src/GeoVolt.Domain/Entities/Region.cs`
- `backend/src/GeoVolt.Domain/Entities/CandidatePoint.cs`
- `backend/src/GeoVolt.Infrastructure/Persistence/GeoVoltDbContext.cs`
- `backend/src/GeoVolt.Infrastructure/DependencyInjection.cs`

Su an dikkat edilmesi gerekenler:

- `GeoVoltDbContext` icinde geo entity'ler henuz `DbSet` olarak yok.
- `DependencyInjection.cs` icinde `UseNpgsql(connectionString)` var, fakat spatial veri icin `UseNetTopologySuite()` eklenmeli.
- `ICandidatePointRepository` su an `MockCandidatePointRepository` ile bagli.
- `ChargingStationRepository`, `RegionRepository`, `NeighborhoodRepository` su an mock/static veriler donuyor.

## Teknik Uygulama Plani

### 1. Veri klasoru standardi

Ham veriler icin tek bir klasor standardi belirlenmeli:

```text
Data/raw/
```

veya

```text
data/raw/
```

Windows'ta `Data` ve `data` isimleri kafa karistirabilir. Repo icinde tek isim tercih edilmeli.

Gereksiz Mac dosyalari temizlenmeli:

- `.DS_Store`
- `__MACOSX/`
- `._...` dosyalari

### 2. PostGIS ve NetTopologySuite ayari

Backend tarafinda spatial destek acilmali:

```csharp
options.UseNpgsql(
    connectionString,
    npgsqlOptions => npgsqlOptions.UseNetTopologySuite());
```

Gerekirse su paket eklenmeli:

```text
Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite
```

### 3. Veritabani tablolari

Ilk asamada onerilen tablolar:

- `charging_stations`
- `charging_connectors`
- `neighborhoods`
- `districts`
- `pois`
- `transformers`
- `roads`
- `candidate_points`

Ilk MVP icin sadece sunlar yeterli olabilir:

- `charging_stations`
- `charging_connectors`
- `neighborhoods`
- `transformers`
- `pois`
- `candidate_points`

### 4. Import/Seed mekanizmasi

GeoJSON dosyalari runtime'da surekli okunmamali. Bunun yerine bir import mekanizmasi hazirlanmali.

Ornek hedef:

```text
dotnet run -- seed-geo-data
```

Bu islem:

1. GeoJSON dosyasini okur.
2. Kolonlari entity alanlarina map eder.
3. Geometriyi `NetTopologySuite` geometry nesnesine cevirir.
4. PostGIS tablolarina yazar.
5. Tekrarlanan kayitlari kaynak `ID` veya istasyon/soket no ile engeller.

### 5. API'leri mock veriden gercek veriye gecirme

Mevcut endpointler korunabilir:

- `/api/charging-stations`
- `/api/regions`
- `/api/neighborhoods`
- `/api/candidate-points`
- `/api/regions/{id}/summary`

Sadece repository implementasyonlari mock yerine EF/PostGIS sorgularina cevrilmeli.

### 6. Aday nokta skorlama

Basit ilk skor modeli:

```text
generalScore = demandScore + energyScore + accessScore - competitionPenalty
```

Skor kaynaklari:

- `demandScore`: POI yogunlugu + mahalle nufusu
- `energyScore`: en yakin trafo mesafesi
- `accessScore`: ana yol/cadde/bulvar yakinligi
- `competitionPenalty`: mevcut sarj istasyonuna cok yakin olma

Bu model daha sonra agirliklarla gelistirilebilir:

```text
generalScore = 0.35 * demandScore
             + 0.25 * energyScore
             + 0.25 * accessScore
             - 0.15 * competitionPenalty
```

### 7. Frontend kullanimi

Frontend'e ham 73 bin POI veya 50 bin yol segmenti dogrudan verilmemeli. Bu performansi bozar.

Daha dogru yaklasim:

- Harita icin sadece gereken katmanlari ve bbox icindeki veriyi getirmek.
- Dashboard icin backend'de ozet veri uretmek.
- Aday nokta ekrani icin onceden hesaplanmis candidate point listesi donmek.
- Buyuk katmanlar icin ileride tile/vector tile mantigi dusunmek.

## Admin Panelde Kullanilabilecek Fikirler

Admin paneli icin bu verilerle guclu bir "CBS Veri Sagligi" alani yapilabilir.

Onerilen kartlar:

- Toplam sarj istasyonu/soket sayisi
- AC/DC dagilimi
- Ortalama sarj gucu
- En yaygin operatorler
- Toplam POI sayisi
- Toplam trafo sayisi
- Mahalle sayisi
- Nufus basina sarj soketi en dusuk mahalleler
- Trafoya yakin ama sarj altyapisi zayif mahalleler

Onerilen tablo/grafikler:

- Operator bazli sarj istasyonu dagilimi
- Mahalle bazli soket yogunlugu
- Soket tipi dagilimi
- POI kategorisi dagilimi
- Aday nokta skor siralamasi

## Onceliklendirilmis Yol Haritasi

### Asama 1 - En hizli gorunur sonuc

`ARAC_SARJ.geojson` ve `MAHALLE.geojson` import edilir.

Sonuc:

- Gercek sarj istasyonlari haritada gorunur.
- Mahalle filtreleri gercek veriye baglanir.
- Admin panelde gercek AC/DC ve operator metrikleri gosterilir.

### Asama 2 - Analiz gucunu artirma

`TRAFO.geojson` ve `POI.geojson` import edilir.

Sonuc:

- Talep skoru hesaplanabilir.
- Enerji altyapi skoru hesaplanabilir.
- Aday nokta uretimi daha anlamli hale gelir.

### Asama 3 - Erisilebilirlik ve raster skor

`YOL.geojson` ve raster `.tif` dosyalari analiz katmanina dahil edilir.

Sonuc:

- Yol erisilebilirlik skoru eklenir.
- Raster uygunluk skoru aday noktalara islenir.
- Daha profesyonel karar destek modeli olusur.

## Dikkat Edilecek Riskler

- `Data` ve `data` klasor isimleri karisik kullanilmamali.
- Buyuk GeoJSON dosyalari frontend bundle icine alinmamali.
- Raster dosyalari GeoJSON ile ayni projeksiyonda degil; donusum gerektirir.
- `ARAC_SARJ.geojson` istasyon ve soket verisini ayni dosyada tutuyor; import sirasinda istasyon/soket ayrimi yapilmali.
- `POI.geojson` cok buyuk; sorgular spatial index olmadan yavaslar.
- PostGIS tablolarinda `GIST` spatial index kullanilmali.
- Ham veri repo'ya eklenecekse dosya boyutu ve gereksiz Mac metadata dosyalari kontrol edilmeli.

## Onerilen Ilk Teknik Gorev

Ilk implementasyon icin en mantikli gorev:

```text
ARAC_SARJ.geojson + MAHALLE.geojson verilerini PostGIS'e import et,
mock ChargingStationRepository ve NeighborhoodRepository yerine gercek EF/PostGIS repository kullan.
```

Bu gorev tamamlandiginda sistemde hemen gozle gorulur ilerleme olur:

- Haritada gercek sarj noktalari gorunur.
- Mahalle verisi gercek sinir/nufus bilgisiyle gelir.
- Admin panelde gercek veri metrikleri uretilebilir.
