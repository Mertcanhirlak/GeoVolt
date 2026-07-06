# Login Backend - Frontend ve Admin Teslim Notları

Bu projede herkese açık register ekranı yoktur.

Akış:

```text
Admin -> Firma oluşturur -> Firmaya en fazla 2 kullanıcı ekler -> Kullanıcı login olur
```

Frontend tarafında şimdilik sadece login ekranı bağlanacaktır.

## Backend adresi

```text
http://localhost:5000
```

Frontend `.env` dosyası:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Swagger UI:

```text
http://localhost:5000/swagger
```

Health check:

```http
GET /api/health
```

## Default admin

Backend çalışırken veritabanına bağlanabiliyorsa default admin otomatik oluşturulur.

```text
Email: admin@geovolt.com
Password: Admin123!
Role: Admin
```

Bu bilgiler geliştirme ortamı içindir. Teslim veya canlı ortam öncesi değiştirilmelidir.

## Auth endpointleri

| Endpoint | Metot | Açıklama | Token gerekir mi? |
|---|---|---|---|
| `/api/auth/login` | POST | Kullanıcı veya admin girişi yapar ve JWT token döner. | Hayır |
| `/api/auth/me` | GET | Token sahibi kullanıcıyı döner. | Evet |

## Admin endpointleri

Bu endpointler sadece `Admin` rolündeki kullanıcı tarafından kullanılabilir.

Swagger'da önce `/api/auth/login` ile admin girişi yapılır. Dönen response içindeki `token` değeri kopyalanır.

Swagger sağ üstteki `Authorize` alanına sadece token değeri girilir. Başına `Bearer` yazılmaz; Swagger bunu otomatik ekler.

```text
JWT_TOKEN
```

| Endpoint | Metot | Açıklama |
|---|---|---|
| `/api/admin/companies` | POST | Firma oluşturur. |
| `/api/admin/companies` | GET | Firmaları listeler. |
| `/api/admin/users` | POST | Firmaya bağlı kullanıcı oluşturur. |
| `/api/admin/users` | GET | Kullanıcıları listeler. |

## Firma oluşturma

```http
POST /api/admin/companies
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

```json
{
  "name": "VoltCharge A.Ş.",
  "taxNumber": "1234567890",
  "contactEmail": "info@voltcharge.com"
}
```

Başarılı response:

```json
{
  "success": true,
  "message": "Firma oluşturuldu.",
  "data": {
    "id": 1,
    "name": "VoltCharge A.Ş.",
    "taxNumber": "1234567890",
    "contactEmail": "info@voltcharge.com",
    "userCount": 0,
    "createdAtUtc": "2026-07-06T14:30:00Z"
  }
}
```

## Firma kullanıcısı oluşturma

Bir firmaya en fazla 2 kullanıcı eklenebilir.

```http
POST /api/admin/users
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

```json
{
  "fullName": "Firma Kullanıcısı",
  "email": "user@voltcharge.com",
  "password": "User123!",
  "companyId": 1
}
```

Başarılı response:

```json
{
  "success": true,
  "message": "Firma kullanıcısı oluşturuldu.",
  "data": {
    "id": 2,
    "fullName": "Firma Kullanıcısı",
    "email": "user@voltcharge.com",
    "role": "CompanyUser",
    "companyId": 1,
    "companyName": "VoltCharge A.Ş."
  }
}
```

Firma limit hatası:

```json
{
  "success": false,
  "data": null,
  "message": "Bir firmaya en fazla 2 kullanıcı eklenebilir."
}
```

## Login isteği

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@voltcharge.com",
  "password": "User123!"
}
```

Başarılı response:

```json
{
  "success": true,
  "message": "Giriş başarılı.",
  "data": {
    "token": "JWT_TOKEN",
    "expiresAtUtc": "2026-07-06T18:30:00Z",
    "user": {
      "id": 2,
      "fullName": "Firma Kullanıcısı",
      "email": "user@voltcharge.com",
      "role": "CompanyUser",
      "companyId": 1,
      "companyName": "VoltCharge A.Ş."
    }
  }
}
```

Hatalı login response:

```json
{
  "success": false,
  "data": null,
  "message": "E-posta veya parola hatalı."
}
```

## Token ve firma bilgisi

Login sonrası dönen JWT içinde kullanıcının firma bilgisi de bulunur:

```text
companyId
companyName
role
```

Frontend sonraki isteklerde token'ı gönderir. Backend token'a göre kullanıcının hangi firmaya ait olduğunu anlar.

```http
Authorization: Bearer JWT_TOKEN
```

Frontend örneği:

```js
localStorage.setItem("geovolt_token", response.data.token);
localStorage.setItem("geovolt_user", JSON.stringify(response.data.user));
```

```js
const token = localStorage.getItem("geovolt_token");

fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Logout:

```js
localStorage.removeItem("geovolt_token");
localStorage.removeItem("geovolt_user");
```

## Backend'i çalıştırma

```bash
cd backend
dotnet restore
dotnet build GeoVolt.slnx
dotnet ef database update --project src/GeoVolt.Infrastructure --startup-project src/GeoVolt.Api
dotnet run --project src/GeoVolt.Api
```

PostgreSQL bağlantısı varsayılan olarak:

```text
Host=localhost;Port=5432;Database=geovolt_db;Username=postgres;Password=postgres
```

Farklı parola veya kullanıcı kullanılacaksa `DATABASE_CONNECTION_STRING` environment variable olarak verilebilir.
