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
| `/api/charging-stations` | GET | Mevcut şarj istasyonlarını getirir. | Frontend harita markerları |
| `/api/candidate-points` | GET | Aday şarj istasyonu noktalarını getirir. | Frontend aday nokta ekranı |
| `/api/candidate-points?minScore=70&maxScore=100` | GET | Skora göre filtrelenmiş aday noktaları getirir. | Frontend filtreleme ekranı |
| `/api/manual-pin/evaluate` | POST | Haritada bırakılan pini değerlendirir. | Frontend manuel pin ekranı |
| `/api/saved-candidates` | POST | Aday noktayı kaydeder. | Frontend kaydetme işlemi |
| `/api/saved-candidates` | GET | Kaydedilen aday noktaları getirir. | Frontend kaydedilenler ekranı |
| `/api/auth/login` | POST | Kullanıcı girişi yapar ve JWT token döner. | Frontend login ekranı |
| `/api/auth/me` | GET | Token sahibi kullanıcının bilgilerini getirir. | Frontend oturum kontrolü |
| `/api/admin/companies` | POST | Admin firma oluşturur. | Swagger/Admin işlemleri |
| `/api/admin/companies` | GET | Admin firmaları listeler. | Swagger/Admin işlemleri |
| `/api/admin/users` | POST | Admin firmaya bağlı kullanıcı oluşturur. | Swagger/Admin işlemleri |
| `/api/admin/users` | GET | Admin kullanıcıları listeler. | Swagger/Admin işlemleri |

---

# 0. Login / Auth API

## Ortak Not

Auth endpointleri standart response formatını kullanır:

```json
{
  "success": true,
  "data": {},
  "message": "İşlem başarılı."
}
```

Herkese açık register endpointi yoktur. Firma ve kullanıcı hesaplarını sistem yöneticisi oluşturur.

Login başarılı olduğunda backend JWT token döndürür. Frontend bu token'ı sonraki yetkili isteklerde `Authorization` header içinde göndermelidir.

```http
Authorization: Bearer JWT_TOKEN
```

## Login

```http
POST /api/auth/login
```

Request body:

```json
{
  "email": "test@geovolt.com",
  "password": "Test123!"
}
```

Hatalı response:

```json
{
  "success": false,
  "data": null,
  "message": "E-posta veya parola hatalı."
}
```

## Me

```http
GET /api/auth/me
Authorization: Bearer JWT_TOKEN
```

Response:

```json
{
  "success": true,
  "message": "İşlem başarılı.",
  "data": {
    "id": 1,
    "fullName": "Test User",
    "email": "test@geovolt.com",
    "role": "CompanyUser",
    "companyId": 1,
    "companyName": "VoltCharge A.Ş."
  }
}
```

## Admin Firma Oluşturma

```http
POST /api/admin/companies
Authorization: Bearer ADMIN_JWT_TOKEN
```

```json
{
  "name": "VoltCharge A.Ş.",
  "taxNumber": "1234567890",
  "contactEmail": "info@voltcharge.com"
}
```

## Admin Firma Kullanıcısı Oluşturma

```http
POST /api/admin/users
Authorization: Bearer ADMIN_JWT_TOKEN
```

```json
{
  "fullName": "Firma Kullanıcısı",
  "email": "user@voltcharge.com",
  "password": "User123!",
  "companyId": 1
}
```

Kural: Bir firmaya en fazla 2 kullanıcı eklenebilir.

Detaylı frontend teslim notu:

```text
docs/AUTH_FRONTEND_HANDOFF.md
```

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
    "id": 6,
    "name": "Balgat",
    "population": 108832,
    "boundaryGeoJson": "{\"type\":\"MultiPolygon\",...}"
  }
]
```

---

## Bölge İçinde Nokta Bulma

```http
POST /api/regions/{regionId}/locate-point
```

Verilen koordinatın seçili bölgenin içinde olup olmadığını ve eşleşen mahalleyi
PostGIS üzerinden bulur. `{regionId}`, bölge listesinden dönen kalıcı kaynak
kimliğidir.

```json
{
  "latitude": 39.892948,
  "longitude": 32.819532
}
```

```json
{
  "regionId": 6,
  "regionName": "Balgat",
  "isInsideRegion": true,
  "neighborhoodId": 14122,
  "neighborhoodName": "Ehlibeyt",
  "latitude": 39.892948,
  "longitude": 32.819532
}
```

---

# 2. Mevcut Şarj İstasyonları API

## Endpoint

```http
GET /api/charging-stations
GET /api/charging-stations?regionId=6
GET /api/charging-stations?neighborhoodId=14122
GET /api/charging-stations/{id}
```

## Açıklama

Mevcut şarj istasyonlarını PostGIS üzerinden listeler. `regionId` ve
`neighborhoodId` filtreleri API'nin döndürdüğü kalıcı kaynak kimlikleridir.

Frontend bu endpointten gelen verileri harita üzerinde marker olarak gösterecektir.

## Örnek Response

```json
[
  {
    "id": 519,
    "sourceStationNumber": "ŞRJ/9187",
    "name": "06-ÇANKAYA-EHLİBEYT-SARIBULUT",
    "operatorName": "LUMHOUSE ENERJİ SANAYİ VE TİCARET ANONİM ŞİRKETİ",
    "brandName": "Lumicle",
    "accessType": "Public",
    "regionId": 6,
    "regionName": "Balgat",
    "neighborhoodId": 14122,
    "neighborhoodName": "Ehlibeyt",
    "address": "Ehlibeyt Mahallesi Cevizlidere Caddesi No:8 Çankaya / ANKARA",
    "latitude": 39.892948,
    "longitude": 32.819532,
    "isActive": true,
    "isGreenStation": null,
    "socketCount": 1,
    "maxPowerKw": 60,
    "socketTypes": ["DC"],
    "connectorTypes": ["DC_CCS"]
  }
]
```

Detay endpoint'i yukarıdaki alanlara ek olarak `connectors` dizisini döndürür:

```json
{
  "connectors": [
    {
      "id": 1677,
      "sourceSocketNumber": "SKT/21484",
      "socketType": "DC",
      "connectorType": "DC_CCS",
      "powerKw": 60,
      "quantity": 1
    }
  ]
}
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

Kullanıcının harita üzerinde bıraktığı pinin seçili bölge içinde olup olmadığını
ve hangi mahallede bulunduğunu PostGIS ile değerlendirir. Maliyet verisi henüz
bağlı olmadığı için `estimatedCost` alanı `null`, `costSource` alanı
`"NotAvailable"` döner.

## Request Body

```json
{
  "regionId": 6,
  "latitude": 39.892948,
  "longitude": 32.819532
}
```

## Örnek Response

```json
{
  "isValid": true,
  "regionId": 6,
  "regionName": "Balgat",
  "neighborhoodId": 14122,
  "neighborhoodName": "Ehlibeyt",
  "latitude": 39.892948,
  "longitude": 32.819532,
  "estimatedCost": null,
  "costSource": "NotAvailable",
  "message": "Seçilen konum bölge sınırları içindedir."
}
```

## Bölge Dışı Örnek Response

```json
{
  "isValid": false,
  "regionId": 6,
  "regionName": "Balgat",
  "neighborhoodId": null,
  "neighborhoodName": null,
  "latitude": 0,
  "longitude": 0,
  "estimatedCost": null,
  "costSource": "NotAvailable",
  "message": "Seçilen konum bölge sınırları dışındadır."
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

Güncel auth kararına göre kullanıcılar admin tarafından oluşturulur ve firmaya bağlıdır.

Bu endpoint ileride backend tarafında token'daki kullanıcı/firma bilgisine göre PostgreSQL'e kayıt atacaktır.

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

Güncel auth kararına göre kullanıcılar admin tarafından oluşturulur ve firmaya bağlıdır.

Bu endpoint ileride token'daki kullanıcı/firma bilgisine göre PostgreSQL'den kayıtları getirecektir.

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
