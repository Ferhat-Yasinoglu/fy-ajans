# XO Yapı Notu (xoaii.com)

ERİŞİM ENGELLİ: `curl -sSI https://xoaii.com/` → `curl: (56) CONNECT tunnel failed, response 403` (HTTP/1.1 403 Forbidden); WebFetch → `EGRESS_BLOCKED: Access to xoaii.com is blocked by the network egress proxy.` — 2026-09-03 19:35 UTC (ikinci deneme; ilk deneme aynı gün, aynı hata).

Kontrol amaçlı `https://example.com/` de aynı şekilde 403 ile reddedildi; yani engel xoaii.com'a özgü değil, oturumun ağ politikası "Full internet" olarak güncellenmiş olsa da bu konteynere henüz yansımamış görünüyor. Yeni bir oturum açıldığında politika büyük olasılıkla devreye girer.

## Vekil durumu (`curl -sS "$HTTPS_PROXY/__agentproxy/status"`, 2026-09-03 19:35 UTC)

```json
{
  "enabled": true,
  "port": 46693,
  "selective": false,
  "standalone": false,
  "toolScoped": false,
  "recentRelayFailures": [
    {
      "ts": "2026-09-03T19:34:55.767Z",
      "kind": "connect_rejected",
      "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
      "host": "xoaii.com:443"
    }
  ]
}
```

(`noProxy` listesi yalnızca yerel ağlar, api.anthropic.com ve paket kayıt defterlerini içeriyor; xoaii.com bu listede değil ve ağ geçidi CONNECT isteğini politika gereği reddediyor.)

## Yapılamayanlar

Bu nedenle sayfa yapısı (meta/OG/JSON-LD), ana sayfa bölümleri, fiyatlandırma, formlar ve JS uç noktaları, XOS sohbeti, sosyal kanıt, alt bilgi bağlantıları, teknik öğeler ve FY ile "XO'da var / FY'de var" karşılaştırma listeleri ile Farsça terim karşılaştırması çıkarılamadı.

Ortamın ağ politikası bu konteynerde etkinleştiğinde (veya yeni oturumda) not, görev tanımındaki adımlarla (ham HTML + JS indirme, Playwright ile 1280/390 px render, depodaki index.html / contact/ / terms.html / impressum.html / portal/login.html / 404.html / js/main.js / i18n/fa.json ile karşılaştırma) yeniden üretilebilir.
