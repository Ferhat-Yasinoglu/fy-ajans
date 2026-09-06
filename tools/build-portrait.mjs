#!/usr/bin/env node
/* Portre aurası — kurucu fotoğrafının etrafındaki altın "enerji" çerçevesi.
   Çıktılar: img/portrait-aura.svg (canlı) ve img/portrait-aura-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-portrait.mjs

   Sahne 1000×1000, merkez (0,0)'a taşınmış; fotoğraf dairesi yarıçapı PR=320 (HTML'de fotoğraf tam bu daireyi kaplar,
   .portrait__aura bu yüzden fotoğraf kutusundan her yöne %28,125 taşar: 1000/640 = 1,5625).
   Katmanlar dıştan içe: kıvılcımlar, dikey ışık çubukları, noktalı yaylar (iki grup, zıt yönde döner),
   sıvı altın şeritler (iki grup, zıt yönde döner, her şerit nefes alır), kalın altın halka (dönen parlama süpürmeli).
   Süzgeç (blur) yok: parıltı, genişleyen yarı saydam kopyalarla çizilir — telefonlarda da akıcı kalsın diye.
   Rastgelelik tohumlu: aynı betik hep aynı dosyayı üretir. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PR = 320;                       // fotoğraf yarıçapı
const RING = { r: 344, w: 22 };       // kalın altın halka (iç kenar 333, dış kenar 355)

import { rng, f1, P, smooth, ribbon, arc } from './lib/gold.mjs';

const R = rng(20260905);
const rnd = (a, b) => a + (b - a) * R();

/* ---------- Şeritler ---------- */
const ribbonsA = [], ribbonsB = [];
for (let i = 0; i < 5; i++) ribbonsA.push({ a0: i * 72 + rnd(-20, 20), span: rnd(150, 240), R: rnd(376, 434), A: rnd(16, 32), k: rnd(1.6, 3.2), ph: rnd(0, 6.28), W: rnd(20, 42) });
for (let i = 0; i < 4; i++) ribbonsB.push({ a0: i * 90 + rnd(-30, 30), span: rnd(120, 210), R: rnd(398, 462), A: rnd(12, 26), k: rnd(1.8, 3.6), ph: rnd(0, 6.28), W: rnd(12, 28) });

function ribbonSvg(list, cls) {
  return list.map((o, i) => {
    const g = ribbon(o, 3.2), m = ribbon(o, 1.9), c = ribbon(o, 1);
    return `<g class="${cls} rb${i}">` +
      `<path d="${g.body}" fill="url(#gGlow)" opacity=".2"/>` +
      `<path d="${m.body}" fill="url(#gGlow)" opacity=".34"/>` +
      `<path d="${c.body}" fill="url(#gRib)"/>` +
      `<path d="${c.core}" fill="none" stroke="#fff7d6" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>` +
      `</g>`;
  }).join('\n');
}

/* ---------- Noktalı yaylar ---------- */
function dotArcs(specs) {
  return specs.map(s => `<path d="${arc(s.r, s.a0, s.a1)}" fill="none" stroke="${s.c || '#f5d76e'}" stroke-width="${s.w}" stroke-linecap="round" stroke-dasharray="0 ${s.gap}" opacity="${s.o}"/>`).join('\n');
}
const arcsC = [
  { r: 404, a0: 200, a1: 330, w: 4.2, gap: 13, o: .95 }, { r: 404, a0: 20, a1: 110, w: 4.2, gap: 13, o: .75 },
  { r: 452, a0: 250, a1: 30, w: 3.2, gap: 10, o: .8 }, { r: 452, a0: 90, a1: 200, w: 3.2, gap: 10, o: .6 },
];
const arcsD = [
  { r: 486, a0: 300, a1: 80, w: 3.6, gap: 16, o: .9 }, { r: 486, a0: 130, a1: 250, w: 3.6, gap: 16, o: .6 },
  { r: 430, a0: 140, a1: 190, w: 2.6, gap: 8, o: .7, c: '#fff1b0' }, { r: 468, a0: 10, a1: 120, w: 2.4, gap: 7, o: .75, c: '#fff1b0' },
  { r: 508, a0: 200, a1: 330, w: 3, gap: 12, o: .7 },
];
// a1 < a0 olan yaylar 360 üzerinden döner
for (const s of [...arcsC, ...arcsD]) if (s.a1 < s.a0) s.a1 += 360;

/* ---------- Dikey ışık çubukları ---------- */
const bars = [
  { deg: -52, r: 478, h: 96 }, { deg: -44, r: 500, h: 64 }, { deg: -60, r: 512, h: 48 },
  { deg: 200, r: 470, h: 80 }, { deg: 214, r: 505, h: 56 },
  { deg: 118, r: 480, h: 88 }, { deg: 130, r: 510, h: 52 },
  { deg: 8, r: 512, h: 72 }, { deg: 150, r: 520, h: 40 }, { deg: 250, r: 505, h: 60 },
].map((b, i) => { const [x, y] = P(b.r, b.deg); return { x, y, h: b.h, w: 7, d: rnd(0, 3), i }; });
const barSvg = bars.map(b => `<rect class="bar b${b.i}" x="${f1(b.x - b.w / 2)}" y="${f1(b.y - b.h / 2)}" width="${b.w}" height="${b.h}" rx="3.5" fill="url(#gBar)" style="animation-delay:-${f1(b.d)}s"/>` +
  `<circle cx="${f1(b.x)}" cy="${f1(b.y + b.h / 2 + 14)}" r="3.5" fill="#f5d76e" opacity=".8"/>`).join('\n');

/* ---------- Kıvılcımlar ---------- */
const sparks = [];
for (let i = 0; i < 70; i++) { const [x, y] = P(rnd(372, 524), rnd(0, 360)); sparks.push({ x, y, r: rnd(1.6, 4.4), d: rnd(1.8, 4.5), dl: rnd(0, 4), soft: false }); }
for (let i = 0; i < 10; i++) { const [x, y] = P(rnd(390, 508), rnd(0, 360)); sparks.push({ x, y, r: rnd(7, 15), d: rnd(3, 6), dl: rnd(0, 5), soft: true }); }
const sparkSvg = sparks.map((s, i) => `<circle class="sp" cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(s.r)}" fill="${s.soft ? 'url(#gSoft)' : '#fff3c4'}"${s.soft ? '' : ' opacity=".9"'} style="animation-duration:${f1(s.d)}s;animation-delay:-${f1(s.dl)}s"/>`).join('\n');

/* ---------- Halka ---------- */
const circ = 2 * Math.PI * RING.r;
const ringSvg = `
<circle r="${RING.r}" fill="none" stroke="#d4af37" stroke-width="90" opacity=".06"/>
<circle r="${RING.r}" fill="none" stroke="#d4af37" stroke-width="60" opacity=".1"/>
<circle r="${RING.r}" fill="none" stroke="#e9c552" stroke-width="38" opacity=".16"/>
<circle r="${RING.r}" fill="none" stroke="url(#gRing)" stroke-width="${RING.w}"/>
<circle r="${RING.r - RING.w / 2 + 1}" fill="none" stroke="#fff1b0" stroke-width="1.4" opacity=".55"/>
<circle r="${RING.r + RING.w / 2 - 1}" fill="none" stroke="#fff1b0" stroke-width="1.4" opacity=".45"/>
<g class="sweep"><circle r="${RING.r}" fill="none" stroke="#fffbe6" stroke-width="${RING.w - 4}" stroke-linecap="round" stroke-dasharray="${f1(circ * .18)} ${f1(circ * .82)}" opacity=".55"/></g>
<g class="sweep sweep2"><circle r="${RING.r}" fill="none" stroke="#fff3c4" stroke-width="${RING.w - 8}" stroke-linecap="round" stroke-dasharray="${f1(circ * .08)} ${f1(circ * .92)}" opacity=".35"/></g>`;

/* ---------- Stil ---------- */
function style(anim) {
  const rib = [...ribbonsA.map((_, i) => `.ra.rb${i}{animation:breathe ${f1(rnd(3.2, 5.6))}s ease-in-out ${f1(-rnd(0, 4))}s infinite alternate}`),
               ...ribbonsB.map((_, i) => `.rbb.rb${i}{animation:breathe ${f1(rnd(3.2, 5.6))}s ease-in-out ${f1(-rnd(0, 4))}s infinite alternate}`)].join('');
  if (!anim) return '';
  return `<style>
.gA{animation:spin 70s linear infinite}.gB{animation:spin 95s linear infinite reverse}
.gC{animation:spin 120s linear infinite reverse}.gD{animation:spin 150s linear infinite}
.sweep{animation:spin 7s linear infinite}.sweep2{animation:spin 11s linear infinite reverse}
.bar{transform-box:fill-box;transform-origin:center;animation:bar 2.6s ease-in-out infinite alternate}
.sp{animation:twinkle 3s ease-in-out infinite alternate}
${rib}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breathe{from{opacity:.62}to{opacity:1}}
@keyframes bar{from{transform:scaleY(.55);opacity:.5}to{transform:scaleY(1.15);opacity:1}}
@keyframes twinkle{from{opacity:.15}to{opacity:1}}
</style>`;
}

function svg(anim) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" aria-hidden="true">
<!-- Üretildi: tools/build-portrait.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<linearGradient id="gRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6512"/><stop offset=".3" stop-color="#d4af37"/><stop offset=".55" stop-color="#ffe680"/><stop offset=".8" stop-color="#c9a02c"/><stop offset="1" stop-color="#7a5a10"/></linearGradient>
<linearGradient id="gRib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8891c"/><stop offset=".45" stop-color="#ffe27a"/><stop offset=".6" stop-color="#fff6c8"/><stop offset="1" stop-color="#c79a22"/></linearGradient>
<radialGradient id="gGlow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#d4af37"/></radialGradient>
<radialGradient id="gSoft"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".5" stop-color="#f5d76e" stop-opacity=".35"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680" stop-opacity="0"/><stop offset=".5" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></linearGradient>
</defs>
${style(anim)}
<g transform="translate(500 500)">
<g class="sparks">${sparkSvg}</g>
<g class="bars">${barSvg}</g>
<g class="gD">${dotArcs(arcsD)}</g>
<g class="gC">${dotArcs(arcsC)}</g>
<g class="gB">${ribbonSvg(ribbonsB, 'rbb')}</g>
<g class="gA">${ribbonSvg(ribbonsA, 'ra')}</g>
<g class="ring">${ringSvg}</g>
</g>
</svg>
`;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
const live = svg(true);
// Sabit sürüm: aynı sahne, stil bloğu yok (tüm katmanlar başlangıç konumunda, tam görünür)
const stat = svg(false).replace(/ style="animation-[^"]*"/g, '');
writeFileSync(join(ROOT, 'img/portrait-aura.svg'), live);
writeFileSync(join(ROOT, 'img/portrait-aura-static.svg'), stat);
console.log(`img/portrait-aura.svg (${(live.length / 1024).toFixed(1)} KB), img/portrait-aura-static.svg (${(stat.length / 1024).toFixed(1)} KB)`);
