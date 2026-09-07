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
npx wrangler kv namespace create QUOTA  # çıkan id'yi wrangler.toml'daki KV_ID_BURAYA yerine yaz
                                        # ZORUNLU: yazılmazsa worker hiçbir soruya yanıt vermez
npx wrangler secret put ANTHROPIC_API_KEY   # İSTEĞE BAĞLI: Claude istiyorsan anahtarı yapıştır; atlarsan ücretsiz Workers AI
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
- `MODEL`: `claude-sonnet-5` en yetenekli; `claude-haiku-4-5` yarı fiyat ve bu iş için yeterli.
  Model kimliğine tarih eki ekleme — bu dizeler olduğu gibi tamdır.
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
herhangi biri geçerse `✗ AÇIK` yazıp 1 ile çıkar. (Denendi: sahte assistant turu korumasını
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
