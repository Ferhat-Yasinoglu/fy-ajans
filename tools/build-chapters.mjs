#!/usr/bin/env node
/* Bölüm kapakları — «Yapay Zekâ Yolculuğu» yedi bölümü için ışığı tek yönden gelen altın sahneler.
   Çıktılar: img/course/ch1..7.svg (canlı) ve img/course/ch1..7-static.svg (hareket azaltma için sabit).
   Kullanım: node tools/build-chapters.mjs

   SERİNİN ORTAK DİLİ (tools/lib/scene.mjs)
   · Işık yedi sahnede de sol üstten gelir ve sıcaktır (#ffe9a3): parlak kenarlar sola-yukarı bakar,
     gölgeler sağa-aşağı düşer. Zemin çizgisi (GY) her sahnede vardır; öznenin altında bir ışık havuzu
     ve sönümlenen bir yansıma bırakır.
   · Derinlik süzgeçsiz kurulur: hacimsel ışık konisi ince dilimlere bölünür (kenarı çan eğrisiyle söner),
     uzak katmanlar pus bantlarının altında açılır, ön katmanlar koyulaşır. <filter> hiç kullanılmaz —
     telefonda pahalıya mal oluyor.
   · Her sahnede tek özne var ve kadrajın ışık alan yerinde durur. Kart sitede yalnızca 279–348 piksel;
     bu yüzden ince detay değil, güçlü siluet aranır.

   KADRAJ SINIRLARI
   Üstte y<120 bandında İngilizce etiket, altta y>560'tan itibaren koyulaşan karartma ve bölüm etiketi var
   (.chapter__art::after). Özne bandı y≈150–560, ağırlık merkezi y≈360; zemin çizgisi karartmanın içinde kalır.

   Metin SVG'ye girmez (dört dile çevriliyor, HTML katmanında). Rastgelelik tohumlu: aynı betik hep aynı
   dosyaları üretir. Sabit sürüm <style> bloğu düşürülerek üretildiği için konumu yalnız CSS'ten gelen
   hiçbir öğe yoktur; öyle olması gerekenler (ışık paketleri gibi) sabit sürümde hiç üretilmez. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, f1, P } from './lib/gold.mjs';
import { defsFor, SCENE_CSS, shaft, mirror, haze, pool, motes, ridge, resetScene } from './lib/scene.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 800, H = 800;

/* ---------- 1 · UYANIŞ ----------
   Güneş ufkun üstünde duruyor, içinde açılan bir göz var; ışık suyun üstünde izleyiciye uzanan bir yol bırakıyor. */
function ch1(R, anim) {
  const CX = 344, CY = 394, SR = 134, HY = 528;
  let ticks = '';
  for (let i = 0; i < 9; i++) {
    const a = -178 + i * 22.25;
    const [x1, y1] = P(SR + 36, a), [x2, y2] = P(SR + 76, a);
    ticks += `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" style="animation-delay:-${f1(i * .34)}s"/>`;
  }
  const eye = `<g transform="translate(${CX} ${CY - 8})" fill="none" stroke="#3a2a06" stroke-width="8" stroke-linecap="round">
<path d="M-86 0Q0 -70 86 0"/><path d="M-86 0Q0 70 86 0"/>
<circle class="iris" r="30" fill="#160f05" stroke="#3a2a06" stroke-width="6"/>
<circle class="iris" r="13" fill="#ffe9a3" stroke="none"/>
<circle cx="-10" cy="-10" r="5.5" fill="#fff8e0" stroke="none" opacity=".9"/>
<path class="lid" d="M-86 0Q0 -70 86 0" stroke="#c99a20" stroke-width="12" opacity="0"/></g>`;
  return {
    defs: `<radialGradient id="sun"><stop offset="0" stop-color="#fff8e0"/><stop offset=".5" stop-color="#f5d76e"/><stop offset="1" stop-color="#c99a20"/></radialGradient>
<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1e07"/><stop offset=".55" stop-color="#120d05"/><stop offset="1" stop-color="#060503"/></linearGradient>
<clipPath id="above"><rect width="${W}" height="${HY}"/></clipPath>`,
    css: `.tick{animation:tick 4s ease-in-out infinite}
.iris{transform-box:fill-box;transform-origin:center;animation:iris 6s ease-in-out infinite}
.lid{animation:lid 6s ease-in-out infinite}
@keyframes tick{0%,100%{opacity:.28}50%{opacity:.95}}
@keyframes iris{0%,88%,100%{transform:scale(1)}94%{transform:scale(.74)}}
@keyframes lid{0%,88%,100%{opacity:0}92%{opacity:1}}`,
    svg: `<g clip-path="url(#above)">
${haze(342, 126, .12)}
${ridge([[0, 448], [128, 412], [286, 450], [470, 404], [640, 446], [800, 416]], 'url(#far)')}
${haze(436, 96, .09)}
${ridge([[0, 500], [170, 466], [360, 502], [540, 472], [700, 504], [800, 486]], 'url(#mid)')}
<g transform="translate(${CX} ${CY})">
<circle class="glow" r="${SR + 210}" fill="url(#halo)"/>
<g class="tick" fill="none" stroke="#fff3c4" stroke-width="4" stroke-linecap="round">${ticks}</g>
<circle r="${SR}" fill="url(#sun)"/>
<circle r="${SR}" fill="none" stroke="#fff8e0" stroke-width="2" opacity=".5"/>
</g>${eye}
</g>
<rect x="0" y="${HY}" width="${W}" height="${H - HY}" fill="url(#water)"/>
<path d="M0 ${HY}H${W}" stroke="#ffe9a3" stroke-width="2.5" opacity=".8"/>
${shaft(CX, HY - 8, CX - 176, CX + 206, H, 1, 22)}
${shaft(CX, HY - 8, CX - 74, CX + 88, H, .85, 14)}
<ellipse cx="${CX}" cy="${HY}" rx="190" ry="18" fill="url(#pool)"/>
${motes(R, 16, { x: 120, y: 170, w: 540, h: 320 })}`,
  };
}

/* ---------- 2 · FORMÜL ----------
   Beş plaka sırayla yanıyor, sağdaki çıktı elması masanın üstünde asılı duruyor ve altına havuz düşürüyor. */
function ch2(R, anim) {
  const PX = 264, PW = 292, PH = 52, GAP = 18, TOP = 216, GY = 622;
  let plates = '';
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * (PH + GAP), x = PX - PW / 2;
    plates += `<g class="pl" style="animation-delay:-${f1((5 - i) * .55)}s">` +
      `<path d="M${f1(x + 14)} ${f1(y + 12)}h${PW}v${PH}h-${PW}Z" fill="#050403" opacity=".55"/>` +
      `<rect x="${f1(x)}" y="${f1(y)}" width="${PW}" height="${PH}" rx="13" fill="#1c1307" stroke="url(#brass)" stroke-width="3"/>` +
      `<path d="M${f1(x + 13)} ${f1(y)}h${PW - 26}" stroke="#ffe9a3" stroke-width="1.6" opacity=".7"/>` +
      `<circle cx="${f1(x + 30)}" cy="${f1(y + PH / 2)}" r="7" fill="#ffe27a"/>` +
      `<rect x="${f1(x + 52)}" y="${f1(y + PH / 2 - 6)}" width="${f1(146 + (i % 3) * 36)}" height="12" rx="6" fill="#e9c552" opacity=".62"/></g>`;
  }
  let rails = '';
  for (let i = 0; i < 5; i++) {
    const y = TOP + i * (PH + GAP) + PH / 2;
    rails += `<path d="M${PX + PW / 2} ${f1(y)}H448Q470 ${f1(y)} 470 ${f1(y + (408 - y) * .16)}"/>`;
  }
  const gem = `<g class="out"><path d="M0 -88L76 0L0 88L-76 0Z" fill="url(#gemA)"/>
<path d="M0 -88L76 0L0 88Z" fill="#0b0803" opacity=".42"/>
<path d="M0 -88L-76 0L0 0Z" fill="#fff8e0" opacity=".28"/>
<path d="M0 -50L44 0L0 50L-44 0Z" fill="#150e04" opacity=".55"/>
<path d="M0 -27L23 0L0 27L-23 0Z" fill="#fff8e0"/></g>`;
  return {
    defs: `<linearGradient id="gemA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8e0"/><stop offset=".45" stop-color="#f5d76e"/><stop offset="1" stop-color="#b8891c"/></linearGradient>`,
    css: `.pl{animation:pl 5.5s ease-in-out infinite}
.out{transform-box:fill-box;transform-origin:center;animation:out 5.5s ease-in-out infinite}
.oh{transform-box:fill-box;transform-origin:center;animation:oh 5.5s ease-in-out infinite}
.flow{animation:flow 2.2s linear infinite}
@keyframes pl{0%,100%{opacity:.62}12%{opacity:1}40%{opacity:.62}}
@keyframes out{0%,62%,100%{transform:scale(1)}72%{transform:scale(1.13)}}
@keyframes oh{0%,62%,100%{opacity:.5}72%{opacity:1}}
@keyframes flow{to{stroke-dashoffset:-28}}`,
    svg: `${shaft(150, -180, 40, 700, GY, .8)}
<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#near)"/>
<path d="M0 ${GY}H${W}" stroke="#ffe9a3" stroke-width="2" opacity=".35"/>
${pool(612, GY, 196, 42)}
<g>${plates}</g>
<g fill="none" stroke="#e9c552" stroke-width="2.2" opacity=".55">${rails}</g>
<path d="M470 ${TOP + 26}V${f1(TOP + 4 * (PH + GAP) + 26)}" fill="none" stroke="#e9c552" stroke-width="2.4" opacity=".6"/>
<path class="flow" d="M470 408H540" fill="none" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 18"/>
<g transform="translate(612 408)"><circle class="oh" r="168" fill="url(#halo)"/>${gem}</g>
${mirror(`<g transform="translate(612 408)">${gem}</g>`, GY, .32, 140)}
${motes(R, 14, { x: 150, y: 180, w: 520, h: 330 })}`,
  };
}

/* ---------- 3 · AJAN ----------
   Çekirdek ve altı düğüm karanlıkta asılı bir takımyıldız; zeminde havuzu ve yansıması var. */
function ch3(R, anim) {
  const rnd = (a, b) => a + (b - a) * R();
  const CX = 400, CY = 388, RAD = 196, GY = 646;
  const nodes = [];
  for (let i = 0; i < 6; i++) { const [x, y] = P(RAD, -90 + i * 60); nodes.push([CX + x, CY + y * .86]); }
  const hex = a => Array.from({ length: 6 }, (_, i) => P(a, -90 + i * 60).map(f1).join(' ')).join('L');
  let links = '', pk = '', pkCss = '';
  nodes.forEach(([x, y], i) => {
    const d = `M${CX} ${CY}L${f1(x)} ${f1(y)}`, L = Math.hypot(x - CX, y - CY);
    const k = 74 / L, sx = CX + (x - CX) * k, sy = CY + (y - CY) * k;   // paket çekirdeğin kenarından başlar
    const dp = `M${f1(sx)} ${f1(sy)}L${f1(x)} ${f1(y)}`, LP = L - 74;
    links += `<path d="${d}"/>`;
    if (!anim) return;                     // paketlerin yeri animasyondan geliyor; sabit sürümde üretilmez
    pkCss += `@keyframes pk${i}{from{stroke-dashoffset:22}to{stroke-dashoffset:${f1(-LP)}}}.pk${i}{animation:pk${i} ${f1(rnd(2.6, 4.2))}s linear -${f1(rnd(0, 3))}s infinite}`;
    pk += `<path class="pk${i}" d="${dp}" stroke="#ffd766" stroke-width="7" stroke-opacity=".2" stroke-dasharray="22 ${f1(LP + 4)}"/>` +
      `<path class="pk${i}" d="${dp}" stroke="#fff8e0" stroke-width="2.6" stroke-dasharray="22 ${f1(LP + 4)}"/>`;
  });
  let ring = '';
  for (let i = 0; i < 6; i++) ring += `<path d="M${f1(nodes[i][0])} ${f1(nodes[i][1])}L${f1(nodes[(i + 1) % 6][0])} ${f1(nodes[(i + 1) % 6][1])}"/>`;
  const nodeSvg = nodes.map(([x, y], i) => `<g transform="translate(${f1(x)} ${f1(y)})">` +
    `<circle r="58" fill="url(#soft)" opacity=".45"/>` +
    `<g class="nd" style="animation-delay:-${f1(i * .8)}s"><path d="M${hex(37)}Z" fill="#1c1307" stroke="url(#brass)" stroke-width="4"/>` +
    `<path d="M${P(37, -150).map(f1).join(' ')}L${P(37, -90).map(f1).join(' ')}L${P(37, -30).map(f1).join(' ')}" fill="none" stroke="#ffe9a3" stroke-width="2.6" opacity=".8"/></g></g>`).join('');
  const core = `<g transform="translate(${CX} ${CY})"><circle r="106" fill="url(#soft)" opacity=".45"/>
<g class="core"><path d="M${hex(68)}Z" fill="#160f05" stroke="url(#brass)" stroke-width="5.5"/>
<path d="M${P(68, -150).map(f1).join(' ')}L${P(68, -90).map(f1).join(' ')}L${P(68, -30).map(f1).join(' ')}" fill="none" stroke="#ffe9a3" stroke-width="3.4" opacity=".85"/></g></g>`;
  const web = `<g fill="none" stroke="#e9c552" stroke-width="2.4" stroke-opacity=".5">${links}</g>
<g fill="none" stroke="#e2bd4a" stroke-width="1.6" stroke-opacity=".22" stroke-dasharray="4 12">${ring}</g>
${nodeSvg}${core}`;
  return {
    defs: '',
    css: `.nd{transform-box:fill-box;transform-origin:center;animation:nd 4.8s ease-in-out infinite}
.core{transform-box:fill-box;transform-origin:center;animation:core 3.6s ease-in-out infinite alternate}
${pkCss}
@keyframes nd{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
@keyframes core{from{transform:scale(.96)}to{transform:scale(1.07)}}`,
    svg: `${shaft(160, -200, 60, 720, GY, .75)}
<g transform="translate(${CX} ${CY})"><circle class="glow" r="286" fill="url(#halo)"/></g>
<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#near)"/>
<path d="M0 ${GY}H${W}" stroke="#ffe9a3" stroke-width="2" opacity=".3"/>
${pool(CX, GY, 256, 48)}
${mirror(web, GY, .26, 130)}
${web}
<g fill="none" stroke-linecap="round">${pk}</g>
${motes(R, 16, { x: 130, y: 170, w: 540, h: 380 })}`,
  };
}

/* ---------- 4 · ATÖLYE ----------
   Karanlık odada masanın üstünde duran geniş bir ekran; kendi ışığını masaya döküyor. */
function ch4(R, anim) {
  const X = 132, Y = 202, WW = 536, HH = 342, BAR = 46, GY = 628;
  const lines = [[26, 206], [26, 292], [54, 246], [54, 176], [26, 322], [54, 214]];
  let code = '';
  lines.forEach(([ind, len], i) => {
    const y = Y + BAR + 40 + i * 40;
    code += `<rect class="ln" x="${X + 26 + ind}" y="${f1(y)}" width="${len}" height="13" rx="6.5" fill="${i % 3 === 0 ? '#ffe27a' : '#e9c552'}" opacity="${i % 3 === 0 ? '.95' : '.62'}" style="animation-delay:-${f1(6 - i * .45)}s"/>`;
  });
  const cy = Y + BAR + 40 + lines.length * 40;
  const screen = `<rect x="${X}" y="${Y}" width="${WW}" height="${HH}" rx="22" fill="#0d0904" stroke="url(#brass)" stroke-width="4.4"/>
<path d="M${X + 22} ${Y}h${WW - 44}" stroke="#ffe9a3" stroke-width="2" opacity=".75"/>
<rect x="${X + 12}" y="${Y + 12}" width="${WW - 24}" height="${HH - 24}" rx="14" fill="url(#glass)"/>
<path d="M${X + 12} ${Y + BAR}h${WW - 24}" stroke="#e9c552" stroke-width="2" opacity=".4"/>
<circle cx="${X + 40}" cy="${Y + BAR / 2 + 4}" r="7" fill="#8c6a14"/><circle cx="${X + 66}" cy="${Y + BAR / 2 + 4}" r="7" fill="#c99a20"/><circle cx="${X + 92}" cy="${Y + BAR / 2 + 4}" r="7" fill="#ffe27a"/>
<rect x="${X + WW / 2 - 56}" y="${Y + BAR / 2 - 3}" width="112" height="13" rx="6.5" fill="#e9c552" opacity=".26"/>
${code}
<rect class="cur" x="${X + 26}" y="${f1(cy)}" width="17" height="15" rx="3" fill="#fff8e0"/>`;
  const stand = `<path d="M368 ${Y + HH}h64l16 52h-96Z" fill="url(#brass)" opacity=".8"/><path d="M320 ${GY - 8}h160v12H320Z" fill="#241a06"/>`;
  return {
    defs: `<linearGradient id="glass" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#241a06"/><stop offset=".5" stop-color="#120d05"/><stop offset="1" stop-color="#0b0803"/></linearGradient>
<linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a" stop-opacity=".34"/><stop offset=".6" stop-color="#ffe27a" stop-opacity=".08"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></linearGradient>`,
    css: `.ln{transform-box:fill-box;transform-origin:left center;animation:ln 6s ease-out infinite}
.cur{animation:cur 1.1s steps(1) infinite}
@keyframes ln{0%{transform:scaleX(0)}10%{transform:scaleX(1)}100%{transform:scaleX(1)}}
@keyframes cur{0%,50%{opacity:1}51%,100%{opacity:.1}}`,
    svg: `${shaft(120, -220, 20, 660, GY, .7)}
<g transform="translate(400 ${Y + HH / 2})"><circle class="glow" r="316" fill="url(#halo)"/></g>
<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#near)"/>
<path d="M0 ${GY}H${W}" stroke="#ffe9a3" stroke-width="2" opacity=".4"/>
<path d="M${X + 20} ${GY}L40 ${H}H760L${X + WW - 20} ${GY}Z" fill="url(#spill)"/>
${mirror(screen + stand, GY, .22, 120)}
<g>${stand}${screen}</g>
${motes(R, 14, { x: 150, y: 170, w: 500, h: 300 })}`,
  };
}

/* ---------- 5 · LABORATUVAR ----------
   Tezgâhın üstünde tek bir şişe; huzme sol üstten iniyor, cam sol kenarından ışık alıyor. */
function ch5(R, anim) {
  const rnd = (a, b) => a + (b - a) * R();
  const GY = 636;
  const body = 'M352 196h96v132l122 236q20 38-22 38H252q-42 0-22-38l122-236Z';
  let bub = '';
  for (let i = 0; i < 8; i++) {
    const dur = rnd(3.4, 6);
    bub += `<circle class="bub" cx="${f1(312 + ((i * 3) % 8) * 24 + rnd(0, 16))}" cy="${f1(478 + ((i * 5) % 4) * 30 + rnd(0, 16))}" r="${f1(rnd(5, 11))}" style="animation-duration:${f1(dur)}s;animation-delay:-${f1(rnd(0, dur))}s"/>`;
  }
  const mod = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="#150e04" stroke-width="4">`;
  const glass = `<path d="${body}" fill="#0b0803" opacity=".55"/>
<g clip-path="url(#inside)">
<path d="M232 470q56-17 112 0t112 0t112 0t112 0V680H232Z" fill="url(#liq)"/>
<path class="wave" d="M232 470q56-17 112 0t112 0t112 0t112 0v24H232Z" fill="#fff3c4" opacity=".4"/>
<g fill="#fff3c4" opacity=".7">${bub}</g>
<g opacity=".85">
${mod(330, 512)}<rect x="-28" y="-22" width="56" height="44" rx="7"/><path d="M-28 -7h56"/></g>
${mod(400, 556)}<rect x="-28" y="-22" width="56" height="44" rx="7"/><path d="M-11 -22v44M11 -22v44M-28 0h56"/></g>
${mod(470, 512)}<circle r="11"/><circle cx="-26" cy="19" r="7.5"/><circle cx="26" cy="19" r="7.5"/><path d="M-7 7l-13 6M7 7l13 6"/></g>
</g></g>
<path d="${body}" fill="none" stroke="url(#brass)" stroke-width="6" stroke-linejoin="round"/>
<path d="M352 200v128L246 534" fill="none" stroke="#ffe9a3" stroke-width="6" stroke-linecap="round" opacity=".8"/>
<path d="M336 196h128" stroke="#fff3c4" stroke-width="11" stroke-linecap="round"/>`;
  return {
    defs: `<linearGradient id="liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#a8801a"/></linearGradient>
<clipPath id="inside"><path d="${body}"/></clipPath>`,
    css: `.bub{animation-name:bub;animation-timing-function:ease-in;animation-iteration-count:infinite}
.wave{animation:wave 5s ease-in-out infinite alternate}
@keyframes bub{0%{transform:translateY(28px);opacity:0}14%{opacity:.8}100%{transform:translateY(-140px);opacity:0}}
@keyframes wave{from{transform:translateX(-13px)}to{transform:translateX(13px)}}`,
    svg: `${shaft(190, -150, 40, 620, GY, .95)}
<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="url(#near)"/>
<path d="M0 ${GY}H${W}" stroke="#ffe9a3" stroke-width="2" opacity=".45"/>
${pool(400, GY, 236, 44)}
${mirror(glass, GY, .34, 150)}
<g>${glass}</g>
${motes(R, 18, { x: 170, y: 160, w: 460, h: 400 })}`,
  };
}

/* ---------- 6 · VİTRİN ----------
   Vitrin kaidesinde duran dikey ekran; kendi ışığı yukarı doğru açılıyor, içinden beğeniler yükseliyor. */
function ch6(R, anim) {
  const rnd = (a, b) => a + (b - a) * R();
  const PX = 400, PT = 214, PB = 596, PW = 196, GY = 620;
  let bars = '';
  for (let i = 0; i < 9; i++) {
    const h = 26 + (i % 3) * 12 + (i % 2) * 8;
    bars += `<rect class="bar" x="${f1(PX - 88 + i * 22)}" y="${f1(PB - 74 - h)}" width="11" height="${f1(h)}" rx="5.5" fill="#ffe27a" style="animation-duration:${f1(rnd(.9, 1.7))}s;animation-delay:-${f1(rnd(0, 1.5))}s"/>`;
  }
  let rise = '';                                   // sağ-sol dönüşümlü, ayrı yükseklik kuşaklarında: sabit sürümde de çakışmazlar
  for (let i = 0; i < 6; i++) {
    const dur = rnd(4.5, 7.5);
    rise += `<g transform="translate(${f1(PX + (i % 2 ? 1 : -1) * (176 + rnd(0, 76)))} ${f1(248 + i * 42 + rnd(0, 22))})"><path class="rise" d="M0 0c-9-12-28-8-28 7 0 13 18 22 28 31 9-9 28-18 28-31 0-15-19-19-28-7Z" fill="#ffe27a" style="animation-duration:${f1(dur)}s;animation-delay:-${f1(rnd(0, dur))}s"/></g>`;
  }
  const phone = `<rect x="${PX - PW / 2}" y="${PT}" width="${PW}" height="${PB - PT}" rx="34" fill="#0b0803" stroke="url(#brass)" stroke-width="4"/>
<path d="M${PX - PW / 2 + 28} ${PT}h${PW - 56}" stroke="#ffe9a3" stroke-width="2" opacity=".8"/>
<rect x="${PX - PW / 2 + 11}" y="${PT + 11}" width="${PW - 22}" height="${PB - PT - 22}" rx="25" fill="url(#screen)"/>
<rect x="${PX - 26}" y="${PT + 20}" width="52" height="8" rx="4" fill="#3a2a06"/>
<circle cx="${PX}" cy="${PT + 156}" r="76" fill="url(#soft)" opacity=".4"/>
<g class="play"><circle cx="${PX}" cy="${PT + 156}" r="50" fill="#150e04" stroke="url(#brass)" stroke-width="4"/>
<path d="M${PX - 16} ${PT + 130}l42 26-42 26Z" fill="#ffe27a"/></g>
${bars}`;
  const plinth = `<path d="M${PX - 152} ${GY}h304l30 82H${f1(PX - 182)}Z" fill="url(#stone)"/>
<path d="M${PX - 152} ${GY}h304" stroke="#ffe9a3" stroke-width="3" opacity=".75"/>
<path d="M${PX - 152} ${GY}L${PX - 182} ${GY + 82}M${PX + 152} ${GY}L${PX + 182} ${GY + 82}" stroke="#c99a20" stroke-width="2" opacity=".45"/>`;
  return {
    defs: `<linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241a06"/><stop offset=".5" stop-color="#120d05"/><stop offset="1" stop-color="#0b0803"/></linearGradient>
<linearGradient id="screen" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#2a1e07"/><stop offset=".55" stop-color="#120d05"/><stop offset="1" stop-color="#0b0803"/></linearGradient>
`,
    css: `.bar{transform-box:fill-box;transform-origin:center bottom;animation-name:bar;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.rise{animation-name:rise;animation-timing-function:ease-out;animation-iteration-count:infinite}
.play{transform-box:fill-box;transform-origin:center;animation:play 3.2s ease-in-out infinite}
@keyframes bar{from{transform:scaleY(.28)}to{transform:scaleY(1)}}
@keyframes rise{0%{transform:translateY(80px) scale(.55);opacity:0}14%,80%{opacity:1}100%{transform:translateY(-230px) scale(1.1);opacity:0}}
@keyframes play{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`,
    svg: `${shaft(140, -210, 30, 640, GY, .6)}
${shaft(PX, PT + 156, PX - 286, PX + 286, 20, .95, 24, 'url(#beamUp)')}
<g transform="translate(${PX} ${PT + 170})"><circle class="glow" r="268" fill="url(#halo)"/></g>
<g fill="#ffe27a" opacity=".92">${rise}</g>
${plinth}
${pool(PX, GY, 190, 34)}
${mirror(phone, GY, .18, 110)}
<g>${phone}</g>
${motes(R, 14, { x: 180, y: 160, w: 440, h: 340 })}`,
  };
}

/* ---------- 7 · ZİRVE ----------
   Sırtlar katman katman uzaklaşıyor, güneş sol üstte; patika ışığı alan yamaçtan tepeye çıkıyor. */
function ch7(R, anim) {
  const GY = 720, PEAK = [470, 286];
  const trail = 'M188 728q86-30 128-92t104-118q34-72 44-206';
  const peak = `<path d="M172 ${GY}L${PEAK[0]} ${PEAK[1]}L768 ${GY}Z" fill="url(#rock)"/>
<path d="M${PEAK[0]} ${PEAK[1]}L768 ${GY}H${PEAK[0]}Z" fill="#0b0803" opacity=".55"/>
<path d="M${PEAK[0]} ${PEAK[1]}l58 108-64 34-52-26Z" fill="#fff8e0" opacity=".9"/>
<path d="M${PEAK[0]} ${PEAK[1]}l58 108-58 30Z" fill="#c99a20" opacity=".5"/>`;
  return {
    defs: `<radialGradient id="sun7"><stop offset="0" stop-color="#fff8e0"/><stop offset=".5" stop-color="#ffe27a"/><stop offset="1" stop-color="#dda824"/></radialGradient>
<linearGradient id="rock" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#e9c552"/><stop offset=".38" stop-color="#8c6a14"/><stop offset="1" stop-color="#1b1305"/></linearGradient>`,
    css: `.trail{animation:trail 3.4s linear infinite}
.flag{transform-box:fill-box;transform-origin:left center;animation:flag 3.6s ease-in-out infinite}
.star{transform-box:fill-box;transform-origin:center;animation:star 4s ease-in-out infinite}
@keyframes trail{to{stroke-dashoffset:-68}}
@keyframes flag{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(-5deg) scaleX(.9)}}
@keyframes star{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}`,
    svg: `<g transform="translate(238 246)"><circle class="glow" r="238" fill="url(#halo)"/><circle r="78" fill="url(#soft)"/><circle r="50" fill="url(#sun7)"/></g>
${shaft(238, 246, 60, 700, GY, .55)}
${haze(392, 120, .12)}
${ridge([[0, 470], [128, 424], [300, 476], [468, 412], [640, 470], [800, 436]], 'url(#far)')}
${haze(462, 110, .1)}
${ridge([[0, 546], [176, 470], [352, 552], [524, 476], [700, 556], [800, 512]], 'url(#mid)')}
${haze(536, 110, .07)}
<g>${peak}</g>
<path d="${trail}" fill="none" stroke="#1b1305" stroke-width="12" stroke-linecap="round" opacity=".8"/>
<path d="${trail}" fill="none" stroke="#ffd766" stroke-width="16" stroke-linecap="round" opacity=".1"/>
<path class="trail" d="${trail}" fill="none" stroke="#fff3c4" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 20" opacity=".95"/>
<g transform="translate(${PEAK[0]} ${PEAK[1]})">
<path d="M0 0v-88" stroke="#fff8e0" stroke-width="6" stroke-linecap="round"/>
<path class="flag" d="M4 -84h72l-20 25 20 25H4Z" fill="url(#gold)"/>
<circle class="star" cy="-100" r="11" fill="#fff8e0"/></g>
${ridge([[0, 686], [190, 648], [420, 698], [640, 656], [800, 700]], '#0d0904')}
${motes(R, 16, { x: 120, y: 260, w: 520, h: 340 })}`,
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
  const style = anim ? `<style>${SCENE_CSS}\n${scene.css}</style>` : '';
  const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>
${scene.svg}
<rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
<!-- Üretildi: tools/build-chapters.mjs — elle düzenleme, betiği çalıştır. -->
<defs>${defsFor(body + scene.defs)}${scene.defs}</defs>
${style}
${body}
</svg>
`;
}

mkdirSync(join(ROOT, 'img/course'), { recursive: true });
let total = 0;
for (const c of CHAPTERS) {
  resetScene();
  const live = render(c.build(rng(c.seed), true), true);
  resetScene();
  const stat = render(c.build(rng(c.seed), false), false).replace(/ style="animation-[^"]*"/g, '');
  writeFileSync(join(ROOT, `img/course/ch${c.n}.svg`), live);
  writeFileSync(join(ROOT, `img/course/ch${c.n}-static.svg`), stat);
  total += live.length + stat.length;
  console.log(`img/course/ch${c.n}.svg (${(live.length / 1024).toFixed(1)} KB) + -static (${(stat.length / 1024).toFixed(1)} KB)`);
}
console.log(`toplam ${(total / 1024).toFixed(1)} KB`);
