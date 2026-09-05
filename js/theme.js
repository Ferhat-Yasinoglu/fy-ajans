/* Tema tercihini sayfa boyanmadan önce uygular: koyu varsayılan, "light" ise <html data-theme="light">.
   Satır içi betik CSP'de yasak olduğundan ayrı, küçük ve eşzamanlı bir dosya (head içinde). Düğme js/main.js'te. */
(function () {
  try {
    if (localStorage.getItem('fy-theme') === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {}
})();
