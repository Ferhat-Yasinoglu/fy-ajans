# FY marka kiti

Bu klasördeki dosyalar `node tools/build-logo.mjs --kit` ile üretilir (Playwright + Chromium gerekir); elle
düzenlenmez. Logonun kaynağı `img/logo-master.png`, geometrisi `tools/build-logo.mjs` içindedir.

| Dosya | Ne için |
|---|---|
| `fy-profil-1024.png`, `fy-profil-512.png` | Instagram, LinkedIn, WhatsApp, YouTube profil fotoğrafı. Kare, koyu zemin; platformlar daire kırpar, halka ve harfler dairenin içinde kalır. |
| `fy-logo-seffaf-2048/1024/512.png` | Harf logosu, şeffaf zemin. Koyu zeminler, videolar, sunumlar. Parıltı dahil; açık zeminde de çalışır. |
| `fy-logo-siyah.svg`, `fy-logo-siyah-1024.png` | Tek renk siyah. Baskı, fatura, kaşe, açık zemin. |
| `fy-logo-beyaz.svg`, `fy-logo-beyaz-1024.png` | Tek renk beyaz. Koyu zemin, filigran, kabartma. |
| `fy-yatay-tr.svg`, `fy-yatay-tr-2048.png`, `fy-yatay-tr-koyu-2048.png` | Yatay kilit: logo + «Yapay Zekâ Ajansı». Şeffaf (koyu zemin için) ve koyu zeminli sürüm. |
| `fy-yatay-en.*`, `fy-yatay-de.*` | Aynı kilit İngilizce («AI Agency») ve Almanca («KI-Agentur»). |

Notlar

- Sitede kullanılan animasyonlu logolar `img/` altındadır (`logo-mark.svg`, `logo-hero.svg`); bu klasördekiler durağandır.
- Yatay kilitlerin SVG'lerine Vazirmatn yazı tipi gömülüdür; her yerde aynı görünür. Farsça kilit üretilmedi
  (sağdan sola dizgi ve Arapça alt küme gerekir); gerekirse `LOCKUP_TEXT`'e eklenir.
- Açık zeminde renkli logo isteniyorsa şeffaf PNG kullanılabilir; paneller koyu kaldığından harfler okunur.
- Renkler: altın `#d4af37`, parlak altın `#f5d76e`, koyu altın `#a9821e`, zemin `#070604`, krem `#f4ecd8`.
