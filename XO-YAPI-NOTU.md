# XO Yapı Notu (xoaii.com)

ERİŞİM ENGELLİ: `curl -sI https://xoaii.com/` → `curl: (56) CONNECT tunnel failed, response 403` (ağ vekili: "gateway answered 403 to CONNECT (policy denial)"); WebFetch → `EGRESS_BLOCKED: Access to xoaii.com is blocked by the network egress proxy.` (ana sayfa, /contact/, /contact/course.html ve /terms için aynı hata, 2026-09-03).

Bu nedenle sayfa yapısı, formlar, fiyatlandırma, JS uç noktaları ve FY karşılaştırma tablosu çıkarılamadı. Ortamın ağ politikasına xoaii.com eklendiğinde bu not aynı adımlarla yeniden üretilebilir.
