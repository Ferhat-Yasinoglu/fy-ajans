---
name: yayin-oncesi
description: main'e merge etmeden ya da PR açmadan önce çalıştırılan kontrol listesi. «Yayına hazır mı», «PR açmadan önce», «merge öncesi», «kontrol et» dendiğinde kullan.
---
1. `node tools/build-i18n.mjs --check` → «tüm anahtarlar tam, damga güncel». Değilse
   `node tools/build-i18n.mjs` çalıştır ve üretilenleri commit'le.
2. `node tools/fy-stats.mjs --check` → «fy-stats güncel». Değilse `node tools/fy-stats.mjs` ve dosyayı commit'e ekle.
2b. `worker/` değiştiyse: `cd worker && node test/security.mjs` (hepsi kapalı) ve
   `WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run` (ERROR yok).
3. Yeni dış kaynak var mı? `index.html` ve üretilen dil sayfalarının CSP meta etiketi onu içeriyor mu?
4. Veri akışı değiştiyse `/gizlilik-kontrol`.
5. `git diff --stat origin/main...HEAD`: beklenmeyen dosya var mı? i18n JSON farkı dil başına 2 satır mı
   (biçim bozulmamış)? Üretilmiş dosyalar kaynakla aynı commit'te mi?
6. Gizli bilgi taraması: `git diff origin/main...HEAD | grep -iE "sk-ant-|api[_-]?key *[:=]|Bearer [A-Za-z0-9]"`
   → boş olmalı. `.env`, `.dev.vars` commit'lenmemiş olmalı.
7. Bağımsız göz: `denetci` alt ajanına diff'i denetlet; engel düzeyinde bulgu varsa PR açma.
8. Commit Türkçe (ilk satır ne, gövde neden). Dal + PR; `main`'e doğrudan push yok.
9. Merge sonrası: GitHub Pages (~1-2 dk) ve Workers Builds `main` derlemesi yeşil mi? Sitede FYOS'a bir
   soru sor; gerekirse `/health`.
