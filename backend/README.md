# Backend

Bu klasör, GeoVolt projesinin backend tarafı için ayrılmıştır.

GeoVolt backend tarafı; frontend uygulamasından gelen istekleri karşılayacak, gerekli iş kurallarını uygulayacak, PostgreSQL/PostGIS veritabanı ile iletişim kuracak ve frontend'e JSON formatında veri döndürecektir.

---

## Güncel Durum

İlk backend iskeleti oluşturuldu.

```text
backend/
├── GeoVolt.slnx
└── src/
    ├── GeoVolt.Api/
    ├── GeoVolt.Application/
    ├── GeoVolt.Domain/
    └── GeoVolt.Infrastructure/
```

İlk tamamlanan backend özelliği login/register altyapısıdır.

Hazır endpointler:

| Endpoint | Metot | Açıklama |
|---|---|---|
| `/api/health` | GET | API çalışıyor mu kontrolü |
| `/api/auth/login` | POST | Giriş yapar ve JWT token döner |
| `/api/auth/me` | GET | Token sahibi kullanıcıyı getirir |
| `/api/admin/companies` | POST | Admin firma oluşturur |
| `/api/admin/companies` | GET | Admin firmaları listeler |
| `/api/admin/users` | POST | Admin firmaya bağlı kullanıcı oluşturur |
| `/api/admin/users` | GET | Admin kullanıcıları listeler |

Swagger:

```text
http://localhost:5000/swagger
```

Frontend bağlantı detayları:

```text
docs/AUTH_FRONTEND_HANDOFF.md
```

Default admin:

```text
Email: admin@geovolt.com
Password: Admin123!
```

Not: Herkese açık register endpointi yoktur. Firma ve kullanıcı hesaplarını sistem yöneticisi oluşturur. Bir firmaya en fazla 2 kullanıcı eklenebilir.

## Çalıştırma

```bash
cd backend
dotnet restore
dotnet build GeoVolt.slnx
dotnet ef database update --project src/GeoVolt.Infrastructure --startup-project src/GeoVolt.Api
dotnet run --project src/GeoVolt.Api
```

Varsayılan PostgreSQL bağlantısı:

```text
Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=postgres
```

Farklı bağlantı için `DATABASE_CONNECTION_STRING` environment variable kullanılabilir.

---

## Kullanılacak Teknolojiler

Backend tarafında planlanan teknolojiler:

- .NET Web API
- PostgreSQL
- PostGIS
- Entity Framework Core
- Swagger / OpenAPI
- JWT Authentication
- CORS
- Logging
- Validation

---

## Backend'in Projedeki Görevi

Frontend doğrudan veritabanına bağlanmayacaktır.

Frontend, backend API endpointlerine HTTP istekleri atacaktır. Backend ise veritabanından gerekli verileri alıp frontend'e JSON formatında cevap döndürecektir.

Genel bağlantı mantığı:

```text
React Frontend  --->  .NET Backend API  --->  PostgreSQL/PostGIS
```

---

## Backend Sorumlulukları

Backend tarafında geliştirilecek temel işler şunlardır:

- Aday şarj istasyonu noktalarını listelemek
- Bölge bazlı aday nokta sorgulamak
- Mevcut şarj istasyonlarını listelemek
- Maliyet, talep ve genel skor filtreleme yapmak
- Aday nokta detay bilgilerini döndürmek
- Manuel pin değerlendirme işlemini yapmak
- PostGIS ile pin'in seçili bölge içinde olup olmadığını kontrol etmek
- Trafo, ana yol ve diğer referans katmanlarına mesafe hesaplamak
- Tahmini kurulum maliyeti üretmek
- Kaydedilen aday noktalar için kalıcılık sağlamak
- Kullanıcı giriş/kayıt sistemi yapılacaksa authentication altyapısı kurmak
- Frontend'e standart JSON response döndürmek
- Ortak hata yönetimi oluşturmak
- Loglama yapmak
- Swagger/OpenAPI dokümantasyonu hazırlamak
- Test verisi ve seed data hazırlamak

---

## Planlanan Backend Klasör Yapısı

Backend geliştirme başladığında örnek yapı şu şekilde olabilir:

```text
backend/
└── GeoVolt.Api/
    ├── Controllers/
    │   ├── RegionsController.cs
    │   ├── StationsController.cs
    │   ├── CandidatePointsController.cs
    │   ├── ManualPinController.cs
    │   └── SavedCandidatesController.cs
    │
    ├── Models/
    │   ├── Region.cs
    │   ├── Station.cs
    │   ├── CandidatePoint.cs
    │   └── SavedCandidate.cs
    │
    ├── DTOs/
    │   ├── CandidatePointDto.cs
    │   ├── ManualPinRequestDto.cs
    │   └── ManualPinResultDto.cs
    │
    ├── Services/
    │   ├── CandidatePointService.cs
    │   ├── RegionService.cs
    │   └── ManualPinService.cs
    │
    ├── Data/
    │   ├── GeoVoltDbContext.cs
    │   └── SeedData.cs
    │
    ├── Migrations/
    ├── Program.cs
    ├── appsettings.json
    └── GeoVolt.Api.csproj
```

Bu yapı proje geliştirme aşamasında değiştirilebilir.

---

## Planlanan API Endpointleri

Frontend ekibi ile ortak çalışmak için başlangıçta planlanan endpointler:

| Endpoint | Metot | Açıklama |
|---|---|---|
| `/api/regions` | GET | Bölge listesini getirir. |
| `/api/stations` | GET | Mevcut şarj istasyonlarını getirir. |
| `/api/candidate-points` | GET | Aday şarj istasyonu noktalarını getirir. |
| `/api/candidate-points?minScore=70&maxScore=100` | GET | Skora göre filtrelenmiş aday noktaları getirir. |
| `/api/manual-pin/evaluate` | POST | Haritada bırakılan pini değerlendirir. |
| `/api/saved-candidates` | POST | Aday noktayı kaydeder. |
| `/api/saved-candidates` | GET | Kaydedilen aday noktaları getirir. |

Detaylı API sözleşmesi şu dosyada tutulacaktır:

```text
docs/API_CONTRACT.md
```

---

## Backend Çalışma Adresi

Geliştirme sırasında backend örnek olarak şu adreste çalışabilir:

```text
http://localhost:5000
```

veya

```text
https://localhost:7001
```

Frontend tarafı backend adresini `.env` dosyasından okuyacaktır.

Örnek frontend `.env` değeri:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## CORS Ayarı

Frontend ve backend farklı portlarda çalışacağı için backend tarafında CORS ayarı yapılmalıdır.

Örnek frontend adresi:

```text
http://localhost:5173
```

Örnek CORS ayarı:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

app.UseCors("FrontendPolicy");
```

CORS ayarı yapılmazsa frontend backend'e istek atarken tarayıcı isteği engelleyebilir.

---

## Veritabanı

Backend tarafında PostgreSQL ve PostGIS kullanılacaktır.

Veritabanında tutulması planlanan temel veriler:

- Bölge poligonları
- Mevcut şarj istasyonları
- Aday şarj istasyonu noktaları
- Maliyet skorları
- Talep skorları
- Genel değerlendirme skorları
- Kullanıcı kayıtları
- Kaydedilen aday noktalar
- Skor konfigürasyonları

---

## PostGIS Kullanımı

PostGIS, coğrafi verilerle çalışmak için kullanılacaktır.

Backend tarafında PostGIS ile yapılacak işlemler:

- Bölge sınır kontrolü
- Manuel pin'in bölge içinde olup olmadığını kontrol etme
- Aday nokta koordinatlarını işleme
- Mevcut istasyonlara mesafe hesaplama
- Trafo, ana yol ve referans katmanlarına mesafe hesaplama
- Bölge bazlı mekânsal sorgular

Örnek olarak manuel pin kontrolünde şu mantık kullanılacaktır:

```text
ST_Contains(region_geometry, selected_point)
```

Mesafe hesaplamalarında derece bazlı değil, metre bazlı hesaplama yapılmalıdır.

---

## Authentication Kararı

Proje başlangıcında kaydedilen aday noktalar için iki seçenek vardır:

| Seçenek | Açıklama | Zorluk |
|---|---|---|
| Hesapsız MVP | Login/register yapılmaz. Kaydedilenler frontend local storage içinde tutulur. | Daha kolay |
| Hesaplı MVP | Register/login, parola hashleme, JWT ve PostgreSQL'de kullanıcıya bağlı kayıt gerekir. | Daha zor |

Süre kısıtlıysa ilk aşamada hesapsız MVP ile ilerlenebilir.

Mentor veya proje gereksinimi kullanıcı hesabını zorunlu tutarsa backend tarafında JWT authentication ve PostgreSQL kalıcılığı eklenecektir.

---

## Backend Geliştirme Kuralları

- Frontend'e dönen response formatları tutarlı olmalıdır.
- Endpoint isimleri değişirse `docs/API_CONTRACT.md` güncellenmelidir.
- Veritabanı bağlantı bilgileri koda sabit yazılmamalıdır.
- Secret bilgiler GitHub'a gönderilmemelidir.
- `.env` veya `appsettings.Development.json` gibi yerel ayarlar GitHub'a gönderilmemelidir.
- Swagger dokümantasyonu güncel tutulmalıdır.
- Hata mesajları kullanıcı dostu ve anlaşılır olmalıdır.
- PostGIS sorguları performans için indekslerle desteklenmelidir.
- Backend frontend'e sadece gerekli veriyi döndürmelidir.

---

## Backend Geliştirme Başladığında Kurulum Planı

Backend geliştirme aşamasına geçildiğinde izlenecek örnek adımlar:

```bash
cd backend
dotnet new webapi -n GeoVolt.Api
cd GeoVolt.Api
dotnet restore
dotnet run
```

Backend çalıştırıldığında Swagger veya API endpointleri üzerinden test yapılacaktır.

---

## Özet

Bu klasör GeoVolt projesinin backend tarafı için ayrılmıştır.

Backend tarafı; frontend isteklerini karşılayacak, PostgreSQL/PostGIS ile çalışacak, aday lokasyon analizlerini yapacak ve frontend'e JSON formatında veri döndürecektir.

Frontend ve backend bağlantısı HTTP API endpointleri üzerinden yapılacaktır.
