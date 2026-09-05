#!/usr/bin/env node
/* FY — çok dilli statik sayfa üretici
   Kaynak: kökteki Türkçe HTML (index.html, contact/*.html, portal/login.html, terms.html, impressum.html).
   Sözlük: i18n/<dil>.json  (biçim: i18n/README.md)
   Çıktı:  <dil>/…  aynı klasör yapısıyla; js/lang/<dil>.js; sitemap.xml

   Kullanım (depo kökünde):   node tools/build-i18n.mjs          üret
                              node tools/build-i18n.mjs --check  yalnızca eksik anahtarları listele (çıkış kodu 1)

   Kurallar:
   - Metin:      <h1 data-i18n="hero.title">…</h1>          → iç HTML sözlükteki değerle değişir
   - Öznitelik:  <input data-i18n-attr="placeholder=k1|aria-label=k2">
   - Dil seçici: <a data-lang="de" href="…">                → href bu sayfanın Almanca sürümüne çevrilir
   - JSON-LD:    sözlükteki "ld" haritası (Türkçe metin → çeviri) ile dize dize değiştirilir
   - Sözlükte anahtar yoksa Türkçe metin olduğu gibi kalır ve uyarı yazılır (kısmi çeviri güvenlidir).
   Bağımlılık yok. */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SOURCES = ['index.html', 'contact/index.html', 'contact/course.html', 'portal/login.html', 'terms.html', 'impressum.html'];
const ASSET_DIRS = ['css/', 'js/', 'img/', 'fonts/', 'manifest.webmanifest'];
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const write = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };

// Yayın adresi kaynaktaki canonical'dan okunur; böylece tools/set-domain.ps1 ile uyumlu kalır.
const BASE = (read('index.html').match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
if (!BASE) throw new Error('index.html içinde canonical bulunamadı');

/* ---------- HTML tarayıcı (bağımlılıksız, bu depo için yeterli) ---------- */
const TAG_RE = /<([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
function parseAttrs(s) {
  const out = []; const re = /([^\s=>\/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let m;
  while ((m = re.exec(s))) out.push({ name: m[1], value: m[3] ?? m[4] ?? m[5] ?? null, raw: m[0] });
  return out;
}
function attrOf(attrs, name) { const a = attrs.find(x => x.name === name); return a ? a.value : null; }
/** Başlangıç etiketinin bittiği konumdan eşleşen kapanış etiketini bulur; [innerStart, innerEnd, closeEnd] */
function findClose(html, name, from) {
  const re = new RegExp(`<(/?)${name}(?=[\\s>/])[^>]*>`, 'gi'); re.lastIndex = from; let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1] === '/') { if (--depth === 0) return [from, m.index, m.index + m[0].length]; }
    else if (!m[0].endsWith('/>')) depth++;
  }
  throw new Error(`<${name}> kapanışı bulunamadı (konum ${from})`);
}

/* ---------- Sözlük ---------- */
function loadDicts() {
  const dir = join(ROOT, 'i18n');
  return readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const k of ['lang', 'dir', 'locale', 'name']) if (!d[k]) throw new Error(`${f}: "${k}" eksik`);
    d.pages ||= {}; d.common ||= {}; d.ld ||= {}; d.js ||= null;
    return d;
  });
}

/* ---------- Yol yardımcıları ---------- */
const pageUrl = (src) => src.replace(/index\.html$/, '');                       // 'contact/index.html' → 'contact/'
const depthOf = (src) => src.split('/').length - 1;
const up = (n) => '../'.repeat(n);
function relLink(fromFile, toFile) {                                           // her ikisi depo köküne göre
  const r = posix.relative(posix.dirname(fromFile), toFile); return r === '' ? './' : r;
}

/* ---------- Bir sayfayı bir dile çevir ---------- */
function translate(src, html, dict, report) {
  const lang = dict.lang, outFile = `${lang}/${src}`;
  const table = { ...dict.common, ...(dict.pages[src] || {}) };
  const missing = new Set();
  const lookup = (key) => { if (table[key] != null) return table[key]; missing.add(key); return null; };

  // 1) metin ve öznitelikler — bulunan konumları toplayıp sondan başa uygula
  const edits = []; let m; TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    const [tag, name, attrStr, selfClose] = m; const attrs = parseAttrs(attrStr);
    const key = attrOf(attrs, 'data-i18n'), attrSpec = attrOf(attrs, 'data-i18n-attr');
    if (!key && !attrSpec) continue;
    const start = m.index, tagEnd = start + tag.length;
    let newTag = tag;
    if (attrSpec) for (const pair of attrSpec.split('|')) {
      const [an, k] = pair.split('='); const v = lookup(k.trim()); if (v == null) continue;
      const re = new RegExp(`(\\s${an.trim()}=)("[^"]*"|'[^']*')`); if (!re.test(newTag)) { report.warn.push(`${src}: <${name}> üzerinde ${an} özniteliği yok (${k})`); continue; }
      newTag = newTag.replace(re, (_, p) => `${p}"${String(v).replace(/"/g, '&quot;')}"`);
    }
    if (key && !VOID.has(name.toLowerCase()) && !selfClose) {
      const [iS, iE, cE] = findClose(html, name, tagEnd); const v = lookup(key);
      edits.push({ start, end: cE, text: newTag + (v == null ? html.slice(iS, iE) : v) + html.slice(iE, cE) });
      TAG_RE.lastIndex = cE; // iç içe anahtar yok; içeriği atla
    } else if (newTag !== tag) edits.push({ start, end: tagEnd, text: newTag });
    else if (key) report.warn.push(`${src}: boş <${name} data-i18n="${key}">`);
  }
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) html = html.slice(0, e.start) + e.text + html.slice(e.end);

  // 2) <html lang dir>
  html = html.replace(/<html\b[^>]*>/, `<html lang="${lang}" dir="${dict.dir}">`);

  // 3) varlık yolları bir seviye derine iner (css/ js/ img/ fonts/ manifest); srcset: <picture> içindeki statik logo
  const d = depthOf(src);
  html = html.replace(/\b(href|src|srcset|content)="((?:\.\.\/)*)([^"]+)"/g, (all, a, ups, rest) => {
    if (ups.length / 3 !== d) return all;                                     // yalnızca köke işaret eden göreli yollar
    return ASSET_DIRS.some(p => rest.startsWith(p)) ? `${a}="${ups}../${rest}"` : all;
  });

  // 4) dil dosyası main.js'ten önce
  const mainRe = new RegExp(`<script src="(${up(d + 1).replace(/\./g, '\\.')})js/main\\.js"></script>`);
  if (dict.js && mainRe.test(html)) html = html.replace(mainRe, (all, pre) => `<script src="${pre}js/lang/${lang}.js"></script>${all}`);

  // 5) mutlak adresler: canonical, og:url, twitter, JSON-LD "url"
  const trUrl = BASE + pageUrl(src), langUrl = BASE + lang + '/' + pageUrl(src);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(`(<link rel="canonical" href=")${esc(trUrl)}(")`), `$1${langUrl}$2`);
  html = html.replace(new RegExp(`(<meta property="og:url" content=")${esc(trUrl)}(")`), `$1${langUrl}$2`);
  html = html.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${dict.locale}$2`);
  // paylaşım görseli dile göre: img/og.png → img/og-<dil>.png (og:image ve twitter:image)
  html = html.replace(new RegExp(`(<meta (?:property="og:image"|name="twitter:image") content="${esc(BASE)}img/og)(\\.png")`, 'g'), `$1-${lang}$2`);

  // 6) JSON-LD: dize çevirisi, inLanguage, sayfa url'leri
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (all, a, body, c) => {
    let data; try { data = JSON.parse(body); } catch (e) { report.warn.push(`${src}: JSON-LD ayrıştırılamadı`); return all; }
    const walk = (node, parentKey) => {
      if (Array.isArray(node)) return node.map(n => walk(n, parentKey));
      if (node && typeof node === 'object') { const o = {}; for (const [k, v] of Object.entries(node)) o[k] = walk(v, k); return o; }
      if (typeof node === 'string') {
        if (parentKey === 'inLanguage') return lang;
        if (parentKey === 'url' && (node === trUrl || node === trUrl.replace(/\/$/, ''))) return langUrl;
        if (parentKey === 'url' && node.startsWith(trUrl + '#')) return langUrl + node.slice(trUrl.length);
        if (dict.ld[node] != null) return dict.ld[node];
        return node;
      }
      return node;
    };
    return a + '\n' + JSON.stringify(walk(data, null)) + '\n' + c;
  });

  // 7) dil seçici bağlantıları
  html = html.replace(/<a([^>]*?)\sdata-lang="([a-z]{2})"([^>]*)>/g, (all, pre, l, post) => {
    const target = l === 'tr' ? src : `${l}/${src}`;
    let tag = `<a${pre} data-lang="${l}"${post}>`.replace(/\shref="[^"]*"/, ` href="${relLink(outFile, target)}"`).replace(/\saria-current="[^"]*"/, '');
    if (l === lang) tag = tag.replace(/>$/, ' aria-current="page">');
    return tag;
  });

  // 8) hreflang bloğu var mı (kaynakta elle duruyor; çevirilerde aynı kalır)
  if (!/hreflang="x-default"/.test(html)) report.warn.push(`${src}: hreflang bloğu yok`);

  report.missing[lang] = report.missing[lang] || {}; if (missing.size) report.missing[lang][src] = [...missing];
  return { outFile, html };
}

/* ---------- Ana akış ---------- */
const dicts = loadDicts();
const report = { warn: [], missing: {} };
const outputs = [];
for (const dict of dicts) {
  if (dict.lang === 'tr') continue;
  for (const src of SOURCES) {
    const { outFile, html } = translate(src, read(src), dict, report);
    outputs.push({ file: outFile, html });
  }
  if (dict.js) outputs.push({ file: `js/lang/${dict.lang}.js`, html: `/* Üretilmiş dosya — elle düzenleme: i18n/${dict.lang}.json → node tools/build-i18n.mjs */\nwindow.FY_STRINGS = ${JSON.stringify(dict.js, null, 1)};\n` });
}

// sitemap: her sayfa × her dil, hreflang alternatifleriyle
const langs = ['tr', ...dicts.filter(d => d.lang !== 'tr').map(d => d.lang)];
const today = new Date().toISOString().slice(0, 10);
const PRIO = { 'index.html': ['weekly', '1'], 'contact/index.html': ['weekly', '0.9'], 'contact/course.html': ['weekly', '0.8'], 'terms.html': ['monthly', '0.3'], 'impressum.html': ['yearly', '0.2'], 'portal/login.html': null };
let sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
for (const src of SOURCES) {
  if (!PRIO[src]) continue;
  const alts = langs.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE}${l === 'tr' ? '' : l + '/'}${pageUrl(src)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${pageUrl(src)}"/>`;
  for (const l of langs) sm += `<url><loc>${BASE}${l === 'tr' ? '' : l + '/'}${pageUrl(src)}</loc><lastmod>${today}</lastmod><changefreq>${PRIO[src][0]}</changefreq><priority>${PRIO[src][1]}</priority>${alts}</url>\n`;
}
sm += '</urlset>\n';

// rapor
let missingTotal = 0;
for (const [lang, pages] of Object.entries(report.missing)) for (const [src, keys] of Object.entries(pages)) {
  missingTotal += keys.length; console.log(`  eksik  ${lang}  ${src}: ${keys.join(', ')}`);
}
for (const w of report.warn) console.log('  uyarı  ' + w);

if (CHECK) { console.log(missingTotal ? `${missingTotal} eksik anahtar` : 'tüm anahtarlar tam'); process.exit(missingTotal ? 1 : 0); }
for (const o of outputs) write(o.file, o.html);
write('sitemap.xml', sm);
console.log(`${outputs.length} dosya yazıldı (${langs.filter(l => l !== 'tr').join(', ')}) + sitemap.xml${missingTotal ? ` — ${missingTotal} eksik anahtar Türkçe kaldı` : ''}`);
