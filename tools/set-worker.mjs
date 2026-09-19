/* Worker'ı siteye bağla — tek komut.

   Kullanım (depo kökünde):
     node tools/set-worker.mjs https://fy-ajans.<hesap>.workers.dev            # yalnız ses
     node tools/set-worker.mjs https://fy-ajans.<hesap>.workers.dev --sohbet   # ses + sohbet
     node tools/set-worker.mjs --temizle                                        # bağlantıyı kaldır

   Ne yapar:
     1. js/main.js içindeki FYOS_VOICE_ENDPOINT'i <url>/tts yapar (--sohbet ile FYOS_ENDPOINT'i de).
     2. index.html'deki CSP'nin connect-src listesine worker adresini ekler. Bu adım elle
        atlanırsa tarayıcı isteği sessizce engeller ve ses robotik kalır — en sık yapılan hata.
        Önceki worker adresi varsa listeden çıkarılır, adres birikmez.
     3. node tools/build-i18n.mjs çalıştırır; de/ en/ fa/ sayfaları da aynı ayarı alır.
     4. wrangler.toml'daki ALLOWED_ORIGINS sitenin adresini kapsıyor mu diye bakar, kapsamıyorsa uyarır.

   Sonra: commit + push. Anahtar bu dosyaların hiçbirine YAZILMAZ; o yalnızca
   `npx wrangler secret put OPENAI_API_KEY` ile Cloudflare'de durur. */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MAIN = join(ROOT, 'js/main.js');
const INDEX = join(ROOT, 'index.html');
const WRANGLER = join(ROOT, 'worker/wrangler.toml');

const args = process.argv.slice(2);
const temizle = args.includes('--temizle');
const sohbet = args.includes('--sohbet');
const arg = args.find(a => !a.startsWith('--'));

function bitir(mesaj) { console.error('\n✗ ' + mesaj + '\n'); process.exit(1); }

let url = '', origin = '';
if (!temizle) {
  if (!arg) bitir('Worker adresi gerekli.\n  node tools/set-worker.mjs https://fy-ajans.<hesap>.workers.dev\n  node tools/set-worker.mjs --temizle');
  try {
    const u = new URL(arg);
    if (u.protocol !== 'https:') bitir('Adres https:// ile başlamalı (tarayıcı http adresine istek atmaz).');
    origin = u.origin;
    url = u.origin + u.pathname.replace(/\/+$/, '');
  } catch { bitir('Adres okunamadı: ' + arg); }
  if (/\/tts$/.test(url)) url = url.replace(/\/tts$/, '');   // /tts'i kendimiz ekliyoruz
}

// --- js/main.js ---
let main = readFileSync(MAIN, 'utf8');
const oncekiSes = (main.match(/var FYOS_VOICE_ENDPOINT = '([^']*)';/) || [])[1] || '';
const oncekiSohbet = (main.match(/var FYOS_ENDPOINT = '([^']*)';/) || [])[1] || '';

function ayarla(kaynak, ad, deger) {
  const re = new RegExp("(var " + ad + " = ')[^']*(';)");
  if (!re.test(kaynak)) bitir(ad + ' js/main.js içinde bulunamadı.');
  return kaynak.replace(re, '$1' + deger + '$2');
}
main = ayarla(main, 'FYOS_VOICE_ENDPOINT', temizle ? '' : url + '/tts');
if (sohbet || temizle) main = ayarla(main, 'FYOS_ENDPOINT', temizle ? '' : url);
writeFileSync(MAIN, main);

// --- index.html CSP ---
let html = readFileSync(INDEX, 'utf8');
const cspRe = /(content="[^"]*?connect-src )([^;"]*)([;"])/;
const m = html.match(cspRe);
if (!m) bitir('index.html içinde connect-src bulunamadı.');

let kaynaklar = m[2].trim().split(/\s+/).filter(Boolean);
// Önceki worker adreslerini çıkar (biriktirme), sonra yenisini ekle
for (const eski of [oncekiSes, oncekiSohbet]) {
  if (!eski) continue;
  try { const o = new URL(eski).origin; kaynaklar = kaynaklar.filter(k => k !== o); } catch {}
}
if (!temizle && !kaynaklar.includes(origin)) kaynaklar.push(origin);
html = html.replace(cspRe, (_, a, __, c) => a + kaynaklar.join(' ') + c);
writeFileSync(INDEX, html);

/* --- çeviriler ---
   SON ADIM OLARAK KALMALI. build-i18n yalnız de/ en/ fa/ üretmiyor; js/main.js ile
   css/style.css'in içerik özetinden bir ?v=… damgası hesaplayıp sayfalara yazıyor. Yukarıda
   js/main.js'i yeni değiştirdik, yani damga şu an bayat; bu çağrı onu tazeliyor. Bu satır
   index.html yazmasının önüne alınırsa damga ezilir ve bir daha üretilmez. */
execFileSync(process.execPath, [join(ROOT, 'tools/build-i18n.mjs')], { cwd: ROOT, stdio: 'inherit' });

// --- ALLOWED_ORIGINS kontrolü (uyarı; işi durdurmaz) ---
let uyari = '';
try {
  const izin = (readFileSync(WRANGLER, 'utf8').match(/ALLOWED_ORIGINS\s*=\s*"([^"]*)"/) || [])[1] || '';
  const siteOrigin = (html.match(/<link rel="canonical" href="(https:\/\/[^/"]+)/) || [])[1] || '';
  if (siteOrigin && izin && !izin.split(',').map(s => s.trim()).includes(siteOrigin)) {
    uyari = 'worker/wrangler.toml içindeki ALLOWED_ORIGINS sitenin adresini (' + siteOrigin +
      ') kapsamıyor. Worker bu hâliyle isteği 403 ile geri çevirir; oraya ekleyip yeniden dağıt.';
  }
} catch {}

console.log(temizle
  ? '\n✓ Worker bağlantısı kaldırıldı. Site yine tarayıcının kendi sesini kullanacak.'
  : '\n✓ Ses ucu:    ' + url + '/tts' +
    '\n✓ Sohbet ucu: ' + (sohbet ? url : '(bağlanmadı — yanıtlar cihazda üretilmeye devam ediyor)') +
    '\n✓ CSP connect-src: ' + kaynaklar.join(' '));
if (uyari) console.log('\n! ' + uyari);
console.log('\nSıradaki adım: git add -A && git commit -m "Worker baglandi" && git push\n');
