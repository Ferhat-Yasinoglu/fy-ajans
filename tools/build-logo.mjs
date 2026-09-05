#!/usr/bin/env node
/* FY — logo üretici
   Kaynak: img/logo-master.png (1536×1024, tasarım görseli). Buradaki bütün koordinatlar o görselin piksel
   düzlemindedir; harf köşeleri, halka, ışın ve ağ düğümleri görselden ölçüldü.

   Çıktı (vektör, bağımlılık yok):
     img/logo-mark.svg   yalnız harfler (üst çubuk, alt bilgi, bağlantı sayfası, panel, 404) — canlı
     img/logo-hero.svg   tam sahne: halka, ışın, parçacıklar, zemin yansıması — canlı (ana sayfa hero)
     img/logo-mark-static.svg, logo-hero-static.svg   aynıları animasyonsuz; sayfalar <picture> ile
                         prefers-reduced-motion açıkken bunları seçer (SVG içindeki media sorgusu <img>'de her tarayıcıda çalışmaz)
     img/logo.svg        favicon: koyu yuvarlak kare + harfler (durağan)
   Çıktı (piksel, --raster ile; Playwright + Chromium gerekir):
     img/icon-180.png  icon-192.png  icon-512.png   logo.svg'den
     img/og.png                                      logo-master.png + slogan, 1200×630

   Marka kiti (--kit ile; Playwright + Chromium gerekir) → brand/ :
     profil fotoğrafı (halkalı, kare, koyu zemin), şeffaf PNG'ler, tek renk siyah/beyaz (SVG+PNG),
     yatay kilit (logo + "Yapay Zekâ Ajansı", TR/EN/DE; SVG+PNG). Liste brand/README.md'de.

   Kullanım (depo kökünde):   node tools/build-logo.mjs            yalnız SVG'ler
                              node tools/build-logo.mjs --raster   SVG'ler + PNG'ler
                              node tools/build-logo.mjs --kit      SVG'ler + brand/ marka kiti

   Animasyonlar CSS ile yazıldı (SMIL değil): <img> içinde de çalışır, prefers-reduced-motion'a uyar. */

import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RASTER = process.argv.includes('--raster');
const KIT = process.argv.includes('--kit');

/* ============================================================
   1) GEOMETRİ (kaynak görsel pikselleri)
   ============================================================ */
const F = { left: 455, stemR: 578, top: 243, bottom: 708, barBottom: 329, midTop: 400, midBottom: 500, midRight: 767, midBR: 708, corner: 16 };
const Y = { top: 243, armL: [701, 821], stemL: 855, stemR: 972, stemTop: 497, bottom: 708, armR: [1026, 1145], notch: [918, 403], diagEnd: [873, 628] };
const RING = { cx: 772, cy: 469, r: 380 };
const BEAM_X = 772;

// Sol kolun alt-sol kenarı üst çubuğun altıyla nerede kesişir
const slopeL = (Y.stemL - Y.armL[0]) / (Y.stemTop - Y.top);           // ≈ .606
const barMeetX = Math.round(Y.armL[0] + slopeL * (F.barBottom - Y.top)); // ≈ 753

// Tüm FY silüeti (saat yönünde, sol üst yuvarlak köşeden)
const SILHOUETTE = [
  `M${F.left + F.corner} ${F.top}`,
  `H${Y.armL[1]}`,                                  // üst kenar (F çubuğu + Y sol kol tepesi)
  `L${Y.notch[0]} ${Y.notch[1]}`,                   // sol kolun sağ kenarı → çentik
  `L${Y.armR[0]} ${Y.top}`,                         // sağ kolun iç kenarı
  `H${Y.armR[1]}`,                                  // sağ kol tepesi
  `L${Y.stemR} ${Y.stemTop}`,                       // sağ kolun dış kenarı → gövde sağ üst
  `V${Y.bottom}`,                                   // gövde sağ kenarı
  `H${Y.stemL}`,                                    // gövde altı
  `V${Y.stemTop}`,                                  // gövde sol kenarı
  `L${barMeetX} ${F.barBottom}`,                    // sol kolun alt-sol kenarı → üst çubuk altı
  `H${F.stemR}`,                                    // üst çubuk altı
  `V${F.midTop}`,                                   // F gövdesi sağ kenarı
  `H${F.midRight}`,                                 // orta çubuk üstü
  `L${F.midBR} ${F.midBottom}`,                     // orta çubuk eğik ucu
  `H${F.stemR}`,                                    // orta çubuk altı
  `V${F.bottom}`,                                   // F gövdesi sağ kenarı
  `H${F.left}`,                                     // F altı
  `V${F.top + F.corner}`,                           // F sol kenarı
  `A${F.corner} ${F.corner} 0 0 1 ${F.left + F.corner} ${F.top}`,
  'Z',
].join(' ');

// Yüzeyler
const FACE_BAR = `M${F.stemR} ${F.top} H${Y.armL[0]} L${barMeetX} ${F.barBottom} H${F.stemR} Z`;                      // F üst çubuğu (mat)
const BAND_L = `M${Y.armL[0]} ${Y.top} H${Y.armL[0] + 37} L${Y.stemL + 22} ${Y.stemTop} V${Y.bottom} H${Y.stemL} V${Y.stemTop} Z`; // sol kolun ışıklı yan yüzü + gövde şeridi
const FACE_ARM = `M${Y.armL[0] + 37} ${Y.top} H${Y.armL[1]} L${Y.stemR} ${Y.stemTop} L${Y.diagEnd[0]} ${Y.diagEnd[1]} L${Y.stemL + 22} ${Y.diagEnd[1]} L${Y.stemL + 22} ${Y.stemTop} Z`; // sol kol ön yüzü (gövdeye iner)
const FACE_MID = `M${F.stemR} ${F.midTop} H${F.midRight} L${F.midBR} ${F.midBottom} H${F.stemR} Z`;                    // orta çubuk
const PANEL_F = `M${F.left + 5} ${F.top + F.corner} A${F.corner - 5} ${F.corner - 5} 0 0 1 ${F.left + F.corner} ${F.top + 5} H${F.stemR - 5} V${F.bottom - 5} H${F.left + 5} Z`; // yüz paneli
const PANEL_NET = `M${Y.armR[0]} ${Y.top} H${Y.armR[1]} L${Y.stemR} ${Y.stemTop} L${Y.notch[0]} ${Y.notch[1]} Z M${Y.stemR} ${Y.stemTop} V${Y.bottom} H${Y.stemL + 22} V${Y.diagEnd[1]} Z`; // ağ paneli (papyon)
const PANEL_NET_INNER = `M${Y.armR[0] + 9} ${Y.top + 6} H${Y.armR[1] - 14} L${Y.stemR - 6} ${Y.stemTop - 12} L${Y.notch[0] + 6} ${Y.notch[1] + 2} Z M${Y.stemR - 6} ${Y.stemTop + 8} V${Y.bottom - 6} H${Y.stemL + 28} V${Y.diagEnd[1] + 4} Z`;

// Yüz: sağa bakan profil (panel içinde)
const HEAD_PARTS = [
  `M${F.left + 5} 274`,
  'C 486 262, 528 280, 548 316',      // saç/alın kavisi
  'C 559 334, 566 350, 567 372',      // alın
  'L 566 396',
  'C 571 401, 573 407, 569 413',      // kaş
  'L 568 428',
  'C 575 440, 590 450, 592 457',      // burun
  'C 588 463, 580 466, 578 468',
  'L 580 474',
  'C 585 479, 585 486, 580 489',      // dudak
  'C 583 493, 582 498, 577 502',
  'C 573 508, 566 513, 559 515',      // çene
  'L 548 525',
  'L 541 547',                        // boyun
  `V${F.bottom - 5}`,
  `H${F.left + 5}`,
  'Z',
];
const HEAD = HEAD_PARTS.join(' ');
const HEAD_OPEN = HEAD_PARTS.slice(0, -3).join(' ');   // kapanış kenarları olmadan: yalnız profil çizgisi (tek renk kontur)
const HEADBAND = 'M 468 292 C 500 292, 526 316, 538 344';
const EAR = { cx: 474, cy: 424, rOuter: 28, rInner: 17 };
const EYE = { cx: 556, cy: 415 };
// Devre izleri (panel içi): [x,y] kırık çizgi noktaları; düğümler ayrı
const TRACES = [
  [[497, 300], [497, 344]],
  [[474, 452], [474, 540], [484, 552], [484, 700]],
  [[502, 431], [516, 431], [516, 560], [510, 566], [510, 700]],
  [[548, 528], [541, 547]],
  [[541, 547], [541, 700]],
  [[556, 517], [556, 545], [563, 553], [563, 640], [556, 648], [556, 700]],
];
const TRACE_NODES = [[497, 322], [484, 557], [477, 617], [510, 690], [563, 600], [556, 686]];

// Ağ düğümleri (sağ kol + gövde paneli) ve kenarlar
const NODES = [
  [1093, 257], [1011, 269], [1028, 287], [1062, 324], [995, 335], [954, 351], [1029, 357], [963, 379], [940, 417], [982, 429],
  [936, 536], [898, 604], [961, 609], [923, 637], [897, 657], [943, 678],
  [1136, 251], [1035, 251], [966, 700], [880, 700], [880, 636],
];
const NODE_R = [5, 4, 5, 5, 3, 5, 5, 5, 3, 5, 5, 5, 6, 3.5, 4.5, 5.5, 3, 3, 3, 3, 3];
const EDGES = [[0, 2], [0, 3], [2, 3], [1, 2], [2, 6], [3, 6], [1, 4], [4, 5], [4, 6], [5, 7], [6, 7], [6, 9], [7, 9], [7, 8], [8, 9], [3, 9], [0, 16], [16, 3], [17, 1], [17, 2],
  [9, 10], [10, 12], [10, 11], [11, 12], [11, 13], [12, 13], [13, 14], [13, 15], [12, 15], [14, 15], [15, 18], [14, 19], [11, 20], [20, 14], [12, 18], [10, 13]];

// Hero parçacıkları: [x, y, tür(d=nokta,k=kare,c=çizgi), boyut, süre, gecikme]
const PARTICLES = [
  [346, 300, 'c', 150, 7, 0], [346, 553, 'c', 56, 6, 2.1], [420, 226, 'c', 24, 5, 1.2], [1090, 180, 'c', 100, 8, .6], [1210, 570, 'c', 240, 9, 3],
  [1190, 318, 'k', 11, 6, 1.5], [1190, 581, 'k', 12, 7, 2.6], [420, 130, 'k', 9, 6, .3], [1000, 130, 'd', 4, 5, 1.8], [952, 268, 'd', 7, 6, .9],
  [560, 130, 'd', 3, 5, 2.4], [1180, 120, 'd', 3, 6, 3.3], [335, 470, 'd', 5, 7, 1.1], [1245, 420, 'd', 4, 6, .2], [580, 780, 'd', 3, 5, 2.9],
  [1075, 665, 'd', 4, 6, 1.7], [390, 640, 'd', 3, 6, .5], [1150, 500, 'd', 3, 5, 3.6],
];

/* ============================================================
   2) SVG PARÇALARI
   ============================================================ */
const GOLD = { hi: '#fff3c4', bright: '#f5d76e', mid: '#d4af37', deep: '#a9821e', dark: '#5a4210', ink: '#0b0904' };

function defs(prefix, { hero = false } = {}) {
  const p = prefix;
  return `
  <defs>
    <linearGradient id="${p}gFace" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b08c2e"/><stop offset=".45" stop-color="#77591a"/><stop offset="1" stop-color="#3f2e0c"/>
    </linearGradient>
    <linearGradient id="${p}gArm" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#f6d878"/><stop offset=".5" stop-color="#d0a53a"/><stop offset="1" stop-color="#8d6c1d"/>
    </linearGradient>
    <linearGradient id="${p}gBand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6d2"/><stop offset=".35" stop-color="#f6d772"/><stop offset="1" stop-color="#d9b23f"/>
    </linearGradient>
    <linearGradient id="${p}gMid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4d36c"/><stop offset=".55" stop-color="#b58f2b"/><stop offset="1" stop-color="#6d5214"/>
    </linearGradient>
    <linearGradient id="${p}gPanel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2110"/><stop offset=".5" stop-color="#171209"/><stop offset="1" stop-color="#0d0a05"/>
    </linearGradient>
    <linearGradient id="${p}gTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff8dc"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${p}gSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${p}gHaze" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#e2b64a" stop-opacity=".5"/><stop offset="1" stop-color="#e2b64a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}gEye" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffcf3f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}gNode" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fffbe8"/><stop offset=".55" stop-color="#ffe07a"/><stop offset="1" stop-color="#e9b93a"/>
    </radialGradient>
    <filter id="${p}glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="${p}glowS" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${p}grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .6  0 0 0 .2 0" result="tint"/>
      <feComposite in="tint" in2="SourceGraphic" operator="in" result="noise"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="noise"/></feMerge>
    </filter>
    <clipPath id="${p}cLetters"><path d="${SILHOUETTE}"/></clipPath>
    <clipPath id="${p}cNet"><path d="${PANEL_NET_INNER}"/></clipPath>
    <clipPath id="${p}cPanel"><path d="${PANEL_F}"/><rect x="${F.stemR - 6}" y="${F.midTop - 4}" width="24" height="${F.midBottom - F.midTop + 8}"/></clipPath>
    ${hero ? `
    <radialGradient id="${p}gPlate" cx=".5" cy=".46" r=".52">
      <stop offset="0" stop-color="#1c160a"/><stop offset=".55" stop-color="#0e0b05"/><stop offset="1" stop-color="#070604" stop-opacity=".92"/>
    </radialGradient>
    <linearGradient id="${p}gBeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe8a3" stop-opacity="0"/><stop offset=".6" stop-color="#ffe8a3" stop-opacity=".55"/><stop offset="1" stop-color="#fff5cf"/>
    </linearGradient>
    <linearGradient id="${p}gFloorLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f5d76e" stop-opacity="0"/><stop offset=".5" stop-color="#fff2c0" stop-opacity=".9"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${p}gReflect" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/>
    </linearGradient>
    <mask id="${p}mReflect"><rect x="${F.left - 40}" y="${F.bottom - 150}" width="${Y.stemR - F.left + 80}" height="150" fill="url(#${p}gReflect)"/></mask>
    <filter id="${p}blurR" x="-10%" y="-10%" width="120%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
    <filter id="${p}glowXL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
` : ''}
  </defs>`;
}

// Ortak stil: harf animasyonları. `anim=false` favicon için durağan.
function style(prefix, { anim = true, hero = false } = {}) {
  const p = prefix;
  if (!anim) return '';
  return `
  <style>
    .${p}sheen { animation: ${p}sheen 7s cubic-bezier(.4,0,.2,1) infinite; }
    @keyframes ${p}sheen { 0% { transform: translateX(-560px); } 55%, 100% { transform: translateX(900px); } }
    .${p}nd { transform-box: fill-box; transform-origin: center; animation: ${p}tw 3.2s ease-in-out infinite; }
    @keyframes ${p}tw { 0%, 100% { opacity: .55; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.25); } }
    .${p}pk { stroke-dasharray: 7 93; animation: ${p}pk 4s linear infinite; }
    @keyframes ${p}pk { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
    .${p}eye { animation: ${p}eye 3.6s ease-in-out infinite; }
    @keyframes ${p}eye { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
    .${p}ear { transform-box: fill-box; transform-origin: center; animation: ${p}spin 9s linear infinite; }
    @keyframes ${p}spin { to { transform: rotate(360deg); } }
    .${p}tr { stroke-dasharray: 10 90; animation: ${p}tr 3.4s linear infinite; }
    @keyframes ${p}tr { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
    .${p}gl { animation: ${p}gl 5s ease-in-out infinite; }
    @keyframes ${p}gl { 0%, 100% { opacity: .55; } 50% { opacity: .95; } }
    ${hero ? `
    .${p}arc { transform-box: view-box; transform-origin: ${RING.cx}px ${RING.cy}px; animation: ${p}spin 14s linear infinite; }
    .${p}arc2 { transform-box: view-box; transform-origin: ${RING.cx}px ${RING.cy}px; animation: ${p}spinR 23s linear infinite; }
    @keyframes ${p}spinR { to { transform: rotate(-360deg); } }
    .${p}ring { animation: ${p}ring 6s ease-in-out infinite; }
    @keyframes ${p}ring { 0%, 100% { opacity: .55; } 50% { opacity: .9; } }
    .${p}beam { animation: ${p}beam 4.5s ease-in-out infinite; }
    @keyframes ${p}beam { 0%, 100% { opacity: .55; } 40% { opacity: 1; } 60% { opacity: .7; } }
    .${p}drop { animation: ${p}drop 4.5s cubic-bezier(.5,0,.8,.4) infinite; }
    @keyframes ${p}drop { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(150px); opacity: 0; } }
    .${p}pt { animation: ${p}pt var(--d, 6s) ease-in-out var(--dl, 0s) infinite; }
    @keyframes ${p}pt { 0%, 100% { transform: translateY(0); opacity: .35; } 50% { transform: translateY(-16px); opacity: 1; } }
    .${p}ln { animation: ${p}ln var(--d, 6s) ease-in-out var(--dl, 0s) infinite; }
    @keyframes ${p}ln { 0%, 100% { opacity: .25; } 50% { opacity: .8; } }
    .${p}floor { animation: ${p}floor 5s ease-in-out infinite; }
    @keyframes ${p}floor { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
    .${p}refl { animation: ${p}refl 7s ease-in-out infinite; }
    @keyframes ${p}refl { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
    .${p}float { animation: ${p}float 6s ease-in-out infinite; }
    @keyframes ${p}float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }` : ''}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>`;
}

// Harfler: id'li grup, yansımada <use> ile yeniden kullanılır
function letters(prefix, { anim = true, detail = true } = {}) {
  const p = prefix;
  const nodesSvg = NODES.map(([x, y], i) => {
    const r = NODE_R[i];
    return `<circle class="${anim ? p + 'nd' : ''}" style="animation-delay:${(-(i * .37) % 3.2).toFixed(2)}s" cx="${x}" cy="${y}" r="${r}" fill="url(#${p}gNode)"/>`;
  }).join('');
  const nodeGlow = NODES.filter((_, i) => NODE_R[i] >= 5).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#ffd966" opacity=".55"/>`).join('');
  const edgesSvg = EDGES.map(([a, b]) => `<line x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('');
  const packets = anim ? [[0, 3], [2, 6], [6, 9], [10, 12], [13, 15], [4, 5], [9, 10]].map(([a, b], i) =>
    `<line class="${p}pk" pathLength="100" style="animation-delay:${(-i * .6).toFixed(1)}s" x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('') : '';
  const tracesSvg = TRACES.map(pts => `<polyline points="${pts.map(q => q.join(',')).join(' ')}"/>`).join('');
  const tracePulse = anim ? TRACES.slice(1, 4).map((pts, i) => `<polyline class="${p}tr" pathLength="100" style="animation-delay:${(-i * 1.1).toFixed(1)}s" points="${pts.map(q => q.join(',')).join(' ')}"/>`).join('') : '';
  const traceNodes = TRACE_NODES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#f9dc7a"/>`).join('');

  return `
  <g id="${p}letters">
    <!-- arka parıltı -->
    <path d="${SILHOUETTE}" fill="none" stroke="${GOLD.mid}" stroke-width="10" opacity=".55" filter="url(#${p}glow)"/>
    <!-- yüzeyler -->
    <g filter="url(#${p}grain)">
      <path d="${FACE_BAR}" fill="url(#${p}gFace)"/>
      <path d="${FACE_ARM}" fill="url(#${p}gArm)"/>
      <path d="${BAND_L}" fill="url(#${p}gBand)"/>
      <path d="${FACE_MID}" fill="url(#${p}gMid)"/>
      <path d="M${Y.armL[1] - 16} ${Y.top} H${Y.armL[1]} L${Y.stemR} ${Y.stemTop} H${Y.stemR - 14} Z" fill="url(#${p}gBand)" opacity=".55"/>
    </g>
    <!-- üst yüzey ışığı -->
    <g clip-path="url(#${p}cLetters)">
      <rect x="${F.left}" y="${F.top}" width="${Y.armR[1] - F.left}" height="14" fill="url(#${p}gTop)" opacity=".9"/>
      <rect x="${F.stemR}" y="${F.midTop}" width="${F.midRight - F.stemR}" height="7" fill="url(#${p}gTop)" opacity=".7"/>
    </g>
    <!-- F gövdesi: yapay zekâ yüzü paneli -->
    <path d="${PANEL_F}" fill="url(#${p}gPanel)"/>
    <g clip-path="url(#${p}cPanel)">
      <ellipse cx="588" cy="430" rx="52" ry="150" fill="url(#${p}gHaze)"/>
      <path d="${HEAD}" fill="none" stroke="#f5d76e" stroke-width="7" stroke-linejoin="round" opacity=".7" filter="url(#${p}glowS)"/>
      <path d="${HEAD}" fill="#030201"/>
      <path d="${HEAD}" fill="none" stroke="#ffe9a8" stroke-width="3.2" stroke-linejoin="round"/>
      ${detail ? `
      <path d="${HEADBAND}" fill="none" stroke="#f3d475" stroke-width="3" stroke-linecap="round"/>
      <path d="M 462 312 C 490 310, 514 330, 527 356" fill="none" stroke="#c9a544" stroke-width="2" stroke-linecap="round"/>
      <path d="M 462 336 C 482 336, 502 350, 512 372" fill="none" stroke="#c9a544" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rOuter}" fill="none" stroke="#e9c453" stroke-width="3.5"/>
      <circle class="${anim ? p + 'ear' : ''}" cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rOuter}" fill="none" stroke="#fff1bd" stroke-width="4" stroke-dasharray="26 150" stroke-linecap="round"/>
      <circle cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rInner}" fill="none" stroke="#f5d76e" stroke-width="5"/>
      <g fill="none" stroke="#d9b64a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${tracesSvg}</g>
      <g fill="none" stroke="#fff4c8" stroke-width="2.6" stroke-linecap="round">${tracePulse}</g>
      ${traceNodes}` : ''}
      <circle class="${anim ? p + 'eye' : ''}" cx="${EYE.cx}" cy="${EYE.cy}" r="9" fill="url(#${p}gEye)"/>
      <ellipse cx="${EYE.cx}" cy="${EYE.cy}" rx="5" ry="2.6" fill="#fffbea"/>
    </g>
    <!-- Y sağ kolu: ağ paneli -->
    <path d="${PANEL_NET}" fill="url(#${p}gPanel)"/>
    <g clip-path="url(#${p}cNet)">
      <g stroke="#e3bd52" stroke-width="1.4" opacity=".9">${edgesSvg}</g>
      <g stroke="#fff4c8" stroke-width="2.6" stroke-linecap="round">${packets}</g>
      <g filter="url(#${p}glowS)">${nodeGlow}</g>
      ${nodesSvg}
    </g>
    <!-- kenarlar -->
    <path d="${PANEL_NET}" fill="none" stroke="#ffe9a8" stroke-width="3" stroke-linejoin="round"/>
    <path d="${PANEL_F}" fill="none" stroke="#f0cd62" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/>
    <path d="${SILHOUETTE}" fill="none" stroke="#fff0b8" stroke-width="3" stroke-linejoin="round"/>
    ${anim ? `<!-- gezen ışık: eğiklik üst grupta, animasyon rect'te (CSS transform animasyonu öznitelik transform'unu ezer) -->
    <g clip-path="url(#${p}cLetters)"><g transform="skewX(-22)">
      <rect class="${p}sheen" x="${F.left}" y="${F.top - 20}" width="220" height="${F.bottom - F.top + 40}" fill="url(#${p}gSheen)"/>
    </g></g>` : ''}
  </g>`;
}

/* ============================================================
   2b) MARKA KİTİ PARÇALARI
   ============================================================ */
// Profil fotoğrafı: halka merkezli kare sahne. Dairesel kırpmada Y'nin sağ üst köşesi de içeride kalır
// (merkezden 436 birim; yarım kenar 460).
function avatarSvg() { return heroSvg(false, [RING.cx - 460, RING.cy - 460, 920, 920]); }

// Tek renk: paneller boş, yüz ve ağ aynı renkte çizgi/dolgu. Baskı, kabartma, tek renkli zeminler için.
function monoSvg(c) {
  const [vx, vy, vw, vh] = MARK_VB;
  // clipPath çocukları yalnız şekil olabilir (<g> yok sayılır); yüz için kırpma clip-path özniteliğiyle şekle verilir.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VB.join(' ')}" role="img" aria-label="FY">
  <defs>
    <clipPath id="cp"><rect x="${F.left}" y="${F.top}" width="145" height="305"/></clipPath>
    <!-- paneller, baş ve profil çizgisi çevresindeki 5 birimlik boşluk harflerden oyulur -->
    <mask id="k">
      <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff"/>
      <path d="${PANEL_F}" fill="#000"/><path d="${PANEL_NET}" fill="#000"/>
      <path d="${HEAD}" fill="#000" clip-path="url(#cp)"/>
      <path d="${HEAD_OPEN}" fill="none" stroke="#000" stroke-width="10" stroke-linejoin="round" clip-path="url(#cp)"/>
    </mask>
    <clipPath id="cf"><rect x="${F.left}" y="${F.top}" width="145" height="${F.bottom - F.top}"/></clipPath>
    <clipPath id="cn"><path d="${PANEL_NET_INNER}"/></clipPath>
  </defs>
  <path d="${SILHOUETTE}" fill="${c}" mask="url(#k)"/>
  <path d="${SILHOUETTE}" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round" mask="url(#k)"/>
  <path d="${PANEL_NET}" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
  <g clip-path="url(#cf)">
    <path d="${HEAD_OPEN}" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round" stroke-linecap="butt" clip-path="url(#cp)"/>
    <circle cx="${EYE.cx}" cy="${EYE.cy}" r="7" fill="${c}"/>
    <path d="${HEADBAND}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rOuter}" fill="none" stroke="${c}" stroke-width="5"/>
    <circle cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rInner}" fill="none" stroke="${c}" stroke-width="6"/>
    <g fill="none" stroke="${c}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">${TRACES.map(pts => `<polyline points="${pts.map(q => q.join(',')).join(' ')}"/>`).join('')}</g>
    <g fill="${c}">${TRACE_NODES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5"/>`).join('')}</g>
  </g>
  <g clip-path="url(#cn)">
    <g stroke="${c}" stroke-width="2.4">${EDGES.map(([a, b]) => `<line x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('')}</g>
    <g fill="${c}">${NODES.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${NODE_R[i] + 1.5}"/>`).join('')}</g>
  </g>
</svg>
`;
}

// Yatay kilit: harf logosu + ayraç + iki satır metin. Yazı tipi dosyaya gömülür (kit SVG'leri tek başına açılsın).
const LOCKUP_TEXT = {
  tr: ['Yapay Zekâ Ajansı', 'Eğitim · Web Tasarım · Otomasyon'],
  en: ['AI Agency', 'Training · Web Design · Automation'],
  de: ['KI-Agentur', 'Schulung · Webdesign · Automatisierung'],
};
function lockupSvg(lang, textW, dark = false) {
  const [l1, l2] = LOCKUP_TEXT[lang];
  const fontCss = ['vazirmatn-latin', 'vazirmatn-latin-ext'].map(f => `@font-face{font-family:"V";font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, 'fonts', f + '.woff2')).toString('base64')}) format("woff2")}`).join('');
  const markH = 240, markW = Math.round(markH * MARK_VB[2] / MARK_VB[3]);
  const tx = markW + 62, W = Math.ceil(tx + textW + 24), H = 300;
  const fg = dark ? '#f4ecd8' : '#f4ecd8', muted = dark ? '#cbbf9c' : '#cbbf9c';
  const [vx, vy, vw, vh] = MARK_VB;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="FY — ${l1}">
  <style>${fontCss} text{font-family:"V",Vazirmatn,system-ui,sans-serif}</style>
  ${dark ? `<rect width="${W}" height="${H}" fill="#070604"/>` : ''}
  <svg x="0" y="${(H - markH) / 2}" width="${markW}" height="${markH}" viewBox="${vx} ${vy} ${vw} ${vh}">${defs('l')}${letters('l', { anim: false })}</svg>
  <line x1="${markW + 30}" y1="72" x2="${markW + 30}" y2="228" stroke="#d4af37" stroke-opacity=".55" stroke-width="2"/>
  <text x="${tx}" y="152" font-size="74" font-weight="800" fill="${fg}" letter-spacing="-.5">${l1}</text>
  <text x="${tx + 2}" y="206" font-size="26" font-weight="500" fill="${muted}" letter-spacing="1.2">${l2}</text>
</svg>
`;
}

/* ============================================================
   3) DOSYALAR
   ============================================================ */
const PAD = 24;
const MARK_VB = [F.left - PAD, F.top - PAD, Y.armR[1] - F.left + 2 * PAD, F.bottom - F.top + 2 * PAD]; // 431 219 738 513

function markSvg(anim = true) {
  const p = 'm';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VB.join(' ')}" role="img" aria-label="FY">${defs(p)}${style(p, { anim })}${letters(p, { anim })}
</svg>
`;
}

function faviconSvg() {
  const w = Y.armR[1] - F.left, h = F.bottom - F.top;
  const s = 80 / w, tx = (96 - w * s) / 2 - F.left * s, ty = (96 - h * s) / 2 - F.top * s;
  // Küçük boyutlar için sade: dolu altın harfler, paneller yarı saydam koyu, dış çizgi parlak
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="FY"><rect width="96" height="96" rx="20" fill="${GOLD.ink}"/>
  <defs>
    <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".3" stop-color="#f5d76e"/><stop offset=".65" stop-color="#d4af37"/><stop offset="1" stop-color="#9c7a1c"/></linearGradient>
    <clipPath id="fc"><path d="${SILHOUETTE}"/></clipPath>
  </defs>
  <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})">
    <path d="${SILHOUETTE}" fill="url(#fg)"/>
    <g clip-path="url(#fc)" opacity=".62">
      <path d="${PANEL_F}" fill="#0b0904"/>
      <path d="${HEAD}" fill="#0b0904" stroke="#f5d76e" stroke-width="4"/>
      <circle cx="${EAR.cx}" cy="${EAR.cy}" r="${EAR.rOuter}" fill="none" stroke="#f5d76e" stroke-width="7"/>
      <path d="${PANEL_NET}" fill="#0b0904"/>
      <g stroke="#f5d76e" stroke-width="3">${EDGES.map(([a, b]) => `<line x1="${NODES[a][0]}" y1="${NODES[a][1]}" x2="${NODES[b][0]}" y2="${NODES[b][1]}"/>`).join('')}</g>
      <g fill="#fff3c4">${NODES.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${NODE_R[i] + 3}"/>`).join('')}</g>
    </g>
    <circle cx="${EYE.cx}" cy="${EYE.cy}" r="9" fill="#fffbe6"/>
    <path d="${SILHOUETTE}" fill="none" stroke="#ffe9a8" stroke-width="8" stroke-linejoin="round"/>
  </g>
</svg>
`;
}

function heroSvg(anim = true, VB = [292, 30, 960, 880]) {
  const p = 'h';
  const circ = 2 * Math.PI * RING.r;
  const particles = PARTICLES.map(([x, y, t, s, d, dl]) => {
    const st = `style="--d:${d}s;--dl:${-dl}s"`;
    if (t === 'd') return `<circle class="${p}pt" ${st} cx="${x}" cy="${y}" r="${s}" fill="#f5d76e"/>`;
    if (t === 'k') return `<rect class="${p}pt" ${st} x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" fill="#d4af37"/>`;
    return `<g class="${p}ln" ${st}><line x1="${x}" y1="${y - s / 2}" x2="${x}" y2="${y + s / 2}" stroke="#e6c352" stroke-width="2"/><circle cx="${x}" cy="${y + s / 2}" r="4" fill="#f5d76e"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.join(' ')}" role="img" aria-label="FY">${defs(p, { hero: true })}${style(p, { hero: true, anim })}
  <!-- halka içi plaka -->
  <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="url(#${p}gPlate)"/>
  <!-- ışın -->
  <g class="${p}beam">
    <rect x="${BEAM_X - 1.5}" y="${VB[1]}" width="3" height="${F.top - VB[1]}" fill="url(#${p}gBeam)"/>
    <rect x="${BEAM_X - 6}" y="${VB[1]}" width="12" height="${F.top - VB[1]}" fill="url(#${p}gBeam)" opacity=".35" filter="url(#${p}glowS)"/>
    <circle cx="${BEAM_X}" cy="${RING.cy - RING.r}" r="12" fill="#fff4cf" opacity=".8" filter="url(#${p}glowS)"/>
    <circle cx="${BEAM_X}" cy="${RING.cy - RING.r}" r="4" fill="#fffdf2"/>
  </g>
  ${anim ? `<g class="${p}drop"><circle cx="${BEAM_X}" cy="${RING.cy - RING.r + 4}" r="5" fill="#fff9e0"/><circle cx="${BEAM_X}" cy="${RING.cy - RING.r + 4}" r="11" fill="#ffe9a3" opacity=".6" filter="url(#${p}glowS)"/></g>` : ''}
  <!-- halka -->
  <circle class="${p}ring" cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="#d9b544" stroke-width="3"/>
  <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="#d4af37" stroke-width="8" opacity=".28" filter="url(#${p}glow)"/>
  <circle class="${p}arc" cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="#fff3c6" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(circ * .13).toFixed(1)} ${(circ * .87).toFixed(1)}" filter="url(#${p}glowS)"/>
  <circle class="${p}arc2" cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="#ffe08a" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(circ * .05).toFixed(1)} ${(circ * .95).toFixed(1)}" opacity=".9"/>
  <!-- parçacıklar -->
  <g>${particles}</g>
  <!-- zemin -->
  <g class="${p}floor">
    <ellipse cx="${BEAM_X}" cy="${F.bottom + 6}" rx="300" ry="14" fill="#f5d76e" opacity=".5" filter="url(#${p}glowXL)"/>
    <rect x="${VB[0]}" y="${F.bottom + 4}" width="${VB[2]}" height="2.5" fill="url(#${p}gFloorLine)"/>
    <ellipse cx="${BEAM_X}" cy="${F.bottom + 60}" rx="420" ry="70" fill="#d4af37" opacity=".16" filter="url(#${p}glowXL)"/>
    <g stroke="#d4af37" stroke-opacity=".16" stroke-width="1">
      <line x1="${VB[0]}" y1="${F.bottom + 110}" x2="${VB[0] + VB[2]}" y2="${F.bottom + 110}"/>
      <line x1="${BEAM_X - 130}" y1="${F.bottom + 8}" x2="${VB[0]}" y2="${F.bottom + 190}"/>
      <line x1="${BEAM_X + 130}" y1="${F.bottom + 8}" x2="${VB[0] + VB[2]}" y2="${F.bottom + 190}"/>
      <line x1="${BEAM_X - 40}" y1="${F.bottom + 8}" x2="${BEAM_X - 130}" y2="${VB[1] + VB[3]}"/>
      <line x1="${BEAM_X + 40}" y1="${F.bottom + 8}" x2="${BEAM_X + 130}" y2="${VB[1] + VB[3]}"/>
    </g>
    <circle cx="${BEAM_X}" cy="${F.bottom + 6}" r="7" fill="#fffaea"/>
    <circle cx="${BEAM_X}" cy="${F.bottom + 6}" r="22" fill="#ffe9a3" opacity=".65" filter="url(#${p}glowS)"/>
  </g>
  <!-- harfler ve aynadaki yansımaları birlikte yüzer -->
  <g class="${p}float">
    <g class="${p}refl" mask="url(#${p}mReflect)" filter="url(#${p}blurR)" transform="matrix(1 0 0 -1 0 ${2 * F.bottom + 4})"><use href="#${p}letters"/></g>
    ${letters(p, { anim })}
  </g>
</svg>
`;
}

const out = (rel, s) => { writeFileSync(join(ROOT, rel), s); console.log(`${rel}  ${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`); };
out('img/logo-mark.svg', markSvg());
out('img/logo-hero.svg', heroSvg());
out('img/logo-mark-static.svg', markSvg(false));   // prefers-reduced-motion: <picture><source media=…> ile seçilir
out('img/logo-hero-static.svg', heroSvg(false));
out('img/logo.svg', faviconSvg());

/* ============================================================
   4) PİKSEL ÇIKTILARI (isteğe bağlı)
   ============================================================ */
if (RASTER) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.error('Playwright bulunamadı — PNG\'ler üretilmedi. Depo kökünde:  npm i --no-save playwright && npx playwright install chromium\n(global kurulum için NODE_PATH=<global node_modules> ile göster).'); process.exit(1); }
  const master = join(ROOT, 'img/logo-master.png');
  if (!existsSync(master)) { console.error('img/logo-master.png yok — og.png üretilmedi.'); process.exit(1); }
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const svgData = 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(join(ROOT, 'img/logo.svg'))).toString('base64');
  for (const size of [180, 192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:#070604"><img src="${svgData}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await page.screenshot({ path: join(ROOT, `img/icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
    console.log(`img/icon-${size}.png`);
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  // Yazı tipi file:// altından yalnızca aynı kökten yüklenir; sayfa geçici olarak depo köküne yazılır
  const tmp = join(ROOT, 'og-tmp.html');
  writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: V; src: url("fonts/vazirmatn-latin.woff2") format("woff2"); font-weight: 100 900; }
    body { margin: 0; width: 1200px; height: 630px; background: #000; position: relative; overflow: hidden; font-family: V, system-ui, sans-serif; }
    img { position: absolute; left: 50%; top: 0; height: 630px; transform: translateX(-50%); }
    .t { position: absolute; left: 0; right: 0; text-align: center; color: #f4ecd8; }
    .t1 { top: 500px; font-size: 44px; font-weight: 800; letter-spacing: -.01em; text-shadow: 0 2px 24px rgba(0,0,0,.9); }
    .t2 { top: 560px; font-size: 24px; color: #cbbf9c; text-shadow: 0 2px 16px rgba(0,0,0,.9); }
  </style></head><body>
    <img src="img/logo-master.png">
    <div class="t t1">Yapay Zekâ Ajansı</div>
    <div class="t t2">Eğitim · Web Tasarım · İşletme Akıllılaştırma</div>
  </body></html>`);
  try {
    await page.goto('file://' + tmp, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(ROOT, 'img/og.png') });
  } finally { unlinkSync(tmp); }
  console.log('img/og.png');
  await browser.close();
}

/* ============================================================
   5) MARKA KİTİ (isteğe bağlı)
   ============================================================ */
if (KIT) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.error('Playwright bulunamadı — kit üretilmedi. Depo kökünde:  npm i --no-save playwright && npx playwright install chromium'); process.exit(1); }
  const DIR = join(ROOT, 'brand');
  mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 2200, height: 1200 }, deviceScaleFactor: 1 });

  // Bir SVG dizgesini istenen genişlikte PNG'ye çevirir (transparent=true: zemin yok)
  async function png(svg, file, width, transparent) {
    const data = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#070604'}"><img id="i" src="${data}" style="display:block;width:${width}px;height:auto"></body></html>`);
    await page.waitForFunction(() => document.getElementById('i').complete && document.getElementById('i').naturalWidth > 0);
    const box = await page.evaluate(() => { const r = document.getElementById('i').getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) }; });
    await page.setViewportSize({ width: Math.max(box.width, 10), height: Math.max(box.height, 10) });
    await page.screenshot({ path: join(DIR, file), omitBackground: !!transparent, clip: box });
    console.log(`brand/${file}  ${box.width}×${box.height}`);
  }
  const svgOut = (file, svg) => { writeFileSync(join(DIR, file), svg); console.log(`brand/${file}`); };

  // 1) profil fotoğrafı (kare, koyu; platformlar daire kırpar)
  const avatar = avatarSvg();
  await png(avatar, 'fy-profil-1024.png', 1024, false);
  await png(avatar, 'fy-profil-512.png', 512, false);
  // 2) şeffaf harf logosu
  const mark = markSvg(false);
  for (const w of [2048, 1024, 512]) await png(mark, `fy-logo-seffaf-${w}.png`, w, true);
  // 3) tek renk
  for (const [name, c] of [['siyah', '#000000'], ['beyaz', '#ffffff']]) {
    const svg = monoSvg(c); svgOut(`fy-logo-${name}.svg`, svg);
    await png(svg, `fy-logo-${name}-1024.png`, 1024, true);
  }
  // 4) yatay kilit: önce metin genişliği ölçülür (gömülü yazı tipiyle), sonra viewBox tam sığdırılır
  for (const lang of Object.keys(LOCKUP_TEXT)) {
    const probe = lockupSvg(lang, 1200);
    await page.setContent(`<html><body style="margin:0">${probe.replace(/<svg /, '<svg id="s" style="width:2000px" ')}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const textW = await page.evaluate(() => Math.max(...[...document.querySelectorAll('#s > text')].map(t => t.getComputedTextLength())));
    const svg = lockupSvg(lang, Math.ceil(textW)); svgOut(`fy-yatay-${lang}.svg`, svg);
    await png(svg, `fy-yatay-${lang}-2048.png`, 2048, true);
    await png(lockupSvg(lang, Math.ceil(textW), true), `fy-yatay-${lang}-koyu-2048.png`, 2048, false);
  }
  await browser.close();
}
