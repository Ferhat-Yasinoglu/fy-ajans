#!/usr/bin/env node
/* FY — bağlantı sayfasının sosyal medya görselleri

   Instagram hikâyesi ve kare gönderi: «bio'daki linke tıkla» görselleri. Sayfanın
   kendisinden beslenir (ad, adres, kurucu fotoğrafı), böylece sayfa değiştikçe
   görseller tek komutla yenilenir.

   Tasarım dili brand/sosyal-tasarim.md'de yazılı — «Altın Meridyen». Özeti:
   kompozisyonun omurgası tek bir yatay çizgi (ufuk) ve onu kesen bir kadrandır;
   altın hep saç teli inceliğindedir, dolu yüzey yoktur; tipografi yalnız iki
   kayıtta konuşur — çok küçük teknik etiketler ve tek bir sakin söz öbeği.

   Çıktı (Playwright + Chromium gerekir) → brand/ :
     sosyal-hikaye-1080x1920.png        hikâye — kadranın göbeğinde güneş
     sosyal-hikaye-foto-1080x1920.png   hikâye — kadranın göbeğinde portre
     sosyal-kare-1080x1080.png          kare gönderi
   Türkçe dışındaki diller dosya adına eklenir: sosyal-hikaye-fa-1080x1920.png gibi.

   Kullanım (depo kökünde):   node tools/build-sosyal.mjs           tr ve fa
                              node tools/build-sosyal.mjs de en     istenen diller

   Farsça sağdan sola ve bağlı bir yazıdır: harf aralığı (letter-spacing) verilmez,
   yoksa harfler birbirinden kopar. Teknik etiketler yalnız ASCII içerir (mono yüzde
   Türkçe/Farsça glif aranmaz), sözcükler Vazirmatn'da kalır.

   Yazı tipi file:// altında yalnızca aynı kökten yüklendiği için sayfa geçici olarak
   depo köküne yazılır (build-logo.mjs'deki og bloğuyla aynı gerekçe). */

import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Playwright bulunamadı — görseller üretilmedi. Depo kökünde:  npm i --no-save playwright && npx playwright install chromium\n(global kurulum için NODE_PATH=<global node_modules> ile göster).'); process.exit(1); }

/* ---------- Sayfadan okunanlar ---------- */
const html = readFileSync(join(ROOT, 'contact/index.html'), 'utf8');
const CANON = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
if (!CANON) throw new Error('contact/index.html içinde canonical bulunamadı');
/* Plakadaki yol adresten türetilir, elle yazılmaz: alan adı ya da klasör değişirse
   görseller de değişir. /fy-ajans/contact/ → «fy-ajans / contact» */
const SEGS = new URL(CANON).pathname.split('/').filter(Boolean);
const pathFor = (lang) =>
  (lang === 'tr' ? SEGS : [SEGS[0], lang, ...SEGS.slice(1)]).join(' / ');

/* ---------- Diller ----------
   Sözcükler sitenin kendi terimleriyle aynı; kısa pazarlama cümleleri burada durur. */
const LANGS = {
  tr: {
    dir: 'ltr', track: true,
    head1: 'İletişim', head2: 'yolumuz',
    call: 'AŞAĞIDAKİ LİNKE TIKLA',
    items: 'Kurs · Ücretsiz eğitimler · Kanallar · Kişi kartı',
    sqHead: 'İletişim', sqCall: 'BİZE ULAŞ',
  },
  fa: {
    dir: 'rtl', track: false,
    head1: 'راه ارتباط', head2: 'با ما',
    call: 'روی لینک زیر بزن',
    items: 'دوره · آموزش‌های رایگان · کانال‌ها · کارت تماس',
    sqHead: 'ارتباط', sqCall: 'با ما تماس بگیر',
  },
  de: {
    dir: 'ltr', track: true,
    head1: 'So erreichst', head2: 'du uns',
    call: 'TIPPE AUF DEN LINK',
    items: 'Kurs · Kostenlose Schulungen · Kanäle · Kontaktkarte',
    sqHead: 'Kontakt', sqCall: 'SCHREIB UNS',
  },
  en: {
    dir: 'ltr', track: true,
    head1: 'How to', head2: 'reach us',
    call: 'TAP THE LINK BELOW',
    items: 'Course · Free trainings · Channels · Contact card',
    sqHead: 'Contact', sqCall: 'GET IN TOUCH',
  },
};
const WANTED = process.argv.slice(2).filter(a => LANGS[a]);
const BUILD = WANTED.length ? WANTED : ['tr', 'fa'];

/* ---------- Yazı yüzleri ----------
   V: Vazirmatn (marka yüzü, TR + FA). Unicode aralıkları sitenin css'indeki gibi
   verilir ki Farsça gliflerde doğru yüz seçilsin.
   M: GeistMono — yalnız teknik etiketlerde, yalnız ASCII. */
const FONTS = `
@font-face{font-family:V;font-weight:100 900;src:url("fonts/vazirmatn-latin.woff2") format("woff2");
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122;}
@font-face{font-family:V;font-weight:100 900;src:url("fonts/vazirmatn-latin-ext.woff2") format("woff2");
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF;}
@font-face{font-family:V;font-weight:100 900;src:url("fonts/vazirmatn-arabic.woff2") format("woff2");
  unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC;}
@font-face{font-family:M;src:url("fonts/geistmono-regular.ttf") format("truetype");}
`;

const INK = '#070604', IVORY = '#f4ecd8', MUTED = '#8a7c5c';

const BASE = `
  * { box-sizing: border-box; margin: 0; }
  body { background: ${INK}; color: ${IVORY}; font-family: V, system-ui, sans-serif;
         position: relative; overflow: hidden; }

  /* Zemin: neredeyse görünmez bir ölçek dokusu ve merkezden açılan sıcaklık */
  .grain { position: absolute; inset: 0;
           background-image: radial-gradient(rgba(212,175,55,.055) 1px, transparent 1px);
           background-size: 34px 34px; }
  .warm { position: absolute; inset: 0;
          background: radial-gradient(48% 28% at 50% var(--warm-y), rgba(212,175,55,.065), transparent 72%); }

  /* Teknik kayıt: küçük, geniş aralıklı, ASCII */
  /* Büyütme CSS'e bırakılmaz: sayfa dili tr iken uppercase «i» harfini «İ» yapar
     ve adres bozulur. Etiketler zaten yazıldığı biçimde kalır. */
  .tech { font-family: M, ui-monospace, monospace; font-size: 20px; letter-spacing: .30em;
          color: ${MUTED}; white-space: nowrap; }

  .gold { background: linear-gradient(140deg, #f7dc85, #d4af37 48%, #a9821e);
          -webkit-background-clip: text; background-clip: text; color: transparent; }

  .rowTop { position: absolute; display: flex; justify-content: space-between; }
`;

/* Köşe tescil işaretleri — çerçeve değil, yalnız dört köşede ince gönye */
const corners = (W, H, M, len = 26) => {
  const p = [];
  const L = (x1, y1, x2, y2) => p.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`);
  L(M, M, M + len, M); L(M, M, M, M + len);
  L(W - M, M, W - M - len, M); L(W - M, M, W - M, M + len);
  L(M, H - M, M + len, H - M); L(M, H - M, M, H - M - len);
  L(W - M, H - M, W - M - len, H - M); L(W - M, H - M, W - M, H - M - len);
  return `<svg class="deco" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
    style="position:absolute;inset:0"><g stroke="rgba(212,175,55,.55)" stroke-width="1.5">${p.join('')}</g></svg>`;
};

/* Kadran: ufuk çizgisi, derece taksimatı, yön göstergesi.
   Taksimat sabırlı tekrarın kendisidir — 72 çizgi, her 15°'de uzayanı. */
function dial({ W, cy, rTick, rOuter, rCore }) {
  const cx = W / 2;
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 - 90) * Math.PI / 180;
    const major = i % 3 === 0;
    const r1 = rTick, r2 = rTick + (major ? 22 : 11);
    ticks.push(`<line x1="${(cx + Math.cos(a) * r1).toFixed(2)}" y1="${(cy + Math.sin(a) * r1).toFixed(2)}"
      x2="${(cx + Math.cos(a) * r2).toFixed(2)}" y2="${(cy + Math.sin(a) * r2).toFixed(2)}"
      stroke="rgba(212,175,55,${major ? .80 : .34})" stroke-width="${major ? 1.8 : 1.2}"/>`);
  }
  const bearing = `<path d="M${cx} ${cy - rOuter - 20} l9 16 h-18 z" fill="rgba(245,215,110,.85)"/>`;
  return `
  <svg class="dial" width="${W}" height="${cy * 2}" viewBox="0 0 ${W} ${cy * 2}"
       style="position:absolute;left:0;top:0;overflow:visible">
    <defs>
      <linearGradient id="hz" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
        <stop offset="0" stop-color="rgba(212,175,55,0)"/>
        <stop offset=".12" stop-color="rgba(212,175,55,.30)"/>
        <stop offset=".30" stop-color="rgba(232,196,92,.68)"/>
        <stop offset=".5" stop-color="rgba(245,215,110,.85)"/>
        <stop offset=".70" stop-color="rgba(232,196,92,.68)"/>
        <stop offset=".88" stop-color="rgba(212,175,55,.30)"/>
        <stop offset="1" stop-color="rgba(212,175,55,0)"/>
      </linearGradient>
      <radialGradient id="sunglow">
        <stop offset="0" stop-color="rgba(245,215,110,.30)"/>
        <stop offset=".55" stop-color="rgba(212,175,55,.10)"/>
        <stop offset="1" stop-color="rgba(212,175,55,0)"/>
      </radialGradient>
    </defs>
    <line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="url(#hz)" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="${rOuter + 150}" fill="url(#sunglow)"/>
    <circle cx="${cx}" cy="${cy}" r="${rCore + 1}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="rgba(212,175,55,.30)" stroke-width="1.2"/>
    ${ticks.join('')}
    ${bearing}
  </svg>`;
}

/* Kadranın göbeği: portre ya da güneş. İkisi de aynı yarıçapı doldurur. */
const core = (rCore, photo) => photo
  ? `<div class="core"><img src="img/founder.jpg"></div>`
  : `<div class="core core--sun"></div>`;

/* ---------- Hikâye 1080×1920 ---------- */
function story(L, lang, photo) {
  const W = 1080, H = 1920, M = 104, CY = 782;
  const rCore = photo ? 226 : 96, rTick = 300, rOuter = 330;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${FONTS}${BASE}
  body { width: ${W}px; height: ${H}px; --warm-y: ${CY}px; }

  .mark { position: absolute; top: 206px; left: 50%; transform: translateX(-50%); height: 96px; }
  .rowTop { top: ${M - 22}px; left: ${M}px; right: ${M}px; }

  .core { position: absolute; left: 50%; top: ${CY}px; width: ${rCore * 2}px; height: ${rCore * 2}px;
          transform: translate(-50%, -50%); border-radius: 50%; overflow: hidden;
          box-shadow: 0 0 0 1.5px rgba(212,175,55,.55), 0 0 70px rgba(212,175,55,.16); }
  .core img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .core--sun { background: radial-gradient(circle at 50% 42%, #fbeaa8, #e8c451 42%, #c79a26 72%, #a9821e);
               box-shadow: 0 0 0 1.5px rgba(245,215,110,.5), 0 0 130px rgba(245,215,110,.36); }

  /* Tek sakin söz öbeği — iki satır, tek jest */
  .head { position: absolute; top: 1232px; left: ${M}px; right: ${M}px; text-align: center;
          line-height: 1.1; }
  .head .a { display: block; font-size: 72px; font-weight: 200; color: ${IVORY};
             letter-spacing: ${L.dir === 'rtl' ? '0' : '.005em'}; }
  .head .b { display: block; font-size: 100px; font-weight: 700; margin-top: 4px;
             letter-spacing: ${L.dir === 'rtl' ? '0' : '-.02em'}; }

  .rule { position: absolute; top: 1468px; left: 50%; width: 150px; height: 1px;
          margin-left: -75px; background: rgba(212,175,55,.42); }

  .call { position: absolute; top: 1518px; left: ${M}px; right: ${M}px; text-align: center;
          font-size: 27px; font-weight: 300; color: ${MUTED};
          letter-spacing: ${L.track ? '.26em' : '0'}; }

  /* Oyulmuş plaka — dolu beyaz kutu değil */
  .plate { position: absolute; top: 1586px; left: 50%; transform: translateX(-50%);
           width: 680px; height: 104px; border: 1px solid rgba(212,175,55,.55); border-radius: 4px;
           display: flex; align-items: center; justify-content: center; gap: 22px;
           box-shadow: inset 0 0 44px rgba(212,175,55,.07); }
  .plate .dot { width: 7px; height: 7px; background: #e8c451; }
  .plate .p { font-family: M, ui-monospace, monospace; font-size: 31px; letter-spacing: .06em;
              color: ${IVORY}; }

  .items { position: absolute; top: 1734px; left: ${M}px; right: ${M}px; text-align: center;
           font-size: 25px; font-weight: 300; color: #6f6449; }
</style></head><body>
  <div class="grain"></div><div class="warm"></div>
  ${corners(W, H, M)}
  ${dial({ W, cy: CY, rTick, rOuter, rCore })}
  ${core(rCore, photo)}

  <div class="rowTop"><span class="tech">FY</span><span class="tech">${lang.toUpperCase()}</span></div>
  <img class="mark" src="img/logo-mark-static.svg">

  <div class="head" dir="${L.dir}"><span class="a">${L.head1}</span><span class="b gold">${L.head2}</span></div>
  <div class="rule"></div>
  <div class="call" dir="${L.dir}">${L.call}</div>
  <div class="plate"><span class="dot"></span><span class="p">${pathFor(lang)}</span></div>
  <div class="items" dir="${L.dir}">${L.items}</div>

</body></html>`;
}

/* ---------- Kare 1080×1080 ---------- */
function square(L, lang) {
  const W = 1080, H = 1080, M = 88, CY = 452, rCore = 168, rTick = 232, rOuter = 256;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${FONTS}${BASE}
  body { width: ${W}px; height: ${H}px; --warm-y: ${CY}px; }

  .rowTop { top: ${M - 20}px; left: ${M}px; right: ${M}px; }

  .core { position: absolute; left: 50%; top: ${CY}px; width: ${rCore * 2}px; height: ${rCore * 2}px;
          transform: translate(-50%, -50%); border-radius: 50%; overflow: hidden;
          box-shadow: 0 0 0 1.5px rgba(212,175,55,.55), 0 0 60px rgba(212,175,55,.16); }
  .core img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .head { position: absolute; top: 760px; left: ${M}px; right: ${M}px; text-align: center;
          font-size: 84px; font-weight: 700; line-height: 1.16;
          letter-spacing: ${L.dir === 'rtl' ? '0' : '-.015em'}; }
  .rule { position: absolute; top: 888px; left: 50%; width: 120px; height: 1px;
          margin-left: -60px; background: rgba(212,175,55,.42); }
  .call { position: absolute; top: 922px; left: ${M}px; right: ${M}px; text-align: center;
          font-size: 25px; font-weight: 300; color: ${MUTED};
          letter-spacing: ${L.track ? '.30em' : '0'}; }
</style></head><body>
  <div class="grain"></div><div class="warm"></div>
  ${corners(W, H, M, 22)}
  ${dial({ W, cy: CY, rTick, rOuter, rCore })}
  <div class="core"><img src="img/founder.jpg"></div>

  <div class="rowTop"><span class="tech">FY</span><span class="tech">${lang.toUpperCase()}</span></div>
  <div class="head gold" dir="${L.dir}">${L.sqHead}</div>
  <div class="rule"></div>
  <div class="call" dir="${L.dir}">${L.sqCall}</div>
</body></html>`;
}

/* ---------- Üret ---------- */
const DIR = join(ROOT, 'brand');
mkdirSync(DIR, { recursive: true });
const tag = (lang) => (lang === 'tr' ? '' : `-${lang}`);   // TR kaynak, ötekiler ada eklenir
const JOBS = BUILD.flatMap((lang) => {
  const L = LANGS[lang];
  return [
    { file: `sosyal-hikaye${tag(lang)}-1080x1920.png`, w: 1080, h: 1920, page: story(L, lang, false) },
    { file: `sosyal-hikaye-foto${tag(lang)}-1080x1920.png`, w: 1080, h: 1920, page: story(L, lang, true) },
    { file: `sosyal-kare${tag(lang)}-1080x1080.png`, w: 1080, h: 1080, page: square(L, lang) },
  ];
});

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const tmp = join(ROOT, 'sosyal-tmp.html');
for (const j of JOBS) {
  writeFileSync(tmp, j.page);
  try {
    await tab.setViewportSize({ width: j.w, height: j.h });
    await tab.goto('file://' + tmp, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await tab.waitForTimeout(250);
    await tab.screenshot({ path: join(DIR, j.file) });
  } finally { if (existsSync(tmp)) unlinkSync(tmp); }
  console.log(`brand/${j.file}  ${j.w}×${j.h}`);
}
await browser.close();
