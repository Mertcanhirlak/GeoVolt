# Site Suitability Decision Contract

Bu belge, haritada seçilen bir konum için "veri yok" ile "uygun değil"
sonuçlarının birbirine karıştırılmaması amacıyla ilk karar sözleşmesini tanımlar.
Eşik değerleri saha, enerji ve mevzuat uzmanlarıyla doğrulanmadan kesin kural
olarak kabul edilmemelidir.

## Karar Durumları

| Durum | Anlamı |
| --- | --- |
| `OUTSIDE_STUDY_AREA` | Nokta desteklenen çalışma alanı dışındadır. |
| `INSUFFICIENT_DATA` | Zorunlu bir veri katmanı yok, eksik, eski veya kapsaması belirsizdir. |
| `HARD_EXCLUSION` | Doğrulanmış kesin bir engelleyici kural başarısızdır. |
| `LOW_SUITABILITY` | Kesin engel yoktur ancak göreli uygunluk puanı eşik altındadır. |
| `CANDIDATE` | Nokta ön fizibilite açısından adaydır; nihai kurulum onayı değildir. |

## Veri Kapsamı Durumları

`DatasetCoverage.CoverageStatus` aşağıdaki değerlerden birini taşır:

- `Unknown`: Coğrafi kapsama beyan veya doğrulamayla bilinmiyor.
- `Declared`: Kapsama veri sahibi veya import operatörü tarafından beyan edildi.
- `Verified`: Kapsama geometrisi proje tarafından doğrulandı.

`DatasetCoverage.CompletenessStatus` aşağıdaki değerlerden birini taşır:

- `Unknown`: Kayıtların beklenen evreni ne kadar temsil ettiği bilinmiyor.
- `Partial`: Veri setinin eksik olduğu biliniyor.
- `Complete`: Tanımlanan kapsama için veri setinin tam olduğu doğrulandı.

Bir feature'ın yakın çevrede bulunmaması yalnızca kapsama `Verified` ve bütünlük
`Complete` olduğunda gerçek bir "yakında kayıt yok" sonucu üretir. Diğer
durumlarda sonuç `INSUFFICIENT_DATA` olarak değerlendirilir.

## İlk Kriter Kataloğu

| Kriter | Mevcut kaynak | Tür | Veri yok davranışı |
| --- | --- | --- | --- |
| Çalışma alanı sınırı | `gis.districts` | Kesin kapsam | `OUTSIDE_STUDY_AREA` |
| Semt ve mahalle eşleşmesi | `gis.regions`, `gis.neighborhoods` | Açıklayıcı | Zorunluysa `INSUFFICIENT_DATA` |
| Trafoya kuş uçuşu mesafe | `gis.power_transformers` | Yumuşak/enerji | `INSUFFICIENT_DATA` |
| Trafo kapasite uygunluğu | Henüz yok | Gelecekte kesin engel | `INSUFFICIENT_DATA` |
| Ana yola mesafe ve yol türü | `gis.roads` | Yumuşak/erişim | `INSUFFICIENT_DATA` |
| Parsele gerçek araç girişi | Henüz yok | Gelecekte kesin engel | `INSUFFICIENT_DATA` |
| POI yoğunluğu | `gis.pois` | Yumuşak/talep | `INSUFFICIENT_DATA` |
| Mahalle nüfusu | `gis.neighborhoods` | Yumuşak/talep | Güven puanını düşür |
| İstasyon ve soket yoğunluğu | `gis.charging_stations`, `gis.charging_connectors` | Yumuşak/rekabet ve hizmet açığı | `INSUFFICIENT_DATA` |
| Eğim yüzdesi | `gis.slope_raster_tiles` | Yumuşak/topografya | `INSUFFICIENT_DATA` |
| Parsel, imar ve mülkiyet | Henüz yok | Gelecekte kesin engel | `INSUFFICIENT_DATA` |

## Puan ve Güven Ayrımı

- `SuitabilityScore`, yalnızca doğrulanmış metriklerden hesaplanan göreli
  uygunluk puanıdır.
- `ConfidenceScore`, kullanılan katmanların kapsama, bütünlük, güncellik ve
  kalite bilgisinden hesaplanır.
- Eksik veri, alanın uygunluk puanını otomatik olarak sıfırlamaz. Bunun yerine
  karar `INSUFFICIENT_DATA` olur veya güven puanı düşürülür.
- Kesin engeller ağırlıklı puanın içine saklanmaz; ayrı gerekçe kodlarıyla
  raporlanır.

## Sonraki Bölüm İçin Çıkış Kriteri

Uygunluk hücresi üretimine geçmeden önce analizde kullanılacak her veri setinin
kapsama ve bütünlük durumu açıkça atanmış olmalıdır. `Unknown` durumundaki bir
katman kesin uygunluk veya uygunsuzluk kararı üretemez.

## Analiz Kalıcılık Modeli

`analysis.analysis_runs`, her çalışmanın tekrarlanabilirlik bilgilerini saklar:

- Çalışma alanı ilçesi ve opsiyonel puan profili
- Algoritma sürümü
- Varsayılan 200 metre grid kenar uzunluğu
- Metre tabanlı işlemler için EPSG:32636, API/depolama için EPSG:4326
- Kullanılan veri importlarının JSON anlık görüntüsü
- Çalıştırma parametreleri, zamanları ve hücre sayıları

`analysis.suitability_cells`, her çalışmaya ait bağımsız analiz hücrelerini
saklar. Hücre geometrisi EPSG:4326 `MultiPolygon`, temsil noktası EPSG:4326
`Point` olarak tutulur. Metre tabanlı alan ve mesafe hesapları hücre üretilirken
EPSG:32636 üzerinde yapılır.

Bir hücre ilk üretildiğinde varsayılan karar `INSUFFICIENT_DATA` olur. Gerçek
metrikler hesaplanmadan `CANDIDATE` veya `HARD_EXCLUSION` durumuna geçirilemez.
Analiz çalışması silinirse ona bağlı hücreler silinir; semt veya mahalle kaydı
değişirse geçmiş analiz hücresi korunur ve ilgili bağlantı `NULL` yapılır.

## Grid Üretimi

İdari yetkili grid üretim endpointi:

```http
POST /api/admin/suitability-analysis/districts/{districtSourceId}/grid
```

İstek gövdesindeki `gridEdgeMeters` değeri 50-1000 metre arasında olmalıdır ve
varsayılan değer 200 metredir. İşlem şu adımları tek bir PostGIS akışında yapar:

1. İlçe sınırını EPSG:32636 koordinat sistemine dönüştürür.
2. `ST_HexagonGrid` ile hex hücreleri üretir.
3. İlçe sınırındaki hücreleri gerçek sınır geometrisiyle kırpar.
4. Alanı metrekare olarak EPSG:32636 üzerinde hesaplar.
5. Hücreyi depolama için EPSG:4326 `MultiPolygon` biçimine dönüştürür.
6. Semt ve mahalleyi temsil noktasıyla bağlar; sınırdaki istisnai hücrelerde en büyük alan çakışmasını yedek yöntem olarak kullanır.
7. Kullanılan son `Promoted` veri importlarını analiz çalışmasına JSON anlık
   görüntüsü olarak kaydeder.

Grid üretimi tamamlanan çalışma `GridReady`, hücreler ise metrik hesaplanana
kadar `INSUFFICIENT_DATA` durumunda tutulur. Bu aşamada hücrelere uygun veya
uygunsuz kararı verilmez.

## Hücre Metriklerinin Hesaplanması

Grid üretimi tamamlanan bir çalışma için yönetim endpointi:

```http
POST /api/admin/suitability-analysis/{analysisRunId}/metrics
```

İşlem `GridReady`, `MetricsReady` veya `Scored` durumundaki bir çalışma üzerinde
idempotent olarak yeniden çalıştırılabilir. Hesaplamalar hücrenin temsil
noktasından EPSG:32636 üzerinde metre cinsinden yapılır:

- En yakın trafoya kuş uçuşu mesafe
- En yakın aktif ve halka açık (`Public`) şarj istasyonuna kuş uçuşu mesafe
- En yakın ana yola mesafe; ana yol türleri `Ana Arter`, `Bulvar`, `Cadde`,
  `Devlet Yolu`, `Otoyol` ve `Otoyol Bağlantısı`
- 300, 500 ve 1000 metre yarıçaplarındaki POI sayıları
- Bağlı mahallenin nüfusu ve EPSG:32636 alanından hesaplanan nüfus yoğunluğu
- EPSG:32636 yüzde eğim rasterından hücre temsil noktasına en yakın geçerli
  pikselin eğim yüzdesi

Hesaplamada kaynak geometriler geçici metrik tablolara dönüştürülür ve GiST
indeksleriyle en yakın komşu/yarıçap sorguları çalıştırılır. Kullanılan yöntem,
kaynak kayıt kimlikleri ve parametreler hücrenin `metric_details` JSONB
alanında; çalışma seviyesi parametreler `analysis_runs.parameters` alanında
saklanır.

Yüzde eğim rasterı PostGIS `raster` türünde 256x256 döşemeler halinde
`gis.slope_raster_tiles` tablosunda saklanır. Kaynak dosyadaki `NaN` pikseller
NoData olarak işaretlenir; hücre sınırındaki NoData piksellerinde en yakın
geçerli değer kullanılır. Raster dosya adı, SHA-256 özeti, SRID ve örnekleme
yöntemi hücre ve analiz parametrelerine kaydedilir.

Raster farklı bir ortama aktarılırken `raster2pgsql` için SRID 32636, birinci
band, 256x256 döşeme ve `NaN` NoData seçenekleri kullanılmalıdır:

```text
raster2pgsql -s 32636 -b 1 -t 256x256 -N NaN -a -F -q -Y <raster.tif> gis.slope_raster_tiles | psql <connection>
```

Hesaplama tamamlanınca çalışma `MetricsReady` olur. Mevcut veri
kapsamı/bütünlük metadataları `Unknown` olduğu ve puanlama henüz çalışmadığı
için bu aşamada `suitability_score` ve `confidence_score` üretilmez. Hücreler
`INSUFFICIENT_DATA` durumunda ve aşağıdaki gerekçelerle tutulur:

- `DATASET_COVERAGE_UNVERIFIED`
- `SCORING_NOT_CALCULATED`

## Göreli Uygunluk Puanlaması

Metrikleri hazır bir çalışma için yönetim endpointi:

```http
POST /api/admin/suitability-analysis/{analysisRunId}/score
```

İşlem `MetricsReady` veya `Scored` durumundaki çalışmalarda idempotent olarak
yeniden çalıştırılabilir. Altı metrik aynı çalışma içindeki yüzdelik sırasına
çevrilerek 0-100 alt puanları oluşturulur. Düşük trafo, ana yol ve eğim değeri;
yüksek POI, nüfus yoğunluğu ve mevcut istasyona uzaklık değeri daha yüksek alt
puan üretir. İstasyona uzaklık burada mevcut hizmet açığını temsil eder.

Varsayılan `score-v1` profilinin ağırlıkları:

| Bileşen | Ağırlık |
| --- | ---: |
| Trafo yakınlığı | %25 |
| Ana yol yakınlığı | %20 |
| 500 metre POI yoğunluğu | %20 |
| Nüfus yoğunluğu | %15 |
| Mevcut istasyon hizmet açığı | %10 |
| Düşük eğim | %10 |

Ağırlıklar ve öneri yüzdeliği `analysis.scoring_profiles` tablosunda sürümlü
olarak saklanır. Alt puanlar, toplam puanın yüzdelik sırası ve öneri işareti
hücrenin `metric_details.scoring` alanına; profil ve ağırlıklar çalışma
parametrelerine yazılır. Maliyet bu formüle dahil edilmez ve `estimated_cost`
alanına puanlama tarafından yazılmaz.

En yüksek puanlı yüzde 10 hücre `provisionalRecommendation=true` olarak
işaretlenir. Veri kapsamı henüz doğrulanmadığı için bu hücreler kesin
`CANDIDATE` yapılmaz; `INSUFFICIENT_DATA` ve
`DATASET_COVERAGE_UNVERIFIED` gerekçesi korunur. Bu nedenle çalışma seviyesindeki
`candidate_cell_count` sıfır kalır. Kapsam `Verified` ve bütünlük `Complete`
olduğunda aynı akış önerilen hücreleri `CANDIDATE`, diğerlerini
`LOW_SUITABILITY` olarak sınıflandırabilir.

Puanlama tamamlanınca çalışma `Scored` olur. Kapsam, bütünlük, güncellik ve
kalite tabanlı güven formülü ayrıca tanımlanana kadar `confidence_score` boş
bırakılır.

## Harita Konumu Değerlendirmesi

Oturum açmış kullanıcının haritada seçtiği koordinat aşağıdaki salt okunur
endpoint ile değerlendirilir:

```http
GET /api/suitability/evaluate?latitude={latitude}&longitude={longitude}&recommendationLimit=3
```

`recommendationLimit` varsayılan olarak 3, en fazla 10 olabilir. Endpoint:

1. Koordinatın desteklenen ilçe sınırında olup olmadığını belirler.
2. İlçeye ait en yeni `Scored` analiz çalışmasını seçer.
3. Noktayı kapsayan analiz hücresini ve hücrenin puan/metrik ayrıntılarını
   döndürür.
4. Seçili hücre dışında kalan en yakın geçici öneri poligonlarını EPSG:32636
   üzerinde metre cinsinden gerçek poligon mesafesine göre sıralar.
5. Poligon geometrilerini doğrudan GeoJSON `MultiPolygon` nesnesi olarak
   döndürür.

Seçili hücre zaten öneriyse kendisi alternatif listesinde tekrarlanmaz. Nokta
çalışma alanı dışındaysa `OUTSIDE_STUDY_AREA`, boş seçili hücre ve boş öneri
listesi döner. Puanlanmış çalışma bulunamazsa sonuç `INSUFFICIENT_DATA` olur.
Veri kapsamı doğrulanana kadar öneriler `isProvisionalRecommendation=true`
olarak açıkça işaretlenir; API bunları kesin kurulum onayı gibi sunmaz.

## İlk Aşama Gerekçe ve Uyarı Kuralları

`metrics-v2` ile her hücrenin hesaplanamayan metriği ayrı bir gerekçe koduyla
saklanır. Trafo, ana yol, istasyon, POI, nüfus yoğunluğu veya eğim
metriklerinden biri eksik olan hücre öneri havuzuna alınmaz.

İlk aşamada iki ihtiyatlı uyarı eşiği vardır:

- Ana yola mesafe 1.000 metreden fazlaysa `MAJOR_ROAD_DISTANCE_WARNING`.
- Eğim yüzde 15 veya üzerindeyse `STEEP_SLOPE_WARNING`.

Bu eşikler kesin mühendislik engeli değildir. `has_hard_exclusion` alanını
değiştirmez; saha doğrulaması gerektiren açıklanabilir uyarılar üretir. İmar,
mülkiyet, gerçek araç girişi ve trafo kapasitesi gibi yetkili katmanlar gelene
kadar bu verilerden kesin kurulum reddi üretilmez.
