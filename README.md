# Pedalla Admin – Bisiklet kiralama yönetim paneli

Kargo bisikleti / e-bike kiralama işi için uçtan uca yönetim sistemi: filo, kiralama sözleşmeleri, kiracılar ve sürücüler, faturalar, depozitolar, geciken ödemeler, servis kabul formu ve servis geçmişi, yedek parça stokları, canlı harita, raporlar, roller ve yetkiler.

## Çalıştırma

Gereken tek şey **Node.js 22.13 veya üstü**. Yerel çalıştırmak için `npm install` gerekmez; tek bağımlılık olan `@libsql/client` yalnızca Vercel/Turso için kullanılır.

```bash
cd pedalla-admin
npm start            # http://localhost:3000
```

İlk açılışta veritabanı (`data/pedalla.db`, SQLite) oluşturulur ve örnek verilerle doldurulur.

| Kullanıcı | Rol | Şifre |
|---|---|---|
| admin@pedalla.bike | Yönetici (her şey) | pedalla123 |
| operasyon@pedalla.bike | Operasyon | pedalla123 |
| servis@pedalla.bike | Servis teknisyeni | pedalla123 |
| muhasebe@pedalla.bike | Muhasebe | pedalla123 |

* Örnek veriler olmadan temiz başlamak: `rm -rf data && NO_SEED=1 ADMIN_EMAIL=siz@pedalla.bike ADMIN_PASSWORD=gucluSifre npm start` (tek bir yönetici hesabıyla boş veritabanı açılır). Sonraki çalıştırmalarda yine `NO_SEED=1 npm start` kullanın.
* Port / veritabanı yolu: `PORT=8080 DB_PATH=/var/lib/pedalla/pedalla.db npm start`
* `public/demo.html` sunucusuz demo sürümüdür: aynı kod tarayıcı içinde SQLite (sql.js) ile çalışır, veriler yalnızca o tarayıcıda tutulur.

## Yayına alma (deploy)

### Vercel + Turso (ücretsiz, önerilen)

Vercel sürekli çalışan bir sunucu ve yerel veritabanı dosyası desteklemediği için veriler ücretsiz **Turso** bulut veritabanında (SQLite uyumlu) tutulur. API, `api/index.js` üzerinden Vercel fonksiyonu olarak çalışır.

1. [turso.tech](https://turso.tech) adresinde ücretsiz hesap açın ve bir veritabanı oluşturun. Bölge olarak Frankfurt (`fra`) seçin.
2. Veritabanı sayfasından **URL** (`libsql://...turso.io`) ve **token** değerlerini alın.
3. Vercel → proje → *Settings → Environment Variables* bölümüne şunları ekleyin:
   * `TURSO_DATABASE_URL` = libsql://… adresi
   * `TURSO_AUTH_TOKEN` = token
   * (isteğe bağlı) örnek veriler olmadan başlamak için `NO_SEED=1`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
4. *Deployments → Redeploy* deyin. İlk istekte tablolar oluşturulur ve (NO_SEED yoksa) örnek veriler yüklenir.

`TURSO_DATABASE_URL` tanımlı değilse Vercel tarayıcı içi demo sürümünü yayınlar. Bu sürümde veriler her tarayıcıda ayrı tutulur.

### Kendi sunucunuz / Render / Railway / Docker

`npm start` ile çalışan tam sürüm verileri yerel SQLite dosyasında tutar. Bunun için kalıcı diski olan bir sunucu gerekir: `render.yaml` (Render, ücretli disk) ve `Dockerfile` hazırdır. Veritabanı `DB_PATH` ile gösterilen dosyadadır.

## Marka

Renkler ve yazı tipi `public/brand.css` dosyasındadır. pedalla.bike sitesinin stil dosyasına bu ortamdan erişilemediği için yeşil/lime tonları tahmini seçildi; kesin hex kodlarını bu dosyaya yazmanız tüm paneli günceller. Logo `public/app.js` içindeki `LOGO` sabitidir; gerçek logoyu `public/logo.svg` olarak koyup bu sabiti `<img src="logo.svg">` ile değiştirebilirsiniz.

## Modüller

| Modül | Ne yapar |
|---|---|
| **Özet ekranı** | Kiradaki / müsait / serviste bisiklet, doluluk oranı, geciken iade, geciken ödeme tutarı, aylık tekrarlayan gelir, tutulan depozito, kritik stok; 12 aylık faturalanan–tahsil edilen grafiği; filo durumu; yaklaşan iadeler, açık servisler, son işlemler |
| **Canlı harita** | Tüm bisikletler OpenStreetMap üzerinde, duruma göre renkli; kiracı, sürücü, telefon, batarya, son sinyal; filtre ve arama; 30 sn'de bir yenileme. GPS cihazları `POST /api/telemetry` ile konum gönderir |
| **Bisikletler** | Filo kartı (şasi, batarya, GPS cihazı, sigorta, km, bakım tarihleri), şu anki kiracı ve kullanıcı, konum geçmişi (rota), kiralama ve servis geçmişi, toplam ciro |
| **Kiralamalar** | Sözleşme oluşturma (müşteri → sürücü → bisiklet → tarife; ücret/depozito otomatik), rezervasyon, teslim, uzatma, iade (km, durum, hasar bedeli, geç iade bedeli, depozitodan mahsup, servise gönderme), yazdırılabilir sözleşme |
| **Müşteriler & sürücüler** | Kurumsal (kurye firması) ve bireysel kiracılar, kimlik doğrulama, kara liste, IBAN; firmaya bağlı sürücüler (bisikleti fiilen kullanan kişi) ve şu an kullandıkları bisiklet; müşteri bakiyesi |
| **Tarifeler** | Bisiklet tipine göre günlük / haftalık / aylık fiyat ve depozito |
| **Faturalar** | Kiralama periyoduna göre otomatik dönem faturaları, hasar / servis / geç iade faturaları, KDV, vade, gecikme gün sayısı, gecikme bedeli, ödeme hatırlatması, yazdırılabilir fatura |
| **Ödemeler** | Kısmi / tam ödeme, yöntem ve referans; fatura durumu otomatik güncellenir |
| **Depozitolar** | Tahsil, iade, kesinti hareketleri; kiralama başına tutulan tutar |
| **Servis** | Servis kabul formu (km, batarya, şikayet, 12 maddelik kontrol listesi, görsel hasar, bırakılan aksesuarlar, tahmini maliyet/tarih, imza), yazdırılabilir kabul formu, durum akışı (kabul → teşhis → parça bekliyor → onarımda → hazır → teslim), parça kullanımı (stoktan otomatik düşer), işçilik, servis raporu, müşteriye faturalama, bir sonraki bakım tarihinin otomatik ayarlanması |
| **Yedek parça & stok** | Katalog, uyumlu modeller, raf, tedarikçi, alış/satış fiyatı, min. stok uyarısı, giriş/çıkış/sayım hareketleri, kullanıldığı servisler, stok değeri |
| **Raporlar** | Aylık gelir, bisiklet bazında doluluk–ciro–servis maliyeti–katkı, müşteri bazında ciro ve açık bakiye, alacak yaşlandırma, parça tüketimi, servis tipleri ve ortalama süre; hepsi CSV olarak indirilebilir |
| **Bildirimler** | Geciken ödeme, geciken / yaklaşan iade, alınmamış depozito, kritik stok, bakım zamanı, düşük batarya, GPS sinyali kesilmesi, sigorta bitişi, geciken servis |
| **Kullanıcılar, roller, ayarlar, işlem geçmişi** | Rol bazlı okuma/yazma matrisi (ekrandan düzenlenir), şirket ve finans ayarları (KDV, vade, gecikme bedelleri, işçilik ücreti, bakım aralığı), sözleşme ve servis formu metinleri, her işlemin kaydı |

## Veri modeli

```
customers ─┬─< riders                      (firmanın sürücüleri = bisikletin kullanıcısı)
           ├─< rentals >── bikes           (sözleşme: müşteri + sürücü + bisiklet + tarife)
           │      ├─< invoices ─< payments (dönem / hasar / servis faturaları ve ödemeleri)
           │      └─< deposits             (tahsil / iade / kesinti)
           └─< service_orders >── bikes
                  └─< service_parts >── parts ─< stock_moves, parts >── suppliers
bikes ─< bike_locations                    (GPS konum geçmişi)
pricing_plans, users, sessions, settings, audit_log
```

## GPS entegrasyonu

```http
POST /api/telemetry
{"key":"<Ayarlar'daki cihaz anahtarı>","tracker_id":"TRK-4101","lat":53.55,"lng":9.93,"battery":76,"speed":14,"km_delta":0.4}
```
Toplu gönderim için `{"key":"…","points":[{…},{…}]}`. `tracker_id`, bisiklet kartındaki "GPS takip cihazı ID" ile eşleşir.

## Dosya yapısı

```
server.js          HTTP sunucusu (yerel / Render / Docker), SQLite dosyası
api/index.js       Vercel fonksiyonu (Turso veritabanı)
shared/db-libsql.js, shared/dump.js, shared/node-crypto.js  Turso bağlantısı, ilk veri yükleme, şifreleme (scrypt)
shared/meta.js     Modül alanları, durumlar, roller, varsayılan ayarlar
shared/schema.js   Veritabanı tabloları
shared/api.js      Tüm iş kuralları ve REST API (sunucu ve demo ortak kullanır)
shared/seed.js     Örnek veriler
public/            Arayüz (index.html, app.js, core.js, style.css, brand.css, demo.html)
```

## Canlıya almadan önce

* Demo kullanıcılarının şifrelerini değiştirin veya pasif yapın, Ayarlar'dan GPS cihaz anahtarını değiştirin.
* Sunucuyu HTTPS arkasında (ör. Caddy / Nginx) çalıştırın ve `data/` klasörünü düzenli yedekleyin.
* Fatura numaraları ve vergi metinleri Almanya'daki yasal gereklilikler (GoBD, e-fatura) açısından muhasebecinizle kontrol edilmelidir; panel muhasebe yazılımının yerine geçmez, CSV ile aktarım yapılabilir.
