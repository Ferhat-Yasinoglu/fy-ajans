# FY — Yapay Zekâ Ajansı

Tek sayfalık ajans sitesi: yapay zekâ kursu, canlı «ajantik işletim sistemi» demosu,
web tasarım paketleri, otomasyon, hakkında, başvuru formu, SSS ve iletişim.

Çerçeve yok, derleme adımı yok. Düz HTML, CSS ve JavaScript. Yazı tipi Vazirmatn
`fonts/` klasöründen yüklenir; sayfa dışarıya hiçbir istek atmaz.

## Güvenlik ve gizlilik

- Her sayfada bir İçerik Güvenliği Politikası (CSP) meta etiketi var: script yalnızca
  bu siteden, dış bağlantı ve font yok, nesne yok. Yeni bir dış kaynak eklersen CSP'yi de güncelle.
- E-posta adresi HTML'de düz metin durmaz; `js/main.js` içindeki `MAIL` değişkeninde
  iki parça olarak durur ve `data-mail` / `data-mail-text` öznitelikli öğelere sayfa açılınca yazılır.
- Formlar sunucusuzdur, mailto ile e-posta uygulamasını açar. Özgeçmiş dosyası e-postaya
  kullanıcı tarafından eklenir.
- Öğrenci girişi yalnızca arayüzdür; hiçbir veri gönderilmez. Gerçek bir panel kurmadan
  şifre toplama.
- FYOS'u gerçek bir modele bağlarken API anahtarını asla sayfaya koyma; küçük bir ara
  sunucu (ör. Cloudflare Worker) kullan, günlük sınırı ve istek boyutunu orada denetle.
- `.gitignore` gizli dosyaları dışarıda tutar. Depoya anahtar, şifre ya da `.env` girmesin.
- GitHub tarafında: hesapta iki aşamalı doğrulama açık olsun; Pages ayarında
  "Enforce HTTPS" işaretli olsun.

## Dosyalar

```
index.html            ana sayfa (bütün bölümler)
terms.html            kurallar ve gizlilik
contact/index.html    bağlantı sayfası (link-in-bio)
contact/course.html   kurs sayfası
portal/login.html     öğrenci girişi (yalnızca arayüz)
css/style.css         tüm stiller ve tasarım tokenları
js/main.js            üst çubuk, animasyonlar, FYOS sahnesi, akordeon, formlar
img/logo.svg          logo ve favicon
img/og.svg            paylaşım görseli
robots.txt  sitemap.xml  manifest.webmanifest
```

## Çalıştırma

Dosyaları herhangi bir statik sunucuyla aç. Örnek:

```
npx serve .
```

## Yayın adresi ve içerik kararları

- Site adresi `https://ferhat-yasinoglu.github.io/fy-ajans/` olarak ayarlı (canonical, Open Graph, JSON-LD, sitemap, robots). GitHub'da `fy-ajans` deposu açıp Pages'i etkinleştirmen yeterli. Başka bir alan adına geçersen bu adresi topluca değiştir.
- Kurs fiyatı `100 €`, üstü çizili eski fiyat `200 €` (index.html, contact/course.html, JSON-LD Offer).
- Kurs sayıları: 7 bölüm · 49 ders · 7 gerçek proje · 14 şablon. Gerçek müfredata göre güncelle.
- Hakkında bölümünde «FY» baş harfleri görünüyor. Fotoğraf koymak için `img/founder.jpg` ekle ve index.html'deki yorum satırındaki `<img>` etiketini aç.
- Formlar sunucusuzdur: gönderince e-posta uygulamasını mailto ile açar. Gerçek bir uç nokta için `js/main.js` içindeki `wireForm` fonksiyonunu değiştir.
- FYOS sohbeti çevrimdışı bir demodur; hazır yanıtlar `js/main.js` içindeki `ask()` bloğunda. Gerçek bir modele bağlamak için `reply()` fonksiyonunu kendi API çağrınla değiştir.
- Öğrenci girişi yalnızca arayüzdür; kimlik doğrulama yoktur.

## Tasarım tokenları

`css/style.css` başında RGB üçlüsü olarak tanımlı: zemin (`--ink-0…3`), metin
(`--fg`, `--fg-muted`, `--fg-dim`), altın vurgu (`--accent-gold`, `-bright`, `-deep`).
`<html data-theme="light">` ile açık tema paleti devreye girer.
