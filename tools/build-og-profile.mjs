#!/usr/bin/env node
/* FY — bağlantı sayfasının paylaşım görseli üreticisi

   Ana sayfanın paylaşım görselini build-logo.mjs üretir (logo + slogan). Bu betik bağlantı
   sayfası (contact/) içindir: orada paylaşılan şey ajans değil kişi, sayfanın og:type'ı da
   zaten "profile". Kart bu yüzden logoyu değil kurucunun fotoğrafını öne alır — linki
   WhatsApp'a ya da Instagram'a yapıştıran kişi yüzü görür.

   Kaynak: img/founder.jpg (kurucu fotoğrafı) + i18n/<dil>.json ("links.name", "links.role").
           Ad ve unvan sözlükten okunur; sayfada ne yazıyorsa kartta da o yazar.

   Çıktı (1200×630; Playwright + Chromium gerekir):
     img/og-profil.png     TR (kaynak)
     img/og-profil-en.png  og-profil-de.png  og-profil-fa.png

   contact/index.html bunlardan TR olanı gösterir; diğer üç dilin sayfasında yolu
   build-i18n.mjs çevirir (img/og-profil.png → img/og-profil-<dil>.png).

   Kullanım (depo kökünde):   node tools/build-og-profile.mjs

   Fotoğraf değişince yeniden çalıştır. Kırpma sayfadaki yuvarlak avatarla aynı:
   object-fit: cover, object-position: 50% 28%. */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Playwright bulunamadı — görseller üretilmedi. Depo kökünde:  npm i --no-save playwright && npx playwright install chromium\n(global kurulum için NODE_PATH=<global node_modules> ile göster).'); process.exit(1); }

if (!existsSync(join(ROOT, 'img/founder.jpg'))) { console.error('img/founder.jpg yok — görseller üretilmedi.'); process.exit(1); }

/* ---------- Metinler: sözlükten, böylece sayfayla aynı kalır ---------- */
const strip = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// TR kaynak sayfadan; diğer diller i18n/<dil>.json'dan
const trHtml = readFileSync(join(ROOT, 'contact/index.html'), 'utf8');
const pick = (key) => {
  const m = trHtml.match(new RegExp(`data-i18n="${key}"[^>]*>([\\s\\S]*?)</`));
  if (!m) throw new Error(`contact/index.html içinde "${key}" bulunamadı`);
  return strip(m[1]);
};
const dict = (lang) => JSON.parse(readFileSync(join(ROOT, `i18n/${lang}.json`), 'utf8'));
const fromDict = (lang, key) => {
  const d = dict(lang);
  for (const page of Object.values(d.pages || {})) if (page[key] != null) return strip(page[key]);
  if (d.common && d.common[key] != null) return strip(d.common[key]);
  throw new Error(`i18n/${lang}.json içinde "${key}" bulunamadı`);
};

const CARDS = [
  { lang: 'tr', file: 'og-profil.png', dir: 'ltr', name: pick('links.name'), role: pick('links.role') },
  ...['en', 'de', 'fa'].map(lang => ({
    lang,
    file: `og-profil-${lang}.png`,
    dir: lang === 'fa' ? 'rtl' : 'ltr',
    name: fromDict(lang, 'links.name'),
    role: fromDict(lang, 'links.role'),
  })),
];

// Adın son kelimesi altın gradyanla yazılır — sayfadaki <h1> ile aynı vurgu
function nameHtml(name) {
  const parts = name.split(' ');
  if (parts.length < 2) return `<span class="g">${name}</span>`;
  const last = parts.pop();
  return `${parts.join(' ')} <span class="g">${last}</span>`;
}

const SITE = (readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<link rel="canonical" href="https?:\/\/([^"]+?)\/?"/) || [])[1] || 'ferhat-yasinoglu.github.io/fy-ajans';

/* ---------- Kart ----------
   Yazı tipi file:// altında yalnızca aynı kökten yüklendiği için sayfa geçici olarak
   depo köküne yazılır (build-logo.mjs'deki og bloğuyla aynı gerekçe). */
const page = (c) => `<!doctype html><html lang="${c.lang}" dir="${c.dir}"><head><meta charset="utf-8"><style>
  @font-face { font-family: V; src: url("fonts/vazirmatn-latin.woff2") format("woff2"); font-weight: 100 900; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122; }
  @font-face { font-family: V; src: url("fonts/vazirmatn-latin-ext.woff2") format("woff2"); font-weight: 100 900; unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F; }
  @font-face { font-family: V; src: url("fonts/vazirmatn-arabic.woff2") format("woff2"); font-weight: 100 900; unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC; }

  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; background: #070604; overflow: hidden;
         font-family: V, system-ui, sans-serif; color: #f4ecd8; display: flex; align-items: center;
         gap: 68px; padding: 0 86px; position: relative; }

  /* fotoğrafın arkasındaki altın parıltı */
  .glow { position: absolute; width: 900px; height: 900px; top: -135px; inset-inline-start: -220px;
          background: radial-gradient(circle, rgba(212,175,55,.20) 0%, rgba(212,175,55,.07) 38%, transparent 68%);
          pointer-events: none; }
  /* alt altın şerit */
  .bar { position: absolute; inset-inline: 0; bottom: 0; height: 8px;
         background: linear-gradient(90deg, #a9821e, #f5d76e 50%, #a9821e); }

  .photo { position: relative; flex: 0 0 auto; width: 404px; height: 404px; border-radius: 50%;
           padding: 7px; background: linear-gradient(135deg, #f5d76e, #d4af37 48%, #a9821e);
           box-shadow: 0 0 64px rgba(212,175,55,.34); }
  .photo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
               object-position: 50% 28%; display: block; background: #0b0906; }

  .text { min-width: 0; }
  .mark { height: 62px; margin-bottom: 26px; display: block; }
  [dir="rtl"] .text { text-align: right; }
  [dir="rtl"] .mark { margin-inline-start: auto; }

  .name { font-size: 72px; font-weight: 800; line-height: 1.04; letter-spacing: -.02em; margin: 0; }
  .g { background: linear-gradient(135deg, #f5d76e, #d4af37 50%, #a9821e);
       -webkit-background-clip: text; background-clip: text; color: transparent; }
  .role { font-size: 31px; font-weight: 500; color: #cbbf9c; margin: 22px 0 0; line-height: 1.32; }
  .url { font-size: 23px; color: #8a7c5c; margin: 34px 0 0; padding-top: 26px;
         border-top: 1px solid rgba(212,175,55,.26); letter-spacing: .01em; }
  [dir="rtl"] .name { letter-spacing: 0; }
  [dir="rtl"] .url { direction: ltr; text-align: right; }
</style></head><body>
  <div class="glow"></div>
  <div class="photo"><img src="img/founder.jpg"></div>
  <div class="text">
    <img class="mark" src="img/logo-mark-static.svg">
    <p class="name">${nameHtml(c.name)}</p>
    <p class="role">${c.role}</p>
    <p class="url">${SITE}</p>
  </div>
  <div class="bar"></div>
</body></html>`;

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const tmp = join(ROOT, 'og-profil-tmp.html');
for (const c of CARDS) {
  writeFileSync(tmp, page(c));
  try {
    await tab.goto('file://' + tmp, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await tab.waitForTimeout(200);
    await tab.screenshot({ path: join(ROOT, 'img/' + c.file) });
  } finally { unlinkSync(tmp); }
  console.log(`img/${c.file}  1200×630  ${c.name} — ${c.role}`);
}
await browser.close();
