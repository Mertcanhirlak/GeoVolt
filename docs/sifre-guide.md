# GeoVolt Şifre Değiştirme Özelliği Kurulum Rehberi

Bu rehber, `mertcan-branch` dalındaki zorunlu ilk giriş şifre değiştirme
özelliğini kendi bilgisayarında çalıştıracak ekip üyeleri içindir.

## Sorunun kısa açıklaması

Bu özellik PostgreSQL kullanıcısının parolasını değiştirmez. Uygulamanın
`public.users` tablosuna aşağıdaki alanı ekler:

```text
must_change_password
```

Alanı ekleyen EF Core migration:

```text
20260722110417_AddMustChangePassword
```

Kod güncellenip yerel veritabanına migration uygulanmazsa API, veritabanında
bulunmayan bu alanı okumaya çalışır. Login, kullanıcı oluşturma veya başlangıç
seed işlemi bu nedenle hata verebilir.

## Pull işleminden sonra zorunlu kurulum

Önce çalışan backend sürecini kapatın. Proje kökünde güncel dalı alın:

```powershell
git switch mertcan-branch
git pull origin mertcan-branch
```

Backend klasörüne geçip bağımlılıkları yükleyin ve projeyi derleyin:

```powershell
Set-Location .\backend
dotnet restore .\GeoVolt.slnx
dotnet build .\GeoVolt.slnx
```

Ardından **kendi yerel GeoVolt veritabanınıza** tüm bekleyen migration'ları
uygulayın:

```powershell
dotnet ef database update --project .\src\GeoVolt.Infrastructure --startup-project .\src\GeoVolt.Api
```

Migration başarılı olduktan sonra API'yi yeniden başlatın:

```powershell
dotnet run --project .\src\GeoVolt.Api
```

Yeni bir terminalde frontend'i başlatın:

```powershell
Set-Location .\frontend
npm ci
npm run dev
```

Beklenen adresler:

- Frontend: `http://localhost:5173`
- API sağlık kontrolü: `http://localhost:5000/api/health`
- Swagger: `http://localhost:5000/swagger`

## Yerel PostgreSQL parolası farklıysa

Her ekip üyesinin PostgreSQL parolası farklı olabilir. Repodaki bağlantı
bilgisini rastgele değiştirip commit etmeyin. Yalnızca açık PowerShell oturumu
için kendi bağlantınızı şu şekilde verebilirsiniz:

```powershell
$env:DATABASE_CONNECTION_STRING = 'Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=KENDI_POSTGRES_SIFRENIZ'
```

Bu değişkeni tanımladıktan sonra migration ve `dotnet run` komutlarını aynı
terminalde çalıştırın. `DATABASE_CONNECTION_STRING`, `appsettings.json`
içindeki `ConnectionStrings:DefaultConnection` değerinden önceliklidir.

Tanımlı bir ortam değişkeni olup olmadığını kontrol etmek için:

```powershell
Get-ChildItem Env:DATABASE_CONNECTION_STRING
```

Migration'ın yanlış veritabanına uygulanması sık görülen bir sorundur. EF
komutu ile API'nin aynı bağlantı bilgisini kullandığından emin olun.

## Migration kontrolü

EF migration listesini görmek için `backend` klasöründe şu komutu çalıştırın:

```powershell
dotnet ef migrations list --project .\src\GeoVolt.Infrastructure --startup-project .\src\GeoVolt.Api
```

Listede aşağıdaki migration bulunmalıdır:

```text
20260722110417_AddMustChangePassword
```

PgAdmin Query Tool üzerinden kolonun oluştuğunu kontrol etmek için:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'must_change_password';
```

Sorgu bir satır döndürmeli; alan `boolean` ve `NOT NULL` olmalıdır.

Migration geçmişini kontrol etmek için:

```sql
SELECT "MigrationId"
FROM "__EFMigrationsHistory"
WHERE "MigrationId" = '20260722110417_AddMustChangePassword';
```

## Özellik nasıl çalışır?

1. Admin panelinden oluşturulan yeni firma kullanıcısında
   `must_change_password = true` kaydedilir.
2. Kullanıcı geçici parolasıyla giriş yapar.
3. Login yanıtındaki JWT, `mustChangePassword=true` bilgisi taşır.
4. Frontend kullanıcıyı `/change-password` sayfasına yönlendirir.
5. Şifre değiştirilene kadar backend diğer korumalı isteklere `403` döndürür.
6. Başarılı şifre değişikliğinde parola hash'i yenilenir,
   `must_change_password = false` yapılır ve yeni JWT üretilir.

Yeni şifre:

- En az 6 karakter olmalıdır.
- Mevcut şifreden farklı olmalıdır.
- Şifre tekrarıyla aynı olmalıdır.

Migration sırasında mevcut kullanıcılar için alanın varsayılanı `false` olur.
Bu nedenle daha önce oluşturulmuş hesaplar otomatik olarak zorunlu şifre
değiştirme ekranına gönderilmez. Zorunluluk, admin panelinden özellik
eklendiğinden sonra oluşturulan firma kullanıcılarında başlar.

## Tarayıcıda eski oturum varsa

Kod ve veritabanı güncellendikten sonra eski JWT tarayıcıda kalmış olabilir.
Önce uygulamadaki **Çıkış Yap** düğmesini kullanıp yeniden giriş yapın.

Çıkış yapılamıyorsa tarayıcının geliştirici konsolunda:

```javascript
localStorage.removeItem("token");
localStorage.removeItem("user");
location.reload();
```

Ardından tekrar giriş yapın. Böylece yeni `mustChangePassword` claim'ini içeren
güncel JWT alınır.

## Sık karşılaşılan hatalar

### `column ... must_change_password does not exist`

Migration ilgili veritabanına uygulanmamıştır. `dotnet ef database update`
komutunu çalıştırın ve API'yi yeniden başlatın.

### `password authentication failed for user "postgres"`

Bu hata uygulama kullanıcısının şifresiyle ilgili değildir. Yerel PostgreSQL
bağlantı parolası yanlıştır. `DATABASE_CONNECTION_STRING` değerini kendi
PostgreSQL bilgilerinizle düzeltin.

### API açılıyor fakat seed işlemi atlanıyor

Logda aşağıdaki mesaj görülebilir:

```text
Default admin seed skipped. Run database migration and restart the API.
```

Önce migration'ı uygulayın, ardından API'yi kapatıp yeniden başlatın.

### Girişten sonra her istek `403` dönüyor

Kullanıcının zorunlu şifre değişikliği bekleniyordur. Frontend ve backend'in
ikisini de güncel kodla çalıştırın, eski oturumu temizleyin ve girişten sonra
`/change-password` ekranındaki işlemi tamamlayın.

### Şifreyi SQL ile değiştirmek istiyorum

`users.password_hash` alanına düz metin parola yazmayın. Parolalar hash'lenerek
saklanır. Şifre değişikliğini uygulamadaki `/change-password` akışı üzerinden
yapın.

## Hızlı kontrol listesi

- [ ] `mertcan-branch` güncel olarak çekildi.
- [ ] API kapatıldı.
- [ ] Yerel PostgreSQL bağlantısı doğrulandı.
- [ ] `dotnet restore` ve `dotnet build` başarılı.
- [ ] `dotnet ef database update` başarılı.
- [ ] `must_change_password` kolonu oluştu.
- [ ] Backend ve frontend yeniden başlatıldı.
- [ ] Tarayıcıdaki eski oturum temizlendi.
- [ ] Yeni firma kullanıcısıyla ilk giriş ve şifre değiştirme akışı test edildi.
