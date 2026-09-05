#!/usr/bin/env node
/* FYOS bilgi grafiği — gece dünyası: altın kıta hatları, şehir ışıkları, parlayan merkezler ve aralarında akan ışık paketleri.
   Çıktılar: img/brain-map.svg (canlı) ve img/brain-map-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-brain.mjs

   Sahne 1600×1000, eşdikdörtgen izdüşüm (lon −180…180 → x, lat 84…−58 → y). Kara parçaları tools/data/world-land.json
   (Natural Earth, kamu malı; sadeleştirilmiş). Merkezler (lat, lon, ağırlık) aşağıda; şehir ışıkları merkez çevresine
   rastgele dağılır ve yalnız kara üzerine düşenler kalır. Rotalar yukarı kavisli ikinci derece Bézier; her rotada
   noktalı iz + üzerinde kayan ışık paketi (stroke-dashoffset). Süzgeç yok; parıltı yarı saydam katmanlarla. Tohumlu rastgele. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1 } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAND = JSON.parse(readFileSync(join(ROOT, 'tools/data/world-land.json'), 'utf8'));
const W = LAND.w, H = LAND.h;
const R = rng(20260907);
const rnd = (a, b) => a + (b - a) * R();
const proj = (lat, lon) => [(lon + 180) / 360 * W, (LAND.latN - lat) / (LAND.latN - LAND.latS) * H];

/* ---------- Kara: yol ve nokta-içinde testi ---------- */
const landPath = LAND.rings.map(r => 'M' + r.map(p => p.join(' ')).join('L') + 'Z').join('');
function onLand(x, y) {
  let inside = false;
  for (const r of LAND.rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/* ---------- Merkezler: [ad, lat, lon, ağırlık] — ağırlık 3 en parlak (NRW: FY'nin evi) ---------- */
const HUBS = [
  ['nrw', 50.94, 6.96, 3], ['ist', 41.01, 28.98, 2], ['lon', 51.5, -0.13, 2], ['par', 48.86, 2.35, 1], ['mad', 40.4, -3.7, 1], ['rom', 41.9, 12.5, 1],
  ['ber', 52.5, 13.4, 1], ['sto', 59.3, 18.1, 1], ['mos', 55.75, 37.6, 2], ['kie', 50.45, 30.5, 1], ['cai', 30.0, 31.2, 1], ['teh', 35.7, 51.4, 2],
  ['kun', 36.7, 68.9, 2], ['dxb', 25.2, 55.3, 2], ['ryd', 24.7, 46.7, 1], ['khi', 24.9, 67.0, 1], ['del', 28.6, 77.2, 2], ['bom', 19.1, 72.9, 1],
  ['bkk', 13.8, 100.5, 1], ['sin', 1.35, 103.8, 2], ['jak', -6.2, 106.8, 1], ['mnl', 14.6, 121.0, 1], ['sha', 31.2, 121.5, 3], ['pek', 39.9, 116.4, 2],
  ['seo', 37.6, 127.0, 1], ['tyo', 35.7, 139.7, 2], ['syd', -33.9, 151.2, 2], ['per', -31.9, 115.9, 1], ['akl', -36.8, 174.8, 1], ['lag', 6.5, 3.4, 1],
  ['nbo', -1.3, 36.8, 1], ['jnb', -26.2, 28.0, 2], ['cas', 33.6, -7.6, 1], ['nyc', 40.7, -74.0, 3], ['yto', 43.7, -79.4, 1], ['chi', 41.9, -87.6, 1],
  ['lax', 34.05, -118.2, 2], ['sfo', 37.8, -122.4, 1], ['mex', 19.4, -99.1, 2], ['bog', 4.7, -74.1, 1], ['lim', -12.0, -77.0, 1], ['sao', -23.5, -46.6, 2],
  ['bue', -34.6, -58.4, 1], ['scl', -33.4, -70.6, 1], ['hnl', 21.3, -157.9, 1], ['rey', 64.1, -21.9, 1], ['anc', 61.2, -149.9, 1],
].map(([id, lat, lon, w]) => { const [x, y] = proj(lat, lon); return { id, x, y, w }; });
const hub = id => HUBS.find(h => h.id === id);
/* İkincil şehirler: yalnız ışık kümesi (çekirdek ve rota yok) — kıtalar gerçek nüfus dağılımı gibi dolsun */
const TOWNS = [
  [53.5, -2.2], [53.55, 10.0], [48.1, 11.6], [48.2, 16.4], [52.2, 21.0], [45.5, 9.2], [41.4, 2.2], [38.7, -9.1], [37.98, 23.7], [39.9, 32.9], [50.1, 8.7], [47.4, 8.5],
  [33.3, 44.4], [21.5, 39.2], [31.5, 74.3], [22.6, 88.4], [12.97, 77.6], [13.1, 80.3], [23.8, 90.4], [21.0, 105.8], [10.8, 106.7], [3.1, 101.7], [25.0, 121.5], [34.7, 135.5],
  [22.3, 114.2], [29.6, 106.6], [30.6, 114.3], [23.1, 113.3], [-37.8, 145.0], [-27.5, 153.0], [5.6, -0.2], [9.0, 38.7], [15.6, 32.5], [36.7, 3.1], [36.8, 10.2], [-4.3, 15.3],
  [32.8, -96.8], [29.8, -95.4], [25.8, -80.2], [33.7, -84.4], [47.6, -122.3], [39.7, -105.0], [49.3, -123.1], [45.5, -73.6], [10.5, -66.9], [-22.9, -43.2], [-12.97, -38.5],
  [20.7, -103.3], [25.7, -100.3], [59.9, 30.3], [55.0, 82.9], [41.3, 69.2], [43.2, 76.9], [56.8, 60.6], [43.0, -76.0], [38.9, -77.0], [42.4, -71.1], [39.95, -75.2],
  [30.3, -97.7], [36.2, -115.1], [33.4, -112.1], [45.4, 4.4], [43.3, 5.4], [50.85, 4.35], [52.4, 4.9], [55.7, 12.6], [60.2, 25.0], [59.9, 10.75], [44.4, 26.1], [47.5, 19.0],
  [50.1, 14.4], [44.8, 20.5], [42.7, 23.3], [40.4, 49.9], [41.7, 44.8], [35.2, 33.4], [31.9, 35.2], [24.5, 54.4], [26.2, 50.6], [23.6, 58.6], [15.4, 44.2], [33.5, 36.3],
  [33.9, 35.5], [37.1, 37.4], [38.4, 27.1], [40.2, 29.1], [36.9, 30.7], [34.0, -6.8], [31.6, -8.0], [14.7, -17.4], [12.4, -1.5], [6.4, 2.4], [4.0, 9.7], [-1.9, 30.1],
  [-15.4, 28.3], [-17.8, 31.0], [-25.9, 32.6], [-33.9, 18.4], [-29.9, 31.0], [-6.8, 39.3], [0.3, 32.6], [2.0, 45.3], [11.6, 43.1], [-18.9, 47.5], [27.7, 85.3], [24.9, 91.9],
  [16.8, 96.2], [7.9, 98.4], [-8.6, 115.2], [-7.3, 112.7], [-5.1, 119.4], [10.3, 123.9], [6.1, 125.6], [-9.4, 147.2], [-41.3, 174.8], [-43.5, 172.6], [-31.9, 115.9],
  [-12.5, 130.8], [-34.9, 138.6], [-42.9, 147.3], [64.8, -147.7], [58.3, -134.4], [53.5, -113.5], [51.0, -114.1], [50.4, -104.6], [49.9, -97.1], [46.8, -71.2], [44.6, -63.6],
  [47.6, -52.7], [-0.2, -78.5], [-16.5, -68.2], [-25.3, -57.6], [-34.9, -56.2], [-33.0, -71.6], [-3.1, -60.0], [-8.05, -34.9], [-3.7, -38.5], [-1.5, -48.5], [-19.9, -43.9],
  [-30.0, -51.2], [-25.4, -49.3], [23.1, -82.4], [18.5, -69.9], [18.0, -76.8], [14.6, -90.5], [9.9, -84.1], [8.98, -79.5], [12.1, -86.3], [13.7, -89.2], [17.3, -62.7],
].map(([lat, lon]) => { const [x, y] = proj(lat, lon); return { x, y, w: 0 }; });

/* ---------- Rotalar ---------- */
const ROUTES = [
  ['nrw', 'ist'], ['nrw', 'lon'], ['nrw', 'mad'], ['nrw', 'mos'], ['nrw', 'cai'], ['nrw', 'dxb'], ['nrw', 'teh'], ['nrw', 'kun'], ['nrw', 'del'], ['nrw', 'sha'],
  ['nrw', 'nyc'], ['nrw', 'sao'], ['nrw', 'lag'], ['nrw', 'jnb'], ['nrw', 'sin'], ['nrw', 'rey'], ['ist', 'teh'], ['ist', 'kun'], ['teh', 'dxb'], ['kun', 'del'],
  ['dxb', 'nbo'], ['del', 'sin'], ['sin', 'syd'], ['sha', 'tyo'], ['pek', 'seo'], ['tyo', 'syd'], ['tyo', 'lax'], ['syd', 'akl'], ['per', 'sin'], ['mos', 'pek'],
  ['lon', 'nyc'], ['nyc', 'lax'], ['nyc', 'sao'], ['nyc', 'mex'], ['lax', 'hnl'], ['mex', 'bog'], ['bog', 'lim'], ['lim', 'scl'], ['sao', 'bue'], ['cai', 'lag'],
  ['cas', 'par'], ['sto', 'ber'], ['anc', 'sfo'], ['jnb', 'nbo'], ['bkk', 'sha'],
];
function route(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  let nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny; }        // kavis yukarı (ekranda −y)
  const bulge = d * .32 + 12;
  const c = [(a.x + b.x) / 2 + nx * bulge, (a.y + b.y) / 2 + ny * bulge];
  let L = 0, px = a.x, py = a.y;
  for (let i = 1; i <= 48; i++) { const t = i / 48, x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c[0] + t * t * b.x, y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c[1] + t * t * b.y; L += Math.hypot(x - px, y - py); px = x; py = y; }
  return { d: `M${f1(a.x)} ${f1(a.y)}Q${f1(c[0])} ${f1(c[1])} ${f1(b.x)} ${f1(b.y)}`, L };
}
let routeSvg = '', routeKeys = '';
ROUTES.forEach(([ia, ib], i) => {
  const a = hub(ia), b = hub(ib), r = route(a, b), dur = Math.min(9, Math.max(3.2, r.L / 150));
  const delay = -rnd(0, dur), dash = 30;
  routeKeys += `@keyframes fl${i}{from{stroke-dashoffset:${dash}}to{stroke-dashoffset:${f1(-r.L)}}}.fl${i}{animation:fl${i} ${f1(dur)}s linear ${f1(delay)}s infinite}`;
  routeSvg += `<path d="${r.d}" class="rt"/>` +
    `<path d="${r.d}" class="fg fl${i}" stroke-dasharray="${dash} ${f1(r.L + 4)}" stroke-dashoffset="${dash}"/>` +
    `<path d="${r.d}" class="fc fl${i}" stroke-dasharray="${dash} ${f1(r.L + 4)}" stroke-dashoffset="${dash}"/>`;
});

/* ---------- Şehir ışıkları ---------- */
const bands = { a: '', b: '', c: '' };                         // üç opaklık kümesi (dosya küçük kalsın)
let tw = '';
const put = (x, y, r, o) => { const k = o > .8 ? 'a' : o > .5 ? 'b' : 'c'; bands[k] += `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${f1(r)}"/>`; };
for (const h of HUBS.concat(TOWNS)) {
  const n = 10 + h.w * 20, spread = 18 + h.w * 16;
  for (let i = 0; i < n; i++) {
    const ang = rnd(0, 6.283), rad = Math.pow(R(), .6) * spread;
    const x = h.x + Math.cos(ang) * rad, y = h.y + Math.sin(ang) * rad * .8;
    if (!onLand(x, y)) continue;
    const r = rnd(.9, 2.1);
    if (R() < .15) tw += `<circle class="tw" cx="${Math.round(x)}" cy="${Math.round(y)}" r="${f1(r)}" style="animation-duration:${f1(rnd(1.6, 4))}s;animation-delay:-${f1(rnd(0, 4))}s"/>`;
    else put(x, y, r, rnd(.4, 1));
  }
}
// bölgesel yoğunluk: kara üzerinde rastgele adaylar, en yakın merkeze/şehre uzaklıkla azalan olasılıkla kalır
const ALL = HUBS.concat(TOWNS);
for (let i = 0; i < 6500; i++) {
  const x = rnd(0, W), y = rnd(40, H - 40); if (!onLand(x, y)) continue;
  let best = 1e9; for (const h of ALL) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < best) best = d; }
  const pKeep = Math.exp(-best / (2 * 55 * 55)) * .85 + .045;
  if (R() < pKeep) put(x, y, rnd(.5, 1.3), rnd(.2, .6));
}
let stars = '';
for (let i = 0; i < 60; i++) { const x = rnd(0, W), y = rnd(0, H); if (!onLand(x, y)) stars += `<circle class="tw" cx="${Math.round(x)}" cy="${Math.round(y)}" r="${f1(rnd(.8, 1.8))}" style="animation-duration:${f1(rnd(2, 5))}s;animation-delay:-${f1(rnd(0, 5))}s"/>`; }

/* ---------- Merkezler ---------- */
let hubSvg = '';
for (const h of HUBS) {
  const core = 2.6 + h.w * 1.6, glow = 9 + h.w * 7;
  hubSvg += `<g transform="translate(${f1(h.x)} ${f1(h.y)})">` +
    `<circle r="${f1(glow)}" fill="url(#gHub)" opacity="${f1(.55 + h.w * .12)}"/>` +
    (h.w >= 2 ? `<circle class="halo" r="${f1(core + 2)}" style="animation-delay:-${f1(rnd(0, 3))}s"/>` : '') +
    (h.w >= 3 ? `<circle class="halo" r="${f1(core + 2)}" style="animation-delay:-${f1(rnd(0, 3))}s;animation-duration:4.2s"/>` : '') +
    `<circle class="core" r="${f1(core)}" style="animation-delay:-${f1(rnd(0, 3))}s"/></g>`;
}

/* ---------- Stil ---------- */
function style(anim) {
  if (!anim) return '';
  return `<style>
.tw{animation:twinkle 3s ease-in-out infinite alternate}
.core{transform-box:fill-box;transform-origin:center;animation:core 2.8s ease-in-out infinite alternate}
.halo{transform-box:fill-box;transform-origin:center;animation:halo 3s ease-out infinite}
${routeKeys}
@keyframes twinkle{from{opacity:.2}to{opacity:1}}
@keyframes core{from{transform:scale(.85);opacity:.8}to{transform:scale(1.12);opacity:1}}
@keyframes halo{from{transform:scale(1);opacity:.85}to{transform:scale(4.2);opacity:0}}
</style>`;
}

function svg(anim) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-brain.mjs — elle düzenleme, betiği çalıştır. Kara verisi: Natural Earth (kamu malı). -->
<defs>
<radialGradient id="gBg" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#0a1020"/><stop offset="1" stop-color="#030508"/></radialGradient>
<radialGradient id="gHub"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".95"/><stop offset=".35" stop-color="#f5b93a" stop-opacity=".45"/><stop offset="1" stop-color="#f5a623" stop-opacity="0"/></radialGradient>
<linearGradient id="gLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101c30"/><stop offset="1" stop-color="#0a1322"/></linearGradient>
</defs>
${style(anim)}
<rect width="${W}" height="${H}" fill="url(#gBg)"/>
<g fill="none" stroke="#7a5f1a" stroke-width="1" opacity=".06">${Array.from({ length: 15 }, (_, i) => `<path d="M${(i + 1) * 100} 0V${H}"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${(i + 1) * 100}H${W}"/>`).join('')}</g>
<!-- Kıyı parıltısı: önce geniş altın kontur, üstüne kara dolgusu → iç sınırlar örtülür, yalnız denize bakan yarı kalır -->
<path d="${landPath}" fill="none" stroke="#d4af37" stroke-width="9" stroke-opacity=".16" stroke-linejoin="round"/>
<path d="${landPath}" fill="none" stroke="#f1cf5e" stroke-width="2.6" stroke-opacity=".85" stroke-linejoin="round"/>
<path d="${landPath}" fill="url(#gLand)"/>
<path d="${landPath}" fill="none" stroke="#e2bd4a" stroke-width=".7" stroke-opacity=".16" stroke-linejoin="round"/>
<g fill="#f5c451"><g opacity=".92">${bands.a}</g><g opacity=".62">${bands.b}</g><g opacity=".36">${bands.c}</g></g>
<g fill="#fff0b8">${tw}</g>
<g fill="#cfd8ea">${stars}</g>
<g class="routes" fill="none" stroke-linecap="round">
<style>.rt{stroke:#e2bd4a;stroke-width:1.5;stroke-dasharray:1.5 7;stroke-opacity:.42}.fg{stroke:#ffd766;stroke-width:6;stroke-opacity:.22}.fc{stroke:#fff6d0;stroke-width:2.2;stroke-opacity:.95}</style>
${routeSvg}
</g>
<g class="hubs" fill="#fff3c4"><style>.core{fill:#fff8dc}.halo{fill:none;stroke:#ffd766;stroke-width:1.4;opacity:0}</style>${hubSvg}</g>
</svg>
`;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
const live = svg(true);
// Sabit sürüm: animasyon yok; ışık paketleri başlangıç konumunda (rota dışında) görünmez, merkez halkaları gizli
const stat = svg(false).replace(/ style="animation-[^"]*"/g, '');
writeFileSync(join(ROOT, 'img/brain-map.svg'), live);
writeFileSync(join(ROOT, 'img/brain-map-static.svg'), stat);
console.log(`img/brain-map.svg (${(live.length / 1024).toFixed(1)} KB), img/brain-map-static.svg (${(stat.length / 1024).toFixed(1)} KB), hubs ${HUBS.length}, routes ${ROUTES.length}`);
