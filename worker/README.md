# FYOS sohbet ara sunucusu

Sitedeki FYOS kutusunun gerçek yapay zekâyla konuşması için küçük bir Cloudflare Worker.
Ücretsiz plan günde 100.000 istek verir; bizim için fazlasıyla yeter.

Neden ara sunucu: API anahtarı tarayıcıya konulamaz; kaynak kodda herkes görür ve
senin faturana harcar. Anahtar burada, Cloudflare'in gizli değişkeninde durur.
Worker ayrıca günlük soru hakkını ziyaretçi başına sayar ve yalnızca senin sitenden
gelen isteklere yanıt verir.

## Kurulum (bir kez, ~15 dakika)

Gerekenler: ücretsiz Cloudflare hesabı, bir Anthropic API anahtarı
(console.anthropic.com → API Keys), bilgisayarda Node.js.

```
cd worker
npx wrangler login                      # tarayıcıda Cloudflare'e giriş
npx wrangler kv namespace create QUOTA  # çıkan id'yi wrangler.toml'daki KV_ID_BURAYA yerine yaz
npx wrangler secret put ANTHROPIC_API_KEY   # anahtarı yapıştır, Enter
npx wrangler deploy
```

Son komut şöyle bir adres verir: `https://fyos-chat.<hesap-adın>.workers.dev`

## Siteyi bağlama

1. `js/main.js` dosyasının başındaki `FYOS_ENDPOINT` değişkenine bu adresi yaz:
   `var FYOS_ENDPOINT = 'https://fyos-chat.<hesap-adın>.workers.dev';`
2. `index.html` içindeki CSP satırında `connect-src 'self'` kısmına aynı adresi ekle:
   `connect-src 'self' https://fyos-chat.<hesap-adın>.workers.dev`
3. Commit, push. Bitti: FYOS artık her soruya kendisi cevap verir. Worker'a ulaşılamazsa
   site kendiliğinden hazır yanıtlı çevrimdışı demoya döner.

## Ayarlar

- `ALLOWED_ORIGINS` (wrangler.toml): izinli site adresleri. Kendi alan adına geçince ekle.
- `DAILY_LIMIT`: ziyaretçi başına günlük soru hakkı (varsayılan 4).
- `MODEL`: `claude-sonnet-5` en yetenekli; `claude-haiku-4-5-20251001` çok daha ucuz ve bu iş için yeterli.
- Sistem talimatı ve FY bilgileri `src/index.js` içindeki `SYSTEM_PROMPT` sabitinde. Fiyat ya da
  kurs bilgisi değişince orayı da güncelle.

## Maliyet

Yanıtlar 350 token ile sınırlı. Günde 4 soru × kaba tahminle 200 ziyaretçi bile ayda birkaç
avroyu geçmez. Anthropic panelinde aylık harcama limiti koymayı unutma.
