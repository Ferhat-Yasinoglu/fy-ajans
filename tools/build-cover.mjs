#!/usr/bin/env node
/* Kurs kapağı sahnesi — "Yapay Zekâ Yolculuğu": ışıklı koridor, ağ küresi, altın şeritler.
   Çıktılar: img/cover-scene.svg (canlı) ve img/cover-scene-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-cover.mjs

   Sahne 1000×1000. Yazılar, yedi panel, FY logosu ve yürüyen figür HTML katmanlarıdır (css .cover*); bu SVG yalnız arka planı çizer:
   gökyüzü ızgarası ve kıvılcımlar, ufuk ışığı, perspektifli zemin ızgarası ve viewer'a doğru akan ışık huzmeleri,
   koridor yolu ve üzerinde kayan ışık bantları, yan bloklar, kürenin arkasındaki ışık patlaması, panel sütunlarını
   saran sıvı altın şeritler, dönen noktalı ağ küresi (kaydırılan nokta deseni, paralel/meridyenler, yanıp sönen bağlantı yayları).
   Süzgeç yok; parıltılar yarı saydam katmanlarla. Rastgelelik tohumlu. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P, ribbonLayers } from './lib/gold.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = rng(20260906);
const rnd = (a, b) => a + (b - a) * R();

const VP = [500, 548];                 // kaçış noktası (ufuk)
const GLOBE = { x: 500, y: 490, r: 175 };

/* ---------- Gökyüzü ızgarası ---------- */
let grid = '';
for (let x = 50; x < 1000; x += 50) grid += `<path d="M${x} 0V560"/>`;
for (let y = 50; y < 560; y += 50) grid += `<path d="M0 ${y}H1000"/>`;

/* ---------- Kıvılcımlar ---------- */
const sparks = [];
for (let i = 0; i < 70; i++) sparks.push({ x: rnd(0, 1000), y: rnd(0, 560), r: rnd(1, 2.6), d: rnd(2, 5), dl: rnd(0, 5), c: R() < .8 ? '#fff3c4' : '#9bc3ff' });
for (let i = 0; i < 40; i++) sparks.push({ x: rnd(0, 1000), y: rnd(560, 1000), r: rnd(1.2, 3), d: rnd(1.5, 4), dl: rnd(0, 4), c: '#ffe680' });
for (let i = 0; i < 9; i++) sparks.push({ x: rnd(60, 940), y: rnd(80, 900), r: rnd(6, 11), d: rnd(3, 6), dl: rnd(0, 5), c: 'url(#gSoft)', soft: true });
const sparkSvg = sparks.map(s => `<circle class="tw" cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(s.r)}" fill="${s.c}" style="animation-duration:${f1(s.d)}s;animation-delay:-${f1(s.dl)}s"/>`).join('');

/* ---------- Zemin ---------- */
let floorLines = '';
for (let k = -7; k <= 17; k++) { const xb = k * 100; floorLines += `<path d="M${VP[0]} ${VP[1]}L${xb} 1000"/>`; }
for (let k = 1; k <= 9; k++) { const y = 560 + 440 * Math.pow(k / 9, 1.9); floorLines += `<path d="M0 ${f1(y)}H1000"/>`; }
// akan huzmeler: kaçış noktasından çıkan seçili çizgiler, kesikli ve dashoffset ile viewer'a doğru akar
const rays = [-300, -100, 150, 850, 1100, 1300].map((xb, i) => {
  const t0 = (600 - VP[1]) / (1000 - VP[1]);                       // y=600'den başlasın (ufka yapışmasın)
  const x0 = VP[0] + (xb - VP[0]) * t0;
  return `<path class="ray" d="M${f1(x0)} 600L${xb} 1000" style="animation-duration:${f1(rnd(2.2, 3.6))}s;animation-delay:-${f1(rnd(0, 3))}s" opacity="${f1(rnd(.35, .6))}"/>`;
}).join('');

// koridor ışık bantları: 240 px aralıkla, kırpma alanının (y 560–1000) üstünden altına kadar; döngü 240 px kaydırır → kesintisiz
let bands = '';
for (let y = -240; y <= 960; y += 240) bands += `<rect x="0" y="${y}" width="1000" height="80" fill="url(#gBand)"/>`;

/* ---------- Yan bloklar (perspektifli) ---------- */
function pillar(mirror) {
  const M = x => mirror ? 1000 - x : x;
  return `<polygon points="${M(0)},640 ${M(130)},690 ${M(130)},1000 ${M(0)},1000" fill="url(#gPillar)"/>
<polyline points="${M(0)},640 ${M(130)},690" fill="none" stroke="#f5d76e" stroke-width="8" opacity=".18"/>
<polyline points="${M(0)},640 ${M(130)},690" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".85"/>
<polygon points="${M(168)},705 ${M(250)},725 ${M(250)},1000 ${M(168)},1000" fill="url(#gPillar)" opacity=".9"/>
<polyline points="${M(168)},705 ${M(250)},725" fill="none" stroke="#fff3c4" stroke-width="1.6" opacity=".6"/>
<circle class="lamp" cx="${M(40)}" cy="656" r="3.5" fill="#fff8dc"/><circle class="lamp" cx="${M(96)}" cy="677" r="3" fill="#fff8dc" style="animation-delay:-1.1s"/>
<circle class="lamp" cx="${M(200)}" cy="713" r="2.6" fill="#fff8dc" style="animation-delay:-.6s"/>`;
}

/* ---------- Şeritler ---------- */
const ribG = [{ a0: 150, span: 200, R: 228, A: 8, k: 2.2, ph: 1.1, W: 6 }, { a0: 330, span: 170, R: 246, A: 9, k: 2.6, ph: 2.9, W: 5 }];
const ribL = [], ribR = [];
for (let i = 0; i < 3; i++) ribL.push({ a0: 80 + i * 120 + rnd(-20, 20), span: rnd(120, 190), R: rnd(190, 232), A: rnd(6, 12), k: rnd(1.8, 3.2), ph: rnd(0, 6.28), W: rnd(6, 12) });
for (let i = 0; i < 3; i++) ribR.push({ a0: 60 + i * 120 + rnd(-20, 20), span: rnd(120, 190), R: rnd(190, 232), A: rnd(6, 12), k: rnd(1.8, 3.2), ph: rnd(0, 6.28), W: rnd(6, 12) });
const ribs = (list, cls) => list.map((o, i) => `<g class="rb ${cls}${i}" style="animation-duration:${f1(rnd(3.5, 6))}s;animation-delay:-${f1(rnd(0, 5))}s">${ribbonLayers(o, { g1: .12, g2: .2, coreW: 1.4 })}</g>`).join('');

/* ---------- Küre ---------- */
const g = GLOBE;
let globe = `<circle cx="${g.x}" cy="${g.y}" r="${g.r}" fill="url(#gGlobe)"/>`;
globe += `<g clip-path="url(#cGlobe)"><g class="dots"><rect x="${g.x - g.r - 26}" y="${g.y - g.r}" width="${2 * g.r + 52}" height="${2 * g.r}" fill="url(#pDots)"/></g>`;
for (const dy of [-120, -60, 0, 60, 120]) { const rx = Math.sqrt(g.r * g.r - dy * dy); globe += `<ellipse cx="${g.x}" cy="${g.y + dy}" rx="${f1(rx)}" ry="${f1(rx * .18)}" fill="none" stroke="#7cc4ff" stroke-width="1" opacity=".35"/>`; }
for (const f of [.28, .62, .9]) globe += `<ellipse cx="${g.x}" cy="${g.y}" rx="${f1(g.r * f)}" ry="${g.r}" fill="none" stroke="#f5d76e" stroke-width="1" opacity=".3"/>`;
// bağlantı yayları: küre yüzeyindeki rastgele noktalar arasında kıvrımlı ışık
for (let i = 0; i < 7; i++) {
  const [a, b] = [P(rnd(60, 150), rnd(0, 360)), P(rnd(60, 150), rnd(0, 360))];
  const mx = (a[0] + b[0]) / 2 + rnd(-40, 40), my = (a[1] + b[1]) / 2 + rnd(-40, 40);
  globe += `<path class="larc" d="M${f1(g.x + a[0])} ${f1(g.y + a[1])}Q${f1(g.x + mx)} ${f1(g.y + my)} ${f1(g.x + b[0])} ${f1(g.y + b[1])}" fill="none" stroke="#ffe680" stroke-width="1.6" stroke-linecap="round" style="animation-delay:-${f1(rnd(0, 5))}s"/>` +
    `<circle cx="${f1(g.x + a[0])}" cy="${f1(g.y + a[1])}" r="2.4" fill="#fff6c8"/><circle cx="${f1(g.x + b[0])}" cy="${f1(g.y + b[1])}" r="2.4" fill="#fff6c8"/>`;
}
globe += `</g>`;
// kenar (limb) ve dönen parlama
const circ = 2 * Math.PI * (g.r + 3);
globe += `<circle cx="${g.x}" cy="${g.y}" r="${g.r + 7}" fill="none" stroke="#f5d76e" stroke-width="16" opacity=".16"/>
<circle cx="${g.x}" cy="${g.y}" r="${g.r + 3}" fill="none" stroke="url(#gLimb)" stroke-width="4" opacity=".95"/>
<g transform="translate(${g.x} ${g.y})"><g class="sweep"><circle r="${g.r + 3}" fill="none" stroke="#fff8dc" stroke-width="3" stroke-linecap="round" stroke-dasharray="${f1(circ * .2)} ${f1(circ * .8)}" opacity=".75"/></g>
<g class="sweep2"><circle r="${g.r + 3}" fill="none" stroke="#fff3c4" stroke-width="2" stroke-linecap="round" stroke-dasharray="${f1(circ * .08)} ${f1(circ * .92)}" opacity=".5"/></g></g>`;

/* ---------- Stil ---------- */
function style(anim) {
  if (!anim) return '';
  return `<style>
.tw{animation:twinkle 3s ease-in-out infinite alternate}
.ray{animation:ray 2.8s linear infinite}
.band{animation:band 2.6s linear infinite}
.burst{transform-box:fill-box;transform-origin:center;animation:pulse 4.5s ease-in-out infinite alternate}
.hz{animation:hz 3.5s ease-in-out infinite alternate}
.dots{animation:scroll 1.7s linear infinite}
.sweep{animation:spin 9s linear infinite}.sweep2{animation:spin 14s linear infinite reverse}
.gG{animation:spin 60s linear infinite}.gG2{animation:spin 84s linear infinite reverse}
.gL{animation:spin 96s linear infinite}.gR{animation:spin 118s linear infinite reverse}
.rb{animation:breathe 4s ease-in-out infinite alternate}
.lamp{animation:flicker 2.2s ease-in-out infinite alternate}
.larc{stroke-dasharray:300;animation:arcflow 5s ease-in-out infinite}
@keyframes twinkle{from{opacity:.15}to{opacity:1}}
@keyframes ray{from{stroke-dashoffset:160}to{stroke-dashoffset:0}}
@keyframes band{to{transform:translateY(240px)}}
@keyframes pulse{from{opacity:.62;transform:scale(1)}to{opacity:.95;transform:scale(1.06)}}
@keyframes hz{from{opacity:.5}to{opacity:.8}}
@keyframes scroll{to{transform:translateX(-26px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breathe{from{opacity:.55}to{opacity:1}}
@keyframes flicker{from{opacity:.45}to{opacity:1}}
@keyframes arcflow{0%{opacity:0;stroke-dashoffset:300}35%{opacity:1}65%{opacity:1}100%{opacity:0;stroke-dashoffset:0}}
</style>`;
}

function svg(anim) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" aria-hidden="true">
<!-- Üretildi: tools/build-cover.mjs — elle düzenleme, betiği çalıştır. -->
<defs>
<linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b06"/><stop offset=".55" stop-color="#070604"/><stop offset="1" stop-color="#050403"/></linearGradient>
<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity=".35"/><stop offset=".35" stop-color="#3a2c0a" stop-opacity=".6"/><stop offset="1" stop-color="#050403"/></linearGradient>
<linearGradient id="gCorr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity=".95"/><stop offset=".22" stop-color="#f5d76e" stop-opacity=".7"/><stop offset=".6" stop-color="#b8891c" stop-opacity=".22"/><stop offset="1" stop-color="#b8891c" stop-opacity=".05"/></linearGradient>
<linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d0" stop-opacity="0"/><stop offset=".5" stop-color="#fff6d0" stop-opacity=".55"/><stop offset="1" stop-color="#fff6d0" stop-opacity="0"/></linearGradient>
<radialGradient id="gBurst"><stop offset="0" stop-color="#fff7dc"/><stop offset=".22" stop-color="#ffe27a" stop-opacity=".85"/><stop offset=".5" stop-color="#d4af37" stop-opacity=".3"/><stop offset=".78" stop-color="#d4af37" stop-opacity="0"/></radialGradient>
<radialGradient id="gGlobe" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#1e5aa4"/><stop offset=".55" stop-color="#0b264d"/><stop offset="1" stop-color="#05122a"/></radialGradient>
<linearGradient id="gLimb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6512"/></linearGradient>
<linearGradient id="gPillar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a160b"/><stop offset="1" stop-color="#050403"/></linearGradient>
<linearGradient id="gRib" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8891c"/><stop offset=".45" stop-color="#ffe27a"/><stop offset=".6" stop-color="#fff6c8"/><stop offset="1" stop-color="#c79a22"/></linearGradient>
<radialGradient id="gGlow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#d4af37"/></radialGradient>
<radialGradient id="gSoft"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".5" stop-color="#f5d76e" stop-opacity=".35"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>
<pattern id="pDots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="2.1" fill="#f5d76e" opacity=".8"/><circle cx="3" cy="4" r="1.1" fill="#9bc3ff" opacity=".7"/></pattern>
<clipPath id="cGlobe"><circle cx="${g.x}" cy="${g.y}" r="${g.r}"/></clipPath>
<clipPath id="cCorr"><polygon points="462,560 538,560 790,1000 210,1000"/></clipPath>
<clipPath id="cFloor"><rect x="0" y="560" width="1000" height="440"/></clipPath>
</defs>
${style(anim)}
<rect width="1000" height="1000" fill="url(#gSky)"/>
<g fill="none" stroke="#d4af37" stroke-width="1" opacity=".05">${grid}</g>
<ellipse class="hz" cx="500" cy="565" rx="560" ry="150" fill="url(#gBurst)" opacity=".7"/>
<rect x="0" y="560" width="1000" height="440" fill="url(#gFloor)"/>
<g clip-path="url(#cFloor)" fill="none" stroke="#d4af37" stroke-width="1.2" opacity=".14">${floorLines}</g>
<g clip-path="url(#cFloor)" fill="none" stroke="#fff3c4" stroke-width="2.2" stroke-dasharray="40 120" stroke-linecap="round">${rays}</g>
<polygon points="462,560 538,560 790,1000 210,1000" fill="url(#gCorr)" opacity=".9"/>
<g clip-path="url(#cCorr)"><g class="band">${bands}</g></g>
<path d="M462 560L210 1000" fill="none" stroke="#f5d76e" stroke-width="7" opacity=".14"/><path d="M462 560L210 1000" fill="none" stroke="#ffe680" stroke-width="1.6" opacity=".7"/>
<path d="M538 560L790 1000" fill="none" stroke="#f5d76e" stroke-width="7" opacity=".14"/><path d="M538 560L790 1000" fill="none" stroke="#ffe680" stroke-width="1.6" opacity=".7"/>
${pillar(false)}${pillar(true)}
<ellipse cx="500" cy="612" rx="200" ry="30" fill="url(#gBurst)" opacity=".5"/>
<circle class="burst" cx="${g.x}" cy="${g.y}" r="360" fill="url(#gBurst)" opacity=".9"/>
<g transform="translate(205 530) scale(1 1.25)"><g class="gL">${ribs(ribL, 'l')}</g></g>
<g transform="translate(795 530) scale(-1 1.25)"><g class="gR">${ribs(ribR, 'r')}</g></g>
<g transform="translate(${g.x} ${g.y})"><g class="gG">${ribbonLayers(ribG[0], { g1: .12, g2: .2, coreW: 1.4 })}</g><g class="gG2">${ribbonLayers(ribG[1], { g1: .12, g2: .2, coreW: 1.4 })}</g></g>
${globe}
<g class="sparks">${sparkSvg}</g>
</svg>
`;
}

mkdirSync(join(ROOT, 'img'), { recursive: true });
const live = svg(true);
const stat = svg(false).replace(/ style="animation-[^"]*"/g, '');
writeFileSync(join(ROOT, 'img/cover-scene.svg'), live);
writeFileSync(join(ROOT, 'img/cover-scene-static.svg'), stat);
console.log(`img/cover-scene.svg (${(live.length / 1024).toFixed(1)} KB), img/cover-scene-static.svg (${(stat.length / 1024).toFixed(1)} KB)`);
