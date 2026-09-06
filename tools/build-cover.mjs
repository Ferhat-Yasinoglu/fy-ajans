#!/usr/bin/env node
/* Kurs kapağı arka planı — "Yapay Zekâ Yolculuğu" portalı: yıldızlı gece, halkanın arkasında nefes alan altın ışık,
   ortadan çıkan yavaşça dönen ışık huzmeleri, halkanın çevresinde dönen toz parçacıkları.
   Çıktılar: img/cover-scene.svg (canlı) ve img/cover-scene-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-cover.mjs

   Sahne 1000×1000. Altın halka, kuyruklu ışık, yedi durak, yazılar ve FY logosu HTML katmanlarıdır (css .cover*,
   satır içi .cover__ring SVG'si) — böylece duraklar ve başlık dört dilde değişir, kuyruklu ışıkla durak nabızları aynı
   zaman çizgisinde kalır. Halka merkezi (500, 600) ve yarıçapı 245: css'teki .cover__ring (top 60cqw, genişlik 56cqw)
   ve durak konumları bu değerlerden türetilir. Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260906);
const rnd = (a, b) => a + (b - a) * R();
const CX = 500, CY = 600, RING = 245;

/* ---------- Gökyüzü ızgarası (çok silik) ---------- */
let grid = '';
for (let x = 50; x < 1000; x += 50) grid += `<path d="M${x} 0V1000"/>`;
for (let y = 50; y < 1000; y += 50) grid += `<path d="M0 ${y}H1000"/>`;

/* ---------- Yıldızlar: halkanın içi boş kalsın (logo ve halka temiz dursun) ---------- */
const stars = [];
while (stars.length < 110) {
  const x = rnd(0, 1000), y = rnd(0, 1000);
  if (Math.hypot(x - CX, y - CY) < RING - 20) continue;
  stars.push({ x, y, r: rnd(.9, 2.4), d: rnd(2, 5), dl: rnd(0, 5), c: R() < .85 ? '#fff3c4' : '#9bc3ff' });
}
for (let i = 0; i < 8; i++) { const [x, y] = P(rnd(RING + 40, 420), rnd(0, 360)); stars.push({ x: CX + x, y: CY + y, r: rnd(7, 12), d: rnd(3, 6), dl: rnd(0, 5), c: 'url(#gSoft)' }); }
const starSvg = stars.map(s => `<circle class="tw" cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(s.r)}" fill="${s.c}" style="animation-duration:${f1(s.d)}s;animation-delay:-${f1(s.dl)}s"/>`).join('');

/* ---------- Işık huzmeleri: merkezden çıkan ince kamalar, çok yavaş döner ---------- */
let rays = '';
for (let i = 0; i < 14; i++) {
  const a = i * (360 / 14) + rnd(-6, 6), w = rnd(1.2, 3.2), len = rnd(520, 700);
  const [x1, y1] = P(len, a - w / 2), [x2, y2] = P(len, a + w / 2);
  rays += `<path d="M0 0L${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}Z" opacity="${f1(rnd(.35, .9))}"/>`;
}

/* ---------- Toz: halkanın dışında iki kuşakta dönen minik noktalar ---------- */
function dust(rMin, rMax, n, cls) {
  let s = '';
  for (let i = 0; i < n; i++) { const [x, y] = P(rnd(rMin, rMax), rnd(0, 360)); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rnd(1, 2.6))}" opacity="${f1(rnd(.25, .8))}"/>`; }
  return `<g class="${cls}" fill="#ffe9a3">${s}</g>`;
}

/* ---------- Stil ---------- */
function style(anim) {
  if (!anim) return '';
  return `<style>
.tw{animation:twinkle 3s ease-in-out infinite alternate}
.glow{transform-box:fill-box;transform-origin:center;animation:breathe 5s ease-in-out infinite alternate}
.rays{animation:spin 140s linear infinite}
.d1{animation:spin 90s linear infinite}.d2{animation:spin 130s linear infinite reverse}
.orbit{animation:spin 48s linear infinite}
@keyframes twinkle{from{opacity:.15}to{opacity:1}}
@keyframes breathe{from{opacity:.7;transform:scale(.96)}to{opacity:1;transform:scale(1.05)}}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;
}

function svg(anim) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" aria-hidden="true">
<!-- Üretildi: tools/build-cover.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="gBg" cx="${CX / 1000}" cy="${CY / 1000}" r=".75"><stop offset="0" stop-color="#241a06"/><stop offset=".45" stop-color="#0d0a05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="gGlow"><stop offset="0" stop-color="#ffefbe" stop-opacity=".55"/><stop offset=".38" stop-color="#e9bf48" stop-opacity=".22"/><stop offset=".7" stop-color="#d4af37" stop-opacity=".06"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="gCore"><stop offset="0" stop-color="#fff6d6" stop-opacity=".5"/><stop offset=".6" stop-color="#f5d76e" stop-opacity=".12"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<radialGradient id="gSoft"><stop offset="0" stop-color="#fff3c4" stop-opacity=".8"/><stop offset=".5" stop-color="#f5d76e" stop-opacity=".3"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<radialGradient id="gRay" cx="0" cy="0" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".16"/><stop offset=".45" stop-color="#ffe9a3" stop-opacity=".05"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity="0"/><stop offset="1" stop-color="#d4af37" stop-opacity=".12"/></linearGradient>
</defs>
${style(anim)}
<rect width="1000" height="1000" fill="url(#gBg)"/>
<g fill="none" stroke="#d4af37" stroke-width="1" opacity=".045">${grid}</g>
<rect x="0" y="700" width="1000" height="300" fill="url(#gFloor)"/>
<g transform="translate(${CX} ${CY})">
<g class="rays" fill="url(#gRay)">${rays}</g>
<circle class="glow" r="${RING + 110}" fill="url(#gGlow)"/>
<circle r="${RING - 40}" fill="url(#gCore)"/>
<g class="orbit" fill="none" stroke="#f5d76e" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="2 14" stroke-linecap="round"><circle r="${RING + 62}"/></g>
${dust(RING + 30, RING + 120, 46, 'd1')}
${dust(RING + 130, 440, 34, 'd2')}
</g>
<g class="stars">${starSvg}</g>
</svg>
`;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
const live = svg(true);
const stat = svg(false).replace(/ style="animation-[^"]*"/g, '');
writeFileSync(join(ROOT, 'img/cover-scene.svg'), live);
writeFileSync(join(ROOT, 'img/cover-scene-static.svg'), stat);
console.log(`img/cover-scene.svg (${(live.length / 1024).toFixed(1)} KB), img/cover-scene-static.svg (${(stat.length / 1024).toFixed(1)} KB)`);
