# GeoVolt

GeoVolt, Çankaya bölgesinde elektrikli araç şarj istasyonu için uygun aday lokasyonları analiz etmeyi ve kullanıcıya harita üzerinden önermeyi amaçlayan bir web projesidir.

Bu proje ekip üyelerinin ayrı bilgisayarlarda GitHub branch yapısı üzerinden çalışabilmesi için düzenlenmiştir. Frontend ve backend aynı GitHub reposu içinde tutulacak, fakat ayrı klasörlerde geliştirilecektir.

---

## Proje Mantığı

Bu projede frontend ve backend birbirinin içine yazılmaz. İkisi ayrı uygulama olarak geliştirilir ve HTTP API üzerinden haberleşir.

```text
React Frontend  --->  .NET Backend API  --->  PostgreSQL/PostGIS
```

Frontend doğrudan veritabanına bağlanmayacaktır.

Frontend, backend API endpointlerine istek atacaktır. Backend ise PostgreSQL/PostGIS veritabanından verileri alıp frontend'e JSON formatında döndürecektir.

---

## Kullanılacak Teknolojiler

### Frontend

- React
- Vite
- Axios veya Fetch
- Leaflet / React Leaflet

### Backend

- .NET Web API
- PostgreSQL
- PostGIS
- Entity Framework Core

### Veritabanı

- PostgreSQL
- PostGIS

### Ekip Çalışması

- GitHub
- Branch yapısı
- Pull Request
- Ortak API sözleşmesi

---

## Proje Klasör Yapısı

```text
GeoVolt/
├── backend/
│   └── README.md
├── frontend/
│   └── README.md
├── docs/
│   ├── API_CONTRACT.md
│   ├── BRANCH_GUIDE.md
│   └── FRONTEND_BACKEND_CONNECTION.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Klasör Açıklamaları

### backend

Bu klasör backend tarafı için ayrılmıştır.

Backend tarafında şu işlemler geliştirilecektir:

- .NET Web API kurulumu
- PostgreSQL/PostGIS bağlantısı
- Aday nokta API'leri
- Bölge bazlı sorgulama API'leri
- Manuel pin değerlendirme API'si
- Skor filtreleme işlemleri
- Kaydedilen aday noktalar için kalıcılık
- CORS ayarları
- Swagger/OpenAPI dokümantasyonu

---

### frontend

Bu klasör frontend tarafı için ayrılmıştır.

Frontend tarafında şu işlemler geliştirilecektir:

- React arayüzü
- Ana harita ekranı
- Mevcut şarj istasyonu markerları
- Bölge overlayleri
- Aday nokta kartları
- Skor filtreleme ekranları
- Manuel pin bırakma arayüzü
- Kaydedilen aday noktalar ekranı
- Kişiselleştirme formu
- Backend API endpointlerine istek atma işlemleri

---

### docs

Bu klasör proje dokümantasyonu için ayrılmıştır.

İçinde şu dokümanlar bulunacaktır:

- `API_CONTRACT.md`: Frontend ve backend arasında kullanılacak endpoint sözleşmesi
- `BRANCH_GUIDE.md`: GitHub branch çalışma düzeni
- `FRONTEND_BACKEND_CONNECTION.md`: Frontend ve backend bağlantı mantığı

---

## Frontend - Backend Bağlantı Mantığı

Frontend ve backend farklı portlarda çalışacaktır.

Örnek frontend adresi:

```text
http://localhost:5173
```

Örnek backend adresi:

```text
http://localhost:5000
```

veya

```text
https://localhost:7001
```

Frontend, backend endpointlerine istek atacaktır.

Örnek istek:

```js
fetch(`${API_BASE_URL}/api/candidate-points`)
  .then((res) => res.json())
  .then((data) => console.log(data));
```

Backend ise JSON formatında cevap döndürecektir.

Örnek cevap:

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

## .env Kullanımı

Backend adresi frontend kodunun içine sabit yazılmayacaktır.

Frontend tarafında `.env` dosyası kullanılacaktır.

Örnek:

```env
VITE_API_BASE_URL=http://localhost:5000
```

React içinde kullanım:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Gerçek `.env` dosyası GitHub'a gönderilmeyecektir. Bunun yerine örnek ayarlar `.env.example` dosyasında tutulacaktır.

---

## API Sözleşmesi

Frontend ve backend ekipleri aynı anda farklı bilgisayarlarda çalışacağı için endpoint isimleri ve veri formatları baştan belirlenmelidir.

Planlanan temel endpointler:

| Endpoint | Metot | Açıklama |
|---|---|---|
| `/api/regions` | GET | Bölge listesini getirir. |
| `/api/stations` | GET | Mevcut şarj istasyonlarını getirir. |
| `/api/candidate-points` | GET | Aday şarj istasyonu noktalarını getirir. |
| `/api/candidate-points?minScore=70&maxScore=100` | GET | Skora göre filtrelenmiş aday noktaları getirir. |
| `/api/manual-pin/evaluate` | POST | Haritada bırakılan pini değerlendirir. |
| `/api/saved-candidates` | POST | Aday noktayı kaydeder. |
| `/api/saved-candidates` | GET | Kaydedilen aday noktaları getirir. |

Detaylı API sözleşmesi için:

```text
docs/API_CONTRACT.md
```

---

## CORS Mantığı

Frontend ve backend farklı portlarda çalışacağı için backend tarafında CORS izni verilmelidir.

Örnek:

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

## GitHub Branch Yapısı

Projede doğrudan `main` branch'ine kod atılmayacaktır.

Ekip üyeleri kendi feature branchleri üzerinde çalışacaktır.

### Ana Branchler

| Branch | Açıklama |
|---|---|
| `main` | Kararlı ve teslim edilebilir sürüm. |
| `develop` | Geliştirme branch'i. Tüm işler önce burada birleştirilir. |

### Feature Branchler

| Branch | Sorumluluk |
|---|---|
| `feature/backend-postgis-api` | PostGIS, aday nokta API'leri, manuel pin API'si |
| `feature/backend-auth-persistence` | Login, kaydedilenler, kalıcılık ve altyapı |
| `feature/frontend-map` | Ana harita, marker, bölge overlay ve popup ekranları |
| `feature/frontend-candidate-points` | Aday nokta kartları, filtreleme, kaydedilenler ve kişiselleştirme |

---

## Yeni Branch Açma

Önce develop branch'ine geçilir:

```bash
git checkout develop
git pull origin develop
```

Sonra yeni feature branch açılır:

```bash
git checkout -b feature/frontend-map
```

veya

```bash
git checkout -b feature/backend-postgis-api
```

---

## Değişiklikleri GitHub'a Gönderme

```bash
git add .
git commit -m "Create initial project structure"
git push origin branch-adi
```

Örnek:

```bash
git push origin feature/frontend-map
```

---

## Çalışma Kuralları

- Herkes kendi branch'inde çalışacaktır.
- Direkt `main` branch'ine kod gönderilmeyecektir.
- Kodlar önce `develop` branch'inde birleştirilecektir.
- Her özellik için Pull Request açılacaktır.
- Frontend ve backend ekipleri API sözleşmesine göre çalışacaktır.
- Endpoint isimleri değişirse `docs/API_CONTRACT.md` dosyası güncellenecektir.
- Backend adresi koda sabit yazılmayacak, `.env` dosyasından okunacaktır.
- Gerçek `.env` dosyası GitHub'a gönderilmeyecektir.

---

## Backend Hazır Değilken Frontend Nasıl İlerler?

Backend tamamen hazır olmasa bile frontend ekibi çalışmaya devam edebilir.

Bunun için iki yöntem kullanılabilir:

1. Frontend geçici mock data ile ekranları hazırlar.
2. Backend ekibi ilk aşamada veritabanı yerine sahte JSON dönen endpointler oluşturur.

Örnek mock data:

```js
const mockCandidatePoints = [
  {
    id: 1,
    estimatedAddress: "Çankaya / Kızılay",
    estimatedCost: 450000,
    costScore: 80,
    demandScore: 90,
    generalScore: 85,
    latitude: 39.9208,
    longitude: 32.8541
  }
];
```

---

## Ekip İçin Önerilen Çalışma Sırası

1. GitHub reposu oluşturulur.
2. Repo içine `backend/`, `frontend/` ve `docs/` klasörleri eklenir.
3. `develop` branch oluşturulur.
4. Her ekip üyesi kendi feature branch'ini açar.
5. API sözleşmesi `docs/API_CONTRACT.md` içinde netleştirilir.
6. Backend ekibi önce sahte JSON dönen endpointleri hazırlar.
7. Frontend ekibi bu endpointlere bağlanarak ekranları geliştirir.
8. Veri ve PostGIS kısmı hazır olunca backend sahte veriyi gerçek sorgularla değiştirir.
9. Frontend gerçek verilerle test edilir.
10. Her özellik Pull Request ile `develop` branch'ine eklenir.
11. Proje tamamlandığında `develop`, `main` branch'ine merge edilir.

---

## Kısa Özet

| Konu | Karar |
|---|---|
| Frontend | React ekranları geliştirilecek. |
| Backend | .NET API geliştirilecek. |
| Veritabanı | PostgreSQL/PostGIS kullanılacak. |
| Bağlantı şekli | HTTP API ve JSON kullanılacak. |
| Repo yapısı | Frontend ve backend aynı repoda, ayrı klasörlerde tutulacak. |
| Branch yapısı | Her kişi kendi feature branch'inde çalışacak. |
| API sözleşmesi | `docs/API_CONTRACT.md` içinde tutulacak. |
| Backend adresi | Frontend `.env` dosyasından okuyacak. |
| Kritik ayar | Backend tarafında CORS açılacak. |

---

## Sonuç

GeoVolt projesinde frontend ve backend aynı GitHub reposunda fakat ayrı klasörlerde tutulacaktır.

Ekip üyeleri kendi branchlerinde çalışacak, değişiklikler Pull Request ile `develop` branch'inde birleştirilecektir.

Frontend ve backend bağlantısı HTTP API endpointleri üzerinden yapılacaktır. Frontend backend'e istek atacak, backend JSON formatında veri döndürecektir.