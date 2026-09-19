# FY — Yapay Zekâ Ajansı

Tek sayfalık ajans sitesi: yapay zekâ kursu, canlı «ajantik işletim sistemi» demosu,
web tasarım paketleri, otomasyon, hakkında, başvuru formu, SSS ve iletişim. Dört dil:
Türkçe (kaynak), Deutsch, English, فارسی.

Çerçeve yok, derleme adımı yok. Düz HTML, CSS ve JavaScript. Yazı tipleri (Vazirmatn; otomasyon şemasındaki
el yazısı vurgular için Great Vibes, SIL OFL) `fonts/` klasöründen yüklenir; sayfa kendiliğinden dışarıya istek atmaz (tek istisna:
FYOS sohbetine soru sorulunca FY’nin Cloudflare’deki ara sunucusuna giden istek, `worker/`).

## Diller

Türkçe HTML kaynaktır; `de/`, `en/`, `fa/` klasörleri ondan **üretilir**:

```
node tools/build-i18n.mjs          # de/ en/ fa/, js/lang/*.js, sitemap.xml + varlık damgası
node tools/build-i18n.mjs --check  # eksik anahtar / bayat damga (çıkış kodu 1)
```

- Çevrilecek her öğe kaynakta `data-i18n="anahtar"` (iç HTML) ya da `data-i18n-attr="öznitelik=anahtar"` taşır.
- Çeviriler `i18n/de.json`, `i18n/en.json`, `i18n/fa.json`'da; biçim `i18n/README.md`'de.
- Çevrilen sayfalar `tools/build-i18n.mjs` içindeki `SOURCES` listesindedir; yeni bir sayfa eklerken oraya da yazılır.
- Bir metni değiştirince: Türkçe HTML → aynı anahtar üç sözlükte → betiği çalıştır → üretilenlerle birlikte commit.
- Üretilen dosyalar (`de/`, `en/`, `fa/`, `js/lang/`) elle düzenlenmez.

### Varlık sürüm damgası

GitHub Pages `css/style.css` ve `js/main.js` dosyalarını kısa bir `max-age` ile veriyor ve
başlıkları değiştirmenin yolu yok. Dağıtımdan sonra bir süre ziyaretçi **yeni HTML + eski
CSS/JS** karışımı alabiliyor; bu karışım "biraz eski" değil, bozuk görünüyor (bir sınıf
HTML'e girer ama kuralı eski CSS'te yoktur). Bu yüzden `build-i18n.mjs` her çalıştığında
paylaşılan varlıkların içerik özetinden bir damga hesaplayıp sayfalara yazıyor:

```html
<link rel="stylesheet" href="css/style.css?v=55b039d8">
<script src="js/main.js?v=55b039d8"></script>
```

- Damga **içerik özeti**, zaman damgası değil: kaynak değişmediyse çıktı da değişmez.
- Üretici `tools/lib/stamp.mjs`. Özete giren dosyalar: `css/style.css`, `js/main.js`,
  `js/fyos-local.js`, `js/fyos-voice.js`, `i18n/*.json`.
- `js/main.js` damgayı kendi adresinden okuyup sonradan yüklediği betiklere devrediyor
  (`js/fyos-voice.js`, `js/fyos-local.js`), yani onlar da bayat kalmıyor.
- **CSS, JS ya da sözlük değiştirdiysen commit'ten önce betiği çalıştır.** Unutursan
  `--check` 1 ile çıkıp "eski damga" der — ama onu çalıştırmayı zorlayan bir şey yok.
- Bu, betiğin Türkçe kaynaklara dokunan tek adımı: yalnız o iki satırı yeniden yazıyor.
- Her sayfada dört dilin `hreflang` bağlantıları ve bir dil seçici var; Farsça sayfalar `dir="rtl"` ile
  sağdan sola akar (CSS mantıksal özellikler kullanır). `404.html` üretilmez; GitHub Pages her yol için
  aynı dosyayı verdiğinden dört dili tek sayfada gösterir.
- `js/main.js`'teki metinler `t('anahtar', 'Türkçe')` ile çekilir; diğer diller `js/lang/<dil>.js` üzerinden
  `window.FY_STRINGS`'e yazılır. Dil dosyası yüklenmezse Türkçe kalır.

## Güvenlik ve gizlilik

- Her sayfada bir İçerik Güvenliği Politikası (CSP) meta etiketi var: script yalnızca
  bu siteden, dış font yok, nesne yok. `index.html` ve dil sayfalarında `connect-src`
  ayrıca FYOS ara sunucusunun adresine izin verir (`tools/set-worker.mjs` yazar).
  Yeni bir dış kaynak eklersen CSP'yi de güncelle.
- Formlar (iletişim, paket/kurs/danışmanlık, panel haber listesi) worker'daki `POST /lead` ucuna yazar:
  kayıt Cloudflare KV'de en çok 180 gün durur, IP kayda girmez, sahibi `/admin` sayfasında (Basic auth; şifre özeti
  `wrangler.toml`'da, `tools/set-admin-pass.mjs`) okur, ilgilenildi diye işaretler ya da siler; `GET /leads` aynı veri JSON. Worker'a ulaşılamazsa form eski yol olan
  `mailto:` ile ziyaretçinin e-posta uygulamasını açar. Özgeçmiş formu dosya eklediği için hep mailto.
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
- Canlı sesli mod kapalı gelir ve ziyaretçi açıkça onaylamadan mikrofonu açmaz. Onay
  kutusu, sesin cihazda mı yoksa tarayıcının konuşma servisinde mi çözüleceğini söyler;
  aynı ayrım `terms.html`'de hem 2. bölümde hem DSGVO Md. 13 listesinde yazılıdır. Ses
  kaydı hiçbir yerde saklanmaz, bize gelmez. Bu davranışı değiştirirsen ikisini de güncelle.
- Worker'ın `/tts` ucu, gönderilen metnin FYOS'un kendi yanıtı olduğunu **doğrulamaz**; freni
  imza değil, sıkı karakter tavanıdır (istek başına 500, ziyaretçi başına günde 2500). Gerekçesi
  ve daha sıkı seçenek `worker/README.md` içinde. Seslendirme anahtarı eklersen sağlayıcı
  panelinde aylık harcama tavanını koy.
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
CLAUDE.md             Claude Code için proje beyni: her oturumda okunan kısa kurallar (kursun 4. bölümünün canlı örneği)
.claude/skills/       iş tarifleri — ceviri, worker-teshis, gizlilik-kontrol, yayin-oncesi; «/ceviri» diye çağrılır
.claude/agents/       alt ajan: denetci (yalnızca okur; CLAUDE.md kurallarına aykırılıkları dosya:satır ile listeler)
.claude/settings.json izinler ve kanca: üretilmiş dosyalara (de/ en/ fa/ js/lang/ sitemap.xml) elle yazmayı engeller
index.html            ana sayfa (bütün bölümler) — Türkçe kaynak
de/ en/ fa/           üretilmiş çeviriler (aynı klasör yapısı; elle düzenleme)
i18n/*.json           çeviri sözlükleri;  tools/build-i18n.mjs  üretici betik
js/lang/*.js          üretilmiş betik metinleri (FYOS hazır yanıtları, form mesajları)
terms.html            kurallar, gizlilik (DSGVO Md. 13), cayma hakkı ve kurs şartları
impressum.html        § 5 DDG sağlayıcı bilgileri (Almanya'da ticari site için zorunlu)
contact/index.html    bağlantı sayfası (link-in-bio)
contact/course.html   kurs sayfası
claude/index.html      Claude Rehberi — bağımsız başvuru sayfası ve sözlük (dört dilde)
course/chapter-1.html Bölüm 1 dersi «Önce beni tanı» (dört dilde)
portal/login.html     öğrenci paneli (henüz kapalı; şifresiz "haber ver" formu)
css/style.css         tüm stiller ve tasarım tokenları
js/main.js            üst çubuk, animasyonlar, FYOS sahnesi, akordeon, formlar
data/fy-stats.json    sahne kartlarındaki sayılar (Agents, Skills, Knowledge…); sayfa 60 sn'de bir okur
img/founder.jpg       kurucu fotoğrafı
img/portrait-aura*.svg kurucu fotoğrafının altın aurası (canlı + sabit); tools/build-portrait.mjs üretir
img/course/ch1-7*.svg bölüm kapakları — yedi altın sahne (canlı + sabit); tools/build-chapters.mjs üretir
img/course/l1-cover*.svg Bölüm 1 dersinin kapağı — dağınık dilden düzenli cevaba (21:9, canlı + sabit); tools/build-lesson1.mjs üretir
img/cover-scene*.svg  kurs kapağı arka planı — yıldızlı gece (yıldızlar, geniş altın ışık, toz; canlı + sabit); tools/build-cover.mjs üretir; takımyıldız, duraklar ve yazılar HTML'de
img/brain-graph*.svg  FYOS bilgi grafı: FY çekirdeği, altı küme, akan paketler (canlı + sabit); tools/build-brain.mjs üretir, etiketler HTML'de
img/logo-master.png   logo tasarımının kaynak görseli (1536×1024); og.png buradan üretilir, sitede doğrudan kullanılmaz
img/logo-mark.svg     harf logosu (üst çubuk, alt bilgi, bağlantı sayfası, panel, 404) — animasyonlu, tools/build-logo.mjs üretir
img/logo-hero.svg     ana sayfa hero sahnesi (halka, ışın, parçacıklar, yansıma) — animasyonlu, aynı betik üretir
img/logo-*-static.svg aynı iki logonun animasyonsuz kopyaları (prefers-reduced-motion; <picture> seçer)
img/logo.svg          favicon (koyu yuvarlak kare + harfler), aynı betik üretir
js/fyos-local.js      FYOS tarayıcı içi model (WebGPU, ücretsiz)
js/fyos-voice.js      FYOS canlı sesli mod: «Melis» uyandırma kelimesi, konuşmadan metne, metinden sese (tarayıcı API'leri, bağımlılıksız; worker varsa gerçek insan sesi)
worker/               FYOS için Cloudflare Worker (gerçek yapay zekâ sohbeti; isteğe bağlı)
tools/set-domain.ps1  alan adı değişince tüm adresleri tek komutla çevirir
tools/set-admin-pass.mjs  /leads ve /bookings şifresi: rastgele üretir, bir kez gösterir, PBKDF2 özetini wrangler.toml'a yazar
tools/set-calendar-token.mjs  /calendar.ics abonelik anahtarı: bir kez gösterir, SHA-256 özetini wrangler.toml'a yazar
tools/set-worker.mjs  worker'ı siteye bağlar: uç noktalar, CSP connect-src ve çeviriler tek komutta (--temizle ile geri alır)
img/og.png, og-*.png  paylaşım görselleri (1200×630; logo-master.png + slogan, betik üretir; TR og.png, en/de/fa og-<dil>.png — build-i18n og:image'ı çevirir)
img/og-profil*.png    bağlantı sayfasının paylaşım görseli (1200×630; founder.jpg + ad + unvan, dört dilde; tools/build-og-profile.mjs üretir)
farhad-yaqoobi.vcf    kişi kartı — «Rehbere ekle» satırının indirdiği dosya (vCard 3.0, fotoğraf gömülü; tools/build-vcard.mjs üretir)
img/icon-*.png        uygulama simgeleri (180 iOS, 192/512 manifest; logo.svg'den betik üretir)
img/favicon.ico       16/32/48 px favicon (SVG favicon okumayan Safari ve eski tarayıcılar için; logo.svg'den betik üretir)
tools/build-logo.mjs  logo üretici: SVG'ler bağımlılıksız, PNG'ler için --raster (Playwright + Chromium)
tools/build-og-profile.mjs  bağlantı sayfasının paylaşım görseli (Playwright + Chromium)
tools/build-vcard.mjs  kişi kartı üretici (Playwright + Chromium; fotoğrafın karesini kırpar)
brand/                marka kiti: profil fotoğrafı, şeffaf PNG, tek renk siyah/beyaz, TR/EN/DE yatay kilit (--kit üretir; liste brand/README.md)
404.html              bulunamayan sayfa (kendi kendine yeter; alan adı değişince içindeki /fy-ajans/ yollarını güncelle)
robots.txt  sitemap.xml  manifest.webmanifest
```

## Sahne kartlarının sayıları

Ana sayfadaki FY sahnesinde ağın çevresindeki kartlar (Agents, Studio, Coaches, Memory, Skills,
Knowledge, Boardroom) sayılarını `data/fy-stats.json`'dan okur. Dosyayı düzenleyip gönderdiğinde
açık duran sayfalar bile 60 saniye içinde yeni sayıya geçer; yenilemek gerekmez.

- Bir anahtarı silersen o kart HTML'deki değerinde kalır. Dosya hiç yoksa ya da ağ yoksa hiçbir
  şey bozulmaz: bütün kartlar HTML'deki sayılarla görünür.
- `analytics` kartı ayrıdır: dosyadan değil, sahnedeki ağın o ziyarette tamamladığı istek
  sayısından beslenir (dosyadaki `analytics` değeri ona eklenen başlangıçtır).

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
- Kurucu fotoğrafı `img/founder.jpg` (1000×1000 JPEG); Hakkında bölümünde ve bağlantı sayfasındaki avatarda kullanılır. Değiştirmek için aynı adla üzerine yaz.
  Dosya dairesel bir avatar: fotoğraf daire içinde, daire dışı portre zemini (`#0b0906`) ile dolu. Sitede iki yerde de
  yuvarlak çerçeveye girdiği için köşeler görünmez. Daire, çerçeveden %4 taşacak şekilde ölçeklendi — imleç paralaksı
  görseli ±4px kaydırıyor, pay olmasa kenarda koyu bir şerit açılırdı (`@keyframes portrait-zoom` de bu yüzden 1.0'dan
  değil 1.04'ten başlar).
  Fotoğraf iki türev besler; üzerine yazdıktan sonra ikisini de yenile:
  `node tools/build-og-profile.mjs` (paylaşım görselleri) ve `node tools/build-vcard.mjs` (kişi kartı).
  Kişi kartı üreticisi kaynağın dairesel mi dikdörtgen mi olduğunu köşelerinden anlar: dairesel ise dairenin içine sığan
  kareyi alır (kartta koyu köşe kalmasın), dikdörtgen ise sayfadaki kırpımı uygular
  (`object-fit: cover`, `object-position: 50% 28%`).
- Kişi kartı `farhad-yaqoobi.vcf` kökte durur, dört dilin bağlantı sayfası da onu gösterir (build-i18n yalnızca köke
  işaret eden göreli yolları derinleştirir). Ad, unvan, sosyal hesaplar `contact/index.html`'den, e-posta `js/main.js`'ten
  okunur — kartta ayrıca elle güncellenecek bir yer yok. E-posta adresi bu dosyada düz metin durur (sayfada durmuyor).
- Formlar sunucusuzdur: gönderince e-posta uygulamasını mailto ile açar. Gerçek bir uç nokta için `js/main.js` içindeki `wireForm` fonksiyonunu değiştir.
- Günlük soru hakkı **10**. Sayı üç yerde birden tutarlı olmalı: `js/main.js` içindeki `DAILY`,
  `index.html`'deki «en fazla N soru» notu (ve üç çeviride aynı anahtar) ve worker'daki
  `DAILY_LIMIT`. Worker bağlı değilse yalnızca ilk ikisi geçerlidir.
- FYOS sohbetinin üç kaynağı var, `js/main.js` içindeki `answer()` sırayla dener:
  1. `FYOS_ENDPOINT` doluysa Cloudflare Worker (`worker/`; Claude ya da ücretsiz Workers AI). Kurulum `worker/README.md`.
  2. `FYOS_LOCAL_AI` açıksa ve cihazda WebGPU varsa tarayıcı içi model (`js/fyos-local.js`, WebLLM + Qwen2.5-1.5B). Ücretsiz, hesapsız, sınırsız; model ilk soruda bir kez iner (~1 GB) ve tarayıcı önbelleğinde kalır. Telefon ve düşük bellekli cihazlarda atlanır (`FYOS_LOCAL_MODEL_SMALL` boş).
  3. Aksi hâlde 20 konulu hazır yanıtlı çevrimdışı demo.
  Yerel model için `index.html` CSP'sinde cdn.jsdelivr.net, huggingface.co ve *.hf.co izinli; kapatırsan CSP'yi de eski hâline döndür.
- **Canlı sesli mod** (`js/fyos-voice.js`): sohbet çubuğundaki mikrofon düğmesi açar. Açıkken tıklama yoktur —
  «Melis» denince FYOS uyanır, soruyu dinler, yanıtı sesli okur ve yine beklemeye döner. Sözünü kesebilirsin:
  ziyaretçi konuşmaya başlayınca okuma durur. Soru yine yukarıdaki üç kaynaktan yanıtlanır ve aynı günlük
  hakkı harcar; sesli modda daktilo animasyonu atlanır (yoksa konuşma saniyelerce gecikir).
  - Dış bağımlılık ve yeni CSP kaydı yok: her şey tarayıcının `SpeechRecognition` ve `speechSynthesis` API'leri.
    Motor dosyası ancak sesli mod ilk açıldığında iner.
  - Tarayıcı cihaz içi tanımayı destekliyorsa (`SpeechRecognition.available({processLocally:true})`, Chrome 138+)
    ses cihazdan hiç çıkmaz. Desteklemiyorsa tanıma tarayıcının kendi servisinde yapılır; bu, açılış onayında
    açıkça yazılır ve `terms.html`'de belgelenmiştir. Onay verilmeden mikrofon açılmaz.
  - İlk açılışta tarayıcı izni bir kez sorar. Sonraki ziyaretlerde izin hâlâ duruyorsa sesli mod kendiliğinden
    başlar (`navigator.permissions` 'granted' dönerse); izin yoksa hiçbir şey yapılmaz, sürpriz izin penceresi çıkmaz.
  - Uyandırma kelimesi **«Melis»**. Tanıyıcı bunu «meliss», «melisa», «mehlis» diye de yazabildiğinden
    1 harf uzaklığa kadar eşleşir. Bu tolerans gerçek bir kelimeye denk gelirse orası ayrıca kapatılır:
    «meclis» tek harf silinince «melis» oluyor ve FYOS'u boş yere uyandırırdı (`NOT_WAKE` listesi).
    İsmi değiştirirsen `WAKE_DEFAULT`, `NOT_WAKE` ve dört dildeki `voiceWake` / `voiceConsentText`
    metinleri birlikte değişir; `terms.html` de ismi anıyor.
    Soru metni her zaman ziyaretçinin söylediği hâliyle kesilir (Türkçe harfler ve noktalama korunur).
  - `SpeechRecognition` olmayan tarayıcılarda mikrofon düğmesi hiç gösterilmez; yazılı sohbet olduğu gibi çalışır.
  - **Kendini toparlar.** Sahada «bir kez cevap verdi, sonra sesi kesildi» diye bildirilen hatanın
    dört ayrı sebebi vardı, dördü de kapatıldı — hepsi sesli modu kalıcı olarak sağır bırakıyordu:
    1. Chrome, yanıt okunurken sürekli dinlemeyi arka arkaya kapatıyor. Eski kod bu kapanmaları
       sayıyordu ve 10 saniyede 12 tanesi sesli modu **tümden kapatıyordu**. Artık vazgeçme yok;
       bekleme yalnızca açılış gerçekten başarısız olduğunda (onstart hiç gelmediğinde) uzuyor.
    2. `rec.start()` «zaten çalışıyor» dışında bir sebeple patlarsa hata yutuluyordu; `onend` de
       gelmediği için mikrofon bir daha hiç açılmıyordu. Artık tanıyıcı baştan kuruluyor.
    3. Tanıyıcı sessizce de ölebiliyor. 5 saniyede bir çalışan sağlık nöbetçisi, dinlemede olmamız
       gerekirken 15 saniye hiç olay gelmediyse tanıyıcıyı yeniliyor.
    4. Chrome uzun bir konuşma parçasında `onend`'i bazen hiç göndermiyor. Yanıt artık cümlelere
       (~180 karakter) bölünerek okunuyor; her parçanın kendi nöbetçisi var ve konuşmanın gerçekten
       başlayıp başlamadığı 1,5 saniyede anlaşılıyor.
    Ayrıca `js/main.js` tarafında yanıt kaynağı hiç dönmezse `busy` sonsuza kadar açık kalıyordu ve
    o andan sonraki her soru sessizce düşüyordu: artık 60 saniyelik bir emniyet süresi var, ilerleme
    geldikçe tazeleniyor (1 GB'lık model inişi kesilmez).
  - **FYOS'un sesi ve dili: genç, güler yüzlü, samimi.** Üç ayrı katmandan gelir ve üçü ayrı ayrı ayarlanır:
    1. *Tınısı* — worker'da `TTS_VOICE` (varsayılan OpenAI `coral`). Tarayıcı sesinde ise
       `pickVoice` kadın sesini tercih eder: ses listeleri cinsiyet bilgisi vermediği için
       bilinen adlarla **kelime kelime** eşleşir (alt dize araması «Microsoft Hedda - German
       (Germany)» adındaki «man» yüzünden kadın sesi erkek sayıyordu). Önemi şu: Windows'ta
       Türkçe varsayılanı «Tolga» (erkek), yanında «Emel» (kadın) durur.
       **Ses listesi geç gelir.** `getVoices()` çoğu tarayıcıda ilk çağrıda boş döner ve
       `voiceschanged` olayı bazı tarayıcılarda hiç gelmez. Liste boş kabul edilirse hiç ses
       seçilemez ve tarayıcı kendi varsayılanını kullanır — Türkçede erkek. Bu yüzden liste
       dolana kadar yoklanır (en çok 5 sn), dolunca önbelleğe alınır ve sesli mod açılırken
       önceden ısıtılır.
       Belirli bir sesi sabitlemek için `js/main.js` içindeki `FYOS_VOICE_NAME` (adın bir
       parçası yeter).
       **Perde (`FYOS_VOICE_PITCH`, varsayılan `'auto'`):** seçilen ses *bilinen bir erkek*
       sesiyse perdesi yükseltilir (1,45) ve hız biraz düşer. Kadın seste ve **cinsiyeti
       bilinmeyen** seste hiç dokunulmaz — Android'deki «Google Türkçe» gibi adlar çoğu
       cihazda zaten kadındır ve inceltilirse cıyaklar; bilmediğin yerde müdahale etmek
       etmemekten kötüdür. Sayı yazmak her sesde o perdeyi kullanır; `1` inceltmeyi kapatır.
       Dürüst olalım: bu incelmiş bir erkek sesidir, kadın sesi değil.
       **Ses teşhisi:** adrese `?ses` eklenip mikrofon açılınca FYOS cihazdaki bütün sesleri,
       hangisini seçtiğini ve kadın sayıp saymadığını sohbete yazar (telefonda da görünür;
       sıradan ziyaretçi bunu hiç görmez). Konsolda karşılığı
       `FYOS_VOICE.voices().then(console.log)`. Kadın ses bulunamazsa konsola ayrıca bir kez
       sebep yazılır. «Hâlâ erkek sesi» şikâyetinde bakılacak ilk yer burasıdır: liste kısaysa
       ve içinde kadın ses yoksa sorun kodda değil, cihazdadır.
       **Cihaz sınırı gerçektir.** Windows'ta yerel Türkçe TTS çoğu kurulumda yalnızca
       «Microsoft Tolga» (erkek) içerir; Edge, Azure'un çevrimiçi «Emel» sesini de sunduğu için
       aynı bilgisayarda Edge'de kadın, Chrome'da erkek çıkabilir. Her cihazda garanti genç
       kadın sesi için tek yol worker'a seslendirme anahtarı koymaktır (`worker/README.md`).
    2. *Nasıl konuştuğu* — worker'daki `TTS_STYLE` (OpenAI `instructions`). Bu metin okunmaz,
       sese gülümseyerek ve arkadaşça okumasını söyler. ElevenLabs'te karşılığı `voice_settings`.
    3. *Ne söylediği* — sistem istemi (`SYSTEM_PROMPT` ve `js.system`, dört dilde) ve hazır
       yanıtlar. Ses ne kadar sıcak olsa da resmî bir cümle resmî kalır, o yüzden üçü birlikte gider.
    **Gülme metne yazılmaz:** sistem istemi «haha» yazmayı yasaklar, çünkü aynı metin ekranda da
    görünür ve tarayıcının kendi sesi onu harf harf okur. Gülümseme sesin tonundan gelir.
  - **Ses kalitesi iki kademeli.** Varsayılan: tarayıcının kendi sesi — ücretsiz, çevrimdışı, robotik.
    Worker'a bir seslendirme anahtarı (`OPENAI_API_KEY` ya da `ELEVENLABS_API_KEY`) eklenirse
    yanıtlar gerçek bir insan sesiyle okunur; kurulum `worker/README.md` içinde. Adres
    `FYOS_VOICE_ENDPOINT` ile verilir, boşsa `FYOS_ENDPOINT + '/tts'` kullanılır.
    Uzak ses herhangi bir sebeple gelmezse (anahtar yok, ağ yok, günlük karakter hakkı bitti,
    CSP engelledi) sessizce tarayıcı sesine dönülür ve konsola tek satırlık uyarı düşer —
    FYOS hiçbir durumda sessiz kalmaz. `blob:` ses çalabilmek için CSP'de `media-src 'self' blob:` var.
- Öğrenci paneli henüz yok; sayfa şifre sormaz, yalnızca haber listesi e-postası hazırlar. Panel açılınca formu gerçek girişe çevir.

## Tasarım tokenları

`css/style.css` başında RGB üçlüsü olarak tanımlı: zemin (`--ink-0…3`), metin
(`--fg`, `--fg-muted`, `--fg-dim`), altın vurgu (`--accent-gold`, `-bright`, `-deep`).
`<html data-theme="light">` ile açık tema paleti devreye girer.
