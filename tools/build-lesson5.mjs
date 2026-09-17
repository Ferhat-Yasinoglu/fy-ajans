#!/usr/bin/env node
/* Bölüm 5 dersinin kapağı — "laboratuvar".
   Ortada bir cam balon: içinde bir web sayfası iskeleti kuruluyor, sıvıdan kabarcıklar çıkıyor.
   Solda üç besleme borusu (yapı, görünüm, davranış) balonun boynuna paket akıtıyor; sol üstte bir
   veritabanı silindiri ince bir hatla bağlı. Sağda balondan yükselen saptan bir takımyıldız açılıyor:
   çekirdek ve çevresinde altı uydu — kurduğun sistemin kendisi.
   Bölüm 1 çekirdek, 2 mekanizma, 3 ağ, 4 tezgâh; bu bir laboratuvar: malzeme girer, canlı bir şey çıkar.
   Sahne 1600×686 (21:9).

   Çıktılar: img/course/l5-cover.svg (canlı) ve img/course/l5-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson5.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260918);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686;

/* ---------- Cam balon: yuvarlak gövde + boyun ---------- */
const FX = 690, FY = 400, FR = 150;                                // gövde merkezi ve yarıçapı
const NW = 46, NTOP = FY - FR - 118;                                // boyun genişliği ve üst ucu
const neckY = FY - Math.sqrt(Math.max(FR * FR - (NW / 2) * (NW / 2), 1));
const flask =
  `<path d="M${FX - NW / 2} ${NTOP}V${neckY}A${FR} ${FR} 0 1 0 ${FX + NW / 2} ${neckY}V${NTOP}"
     fill="url(#glass)" stroke="url(#ring)" stroke-width="2"/>` +
  `<path d="M${FX - NW / 2 - 9} ${NTOP}h${NW + 18}" stroke="url(#ring)" stroke-width="3" stroke-linecap="round"/>`;

/* Sıvı: gövdenin alt yarısını dolduran yay + düz yüzey */
const LY = FY + 78;                                                 // sıvı yüzeyi
const half = Math.sqrt(Math.max(FR * FR - (LY - FY) * (LY - FY), 1));
const liquid = `<path d="M${f1(FX - half)} ${LY}A${FR} ${FR} 0 0 0 ${f1(FX + half)} ${LY}Z" fill="url(#brew)"/>` +
  `<path d="M${f1(FX - half)} ${LY}h${f1(half * 2)}" stroke="#f5d76e" stroke-width="1.6" opacity=".7"/>`;

/* Kabarcıklar: sıvıdan boyuna doğru yükselir */
let bubbles = '';
for (let i = 0; i < 14; i++) {
  const x = FX + rnd(-half * .78, half * .78), r = f1(rnd(2.2, 5.4));
  bubbles += `<circle class="bub" cx="${f1(x)}" cy="${LY}" r="${r}" style="animation-duration:${f1(rnd(3.2, 5.4))}s;animation-delay:${f1(-rnd(0, 5))}s"/>`;
}

/* Balonun içinde kurulan sayfa iskeleti: kenar çubuğu + başlık + üç satır */
const pg = (() => {
  const w = 178, h = 118, x = FX - w / 2, y = FY - 96;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#fff3c4" stroke-width="1.6" opacity=".9"/>`;
  s += `<path d="M${x} ${y + 22}h${w}" stroke="#fff3c4" stroke-width="1.2" opacity=".55"/>`;
  s += `<rect class="blk" x="${x + 10}" y="${y + 8}" width="34" height="7" rx="3.5" fill="#fff3c4" style="animation-delay:0s"/>`;
  s += `<rect class="blk" x="${x + 10}" y="${y + 34}" width="42" height="${h - 44}" rx="6" fill="#f5d76e" opacity=".45" style="animation-delay:.5s"/>`;
  [0, 1, 2].forEach((i) => {
    s += `<rect class="blk" x="${x + 62}" y="${y + 36 + i * 24}" width="${[96, 74, 88][i]}" height="9" rx="4.5" fill="#ffe9a3" opacity=".7" style="animation-delay:${f1(.9 + i * .45)}s"/>`;
  });
  return s;
})();

/* Ölçek çentikleri: balonun sol yüzünde, sıvı seviyesinin çevresinde */
let ticks = '';
for (let i = 0; i < 6; i++) {
  const ty = LY - 74 + i * 22, dx = Math.sqrt(Math.max(FR * FR - (ty - FY) * (ty - FY), 1));
  const long = i % 2 === 0;
  ticks += `<path d="M${f1(FX - dx + 6)} ${f1(ty)}h${long ? 20 : 12}" stroke="#f5d76e" stroke-width="1.4" opacity="${long ? '.5' : '.3'}" stroke-linecap="round"/>`;
}

/* ---------- Solda üç besleme borusu ---------- */
const srcX = 168, srcW = 168, srcH = 60;
const feeds = [{ y: 176, g: 'tag' }, { y: 300, g: 'brush' }, { y: 424, g: 'gear' }];
let sources = '', tubes = '', drops = '';
feeds.forEach((f, i) => {
  const y = f.y, x2 = FX - NW / 2 - 14, y2 = NTOP + 26 + i * 8;
  sources += `<rect x="${srcX}" y="${y - srcH / 2}" width="${srcW}" height="${srcH}" rx="14" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.4"/>`;
  // kutunun içindeki işaret
  const gx = srcX + 34, gy = y;
  if (f.g === 'tag') sources += `<path d="M${gx - 10} ${gy - 8}l-9 8l9 8M${gx + 10} ${gy - 8}l9 8l-9 8" fill="none" stroke="#fff3c4" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (f.g === 'brush') sources += `<path d="M${gx - 11} ${gy + 10}c6 -4 4 -12 10 -16s10 -2 12 2s0 10 -6 12s-10 4 -16 2z" fill="none" stroke="#fff3c4" stroke-width="2"/><circle cx="${gx + 9}" cy="${gy - 9}" r="2.6" fill="#fff3c4"/>`;
  if (f.g === 'gear') {
    let t = `<circle cx="${gx}" cy="${gy}" r="7" fill="none" stroke="#fff3c4" stroke-width="2"/>`;
    for (let k = 0; k < 8; k++) { const [ax, ay] = P(11, k * 45), [bx, by] = P(15.5, k * 45); t += `<path d="M${f1(gx + ax)} ${f1(gy + ay)}L${f1(gx + bx)} ${f1(gy + by)}" stroke="#fff3c4" stroke-width="2" stroke-linecap="round"/>`; }
    sources += `<g class="cog" style="transform-origin:${gx}px ${gy}px">${t}</g>`;
  }
  // kutudan üç çizgi (içerik)
  for (let k = 0; k < 3; k++) sources += `<path d="M${srcX + 62} ${y - 14 + k * 14}h${Math.round(rnd(38, 86))}" stroke="#ffe9a3" stroke-width="3" stroke-linecap="round" opacity=".35"/>`;
  // boru: kutudan balonun boynuna
  const x1 = srcX + srcW, c = (x2 - x1) * .55;
  const d = `M${x1} ${y} C${f1(x1 + c)} ${y} ${f1(x2 - c)} ${y2} ${x2} ${y2}`;
  tubes += `<path d="${d}"/>`;
  drops += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="6 94" style="animation-duration:${f1(rnd(2.6, 3.4))}s;animation-delay:${f1(-i * .8)}s"/>`;
});

/* ---------- Sol üstte veritabanı silindiri ---------- */
const db = (() => {
  const x = 150, y = 560, w = 104, e = 18;
  let s = '';
  for (let i = 2; i >= 0; i--) {
    s += `<ellipse cx="${x}" cy="${y - i * 26}" rx="${w / 2}" ry="${e}" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.4"/>`;
    if (i) s += `<path d="M${x - w / 2} ${y - i * 26}v26M${x + w / 2} ${y - i * 26}v26" stroke="url(#ring)" stroke-width="1.4"/>`;
  }
  s += `<path d="M${x - w / 2} ${y - 52}v52M${x + w / 2} ${y - 52}v52" stroke="url(#ring)" stroke-width="1.4"/>`;
  return s;
})();
const dbWire = `M254 534 C 400 500 470 470 ${FX - FR + 22} ${FY + 66}`;

/* ---------- Sağda takımyıldız: çekirdek + altı uydu ---------- */
const CX = 1270, CY = 372, ORB = 136;
let os = `<circle class="halo2" cx="${CX}" cy="${CY}" r="${ORB}" fill="none" stroke="#d4af37" stroke-width="1" opacity=".35" stroke-dasharray="4 10"/>`;
os += `<circle cx="${CX}" cy="${CY}" r="34" fill="url(#winFill)" stroke="url(#ring)" stroke-width="2"/>`;
os += `<circle cx="${CX}" cy="${CY}" r="9" fill="#fff3c4"/>`;
os += `<circle class="pulse" cx="${CX}" cy="${CY}" r="34" fill="none" stroke="#f5d76e" stroke-width="1.4"/>`;
for (let i = 0; i < 6; i++) {
  const [dx, dy] = P(ORB, -90 + i * 60);
  const sx = CX + dx, sy = CY + dy;
  os += `<path d="M${CX} ${CY}L${f1(sx)} ${f1(sy)}" stroke="url(#ring)" stroke-width="1.2" opacity=".55"/>`;
  os += `<circle class="sat" cx="${f1(sx)}" cy="${f1(sy)}" r="18" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.5" style="animation-delay:${f1(i * .5)}s"/>`;
  os += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="5" fill="#ffe9a3" opacity=".85"/>`;
}
/* Balondan takımyıldıza yükselen sap */
const stem = `M${FX + NW / 2 + 8} ${NTOP + 34} C 880 ${NTOP + 4} 1040 ${CY - 150} ${CX - ORB - 18} ${CY - 30}`;
const stemPk = `<path class="pk" d="${stem}" pathLength="100" stroke-dasharray="8 92" style="animation-duration:3.4s;animation-delay:-1.2s"/>`;

/* ---------- Zemin ---------- */
let grid = '';
for (let x = 40; x < W; x += 40) for (let y = 23; y < H; y += 40)
  grid += `<circle cx="${x}" cy="${y}" r="1" opacity="${f1(.16 + .1 * Math.sin(x * .012) * Math.cos(y * .018))}"/>`;
const bench = `<path d="M0 ${FY + FR + 44}H${W}M0 ${FY + FR + 50}H${W}" stroke="#d4af37" stroke-width="1" opacity=".18"/>`;
let dust = '';
for (let i = 0; i < 38; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.7))}" opacity="${f1(rnd(.1, .4))}"/>`;

const CSS = `<style>
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
.bub{fill:#fff3c4;opacity:0;animation-name:rise;animation-timing-function:ease-in;animation-iteration-count:infinite}
.blk{opacity:0;animation:appear 9s ease-out infinite}
.cog{animation:spin 14s linear infinite}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 3.2s ease-out infinite}
.sat{transform-box:fill-box;transform-origin:center;animation:breathe 3.6s ease-in-out infinite alternate}
.halo2{transform-box:fill-box;transform-origin:center;animation:spin 40s linear infinite}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes rise{0%{opacity:0;transform:translateY(0)}12%{opacity:.85}100%{opacity:0;transform:translateY(-${Math.round(LY - NTOP - 20)}px)}}
@keyframes appear{0%,6%{opacity:0}16%,86%{opacity:1}96%,100%{opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{from{transform:scale(1);opacity:.8}to{transform:scale(2.2);opacity:0}}
@keyframes breathe{from{opacity:.55}to{opacity:1}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson5.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".5" cy=".5" r=".76"><stop offset="0" stop-color="#1e1706"/><stop offset=".46" stop-color="#100b05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#e9bf48" stop-opacity=".2"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="glass" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#3a2c0b" stop-opacity=".55"/><stop offset="1" stop-color="#0d0904" stop-opacity=".8"/></radialGradient>
<linearGradient id="brew" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5d76e" stop-opacity=".34"/><stop offset="1" stop-color="#8a6a18" stop-opacity=".2"/></linearGradient>
<linearGradient id="winFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241b07"/><stop offset="1" stop-color="#120d04"/></linearGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="wire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
<clipPath id="flaskClip"><path d="M${FX - NW / 2} ${NTOP}V${neckY}A${FR} ${FR} 0 1 0 ${FX + NW / 2} ${neckY}V${NTOP}"/></clipPath>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${grid}</g>
${bench}
<g fill="#ffe9a3">${dust}</g>
<ellipse cx="${FX}" cy="${FY}" rx="360" ry="290" fill="url(#halo)"/>
<ellipse cx="${CX}" cy="${CY}" rx="230" ry="200" fill="url(#halo)"/>
<g fill="none" stroke="url(#wire)" stroke-width="1.6" opacity=".7">${tubes}<path d="${dbWire}"/><path d="${stem}"/></g>
<g fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round">${drops}${stemPk}<path class="pk" d="${dbWire}" pathLength="100" stroke-dasharray="5 95" style="animation-duration:3.8s;animation-delay:-2.1s"/></g>
${sources}
${db}
${os}
${flask}
<g clip-path="url(#flaskClip)">${liquid}<g>${bubbles}</g>${ticks}</g>
${pg}
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l5-cover.svg', svg(true)], ['l5-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
