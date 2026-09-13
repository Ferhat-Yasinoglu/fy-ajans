#!/usr/bin/env node
/* FY — kişi kartı (vCard) üreticisi

   Bağlantı sayfasındaki «Rehbere ekle» satırının indirdiği dosyayı üretir. Telefonda
   dokununca kişi kartı açılır: ad, unvan, e-posta, site, sosyal hesaplar ve fotoğraf.

   Kaynak (tek doğruluk noktası — hepsi sitenin kendisinden okunur):
     contact/index.html   ad ve unvan (links.name, links.role), sosyal bağlantılar, site adresi
     js/main.js           e-posta adresi (HTML'de düz metin durmadığı için oradan)
     img/founder.jpg      fotoğraf; karta 512×512 kare olarak gömülür

   Çıktı:  farhad-yaqoobi.vcf   (vCard 3.0; kökte durur ki dört dilin sayfası da aynı dosyayı
           gösterebilsin — build-i18n yalnızca köke işaret eden göreli yolları derinleştirir)

   Kullanım (depo kökünde):   node tools/build-vcard.mjs

   Fotoğraf, unvan ya da hesaplar değişince yeniden çalıştır.
   Fotoğrafın karesi Playwright + Chromium ile kırpılır; kırpma sayfadaki yuvarlak
   avatarla aynıdır (object-fit: cover, object-position: 50% 28%). */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Playwright bulunamadı — kart üretilmedi. Depo kökünde:  npm i --no-save playwright && npx playwright install chromium\n(global kurulum için NODE_PATH=<global node_modules> ile göster).'); process.exit(1); }

if (!existsSync(join(ROOT, 'img/founder.jpg'))) { console.error('img/founder.jpg yok — kart üretilmedi.'); process.exit(1); }

const html = readFileSync(join(ROOT, 'contact/index.html'), 'utf8');
const strip = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* ---------- Alanlar, sitenin kendisinden ---------- */
const i18nText = (key) => {
  const m = html.match(new RegExp(`data-i18n="${key}"[^>]*>([\\s\\S]*?)</`));
  if (!m) throw new Error(`contact/index.html içinde "${key}" bulunamadı`);
  return strip(m[1]);
};

// E-posta js/main.js'te parça parça durur (HTML'de düz metin bırakılmıyor); aynı yerden okunur
const mainJs = readFileSync(join(ROOT, 'js/main.js'), 'utf8');
const mailParts = mainJs.match(/var MAIL = \[([^\]]+)\]\.join\('@'\)/);
if (!mailParts) throw new Error('js/main.js içinde MAIL tanımı bulunamadı');
const EMAIL = mailParts[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).join('@');

// Sosyal bağlantılar sayfadaki href'lerden; hesap adı değişirse kart da değişir
const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
const byHost = (host) => hrefs.find(u => u.includes(host)) || null;

const SITE = (readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
if (!SITE) throw new Error('index.html içinde canonical bulunamadı');

const FULL = i18nText('links.name');            // "Farhad Yaqoobi"
const ROLE = i18nText('links.role');            // "FY Kurucusu · Yapay zekâ eğitmeni"
const parts = FULL.split(' ');
const LAST = parts.length > 1 ? parts.pop() : '';
const FIRST = parts.join(' ');

/* ---------- Fotoğraf: kare kırpım, sayfadaki avatarla aynı çerçeveleme ---------- */
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const tab = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
const tmp = join(ROOT, 'vcard-tmp.html');
let photo;
try {
  writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: 512px; height: 512px; background: #0b0906; }
    img { width: 512px; height: 512px; object-fit: cover; object-position: 50% 28%; display: block; }
  </style></head><body><img src="img/founder.jpg"></body></html>`);
  await tab.goto('file://' + tmp, { waitUntil: 'load' });
  await tab.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  photo = await tab.screenshot({ type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 512, height: 512 } });
} finally {
  await browser.close();
  if (existsSync(tmp)) unlinkSync(tmp);
}

/* ---------- vCard ----------
   3.0 sürümü seçildi: iOS Kişiler ve Android'in vCard okuyucuları en geniş desteği buna veriyor.
   Kaçışlar RFC 2426'ya göre: ters bölü, virgül, noktalı virgül ve satır sonu. */
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

const lines = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  `N;CHARSET=UTF-8:${esc(LAST)};${esc(FIRST)};;;`,
  `FN;CHARSET=UTF-8:${esc(FULL)}`,
  'ORG;CHARSET=UTF-8:FY',
  `TITLE;CHARSET=UTF-8:${esc(ROLE)}`,
  `EMAIL;TYPE=INTERNET,PREF:${EMAIL}`,
  `URL:${SITE}`,
];
for (const [label, host] of [['LinkedIn', 'linkedin.com'], ['Instagram', 'instagram.com'], ['GitHub', 'github.com']]) {
  const u = byHost(host);
  if (u) lines.push(`X-SOCIALPROFILE;TYPE=${label.toLowerCase()}:${u}`);
}
lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString('base64')}`);
lines.push(`REV:${new Date().toISOString().replace(/\.\d{3}/, '')}`);
lines.push('END:VCARD');

/* Satır katlama: RFC 2426 bir satırı 75 sekizliyle sınırlar, devam satırı tek boşlukla başlar.
   Uzunluk karakterle değil sekizlikle (UTF-8 bayt) ölçülür, yoksa Türkçe/Farsça harfler taşırır. */
function fold(line) {
  const buf = Buffer.from(line, 'utf8');
  if (buf.length <= 75) return line;
  const out = [];
  let i = 0, limit = 75;
  while (i < buf.length) {
    let end = Math.min(i + limit, buf.length);
    // çok baytlı karakterin ortasından bölme
    while (end > i && end < buf.length && (buf[end] & 0xc0) === 0x80) end--;
    out.push((out.length ? ' ' : '') + buf.subarray(i, end).toString('utf8'));
    i = end; limit = 74;   // devam satırlarında baştaki boşluk da sayılır
  }
  return out.join('\r\n');
}

const vcf = lines.map(fold).join('\r\n') + '\r\n';
const OUT = 'farhad-yaqoobi.vcf';
writeFileSync(join(ROOT, OUT), vcf, 'utf8');
console.log(`${OUT}  ${(Buffer.byteLength(vcf) / 1024).toFixed(0)} KB  —  ${FULL} · ${ROLE} · ${EMAIL}`);
