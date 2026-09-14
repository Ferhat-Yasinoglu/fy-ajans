#!/usr/bin/env node
/* FY — bağlantı sayfasının sosyal medya görselleri

   Instagram hikâyesi ve kare gönderi: «bio'daki linke tıkla» görselleri. Sayfanın
   kendisinden beslenir (ad, unvan, adres, kurucu fotoğrafı), böylece sayfa
   değiştikçe görseller tek komutla yenilenir.

   Çıktı (Playwright + Chromium gerekir) → brand/ :
     sosyal-hikaye-1080x1920.png        hikâye — simge odaklı
     sosyal-hikaye-foto-1080x1920.png   hikâye — kurucu fotoğraflı
     sosyal-kare-1080x1080.png          kare gönderi

   Kullanım (depo kökünde):   node tools/build-sosyal.mjs

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

/* ---------- Metinler: sayfadan ---------- */
const html = readFileSync(join(ROOT, 'contact/index.html'), 'utf8');
const strip = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const i18nText = (key) => {
  const m = html.match(new RegExp(`data-i18n="${key}"[^>]*>([\\s\\S]*?)</`));
  if (!m) throw new Error(`contact/index.html içinde "${key}" bulunamadı`);
  return strip(m[1]);
};
const NAME = i18nText('links.name');
const ROLE = i18nText('links.role');
const CANON = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
const HOST = CANON.replace(/^https?:\/\//, '').replace(/\/$/, '');   // ferhat-yasinoglu.github.io/fy-ajans/contact
const SHORT = 'fy-ajans / contact';

/* Sayfanın bugün sunduğu başlıklar — grupların h2'lerinden değil, kısaltılmış hâliyle */
const SUB1 = 'Kurs, ücretsiz eğitimler, kanallar, kişi kartı';
const SUB2 = 'tek sayfada';

const FONTS = ['vazirmatn-latin', 'vazirmatn-latin-ext']
  .map(f => `@font-face{font-family:V;font-weight:100 900;src:url("fonts/${f}.woff2") format("woff2")}`).join('');

/* Ortak zemin: koyu ton + ince noktalı doku + altın parıltı */
const BASE = `
  * { box-sizing: border-box; margin: 0; }
  body { background: #080706; font-family: V, system-ui, sans-serif; color: #f4ecd8;
         position: relative; overflow: hidden; }
  .dots { position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(212,175,55,.10) 1.4px, transparent 1.4px);
          background-size: 30px 30px; }
  .gold { background: linear-gradient(135deg, #f5d76e, #d4af37 52%, #a9821e);
          -webkit-background-clip: text; background-clip: text; color: transparent; }
`;

/* ---------- Hikâye 1080×1920 ---------- */
const story = (withPhoto) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${FONTS}${BASE}
  body { width: 1080px; height: 1920px; }

  .eyebrow { position: absolute; top: 210px; left: 0; right: 0; text-align: center;
             font-size: 27px; letter-spacing: .46em; color: #8a7c5c; }
  .logo { position: absolute; top: 292px; left: 50%; transform: translateX(-50%); height: 158px; }

  .mid { position: absolute; top: ${withPhoto ? 600 : 612}px; left: 96px; right: 96px;
         display: flex; align-items: center; gap: ${withPhoto ? 54 : 40}px; }
  .head { flex: 1; text-align: right; font-weight: 800; font-size: 108px; line-height: 1.04;
          letter-spacing: -.02em; }

  .bubble { position: relative; flex: 0 0 auto; }
  .bubble__glow { position: absolute; left: 38%; top: -30%; width: 250px; height: 250px;
                  border-radius: 50%; background: rgba(191,153,50,.42); }

  .shot { position: relative; flex: 0 0 auto; width: 340px; height: 340px; border-radius: 50%;
          padding: 6px; background: linear-gradient(135deg, #f5d76e, #d4af37 48%, #a9821e);
          box-shadow: 0 0 62px rgba(212,175,55,.34); }
  .shot img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }

  .cta { position: absolute; top: 1006px; left: 96px; right: 96px;
         display: flex; align-items: center; gap: 26px; }
  .cta .rule { flex: 1; height: 1px; background: rgba(212,175,55,.42); }
  .cta .txt { font-size: 43px; font-weight: 700; white-space: nowrap; }

  .card { position: absolute; top: 1104px; left: 150px; right: 150px; height: 186px;
          border: 2px solid rgba(212,175,55,.55); border-radius: 30px;
          display: flex; align-items: center; gap: 30px; padding: 0 34px;
          box-shadow: 0 0 70px rgba(212,175,55,.16); }
  .card__ico { width: 104px; height: 104px; border-radius: 50%; flex: 0 0 auto;
               background: linear-gradient(135deg, #f5d76e, #d4af37 55%, #c39d2c);
               display: flex; align-items: center; justify-content: center; }
  .card__bar { width: 2px; height: 104px; background: rgba(212,175,55,.42); flex: 0 0 auto; }
  .card__pill { flex: 1; height: 112px; border-radius: 22px; background: #fff; color: #14110b;
                display: flex; align-items: center; justify-content: center; gap: 20px;
                font-size: 42px; font-weight: 700; }

  .sub { position: absolute; top: 1356px; left: 0; right: 0; text-align: center; }
  .sub .a { font-size: 34px; color: #9b8f72; }
  .sub .b { font-size: 34px; font-weight: 700; margin-top: 12px; }

  .arc { position: absolute; left: 50%; top: 1436px; width: 2400px; height: 2400px;
         margin-left: -1200px; border-radius: 50%;
         border-top: 3px solid rgba(245,215,110,.55);
         box-shadow: 0 0 150px rgba(212,175,55,.28);
         background: radial-gradient(circle,
           transparent 0 38%,
           rgba(212,175,55,.05) 44%,
           rgba(212,175,55,.16) 48%,
           rgba(232,196,92,.30) 49.7%,
           rgba(245,215,110,.36) 50%,
           transparent 50.4%); }
</style></head><body>
  <div class="dots"></div>
  <div class="eyebrow"><span style="color:#d4af37">·</span> CONNECT WITH US <span style="color:#d4af37">·</span></div>
  <img class="logo" src="img/logo-mark-static.svg">

  <div class="mid">
    ${withPhoto
      ? `<div class="shot"><img src="img/founder.jpg"></div>`
      : `<div class="bubble" style="width:300px">
           <span class="bubble__glow"></span>
           <svg viewBox="0 0 240 150" width="300" height="188" fill="none">
             <rect x="5" y="5" width="230" height="140" rx="50" stroke="#f4ecd8" stroke-width="7"/>
             <circle cx="86" cy="78" r="13" fill="#e2b93f"/>
             <circle cx="122" cy="78" r="13" fill="#e2b93f"/>
             <circle cx="158" cy="78" r="13" fill="#e2b93f"/>
           </svg>
         </div>`}
    <div class="head">İletişim<br><span class="gold">yolumuz</span></div>
  </div>

  <div class="cta">
    <span class="rule"></span>
    <span class="txt">Aşağıdaki <span class="gold">linke</span> tıkla</span>
    <span class="rule"></span>
  </div>

  <div class="card">
    <span class="card__ico">
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#1a1206" stroke-width="2.1" stroke-linecap="round"><path d="M10 13.5a4 4 0 0 0 5.7.4l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7-.4l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2"/></svg>
    </span>
    <span class="card__bar"></span>
    <span class="card__pill">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#2f7cf6" stroke-width="2.1" stroke-linecap="round"><path d="M10 13.5a4 4 0 0 0 5.7.4l3-3a4 4 0 1 0-5.7-5.7l-1.2 1.2"/><path d="M14 10.5a4 4 0 0 0-5.7-.4l-3 3a4 4 0 1 0 5.7 5.7l1.2-1.2"/></svg>
      ${SHORT}
    </span>
  </div>

  <div class="sub"><div class="a">${SUB1}</div><div class="b">${SUB2}</div></div>
  <div class="arc"></div>
</body></html>`;

/* ---------- Kare 1080×1080 ---------- */
const square = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${FONTS}${BASE}
  body { width: 1080px; height: 1080px; display: flex; align-items: center; justify-content: center; }
  .ring { position: absolute; left: 50%; top: 50%; width: 900px; height: 900px; margin: -450px 0 0 -450px;
          border: 2px solid rgba(212,175,55,.38); border-radius: 50%; }
  .stack { position: relative; text-align: center; }
  .bubble { position: relative; display: inline-block; }
  .bubble__glow { position: absolute; left: 36%; top: -26%; width: 310px; height: 310px;
                  border-radius: 50%; background: rgba(191,153,50,.42); }
  .name { font-size: 104px; font-weight: 800; letter-spacing: -.01em; margin-top: 118px; }
  .kicker { font-size: 42px; letter-spacing: .34em; color: #9b8f72; margin-top: 16px; }
</style></head><body>
  <div class="dots"></div>
  <div class="ring"></div>
  <div class="stack">
    <div class="bubble">
      <span class="bubble__glow"></span>
      <svg viewBox="0 0 240 150" width="430" height="269" fill="none">
        <rect x="5" y="5" width="230" height="140" rx="50" stroke="#f4ecd8" stroke-width="7"/>
        <circle cx="86" cy="78" r="13" fill="#e2b93f"/>
        <circle cx="122" cy="78" r="13" fill="#e2b93f"/>
        <circle cx="158" cy="78" r="13" fill="#e2b93f"/>
      </svg>
    </div>
    <div class="name gold">İletişim</div>
    <div class="kicker">BİZE ULAŞ</div>
  </div>
</body></html>`;

/* ---------- Üret ---------- */
const DIR = join(ROOT, 'brand');
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const tmp = join(ROOT, 'sosyal-tmp.html');

const JOBS = [
  { file: 'sosyal-hikaye-1080x1920.png', w: 1080, h: 1920, page: story(false) },
  { file: 'sosyal-hikaye-foto-1080x1920.png', w: 1080, h: 1920, page: story(true) },
  { file: 'sosyal-kare-1080x1080.png', w: 1080, h: 1080, page: square },
];
for (const j of JOBS) {
  writeFileSync(tmp, j.page);
  try {
    await tab.setViewportSize({ width: j.w, height: j.h });
    await tab.goto('file://' + tmp, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await tab.waitForTimeout(200);
    await tab.screenshot({ path: join(DIR, j.file) });
  } finally { unlinkSync(tmp); }
  console.log(`brand/${j.file}  ${j.w}×${j.h}`);
}
await browser.close();
