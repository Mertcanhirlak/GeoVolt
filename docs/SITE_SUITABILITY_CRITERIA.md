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
| Eğim yüzdesi | TIFF mevcut, veritabanında değil | Yumuşak/maliyet | `INSUFFICIENT_DATA` |
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
