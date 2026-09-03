# Çeviriler

Türkçe kaynak HTML'dir (kökteki dosyalar). Diğer diller bu klasördeki sözlüklerden üretilir:

```
node tools/build-i18n.mjs          # de/ en/ fa/ klasörlerini, js/lang/*.js ve sitemap.xml'i yazar
node tools/build-i18n.mjs --check  # yalnızca eksik anahtarları listeler
```

Bir metni değiştirdiğinde: (1) Türkçe HTML'de düzelt, (2) aynı anahtarı `de.json`, `en.json`, `fa.json`'da
düzelt, (3) betiği çalıştır, (4) üretilen dosyalarla birlikte commit'le. Üretilen dosyalar (`de/`, `en/`,
`fa/`, `js/lang/`) elle düzenlenmez; bir sonraki üretimde üzerine yazılır.

## Sözlük biçimi (`<dil>.json`)

```json
{
  "lang": "de", "dir": "ltr", "locale": "de_DE", "name": "Deutsch",
  "common": { "nav.home": "Startseite", "footer.rights": "FY — Alle Rechte vorbehalten." },
  "pages": {
    "index.html": { "meta.title": "…", "hero.title": "Wir bauen die <span class=\"text-accent-gradient\">KI-Schicht</span> deines Unternehmens." },
    "contact/course.html": { "…": "…" }
  },
  "ld": { "Kurucu": "Gründer" },
  "js": { "menuOpen": "Menü öffnen", "canned": [["hallo|hi", "Hallo! …"]], "system": "…" }
}
```

- `common`: her sayfada aynı olan anahtarlar (menü, alt bilgi, dil seçici). Sayfa sözlüğü önce bakılır, sonra `common`.
- `pages.<dosya>`: o sayfanın anahtarları. Değer **HTML**'dir: kaynaktaki `<span>`, `<strong>`, `<br>` gibi
  satır içi etiketleri koru; `⟦…⟧` yer tutucularını ve `<span id="askLeft">` gibi kimlikli öğeleri aynen bırak.
- `ld`: JSON-LD içindeki Türkçe dizelerin çevirisi (anahtar = Türkçe metin, birebir).
- `js`: `js/main.js`'in kullandığı metinler; `js/lang/<dil>.js` olarak üretilir. `canned` FYOS'un hazır yanıtları
  (`[anahtar-kelime regex, yanıt]`), `system` tarayıcı içi modelin talimatı.
- Anahtar yoksa Türkçe metin kalır ve betik uyarır — kısmi çeviri sayfayı bozmaz.

## Farsça (sağdan sola)

`"dir": "rtl"` yeterlidir; CSS mantıksal özellikler kullanır. Oklar çeviride ters yazılır («→» yerine «←»),
rakamlar Farsça yazılabilir (۱۲۳). Vazirmatn yazı tipi Farsça harfleri kapsar (`fonts/vazirmatn-arabic.woff2`).
