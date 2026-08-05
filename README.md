

```markdown
# ⚡ GeoVolt — Elektrikli Araç Şarj İstasyonu Coğrafi Karar Destek Sistemi

[![Basarsoft](https://img.shields.io/badge/Project-Başarsoft%20Staj%20Projesi-blue?style=for-the-badge&logo=googlemaps)](https://www.basarsoft.com.tr/)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.0-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.6.2-27AE60?style=for-the-badge&logo=qgis)](https://postgis.net/)
[![OpenLayers](https://img.shields.io/badge/OpenLayers-10.0-1F618D?style=for-the-badge&logo=openlayers)](https://openlayers.org/)

**GeoVolt**, Ankara'nın Çankaya ilçesinde Elektrikli Araç (EV) şarj istasyonu kurulması için en uygun aday lokasyonları çok kriterli coğrafi analizler (MCDA) ve altıgen hücre ağları (Hexagon Grids) kullanarak belirleyen, etkileşimli bir **Coğrafi Karar Destek Sistemidir (Spatial Decision Support System - SDSS)**.

> 🏢 Bu proje, **Başarsoft Bilgi Teknolojileri** staj programı kapsamında bir ekip projesi olarak geliştirilmiştir.

---

## 📌 Projenin Amacı ve Özeti

Elektrikli araç kullanımının hızla artmasıyla birlikte şarj istasyonlarının rastgele değil, coğrafi ve teknik verilere dayalı olarak konumlandırılması kritik bir ihtiyaç haline gelmiştir. 

**GeoVolt**; bölgenin nüfus yoğunluğunu, ilgi noktalarını (POI), elektrik trafo kapasitelerini, ana yol ağlarını, mevcut şarj istasyonlarının hizmet açıklarını ve arazi eğimini aynı platformda bir araya getirerek analitik bir uygunluk puanı (0-100) üretir ve yatırımlar için karar desteği sağlar.

---

## ✨ Öne Çıkan Özellikler

- 📐 **Çok Kriterli Coğrafi Analiz (MCDA):** 6 farklı coğrafi veri katmanını ağırlıklandırarak bölgeleri puanlama.
- 🔷 **Altıgen (Hexagon) Hücre Analizi:** Çankaya bölgesini 200m kenar uzunluklu hücrelere bölerek hassas bölgesel haritalama.
- 📍 **Manuel Pin & Konum Değerlendirmesi:** Haritada istenen noktaya tıklayarak o noktanın uygunluk skorunu, alt parametrelerini ve en yakın alternatif alanları inceleme.
- 💰 **Kurulum Maliyet Analizi:** Seçilen konum için istasyon tipi ve soket tercihlerine göre tahmini yatırım ve altyapı maliyet hesabı.
- 🚀 **Yüksek Performanslı Veri Aktarım Hattı:** PostgreSQL Binary COPY altyapısı ile 120.000+ coğrafi nesneyi saniyeler içinde veritabanına aktarma, staging ve doğrulama (validation) süreçleri.
- 🔒 **Güvenlik ve Yönetim:** JWT tabanlı rol ve yetki yönetimi, dinamik/sürümlenebilir skor profili konfigürasyonu.

---

## 🏗️ Sistem Mimarisi

Proje, **Clean Architecture** prensiplerine uygun olarak frontend ve backend uygulamalarının birbirinden tamamen ayrıldığı katmanlı bir mimariyle geliştirilmiştir:

```text
       ┌──────────────────────────────────────────┐
       │   React 19 + OpenLayers (Vite 6) UI      │
       └────────────────────┬─────────────────────┘
                            │ HTTP / REST / JSON / JWT
                            ▼
       ┌──────────────────────────────────────────┐
       │     .NET 10 RESTful Web API              │
       │ ┌──────────────────────────────────────┐ │
       │ │ Clean Architecture (Domain/App/Infra)│ │
       └─┴──────────────────┬───────────────────┴─┘
                            │ Entity Framework Core + NetTopologySuite
                            ▼
       ┌──────────────────────────────────────────┐
       │      PostgreSQL 18 + PostGIS 3.6.2       │
       │ (Schemas: gis, staging, analysis)        │
       └──────────────────────────────────────────┘
```

---

## 🛠️ Kullanılan Teknolojiler

### Backend & Veritabanı
- **C# / .NET 10 Web API:** RESTful endpoint'ler, katmanlı mimari ve iş mantığı.
- **Entity Framework Core 10:** ORM, veritabanı migration yönetimi ve spatial tipler.
- **PostgreSQL 18 & PostGIS 3.6.2:** Coğrafi nesnelerin (Point, LineString, MultiPolygon) saklanması ve spatial sorgular (`ST_DWithin`, `ST_Distance`, `ST_MakeValid`).
- **Npgsql & NetTopologySuite:** PostgreSQL spatial verilerin .NET tiplerine eşlenmesi.
- **PostgreSQL Binary COPY:** Büyük GeoJSON veri setlerinin yüksek performansla aktarımı.
- **JWT & Swagger:** Güvenlik ve API dokümantasyonu.

### Frontend
- **React 19 & Vite 6:** Modern, responsive ve hızlı kullanıcı arayüzü.
- **OpenLayers:** Etkileşimli harita render etme, katman ve overlay yönetimi.
- **Turf.js:** İstemci tarafında yardımcı coğrafi hesaplamalar.
- **Lucide React & React Router:** Arayüz ikonları ve sayfa yönlendirmeleri.

---

## 📊 Kullanılan Coğrafi Veri Setleri (Çankaya Bölgesi)

| Veri Seti | Tür | Kayıt Sayısı | Açıklama |
| :--- | :--- | :---: | :--- |
| **ILCE** | MultiPolygon | 1 | Çankaya ilçe sınırı |
| **MAHALLE** | MultiPolygon | 124 | Mahalle sınırları ve nüfus verileri |
| **Semttt** | MultiPolygon | 28 | Analitik semt sınırları |
| **TRAFO** | Point | 942 | Elektrik trafoları ve altyapı noktaları |
| **ARAC_SARJ** | Point | 1.767 | Mevcut şarj istasyonları ve soketler |
| **YOL** | LineString | 50.452 | Yol ağı ve tip kategorileri |
| **POI** | Point | 73.271 | İlgi noktaları (AVM, Restoran, Hastane vb.) |
| **Eğim Rasterı**| GeoTIFF | 1465×1036 px | 30m çözünürlüklü DEM arazi eğim verisi |

---

## 🧮 Uygunluk Skoru Puanlama Modeli

Uygunluk skoru, aşağıdaki coğrafi kriterlerin yüzdelik dilim (percentile) sırasına göre normalize edilmiş ağırlıklı toplamından oluşur:

$$\text{Uygunluk Skoru} = 0.25 \cdot \text{Trafo} + 0.20 \cdot \text{Yol} + 0.20 \cdot \text{POI} + 0.15 \cdot \text{Nüfus} + 0.10 \cdot \text{Hizmet Açığı} + 0.10 \cdot \text{Düşük Eğim}$$

---

## 📁 Proje Klasör Yapısı

```text
GeoVolt/
├── backend/                  # .NET 10 Web API Çözümü
│   ├── GeoVolt.Api/          # Controllers, Middlewares, Endpoints
│   ├── GeoVolt.Application/  # DTOs, Services, Business Logic
│   ├── GeoVolt.Domain/       # Entities, Value Objects
│   └── GeoVolt.Infrastructure/# PostGIS EF Core, Repositories, Binary COPY
├── frontend/                 # React 19 + OpenLayers Uygulaması
│   ├── src/
│   │   ├── components/       # Harita ve Arayüz Bileşenleri
│   │   ├── pages/            # Harita, Analiz, Yönetici Panelleri
│   │   └── services/         # API İstek Servisleri
├── docs/                     # API Sözleşmesi, Kurulum ve Mimari Dokümanlar
└── README.md
```

---

## 🚀 Başlangıç ve Kurulum

### Önkoşullar
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js v18+](https://nodejs.org/)
- [PostgreSQL 18](https://www.postgresql.org/download/) ve [PostGIS 3.6](https://postgis.net/install/) eklentisi

### 1. Veritabanı ve Backend Kurulumu

```bash
# Backend klasörüne gidin
cd backend

# Appsettings içindeki PostgreSQL bağlantı cümlesini (Connection Strings) düzenleyin
# Migration'ları veritabanına uygulayın
dotnet ef database update --project GeoVolt.Infrastructure --startup-project GeoVolt.Api

# API'yi çalıştırın
dotnet run --project GeoVolt.Api
```
*Backend varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.*

### 2. Frontend Kurulumu

```bash
# Frontend klasörüne gidin
cd frontend

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun ve API adresini girin
# VITE_API_BASE_URL=http://localhost:5000

# Uygulamayı başlatın
npm run dev
```
*Frontend varsayılan olarak `http://localhost:5173` adresinde çalışacaktır.*

---

## 👏 Teşekkür ve İletişim

Bu proje **Başarsoft Bilgi Teknolojileri** staj programı sürecinde veri doğrulama, coğrafi bilgi sistemleri standartları ve ekip çalışması prensiplerine uygun olarak geliştirilmiştir. Süreç boyunca destek veren Başarsoft ekibine ve mentörlerimize teşekkür ederiz.

🤝 **Ekip Üyeleri:** [Mertcan Hırlak](https://github.com/Mertcanhirlak), Rabia Teberik, Talha Uçar, Ilgın Bor.
```
