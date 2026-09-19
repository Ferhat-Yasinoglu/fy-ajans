# FY — Claude için proje beyni

Bu dosya her oturumda okunur; kısa kalır. İş tarifleri `.claude/skills/` altında (`/ceviri`, `/worker-teshis`,
`/gizlilik-kontrol`, `/yayin-oncesi`, `/icerik-uret`), yalnızca okuyan denetçi `.claude/agents/denetci.md`, zorla uygulanan
kural `.claude/settings.json` (kanca). Ayrıntılı dosya haritası README.md'de.

## Ne bu
Statik site (GitHub Pages, `main` dalı) + `worker/` (Cloudflare Worker: FYOS sohbeti ve sesi). Çerçeve yok,
derleme adımı yok; düz HTML/CSS/JS. Türkçe kaynaktır, de/en/fa üretilir. Worker `main`'e merge ile Workers
Builds üzerinden dağıtılır.

## Her zaman
- Metin değişikliği dört dilde yapılır: kök HTML → aynı anahtar `i18n/de,en,fa.json` → `node tools/build-i18n.mjs`
  → üretilenlerle birlikte commit (`/ceviri`).
- `worker/` değişince `node worker/test/security.mjs` «hepsi kapalı» ve `npx wrangler deploy --dry-run` temiz.
- Veri akışı değişiyorsa (yeni dış istek, sunucuda saklama, yeni sağlayıcı) gizlilik metni de değişir (`/gizlilik-kontrol`).
- Yeni dış kaynak → her sayfanın CSP meta etiketi de güncellenir (`tools/set-worker.mjs` worker için yapar).
- Sahne kartlarının sayıları depodan sayılır: `node tools/fy-stats.mjs` (`--check` yayın öncesi). Elle sayı yazılmaz;
  karşılığı olmayan kart eklenmez — site «yapmadığın işi gösterme» diyor.
- Commit mesajı Türkçe: ilk satır ne değişti, gövde neden.
- Dal + PR; `main`'e doğrudan push yok.

## Asla
- `de/ en/ fa/ js/lang/ sitemap.xml` elle düzenlenmez — üretilir. Kanca engeller.
- Anahtar, şifre, token hiçbir dosyaya yazılmaz; `wrangler secret put` ya da Cloudflare panosu.
- İzleme kodu, çerez, üçüncü taraf betik eklenmez — site bunu `terms.html`'de vaat ediyor.
- Worker'ın istemciye döndüğü yanıtta ham sağlayıcı hatası, anahtar ya da model çıktısı olmaz; yalnızca kod.
- Silme, dışarı gönderme, yayınlama: her zaman sor.

## Bana hatırlat
1. Worker'ı elle bağlarsan `index.html` CSP `connect-src`'yi unutma; tarayıcı isteği sessizce engeller. En sık yapılan hata.
2. Workers Builds: Worker adı = `wrangler.toml` `name` (`fy-ajans`), Root directory = `worker`, üretim dalı `main`.
3. Sohbet «Şu an yanıt üretemiyorum» derse önce `/health`, sonra Observability (`/worker-teshis`).
4. i18n JSON 1 boşluk girintili ve sonda satır sonu yok; başka biçimde yazınca 8.000 satır sahte fark çıkar.
5. Worker 429'u `busy`, günlük bitişi `limited + left:0` ile işaretler — istemci ikisini karıştırırsa bir 429
   sohbeti gün sonuna kadar kapatır (19 Eylül 2026 denetimi).
