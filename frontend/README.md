# Frontend

Bu klasör, GeoVolt projesinin frontend tarafı için ayrılmıştır.

GeoVolt frontend tarafı; kullanıcının göreceği arayüzleri, harita ekranını, aday lokasyon kartlarını, filtreleme alanlarını, kaydedilen aday noktalar ekranını ve kişiselleştirme formunu içerecektir.

Frontend doğrudan veritabanına bağlanmayacaktır. Frontend, backend API endpointlerine HTTP istekleri atacaktır ve backend'den gelen JSON verilerini kullanıcı arayüzünde gösterecektir.

---

## Kullanılacak Teknolojiler

Frontend tarafında planlanan teknolojiler:

- React
- Vite
- JavaScript
- Axios veya Fetch API
- Leaflet / React Leaflet
- CSS / Responsive tasarım
- Local Storage

---

## Frontend'in Projedeki Görevi

Frontend tarafı kullanıcının etkileşimde bulunduğu bölümdür.

Genel bağlantı mantığı:

```text
React Frontend  --->  .NET Backend API  --->  PostgreSQL/PostGIS
```

Frontend şu işlemleri yapacaktır:

- Kullanıcıdan veri almak
- Harita üzerinde marker ve bölge göstermek
- Backend API endpointlerine istek atmak
- Backend'den gelen JSON verilerini ekranda göstermek
- Filtreleme, seçim ve form işlemlerini kullanıcıya sunmak
- Kaydedilen aday noktaları kullanıcıya göstermek

---

## Frontend Sorumlulukları

Frontend tarafında geliştirilecek temel işler şunlardır:

- Ana harita ekranını oluşturmak
- Çankaya temel haritasını göstermek
- Mevcut şarj istasyonlarını marker olarak göstermek
- Marker'a tıklanınca popup veya bilgi kartı açmak
- Firma, koordinat, güç kapasitesi ve soket tipi bilgilerini göstermek
- Bölge overlaylerini açıp kapatmak
- Bölge seçildiğinde haritayı ilgili alana odaklamak
- Bölgesel bilgi paneli hazırlamak
- Bölge ve mahalle dropdown araması yapmak
- Aday şarj istasyonu lokasyonları ekranını oluşturmak
- Aday nokta kartlarını göstermek
- Maliyet skoru, talep skoru ve genel değerlendirme skorunu göstermek
- Min-max skor filtreleri hazırlamak
- Filtrelerde 0-100 aralığı kontrolü yapmak
- Manuel pin bırakma arayüzünü hazırlamak
- Manuel pin sonucunu kart olarak göstermek
- Kaydedilen aday noktalar ekranını oluşturmak
- En fazla 10 kayıt kuralını uygulamak
- Kişiselleştirme formu hazırlamak
- Bütçe aralığı, AC/DC, mekan türü ve bölge seçimi alanlarını oluşturmak
- Sonuç bulunmadığında kullanıcıya bilgilendirme göstermek
- Loading, error, boş veri ve veri eksik durumlarını yönetmek
- Mobil uyumlu görünüm hazırlamak
- Backend API endpointlerine istek atmak

---

## Planlanan Frontend Klasör Yapısı

Frontend geliştirme başladığında örnek yapı şu şekilde olabilir:

```text
frontend/
└── geovolt-ui/
    ├── public/
    │
    ├── src/
    │   ├── assets/
    │   │   └── images/
    │   │
    │   ├── components/
    │   │   ├── Map/
    │   │   ├── CandidateCard/
    │   │   ├── FilterPanel/
    │   │   ├── RegionPanel/
    │   │   ├── SavedCandidates/
    │   │   └── Common/
    │   │
    │   ├── pages/
    │   │   ├── HomePage.jsx
    │   │   ├── MapPage.jsx
    │   │   ├── CandidatePointsPage.jsx
    │   │   ├── SavedCandidatesPage.jsx
    │   │   └── PersonalizationPage.jsx
    │   │
    │   ├── services/
    │   │   ├── api.js
    │   │   ├── regionService.js
    │   │   ├── stationService.js
    │   │   ├── candidatePointService.js
    │   │   └── savedCandidateService.js
    │   │
    │   ├── hooks/
    │   │   └── useFetch.js
    │   │
    │   ├── utils/
    │   │   ├── validation.js
    │   │   └── storage.js
    │   │
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── App.css
    │
    ├── .env
    ├── .env.example
    ├── package.json
    └── vite.config.js
```

Bu yapı proje geliştirme aşamasında değiştirilebilir.

---

## Backend Bağlantısı

Frontend, backend adresini `.env` dosyasından okuyacaktır.

Backend adresi kodun içine sabit yazılmayacaktır.

Örnek `.env` dosyası:

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

---

## Planlanan API Kullanımları

Frontend tarafı başlangıçta şu backend endpointlerini kullanacaktır:

| Endpoint | Metot | Frontend'de Kullanılacağı Yer |
|---|---|---|
| `/api/regions` | GET | Bölge listesi ve bölge overlayleri |
| `/api/stations` | GET | Mevcut şarj istasyonu markerları |
| `/api/candidate-points` | GET | Aday nokta kartları ve harita markerları |
| `/api/candidate-points?minScore=70&maxScore=100` | GET | Skor filtreleme ekranı |
| `/api/manual-pin/evaluate` | POST | Manuel pin sonucu |
| `/api/saved-candidates` | POST | Aday noktayı kaydetme |
| `/api/saved-candidates` | GET | Kaydedilen aday noktalar ekranı |

Detaylı API sözleşmesi şu dosyada tutulacaktır:

```text
docs/API_CONTRACT.md
```

---

## Örnek Backend Cevabı

Backend'den aday noktalar için örnek JSON cevabı:

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

Frontend bu veriyi kartlarda ve harita üzerinde gösterecektir.

---

## Mock Data Kullanımı

Backend henüz hazır değilken frontend ekibi geçici mock data ile ekranları geliştirebilir.

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
  },
  {
    id: 2,
    estimatedAddress: "Çankaya / Bahçelievler",
    estimatedCost: 520000,
    costScore: 72,
    demandScore: 88,
    generalScore: 81,
    latitude: 39.9321,
    longitude: 32.8234
  }
];
```

Backend hazır olduğunda mock data kaldırılıp gerçek API bağlantısı yapılacaktır.

---

## Local Storage Kullanımı

Eğer proje başlangıcında login/register yapılmazsa kaydedilen aday noktalar frontend tarafında local storage içinde tutulabilir.

Örnek kullanım mantığı:

```js
localStorage.setItem("savedCandidates", JSON.stringify(savedCandidates));
```

Veri okuma:

```js
const savedCandidates = JSON.parse(localStorage.getItem("savedCandidates")) || [];
```

Kaydedilen aday noktalar için en fazla 10 kayıt kuralı uygulanacaktır.

---

## Form Validasyonları

Frontend tarafında yapılması planlanan temel validasyonlar:

- Skor değerleri 0-100 arasında olmalıdır.
- Minimum skor, maksimum skordan büyük olmamalıdır.
- Boş skor alanlarında varsayılan değer 0-100 kabul edilebilir.
- Bütçe aralığı boş bırakılırsa kullanıcı bilgilendirilmelidir.
- AC/DC seçimi yapılmadığında kullanıcı uyarılmalıdır.
- Manuel pin bırakılmadan değerlendirme yapılmamalıdır.
- Kaydedilen aday sayısı 10'u geçmemelidir.

---

## Loading, Error ve Boş Veri Durumları

Frontend tarafında kullanıcı dostu durum yönetimi yapılacaktır.

Örnek durumlar:

- Veri yükleniyor
- Backend bağlantısı başarısız
- Sonuç bulunamadı
- Veri eksik
- Hesaplanıyor
- Filtreye uygun aday bulunamadı
- Kaydetme limiti doldu

Bu durumlar ekranda açık ve anlaşılır şekilde gösterilecektir.

---

## Frontend Geliştirme Kuralları

- Backend adresi koda sabit yazılmamalıdır.
- API adresi `.env` dosyasından okunmalıdır.
- Gerçek `.env` dosyası GitHub'a gönderilmemelidir.
- Ortak API sözleşmesine uygun istek atılmalıdır.
- Endpoint değişirse `docs/API_CONTRACT.md` güncellenmelidir.
- Component yapısı düzenli tutulmalıdır.
- Tekrarlanan API kodları `services/` klasöründe toplanmalıdır.
- Form kontrolleri kullanıcı dostu olmalıdır.
- Harita ekranı mobil uyumlu olmalıdır.
- Loading ve error durumları mutlaka gösterilmelidir.
- Gereksiz veriler frontend state içinde tutulmamalıdır.

---

## Frontend Geliştirme Başladığında Kurulum Planı

Frontend geliştirme aşamasına geçildiğinde izlenecek örnek adımlar:

```bash
cd frontend
npm create vite@latest geovolt-ui
cd geovolt-ui
npm install
npm run dev
```

React/Vite geliştirme sunucusu genelde şu adreste çalışır:

```text
http://localhost:5173
```

---

## Özet

Bu klasör GeoVolt projesinin frontend tarafı için ayrılmıştır.

Frontend tarafı; harita ekranlarını, aday nokta kartlarını, filtreleme işlemlerini, manuel pin arayüzünü, kaydedilenler ekranını ve kişiselleştirme formunu içerecektir.

Frontend ve backend bağlantısı HTTP API endpointleri üzerinden yapılacaktır. Frontend backend'e istek atacak, backend'den gelen JSON verilerini kullanıcı arayüzünde gösterecektir.