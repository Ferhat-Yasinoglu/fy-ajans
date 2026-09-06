/* Sahne dili — bölüm kapaklarının ortak ışık/derinlik yapı taşları (tools/build-chapters.mjs).
   Kural: SVG süzgeci (filter/feGaussianBlur) YOK. Yumuşaklık, çok sayıda yarı saydam katmanla
   ve gradyanlarla kurulur; hepsi statik yol olduğu için telefonda da ucuzdur.
   Saf fonksiyonlar; rastgelelik çağıran betiğin tohumlu üretecinden gelir. */
import { f1 } from './gold.mjs';

/* ---------- Ortak tanımlar ----------
   Işık serinin her sahnesinde AYNI yerden gelir: sol üstten, sıcak (#ffe9a3); parlak kenarlar sola-yukarı,
   gölgeler sağa-aşağı bakar. Aşağıdaki gradyanlardan sahne başına yalnız gerçekten başvurulanlar yazılır
   (defsFor), böylece her dosya kendi taşımadığı tanımı sürüklemez. */
const SHARED = [
  '<radialGradient id="sky" cx=".34" cy=".24" r=".92"><stop offset="0" stop-color="#3a2a06"/><stop offset=".34" stop-color="#1b1305"/><stop offset=".72" stop-color="#0b0803"/><stop offset="1" stop-color="#050403"/></radialGradient>',
  '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4" stop-opacity=".46"/><stop offset=".42" stop-color="#ffd766" stop-opacity=".15"/><stop offset="1" stop-color="#ffd766" stop-opacity="0"/></linearGradient>',
  '<linearGradient id="beamUp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff1c4" stop-opacity=".42"/><stop offset=".4" stop-color="#ffd766" stop-opacity=".13"/><stop offset="1" stop-color="#ffd766" stop-opacity="0"/></linearGradient>',
  '<radialGradient id="pool"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".62"/><stop offset=".45" stop-color="#e9c552" stop-opacity=".2"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>',
  '<radialGradient id="halo"><stop offset="0" stop-color="#fff2c8" stop-opacity=".5"/><stop offset=".38" stop-color="#e9c552" stop-opacity=".2"/><stop offset=".74" stop-color="#d4af37" stop-opacity=".05"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient>',
  '<radialGradient id="soft"><stop offset="0" stop-color="#fff3c4" stop-opacity=".8"/><stop offset=".5" stop-color="#f5d76e" stop-opacity=".28"/><stop offset="1" stop-color="#f5d76e" stop-opacity="0"/></radialGradient>',
  '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".5" stop-color="#d4af37"/><stop offset="1" stop-color="#8c6a14"/></linearGradient>',
  '<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".35" stop-color="#c99a20"/><stop offset=".62" stop-color="#8c6a14"/><stop offset="1" stop-color="#3a2a06"/></linearGradient>',
  '<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c552" stop-opacity=".34"/><stop offset=".6" stop-color="#8c6a14" stop-opacity=".12"/><stop offset="1" stop-color="#8c6a14" stop-opacity="0"/></linearGradient>',
  '<linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99a20" stop-opacity=".46"/><stop offset=".55" stop-color="#4a3708" stop-opacity=".2"/><stop offset="1" stop-color="#2a1e07" stop-opacity=".04"/></linearGradient>',
  '<linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241a06"/><stop offset="1" stop-color="#0b0803"/></linearGradient>',
  '<radialGradient id="vig" cx=".46" cy=".42" r=".78"><stop offset=".52" stop-color="#050403" stop-opacity="0"/><stop offset="1" stop-color="#050403" stop-opacity=".7"/></radialGradient>',
];

/** Gövdede url(#id) olarak geçen ortak tanımları döndürür — kullanılmayan gradyan dosyaya yazılmaz. */
export function defsFor(body) {
  return SHARED.filter(d => { const m = /id="([^"]+)"/.exec(d); return m && body.includes('url(#' + m[1] + ')'); }).join('\n');
}

/** Sahnelerin ortak hareket sözlüğü. Her sahne bunun üstüne kendi 1-2 kuralını ekler. */
export const SCENE_CSS = `
.mote{animation-name:mote;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.glow{transform-box:fill-box;transform-origin:center;animation:glow 6s ease-in-out infinite alternate}
@keyframes mote{from{transform:translateY(9px);opacity:.14}to{transform:translateY(-13px);opacity:.85}}
@keyframes glow{from{opacity:.68;transform:scale(.97)}to{opacity:1;transform:scale(1.04)}}`;

/** Hacimsel ışık konisi: tepe (sx,sy), tabanı by yüksekliğinde bx1..bx2 arası.
    Koni ince dilimlere bölünür, her dilimin opaklığı çan eğrisiyle söner — kenar süzgeçsiz yumuşar. */
export function shaft(sx, sy, bx1, bx2, by, op = 1, N = 16, fill = 'url(#beam)') {
  let s = '';
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const a = Math.exp(-Math.pow((u0 + u1 - 1) * 1.9, 2));
    if (a < .03) continue;                        // görünmeyen dilim çizilmez: kare başına yeniden çizim ucuzlar
    s += `<path d="M${f1(sx)} ${f1(sy)}L${f1(bx1 + (bx2 - bx1) * u0)} ${f1(by)}L${f1(bx1 + (bx2 - bx1) * u1)} ${f1(by)}Z" opacity="${f1(a * op)}"/>`;
  }
  return `<g fill="${fill}">${s}</g>`;
}

/** Zemin yansıması: içeriği ground çizgisinde aynalar, depth kadar aşağıda tamamen söner.
    Maske her çağrıda kendi tanımını yazar (id sırayla artar), böylece sönme mesafesi sahneye göre ayarlanır. */
let mirrorSeq = 0;
export function mirror(inner, ground, op = .4, depth = 170) {
  const id = `mr${++mirrorSeq}`;
  return `<defs><linearGradient id="g${id}" x1="0" y1="${f1(ground)}" x2="0" y2="${f1(ground + depth)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".55" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="${f1(ground)}" width="800" height="${f1(depth)}"><rect x="0" y="${f1(ground)}" width="800" height="${f1(depth)}" fill="url(#g${id})"/></mask></defs>` +
    `<g mask="url(#${id})" opacity="${f1(op)}"><g transform="translate(0 ${f1(2 * ground)}) scale(1 -1)">${inner}</g></g>`;
}

/** Sahneler arası kararlı çıktı için sayaç sıfırlanır (her dosya üretiminden önce çağrılır). */
export const resetScene = () => { mirrorSeq = 0; };

/** Hava perspektifi: uzaktaki katmanı yutan yatay pus bandı. */
export const haze = (y, h, op = .1) => `<rect x="0" y="${f1(y)}" width="800" height="${f1(h)}" fill="url(#beam)" opacity="${f1(op)}"/>`;

/** Zemine düşen ışık havuzu. */
export const pool = (cx, cy, rx, ry) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="url(#pool)"/>`;

/** Işıkta asılı toz. box = {x, y, w, h}
    Sayı bilerek düşük tutulur: SVG bir <img> içinde olduğu için tek öğe kıpırdasa bile tüm kare
    yeniden çizilir; maliyeti belirleyen şey sahnedeki toplam öğe sayısıdır. */
export function motes(R, n, box) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const d = 4 + R() * 5;
    s += `<circle class="mote" cx="${f1(box.x + R() * box.w)}" cy="${f1(box.y + R() * box.h)}" r="${f1(.8 + R() * 2)}" style="animation-duration:${f1(d)}s;animation-delay:-${f1(R() * d)}s"/>`;
  }
  return `<g fill="#fff3c4" opacity=".55">${s}</g>`;
}

/** Ufuk siluetı: verilen tepe noktalarından kadrajın altına inen kapalı yüzey. */
export const ridge = (pts, fill) =>
  `<path d="M0 800V${f1(pts[0][1])}${pts.map(p => `L${f1(p[0])} ${f1(p[1])}`).join('')}L800 800Z" fill="${fill}"/>`;
