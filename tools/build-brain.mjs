#!/usr/bin/env node
/* FYOS bilgi grafiği — FY çekirdeği, altı bilgi kümesi ve uyduları; çekirdekten kümelere akan ışık paketleri.
   Çıktılar: img/brain-graph.svg (canlı) ve img/brain-graph-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-brain.mjs

   Sahne 1600×1000. Küme etiketleri ve ortadaki FY logosu SVG'de değil, HTML katmanında (index.html .brain__label, .brain__logo):
   böylece etiketler dört dilde değişir. Küme merkezleri aşağıdaki CLUSTERS listesindedir; css/style.css'teki
   .brain__label konumları (yüzde) bu listeden türetilir — konumları değiştirirsen betiğin sonunda yazdırılan
   yüzdeleri CSS'e taşı. Kümeler sabittir (etiketler kaymasın); yalnız uydular kendi kümesi çevresinde yavaşça döner,
   çekirdek ve küme çekirdekleri nabız gibi atar, kenarlarda ışık paketleri gider gelir. Süzgeç yok; tohumlu rastgele. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1600, H = 1000, CX = 800, CY = 500;
const R = rng(20260908);
const rnd = (a, b) => a + (b - a) * R();

/* ---------- Kümeler: çekirdek çevresinde altı bilgi alanı (etiket metinleri i18n'de: brain.c.1…6) ---------- */
const CLUSTERS = [-90, -30, 30, 90, 150, 210].map((deg, i) => { const [x, y] = P(300 + (i % 2) * 40, deg); return { x: CX + x * 1.15, y: CY + y * .85, i }; });

/* ---------- Uydular ve kenarlar ---------- */
const sats = [], satEdges = [];
CLUSTERS.forEach((c, ci) => {
  const n = 15 + Math.floor(rnd(0, 8));
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.283), r = rnd(58, 150);
    sats.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * .8, r: rnd(2.8, 5.6), c: ci });
  }
});
for (let i = 0; i < sats.length; i++) for (let j = i + 1; j < sats.length; j++) {
  if (sats[i].c !== sats[j].c) continue;
  const d = Math.hypot(sats[i].x - sats[j].x, sats[i].y - sats[j].y); if (d < 72 && R() < .5) satEdges.push([i, j]);
}
const BRIDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4]];

/* ---------- Işık paketleri: düz kenar üzerinde dash kaydırma (her kenara kendi keyframe'i) ---------- */
function packets(edges, prefix, { speed = 140, dash = 24, w = 2.4, wg = 7 } = {}) {
  let svg = '', css = '';
  edges.forEach((e, i) => {
    const L = Math.hypot(e[2] - e[0], e[3] - e[1]), dur = Math.min(8, Math.max(2.4, L / speed)), delay = -rnd(0, dur);
    css += `@keyframes ${prefix}${i}{from{stroke-dashoffset:${dash}}to{stroke-dashoffset:${f1(-L)}}}.${prefix}${i}{animation:${prefix}${i} ${f1(dur)}s linear ${f1(delay)}s infinite}`;
    const d = `M${f1(e[0])} ${f1(e[1])}L${f1(e[2])} ${f1(e[3])}`;
    svg += `<path d="${d}" class="${prefix}${i}" stroke="#ffd766" stroke-width="${wg}" stroke-opacity=".2" stroke-dasharray="${dash} ${f1(L + 4)}" stroke-dashoffset="${dash}"/>` +
      `<path d="${d}" class="${prefix}${i}" stroke="#fff6d0" stroke-width="${w}" stroke-opacity=".95" stroke-dasharray="${dash} ${f1(L + 4)}" stroke-dashoffset="${dash}"/>`;
  });
  return { svg, css };
}
const spokes = CLUSTERS.map(c => [CX, CY, c.x, c.y]);
const pkOut = packets(spokes, 'o'), pkIn = packets(spokes.map(s => [s[2], s[3], s[0], s[1]]), 'i', { speed: 120, dash: 18, w: 1.8, wg: 5 });
const pkBr = packets(BRIDGES.map(([a, b]) => [CLUSTERS[a].x, CLUSTERS[a].y, CLUSTERS[b].x, CLUSTERS[b].y]), 'b', { speed: 160, dash: 16, w: 1.6, wg: 4 });

/* ---------- Çizim ---------- */
// uydular küme çevresinde döner: her küme için translate(merkez) + dönen grup; uydu koordinatları merkeze göre
let clusterSvg = '', rotCss = '';
CLUSTERS.forEach((c, ci) => {
  const mine = sats.map((s, i) => ({ s, i })).filter(o => o.s.c === ci);
  let g = '';
  for (const { s, i } of mine) g += `<path d="M0 0L${f1(s.x - c.x)} ${f1(s.y - c.y)}" fill="none" stroke="#e2bd4a" stroke-width="1.2" stroke-opacity=".4"/>`;
  for (const [a, b] of satEdges) if (sats[a].c === ci) g += `<path d="M${f1(sats[a].x - c.x)} ${f1(sats[a].y - c.y)}L${f1(sats[b].x - c.x)} ${f1(sats[b].y - c.y)}" fill="none" stroke="#e2bd4a" stroke-width="1" stroke-opacity=".28"/>`;
  for (const { s } of mine) g += `<circle class="${R() < .35 ? 'tw' : ''}" cx="${f1(s.x - c.x)}" cy="${f1(s.y - c.y)}" r="${f1(s.r)}" fill="#0d1526" stroke="#e2bd4a" stroke-width="1.4" style="animation-duration:${f1(rnd(2, 5))}s;animation-delay:-${f1(rnd(0, 4))}s"/>`;
  const dur = f1(rnd(40, 70)), rev = ci % 2 ? ' reverse' : '';
  rotCss += `.k${ci}{animation:spin ${dur}s linear infinite${rev}}`;
  clusterSvg += `<g transform="translate(${f1(c.x)} ${f1(c.y)})"><g class="k${ci}">${g}</g>` +
    `<circle r="66" fill="url(#gHub)" opacity=".6"/><circle class="halo" r="16" style="animation-delay:-${f1(rnd(0, 3))}s"/>` +
    `<circle class="core" r="15" fill="#141b2c" stroke="url(#gGold)" stroke-width="3.5" style="animation-delay:-${f1(rnd(0, 2.6))}s"/></g>`;
});
let stars = '';
for (let i = 0; i < 70; i++) stars += `<circle class="tw" cx="${Math.round(rnd(0, W))}" cy="${Math.round(rnd(0, H))}" r="${f1(rnd(.7, 1.9))}" fill="#fff0b8" style="animation-duration:${f1(rnd(2, 5))}s;animation-delay:-${f1(rnd(0, 5))}s"/>`;

function style(anim) {
  if (!anim) return '';
  return `<style>
.tw{animation:tw 3s ease-in-out infinite alternate}
.core{transform-box:fill-box;transform-origin:center;animation:core 2.8s ease-in-out infinite alternate}
.halo{transform-box:fill-box;transform-origin:center;fill:none;stroke:#ffd766;stroke-width:1.4;opacity:0;animation:halo 3.4s ease-out infinite}
.heart{transform-box:fill-box;transform-origin:center;animation:heart 3s ease-in-out infinite alternate}
${rotCss}${pkOut.css}${pkIn.css}${pkBr.css}
@keyframes tw{from{opacity:.25}to{opacity:1}}
@keyframes core{from{transform:scale(.92)}to{transform:scale(1.1)}}
@keyframes halo{from{transform:scale(1);opacity:.9}to{transform:scale(4.2);opacity:0}}
@keyframes heart{from{transform:scale(.94);opacity:.8}to{transform:scale(1.08);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;
}

function svg(anim) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-brain.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="gBg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#03050a"/></radialGradient>
<radialGradient id="gHub"><stop offset="0" stop-color="#fff2c2"/><stop offset=".3" stop-color="#f5c451" stop-opacity=".7"/><stop offset="1" stop-color="#f5a623" stop-opacity="0"/></radialGradient>
<radialGradient id="gSoft"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".5"/><stop offset="1" stop-color="#f5a623" stop-opacity="0"/></radialGradient>
<linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".55" stop-color="#d4af37"/><stop offset="1" stop-color="#8c6a14"/></linearGradient>
</defs>
${style(anim)}
<rect width="${W}" height="${H}" fill="url(#gBg)"/>
<g fill="none" stroke="#7a5f1a" stroke-width="1" opacity=".07">${Array.from({ length: 15 }, (_, i) => `<path d="M${(i + 1) * 100} 0V${H}"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${(i + 1) * 100}H${W}"/>`).join('')}</g>
${stars}
<circle cx="${CX}" cy="${CY}" r="430" fill="url(#gSoft)" opacity=".35"/>
<g fill="none" stroke="#e2bd4a" stroke-width="1.6" stroke-opacity=".45">${spokes.map(s => `<path d="M${f1(s[0])} ${f1(s[1])}L${f1(s[2])} ${f1(s[3])}"/>`).join('')}</g>
<g fill="none" stroke="#e2bd4a" stroke-width="1.2" stroke-opacity=".3" stroke-dasharray="3 9">${BRIDGES.map(([a, b]) => `<path d="M${f1(CLUSTERS[a].x)} ${f1(CLUSTERS[a].y)}L${f1(CLUSTERS[b].x)} ${f1(CLUSTERS[b].y)}"/>`).join('')}</g>
<g fill="none" stroke-linecap="round">${pkOut.svg}${pkIn.svg}${pkBr.svg}</g>
${clusterSvg}
<circle class="heart" cx="${CX}" cy="${CY}" r="130" fill="url(#gHub)"/>
<circle cx="${CX}" cy="${CY}" r="58" fill="#0d1526" stroke="url(#gGold)" stroke-width="4"/>
<circle cx="${CX}" cy="${CY}" r="72" fill="none" stroke="#fff3c4" stroke-width="1" stroke-opacity=".4"/>
</svg>
`;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
const live = svg(true);
const stat = svg(false).replace(/ style="animation-[^"]*"/g, '');
writeFileSync(join(ROOT, 'img/brain-graph.svg'), live);
writeFileSync(join(ROOT, 'img/brain-graph-static.svg'), stat);
console.log(`img/brain-graph.svg (${(live.length / 1024).toFixed(1)} KB), img/brain-graph-static.svg (${(stat.length / 1024).toFixed(1)} KB)`);
console.log('Etiket konumları (css .brain__label:nth-child(n) { left; top } — kümenin 40 px altı):');
CLUSTERS.forEach((c, i) => console.log(`  ${i + 1}: left ${(c.x / W * 100).toFixed(2)}%  top ${((c.y + 34) / H * 100).toFixed(2)}%`));
