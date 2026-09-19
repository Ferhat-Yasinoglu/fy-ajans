---
name: ceviri
description: Sitedeki bir metni dört dilde (Türkçe kaynak + de/en/fa) değiştirir ve üretilmiş sayfaları yeniler. «Çeviri», «metni değiştir», «dört dilde», «şu cümleyi düzelt» dendiğinde kullan.
---
1. Metni önce Türkçe kaynakta bul (kök HTML: `index.html`, `terms.html`, `course/*.html`…). Öğedeki
   `data-i18n="…"` anahtarını al. Anahtarsız metin çevrilmez; önce anahtar ekle.
2. Aynı anahtarı `i18n/de.json`, `i18n/en.json`, `i18n/fa.json` içinde `pages["<dosya>"]` altında bul; üçünü
   de değiştir. Değer HTML'dir: `<span>`, `<strong>`, `<br>`, `<a …>` aynen korunur; `⟦…⟧` yer tutucuları
   ve `id`'li öğeler değişmez. `common` her sayfada ortak anahtarlar, `js.canned` FYOS hazır yanıtları.
3. Farsça: oklar ters (→ yerine ←), rakamlar Farsça olabilir (۱۲۳), ZWNJ (‌) korunur. Almanca
   `terms.html` bağlayıcı hukuk metnidir: «DSGVO», «Art. 6 Abs. 1 lit. f» gibi terimler Almanca
   standardında kalır; İngilizce ve Farsça «kolaylık çevirisi» notunu taşır.
4. JSON'u yazarken biçimi koru: 1 boşluk girinti, `ensure_ascii=False`, dosya sonunda satır sonu YOK.
   Doğru yazılmış dosyada `git diff --stat` dil başına 2 satır gösterir.
5. `node tools/build-i18n.mjs` — 45 dosya + `sitemap.xml` üretir, `?v=` damgasını tazeler.
   Ardından `node tools/build-i18n.mjs --check` → «tüm anahtarlar tam, damga güncel» olmalı.
6. Üretilen `de/ en/ fa/ js/lang/ sitemap.xml` dosyalarını kaynakla birlikte commit'le. Üretileni elle
   düzenleme — kanca engeller, düzenlesen de bir sonraki üretimde ezilir.

Son kontrol: eski metnin hiçbir dilde kalmadığını `grep -rn "<eski parça>" --include="*.html" .` ile doğrula.
