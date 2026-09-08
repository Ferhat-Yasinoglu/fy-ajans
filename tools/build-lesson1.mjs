#!/usr/bin/env node
/* Bölüm 1 dersinin kapağı — "dağınık dilden düzenli cevaba".
   Solda kopuk kopuk dil parçaları, ortada onları toplayan ışıklı çekirdek, sağda düzene girmiş satırlar:
   dersin anlattığı şeyin resmi. Sahne 1600×686 (21:9) — kapak kutusu da 21:9, böylece kırpılmaz;
   dar ekranda kenarlardan kırpılır, o yüzden anlam merkezde toplanır.

   Çıktılar: img/course/l1-cover.svg (canlı) ve img/course/l1-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson1.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1 } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260908);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686, CX = 800, CY = 343;

/* ---------- Sol: dağınık dil parçaları ---------- */
let frag = '';
const fragPts = [];
for (let i = 0; i < 52; i++) {
  const x = rnd(40, 590), y = rnd(70, 616);
  const d = Math.hypot((x - CX) / 620, (y - CY) / 330);          // merkeze yaklaştıkça belirginleşir
  const len = rnd(16, 54), rot = rnd(-24, 24), op = (0.5 - Math.min(d, 1) * 0.34) * rnd(.5, 1.25);
  frag += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(len)}" height="3" rx="1.5" opacity="${f1(Math.max(.06, op))}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
  if (i % 6 === 0) fragPts.push([x + len, y]);
}

/* ---------- Sağ: düzene girmiş satırlar ---------- */
let lines = '';
const linePts = [];
for (let g = 0; g < 7; g++) {
  const gx = 1046 + g * 76, n = 4 + Math.floor(rnd(0, 2.4));
  const top = CY - 44 + rnd(-14, 14);                            // ortak bant: dağınıklığın karşıtı
  const op = Math.max(.09, .6 - g * .073);
  linePts.push([gx, top + n * 6]);
  for (let k = 0; k < n; k++) {
    const w = (k === n - 1 ? rnd(20, 34) : rnd(42, 62)) * (1 - g * .05);   // son satır kısa: paragraf hissi
    lines += `<rect x="${f1(gx)}" y="${f1(top + k * 13)}" width="${f1(Math.max(12, w))}" height="3.4" rx="1.7" opacity="${f1(op * rnd(.82, 1))}"/>`;
  }
}

/* ---------- Çekirdeğe giren ve çıkan lifler ---------- */
function thread(x1, y1, x2, y2, bow) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bow;
  return `M${f1(x1)} ${f1(y1)} Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)}`;
}
let fibers = '', packets = '';
const IN = fragPts.slice(0, 8).map(([x, y]) => thread(x, y, CX - 124, CY + rnd(-50, 50), rnd(-52, 52)));
const OUT = linePts.map(([x, y]) => thread(CX + 124, CY + rnd(-46, 46), x - 10, y, rnd(-46, 46)));
[...IN, ...OUT].forEach((d, i) => {
  fibers += `<path d="${d}" opacity="${f1(rnd(.16, .4))}"/>`;
  if (i % 2 === 0) packets += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="4 96" style="animation-delay:-${f1(rnd(0, 4.4))}s;animation-duration:${f1(rnd(3.4, 5.2))}s"/>`;
});

/* ---------- Çekirdek: iç düğüm kümesi ---------- */
const nodes = [];
for (let i = 0; i < 26; i++) {
  const a = rnd(0, 360) * Math.PI / 180, r = Math.sqrt(R()) * 74;
  nodes.push([CX + r * Math.cos(a), CY + r * Math.sin(a), rnd(1.4, 3.4)]);
}
let mesh = '';
for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
  const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
  if (d < 46) mesh += `<path d="M${f1(nodes[i][0])} ${f1(nodes[i][1])}L${f1(nodes[j][0])} ${f1(nodes[j][1])}" opacity="${f1(.34 * (1 - d / 46))}"/>`;
}
const dots = nodes.map(([x, y, r]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"/>`).join('');

/* ---------- Çekirdeği saran yaylar ---------- */
const arcs = [[104, 34, 214], [130, 232, 118], [158, 6, 96], [158, 168, 74]]
  .map(([r, a0, span], i) => {
    const t0 = a0 * Math.PI / 180, t1 = (a0 + span) * Math.PI / 180, large = span > 180 ? 1 : 0;
    return `<path class="ar${i % 2}" d="M${f1(CX + r * Math.cos(t0))} ${f1(CY + r * Math.sin(t0))}A${r} ${r} 0 ${large} 1 ${f1(CX + r * Math.cos(t1))} ${f1(CY + r * Math.sin(t1))}" stroke-width="${i === 3 ? 1.1 : 1.7}"/>`;
  }).join('');

/* ---------- Toz ---------- */
let dust = '';
for (let i = 0; i < 54; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.9))}" opacity="${f1(rnd(.12, .5))}"/>`;

const CSS = `<style>
.ar0{transform-box:fill-box;transform-origin:center;animation:spin 46s linear infinite}
.ar1{transform-box:fill-box;transform-origin:center;animation:spin 68s linear infinite reverse}
.core{transform-box:fill-box;transform-origin:center;animation:breathe 4.6s ease-in-out infinite alternate}
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breathe{from{opacity:.72;transform:scale(.97)}to{opacity:1;transform:scale(1.04)}}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson1.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".5" cy=".5" r=".72"><stop offset="0" stop-color="#241a06"/><stop offset=".42" stop-color="#120d05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".6"/><stop offset=".45" stop-color="#e9bf48" stop-opacity=".2"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="hot"><stop offset="0" stop-color="#fffdf2"/><stop offset=".5" stop-color="#ffe9a3" stop-opacity=".8"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="fib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#f5d76e"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${dust}</g>
<g fill="#d4af37">${frag}</g>
<g fill="#f5d76e">${lines}</g>
<g fill="none" stroke="url(#fib)" stroke-width="1.1">${fibers}</g>
<g fill="none" stroke="#fff3c4" stroke-width="2.4" stroke-linecap="round">${packets}</g>
<circle class="${anim ? 'core' : ''}" cx="${CX}" cy="${CY}" r="258" fill="url(#halo)"/>
<g fill="none" stroke="url(#ring)" stroke-linecap="round">${arcs}</g>
<g fill="none" stroke="#f5d76e" stroke-width=".9">${mesh}</g>
<g fill="#ffe9a3">${dots}</g>
<circle cx="${CX}" cy="${CY}" r="44" fill="url(#hot)"/>
<circle cx="${CX}" cy="${CY}" r="4.6" fill="#fffdf2"/>
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l1-cover.svg', svg(true)], ['l1-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
