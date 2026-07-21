# GeoVolt — İlk Kurulum Talimatı

Bu belge, projeyi temiz bir bilgisayarda ilk kez çalıştıracak kişi veya yapay zekâ asistanı içindir. Komutlar Windows ve PowerShell için yazılmıştır. Önce bu dosyayı baştan sona uygula; mevcut yerel ayarları veya ham veri dosyalarını değiştirme/silme.

## Hedef mimari

```text
React + Vite (http://localhost:5173)
              │ HTTP / JSON
              ▼
.NET API (http://localhost:5000) ──► PostgreSQL + PostGIS
```

## 1. Gerekli yazılımlar

| Yazılım | Gereken sürüm | Amaç |
| --- | --- | --- |
| Git | Güncel kararlı sürüm | Kaynak kodunu almak |
| .NET SDK | 10.x | Backend'i derlemek ve çalıştırmak |
| Node.js | 22 LTS veya daha yeni LTS | Frontend bağımlılıkları ve Vite |
| npm | Node.js ile gelen sürüm | Frontend paket yöneticisi |
| PostgreSQL | 18.x | Yerel veritabanı |
| PostGIS | PostgreSQL 18 ile uyumlu, 3.6.x | Coğrafi sorgular ve raster desteği |
| EF Core CLI | 10.x | Migration'ları uygulamak |

Kurulum kontrolü:

```powershell
git --version
dotnet --list-sdks
node --version
npm --version
psql --version
```

`dotnet --list-sdks` çıktısında `10.` ile başlayan bir SDK bulunmalıdır. `psql` komutu bulunamıyorsa PostgreSQL'in `bin` klasörünü PATH'e ekleyin veya komutları pgAdmin Query Tool'da çalıştırın.

EF Core CLI'ı bir kez kurun (daha önce kuruluysa güncelleyin):

```powershell
dotnet tool install --global dotnet-ef --version 10.*
# Zaten kuruluysa:
dotnet tool update --global dotnet-ef --version 10.*
```

## 2. Kaynak kodunu alın

```powershell
git clone <REPO_URL> GeoVolt
Set-Location GeoVolt
git status
```

`<REPO_URL>` yerine ekibin verdiği GitHub depo adresini yazın. Gerekli dal farklıysa ekibin belirttiği dalı seçin:

```powershell
git switch <BRANCH_ADI>
git pull
```

Ham `Data/` klasörleri kaynak veri içerir; bunları Git'e eklemeyin. Gerçek GIS verisi gerekiyorsa ekipten ayrıca teslim alın.

## 3. PostgreSQL ve PostGIS'i hazırlayın

PostgreSQL servisini başlatın. `postgres` kullanıcısının parolasını kendi kurulumunuza göre kullanarak boş bir veritabanı oluşturun:

```powershell
psql -U postgres -d postgres -c "CREATE DATABASE geovolt_db;"
psql -U postgres -d geovolt_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U postgres -d geovolt_db -c "CREATE EXTENSION IF NOT EXISTS postgis_raster;"
```

İlk komut, veritabanı zaten varsa hata verir; bu durumda devam edin. `postgis` veya `postgis_raster` bulunamadı hatası PostGIS'in PostgreSQL 18 ile kurulmadığını/etkinleşmediğini gösterir. PostGIS kurulumu tamamlanmadan backend migration'ları çalışmaz.

## 4. Yerel gizli ayarları oluşturun

Gerçek parolaları ve JWT anahtarını Git'e göndermeyin. `backend/src/GeoVolt.Api/appsettings.Development.json` dosyasını oluşturun. Bu dosya `.gitignore` içindedir.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=KENDI_POSTGRES_PAROLANIZ"
  },
  "Jwt": {
    "Issuer": "GeoVolt",
    "Audience": "GeoVolt.Frontend",
    "SecretKey": "en-az-32-karakterlik-yalnizca-yerel-gizli-anahtar",
    "ExpirationMinutes": 120
  },
  "DefaultAdmin": {
    "FullName": "System Admin",
    "Email": "admin@geovolt.com",
    "Password": "YerelGucluParola123!"
  },
  "FRONTEND_URL": "http://localhost:5173"
}
```

Alternatif olarak `DATABASE_CONNECTION_STRING` ve `JWT_SECRET_KEY` ortam değişkenleri kullanılabilir; bunlar ayar dosyasındaki karşılıklarının önüne geçer. Kök dizindeki `.env.example` yalnızca örnektir: .NET uygulaması `.env` dosyasını otomatik okumaz.

Frontend için `frontend/.env` oluşturun:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Frontend adresini değiştirirseniz backend'de `FRONTEND_URL` (tek adres) veya `FRONTEND_URLS` (noktalı virgül ya da virgülle ayrılmış birden çok adres) ayarını da güncelleyin; aksi halde CORS isteği engeller.

## 5. Bağımlılıkları kurun ve veritabanını oluşturun

İki terminal kullanın. İlk terminalde backend bağımlılıklarını indirin, derleyin ve tüm EF migration'larını uygulayın:

```powershell
Set-Location .\backend
dotnet restore .\GeoVolt.slnx
dotnet build .\GeoVolt.slnx
dotnet ef database update --project .\src\GeoVolt.Infrastructure --startup-project .\src\GeoVolt.Api
```

İkinci terminalde frontend için kilit dosyasını esas alan deterministik kurulumu yapın:

```powershell
Set-Location .\frontend
npm ci
```

`npm ci` başarısız olursa önce Node.js sürümünü kontrol edin; paket sürümlerini rastgele değiştirmeyin. Yeni paket eklemek gerektiğinde `npm install <paket>` komutu hem `package.json` hem `package-lock.json` dosyasını günceller.

## 6. Uygulamaları başlatın

Backend terminalinde:

```powershell
Set-Location <PROJE_KOKU>\backend
dotnet run --project .\src\GeoVolt.Api
```

Frontend terminalinde:

```powershell
Set-Location <PROJE_KOKU>\frontend
npm run dev
```

Beklenen adresler:

- Arayüz: `http://localhost:5173`
- Sağlık kontrolü: `http://localhost:5000/api/health`
- Swagger (Development): `http://localhost:5000/swagger`

API ilk açılışta varsayılan yönetici hesabını veritabanına seed eder. Yerel `DefaultAdmin` ayarında farklı bir hesap vermediyseniz başlangıç bilgileri `admin@geovolt.com` / `Admin123!` olabilir. Bu yalnızca yerel geliştirme içindir; gerçek ortamlarda mutlaka değiştirin.

Hızlı doğrulama:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Set-Location <PROJE_KOKU>\frontend
npm run build
npm run lint
```

## 7. İsteğe bağlı: gerçek GIS verisini aktarın

Bu adım temel uygulamayı çalıştırmak için zorunlu değildir. Gerçek ilçe, semt, mahalle ve şarj istasyonu verisi gerekiyorsa önce ekipten alınan veri paketini proje kökünde `Data/data_1/Data` altında konumlandırın. Ardından proje kökünden çalıştırın:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-local-gis-data.ps1
```

Komut migration'ları uygular; `ILCE.geojson`, `Semttt.geojson`, `MAHALLE.geojson` ve `ARAC_SARJ.geojson` dosyalarını aktarır. Ayrıntılar için [LOCAL_GIS_DATA_SETUP.md](LOCAL_GIS_DATA_SETUP.md) belgesini izleyin. Lisans/kullanım koşulları netleşmeden kaynak verileri başka yere yüklemeyin veya commit etmeyin.

## Projede kullanılan başlıca kütüphaneler

### Backend (.NET / NuGet)

| Paket | Kullanım amacı |
| --- | --- |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | JWT ile kimlik doğrulama |
| `Microsoft.EntityFrameworkCore` ve `Microsoft.EntityFrameworkCore.Design` | ORM ve migration |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | PostgreSQL EF Core sağlayıcısı |
| `Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite` | PostGIS / uzamsal veri desteği |
| `NetTopologySuite` | Geometri tipleri ve işlemleri |
| `Swashbuckle.AspNetCore` | Swagger/OpenAPI arayüzü |
| `Microsoft.IdentityModel.JsonWebTokens` | JWT işleme |
| `Microsoft.Extensions.Configuration.*` | Yerel veri aktarma aracının yapılandırması |

### Frontend (npm)

| Paket | Kullanım amacı |
| --- | --- |
| `react`, `react-dom` | Kullanıcı arayüzü |
| `vite`, `@vitejs/plugin-react` | Geliştirme sunucusu ve derleme |
| `react-router-dom` | Sayfa yönlendirme |
| `ol` | OpenLayers harita işlemleri |
| `@turf/union` | GeoJSON/geometri birleştirme |
| `lucide-react` | Arayüz ikonları |
| `eslint`, `oxlint` ve React eklentileri | Kod kalitesi kontrolleri |

Paketlerin kesin ve güncel sürümleri için kaynak doğruluk noktaları `frontend/package.json`, `frontend/package-lock.json` ve `backend/**/*.csproj` dosyalarıdır.

## Sık karşılaşılan sorunlar

| Belirti | Kontrol / çözüm |
| --- | --- |
| `database connection string is missing` | `appsettings.Development.json` dosya yolunu ve `ConnectionStrings:DefaultConnection` değerini kontrol edin. |
| `JWT secret key must be at least 32 characters` | Yerel JWT anahtarını en az 32 karakter yapın. |
| `extension "postgis" is not available` | PostgreSQL sürümüyle uyumlu PostGIS'i yükleyip 3. adımdaki extension komutlarını yeniden çalıştırın. |
| `dotnet ef` bulunamadı | EF Core CLI kurulum komutunu çalıştırın, terminali yeniden açın. |
| Frontend API'ye erişemiyor / CORS hatası | API'nin 5000 portunda açık olduğunu, `VITE_API_BASE_URL` değerini ve backend `FRONTEND_URL(S)` ayarını kontrol edin. |
| Build sırasında DLL kilitlenmesi | Açık `GeoVolt.Api` sürecini durdurup tekrar `dotnet build` çalıştırın. |
| Port kullanımda | 5000 veya 5173 portunu kullanan eski uygulama sürecini kapatın ya da ilgili adres ayarlarını birlikte değiştirin. |

## Yapay zekâ asistanına kısa çalışma notu

- Kod değişikliğinden önce `git status` kontrol et; kullanıcının mevcut değişikliklerini koru.
- Veritabanı migration'ı eklemeden önce backend build al; oluşan migration'ı incele ve sonra uygula.
- `Data/` içindeki ham dosyaları, `.env` dosyalarını ve `appsettings.Development.json` dosyasını commit'e ekleme.
- Backend ve frontend ayrı süreçlerdir; API sözleşmesi değişirse `docs/API_CONTRACT.md` dosyasını da güncelle.
- Yeni bağımlılık eklerken nedenini, sürümünü ve kilit dosyası/migration etkisini açıkça belirt.
