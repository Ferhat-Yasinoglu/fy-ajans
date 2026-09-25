/* FY — yükleyici: ana betik (js/main.js) ilk boyamadan SONRA yüklenir.
   Neden: main.js sayfanın sonunda eşzamanlı bir <script> iken tarayıcı onu ilk boyamadan önce
   çalıştırıyordu — ~170 ms değerlendirme artı build()'in zorladığı ~130 ms'lik ilk düzen aynı
   görevde (yerel ölçüm; PSI'ın yavaş makinesinde 1-2 sn) ve sayfa o süre boyunca boş kalıyordu.
   Lighthouse da LCP hesabına o dosyayı katıyordu. Şimdi HTML + CSS + logo boyanır, iki kare
   sonra ana betik eklenir. Sürüm damgası (?v=…) bu dosyanın adresinden alınıp devredilir.
   CSP «script-src 'self'» satır içi betiğe izin vermediği için ayrı dosya. */
(function () {
  var me = document.currentScript;
  var src = me && me.src ? me.src.replace(/js\/boot\.js(\?[^#]*)?(#.*)?$/, 'js/main.js$1') : 'js/main.js';
  var done = false;
  function go() { if (done) return; done = true; var s = document.createElement('script'); s.src = src; document.body.appendChild(s); }
  if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(go); });
  setTimeout(go, 500);                                   // arka plandaki sekmede kare gelmez; yine de yüklensin
})();
