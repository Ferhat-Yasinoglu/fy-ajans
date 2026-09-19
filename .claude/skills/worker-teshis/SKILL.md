---
name: worker-teshis
description: FYOS sohbeti «Şu an yanıt üretemiyorum» derse, ses çalışmazsa ya da worker/ değişince: teşhis, test, dağıtım. «Worker», «FYOS yanıt vermiyor», «dağıt», «Cloudflare» dendiğinde kullan.
---
## Teşhis sırası
1. Tarayıcıdan `https://fy-ajans.ferhatyasinoglu.workers.dev/health` (günde 5 deneme/IP). Alanlar:
   `ok`, `provider` (anthropic | workers-ai), `model`, `code`, `tried`,
   `voice` (openai | elevenlabs | off) + `voiceName`/`voiceChars`.
   - Workers AI kodları: 5007 model yok · 5035 ücretli plan gerek · 3023 hesap engelli · 3036 günlük
     ücretsiz nöron hakkı bitti · 3040 kapasite yok.
   - Anthropic: 401 anahtar · 404 model adı · 429 kota · 529 aşırı yük.
   - `reason: kv` → QUOTA KV bağlı değil (fail-closed) · `reason: limit` → /health sınırı, gece sıfırlanır.
2. Panoda fy-ajans → Observability → en yeni olay: `Workers AI hatası <model> <kod>` ya da
   `Anthropic hata <durum>` satırı. (`[observability] enabled = true` wrangler.toml'da.)
3. Site tarafı: `js/main.js` başında `FYOS_ENDPOINT` dolu mu; `index.html` CSP `connect-src` worker
   adresini içeriyor mu. İkisini de `node tools/set-worker.mjs <adres> --sohbet` yazar.

## Ses erkek çıkıyorsa
`/health` içindeki `voice` alanına bak — sağlayıcıya gitmez, `/health` sınırı dolsa bile döner.
- `voice: "off"` → anahtar yok. `npx wrangler secret put OPENAI_API_KEY` (ya da `ELEVENLABS_API_KEY`);
  bir kez girilir, depoya girmez. Varsayılan ses `coral` (genç, sıcak kadın). Sağlayıcı panelinde
  aylık harcama tavanı koy.
- `voice` dolu ama ses yine erkek → günlük ses hakkı bitmiştir (`TTS_DAILY_CHARS`, ~10 yanıt).
  Site bunu artık ekranda söylüyor (`#askVoiceNote`), sessizce düşmüyor.
- İkisi de değilse cihazın kendi sesi okunuyordur: siteyi `?ses` ile aç (ör. `…/?ses`), cihazdaki
  ses listesi ekrana gelir. Türkçe için tek ses varsa ve o erkekse tarayıcı tarafında yapılacak
  bir şey yoktur — gerçek ses şarttır. Belirli bir sesi sabitlemek için `js/main.js`
  içindeki `FYOS_VOICE_NAME`.

## Düzeltme
- Model sorunu (5007/5035): `worker/wrangler.toml` `AI_MODEL` (birden fazla için `AI_MODELS`, virgülle);
  sıra `worker/src/index.js` içindeki `AI_FALLBACK`. 3036/3023 model değiştirmekle geçmez.
- Claude'a geçiş: panoda Worker → Settings → Variables and Secrets → `ANTHROPIC_API_KEY` (Secret).
  Kod kendiliğinden Claude'a döner; Claude düşerse Workers AI'a geri düşer. Anthropic panelinde aylık
  harcama tavanı koy — koda güvenmeyen tek fren.
- `ALLOWED_ORIGINS` sitenin origin'i olmalı: şema + host, sonda `/` yok. Alan adı değişince
  `node tools/set-domain.mjs` sonra bu değeri de güncelle.

## Doğrulama (her worker değişikliğinde, zorunlu)
```
cd worker && node test/security.mjs                      # SONUÇ: hepsi kapalı
WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run   # bağlantılar listelenir, ERROR yok
```
Yeni davranış eklediysen `test/security.mjs`'e numaralı bir denetim ekle (17-21 örnek).

## Dağıtım
- Elle değil: `main`'e merge → Workers Builds (`Root directory = worker`, deploy `npx wrangler deploy`).
  Dal push'ları önizleme sürümü üretir; merge'den önce
  `https://<dal-adı>-fy-ajans.ferhatyasinoglu.workers.dev/health` ile denenebilir.
- Gizli anahtarlar Builds ile ayarlanmaz; bir kez panodan ya da `npx wrangler secret put …` ile girilir.
