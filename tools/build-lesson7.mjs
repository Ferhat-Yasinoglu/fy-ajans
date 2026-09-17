#!/usr/bin/env node
/* Bölüm 7 dersinin kapağı — "zirve".
   Soldan sağa yükselen bir sırt: üstünde yedi durak, her biri bir bölüm; sonuncusu zirvede bir işaret
   kulesi ve ondan yayılan ışık. Arkada doğan bir kemer, üstte yıldızlar, önde ince bir sis katmanı.
   Duraklar sırayla yanıyor — yol yürünmüş, tırmanış bitmiş. Bölüm 1 çekirdek, 2 mekanizma, 3 ağ,
   4 tezgâh, 5 laboratuvar, 6 sahne; bu bir zirve: yapılan her şeyin toplandığı yer.
   Sahne 1600×686 (21:9).

   Çıktılar: img/course/l7-cover.svg (canlı) ve img/course/l7-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson7.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P, smooth } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260920);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686;

/* ---------- Sırt çizgisi: yedi durağın oturduğu yükselen yol ----------
   Duraklar elle yerleştirildi; aralar giderek daralıyor ki tırmanış dikleşsin. */
const stops = [
  { x: 150, y: 570 }, { x: 348, y: 534 }, { x: 542, y: 482 }, { x: 726, y: 424 },
  { x: 900, y: 358 }, { x: 1062, y: 284 }, { x: 1244, y: 176 },
];
const peak = stops[6];

/* Yol: duraklardan geçen yumuşak eğri; altı da dolduruluyor ki dağ olsun */
const path = smooth(stops.map(s => [s.x, s.y]), false);
const ridge = `M0 ${H} L0 ${stops[0].y + 46} ` + path.slice(1) + ` L${W} ${peak.y + 120} L${W} ${H} Z`;
/* Arka sırt: daha soluk, biraz kaydırılmış ikinci bir siluet */
const backRidge = `M0 ${H} L0 ${stops[0].y - 8} ` + smooth(stops.map((s, i) => [s.x - 70, s.y - 56 - i * 6]), false).slice(1) + ` L${W} ${peak.y + 40} L${W} ${H} Z`;

/* Duraklar: küçük altıgen taşlar; sonuncusu daha büyük */
const hex = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 6; i++) { const [x, y] = P(r, -90 + i * 60); d += (i ? 'L' : 'M') + f1(cx + x) + ' ' + f1(cy + y); }
  return d + 'Z';
};
let marks = '';
stops.forEach((s, i) => {
  const last = i === 6, r = last ? 26 : 15;
  marks += `<path class="stop" d="${hex(s.x, s.y, r)}" fill="url(#winFill)" stroke="url(#ring)" stroke-width="${last ? 2.2 : 1.6}" style="animation-delay:${f1(i * .55)}s"/>`;
  marks += `<circle class="stopDot" cx="${s.x}" cy="${s.y}" r="${last ? 7 : 4}" fill="#fff3c4" style="animation-delay:${f1(i * .55)}s"/>`;
});

/* Zirvedeki işaret kulesi: direk + ışık halkaları */
const beacon = (() => {
  const x = peak.x, y = peak.y - 26;
  let s = `<path d="M${x} ${y}v-74" stroke="url(#ring)" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M${x} ${y - 74}l40 16l-40 16Z" fill="url(#flag)" stroke="#f5d76e" stroke-width="1.2"/>`;   // bayrak
  s += `<circle cx="${x}" cy="${y - 74}" r="5" fill="#fff3c4"/>`;
  for (let i = 0; i < 3; i++)
    s += `<circle class="ring" cx="${x}" cy="${y - 74}" r="16" fill="none" stroke="#f5d76e" stroke-width="1.4" style="animation-delay:${f1(i * 1.2)}s"/>`;
  return s;
})();

/* Yol üstünde yürüyen ışık: duraklardan geçen çizgi boyunca akan paket */
const trail = `<path class="pk" d="${path}" pathLength="100" stroke-dasharray="4 96" fill="none" stroke="#fff3c4" stroke-width="3.5" stroke-linecap="round" style="animation-duration:7s"/>`;

/* ---------- Doğan kemer: zirvenin arkasında ---------- */
const dawn = `<circle cx="${peak.x + 40}" cy="${peak.y - 10}" r="400" fill="url(#dawn)"/>` +
  `<circle cx="${peak.x + 40}" cy="${peak.y - 10}" r="170" fill="url(#dawn)" opacity=".8"/>`;

/* ---------- Yıldızlar ---------- */
let stars = '';
for (let i = 0; i < 90; i++) {
  const x = rnd(0, W), y = rnd(0, 430);
  stars += `<circle class="${R() < .3 ? 'tw' : ''}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(rnd(.7, 1.9))}" opacity="${f1(rnd(.15, .7))}" style="animation-delay:${f1(-rnd(0, 6))}s"/>`;
}

/* ---------- Ön sis: ince yatay bantlar ---------- */
let mist = '';
for (let i = 0; i < 4; i++) {
  const y = 508 + i * 44, h = rnd(46, 78), w = rnd(520, 1100), x = rnd(-120, W - w + 120);
  mist += `<ellipse class="mist" cx="${f1(x + w / 2)}" cy="${f1(y)}" rx="${f1(w / 2)}" ry="${f1(h / 2)}" style="animation-delay:${f1(-i * 2.3)}s"/>`;
}

const CSS = `<style>
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
.stop{transform-box:fill-box;transform-origin:center;animation:lightUp 9s ease-out infinite}
.stopDot{animation:dotUp 9s ease-out infinite}
.ring{transform-box:fill-box;transform-origin:center;animation:pulse 3.6s ease-out infinite}
.tw{animation:tw 4.4s ease-in-out infinite}
.mist{fill:url(#haze);opacity:.5;animation:drift 22s ease-in-out infinite alternate}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes lightUp{0%,4%{opacity:.35}12%,88%{opacity:1}96%,100%{opacity:.35}}
@keyframes dotUp{0%,4%{opacity:.25}12%,88%{opacity:1}96%,100%{opacity:.25}}
@keyframes pulse{from{transform:scale(1);opacity:.85}to{transform:scale(3.4);opacity:0}}
@keyframes tw{0%,100%{opacity:.2}50%{opacity:.9}}
@keyframes drift{from{transform:translateX(-26px)}to{transform:translateX(26px)}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson7.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".62" cy=".62" r=".9"><stop offset="0" stop-color="#1e1706"/><stop offset=".44" stop-color="#100b05"/><stop offset="1" stop-color="#040302"/></radialGradient>
<radialGradient id="haze"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".16"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
<radialGradient id="dawn"><stop offset="0" stop-color="#f5d76e" stop-opacity=".3"/><stop offset=".55" stop-color="#d4af37" stop-opacity=".1"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2008"/><stop offset="1" stop-color="#0a0703"/></linearGradient>
<linearGradient id="rockBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1406"/><stop offset="1" stop-color="#070502"/></linearGradient>
<linearGradient id="winFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241b07"/><stop offset="1" stop-color="#120d04"/></linearGradient>
<linearGradient id="flag" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5d76e"/><stop offset="1" stop-color="#d4af37" stop-opacity=".5"/></linearGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="trailG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#fff3c4"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${stars}</g>
${dawn}
<path d="${backRidge}" fill="url(#rockBack)" stroke="#d4af37" stroke-width="1" stroke-opacity=".18"/>
<path d="${ridge}" fill="url(#rock)" stroke="url(#ring)" stroke-width="1.6" stroke-opacity=".7"/>
<path d="${path}" fill="none" stroke="url(#trailG)" stroke-width="2" opacity=".55"/>
${trail}
${marks}
${beacon}
<g>${mist}</g>
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l7-cover.svg', svg(true)], ['l7-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
