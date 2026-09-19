# FYOS sohbet ara sunucusu

Sitedeki FYOS kutusunun gerçek yapay zekâyla konuşması için küçük bir Cloudflare Worker.
Ücretsiz plan günde 100.000 istek verir; bizim için fazlasıyla yeter.

Neden ara sunucu: API anahtarı tarayıcıya konulamaz; kaynak kodda herkes görür ve
senin faturana harcar. Anahtar burada, Cloudflare'in gizli değişkeninde durur.
Worker ayrıca günlük soru hakkını ziyaretçi başına sayar ve yalnızca senin sitenden
gelen isteklere yanıt verir.

## Kurulum (bir kez, ~15 dakika)

Gerekenler: ücretsiz Cloudflare hesabı ve bilgisayarda Node.js. Anthropic API anahtarı
isteğe bağlıdır: girilmezse Worker, Cloudflare'in ücretsiz Workers AI katmanındaki açık modeli
(Llama 3.1 8B) kullanır; günde 10.000 nöron ücretsiz, bu site için fazlasıyla yeter.

```
cd worker
npx wrangler login                      # tarayıcıda Cloudflare'e giriş
npx wrangler kv namespace create QUOTA  # YALNIZCA yeni bir hesapta: çıkan id'yi wrangler.toml'daki
                                        # [[kv_namespaces]] id değerinin yerine yaz. Mevcut hesapta
                                        # QUOTA alanı kurulu ve id'si wrangler.toml'da yazılı.
npx wrangler secret put ANTHROPIC_API_KEY   # İSTEĞE BAĞLI: Claude istiyorsan anahtarı yapıştır; atlarsan ücretsiz Workers AI
npx wrangler deploy
```

Son komut şöyle bir adres verir: `https://fy-ajans.<hesap-adın>.workers.dev`

## Dağıtım: Cloudflare Workers Builds

Üretim dağıtımı elle yapılmaz. Cloudflare panosundaki Worker bu GitHub deposuna bağlıdır ve
`main` dalına gelen her push kendiliğinden dağıtılır. Panodaki ayarlar koddaki karşılıklarıyla
aynı olmak zorundadır:

| Panodaki alan | Değer | Neden |
| --- | --- | --- |
| Worker adı | `fy-ajans` | `wrangler.toml` içindeki `name` ile aynı olmalı; farklıysa build başka bir Worker'ı hedefler |
| Root directory | `worker` | `wrangler.toml` depo kökünde değil, bu klasörde |
| Deploy command | `npx wrangler deploy` | |
| Production branch | `main` | |

`npx wrangler deploy` komutunu elle çalıştırmak yalnızca hızlı deneme içindir. Gizli anahtarlar
(`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`) Workers Builds tarafından
ayarlanmaz: onları bir kez `npx wrangler secret put …` ile ya da panodan girersin, sonraki
dağıtımlarda oldukları yerde kalırlar.

## Teşhis: `/health`

Sohbet "Şu an yanıt üretemiyorum" diyorsa sebebini panoya girmeden görmek için tarayıcıdan aç:

```
https://fy-ajans.<hesap-adın>.workers.dev/health
```

Örnek çıktılar:

```
{"ok":true,"provider":"workers-ai","model":"@cf/meta/llama-3.1-8b-instruct","tried":[…],"voice":"openai","voiceName":"coral","voiceChars":4000}
{"ok":false,"provider":"workers-ai","model":"@cf/meta/llama-3-8b-instruct","code":"5007","tried":[…],"voice":"off","voiceHint":"npx wrangler secret put OPENAI_API_KEY"}
{"ok":false,"provider":"anthropic","model":"claude-sonnet-5","code":"401","voice":"off",…}
```

**`voice` — «gerçek ses açık mı».** `openai` | `elevenlabs` | `off`. Sağlayıcıya hiç istek atmaz,
bir kuruş harcamaz ve anahtarın kendisini asla döndürmez, yalnız varlığını. `/health` günlük
denemesi dolmuş olsa bile (429) bu alan yine döner: sesin kapalı olduğunu öğrenmek için modele
gitmek gerekmesin diye.

**`off` görüyorsan ses kapalıdır ve site sessizce tarayıcının kendi sesine düşer** — çoğu Android'de
o ses erkektir. Açmak için aşağıdaki `wrangler secret put` komutu yeter; anahtar depoya da
`wrangler.toml`'a da girmez.

`code` Workers AI için Cloudflare'in dört haneli kodu (5007 model yok, 5035 ücretli plan gerek,
3023 hesap engelli, 3036 günlük nöron hakkı bitti, 3040 kapasite yok), Anthropic için HTTP durumu
(401 anahtar, 404 model adı, 429 kota, 529 aşırı yük). Hata metni, anahtar ya da model çıktısı hiç
dönmez. Ziyaretçi başına günde 5 deneme; KV bağlı değilse 503.

Sohbet Workers AI'da modelleri sırayla dener (`AI_MODEL`, sonra koddaki `AI_FALLBACK`); Claude
anahtarı varsa önce Claude, düşerse Workers AI. Her hata `console.error` ile Observability'ye yazılır.

## Formlar: `/lead` ve `/leads` (mini CRM)

Sitedeki formlar (iletişim, paket/kurs/danışmanlık, panel haber listesi) `POST /lead` ile buraya yazar;
worker'a ulaşılamazsa site eski yol olan `mailto:` ile ziyaretçinin e-posta uygulamasını açar. Özgeçmiş
formu dosya eklediği için hep mailto. Kayıt Cloudflare KV'de **180 gün** durur (gizlilik metni: en geç altı
ay), IP kayda girmez; ziyaretçi başına günde 5 gönderim; `website` bal küpü doluysa kaydetmeden «tamam» der.

Kayıtları okumak — tarayıcıdan aç, kullanıcı adı/şifre sorar:

```
https://fy-ajans.<hesap-adın>.workers.dev/admin    # telefonda okunur sayfa: kayıtlar + randevular,
                                                   # «İlgilenildi» işareti, iki adımlı silme (KVKK)
https://fy-ajans.<hesap-adın>.workers.dev/leads    # aynı veri, JSON
```

`/admin` JavaScript'siz saf HTML'dir (sıkı CSP); işaretleme ve silme form POST'uyla yapılır ve
yabancı siteden gelen POST `Sec-Fetch-Site` denetimiyle reddedilir (tarayıcı Basic kimliği
kendiliğinden eklediği için CSRF'ye karşı). Silme geri alınamaz; randevu silinince saat yeniden boşalır.

Kullanıcı adı `wrangler.toml` içinde `ADMIN_USER` (varsayılan `FY`). Şifre için iki yol; ikisi de yoksa
uç nokta 404 döner:

```
node tools/set-admin-pass.mjs           # panoya girmeden: rastgele şifre üretir, BİR KEZ gösterir,
                                        # PBKDF2 özetini wrangler.toml'a yazar (şifre dosyaya girmez);
                                        # commit + merge → dağıtım. Kendi şifren: node tools/set-admin-pass.mjs "…"
npx wrangler secret put ADMIN_PASS      # ya da panoda Settings → Variables and Secrets (Secret);
                                        # tanımlıysa özetin önüne geçer
```

Yeni kayıt geldiğinde e-posta bildirimi isteğe bağlıdır: `RESEND_API_KEY` (secret) + `LEAD_TO`
(alıcı adres, düz değişken) tanımlıysa Resend üzerinden gider; `LEAD_FROM` verilmezse
`FY <onboarding@resend.dev>` kullanılır (Resend'in test göndericisi; yalnızca kendi adresine gönderir,
kendi alan adını doğrulayınca `LEAD_FROM`'u değiştir). Bildirim başarısız olsa da kayıt yazılmıştır.
Resend'i açarsan `terms.html` bunu zaten «kullanılabilir» diye bildiriyor; kapalıyken hiçbir istek gitmez.
`LEAD_TO` panodan girilirse `wrangler.toml`'daki `keep_vars = true` onu sonraki dağıtımlarda korur;
teşhis için `/admin/mail-test` (admin girişi ister) bir deneme e-postası atıp yalnızca durum kodunu döner:
`{"ok":true,"notify":"on","status":200}` ya da `notify:"off"` + eksik değişken adları; 401 anahtar, 403 alıcı/gönderici
(`validation_error`), 422 içerik. Ham Resend mesajı loga yazılır, istemciye dönmez.

## Randevu: `/slots`, `/book`, `/bookings`, `/booking.ics`, `/calendar.ics`

`/admin` üstünde «Bu hafta» kutusu: son 7 gün ve önceki 7 gündeki kayıt sayısı (randevu istekleri dahil);
Bölüm 6'nın dört sayısından «gelen talep». Öbür üçü platformdan elle alınır.

## Zamanlanmış görevler (cron)

`wrangler.toml` `[triggers]`: her sabah 06:00 UTC Claude sağlık kontrolü — `ANTHROPIC_API_KEY` tanımlıysa kısa bir
deneme; düşmüşse sahibe tek e-posta (konuda yalnızca kod: 401 anahtar, 400 bakiye, ağ). Cuma 06:30 UTC haftalık
özet: gelen talep son 7 gün / önceki 7 gün, yaklaşan randevu, ekinde kayıtların JSON yedeği (KV kayıtları 180 günde
silinir, yedek kalır). İkisi de `RESEND_API_KEY` + `LEAD_TO` ister; yoksa yalnızca loga yazar. Elle tetiklemek:
panoda Worker → Settings → Trigger events → cron satırında «Run». Ham sağlayıcı mesajı e-postaya girmez.

`GET /stats` (Origin denetimli, kimlik yok) yalnızca `{"bookings": N}` döner: yaklaşan randevu sayısı.
Ana sayfadaki «Boardroom» kartı buradan beslenir; kayıt içeriği hiçbir zaman dönmez.

«Ücretsiz danışmanlık görüşmesi» düğmesi randevu modunda açılır: ziyaretçi boş bir gün/saat seçer
(`GET /slots`), `POST /book` kaydı yazar (hem `book:` hem `/leads` kaydı), ziyaretçiye takvim dosyası
verilir (`/booking.ics?id&k`, yalnızca kendi anahtarıyla). Üçüncü taraf yok; kural `wrangler.toml`
`[vars]` içinde: `BOOK_TZ`, `BOOK_DAYS` (0=Pazar…6), `BOOK_HOURS` (yerel, bitiş hariç), `BOOK_SLOT_MIN`,
`BOOK_HORIZON_DAYS`, `BOOK_LEAD_HOURS`. Ziyaretçi başına günde 2 deneme; kayıt 120 gün durur.

Sahibi için iki yol:

```
https://fy-ajans.<hesap-adın>.workers.dev/bookings          # Basic auth (/leads ile aynı kimlik), JSON
https://fy-ajans.<hesap-adın>.workers.dev/calendar.ics?key=… # Google Takvim → Diğer takvimler → «URL'den ekle»
```

Takvim adresinin anahtarı depoda durmaz; `node tools/set-calendar-token.mjs` bir kez üretip gösterir,
SHA-256 özetini `CAL_FEED_TOKEN_HASH` olarak yazar. Google, abone olunan takvimleri birkaç saatte bir
tazeler; anında görmek için `/bookings`. KV atomik olmadığından aynı saniyede iki kişi aynı saati
alabilir — listede görünür, sahibi çözer.

## Siteyi bağlama

1. `js/main.js` dosyasının başındaki `FYOS_ENDPOINT` değişkenine bu adresi yaz:
   `var FYOS_ENDPOINT = 'https://fy-ajans.<hesap-adın>.workers.dev';`
2. `index.html` içindeki CSP satırında `connect-src 'self'` kısmına aynı adresi ekle:
   `connect-src 'self' https://fy-ajans.<hesap-adın>.workers.dev`
3. Commit, push. Bitti: FYOS artık her soruya kendisi cevap verir. Worker'a ulaşılamazsa
   site kendiliğinden hazır yanıtlı çevrimdışı demoya döner.

## Sesli yanıt (`/tts`)

FYOS'un sesli modu varsayılan olarak tarayıcının kendi sesiyle konuşur — ücretsiz ama robotik.
Worker'a bir seslendirme anahtarı eklersen yanıtlar gerçek bir insan sesiyle okunur.

```
npx wrangler secret put OPENAI_API_KEY       # ya da: ELEVENLABS_API_KEY
npx wrangler deploy
```

Anahtar terminalde sorulur ve doğrudan Cloudflare'in gizli değişkenine gider: depoya,
`wrangler.toml`'a ya da herhangi bir dosyaya **yazılmaz**. Kimseyle paylaşma.
Dağıtmadan önce sağlayıcı panelinde **aylık harcama tavanını** koy.

Sonra siteyi worker'a bağla — **tek komut, depo kökünde**:

```
node tools/set-worker.mjs https://fy-ajans.<hesap-adın>.workers.dev            # yalnız ses
node tools/set-worker.mjs https://fy-ajans.<hesap-adın>.workers.dev --sohbet   # ses + sohbet
node tools/set-worker.mjs --temizle                                             # bağlantıyı kaldır
```

Betik `js/main.js`'teki uç noktaları yazar, **CSP'nin `connect-src` listesine adresi ekler**,
çeviri sayfalarını yeniden üretir ve `ALLOWED_ORIGINS` sitenin adresini kapsamıyorsa uyarır.
Adresi değiştirirsen eskisini listeden çıkarır; birikmez. Sonra commit + push.

**CSP neden önemli:** worker adresi `connect-src`'de yoksa tarayıcı isteği engeller ve ses
sessizce robotik sese döner (konsola tek satırlık uyarı düşer). Betiğin bu adımı yapmasının
sebebi bu — elle yapılınca en sık atlanan yer orası.

Anahtar yoksa `/tts` 503 döner ve site tarayıcı sesine döner: yani bu bölümü hiç yapmamak
bir şeyi bozmaz.

### Sesin kimliği

FYOS genç, güler yüzlü ve samimi bir kadın sesiyle konuşur. Bu iki ayrı koldan gelir:

- **Ses tınısı:** `TTS_VOICE`. OpenAI'de varsayılan `coral` (genç, sıcak kadın); `shimmer`,
  `nova`, `sage` de benzer, `alloy` nötrdür. ElevenLabs'te bu alan voice id'dir.
- **Nasıl konuştuğu:** OpenAI'nin `instructions` alanı — `src/index.js` içindeki `TTS_STYLE`
  sabiti. Bu metin **okunmaz**, sese nasıl okuyacağını söyler: gülümseyerek, sıcak, arkadaşça,
  yeri geldiğinde hafif bir gülüşle. `TTS_INSTRUCTIONS` ile değiştirilebilir. Yalnızca
  `gpt-4o-*` seslendirme modellerinde vardır; eski `tts-1`'e gönderilmez (o alanı bilmez).
  ElevenLabs tarafında karşılığı `voice_settings`'tir: `TTS_STABILITY` (varsayılan 0,35 —
  düşük olması okumayı tekdüzelikten çıkarır), `TTS_SIMILARITY` (0,75), `TTS_STYLE_LEVEL` (0,5).

Sözlerin kendisi ayrı bir yerden gelir: `SYSTEM_PROMPT`. Ses ne kadar sıcak olursa olsun
resmî bir cümle resmî kalır, o yüzden ikisi birlikte ayarlanır.

**Gülme metne yazılmaz.** Sistem istemi modele «haha» gibi şeyler yazmayı yasaklar, çünkü
aynı metin ekranda da görünüyor ve tarayıcının kendi sesi onu harf harf okur. Gülümseme
sesin tonundan gelir. Belirli bir kelimede *senaryolu* bir kahkaha istiyorsan o, ElevenLabs
v3'ün `[laughs]` etiketleriyle olur — şu an kurulu değil.

### Ses frenleri

`src/index.js` başında:

| Fren | Değer | Ne yapar |
|---|---|---|
| `MAX_TTS_CHARS` | 500 | Tek istekte seslendirilecek en fazla karakter; fazlası kesilir. |
| `TTS_DAILY_CHARS` | 2500 | Ziyaretçi başına günlük karakter tavanı (~6 yanıt). Dolunca 429. |

Ayrıca origin denetimi, hız sınırı ve isolate içi eşzamanlılık freni sohbetle ortaktır;
sağlayıcı hata verirse ayrılan karakter hakkı iade edilir.

**Bu uç noktanın KORUMADIĞI şey:** gönderilen metnin FYOS'un kendi yanıtı olduğunu doğrulamaz.
Tarayıcı konsolunu açan biri başka bir metni de seslendirebilir — günlük karakter tavanı kadar.
Tamamen kapatmanın yolu sohbet yanıtına HMAC imza koyup `/tts`'te doğrulamaktır; ama o zaman
tarayıcı içi model ve hazır yanıtlar (ikisi de worker'a hiç uğramaz) seslendirilemez. Demo için
seçilen fren imza değil, sıkı tavandır.

### Ses maliyeti

Kesin fiyat sağlayıcıya ve modele göre değişir; buraya rakam yazmak yerine tavanı veriyoruz:
günlük en kötü durum **ziyaretçi sayısı × 2500 karakter**. Günde 100 farklı ziyaretçi =
en fazla 250.000 karakter. Sağlayıcının güncel karakter (ya da token) fiyatıyla çarp,
aylık bütçeni ona göre belirle — ve **sağlayıcı panelinde aylık harcama tavanını koy.**
Anthropic için söylenen burada da geçerli: koda hiç güvenmeyen tek fren odur.

## Ayarlar

- `ALLOWED_ORIGINS` (wrangler.toml): izinli site adresleri. Kendi alan adına geçince ekle.
- `DAILY_LIMIT`: ziyaretçi başına günlük soru hakkı (varsayılan 10).
- `MODEL`: `claude-sonnet-5` en yetenekli; `claude-haiku-4-5` yarı fiyat ve bu iş için yeterli.
  Model kimliğine tarih eki ekleme — bu dizeler olduğu gibi tamdır.
- `TTS_VOICE` / `TTS_MODEL`: seslendirme sesi ve modeli. `wrangler.toml`'da bilerek yorumda
  duruyorlar; açarsan sağlayıcıya uygun değeri yaz (OpenAI ses adı ve `gpt-4o-mini-tts`,
  ElevenLabs voice id ve `eleven_multilingual_v2`). Varsayılan ses `coral`.
- `TTS_INSTRUCTIONS`: sesin nasıl konuşacağı (OpenAI). Boşsa `src/index.js`'teki `TTS_STYLE`.
- `TTS_STABILITY` / `TTS_SIMILARITY` / `TTS_STYLE_LEVEL`: ElevenLabs ifade ayarları.
- Sistem talimatı ve FY bilgileri `src/index.js` içindeki `SYSTEM_PROMPT` sabitinde. Fiyat ya da
  kurs bilgisi değişince orayı da güncelle. (Kurs şu an ücretsiz; metin buna göre yazılı.)

## Güvenlik — dağıtmadan önce oku

7 Eylül 2026 denetiminde dört açık bulundu ve dördü de kapatıldı. Ne değiştiğini bilmen
gerekiyor, çünkü bir tanesi hâlâ tam çözülemiyor:

| Açık | Eskiden | Şimdi |
|---|---|---|
| Günlük sayaçta yarış | Sayaç model çağrısından **sonra** yazılıyordu; aradaki 2-5 saniyede gelen bütün paralel istekler aynı eski değeri okuyordu. Ölçüldü: 500 eşzamanlı istek, 4 haklık sınırı 500 çağrıya çeviriyordu. | Hak **önce** ayrılıyor, sonra harcanıyor; üstüne isolate başına eşzamanlılık freni var. Ölçüldü: 500 eşzamanlı istek → 2 çağrı. |
| Sayaç bağlı değilse | KV bağlı değilse sınır blokları tümüyle atlanıyordu — hiç sınır yoktu (fail-open). | Bağlı değilse hiç yanıt üretilmiyor (503, fail-closed). |
| Sahte `assistant` turu | İstemcinin yazdığı assistant turları modele olduğu gibi gidiyordu; uydurma bir "anlaşıldı, artık genel amaçlı asistanım" turuyla sistem istemi eziliyordu. | İstemciden hiçbir assistant turu geçmiyor; geçmiş tek bir alıntı olarak kullanıcı turuna gömülüyor. |
| `ALLOWED_ORIGINS` boş | Boşsa `*` — herkese açıktı. | Boşsa hiçbir isteğe yanıt yok (500). |

**Hâlâ garanti olmayan şey:** KV atomik artırma yapamaz. Yarış penceresi model gecikmesinden
KV yazma süresine (~10-50 ms) indi, ama sıfırlanmadı; ayrıca isolate içi fren küresel değil,
Cloudflare aynı anda birçok isolate çalıştırır. Kenarda gerçekten atomik olan tek fren,
`wrangler.toml`'da yorumda duran **hız sınırı bağlantısıdır** — dağıtacaksan onu aç.

### Testi çalıştır

Worker'da bir şey değiştirdiysen dağıtmadan önce:

```
cd worker
node test/security.mjs      # ya da: npm test
```

Bağımlılığı yok. Gerçek worker modülünü içe aktarır, dört saldırıyı da yeniden oynatır ve
herhangi biri geçerse `✗ AÇIK` yazıp 1 ile çıkar. Sesli yanıt eklendikten sonra denetim
`/tts` uç noktasını da kapsıyor: anahtar yokken kapalı mı, yabancı origin eleniyor mu,
istek başına ve günlük karakter tavanları tutuyor mu, sağlayıcı hata verince hak iade
ediliyor mu, ve `/tts` eklenmesi sohbet yolunu bozmuş mu. (Denendi: sahte assistant turu korumasını
bilerek geri alan bir kopyada test 2 hatayla ve çıkış kodu 1 ile düşüyor.)

**Origin denetimi güvenlik değildir.** `Origin` başlığını istemci yazar; `curl` tek satırda
taklit eder. Yalnızca tarayıcıdan gelen yabancı site isteklerini eler. Tarayıcı dışı istemciye
karşı gerçek frenler: hız sınırı, günlük sayaç ve harcama tavanı.

## Maliyet

Yanıtlar 350 token ile sınırlı. Girdi ise her istekte yeniden gönderilen sistem talimatı
(~800 token) + geçmiş (en fazla ~1.200 token) + soru (~100 token) — yani soru başına kabaca
900-2.100 girdi, 150-350 çıktı token.

Anthropic liste fiyatlarıyla (girdi/çıktı, milyon token başına):

| Model | Fiyat | Soru başına | 40 soru/gün | 800 soru/gün |
|---|---|---|---|---|
| `claude-sonnet-5` | $2 / $10 | ~$0,004-0,008 | ~$9/ay | ~$185/ay |
| `claude-haiku-4-5` | $1 / $5 | ~$0,002-0,004 | ~$5/ay | ~$94/ay |

Bu tablonun buradaki eski "ayda birkaç avroyu geçmez" cümlesinin yerine geçmesinin sebebi şu:
o cümle yalnızca günde ~40 soruda doğruydu. Trafik arttıkça maliyet doğrusal artıyor;
Cloudflare ücretsiz planının tavanı olan günde 100.000 istek, Sonnet 5 ile günde yüzlerce
dolar demek.

**Anthropic panelinde aylık sabit harcama limiti koy.** Koda hiç güvenmeyen tek fren budur;
yukarıdaki düzeltmelerin hepsi yanlış olsa bile fatura orada durur. Dağıtmadan önce yap.
