#!/usr/bin/env node
/* Bölüm kapakları — «Yapay Zekâ Yolculuğu» yedi bölümü için tek dilde çizilmiş altın sahneler.
   Çıktılar: img/course/ch1..7.svg (canlı) ve img/course/ch1..7-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-chapters.mjs

   Her sahne 800×800 ve ortak bir iskelet paylaşır (aynı zemin, ızgara, alttan yükselen altın ışık, kıvılcımlar,
   köşeleri karartan vinyet) — yedisi yan yana dizildiğinde tek bir seri gibi okunsun diye. Üstüne her bölümün
   kendi motifi biner: 1 doğan güneş ve açılan göz, 2 formülün beş plakası, 3 ajan düğümleri, 4 kod penceresi,
   5 laboratuvar şişesi, 6 vitrin ekranı, 7 zirve.

   Kartın alt yarısı sitede .chapter__art::after ile karartılır ve altta bölüm etiketi durur; bu yüzden motifler
   y≈120–540 arasında tutulur. Süzgeç (blur) yok — parıltılar radyal gradyanlarla çizilir, telefonlarda da ucuz
   kalsın diye her sahnede az sayıda öğe canlanır. Rastgelelik tohumlu: aynı betik hep aynı dosyaları üretir. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 800, H = 800;

/* ---------- Ortak iskelet ---------- */

const SHARED_DEFS = `
<radialGradient id="bg" cx=".5" cy=".62" r=".78"><stop offset="0" stop-color="#2a1e07"/><stop offset=".45" stop-color="#120d05"/><stop offset="1" stop-color="#060503"/></radialGradient>
<radialGradient id="soft"><stop offset="0" stop-color="#fff3c4" stop-opacity=".85"/><stop offset=".5" stop-color="#f5d76e" stop-opacity=".3"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#fff2c8" stop-opacity=".55"/><stop offset=".35" stop-color="#e9bf48" stop-opacity=".26"/><stop offset=".72" stop-color="#d4af37" stop-opacity=".07"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#060503" stop-opacity="0"/><stop offset="1" stop-color="#060503" stop-opacity=".72"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8c6a14"/></linearGradient>
<linearGradient id="goldUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8c6a14"/><stop offset=".55" stop-color="#d4af37"/><stop offset="1" stop-color="#fff3c4"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity="0"/><stop offset="1" stop-color="#d4af37" stop-opacity=".16"/></linearGradient>`;

const SHARED_CSS = `
.tw{animation:tw 3s ease-in-out infinite alternate}
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 5s ease-in-out infinite alternate}
@keyframes tw{from{opacity:.18}to{opacity:1}}
@keyframes breathe{from{opacity:.72;transform:scale(.96)}to{opacity:1;transform:scale(1.05)}}
@keyframes spin{to{transform:rotate(360deg)}}`;

let grid = '';
for (let x = 50; x < W; x += 50) grid += `<path d="M${x} 0V${H}"/>`;
for (let y = 50; y < H; y += 50) grid += `<path d="M0 ${y}H${W}"/>`;

/** Kıvılcımlar: motifin ortasını boş bırakır (avoid = {x, y, r}) */
function sparks(R, n, avoid) {
  const rnd = (a, b) => a + (b - a) * R();
  let s = '', guard = 0;
  for (let i = 0; i < n && guard < n * 40; guard++) {
    const x = rnd(0, W), y = rnd(0, H);
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r) continue;
    s += `<circle class="tw" cx="${f1(x)}" cy="${f1(y)}" r="${f1(rnd(.9, 2.3))}" fill="${R() < .85 ? '#fff3c4' : '#ffd766'}" style="animation-duration:${f1(rnd(2, 5))}s;animation-delay:-${f1(rnd(0, 5))}s"/>`;
    i++;
  }
  return s;
}

/* ---------- Bölüm sahneleri ----------
   Her biri { defs, css, svg } döndürür; svg ortak zeminin üstüne, vinyetin altına çizilir. */

/* 1 · UYANIŞ — ufuktan doğan altın güneş, içinde açılan göz */
function ch1(R) {
  const rnd = (a, b) => a + (b - a) * R();
  const CX = 400, HY = 520, SR = 150;
  let ticks = '';
  for (let i = 0; i < 9; i++) {
    const a = -180 + i * 22.5;
    const [x1, y1] = P(SR + 42, a), [x2, y2] = P(SR + 86, a);
    ticks += `<path class="tick" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" style="animation-delay:-${f1(i * .35)}s"/>`;
  }
  let arcs = '';
  for (const [r, d, o] of [[SR + 70, '6 16', .4], [SR + 128, '3 20', .3], [SR + 190, '2 24', .22]])
    arcs += `<circle cx="0" cy="0" r="${r}" stroke-dasharray="${d}" opacity="${o}"/>`;
  return {
    defs: `<radialGradient id="sun"><stop offset="0" stop-color="#fff8e0"/><stop offset=".45" stop-color="#f5d76e"/><stop offset="1" stop-color="#c99a20"/></radialGradient>
<clipPath id="sky"><rect x="0" y="0" width="${W}" height="${HY}"/></clipPath>`,
    css: `.tick{animation:tick 4s ease-in-out infinite}
.iris{transform-box:fill-box;transform-origin:center;animation:iris 6s ease-in-out infinite}
.lid{animation:lid 6s ease-in-out infinite}
@keyframes tick{0%,100%{opacity:.3}50%{opacity:.95}}
@keyframes iris{0%,88%,100%{transform:scale(1)}94%{transform:scale(.72)}}
@keyframes lid{0%,88%,100%{opacity:0}92%{opacity:1}}`,
    svg: `<g clip-path="url(#sky)">
<g transform="translate(${CX} ${HY})">
<circle class="breathe" r="${SR + 210}" fill="url(#halo)"/>
<g fill="none" stroke="#e9c552" stroke-width="2">${arcs}</g>
<g class="tick-g" fill="none" stroke="#fff3c4" stroke-width="4" stroke-linecap="round">${ticks}</g>
<circle r="${SR}" fill="url(#sun)"/>
<circle r="${SR}" fill="none" stroke="#fff8e0" stroke-width="2" opacity=".55"/>
<g transform="translate(0 -22)" fill="none" stroke="#3a2a06" stroke-width="7" stroke-linecap="round">
<path d="M-92 0Q0 -76 92 0"/><path d="M-92 0Q0 76 92 0"/>
<circle class="iris" cx="0" cy="0" r="31" fill="#120d05" stroke="#3a2a06" stroke-width="6"/>
<circle class="iris" cx="0" cy="0" r="13" fill="#ffe27a" stroke="none"/>
<path class="lid" d="M-92 0Q0 -76 92 0" stroke="#c99a20" stroke-width="12" opacity="0"/>
</g></g></g>
<rect x="0" y="${HY}" width="${W}" height="${H - HY}" fill="url(#floor)"/>
<path d="M0 ${HY}H${W}" stroke="#ffe27a" stroke-width="3" opacity=".9"/>
<path d="M0 ${HY}H${W}" stroke="#f5d76e" stroke-width="14" opacity=".16"/>
<g fill="#ffd766" opacity=".12"><path d="M${CX} ${HY + 2}L${CX - 120} ${H}L${CX + 120} ${H}Z"/></g>
${sparks(R, 34, { x: CX, y: HY - 40, r: 250 })}`,
  };
}

/* 2 · FORMÜL — beş plaka sırayla yanar, sağdaki çıktı elması parlar */
function ch2(R) {
  const PX = 250, PW = 300, PH = 56, GAP = 22, TOP = 178;
  let plates = '';
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * (PH + GAP);
    plates += `<g class="pl" style="animation-delay:-${f1((5 - i) * .55)}s">` +
      `<rect x="${PX - PW / 2}" y="${y}" width="${PW}" height="${PH}" rx="14" fill="#171003" stroke="url(#gold)" stroke-width="2.4"/>` +
      `<circle cx="${PX - PW / 2 + 30}" cy="${y + PH / 2}" r="7" fill="#ffe27a"/>` +
      `<rect x="${PX - PW / 2 + 52}" y="${y + PH / 2 - 6}" width="${f1(150 + (i % 3) * 40)}" height="12" rx="6" fill="#e9c552" opacity=".55"/></g>`;
  }
  let rails = '';
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * (PH + GAP) + PH / 2;
    rails += `<path d="M${PX + PW / 2} ${y}H452Q472 ${y} 472 ${f1(y + (350 - y) * .12)}"/>`;
  }
  return {
    defs: `<radialGradient id="out"><stop offset="0" stop-color="#fff8e0"/><stop offset=".5" stop-color="#f5d76e"/><stop offset="1" stop-color="#b8891c"/></radialGradient>`,
    css: `.pl{animation:pl 5.5s ease-in-out infinite}
.out{transform-box:fill-box;transform-origin:center;animation:out 5.5s ease-in-out infinite}
.outHalo{transform-box:fill-box;transform-origin:center;animation:outHalo 5.5s ease-in-out infinite}
.flow{animation:flow 2.2s linear infinite}
@keyframes pl{0%,100%{opacity:.42}12%{opacity:1}40%{opacity:.42}}
@keyframes out{0%,62%,100%{transform:scale(1)}72%{transform:scale(1.14)}}
@keyframes outHalo{0%,62%,100%{opacity:.5}72%{opacity:1}}
@keyframes flow{to{stroke-dashoffset:-28}}`,
    svg: `<g>${plates}</g>
<g fill="none" stroke="#e9c552" stroke-width="2" opacity=".5">${rails}</g>
<path d="M472 ${TOP + 28}V${TOP + 4 * (PH + GAP) + 28}" fill="none" stroke="#e9c552" stroke-width="2.4" opacity=".7"/>
<path class="flow" d="M472 350H556" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 18"/>
<g transform="translate(628 350)">
<circle class="outHalo" r="150" fill="url(#halo)"/>
<g class="out"><path d="M0 -86L74 0L0 86L-74 0Z" fill="url(#out)"/>
<path d="M0 -50L44 0L0 50L-44 0Z" fill="#120d05" opacity=".55"/>
<path d="M0 -28L24 0L0 28L-24 0Z" fill="#fff8e0"/></g></g>
${sparks(R, 30, { x: 628, y: 350, r: 180 })}`,
  };
}

/* 3 · AJAN — merkezdeki çekirdek, altı düğüm, kenarlarda akan ışık paketleri */
function ch3(R) {
  const rnd = (a, b) => a + (b - a) * R();
  const CX = 400, CY = 388, RAD = 208;
  const nodes = [];
  for (let i = 0; i < 6; i++) { const [x, y] = P(RAD, -90 + i * 60); nodes.push([CX + x, CY + y * .88]); }
  const hex = a => Array.from({ length: 6 }, (_, i) => P(a, -90 + i * 60).map(f1).join(' ')).join('L');
  let links = '', pk = '', pkCss = '';
  nodes.forEach(([x, y], i) => {
    const d = `M${CX} ${CY}L${f1(x)} ${f1(y)}`, L = Math.hypot(x - CX, y - CY), dur = f1(rnd(2.6, 4.2));
    links += `<path d="${d}"/>`;
    pkCss += `@keyframes pk${i}{from{stroke-dashoffset:22}to{stroke-dashoffset:${f1(-L)}}}.pk${i}{animation:pk${i} ${dur}s linear -${f1(rnd(0, 3))}s infinite}`;
    pk += `<path class="pk${i}" d="${d}" stroke="#ffd766" stroke-width="7" stroke-opacity=".22" stroke-dasharray="22 ${f1(L + 4)}"/>` +
      `<path class="pk${i}" d="${d}" stroke="#fff8e0" stroke-width="2.6" stroke-dasharray="22 ${f1(L + 4)}"/>`;
  });
  let ring = '';
  for (let i = 0; i < 6; i++) ring += `<path d="M${f1(nodes[i][0])} ${f1(nodes[i][1])}L${f1(nodes[(i + 1) % 6][0])} ${f1(nodes[(i + 1) % 6][1])}"/>`;
  const nodeSvg = nodes.map(([x, y], i) => `<g transform="translate(${f1(x)} ${f1(y)})">` +
    `<circle r="54" fill="url(#soft)" opacity=".45"/>` +
    `<path class="nd" d="M${hex(30)}Z" fill="#171003" stroke="url(#gold)" stroke-width="3.4" style="animation-delay:-${f1(i * .8)}s"/></g>`).join('');
  return {
    defs: '',
    css: `.nd{transform-box:fill-box;transform-origin:center;animation:nd 4.8s ease-in-out infinite}
.core{transform-box:fill-box;transform-origin:center;animation:core 3.6s ease-in-out infinite alternate}
.orb{animation:spin 64s linear infinite}
${pkCss}
@keyframes nd{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
@keyframes core{from{transform:scale(.95)}to{transform:scale(1.08)}}`,
    svg: `<g transform="translate(${CX} ${CY})"><circle class="breathe" r="300" fill="url(#halo)"/>
<g class="orb" fill="none" stroke="#f5d76e" stroke-opacity=".24" stroke-width="2" stroke-dasharray="3 16" stroke-linecap="round"><circle r="272"/></g></g>
<g fill="none" stroke="#e2bd4a" stroke-width="2" stroke-opacity=".45">${links}</g>
<g fill="none" stroke="#e2bd4a" stroke-width="1.6" stroke-opacity=".26" stroke-dasharray="4 12">${ring}</g>
<g fill="none" stroke-linecap="round">${pk}</g>
${nodeSvg}
<g transform="translate(${CX} ${CY})"><circle r="110" fill="url(#soft)" opacity=".5"/>
<path class="core" d="M${hex(62)}Z" fill="#120d05" stroke="url(#gold)" stroke-width="5"/>
<path d="M${hex(40)}Z" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".55"/></g>
${sparks(R, 26, { x: CX, y: CY, r: 300 })}`,
  };
}

/* 4 · ATÖLYE — kod penceresi, satırlar sırayla yazılır, imleç yanıp söner */
function ch4(R) {
  const X = 130, Y = 180, WW = 540, HH = 400, BAR = 48;
  const lines = [[28, 210], [28, 300], [56, 250], [56, 180], [28, 330], [56, 220], [28, 160]];
  let code = '';
  lines.forEach(([ind, len], i) => {
    const y = Y + BAR + 44 + i * 40;
    code += `<rect class="ln" x="${X + 28 + ind}" y="${y}" width="${len}" height="14" rx="7" fill="${i % 3 === 0 ? '#ffe27a' : '#e9c552'}" opacity="${i % 3 === 0 ? '.9' : '.55'}" style="animation-delay:-${f1(6 - i * .45)}s"/>`;
  });
  const cy = Y + BAR + 44 + lines.length * 40;
  return {
    defs: `<linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1206"/><stop offset="1" stop-color="#0b0803"/></linearGradient>`,
    css: `.ln{transform-box:fill-box;transform-origin:left center;animation:ln 6s ease-out infinite}
.cur{animation:cur 1.1s steps(1) infinite}
@keyframes ln{0%{transform:scaleX(0)}10%{transform:scaleX(1)}100%{transform:scaleX(1)}}
@keyframes cur{0%,50%{opacity:1}51%,100%{opacity:.1}}`,
    svg: `<g transform="translate(400 ${Y + HH / 2}) scale(1)"><circle class="breathe" r="330" fill="url(#halo)"/></g>
<g>
<rect x="${X}" y="${Y}" width="${WW}" height="${HH}" rx="24" fill="url(#win)" stroke="url(#gold)" stroke-width="3"/>
<path d="M${X} ${Y + BAR}H${X + WW}" stroke="#e9c552" stroke-width="2" opacity=".45"/>
<circle cx="${X + 34}" cy="${Y + BAR / 2}" r="8" fill="#8c6a14"/><circle cx="${X + 62}" cy="${Y + BAR / 2}" r="8" fill="#c99a20"/><circle cx="${X + 90}" cy="${Y + BAR / 2}" r="8" fill="#ffe27a"/>
<rect x="${X + WW / 2 - 60}" y="${Y + BAR / 2 - 7}" width="120" height="14" rx="7" fill="#e9c552" opacity=".3"/>
${code}
<rect class="cur" x="${X + 28}" y="${cy}" width="18" height="16" rx="3" fill="#fff8e0"/>
</g>
<g fill="none" stroke="url(#gold)" stroke-width="2.6">
<path d="M96 250h-34a14 14 0 0 0-14 14v52a14 14 0 0 0 14 14h34"/>
<path d="M704 250h34a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-34"/></g>
${sparks(R, 28, { x: 400, y: Y + HH / 2, r: 300 })}`,
  };
}

/* 5 · LABORATUVAR — şişe, içinde yükselen kabarcıklar ve üç modül */
function ch5(R) {
  const rnd = (a, b) => a + (b - a) * R();
  const flask = 'M336 168h128v146l138 250q22 40-24 40H222q-46 0-24-40l138-250Z';
  let bub = '';
  for (let i = 0; i < 9; i++) {
    const x = rnd(300, 500), y = rnd(470, 600), r = rnd(5, 13), dur = rnd(3.4, 6);
    bub += `<circle class="bub" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#fff3c4" opacity=".7" style="animation-duration:${f1(dur)}s;animation-delay:-${f1(rnd(0, dur))}s"/>`;
  }
  const mod = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#120d05" stroke-width="4">`;
  return {
    defs: `<linearGradient id="liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#b8891c"/></linearGradient>
<clipPath id="inFlask"><path d="${flask}"/></clipPath>`,
    css: `.bub{animation-name:bub;animation-timing-function:ease-in;animation-iteration-count:infinite}
.wave{animation:wave 5s ease-in-out infinite alternate}
@keyframes bub{0%{transform:translateY(30px);opacity:0}14%{opacity:.8}100%{transform:translateY(-150px);opacity:0}}
@keyframes wave{from{transform:translateX(-14px)}to{transform:translateX(14px)}}`,
    svg: `<g transform="translate(400 400)"><circle class="breathe" r="320" fill="url(#halo)"/></g>
<g clip-path="url(#inFlask)">
<rect x="150" y="420" width="500" height="240" fill="url(#liq)" opacity=".9"/>
<path class="wave" d="M120 424q60 -18 120 0t120 0t120 0t120 0t120 0v-40H120Z" fill="#fff3c4" opacity=".5"/>
${bub}
<g opacity=".85">
${mod(322, 486, 1)}<rect x="-30" y="-24" width="60" height="48" rx="7"/><path d="M-30 -8h60"/></g>
${mod(400, 528, 1)}<rect x="-30" y="-24" width="60" height="48" rx="7"/><path d="M-12 -24v48M12 -24v48M-30 0h60"/></g>
${mod(478, 486, 1)}<circle r="12"/><circle cx="-28" cy="20" r="8"/><circle cx="28" cy="20" r="8"/><path d="M-8 8l-14 6M8 8l14 6"/></g>
</g></g>
<path d="${flask}" fill="none" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
<path d="M320 168h160" stroke="#fff3c4" stroke-width="10" stroke-linecap="round" opacity=".9"/>
<path d="M348 200h104" stroke="#e9c552" stroke-width="3" opacity=".5"/>
${sparks(R, 30, { x: 400, y: 430, r: 250 })}`,
  };
}

/* 6 · VİTRİN — ekran, yukarı vuran ışık huzmesi, zıplayan ses çubukları */
function ch6(R) {
  const rnd = (a, b) => a + (b - a) * R();
  const PX = 400, PY = 400, PW = 260, PH = 440;
  let bars = '';
  for (let i = 0; i < 9; i++) {
    const x = PX - 96 + i * 24;
    bars += `<rect class="bar" x="${x}" y="${PY + 128}" width="12" height="52" rx="6" fill="#ffe27a" style="animation-duration:${f1(rnd(.9, 1.7))}s;animation-delay:-${f1(rnd(0, 1.5))}s"/>`;
  }
  let rise = '';
  for (let i = 0; i < 7; i++) {
    const x = PX + (i % 2 ? 1 : -1) * rnd(150, 250), y = rnd(300, 600), dur = rnd(4, 7);
    rise += `<g transform="translate(${f1(x)} ${f1(y)})"><path class="rise" d="M0 0c-9-11-26-8-26 6 0 12 17 21 26 30 9-9 26-18 26-30 0-14-17-17-26-6Z" fill="#ffd766" opacity=".55" style="animation-duration:${f1(dur)}s;animation-delay:-${f1(rnd(0, dur))}s"/></g>`;
  }
  return {
    defs: `<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe27a" stop-opacity=".42"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></linearGradient>
<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#241a06"/><stop offset="1" stop-color="#0b0803"/></linearGradient>`,
    css: `.bar{transform-box:fill-box;transform-origin:center bottom;animation-name:bar;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.rise{animation-name:rise;animation-timing-function:ease-out;animation-iteration-count:infinite}
.play{transform-box:fill-box;transform-origin:center;animation:play 3.2s ease-in-out infinite}
@keyframes bar{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
@keyframes rise{0%{transform:translateY(90px) scale(.6);opacity:0}18%{opacity:.85}100%{transform:translateY(-240px) scale(1.1);opacity:0}}
@keyframes play{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}`,
    svg: `<path d="M${PX} ${PY - PH / 2}L${PX - 250} 40L${PX + 250} 40Z" fill="url(#beam)"/>
<g transform="translate(${PX} ${PY})"><circle class="breathe" r="300" fill="url(#halo)"/></g>
${rise}
<g>
<rect x="${PX - PW / 2}" y="${PY - PH / 2}" width="${PW}" height="${PH}" rx="42" fill="#0b0803" stroke="url(#gold)" stroke-width="4"/>
<rect x="${PX - PW / 2 + 14}" y="${PY - PH / 2 + 14}" width="${PW - 28}" height="${PH - 28}" rx="30" fill="url(#scr)"/>
<rect x="${PX - 34}" y="${PY - PH / 2 + 24}" width="68" height="10" rx="5" fill="#3a2a06"/>
<circle cx="${PX}" cy="${PY - 40}" r="86" fill="url(#soft)" opacity=".45"/>
<g class="play"><circle cx="${PX}" cy="${PY - 40}" r="56" fill="#171003" stroke="url(#gold)" stroke-width="4"/>
<path d="M${PX - 18} ${PY - 68}l46 28-46 28Z" fill="#ffe27a"/></g>
${bars}
</g>
${sparks(R, 26, { x: PX, y: PY, r: 210 })}`,
  };
}

/* 7 · ZİRVE — güneş, katmanlı sırtlar, tepede bayrak, akan patika */
function ch7(R) {
  const path = 'M120 742q90-34 128-96t120-84q40-80 24-190';   // bitiş (392, 372) = zirve, bayrağın dibi
  return {
    defs: `<radialGradient id="sun7"><stop offset="0" stop-color="#fff8e0"/><stop offset=".55" stop-color="#ffe27a"/><stop offset="1" stop-color="#e0ab28"/></radialGradient>
<linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c552"/><stop offset="1" stop-color="#4a3708"/></linearGradient>
<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99a20"/><stop offset="1" stop-color="#2a1e07"/></linearGradient>
<linearGradient id="m3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c6a14"/><stop offset="1" stop-color="#140e04"/></linearGradient>`,
    css: `.trail{animation:trail 3.4s linear infinite}
.flag{transform-box:fill-box;transform-origin:left center;animation:flag 3.6s ease-in-out infinite}
.star{transform-box:fill-box;transform-origin:center;animation:star 4s ease-in-out infinite}
@keyframes trail{to{stroke-dashoffset:-68}}
@keyframes flag{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(-5deg) scaleX(.9)}}
@keyframes star{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}`,
    svg: `<g transform="translate(556 214)"><circle class="breathe" r="250" fill="url(#halo)"/><circle r="82" fill="url(#soft)"/><circle r="54" fill="url(#sun7)"/><circle r="54" fill="none" stroke="#fff8e0" stroke-width="2" opacity=".5"/></g>
<path d="M0 800V540l180-150 130 118 96-92 150 150 244-196v430Z" fill="url(#m3)" opacity=".75"/>
<path d="M0 800V620l150-132 128 120 118-118 180 176 224-158v292Z" fill="url(#m2)" opacity=".9"/>
<path d="M120 800L392 372 664 800Z" fill="url(#m1)"/>
<path d="M392 372L470 494l-78 42-64-32Z" fill="#fff8e0" opacity=".85"/>
<path class="trail" d="${path}" fill="none" stroke="#fff3c4" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 20" opacity=".9"/>
<path d="${path}" fill="none" stroke="#ffd766" stroke-width="13" stroke-linecap="round" opacity=".14"/>
<g transform="translate(392 372)">
<path d="M0 0v-92" stroke="#fff8e0" stroke-width="6" stroke-linecap="round"/>
<path class="flag" d="M4 -88h74l-20 26 20 26H4Z" fill="url(#gold)"/>
<circle class="star" cx="0" cy="-104" r="11" fill="#fff8e0"/></g>
${sparks(R, 32, { x: 556, y: 214, r: 160 })}`,
  };
}

/* ---------- Birleştirme ---------- */
const CHAPTERS = [
  { n: 1, seed: 20260911, build: ch1 },
  { n: 2, seed: 20260912, build: ch2 },
  { n: 3, seed: 20260913, build: ch3 },
  { n: 4, seed: 20260914, build: ch4 },
  { n: 5, seed: 20260915, build: ch5 },
  { n: 6, seed: 20260916, build: ch6 },
  { n: 7, seed: 20260917, build: ch7 },
];

function render(scene, anim) {
  const style = anim ? `<style>${SHARED_CSS}\n${scene.css}</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-chapters.mjs — elle düzenleme, betiği çalıştır. -->
<defs>${SHARED_DEFS}${scene.defs}</defs>
${style}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="none" stroke="#d4af37" stroke-width="1" opacity=".05">${grid}</g>
${scene.svg}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>
`;
}

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
let total = 0;
for (const c of CHAPTERS) {
  const live = render(c.build(rng(c.seed)), true);
  const stat = render(c.build(rng(c.seed)), false).replace(/ style="animation-[^"]*"/g, '');
  writeFileSync(join(ROOT, `img/course/ch${c.n}.svg`), live);
  writeFileSync(join(ROOT, `img/course/ch${c.n}-static.svg`), stat);
  total += live.length + stat.length;
  console.log(`img/course/ch${c.n}.svg (${(live.length / 1024).toFixed(1)} KB) + -static (${(stat.length / 1024).toFixed(1)} KB)`);
}
console.log(`toplam ${(total / 1024).toFixed(1)} KB`);
