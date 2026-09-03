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
- GitHub tarafında: hesapta iki aşamalı doğrulama açık (GitHub Mobile). github.io adresleri
  için HTTPS zaten zorunlu; http istekleri otomatik https'e yönlenir, ek ayar gerekmez.

## Dosyalar

```
index.html            ana sayfa (bütün bölümler)
terms.html            kurallar ve gizlilik
contact/index.html    bağlantı sayfası (link-in-bio)
contact/course.html   kurs sayfası
portal/login.html     öğrenci girişi (yalnızca arayüz)
css/style.css         tüm stiller ve tasarım tokenları
js/main.js            üst çubuk, animasyonlar, FYOS sahnesi, akordeon, formlar
img/founder.jpg       kurucu fotoğrafı
img/course/ch1-7.svg  bölüm kapakları (vektör, sitede çizildi)
img/logo.svg          logo ve favicon
js/fyos-local.js      FYOS tarayıcı içi model (WebGPU, ücretsiz)
worker/               FYOS için Cloudflare Worker (gerçek yapay zekâ sohbeti; isteğe bağlı)
tools/set-domain.ps1  alan adı değişince tüm adresleri tek komutla çevirir
img/og.svg, og.png    paylaşım görseli (PNG, SVG'den üretildi; sosyal ağlar PNG ister)
img/icon-*.png        uygulama simgeleri (180 iOS, 192/512 manifest)
404.html              bulunamayan sayfa (kendi kendine yeter; alan adı değişince içindeki /fy-ajans/ yollarını güncelle)
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
- Kurucu fotoğrafı `img/founder.jpg` (1000×1250 JPEG); Hakkında bölümünde ve bağlantı sayfasındaki avatarda kullanılır. Değiştirmek için aynı adla üzerine yaz.
- Formlar sunucusuzdur: gönderince e-posta uygulamasını mailto ile açar. Gerçek bir uç nokta için `js/main.js` içindeki `wireForm` fonksiyonunu değiştir.
- FYOS sohbetinin üç kaynağı var, `js/main.js` içindeki `answer()` sırayla dener:
  1. `FYOS_ENDPOINT` doluysa Cloudflare Worker (`worker/`; Claude ya da ücretsiz Workers AI). Kurulum `worker/README.md`.
  2. `FYOS_LOCAL_AI` açıksa ve cihazda WebGPU varsa tarayıcı içi model (`js/fyos-local.js`, WebLLM + Qwen2.5-1.5B). Ücretsiz, hesapsız, sınırsız; model ilk soruda bir kez iner (~1 GB) ve tarayıcı önbelleğinde kalır. Telefon ve düşük bellekli cihazlarda atlanır (`FYOS_LOCAL_MODEL_SMALL` boş).
  3. Aksi hâlde 20 konulu hazır yanıtlı çevrimdışı demo.
  Yerel model için `index.html` CSP'sinde cdn.jsdelivr.net, huggingface.co ve *.hf.co izinli; kapatırsan CSP'yi de eski hâline döndür.
- Öğrenci girişi yalnızca arayüzdür; kimlik doğrulama yoktur.

## Tasarım tokenları

`css/style.css` başında RGB üçlüsü olarak tanımlı: zemin (`--ink-0…3`), metin
(`--fg`, `--fg-muted`, `--fg-dim`), altın vurgu (`--accent-gold`, `-bright`, `-deep`).
`<html data-theme="light">` ile açık tema paleti devreye girer.
