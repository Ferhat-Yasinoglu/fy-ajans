/* Alan adı geçişi — tek komut.

   Kullanım (depo kökünde):
     node tools/set-domain.mjs fyajans.de
     node tools/set-domain.mjs fyajans.de --kuru     # hiçbir şey yazma, ne değişeceğini göster
     node tools/set-domain.mjs --geri                # GitHub Pages adresine dön

   Ne yapar:
     1. Sitedeki bütün mutlak adresleri eski tabandan https://<alan-adı> adresine çevirir
        (canonical, hreflang, Open Graph, Twitter, JSON-LD, sitemap, robots, README).
     2. 404.html içindeki /fy-ajans/ kök-göreli yollarını / yapar. GitHub Pages'te site bir
        alt dizinde duruyordu; kendi alan adında kökte duruyor.
     3. Depo köküne CNAME dosyasını yazar — GitHub Pages özel alan adını buradan okur.
     4. worker/wrangler.toml içindeki ALLOWED_ORIGINS listesine yeni adresi ekler. Bu liste
        boş ya da eksikse worker isteği reddeder; en sık atlanan adım budur.
     5. node tools/build-i18n.mjs çalıştırır. de/ en/ fa/ sayfaları ve sitemap.xml yeni tabanı
        index.html'deki canonical'dan okuyup kendiliğinden alır.

   Not: tools/build-og-profile.mjs ve worker/test/security.mjs içindeki adresler bilerek
   dokunulmadan bırakıldı — ilki yalnızca bir yedek değer (asıl tabanı canonical'dan okur),
   ikincisi testin kendi uydurma kaynağı.

   Sonra: commit + push, GitHub → Settings → Pages → Custom domain. DNS doğrulaması geçince
   "Enforce HTTPS" işaretle. */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ESKI_TABAN = 'https://ferhat-yasinoglu.github.io/fy-ajans';
const ESKI_YOL = '/fy-ajans/';
const UZANTI = new Set(['.html', '.xml', '.txt', '.webmanifest', '.md', '.toml']);
const ATLA = new Set(['node_modules', '.git', '.wrangler', '.github']);

const args = process.argv.slice(2);
const kuru = args.includes('--kuru');
const geri = args.includes('--geri');
const arg = args.find(a => !a.startsWith('--'));

function bitir(mesaj) { console.error('\n✗ ' + mesaj + '\n'); process.exit(1); }

let alan = '', yeniTaban = '';
if (!geri) {
  if (!arg) bitir('Alan adı gerekli.\n  node tools/set-domain.mjs fyajans.de\n  node tools/set-domain.mjs --geri');
  alan = arg.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(alan))
    bitir('Alan adı okunamadı: ' + arg + '\n  Beklenen biçim: fyajans.de (başında https:// olmadan, sonunda / olmadan)');
  yeniTaban = 'https://' + alan;
}

// Geri dönüşte yön ters çevrilir.
const bulTaban = geri ? null : ESKI_TABAN;
const koyTaban = geri ? null : yeniTaban;

/* Mevcut tabanı index.html'deki canonical'dan oku: ikinci kez çalıştırıldığında
   "eski taban" artık GitHub Pages değil, bir önceki alan adıdır. */
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const canonical = (indexHtml.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
if (!canonical) bitir('index.html içinde canonical bulunamadı; taban tespit edilemiyor.');
const suankiTaban = canonical.replace(/\/+$/, '');

const kaynak = geri ? suankiTaban : suankiTaban;
const hedef = geri ? ESKI_TABAN : yeniTaban;
if (kaynak === hedef) bitir('Site zaten bu adreste: ' + hedef + ' — yapacak bir şey yok.');

function* dosyalar(dizin) {
  for (const ad of readdirSync(dizin)) {
    if (ATLA.has(ad)) continue;
    const tam = join(dizin, ad);
    if (statSync(tam).isDirectory()) yield* dosyalar(tam);
    else if (UZANTI.has(extname(ad))) yield tam;
  }
}

let degisen = 0, toplamVurus = 0;
for (const dosya of dosyalar(ROOT)) {
  const eski = readFileSync(dosya, 'utf8');
  let yeni = eski.split(kaynak).join(hedef);

  /* 404.html kök-göreli yollar: GitHub Pages alt dizini ↔ alan adı kökü.
     Tek kural yeter: tırnaktan sonraki yol. url("/...") de bu kalıba giriyor,
     ayrıca ("/ kuralı yazılırsa yol iki kez ön ek alır. */
  if (basename(dosya) === '404.html') {
    yeni = geri ? yeni.split('"/').join('"' + ESKI_YOL)
                : yeni.split('"' + ESKI_YOL).join('"/');
  }

  /* wrangler.toml: ALLOWED_ORIGINS yalnız kaynak (şema + alan) tutar, yol tutmaz —
     yol içeren bir değer hiçbir isteğe eşleşmez. Her girdiyi kaynağa indirip
     tekrarları atıyoruz; böylece iki yönde de, kaç kez çalıştırılırsa çalıştırılsın
     aynı sonucu veriyor. Kullanıcının eklediği başka kaynaklar (örn. www) korunur. */
  if (basename(dosya) === 'wrangler.toml') {
    yeni = yeni.replace(/ALLOWED_ORIGINS = "([^"]*)"/, (_, liste) => {
      const eskiKok = new URL(kaynak).origin, yeniKok = new URL(hedef).origin;
      const kokler = [];
      for (const parca of liste.split(',')) {
        const s = parca.trim();
        if (!s) continue;
        let kok; try { kok = new URL(s).origin; } catch { continue; }
        if (kok === eskiKok || kok === yeniKok || kokler.includes(kok)) continue;
        kokler.push(kok);
      }
      kokler.push(yeniKok);
      return 'ALLOWED_ORIGINS = "' + kokler.join(',') + '"';
    });
  }

  if (yeni !== eski) {
    const vurus = eski.split(kaynak).length - 1;
    toplamVurus += vurus;
    degisen++;
    console.log('  ' + (kuru ? 'değişecek' : 'güncellendi') + ': ' + relative(ROOT, dosya) + (vurus ? ' (' + vurus + ')' : ''));
    if (!kuru) writeFileSync(dosya, yeni);
  }
}

// CNAME — GitHub Pages özel alan adını buradan okur.
const cnameYolu = join(ROOT, 'CNAME');
if (!kuru) {
  if (geri) { if (existsSync(cnameYolu)) { unlinkSync(cnameYolu); console.log('  silindi: CNAME'); } }
  else { writeFileSync(cnameYolu, alan + '\n'); console.log('  yazıldı: CNAME → ' + alan); }
} else {
  console.log('  ' + (geri ? 'silinecek: CNAME' : 'yazılacak: CNAME → ' + alan));
}

console.log('\n' + degisen + ' dosya, ' + toplamVurus + ' adres: ' + kaynak + ' → ' + hedef);

if (kuru) { console.log('\n(--kuru: hiçbir dosya yazılmadı)\n'); process.exit(0); }

// de/ en/ fa/ ve sitemap.xml yeni tabanı canonical'dan okuyup yeniden üretilir.
console.log('\nnode tools/build-i18n.mjs');
execFileSync(process.execPath, [join(ROOT, 'tools/build-i18n.mjs')], { cwd: ROOT, stdio: 'inherit' });

if (!geri) {
  console.log('\nDNS kayıtları — alan adı firmasının paneline gir:');
  console.log('  A      @      185.199.108.153');
  console.log('  A      @      185.199.109.153');
  console.log('  A      @      185.199.110.153');
  console.log('  A      @      185.199.111.153');
  console.log('  CNAME  www    ferhat-yasinoglu.github.io');
  console.log('\nSonra: commit + push → GitHub deposu → Settings → Pages → Custom domain: ' + alan);
  console.log('DNS doğrulaması geçince "Enforce HTTPS" işaretle (yayılma birkaç saat sürebilir).');
  console.log('Worker kuruluysa: cd worker && npx wrangler deploy  (ALLOWED_ORIGINS güncellendi).\n');
} else {
  console.log('\nGitHub → Settings → Pages → Custom domain alanını da boşalt.\n');
}
