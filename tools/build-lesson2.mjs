#!/usr/bin/env node
/* Bölüm 2 dersinin kapağı — "beş parçadan tek isteğe".
   Solda formülün beş bileşeni ayrı ayrı duruyor, ortada onları tek bir odağa toplayan diyafram,
   sağda çıkan şey: dağınık değil, ölçülü bir ızgara. Bölüm 1'in kapağı "dağınıklıktan düzene" idi;
   bu kapak onun devamı ama karşıtı — orada kaos vardı, burada parça var; orada organik çekirdek,
   burada mekanizma. Sahne 1600×686 (21:9) — kapak kutusuyla aynı oran, kırpılmaz.

   Çıktılar: img/course/l2-cover.svg (canlı) ve img/course/l2-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson2.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260909);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686, CX = 800, CY = 343;

/* ---------- Sol: formülün beş bileşeni ----------
   Beşi de ayrı bloklar; eşit aralıklı ve hizalı durmaları önemli — bunlar dağınık parça değil,
   yerine oturmayı bekleyen bileşenler. Her blokta bir "başlık" çizgisi ve altında gövde çizgileri. */
const COMP = [];
let parts = '';
for (let i = 0; i < 5; i++) {
  const y = 132 + i * 96, x = rnd(96, 128);
  const wide = [178, 206, 158, 188, 146][i];                     // eşit olmasın: bileşenler aynı boyda değil
  const op = .46 + i * .05;                                     // aşağı indikçe biraz belirginleşir
  parts += `<rect x="${f1(x)}" y="${f1(y)}" width="34" height="4.6" rx="2.3" opacity="${f1(op + .22)}"/>`;
  for (let k = 0; k < 3; k++) {
    const w = k === 2 ? wide * rnd(.42, .6) : wide * rnd(.86, 1);
    parts += `<rect x="${f1(x)}" y="${f1(y + 16 + k * 12)}" width="${f1(w)}" height="3.2" rx="1.6" opacity="${f1(op * rnd(.72, 1))}"/>`;
  }
  parts += `<rect x="${f1(x - 16)}" y="${f1(y - 4)}" width="2.4" height="52" rx="1.2" opacity="${f1(op + .3)}"/>`;   // sol kenar çubuğu
  COMP.push([x + wide + 12, y + 22]);
}

/* ---------- Sağ: yapılandırılmış çıktı ----------
   Bölüm 1'de sağdaki çıktı paragraf gibiydi (tırtıklı kenar, son satır kısa). Burada tam tersi:
   başlık satırı olan, sütunları hizalı, kenarı çizilmiş bir tablo. "Çıktı biçimini sen söylersin"
   dersinin resmi — otuz kutuluk duvar değil, tek ve okunur bir sonuç. */
let grid = '';
const gridPts = [];
const TX = 1078, TW = 428, ROWS = 6, RH = 42, TY = CY - (ROWS * RH) / 2 - 16;
const COL = [0, 168, 292];                                        // üç sütunun sol kenarları
grid += `<rect x="${f1(TX - 18)}" y="${f1(TY - 24)}" width="${TW + 36}" height="${f1(ROWS * RH + 52)}" rx="16" fill="none" stroke="#d4af37" stroke-width="1.2" opacity=".3"/>`;
for (let c = 0; c < 3; c++)                                       // başlık hücreleri: daha parlak
  grid += `<rect x="${f1(TX + COL[c])}" y="${f1(TY - 4)}" width="${f1((c === 0 ? 128 : c === 1 ? 96 : 118))}" height="4.6" rx="2.3" opacity=".92"/>`;
grid += `<rect x="${f1(TX - 18)}" y="${f1(TY + 14)}" width="${TW + 36}" height="1.4" opacity=".34"/>`;
for (let r = 0; r < ROWS - 1; r++) {
  const y = TY + 36 + r * RH;
  gridPts.push([TX - 26, y + 2]);
  for (let c = 0; c < 3; c++) {
    const w = [rnd(96, 150), rnd(58, 92), rnd(64, 112)][c];
    grid += `<rect x="${f1(TX + COL[c])}" y="${f1(y)}" width="${f1(w)}" height="3.6" rx="1.8" opacity="${f1(.42 - r * .045)}"/>`;
  }
  if (r < ROWS - 2) grid += `<rect x="${f1(TX - 18)}" y="${f1(y + 20)}" width="${TW + 36}" height="1" opacity=".12"/>`;
}

/* ---------- Lifler: beş bileşen içeri, odaklanmış demet dışarı ---------- */
const thread = (x1, y1, x2, y2, bow) =>
  `M${f1(x1)} ${f1(y1)} Q${f1((x1 + x2) / 2)} ${f1((y1 + y2) / 2 + bow)} ${f1(x2)} ${f1(y2)}`;
let fibers = '', packets = '';
const IN = COMP.map(([x, y], i) => thread(x, y, CX - 138, CY + (i - 2) * 15, (CY - y) * .22));
const OUT = gridPts.map(([x, y], i) => thread(CX + 132, CY + (i - 2) * 11, x, y, (y - CY) * .16));
[...IN, ...OUT].forEach((d, i) => {
  fibers += `<path d="${d}" opacity="${f1(rnd(.2, .46))}"/>`;
  packets += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="3.4 96.6" style="animation-delay:-${f1(rnd(0, 4.6))}s;animation-duration:${f1(rnd(3.2, 4.8))}s"/>`;
});

/* ---------- Orta: diyafram ----------
   Altı bıçak, ortada altıgen bir açıklık bırakıyor — yıldız değil, mercek. Bölüm 1'in yumuşak
   düğüm kümesinin yerine burada bir düzenek var: formül rastgele bir şey değil, mekanizma. */
let blades = '';
const RO = 116, RI = 52, LAP = 9;                                 // dış yarıçap, açıklık, bıçak bindirmesi
for (let i = 0; i < 6; i++) {
  const a = i * 60;
  const [ox0, oy0] = P(RO, a - LAP), [ox1, oy1] = P(RO, a + 60 + LAP);
  const [ix1, iy1] = P(RI, a + 60), [ix0, iy0] = P(RI, a);
  blades += `<path d="M${f1(CX + ox0)} ${f1(CY + oy0)}L${f1(CX + ox1)} ${f1(CY + oy1)}L${f1(CX + ix1)} ${f1(CY + iy1)}L${f1(CX + ix0)} ${f1(CY + iy0)}Z" opacity="${f1(.2 + (i % 2) * .1)}"/>`;
  blades += `<path d="M${f1(CX + ix0)} ${f1(CY + iy0)}L${f1(CX + ix1)} ${f1(CY + iy1)}" fill="none" stroke="#fff3c4" stroke-width="1.5" opacity=".7"/>`;   // açıklığın parlayan kenarı
}
const ring = (r, sw, op) => `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${sw}" opacity="${op}"/>`;
let ticks = '';                                                   // ölçek çentikleri: "ölçülü" fikrini taşır
for (let i = 0; i < 48; i++) {
  const a = i * 7.5, long = i % 4 === 0;
  const [x0, y0] = P(long ? 126 : 131, a), [x1, y1] = P(138, a);
  ticks += `<path d="M${f1(CX + x0)} ${f1(CY + y0)}L${f1(CX + x1)} ${f1(CY + y1)}" opacity="${long ? '.5' : '.22'}"/>`;
}

/* ---------- Toz ---------- */
let dust = '';
for (let i = 0; i < 48; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.8))}" opacity="${f1(rnd(.1, .44))}"/>`;

const CSS = `<style>
.bl{transform-box:fill-box;transform-origin:center;animation:iris 7.2s ease-in-out infinite alternate}
.tk{transform-box:fill-box;transform-origin:center;animation:spin 92s linear infinite}
.r0{transform-box:fill-box;transform-origin:center;animation:spin 54s linear infinite reverse}
.hot{transform-box:fill-box;transform-origin:center;animation:pulse 3.8s ease-in-out infinite alternate}
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes iris{from{transform:rotate(0) scale(1)}to{transform:rotate(11deg) scale(.94)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{from{opacity:.7;transform:scale(.94)}to{opacity:1;transform:scale(1.06)}}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson2.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".5" cy=".5" r=".74"><stop offset="0" stop-color="#221906"/><stop offset=".44" stop-color="#110c05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".5"/><stop offset=".46" stop-color="#e9bf48" stop-opacity=".17"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="hot"><stop offset="0" stop-color="#fffdf2"/><stop offset=".52" stop-color="#ffe9a3" stop-opacity=".78"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="fib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#f5d76e"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
<linearGradient id="bld" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5d76e"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${dust}</g>
<g fill="#d4af37">${parts}</g>
<g fill="#f5d76e">${grid}</g>
<g fill="none" stroke="url(#fib)" stroke-width="1.1">${fibers}</g>
<g fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round">${packets}</g>
<circle cx="${CX}" cy="${CY}" r="242" fill="url(#halo)"/>
<g class="${anim ? 'bl' : ''}" fill="url(#bld)">${blades}</g>
<g class="${anim ? 'tk' : ''}" fill="none" stroke="#f5d76e" stroke-width="1.2">${ticks}</g>
<g class="${anim ? 'r0' : ''}">${ring(116, 1.6, '.8')}</g>
${ring(144, 1, '.36')}
${ring(52, 1.3, '.55')}
<circle class="${anim ? 'hot' : ''}" cx="${CX}" cy="${CY}" r="34" fill="url(#hot)"/>
<circle cx="${CX}" cy="${CY}" r="4.2" fill="#fffdf2"/>
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l2-cover.svg', svg(true)], ['l2-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
