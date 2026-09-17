/* Varlık sürüm damgası (tools/build-i18n.mjs kullanır).
   Saf yardımcılar: assetToken yalnız okur, stampHtml dize→dize. Dosya yazma çağıranda kalır.

   Neden var: GitHub Pages css/style.css ve js/main.js dosyalarını kısa bir max-age ile
   veriyor ve başlıkları değiştirmenin yolu yok. Dağıtımdan sonra bir süre ziyaretçi YENİ
   HTML + ESKİ CSS/JS karışımı alabiliyor; bu karışım "biraz eski" değil, bozuk görünüyor
   (ör. bir sınıf HTML'e girer ama kuralı eski CSS'te yoktur). Adresin sonundaki ?v=<özet>
   elimizdeki tek kaldıraç. */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* Özete giren el yazımı dosyalar. js/lang/<dil>.js BİLEREK yok: onu build-i18n üretiyor,
   yani özet alınırken henüz yazılmamış olabiliyor. Yerine i18n/*.json giriyor — lang dosyası
   sözlüğün saf fonksiyonu olduğu için sözlük değişir ⇔ lang dosyası değişir.
   .html dosyaları da yok: damga onların içine yazıldığı için sabit nokta döngüsü olurdu. */
const ASSETS = ['css/style.css', 'js/main.js', 'js/fyos-local.js', 'js/fyos-voice.js'];

/** İçerik özeti — zaman damgası DEĞİL: kaynak değişmediyse iki çalıştırma aynı damgayı verir.
    .gitattributes'taki «* text=auto eol=lf» sayesinde bayt özeti her işletim sisteminde aynı. */
export function assetToken(root) {
  const dicts = readdirSync(join(root, 'i18n')).filter((f) => f.endsWith('.json')).sort().map((f) => 'i18n/' + f);
  const h = createHash('sha256');
  for (const p of [...ASSETS, ...dicts]) {
    h.update(p, 'utf8'); h.update('\0');        // yol da özete girer: yeniden adlandırma damgayı bozar
    h.update(readFileSync(join(root, p)));      // ham bayt
    h.update('\0');                             // sınır: iki dosyanın birleşimi tek dosyaya benzemesin
  }
  /* 8 onaltılık karakter yeter: çakışma yalnız ziyaretçinin önbelleğindeki sürümle yeni
     dağıtım arasında anlam taşır — dağıtım başına tek karşılaştırma, doğum günü problemi yok. */
  return h.digest('hex').slice(0, 8);
}

/* Etikete çapalı: hem açılış özniteliğini hem kapanışı istiyorlar.
   Şart, çünkü index.html'de «js/main.js» dört ayrı YORUM satırında düz metin olarak geçiyor;
   çıplak dosya adına bakan bir ifade o yorumları bozardı. Satır başına da çapalanamaz:
   index.html'de etiket «</div><script src="js/main.js"></script>» biçiminde, satır ortasında.
   Eski damga yakalanmayan isteğe bağlı grupla yutuluyor, yani ?v=a?v=b üretmek imkânsız. */
const CSS_RE = /(<link rel="stylesheet" href="(?:\.\.\/)*css\/style\.css)(?:\?v=[0-9a-f]+)?(">)/g;
const MAIN_RE = /(<script src="(?:\.\.\/)*js\/main\.js)(?:\?v=[0-9a-f]+)?("><\/script>)/g;

/** Sayfanın iki paylaşılan varlık etiketini damgalar. Sayaçlar çağıranın doğrulaması için:
    beklenen biçimde bulunamayan bir etiket sessizce damgasız gitmemeli. */
export function stampHtml(html, token) {
  let css = 0, js = 0;
  html = html.replace(CSS_RE, (_, a, b) => { css++; return a + '?v=' + token + b; });
  html = html.replace(MAIN_RE, (_, a, b) => { js++; return a + '?v=' + token + b; });
  return { html: html, css: css, js: js };
}
