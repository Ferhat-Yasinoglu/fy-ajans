/* Altın sahneler için ortak geometri yardımcıları (tools/build-portrait.mjs, tools/build-cover.mjs, tools/build-brain.mjs).
   Saf fonksiyonlar; rastgelelik çağıran betiğin kendi tohumlu üreteciyle gelir. */

/** Tohumlu rastgele üreteç (mulberry32): aynı tohum → aynı dizi, üretilen dosyalar kararlı kalır */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const f1 = n => (Math.round(n * 10) / 10).toString();
/** Kutupsal → kartezyen (derece), merkez (0,0) */
export const P = (r, deg) => { const t = deg * Math.PI / 180; return [r * Math.cos(t), r * Math.sin(t)]; };

/** Catmull-Rom → kübik Bézier yol; closed ise halka kapanır */
export function smooth(pts, closed) {
  const n = pts.length, get = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += ' C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
  }
  return d + (closed ? ' Z' : '');
}

/** Sıvı altın şerit: merkez (0,0) çevresinde dalgalı yarıçap, uçları sivrilen değişken kalınlık.
    o = { a0, span, R, A, k, ph, W } (derece, yarıçap, dalga genliği, dalga sıklığı, faz, en); widthMul parıltı kopyaları için. */
export function ribbon(o, widthMul = 1, N = 48) {
  const outer = [], inner = [], center = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, deg = o.a0 + o.span * t, th = deg * Math.PI / 180;
    const wave = o.A * Math.sin(o.k * th + o.ph) + o.A * .45 * Math.sin(2.6 * o.k * th + o.ph * 1.7) + o.A * .2 * Math.sin(5.1 * o.k * th + o.ph * .6);
    const r = o.R + wave;
    const w = widthMul * o.W * Math.pow(Math.sin(t * Math.PI), .75) * (.55 + .45 * Math.sin(3.3 * th + o.ph * 2.1));
    outer.push([(r + w / 2) * Math.cos(th), (r + w / 2) * Math.sin(th)]);
    inner.push([(r - w / 2) * Math.cos(th), (r - w / 2) * Math.sin(th)]);
    center.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  return { body: smooth(outer.concat(inner.reverse()), true), core: smooth(center, false) };
}

/** Bir şeridin üç katmanlı (iki parıltı kopyası + gövde + parlak çekirdek) SVG'si.
    g1/g2 (parıltı kopyalarının opaklığı) dizgi olarak yazılır: sayı verilirse ".2" yerine "0.2" üretilir ve
    üretilen SVG'ler gereksiz yere değişir. */
export function ribbonLayers(o, { glow = 'url(#gGlow)', body = 'url(#gRib)', core = '#fff7d6', coreW = 2.2, g1 = '.2', g2 = '.34' } = {}) {
  const gl = ribbon(o, 3.2), m = ribbon(o, 1.9), c = ribbon(o, 1);
  return `<path d="${gl.body}" fill="${glow}" opacity="${g1}"/>` +
    `<path d="${m.body}" fill="${glow}" opacity="${g2}"/>` +
    `<path d="${c.body}" fill="${body}"/>` +
    `<path d="${c.core}" fill="none" stroke="${core}" stroke-width="${coreW}" stroke-linecap="round" opacity=".85"/>`;
}

/** Merkez (0,0) çevresinde yay: a0 → a1 derece (saat yönü) */
export function arc(r, a0, a1) {
  const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1);
  return `M${f1(x0)} ${f1(y0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
}
