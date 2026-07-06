# API Sözleşmesi

Bu doküman, GeoVolt projesinde frontend ve backend ekiplerinin ortak kullanacağı API sözleşmesini açıklar.

Frontend ve backend ayrı uygulamalar olarak geliştirileceği için endpoint isimleri, HTTP metotları ve veri formatları baştan belirlenmelidir.

Frontend tarafı bu dosyada belirtilen endpointlere göre ekranlarını hazırlayacaktır. Backend tarafı da bu endpointlere uygun JSON veri döndürecektir.

---

## Temel Mantık

Frontend doğrudan veritabanına bağlanmayacaktır.

Bağlantı akışı şu şekildedir:

```text
React Frontend  --->  .NET Backend API  --->  PostgreSQL/PostGIS
```

Frontend backend API endpointlerine HTTP istekleri atacaktır.

Backend ise PostgreSQL/PostGIS veritabanından gerekli verileri alıp frontend'e JSON formatında cevap döndürecektir.

---

## Geliştirme Ortamı Adresleri

Frontend geliştirme ortamında genellikle şu adreste çalışacaktır:

```text
http://localhost:5173
```

Backend geliştirme ortamında örnek olarak şu adreslerden biri kullanılabilir:

```text
http://localhost:5000
```

veya

```text
https://localhost:7001
```

Frontend tarafında backend adresi `.env` dosyasından okunacaktır.

Örnek:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Endpoint Listesi

| Endpoint | Metot | Açıklama | Kullanacak Taraf |
|---|---|---|---|
| `/api/regions` | GET | Bölge listesini getirir. | Frontend harita ve bölge seçimi |
| `/api/stations` | GET | Mevcut şarj istasyonlarını getirir. | Frontend harita markerları |
| `/api/candidate-points` | GET | Aday şarj istasyonu noktalarını getirir. | Frontend aday nokta ekranı |
| `/api/candidate-points?minScore=70&maxScore=100` | GET | Skora göre filtrelenmiş aday noktaları getirir. | Frontend filtreleme ekranı |
| `/api/manual-pin/evaluate` | POST | Haritada bırakılan pini değerlendirir. | Frontend manuel pin ekranı |
| `/api/saved-candidates` | POST | Aday noktayı kaydeder. | Frontend kaydetme işlemi |
| `/api/saved-candidates` | GET | Kaydedilen aday noktaları getirir. | Frontend kaydedilenler ekranı |

---

# 1. Bölge Listesi API

## Endpoint

```http
GET /api/regions
```

## Açıklama

Çankaya içindeki bölgeleri listeler.

Frontend bu endpointi şu işlemler için kullanır:

- Bölge dropdown listesi
- Harita üzerinde bölge overlayleri
- Bölge seçimi
- Bölgeye göre haritaya odaklanma

## Örnek Response

```json
[
  {
    "id": 1,
    "name": "Kızılay",
    "stationCount": 12,
    "trafficDensity": "Yüksek",
    "commonPowerCapacity": "DC 50kW",
    "commonSocketType": "CCS"
  },
  {
    "id": 2,
    "name": "Bahçelievler",
    "stationCount": 8,
    "trafficDensity": "Orta",
    "commonPowerCapacity": "AC 22kW",
    "commonSocketType": "Type 2"
  }
]
```

---

# 2. Mevcut Şarj İstasyonları API

## Endpoint

```http
GET /api/stations
```

## Açıklama

Mevcut şarj istasyonlarını listeler.

Frontend bu endpointten gelen verileri harita üzerinde marker olarak gösterecektir.

## Örnek Response

```json
[
  {
    "id": 1,
    "companyName": "ZES",
    "latitude": 39.9208,
    "longitude": 32.8541,
    "powerCapacity": "DC 50kW",
    "socketType": "CCS",
    "address": "Çankaya / Kızılay"
  },
  {
    "id": 2,
    "companyName": "Eşarj",
    "latitude": 39.9321,
    "longitude": 32.8234,
    "powerCapacity": "AC 22kW",
    "socketType": "Type 2",
    "address": "Çankaya / Bahçelievler"
  }
]
```

---

# 3. Aday Şarj İstasyonu Noktaları API

## Endpoint

```http
GET /api/candidate-points
```

## Açıklama

Sistemin önerdiği aday şarj istasyonu lokasyonlarını getirir.

Frontend bu verileri hem harita üzerinde marker olarak hem de aday nokta kartları içinde gösterecektir.

## Örnek Response

```json
[
  {
    "id": 1,
    "estimatedAddress": "Çankaya / Kızılay",
    "estimatedCost": 450000,
    "costScore": 80,
    "demandScore": 90,
    "generalScore": 85,
    "latitude": 39.9208,
    "longitude": 32.8541,
    "status": "Uygun"
  },
  {
    "id": 2,
    "estimatedAddress": "Çankaya / Bahçelievler",
    "estimatedCost": 520000,
    "costScore": 72,
    "demandScore": 88,
    "generalScore": 81,
    "latitude": 39.9321,
    "longitude": 32.8234,
    "status": "Uygun"
  }
]
```

---

# 4. Skora Göre Aday Nokta Filtreleme API

## Endpoint

```http
GET /api/candidate-points?minScore=70&maxScore=100
```

## Açıklama

Aday noktaları skor aralığına göre filtreler.

Frontend tarafında kullanıcı min-max değerlerini girecektir. Backend bu değerlere göre aday noktaları döndürecektir.

## Query Parametreleri

| Parametre | Tip | Açıklama |
|---|---|---|
| `minScore` | number | Minimum genel skor değeri |
| `maxScore` | number | Maksimum genel skor değeri |

## Validasyon Kuralları

- `minScore` 0 ile 100 arasında olmalıdır.
- `maxScore` 0 ile 100 arasında olmalıdır.
- `minScore`, `maxScore` değerinden büyük olmamalıdır.
- Boş değer gönderilirse varsayılan aralık 0-100 kabul edilebilir.

## Örnek Request

```http
GET /api/candidate-points?minScore=70&maxScore=100
```

## Örnek Response

```json
[
  {
    "id": 1,
    "estimatedAddress": "Çankaya / Kızılay",
    "estimatedCost": 450000,
    "costScore": 80,
    "demandScore": 90,
    "generalScore": 85,
    "latitude": 39.9208,
    "longitude": 32.8541
  }
]
```

---

# 5. Manuel Pin Değerlendirme API

## Endpoint

```http
POST /api/manual-pin/evaluate
```

## Açıklama

Kullanıcının harita üzerinde bıraktığı pin konumunu değerlendirir.

Backend tarafında pin'in seçili bölge içinde olup olmadığı PostGIS ile kontrol edilecektir.

Bu işlemde örnek olarak şu mantık kullanılabilir:

```text
ST_Contains(region_geometry, selected_point)
```

## Request Body

```json
{
  "latitude": 39.9208,
  "longitude": 32.8541,
  "regionId": 1
}
```

## Örnek Response

```json
{
  "isInsideRegion": true,
  "regionName": "Kızılay",
  "estimatedAddress": "Çankaya / Kızılay",
  "estimatedCost": 450000,
  "costScore": 80,
  "demandScore": 90,
  "generalScore": 85,
  "message": "Seçilen konum aday lokasyon olarak değerlendirilebilir."
}
```

## Bölge Dışı Örnek Response

```json
{
  "isInsideRegion": false,
  "regionName": null,
  "estimatedAddress": null,
  "estimatedCost": null,
  "costScore": null,
  "demandScore": null,
  "generalScore": null,
  "message": "Seçilen konum belirlenen bölge sınırları dışındadır."
}
```

---

# 6. Aday Noktayı Kaydetme API

## Endpoint

```http
POST /api/saved-candidates
```

## Açıklama

Kullanıcının seçtiği aday noktayı kaydeder.

Login/register yapılmayacaksa ilk aşamada bu işlem frontend local storage ile yapılabilir.

Login/register yapılırsa bu endpoint backend tarafında PostgreSQL'e kayıt atacaktır.

## Request Body

```json
{
  "candidatePointId": 1,
  "userId": 5
}
```

## Örnek Response

```json
{
  "success": true,
  "message": "Aday nokta başarıyla kaydedildi."
}
```

## Not

Kaydedilen aday noktalar için en fazla 10 kayıt kuralı uygulanacaktır.

---

# 7. Kaydedilen Aday Noktaları Getirme API

## Endpoint

```http
GET /api/saved-candidates
```

## Açıklama

Kullanıcının kaydettiği aday noktaları getirir.

Login/register yapılmayacaksa bu ekran frontend local storage üzerinden çalışabilir.

Login/register yapılırsa backend kullanıcıya bağlı kayıtları PostgreSQL'den getirecektir.

## Örnek Response

```json
[
  {
    "id": 1,
    "candidatePointId": 1,
    "estimatedAddress": "Çankaya / Kızılay",
    "estimatedCost": 450000,
    "costScore": 80,
    "demandScore": 90,
    "generalScore": 85,
    "latitude": 39.9208,
    "longitude": 32.8541,
    "savedAt": "2026-07-06T15:30:00"
  }
]
```

---

# Ortak Response Formatı

Backend tarafında mümkünse response formatı tutarlı tutulmalıdır.

Başarılı response örneği:

```json
{
  "success": true,
  "data": [],
  "message": "İşlem başarılı."
}
```

Hatalı response örneği:

```json
{
  "success": false,
  "data": null,
  "message": "Bir hata oluştu."
}
```

---

# Hata Durumları

Frontend tarafının yönetmesi gereken hata durumları:

| Durum | Açıklama |
|---|---|
| 400 Bad Request | Eksik veya hatalı istek |
| 401 Unauthorized | Kullanıcı girişi gerekiyorsa yetkisiz erişim |
| 404 Not Found | Veri bulunamadı |
| 500 Internal Server Error | Sunucu hatası |
| CORS Error | Frontend backend'e erişemedi |
| Network Error | Backend çalışmıyor veya bağlantı yok |

---

# Frontend Notları

Frontend ekibi:

- API adresini `.env` dosyasından okuyacaktır.
- Endpointleri doğrudan component içine dağınık yazmayacaktır.
- API istekleri mümkünse `services/` klasörü altında toplanacaktır.
- Backend hazır değilse mock data ile ekranları geliştirebilir.
- Endpoint değişirse bu dosya kontrol edilmelidir.

---

# Backend Notları

Backend ekibi:

- Bu dosyada belirtilen endpointlere uygun API geliştirecektir.
- Response formatlarını mümkün olduğunca sabit tutacaktır.
- CORS ayarını frontend adresine göre yapacaktır.
- Veritabanı bağlantı bilgilerini koda sabit yazmayacaktır.
- PostGIS sorgularında metre bazlı mesafe hesaplamasına dikkat edecektir.
- Endpoint değişirse bu dosyayı güncelleyecektir.

---

# Özet

Bu dosya frontend ve backend ekiplerinin ortak anlaşma dosyasıdır.

Amaç, ekip üyeleri farklı bilgisayarlarda ve farklı branchlerde çalışırken bağlantı sorunlarını azaltmaktır.

Frontend bu sözleşmeye göre istek atacaktır. Backend bu sözleşmeye göre JSON veri döndürecektir.