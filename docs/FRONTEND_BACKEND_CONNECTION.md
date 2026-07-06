# Frontend - Backend Bağlantı Planı

Bu doküman, GeoVolt projesinde frontend ve backend tarafının nasıl haberleşeceğini açıklar.

Bu dosya kod geliştirme başlamadan önce ekip üyelerinin aynı bağlantı mantığı üzerinde anlaşması için hazırlanmıştır.

---

## Temel Mantık

Frontend ve backend birbirinin içine yazılmaz.

İkisi ayrı uygulama olarak çalışır ve HTTP API üzerinden haberleşir.

Bağlantı akışı:

```text
React Frontend  --->  .NET Backend API  --->  PostgreSQL/PostGIS
```

Frontend doğrudan veritabanına bağlanmayacaktır.

Frontend, backend API endpointlerine istek atacaktır. Backend ise veritabanından gerekli verileri alıp frontend'e JSON formatında cevap döndürecektir.

---

## Katmanlar

| Katman | Teknoloji | Görevi |
|---|---|---|
| Frontend | React / Vite | Kullanıcının gördüğü ekranları oluşturur. |
| Backend | .NET Web API | Frontend isteklerini karşılar ve iş kurallarını uygular. |
| Veritabanı | PostgreSQL + PostGIS | Bölge, istasyon, aday nokta ve skor verilerini tutar. |
| Bağlantı | HTTP API / JSON | Frontend ve backend arasındaki haberleşmeyi sağlar. |

---

## Repo Yapısı

Projede frontend ve backend aynı GitHub reposu içinde ama ayrı klasörlerde tutulacaktır.

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

## Frontend Adresi

React / Vite uygulaması geliştirme ortamında genellikle şu adreste çalışır:

```text
http://localhost:5173
```

Bu adres frontend uygulamasının tarayıcıda açıldığı adrestir.

---

## Backend Adresi

.NET Web API geliştirme ortamında örnek olarak şu adreslerden birinde çalışabilir:

```text
http://localhost:5000
```

veya:

```text
https://localhost:7001
```

Backend adresi kesinleştiğinde frontend tarafında `.env` dosyasına yazılacaktır.

---

## .env Kullanımı

Backend adresi frontend kodunun içine sabit yazılmamalıdır.

Frontend tarafında `.env` dosyası kullanılacaktır.

Örnek:

```env
VITE_API_BASE_URL=http://localhost:5000
```

React içinde kullanım:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Örnek API isteği:

```js
fetch(`${API_BASE_URL}/api/candidate-points`)
  .then((res) => res.json())
  .then((data) => console.log(data));
```

Bu yapı sayesinde backend portu değişirse kodu değiştirmeden sadece `.env` dosyası güncellenir.

---

## .env.example Mantığı

Gerçek `.env` dosyası GitHub'a gönderilmemelidir.

Bunun yerine örnek değerler `.env.example` dosyasında tutulmalıdır.

Örnek:

```env
VITE_API_BASE_URL=http://localhost:5000
ASPNETCORE_ENVIRONMENT=Development
DATABASE_CONNECTION_STRING=Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=your_password
JWT_SECRET_KEY=change_this_secret_key
```

Ekip üyeleri kendi bilgisayarlarında `.env.example` dosyasını örnek alarak kendi `.env` dosyalarını oluşturabilir.

---

## Backend CORS Ayarı

Frontend ve backend farklı portlarda çalışacağı için backend tarafında CORS izni verilmelidir.

Örnek frontend adresi:

```text
http://localhost:5173
```

Örnek .NET CORS ayarı:

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

Olası hata:

```text
Access to fetch at ... from origin ... has been blocked by CORS policy
```

---

## API Sözleşmesi

Frontend ve backend ekipleri aynı anda farklı bilgisayarlarda çalışacağı için endpoint isimleri baştan belirlenmelidir.

API sözleşmesi şu dosyada tutulacaktır:

```text
docs/API_CONTRACT.md
```

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

---

## Backend Hazır Değilken Frontend Nasıl İlerler?

Backend tamamen hazır değilken frontend ekibi beklemek zorunda değildir.

İki yöntem kullanılabilir:

1. Frontend geçici mock data ile ekranları hazırlar.
2. Backend ekibi ilk aşamada veritabanı yerine sahte JSON dönen endpointler yazar.

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

Backend hazır olduğunda mock data kaldırılır ve gerçek API bağlantısı yapılır.

---

## Ayrı Bilgisayarlarda Çalışma

En kolay yöntem, herkesin projeyi kendi bilgisayarında çalıştırmasıdır.

Her ekip üyesi repoyu indirir:

```bash
git clone REPO_LINKI
cd GeoVolt
```

Sonra kendi branch'ini açar:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/frontend-map
```

veya:

```bash
git checkout -b feature/backend-postgis-api
```

---

## Backend Bir Kişinin Bilgisayarında Çalışırsa

Bu yöntem daha zor olabilir.

Backend bir kişinin bilgisayarında çalışırsa diğer kişiler onun IP adresine bağlanır.

Örnek:

```env
VITE_API_BASE_URL=http://192.168.1.25:5000
```

Bu yöntemin çalışması için:

- Herkes aynı Wi-Fi ağına bağlı olmalıdır.
- Backend dış bağlantıya izin vermelidir.
- Güvenlik duvarı portu engellememelidir.
- CORS ayarında doğru frontend adreslerine izin verilmelidir.

Yeni başlayan ekip için önerilen yöntem herkesin kendi bilgisayarında çalıştırmasıdır.

---

## Login Kararı

Kaydedilen aday noktalar için iki seçenek vardır:

| Seçenek | Açıklama | Zorluk |
|---|---|---|
| Hesapsız MVP | Register/Login yapılmaz. Kaydedilenler frontend local storage içinde tutulur. | Daha kolay |
| Hesaplı MVP | Register/Login, parola hashleme, JWT ve PostgreSQL'de kullanıcıya bağlı kayıt gerekir. | Daha zor |

Süre kısıtlıysa ilk aşamada hesapsız MVP ile ilerlenebilir.

Mentor veya proje gereksinimi kullanıcı hesabını zorunlu tutarsa backend tarafında JWT ve PostgreSQL kalıcılığı eklenir.

---

## Ekip İçin Önerilen Çalışma Sırası

1. GitHub reposu açılır.
2. Repo içine `backend/`, `frontend/` ve `docs/` klasörleri eklenir.
3. `develop` branch oluşturulur.
4. Herkes kendi feature branch'ini açar.
5. API sözleşmesi `docs/API_CONTRACT.md` içinde netleştirilir.
6. Backend ekibi önce sahte veri dönen endpointleri hazırlar.
7. Frontend ekibi bu endpointlere bağlanarak ekranları yapar.
8. Veri ve PostGIS hazır olunca backend sahte veriyi gerçek sorgularla değiştirir.
9. Frontend gerçek verilerle test edilir.
10. Her özellik Pull Request ile `develop` branch'ine eklenir.
11. En son `develop` branch'i `main` branch'ine merge edilir.

---

## Özet

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

Ekip üyeleri kendi branchlerinde çalışacak, frontend ve backend bağlantısı HTTP API endpointleri üzerinden yapılacaktır.

Frontend backend'e istek atacak, backend JSON formatında veri döndürecektir.