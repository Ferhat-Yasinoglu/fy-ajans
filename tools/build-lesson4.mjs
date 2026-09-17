#!/usr/bin/env node
/* Bölüm 4 dersinin kapağı — "atölye".
   Ortada bir terminal penceresi: satırlar tek tek yazılıyor, altta yanıp sönen bir imleç. Solda skill
   kartları destesi, sağda üç küçük alt-ajan penceresi ana pencereye iplerle bağlı; iplerde paketler.
   Sol üstte hafıza çipi — beyin. Bölüm 1 çekirdek, 2 mekanizma, 3 ağ; bu bir tezgâh: insan yok ama
   iş var. Sahne 1600×686 (21:9).

   Çıktılar: img/course/l4-cover.svg (canlı) ve img/course/l4-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson4.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1 } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260917);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686;

/* ---------- Ana pencere: terminal ---------- */
const T = { x: 470, y: 118, w: 660, h: 450, bar: 34 };
const win = (x, y, w, h, rx, op = 1) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.6" opacity="${op}"/>` +
  `<path d="M${x} ${y + 34}h${w}" stroke="#d4af37" stroke-width="1" opacity=".25"/>` +
  `<circle cx="${x + 18}" cy="${y + 17}" r="4" fill="#f5d76e" opacity=".55"/><circle cx="${x + 32}" cy="${y + 17}" r="4" fill="#f5d76e" opacity=".35"/><circle cx="${x + 46}" cy="${y + 17}" r="4" fill="#f5d76e" opacity=".2"/>`;

/* Satırlar: yazılma animasyonu için pathLength=100 + dash. Bazıları girintili, üçü "+" ile fark satırı. */
let lines = '', marks = '';
const L0 = T.y + T.bar + 30, LH = 26, NL = 14;
for (let i = 0; i < NL; i++) {
  const y = L0 + i * LH;
  const indent = (i >= 2 && i <= 5) || (i >= 9 && i <= 11) ? 30 : 0;
  const diff = i >= 8 && i <= 10;
  const w = Math.round(rnd(diff ? 220 : 120, diff ? 420 : 520) - indent);
  const x = T.x + 34 + indent + (diff ? 18 : 0);
  lines += `<path class="ln" d="M${x} ${y}h${w}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" stroke-width="${diff ? 4 : 3}" opacity="${diff ? '.95' : f1(rnd(.35, .6))}" style="animation-delay:${f1(i * .5)}s"/>`;
  if (diff) marks += `<path class="ln" d="M${T.x + 34 + indent + 2} ${y - 5}v10M${T.x + 34 + indent - 3} ${y}h10" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0" stroke="#fff3c4" stroke-width="2" style="animation-delay:${f1(i * .5)}s"/>`;
}
const promptY = T.y + T.h - 28;
const prompt = `<path d="M${T.x + 34} ${promptY - 7}l7 7l-7 7" fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<rect class="cur" x="${T.x + 52}" y="${promptY - 9}" width="10" height="18" fill="#fff3c4"/>`;

/* ---------- Skill kartları: solda deste ---------- */
let cards = '';
const cardAt = (x, y, glow) => {
  const w = 230, h = 150;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="url(#winFill)" stroke="url(#ring)" stroke-width="${glow ? 1.8 : 1.2}" opacity="${glow ? 1 : .8}"/>` +
    `<rect x="${x + 18}" y="${y + 18}" width="64" height="7" rx="3.5" fill="#f5d76e" opacity="${glow ? '.9' : '.45'}"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${x + 18} ${y + 52 + i * 22}h${Math.round(rnd(90, 190))}" stroke="#ffe9a3" stroke-width="3" stroke-linecap="round" opacity="${glow ? '.5' : '.28'}"/>`;
  if (glow) s += `<rect class="cardGlow" x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="18" fill="none" stroke="#f5d76e" stroke-width="1"/>`;
  return s;
};
cards += cardAt(150, 230, false) + cardAt(172, 264, false) + cardAt(194, 298, true);

/* ---------- Alt-ajan pencereleri: sağda üç küçük pencere + ipler ---------- */
let subs = '', threads = '', packets = '';
[140, 290, 440].forEach((y, i) => {
  const x = 1230, w = 240, h = 110;
  subs += `<g class="sub" style="animation-delay:${f1(i * 1.1)}s">` + win(x, y, w, h, 12, .9) +
    `<path d="M${x + 18} ${y + 58}h${Math.round(rnd(110, 190))}M${x + 18} ${y + 80}h${Math.round(rnd(70, 150))}" stroke="#ffe9a3" stroke-width="3" stroke-linecap="round" opacity=".4"/></g>`;
  const x1 = T.x + T.w, y1 = T.y + T.h / 2, x2 = x, y2 = y + h / 2, c = (x2 - x1) * .5;
  const d = `M${x1} ${y1} C${x1 + c} ${y1} ${x2 - c} ${y2} ${x2} ${y2}`;
  threads += `<path d="${d}"/>`;
  packets += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="6 94" style="animation-duration:${f1(rnd(2.4, 3.2))}s;animation-delay:${f1(-i * .9)}s"/>` +
    `<path class="pk pk--back" d="${d}" pathLength="100" stroke-dasharray="4 96" style="animation-duration:${f1(rnd(2.8, 3.6))}s;animation-delay:${f1(-i * .7 - 1.3)}s" opacity=".6"/>`;
});

/* ---------- Hafıza çipi: sol üst ---------- */
const chip = (() => {
  const x = 250, y = 120, s = 70;
  let g = `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="16" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.6"/>`;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) g += `<circle cx="${x + i * 16}" cy="${y + j * 16}" r="${i === 0 && j === 0 ? 4 : 2.6}" fill="#fff3c4" opacity="${i === 0 && j === 0 ? 1 : .6}"/>`;
  for (let i = -1; i <= 1; i++) g += `<path d="M${x + i * 16} ${y - s / 2}v-12M${x + i * 16} ${y + s / 2}v12M${x - s / 2} ${y + i * 16}h-12M${x + s / 2} ${y + i * 16}h12" stroke="#d4af37" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
  g += `<rect class="chipGlow" x="${x - s / 2 - 7}" y="${y - s / 2 - 7}" width="${s + 14}" height="${s + 14}" rx="20" fill="none" stroke="#f5d76e" stroke-width="1"/>`;
  return g;
})();
/* Çipten ana pencereye ip */
const chipWire = `<path d="M285 120 C 380 120 400 ${T.y + 17} ${T.x} ${T.y + 17}" fill="none" stroke="url(#wire)" stroke-width="1.6" opacity=".7"/>` +
  `<path class="pk" d="M285 120 C 380 120 400 ${T.y + 17} ${T.x} ${T.y + 17}" pathLength="100" stroke-dasharray="6 94" style="animation-duration:3s;animation-delay:-.6s"/>`;
/* Kartlardan ana pencereye ip */
const cardWire = `<path d="M424 373 C 450 373 450 ${T.y + T.h / 2} ${T.x} ${T.y + T.h / 2}" fill="none" stroke="url(#wire)" stroke-width="1.6" opacity=".7"/>` +
  `<path class="pk" d="M424 373 C 450 373 450 ${T.y + T.h / 2} ${T.x} ${T.y + T.h / 2}" pathLength="100" stroke-dasharray="8 92" style="animation-duration:2.6s;animation-delay:-1.1s"/>`;

/* ---------- Tezgâh zemini: noktalı ızgara + iki yatay kılavuz ---------- */
let grid = '';
for (let x = 40; x < W; x += 40) for (let y = 23; y < H; y += 40)
  grid += `<circle cx="${x}" cy="${y}" r="1" opacity="${f1(.16 + .1 * Math.sin(x * .011) * Math.cos(y * .019))}"/>`;
const bench = `<path d="M0 ${T.y + T.h + 40}H${W}M0 ${T.y + T.h + 46}H${W}" stroke="#d4af37" stroke-width="1" opacity=".18"/>`;

/* ---------- Toz ---------- */
let dust = '';
for (let i = 0; i < 40; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.7))}" opacity="${f1(rnd(.1, .4))}"/>`;

const CSS = `<style>
.ln{animation:type 18s linear infinite}
.cur{animation:blink 1.1s steps(2,start) infinite}
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
.pk--back{animation-direction:reverse}
.sub{transform-box:fill-box;transform-origin:center;animation:breathe 3.6s ease-in-out infinite alternate}
.cardGlow{animation:glow 3.2s ease-in-out infinite alternate}
.chipGlow{animation:glow 2.6s ease-in-out infinite alternate}
@keyframes type{0%{stroke-dashoffset:100}4%{stroke-dashoffset:0}92%{stroke-dashoffset:0}96%,100%{stroke-dashoffset:100}}
@keyframes blink{to{opacity:0}}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes breathe{from{opacity:.55}to{opacity:1}}
@keyframes glow{from{opacity:.2}to{opacity:.85}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson4.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".5" cy=".5" r=".76"><stop offset="0" stop-color="#1e1706"/><stop offset=".46" stop-color="#100b05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#e9bf48" stop-opacity=".2"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<linearGradient id="winFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241b07"/><stop offset="1" stop-color="#120d04"/></linearGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="wire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${grid}</g>
${bench}
<g fill="#ffe9a3">${dust}</g>
<ellipse cx="${T.x + T.w / 2}" cy="${T.y + T.h / 2}" rx="520" ry="300" fill="url(#halo)"/>
<g fill="none" stroke="url(#wire)" stroke-width="1.6" opacity=".7">${threads}</g>
${chipWire}${cardWire}
<g fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round">${packets}</g>
${cards}
${subs}
${win(T.x, T.y, T.w, T.h, 18)}
<g fill="none" stroke="#ffe9a3" stroke-linecap="round">${lines}</g>
<g fill="none" stroke-linecap="round">${marks}</g>
${prompt}
${chip}
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l4-cover.svg', svg(true)], ['l4-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
