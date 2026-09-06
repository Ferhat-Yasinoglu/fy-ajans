# FY — Yapay Zekâ Ajansı

Tek sayfalık ajans sitesi: yapay zekâ kursu, canlı «ajantik işletim sistemi» demosu,
web tasarım paketleri, otomasyon, hakkında, başvuru formu, SSS ve iletişim. Dört dil:
Türkçe (kaynak), Deutsch, English, فارسی.

Çerçeve yok, derleme adımı yok. Düz HTML, CSS ve JavaScript. Yazı tipleri (Vazirmatn; otomasyon şemasındaki
el yazısı vurgular için Great Vibes, SIL OFL) `fonts/` klasöründen yüklenir; sayfa kendiliğinden dışarıya istek atmaz (tek istisna:
FYOS sohbetine soru sorulunca inen tarayıcı içi model, aşağıda).

## Diller

Türkçe HTML kaynaktır; `de/`, `en/`, `fa/` klasörleri ondan **üretilir**:

```
node tools/build-i18n.mjs          # de/ en/ fa/, js/lang/*.js ve sitemap.xml'i yazar
node tools/build-i18n.mjs --check  # eksik çeviri anahtarlarını listeler
```

- Çevrilecek her öğe kaynakta `data-i18n="anahtar"` (iç HTML) ya da `data-i18n-attr="öznitelik=anahtar"` taşır.
- Çeviriler `i18n/de.json`, `i18n/en.json`, `i18n/fa.json`'da; biçim `i18n/README.md`'de.
- Bir metni değiştirince: Türkçe HTML → aynı anahtar üç sözlükte → betiği çalıştır → üretilenlerle birlikte commit.
- Üretilen dosyalar (`de/`, `en/`, `fa/`, `js/lang/`) elle düzenlenmez.
- Her sayfada dört dilin `hreflang` bağlantıları ve bir dil seçici var; Farsça sayfalar `dir="rtl"` ile
  sağdan sola akar (CSS mantıksal özellikler kullanır). `404.html` üretilmez; GitHub Pages her yol için
  aynı dosyayı verdiğinden dört dili tek sayfada gösterir.
- `js/main.js`'teki metinler `t('anahtar', 'Türkçe')` ile çekilir; diğer diller `js/lang/<dil>.js` üzerinden
  `window.FY_STRINGS`'e yazılır. Dil dosyası yüklenmezse Türkçe kalır.

## Güvenlik ve gizlilik

- Her sayfada bir İçerik Güvenliği Politikası (CSP) meta etiketi var: script yalnızca
  bu siteden, dış bağlantı ve font yok, nesne yok. Yeni bir dış kaynak eklersen CSP'yi de güncelle.
- E-posta adresi HTML'de düz metin durmaz; `js/main.js` içindeki `MAIL` değişkeninde
  iki parça olarak durur ve `data-mail` / `data-mail-text` öznitelikli öğelere sayfa açılınca yazılır.
- Formlar sunucusuzdur, mailto ile e-posta uygulamasını açar. Özgeçmiş dosyası e-postaya
  kullanıcı tarafından eklenir.
- Öğrenci paneli sayfasında şifre alanı yok; gerçek bir panel kurulana kadar da olmayacak
  (statik sitede betik çalışmazsa form alanları adres çubuğuna ve sunucu günlüklerine düşer).
  Sayfa yalnızca "panel açılınca haber ver" e-postası hazırlar; form `method="post"` taşır.
- Giriş animasyonlarının gizlemesi (`[data-reveal]`, `.nav`, `.hero__logo`, `.jstep__card`)
  yalnızca `<html class="js">` altında geçerlidir; sınıfı `js/main.js` ilk satırında ekler.
  Betik yüklenmez, engellenir ya da ayrıştırılamazsa sayfa olduğu gibi görünür kalır. Yeni bir
  giriş animasyonu eklerken gizleme kuralını `.js` altına yaz.
- `js/main.js` bilerek ES5 sözdizimiyle yazıldı; regex'lerde lookbehind (`(?<=`) kullanma —
  Safari 16.4 öncesi bunu ayrıştıramaz ve dosyanın tamamı çalışmaz.
- FYOS'u gerçek bir modele bağlarken API anahtarını asla sayfaya koyma; küçük bir ara
  sunucu (ör. Cloudflare Worker) kullan, günlük sınırı ve istek boyutunu orada denetle.
- `.gitignore` gizli dosyaları dışarıda tutar. Depoya anahtar, şifre ya da `.env` girmesin.
- GitHub tarafında: hesapta iki aşamalı doğrulama açık (GitHub Mobile). github.io adresleri
  için HTTPS zaten zorunlu; http istekleri otomatik https'e yönlenir, ek ayar gerekmez.

## Logo

Logo geometrisi (harf köşeleri, halka, ağ düğümleri, yüz paneli) `tools/build-logo.mjs` içinde kaynak görselin
piksel koordinatlarıyla tanımlı; beş SVG oradan üretilir. Logoyu değiştirirken SVG'leri elle düzenleme, betiği düzenleyip çalıştır:

```
node tools/build-logo.mjs            # img/logo-mark.svg, logo-hero.svg, ikisinin -static kopyaları, logo.svg
node tools/build-logo.mjs --raster   # + icon-180/192/512.png, favicon.ico, og*.png (Playwright + Chromium gerekir:
                                     #   npm i --no-save playwright && npx playwright install chromium)
node tools/build-logo.mjs --kit      # + brand/ marka kiti (aynı gereksinim)
```

- Animasyonlar SVG'lerin içinde CSS ile yazıldı (gezen ışık, ağ düğümleri, göz, devre izleri; hero'da dönen halka ışığı,
  ışın damlası, parçacıklar, zemin yansıması) ve `<img>` içinde çalışır. `prefers-reduced-motion` için her logo `<picture>`
  içindedir: `<source media="(prefers-reduced-motion: reduce)" srcset="…-static.svg">` animasyonsuz kopyayı seçer
  (SVG içindeki media sorgusuna `<img>` altında her tarayıcı bakmaz). Betik iki kopyayı da üretir.
- Hero sahnesi her açılışta bir kez kendini çizer (halka, ışın, harf kenarları, yüzeyler, ağ düğümleri; ~3 s), sonra döngüler sürer; animasyonsuz kopyada açılış yok.
- Hero'da `js/main.js` fareyle hafif 3B eğim verir ve kaydırma dönüşümüyle birleştirir; kutu oranı `.hero__logo` içinde SVG viewBox'ıyla aynıdır.
- Küçük boyutlar için favicon sade tutuldu (dolu altın harfler); harf logosu 30 px altında da okunur.

## Dosyalar

```
index.html            ana sayfa (bütün bölümler) — Türkçe kaynak
de/ en/ fa/           üretilmiş çeviriler (aynı klasör yapısı; elle düzenleme)
i18n/*.json           çeviri sözlükleri;  tools/build-i18n.mjs  üretici betik
js/lang/*.js          üretilmiş betik metinleri (FYOS hazır yanıtları, form mesajları)
terms.html            kurallar, gizlilik (DSGVO Md. 13), cayma hakkı ve kurs şartları
impressum.html        § 5 DDG sağlayıcı bilgileri (Almanya'da ticari site için zorunlu)
contact/index.html    bağlantı sayfası (link-in-bio)
contact/course.html   kurs sayfası
portal/login.html     öğrenci paneli (henüz kapalı; şifresiz "haber ver" formu)
css/style.css         tüm stiller ve tasarım tokenları
js/main.js            üst çubuk, animasyonlar, FYOS sahnesi, akordeon, formlar
img/founder.jpg       kurucu fotoğrafı
img/portrait-aura*.svg kurucu fotoğrafının altın aurası (canlı + sabit); tools/build-portrait.mjs üretir
img/course/ch1-7.svg  bölüm kapakları (vektör, sitede çizildi)
img/cover-scene*.svg  kurs kapağı arka plan sahnesi (canlı + sabit); tools/build-cover.mjs üretir, yazılar HTML'de
img/brain-graph*.svg  FYOS bilgi grafı: FY çekirdeği, altı küme, akan paketler (canlı + sabit); tools/build-brain.mjs üretir, etiketler HTML'de
img/logo-master.png   logo tasarımının kaynak görseli (1536×1024); og.png buradan üretilir, sitede doğrudan kullanılmaz
img/logo-mark.svg     harf logosu (üst çubuk, alt bilgi, bağlantı sayfası, panel, 404) — animasyonlu, tools/build-logo.mjs üretir
img/logo-hero.svg     ana sayfa hero sahnesi (halka, ışın, parçacıklar, yansıma) — animasyonlu, aynı betik üretir
img/logo-*-static.svg aynı iki logonun animasyonsuz kopyaları (prefers-reduced-motion; <picture> seçer)
img/logo.svg          favicon (koyu yuvarlak kare + harfler), aynı betik üretir
js/fyos-local.js      FYOS tarayıcı içi model (WebGPU, ücretsiz)
worker/               FYOS için Cloudflare Worker (gerçek yapay zekâ sohbeti; isteğe bağlı)
tools/set-domain.ps1  alan adı değişince tüm adresleri tek komutla çevirir
img/og.png, og-*.png  paylaşım görselleri (1200×630; logo-master.png + slogan, betik üretir; TR og.png, en/de/fa og-<dil>.png — build-i18n og:image'ı çevirir)
img/icon-*.png        uygulama simgeleri (180 iOS, 192/512 manifest; logo.svg'den betik üretir)
img/favicon.ico       16/32/48 px favicon (SVG favicon okumayan Safari ve eski tarayıcılar için; logo.svg'den betik üretir)
tools/build-logo.mjs  logo üretici: SVG'ler bağımlılıksız, PNG'ler için --raster (Playwright + Chromium)
brand/                marka kiti: profil fotoğrafı, şeffaf PNG, tek renk siyah/beyaz, TR/EN/DE yatay kilit (--kit üretir; liste brand/README.md)
404.html              bulunamayan sayfa (kendi kendine yeter; alan adı değişince içindeki /fy-ajans/ yollarını güncelle)
robots.txt  sitemap.xml  manifest.webmanifest
```

## Çalıştırma

Dosyaları herhangi bir statik sunucuyla aç. Örnek:

```
npx serve .
```

## Yayına almadan önce doldurulacaklar (yasal)

Site Almanya'dan tüketiciye 100 €'luk dijital kurs sattığı için üç bilgi yalnızca sende var; sayfalarda
`⟦…⟧` ile ve sarı kesikli çerçeveyle işaretli (`.placeholder`). Yayından önce hepsini gerçek bilgiyle değiştir:

- **Çağrı adresi** (sokak, posta kodu, şehir): `impressum.html` ve `terms.html` §6–§7. Posta kutusu geçerli değil (§ 5 DDG).
- **KDV durumu**: `impressum.html` "Vergi" bölümünde ve fiyat satırının altında (`index.html`, `contact/course.html`)
  iki seçenekten yalnızca doğru olanı bırak: USt-IdNr. ile "KDV dahil" ya da § 19 UStG küçük işletme notu.
  Yanlış olanı seçmek de ihtar sebebi; emin değilsen vergi danışmanına sor.
- **Üstü çizili 200 €**: PAngV § 11 gereği son 30 günün en düşük fiyatı olmalı. Kurs hiç 200 €'ya satılmadıysa
  eski fiyatı ve "%50 indirim" rozetini kaldır (`index.html`, `contact/course.html`, JSON-LD'de eski fiyat yok).
- **Cayma akışı** (dijital içerik, § 356 BGB; bildirim eksikse cayma süresi 12 ay + 14 güne uzar):
  1. Ödeme adımları e-postasına cayma bildirimini, örnek formu ve `terms.html` §6'daki iki onay cümlesini ekle;
     e-postada adres ve telefon açık yazılmalı (JS yok).
  2. Hemen erişim isteyen alıcı iki cümleyi kendi yanıtına kopyalayıp gönderir; önceden işaretli kutu ya da
     «tamam/evet» geçersiz.
  3. Erişim bilgilerini göndermeden ÖNCE, alıcının onayını ve teyidini de içeren sözleşme teyidini e-postayla
     gönder (§ 312f BGB) — bu adım atlanırsa cayma hakkı sona ermez.
  4. Onay vermeyen alıcıya erişimi 14 gün sonra aç. Yazışmaları sakla.
  Siteye gerçek bir sipariş/ödeme düğmesi eklenirse ayrıca § 356a BGB «cayma düğmesi» ve § 312j «ödeme yükümlülüğü
  altına gir» düğmesi kuralları devreye girer; bugünkü mailto akışında gerekmiyor.
- **Telefon**: cayma bildiriminin resmi model metni telefon numarası ister; Impressum'da isteğe bağlı. İş telefonu
  yoksa `terms.html` §6'daki yer tutucuyu sil.
- **Ticaret sicili**: e.K. olarak kayıtlıysan Impressum'a sicil mahkemesi ve HRA numarasını ekle; kayıtlı değilsen bir şey gerekmez.
- Bir tüketiciyle uyuşmazlık çözülemezse § 37 VSBG gereği yetkili hakem heyetini (Universalschlichtungsstelle des Bundes,
  Kehl) ve katılıp katılmayacağını yazılı (e-posta yeter) bildirmen gerekir.
- AB çevrimiçi uyuşmazlık platformu (ODR) 20 Temmuz 2025'te kapatıldı; Impressum'a ODR bağlantısı **ekleme**.
- Bu metinler hukuki tavsiye değildir; yayına almadan önce bir avukat ya da IHK kontrolü önerilir.

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
- Öğrenci paneli henüz yok; sayfa şifre sormaz, yalnızca haber listesi e-postası hazırlar. Panel açılınca formu gerçek girişe çevir.

## Tasarım tokenları

`css/style.css` başında RGB üçlüsü olarak tanımlı: zemin (`--ink-0…3`), metin
(`--fg`, `--fg-muted`, `--fg-dim`), altın vurgu (`--accent-gold`, `-bright`, `-deep`).
`<html data-theme="light">` ile açık tema paleti devreye girer.
