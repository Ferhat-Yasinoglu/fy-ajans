---
name: gizlilik-kontrol
description: Veri akışı değişince (yeni dış istek, sunucuda saklama, yeni sağlayıcı) gizlilik metninin ve sitedeki iddiaların gerçeği yansıttığını doğrular ve düzeltir. «Gizlilik», «KVKK», «DSGVO», «yeni servis ekledik», «terms» dendiğinde kullan.
---
## Önce sor: ne değişti?
- Tarayıcı yeni bir alan adına istek atıyor mu? → `terms.html` §3 «Dış servisler» + her sayfanın CSP'si.
- Bir veri (IP, soru, e-posta, ses) sunucuda tutuluyor mu, ne kadar? → §2 «Çerez ve tarayıcı hafızası» ve
  DSGVO bölümü (Md. 6 dayanağı, saklama süresi).
- Yeni bir işleyici/sağlayıcı (Cloudflare, Anthropic, OpenAI, ElevenLabs…) mı? → DSGVO bölümü: şirket,
  ülke, Md. 46 aktarım güvencesi.
- Bir şey artık YAPILMIYORSA (ör. tarayıcı içi model indirme) o cümle de silinir; «şu an kapalı, açılınca
  güncellenir» gibi koşullu cümleler açıldığı gün yürürlüğe alınır.

## Aynı iddiayı tekrarlayan yerler — hepsi birlikte değişir
1. `terms.html`: §2, §3, «FYOS sohbeti ve sesli yanıt» bölümü, `terms.intro` «Son güncelleme» tarihi
2. `i18n/de,en,fa.json` → `pages["terms.html"].terms.prose` ve `terms.intro` (Almanca bağlayıcı sürüm)
3. `index.html` `works.1.facts` kartı (+ i18n `pages["index.html"]`)
4. `js/main.js` «gizlilik|veri|çerez» hazır yanıtı (+ i18n `js.canned`)
5. `README.md` «Güvenlik ve gizlilik» ve giriş paragrafı
6. `worker/src/index.js` `SYSTEM_PROMPT` içindeki «Gizlilik:» satırı

Sonra `/ceviri` 4-6. adımları (JSON biçimi, build-i18n, üretilenleri commit).

## Son kontrol
`grep -rn "cihazında üretilir\|sunucuya gitmez\|on your device\|auf deinem Gerät" --include="*.html" .`
→ gerçek değilse hiçbir dilde kalmamalı.

Örnek: 19 Eylül 2026'da worker bağlanınca «yanıtlar cihazında üretilir» cümlesi yanlış oldu; altı yerde
birden düzeltildi (PR #57). Denetimi bağımsız gözle yaptırmak için `denetci` alt ajanı.
