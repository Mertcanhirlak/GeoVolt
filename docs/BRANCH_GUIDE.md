# GitHub Branch Çalışma Rehberi

Bu doküman, GeoVolt projesinde ekip üyelerinin GitHub branch yapısı ile nasıl çalışacağını açıklar.

Projede frontend ve backend aynı GitHub reposu içinde bulunacaktır. Ancak herkes kendi görevine uygun branch üzerinde çalışacaktır.

---

## Temel Branch Mantığı

Projede doğrudan `main` branch'ine kod gönderilmeyecektir.

Tüm geliştirmeler önce feature branchlerde yapılacak, sonra Pull Request ile `develop` branch'ine birleştirilecektir.

Proje tamamlandığında `develop` branch'i `main` branch'ine merge edilecektir.

---

## Ana Branchler

| Branch | Açıklama |
|---|---|
| `main` | Kararlı, teslim edilebilir ve son sürümün tutulduğu branch. |
| `develop` | Geliştirme branch'i. Ekip üyelerinin yaptığı işler önce burada birleştirilir. |

---

## Feature Branchler

| Branch | Sorumluluk |
|---|---|
| `feature/backend-postgis-api` | PostGIS, aday nokta API'leri, manuel pin API'si |
| `feature/backend-auth-persistence` | Login, kaydedilen adaylar, kalıcılık ve ortak backend altyapısı |
| `feature/frontend-map` | Ana harita, marker, bölge overlay ve popup ekranları |
| `feature/frontend-candidate-points` | Aday nokta kartları, filtreleme, kaydedilenler ve kişiselleştirme ekranları |
| `feature/docs` | Dokümantasyon, README ve proje rehberleri |

---

## Önerilen Ekip Dağılımı

| Rol | Branch | Çalışacağı Klasör |
|---|---|---|
| Backend geliştirici 1 | `feature/backend-postgis-api` | `backend/` |
| Backend geliştirici 2 | `feature/backend-auth-persistence` | `backend/` |
| Frontend geliştirici 1 | `feature/frontend-map` | `frontend/` |
| Frontend geliştirici 2 | `feature/frontend-candidate-points` | `frontend/` |
| Dokümantasyon sorumlusu | `feature/docs` | `docs/`, `README.md` |

---

## Yeni Branch Açma

Önce `develop` branch'ine geçilir:

```bash
git checkout develop
```

Sonra güncel hali çekilir:

```bash
git pull origin develop
```

Daha sonra görev branch'i açılır:

```bash
git checkout -b feature/frontend-map
```

veya:

```bash
git checkout -b feature/backend-postgis-api
```

---

## Değişiklikleri Kontrol Etme

Çalışma yaptıktan sonra değişiklikleri görmek için:

```bash
git status
```

---

## Değişiklikleri Commit Etme

Dosyaları eklemek için:

```bash
git add .
```

Commit oluşturmak için:

```bash
git commit -m "Create frontend backend structure"
```

Commit mesajı kısa ve açıklayıcı olmalıdır.

Örnek commit mesajları:

```bash
git commit -m "Add API contract documentation"
git commit -m "Add frontend README"
git commit -m "Add backend folder structure guide"
git commit -m "Update branch guide"
```

---

## Branch'i GitHub'a Gönderme

Kendi branch'ini GitHub'a göndermek için:

```bash
git push origin branch-adi
```

Örnek:

```bash
git push origin feature/frontend-map
```

veya:

```bash
git push origin feature/backend-postgis-api
```

---

## Pull Request Mantığı

Bir özellik tamamlandığında GitHub üzerinden Pull Request açılır.

Pull Request şu şekilde açılmalıdır:

```text
feature branch  --->  develop
```

Örnek:

```text
feature/frontend-map  --->  develop
```

Pull Request açıldıktan sonra ekip arkadaşları değişiklikleri kontrol eder.

Onaylandıktan sonra branch `develop` branch'ine merge edilir.

---

## Çalışma Kuralları

- Direkt `main` branch'ine kod gönderilmez.
- Herkes kendi feature branch'inde çalışır.
- İş bitmeden Pull Request açılmaz.
- Pull Request hedefi önce `develop` olmalıdır.
- Aynı dosya üzerinde aynı anda çok kişi çalışmamaya dikkat etmelidir.
- Frontend ve backend ekipleri API sözleşmesine göre çalışmalıdır.
- Endpoint değişirse `docs/API_CONTRACT.md` güncellenmelidir.
- Backend adresi koda sabit yazılmamalıdır.
- `.env` dosyası GitHub'a gönderilmemelidir.
- Ortak dokümanlar güncel tutulmalıdır.

---

## Güncel Develop Branch'ini Kendi Branch'ine Alma

Başka ekip üyeleri `develop` branch'ine değişiklik eklediyse kendi branch'ini güncellemek için:

```bash
git checkout develop
git pull origin develop
```

Sonra kendi branch'ine dön:

```bash
git checkout feature/frontend-map
```

Develop değişikliklerini kendi branch'ine al:

```bash
git merge develop
```

Conflict çıkarsa ilgili dosyalar düzeltilir, sonra tekrar commit atılır.

---

## Conflict Çıkarsa Ne Yapılır?

Conflict, aynı dosyanın aynı bölümü iki kişi tarafından değiştirildiğinde oluşur.

Conflict olduğunda:

1. VS Code içinde conflict olan dosya açılır.
2. Doğru kalması gereken kod veya metin seçilir.
3. Dosya kaydedilir.
4. Terminalde şu komutlar çalıştırılır:

```bash
git add .
git commit -m "Resolve merge conflict"
```

---

## Örnek Çalışma Akışı

Frontend harita ekranı üzerinde çalışan kişi:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/frontend-map
```

Çalışmasını yapar.

Sonra:

```bash
git status
git add .
git commit -m "Add frontend map documentation"
git push origin feature/frontend-map
```

GitHub üzerinden Pull Request açar:

```text
feature/frontend-map  --->  develop
```

---

## Branch Özeti

| İşlem | Komut |
|---|---|
| Branchleri görme | `git branch` |
| Yeni branch açma | `git checkout -b branch-adi` |
| Branch değiştirme | `git checkout branch-adi` |
| Değişiklikleri görme | `git status` |
| Dosyaları ekleme | `git add .` |
| Commit atma | `git commit -m "mesaj"` |
| GitHub'a gönderme | `git push origin branch-adi` |
| Güncel develop alma | `git pull origin develop` |

---

## Sonuç

GeoVolt projesinde ekip üyeleri ayrı branchler üzerinde çalışacaktır.

Frontend ve backend aynı repoda fakat ayrı klasörlerde tutulacaktır.

Her özellik önce kendi feature branch'inde geliştirilecek, ardından Pull Request ile `develop` branch'ine birleştirilecektir.