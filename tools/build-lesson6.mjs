#!/usr/bin/env node
/* Bölüm 6 dersinin kapağı — "vitrin".
   Ortada dikey bir sahne (9:16 telefon karesi): içinde bir kompozisyon duruyor, üstünde iki spot.
   Sahneden sağa doğru bir ışık konisi açılıyor; koninin içindeki seyirci noktaları tek tek yanıyor ve
   bir kısmı geri küçük işaretler yolluyor. Solda üç besleme kartı (fikir, kurgu, başlık) sahneye giriyor.
   Altta yükselen bir eğri. Bölüm 1 çekirdek, 2 mekanizma, 3 ağ, 4 tezgâh, 5 laboratuvar; bu bir sahne:
   yapılan şey ışığa çıkar ve karşılığı geri döner. Sahne 1600×686 (21:9).

   Çıktılar: img/course/l6-cover.svg (canlı) ve img/course/l6-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson6.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260919);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686;

/* ---------- Sahne: dikey kare ---------- */
const SW = 236, SH = 420, SX = 560, SY = 150;                       // sol üst köşe
const SCX = SX + SW / 2, SCY = SY + SH / 2;
const stage =
  `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="26" fill="url(#screen)" stroke="url(#ring)" stroke-width="2.2"/>` +
  `<rect x="${SX + 10}" y="${SY + 10}" width="${SW - 20}" height="${SH - 20}" rx="18" fill="none" stroke="#f5d76e" stroke-width="1" opacity=".22"/>`;

/* Sahnenin içindeki kompozisyon: bir şekil + üç satır + ilerleme çubuğu */
const inner = (() => {
  const cx = SCX, cy = SY + 168;
  let s = `<circle class="breathe" cx="${cx}" cy="${cy}" r="52" fill="url(#brew)" stroke="#f5d76e" stroke-width="1.4"/>`;
  s += `<path d="M${cx - 16} ${cy - 22}l40 22l-40 22Z" fill="#fff3c4" opacity=".9"/>`;          // oynat üçgeni
  for (let i = 0; i < 3; i++)
    s += `<rect class="blk" x="${SX + 34}" y="${SY + 268 + i * 26}" width="${[168, 130, 148][i]}" height="10" rx="5" fill="#ffe9a3" opacity=".55" style="animation-delay:${f1(i * .5)}s"/>`;
  s += `<rect x="${SX + 20}" y="${SY + SH - 34}" width="${SW - 40}" height="5" rx="2.5" fill="#ffe9a3" opacity=".2"/>`;
  s += `<rect class="prog" x="${SX + 20}" y="${SY + SH - 34}" width="${SW - 40}" height="5" rx="2.5" fill="#fff3c4"/>`;
  return s;
})();

/* Spotlar: sahnenin üstünde iki lamba + inen ışık hüzmesi */
const lamp = (x) => {
  const y = 74, r = 17;
  return `<path d="M${x} ${y - 16}v-24" stroke="url(#ring)" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${x - r} ${y + 12}L${x - r * .55} ${y - 14}h${r * 1.1}L${x + r} ${y + 12}Z" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.6"/>` +
    `<ellipse cx="${x}" cy="${y + 12}" rx="${r}" ry="4.4" fill="#fff3c4" opacity=".85"/>` +
    `<path class="beam" d="M${x - r} ${y + 14}L${x - r * 3.4} ${SY + 40}h${r * 6.8}L${x + r} ${y + 14}Z" fill="url(#beam)"/>`;
};
const lamps = lamp(SCX - 96) + lamp(SCX + 96);

/* ---------- Işık konisi ve seyirci alanı ---------- */
const coneTop = SY + 66, coneBot = SY + SH - 46, CONE_X = SX + SW;
const cone = `<path class="cone" d="M${CONE_X} ${coneTop}L${W - 60} ${coneTop - 132}L${W - 60} ${coneBot + 132}L${CONE_X} ${coneBot}Z" fill="url(#cone)"/>`;

/* Seyirci noktaları: koninin içinde, tohumlu dağılım; bir kısmı yanıp geri işaret yolluyor */
let crowd = '', backs = '';
for (let i = 0; i < 96; i++) {
  const t = R(), x = CONE_X + 90 + t * (W - CONE_X - 190);
  const halfSpan = (coneBot - coneTop) / 2 + 132 * ((x - CONE_X) / (W - 60 - CONE_X));
  const y = (coneTop + coneBot) / 2 + (R() * 2 - 1) * halfSpan * .92;
  const lit = R() < .22;
  const r = f1(rnd(2.2, 4.2));
  crowd += lit
    ? `<circle class="lit" cx="${f1(x)}" cy="${f1(y)}" r="${r}" style="animation-delay:${f1(-rnd(0, 6))}s"/>`
    : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" opacity="${f1(rnd(.12, .3))}"/>`;
  if (lit && R() < .45) {
    const d = `M${f1(x)} ${f1(y)} Q${f1((x + CONE_X) / 2)} ${f1(y - rnd(40, 110))} ${CONE_X + 8} ${f1(SCY + rnd(-60, 60))}`;
    backs += `<path d="${d}" opacity=".16"/>`;
    backs += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="5 95" style="animation-duration:${f1(rnd(2.8, 4.2))}s;animation-delay:${f1(-rnd(0, 4))}s"/>`;
  }
}

/* ---------- Solda üç besleme kartı ---------- */
let cards = '', feeds = '';
[178, 336, 494].forEach((y, i) => {
  const x = 116, w = 200, h = 78;
  cards += `<rect x="${x}" y="${y - h / 2}" width="${w}" height="${h}" rx="14" fill="url(#winFill)" stroke="url(#ring)" stroke-width="1.4"/>`;
  cards += `<rect x="${x + 18}" y="${y - 22}" width="${[44, 58, 36][i]}" height="7" rx="3.5" fill="#f5d76e" opacity=".75"/>`;
  for (let k = 0; k < 2; k++) cards += `<path d="M${x + 18} ${y + 2 + k * 15}h${Math.round(rnd(76, 150))}" stroke="#ffe9a3" stroke-width="3" stroke-linecap="round" opacity=".3"/>`;
  const x1 = x + w, y1 = y, x2 = SX - 10, y2 = SY + 90 + i * 130, c = (x2 - x1) * .55;
  const d = `M${x1} ${y1} C${f1(x1 + c)} ${y1} ${f1(x2 - c)} ${y2} ${x2} ${y2}`;
  feeds += `<path d="${d}" opacity=".6"/>`;
  cards += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="6 94" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" style="animation-duration:${f1(rnd(2.6, 3.4))}s;animation-delay:${f1(-i * .9)}s"/>`;
});

/* ---------- Altta yükselen eğri ---------- */
const curve = (() => {
  const y0 = H - 54, x0 = CONE_X + 60, x1 = W - 90;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([x0 + t * (x1 - x0), y0 - Math.pow(t, 1.7) * 92 - Math.sin(t * 7) * 4]);
  }
  const d = 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
  return `<path d="${d}" fill="none" stroke="url(#wire)" stroke-width="2" opacity=".5"/>` +
    `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="10 90" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" style="animation-duration:4.2s;animation-delay:-1s"/>` +
    pts.filter((_, i) => i % 3 === 0).map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#f5d76e" opacity=".7"/>`).join('');
})();

/* ---------- Zemin ---------- */
let grid = '';
for (let x = 40; x < W; x += 40) for (let y = 23; y < H; y += 40)
  grid += `<circle cx="${x}" cy="${y}" r="1" opacity="${f1(.14 + .09 * Math.sin(x * .012) * Math.cos(y * .017))}"/>`;
let dust = '';
for (let i = 0; i < 34; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.6))}" opacity="${f1(rnd(.1, .35))}"/>`;

const CSS = `<style>
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
.lit{fill:#fff3c4;animation:blink 6s ease-in-out infinite}
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 3.4s ease-in-out infinite alternate}
.blk{opacity:0;animation:appear 9s ease-out infinite}
.prog{transform-box:fill-box;transform-origin:left center;animation:fill 9s linear infinite}
.beam{animation:glow 4.4s ease-in-out infinite alternate}
.cone{animation:glow 5.6s ease-in-out infinite alternate}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes blink{0%,100%{opacity:.25}45%,55%{opacity:1}}
@keyframes breathe{from{opacity:.65}to{opacity:1}}
@keyframes appear{0%,8%{opacity:0}18%,86%{opacity:.55}96%,100%{opacity:0}}
@keyframes fill{0%{transform:scaleX(0)}90%,100%{transform:scaleX(1)}}
@keyframes glow{from{opacity:.45}to{opacity:1}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson6.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".42" cy=".5" r=".78"><stop offset="0" stop-color="#1e1706"/><stop offset=".46" stop-color="#100b05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#e9bf48" stop-opacity=".22"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<linearGradient id="screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2008"/><stop offset="1" stop-color="#0e0a04"/></linearGradient>
<linearGradient id="brew" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5d76e" stop-opacity=".4"/><stop offset="1" stop-color="#8a6a18" stop-opacity=".22"/></linearGradient>
<linearGradient id="winFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241b07"/><stop offset="1" stop-color="#120d04"/></linearGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="wire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
<linearGradient id="cone" gradientUnits="userSpaceOnUse" x1="${CONE_X}" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#f5d76e" stop-opacity=".2"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".3"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${grid}</g>
<g fill="#ffe9a3">${dust}</g>
${cone}
<ellipse cx="${SCX}" cy="${SCY}" rx="300" ry="330" fill="url(#halo)"/>
<g fill="#ffe9a3">${crowd}</g>
<g fill="none" stroke="#f5d76e" stroke-width="1.4">${backs}</g>
${curve}
<g fill="none" stroke="url(#wire)" stroke-width="1.6">${feeds}</g>
${cards}
${lamps}
${stage}
${inner}
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l6-cover.svg', svg(true)], ['l6-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
