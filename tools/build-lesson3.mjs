#!/usr/bin/env node
/* Bölüm 3 dersinin kapağı — "kendi kendine çalışan devre".
   Solda uyanan bir tetikleyici, ortada birbirine bağlı düğümler ve bir yerde ikiye ayrılıp yeniden
   birleşen dal, sağda iki çıkış. Paketler durmadan akıyor; insan yok. Bölüm 1 organik bir
   çekirdekti, Bölüm 2 bir mekanizma; bu bir ağ — merkez yok, akış var. Sahne 1600×686 (21:9).

   Çıktılar: img/course/l3-cover.svg (canlı) ve img/course/l3-cover-static.svg (hareket azaltma için).
   Kullanım: node tools/build-lesson3.mjs
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu — çıktı kararlı. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1 } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260910);
const rnd = (a, b) => a + (b - a) * R();
const W = 1600, H = 686, CY = 343;

/* ---------- Düğümler ----------
   n8n tuvalindeki gibi: yuvarlatılmış kareler, içinde küçük bir işaret. Konumlar elle —
   akışın okunması için sol→sağ hizalı, dal noktasında yukarı/aşağı ayrılıyor. */
const N = 56;                                                     // düğüm kenarı
const nodes = {
  trig: { x: 250, y: CY, kind: 'trigger' },
  a:    { x: 470, y: CY, kind: 'node' },
  cond: { x: 690, y: CY, kind: 'if' },
  up:   { x: 910, y: CY - 122, kind: 'node' },
  down: { x: 910, y: CY + 122, kind: 'node' },
  ai:   { x: 1130, y: CY, kind: 'ai' },
  out1: { x: 1360, y: CY - 82, kind: 'out' },
  out2: { x: 1360, y: CY + 82, kind: 'out' },
};
const edges = [['trig', 'a'], ['a', 'cond'], ['cond', 'up'], ['cond', 'down'], ['up', 'ai'], ['down', 'ai'], ['ai', 'out1'], ['ai', 'out2']];

/* Bezier tel: çıkış sağ kenardan, giriş sol kenardan; n8n telleri gibi yatay tanjantlı.
   Tel gradyanı userSpaceOnUse: nesne-kutusu birimli gradyan, tam yatay (sıfır yükseklikli) bir yolda
   tanımsız kalır ve çizgi hiç çizilmez — düz teller bu yüzden kaybolmuştu. */
const wire = (p, q) => {
  const x1 = p.x + N / 2, y1 = p.y, x2 = q.x - N / 2, y2 = q.y, c = (x2 - x1) * .5;
  return `M${f1(x1)} ${f1(y1)} C${f1(x1 + c)} ${f1(y1)} ${f1(x2 - c)} ${f1(y2)} ${f1(x2)} ${f1(y2)}`;
};
let wires = '', packets = '';
edges.forEach(([a, b], i) => {
  const d = wire(nodes[a], nodes[b]);
  wires += `<path d="${d}"/>`;
  const dur = f1(rnd(2.6, 3.6)), delay = f1(-(i * .55 + rnd(0, .4)));
  packets += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="5 95" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
  if (i % 3 === 0) packets += `<path class="pk" d="${d}" pathLength="100" stroke-dasharray="3 97" style="animation-duration:${dur}s;animation-delay:${f1(+delay - 1.4)}s" opacity=".6"/>`;
});

/* Düğüm gövdeleri ve içlerindeki işaretler */
function glyph(n) {
  const { x, y, kind } = n;
  if (kind === 'trigger') {                                        // zil: daire + içinde nokta, dışında nabız halkaları
    return `<circle cx="${x}" cy="${y}" r="${N / 2}" fill="url(#nodeFill)" stroke="url(#ring)" stroke-width="1.6"/>` +
      `<circle cx="${x}" cy="${y}" r="7" fill="#fff3c4"/>` +
      `<circle class="pulse" cx="${x}" cy="${y}" r="${N / 2}" fill="none" stroke="#f5d76e" stroke-width="1.4"/>` +
      `<circle class="pulse pulse2" cx="${x}" cy="${y}" r="${N / 2}" fill="none" stroke="#f5d76e" stroke-width="1.2"/>`;
  }
  if (kind === 'if') {                                             // eşkenar dörtgen: koşul
    const r = N / 2 + 6;
    return `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="url(#nodeFill)" stroke="url(#ring)" stroke-width="1.6"/>` +
      `<path d="M${x - 10} ${y}h20M${x} ${y - 10}v20" stroke="#fff3c4" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;
  }
  if (kind === 'ai') {                                             // yapay zekâ düğümü: kare + küçük yıldız kümesi
    return `<rect x="${x - N / 2}" y="${y - N / 2}" width="${N}" height="${N}" rx="14" fill="url(#nodeFill)" stroke="url(#ring)" stroke-width="1.8"/>` +
      `<circle cx="${x - 9}" cy="${y - 7}" r="3.2" fill="#fff3c4"/><circle cx="${x + 8}" cy="${y - 2}" r="2.6" fill="#fff3c4"/><circle cx="${x - 2}" cy="${y + 9}" r="2.2" fill="#fff3c4"/>` +
      `<path d="M${x - 9} ${y - 7}L${x + 8} ${y - 2}L${x - 2} ${y + 9}Z" fill="none" stroke="#f5d76e" stroke-width="1" opacity=".7"/>` +
      `<rect class="aiGlow" x="${x - N / 2 - 6}" y="${y - N / 2 - 6}" width="${N + 12}" height="${N + 12}" rx="18" fill="none" stroke="#f5d76e" stroke-width="1"/>`;
  }
  if (kind === 'out') {                                            // çıkış: küçük yuvarlak + kısa çizgi
    return `<rect x="${x - 22}" y="${y - 22}" width="44" height="44" rx="12" fill="url(#nodeFill)" stroke="url(#ring)" stroke-width="1.4" opacity=".9"/>` +
      `<path d="M${x - 8} ${y}h16" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return `<rect x="${x - N / 2}" y="${y - N / 2}" width="${N}" height="${N}" rx="14" fill="url(#nodeFill)" stroke="url(#ring)" stroke-width="1.6"/>` +
    `<path d="M${x - 11} ${y - 6}h22M${x - 11} ${y + 1}h14M${x - 11} ${y + 8}h18" stroke="#fff3c4" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
}
const bodies = Object.values(nodes).map(glyph).join('');
const halos = Object.values(nodes).map(n => `<circle cx="${n.x}" cy="${n.y}" r="${n.kind === 'ai' ? 96 : 64}" fill="url(#halo)" opacity="${n.kind === 'ai' ? '.9' : '.55'}"/>`).join('');

/* ---------- Tuval ızgarası: n8n'in noktalı zemini ---------- */
let grid = '';
for (let x = 40; x < W; x += 40) for (let y = 23; y < H; y += 40)
  grid += `<circle cx="${x}" cy="${y}" r="1" opacity="${f1(.18 + .1 * Math.sin(x * .013) * Math.cos(y * .017))}"/>`;

/* ---------- Saat: sol üstte 24/7 halkası ---------- */
let clock = '';
const cx = 118, cy = 112, cr = 44;
for (let i = 0; i < 24; i++) {
  const a = i * 15 * Math.PI / 180, long = i % 6 === 0;
  clock += `<path d="M${f1(cx + (cr - (long ? 8 : 4)) * Math.cos(a))} ${f1(cy + (cr - (long ? 8 : 4)) * Math.sin(a))}L${f1(cx + cr * Math.cos(a))} ${f1(cy + cr * Math.sin(a))}" opacity="${long ? '.55' : '.25'}"/>`;
}
clock += `<circle cx="${cx}" cy="${cy}" r="${cr + 8}" fill="none" stroke="url(#ring)" stroke-width="1" opacity=".35"/>`;
const hand = `<path class="hand" d="M${cx} ${cy}L${cx} ${cy - cr + 12}" stroke="#fff3c4" stroke-width="2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="2.6" fill="#fff3c4"/>`;

/* ---------- Toz ---------- */
let dust = '';
for (let i = 0; i < 40; i++) dust += `<circle cx="${f1(rnd(0, W))}" cy="${f1(rnd(0, H))}" r="${f1(rnd(.7, 1.7))}" opacity="${f1(rnd(.1, .4))}"/>`;

const CSS = `<style>
.pk{animation-name:flow;animation-timing-function:linear;animation-iteration-count:infinite}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.8s ease-out infinite}
.pulse2{animation-delay:1.4s}
.aiGlow{transform-box:fill-box;transform-origin:center;animation:breathe 3.4s ease-in-out infinite alternate}
.hand{transform-box:fill-box;transform-origin:50% 100%;animation:spin 24s linear infinite}
@keyframes flow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes pulse{from{transform:scale(1);opacity:.8}to{transform:scale(2.1);opacity:0}}
@keyframes breathe{from{opacity:.25}to{opacity:.8}}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;

const svg = (anim) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-lesson3.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<radialGradient id="bg" cx=".5" cy=".5" r=".76"><stop offset="0" stop-color="#1e1706"/><stop offset=".46" stop-color="#100b05"/><stop offset="1" stop-color="#050403"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#e9bf48" stop-opacity=".22"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<linearGradient id="nodeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2008"/><stop offset="1" stop-color="#140f05"/></linearGradient>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4e0e"/><stop offset=".45" stop-color="#d4af37"/><stop offset=".62" stop-color="#fff3c4"/><stop offset="1" stop-color="#6b4e0e"/></linearGradient>
<linearGradient id="wire" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1600" y2="0"><stop offset="0" stop-color="#8a6a18"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a18"/></linearGradient>
</defs>
${anim ? CSS : ''}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g fill="#ffe9a3">${grid}</g>
<g fill="#ffe9a3">${dust}</g>
${halos}
<g fill="none" stroke="url(#wire)" stroke-width="1.8" opacity=".75">${wires}</g>
<g fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round">${packets}</g>
${bodies}
<g fill="none" stroke="#f5d76e" stroke-width="1.2">${clock}</g>
${hand}
</svg>
`;

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
for (const [name, s] of [['l3-cover.svg', svg(true)], ['l3-cover-static.svg', svg(false)]]) {
  writeFileSync(join(ROOT, 'img/course', name), s);
  console.log(`img/course/${name} (${(s.length / 1024).toFixed(1)} KB)`);
}
