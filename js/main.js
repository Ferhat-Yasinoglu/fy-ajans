/* FY — Yapay Zekâ Ajansı · ana betik
   Bölümler: üst çubuk, mobil menü, görünürlük animasyonu, hero devre ağı,
   kurs kapağı, FYOS sahnesi (ağ, ses çubuğu, sohbet), sekmeler, beyin grafiği,
   otomasyon akışı, SSS akordeonu, formlar. Bağımlılık yok. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame;

  /* ---------- Yıl ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- E-posta: adres HTML'de düz metin durmaz, burada birleşir ---------- */
  var MAIL = ['farhadyaqoobi.kunduz', 'gmail.com'].join('@');
  $$('[data-mail]').forEach(function (a) {
    var subj = a.getAttribute('data-mail');
    a.setAttribute('href', 'mailto:' + MAIL + (subj ? '?subject=' + encodeURIComponent(subj) : ''));
  });
  $$('[data-mail-text]').forEach(function (el) { el.textContent = MAIL; });

  /* ---------- Öğrenci girişi (yalnızca arayüz) ---------- */
  var loginForm = $('#loginForm');
  if (loginForm) loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = $('#loginStatus');
    s.textContent = 'Öğrenci paneli henüz açık değil. Girdiğin bilgiler hiçbir yere gönderilmedi.';
    loginForm.reset();
  });

  /* ---------- Üst çubuk ---------- */
  var nav = $('#nav');
  if (nav) raf(function () { nav.classList.add('is-ready'); });

  var burger = $('#burger'), menu = $('#mobileMenu');
  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Görünürlük animasyonu ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          // aynı ebeveyn içindeki kardeşleri kademeli göster
          var sibs = $$('[data-reveal]', el.parentElement).filter(function (s) { return s.parentElement === el.parentElement; });
          var idx = sibs.indexOf(el);
          el.style.transitionDelay = (idx > 0 ? Math.min(idx * 70, 420) : 0) + 'ms';
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Canvas yardımcıları ---------- */
  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function visible(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- Hero: altın devre ağı ---------- */
  (function hero() {
    var canvas = $('#heroCanvas'), logo = $('#heroLogo');
    if (!canvas) return;
    if (logo) setTimeout(function () { logo.classList.add('is-in'); }, 250);
    var traces = [], pulses = [], mouse = { x: 0.5, y: 0.5 }, t0 = performance.now();
    var cell = 44;

    function build() {
      var f = fit(canvas); traces = []; pulses = [];
      var cols = Math.ceil(f.w / cell), rows = Math.ceil(f.h / cell);
      var n = Math.round((cols * rows) / 14);
      for (var i = 0; i < n; i++) {
        var pts = [], x = Math.floor(rnd(0, cols)) * cell, yy = Math.floor(rnd(0, rows)) * cell;
        pts.push([x, yy]);
        var segs = Math.floor(rnd(2, 6)), horiz = Math.random() < .5;
        for (var s = 0; s < segs; s++) {
          var len = Math.floor(rnd(1, 6)) * cell * (Math.random() < .5 ? -1 : 1);
          if (horiz) x += len; else yy += len;
          horiz = !horiz;
          pts.push([x, yy]);
        }
        traces.push({ pts: pts, a: rnd(.18, .55), w: Math.random() < .12 ? 1.6 : .9, node: rnd(2.5, 5), big: Math.random() < .08, depth: rnd(.3, 1) });
      }
      for (var p = 0; p < Math.min(18, traces.length); p++) pulses.push({ tr: Math.floor(rnd(0, traces.length)), t: Math.random(), sp: rnd(.0012, .004) });
    }
    function draw(now) {
      if (!visible(canvas)) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx, time = (now - t0) / 1000;
      ctx.clearRect(0, 0, f.w, f.h);
      var px = (mouse.x - .5) * 18, py = (mouse.y - .5) * 18;
      traces.forEach(function (tr) {
        var ox = px * tr.depth, oy = py * tr.depth;
        ctx.beginPath();
        tr.pts.forEach(function (p, i) { i ? ctx.lineTo(p[0] + ox, p[1] + oy) : ctx.moveTo(p[0] + ox, p[1] + oy); });
        ctx.strokeStyle = 'rgba(212,175,55,' + (tr.a * .75) + ')';
        ctx.lineWidth = tr.w; ctx.stroke();
        tr.pts.forEach(function (p, i) {
          var isEnd = i === 0 || i === tr.pts.length - 1;
          ctx.fillStyle = 'rgba(212,175,55,' + (isEnd ? tr.a + .25 : tr.a * .9) + ')';
          if (tr.big && isEnd) { ctx.beginPath(); ctx.arc(p[0] + ox, p[1] + oy, 9 * tr.depth + 3, 0, 6.283); ctx.fill(); }
          else ctx.fillRect(p[0] + ox - tr.node / 2, p[1] + oy - tr.node / 2, tr.node, tr.node);
        });
      });
      // gezinen ışık darbeleri
      pulses.forEach(function (pu) {
        var tr = traces[pu.tr]; if (!tr) return;
        pu.t += pu.sp; if (pu.t > 1) { pu.t = 0; pu.tr = Math.floor(rnd(0, traces.length)); }
        var segCount = tr.pts.length - 1, ft = pu.t * segCount, si = Math.min(segCount - 1, Math.floor(ft)), lt = ft - si;
        var a = tr.pts[si], b = tr.pts[si + 1];
        var x = a[0] + (b[0] - a[0]) * lt + px * tr.depth, yy = a[1] + (b[1] - a[1]) * lt + py * tr.depth;
        var g = ctx.createRadialGradient(x, yy, 0, x, yy, 14);
        g.addColorStop(0, 'rgba(245,215,110,.9)'); g.addColorStop(1, 'rgba(245,215,110,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, 14, 0, 6.283); ctx.fill();
      });
      // yıldız tozu
      ctx.fillStyle = 'rgba(245,215,110,.35)';
      for (var i = 0; i < 40; i++) {
        var sx = (Math.sin(i * 12.9898) * .5 + .5) * f.w, sy = (Math.sin(i * 78.233) * .5 + .5) * f.h;
        var tw = .5 + .5 * Math.sin(time * 1.5 + i);
        ctx.globalAlpha = tw * .6; ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf(draw);
    }
    build(); raf(draw);
    addEventListener('resize', build);
    addEventListener('mousemove', function (e) { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; });
    // kaydırdıkça hero içeriği hafifçe geride kalsın
    if (!reduce) addEventListener('scroll', function () {
      var s = Math.min(1, scrollY / innerHeight);
      if (logo) logo.style.transform = 'scale(' + (1 - s * .15) + ') translateY(' + (s * 60) + 'px)';
      canvas.style.opacity = String(1 - s * .9);
    }, { passive: true });
  })();

  /* ---------- Kurs kapağı: mavi parçacık kapısı ---------- */
  (function cover() {
    var canvas = $('#coverCanvas'); if (!canvas) return;
    var parts = [];
    function build() { var f = fit(canvas); parts = []; for (var i = 0; i < 140; i++) parts.push({ x: rnd(0, f.w), y: rnd(0, f.h), r: rnd(.5, 2), v: rnd(.05, .35), h: Math.random() < .8 ? 215 : 265 }); }
    function draw() {
      if (!visible(canvas)) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx;
      var g = ctx.createLinearGradient(0, 0, 0, f.h); g.addColorStop(0, '#050a1a'); g.addColorStop(1, '#02040c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, f.w, f.h);
      // ızgara
      ctx.strokeStyle = 'rgba(80,140,255,.08)'; ctx.lineWidth = 1;
      for (var x = 0; x < f.w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, f.h); ctx.stroke(); }
      for (var yy = 0; yy < f.h; yy += 28) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(f.w, yy); ctx.stroke(); }
      parts.forEach(function (p) {
        p.y -= p.v; if (p.y < -4) { p.y = f.h + 4; p.x = rnd(0, f.w); }
        ctx.fillStyle = 'hsla(' + p.h + ',90%,70%,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
      if (!reduce) raf(draw);
    }
    build(); raf(draw); addEventListener('resize', build);
  })();

  /* ---------- FYOS sahnesi: canlı ağ ---------- */
  (function mesh() {
    var canvas = $('#meshCanvas'), area = $('#stageArea'); if (!canvas || !area) return;
    var nodes = [], edges = [], mouse = { x: -1, y: -1 }, hue = 190, targetHue = 190, t0 = performance.now();
    var pulse = 0;
    document.documentElement.style.setProperty('--mesh-hue', hue);

    function build() {
      var f = fit(canvas); nodes = []; edges = [];
      var n = Math.round(Math.min(160, (f.w * f.h) / 6500)), cx = f.w / 2, cy = f.h / 2;
      for (var i = 0; i < n; i++) {
        var ang = rnd(0, 6.283), rad = Math.pow(Math.random(), .6) * Math.min(f.w, f.h) * .42;
        nodes.push({ x: cx + Math.cos(ang) * rad * 1.35, y: cy + Math.sin(ang) * rad, bx: 0, by: 0, r: Math.random() < .08 ? rnd(5, 8) : rnd(1.5, 3.5), ph: rnd(0, 6.283), sp: rnd(.2, .6), hot: Math.random() < .12 });
      }
      nodes.forEach(function (a, i) { a.bx = a.x; a.by = a.y; });
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && Math.random() < .6) edges.push([i, j, d]);
      }
    }
    function draw(now) {
      if (!visible(canvas)) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx, time = (now - t0) / 1000;
      hue += (targetHue - hue) * .04; document.documentElement.style.setProperty('--mesh-hue', hue.toFixed(1));
      pulse *= .96;
      ctx.clearRect(0, 0, f.w, f.h);
      nodes.forEach(function (nd) {
        nd.x = nd.bx + Math.sin(time * nd.sp + nd.ph) * 6;
        nd.y = nd.by + Math.cos(time * nd.sp * .8 + nd.ph) * 6;
        if (mouse.x >= 0) { var dx = nd.x - mouse.x, dy = nd.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { var k = (120 - d) / 120 * 14; nd.x += dx / d * k; nd.y += dy / d * k; } }
      });
      var base = 'hsla(' + hue + ',85%,';
      edges.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]];
        ctx.strokeStyle = base + '65%,' + (.08 + (1 - e[2] / 120) * .22 + pulse * .2) + ')'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      nodes.forEach(function (nd) {
        if (nd.hot || nd.r > 4) {
          var g = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, nd.r * 4);
          g.addColorStop(0, base + '70%,.35)'); g.addColorStop(1, base + '70%,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * 4, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = nd.hot ? 'hsla(' + (hue + 140) + ',85%,72%,.95)' : base + '72%,.9)';
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, 6.283); ctx.fill();
      });
      if (!reduce) raf(draw);
    }
    build(); raf(draw); addEventListener('resize', build);
    area.addEventListener('mousemove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    area.addEventListener('mouseleave', function () { mouse.x = -1; mouse.y = -1; });
    area.addEventListener('click', function () { targetHue = (targetHue + 47) % 360; pulse = 1; });
    window.FYOS = { setHue: function (h) { targetHue = h; pulse = 1; }, ping: function () { pulse = 1; } };
  })();

  /* ---------- FYOS: ses çubuğu ---------- */
  (function voice() {
    var canvas = $('#voiceCanvas'); if (!canvas) return;
    var t0 = performance.now(), level = .35; window.FYOS_voice = function (l) { level = l; };
    function draw(now) {
      if (!visible(canvas)) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx, time = (now - t0) / 1000, bars = 36, gap = 3, bw = (f.w - gap * (bars - 1)) / bars;
      var hue = getComputedStyle(document.documentElement).getPropertyValue('--mesh-hue') || 190;
      ctx.clearRect(0, 0, f.w, f.h);
      for (var i = 0; i < bars; i++) {
        var c = Math.abs(i - bars / 2) / (bars / 2);
        var amp = (1 - c * .8) * (0.25 + level * Math.abs(Math.sin(time * 2.2 + i * .55)) * 0.75);
        var h = Math.max(2, amp * f.h);
        ctx.fillStyle = 'hsla(' + hue + ',85%,65%,' + (.35 + amp * .6) + ')';
        ctx.fillRect(i * (bw + gap), (f.h - h) / 2, bw, h);
      }
      if (!reduce) raf(draw);
    }
    raf(draw);
  })();

  /* ---------- FYOS: sohbet (çevrimdışı demo) ----------
     Gerçek bir modele bağlamak için reply() içindeki yanıt üretimini
     kendi API çağrınla değiştir. */
  (function ask() {
    var form = $('#askForm'), input = $('#askInput'), send = $('#askSend'), out = $('#askReply'), sub = $('#stageSub'), left = $('#askLeft');
    if (!form) return;
    var quota = 4, key = 'fyos-quota-' + new Date().toISOString().slice(0, 10);
    try { quota = Math.max(0, 4 - (parseInt(localStorage.getItem(key) || '0', 10))); } catch (e) {}
    if (left) left.textContent = quota;
    input.addEventListener('input', function () { send.disabled = !input.value.trim() || quota <= 0; });
    var canned = [
      ['site|web|landing|sayfa', 'Site için üç paketimiz var: Temel, Profesyonel ve Uzman. En çok Profesyonel (site + CRM) tercih ediliyor. İstersen iletişim formundan bir görüşme ayıralım.'],
      ['kurs|eğitim|bölüm|fiyat|ücret', 'Yapay Zekâ Yolculuğu 7 bölümlük, tamamen proje odaklı bir kurs. Sıfırdan başlar; prompt, n8n, Claude Code, site ve CRM kurma, video ve pazarlamayla biter. Fiyatı sayfada, eğitim bölümünde.'],
      ['otomasyon|n8n|ajan|bot|crm', 'Tekrar eden işleri ajanlara devrediyoruz: DM yanıtları, müşteri adayı puanlama, raporlama, CRM eşitleme. Ücretsiz görüşmede hangi darboğazın önce çözüleceğine birlikte karar veririz.'],
      ['claude|skill|kod', 'Claude Code kursun 4. bölümünün konusu: skill yazımı, alt ajanlar ve kalıcı hafıza. Bu sitedeki FYOS demosunun mantığı da orada anlatılıyor.'],
      ['kim|sen|nesin|fyos', 'Ben FYOS — FY\'nin ajantik işletim sistemi demosuyum. Ajanlar, koçlar, hafıza, beceriler ve bilgi grafiğinden oluşan bir ağın küçük bir örneği. Kursun 5. bölümünde kendi sürümünü kuruyorsun.'],
      ['merhaba|selam|hey|nasıl', 'Merhaba! Çevrimiçiyim. Site, kurs, otomasyon ya da FYOS hakkında sorabilirsin.']
    ];
    function reply(q) {
      var lq = q.toLowerCase();
      for (var i = 0; i < canned.length; i++) if (new RegExp(canned[i][0]).test(lq)) return canned[i][1];
      return 'Anladım: «' + q + '». Bu demo sürümü sınırlı yanıt veriyor; ayrıntı için iletişim formundan yaz, gerçek bir insan yanıtlar.';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim(); if (!q || quota <= 0) return;
      quota--; if (left) left.textContent = quota;
      try { localStorage.setItem(key, String(4 - quota)); } catch (er) {}
      input.value = ''; send.disabled = true;
      if (sub) sub.textContent = 'Düşünüyorum…';
      if (window.FYOS) window.FYOS.ping(); if (window.FYOS_voice) window.FYOS_voice(1);
      out.textContent = '';
      var text = reply(q), i = 0;
      setTimeout(function type() {
        out.innerHTML = '<strong>FYOS:</strong> ' + text.slice(0, i);
        if (i++ < text.length) setTimeout(type, 14);
        else { if (sub) sub.textContent = quota > 0 ? 'Başka bir şey sor.' : 'Bugünlük bu kadar — yarın yine buradayım.'; if (window.FYOS_voice) window.FYOS_voice(.35); }
      }, 500);
    });
  })();

  /* ---------- Sekmeler: renk tonu değiştirir ---------- */
  $$('#tabs .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('#tabs .tab').forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      if (window.FYOS) window.FYOS.setHue(parseInt(tab.dataset.hue, 10));
      var sub = $('#stageSub'); if (sub) sub.textContent = tab.title + '.';
    });
  });

  /* ---------- Beyin: bilgi grafiği ---------- */
  (function brain() {
    var canvas = $('#brainCanvas'); if (!canvas) return;
    var pts = [], t0 = performance.now();
    function build() {
      var f = fit(canvas); pts = [];
      var cx = f.w * .5, cy = f.h * .5, n = 900;
      for (var i = 0; i < n; i++) {
        var cl = Math.random();
        var ox = cl < .75 ? 0 : (cl < .9 ? f.w * .28 : -f.w * .3), oy = cl < .75 ? 0 : (cl < .9 ? -f.h * .22 : f.h * .25);
        var ang = rnd(0, 6.283), rad = Math.pow(Math.random(), .5) * (cl < .75 ? f.h * .36 : f.h * .13);
        pts.push({ x: cx + ox + Math.cos(ang) * rad, y: cy + oy + Math.sin(ang) * rad, r: Math.random() < .04 ? rnd(2, 3.5) : rnd(.6, 1.4), a: rnd(.25, .9), ph: rnd(0, 6.283) });
      }
    }
    function draw(now) {
      if (!visible(canvas)) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx, time = (now - t0) / 1000;
      ctx.fillStyle = '#0d0d0f'; ctx.fillRect(0, 0, f.w, f.h);
      ctx.strokeStyle = 'rgba(200,200,215,.08)'; ctx.lineWidth = .5;
      for (var i = 0; i < pts.length; i += 3) { var a = pts[i], b = pts[(i * 7 + 13) % pts.length]; var dx = a.x - b.x, dy = a.y - b.y; if (dx * dx + dy * dy < 2600) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      pts.forEach(function (p) {
        var tw = .6 + .4 * Math.sin(time * .8 + p.ph);
        ctx.fillStyle = p.r > 2 ? 'rgba(34,211,238,' + (p.a * tw) + ')' : 'rgba(225,225,235,' + (p.a * tw * .8) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
      if (!reduce) raf(draw);
    }
    build(); raf(draw); addEventListener('resize', build);
  })();

  /* ---------- Otomasyon akışı: bağlantı çizgileri ---------- */
  (function flow() {
    var wrap = $('#flow'), g = $('#flowPaths'); if (!wrap || !g) return;
    // kartlar: (x%, y%, genişlik%) — sol kartların sağ kenarından sağ kartların sol kenarına
    var cards = [[0, 10, 46], [54, 30, 46], [0, 50, 46], [54, 70, 46], [0, 90, 46]];
    var d = '';
    for (var i = 0; i < cards.length - 1; i++) {
      var a = cards[i], b = cards[i + 1];
      var ax = a[0] === 0 ? a[2] : a[0], ay = a[1], bx = b[0] === 0 ? b[2] : b[0], by = b[1];
      var mx = (ax + bx) / 2;
      d += 'M' + ax + ' ' + ay + ' C' + mx + ' ' + ay + ' ' + mx + ' ' + by + ' ' + bx + ' ' + by + ' ';
    }
    g.innerHTML = '<path d="' + d + '"/><path class="glow" d="' + d + '"/>';
    var cardsEl = $$('.step__card', wrap);
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { cardsEl.forEach(function (c, i) { setTimeout(function () { c.classList.add('is-in'); }, 120 * i); }); io.disconnect(); } }, { threshold: .3 });
      io.observe(wrap);
    } else cardsEl.forEach(function (c) { c.classList.add('is-in'); });
  })();

  /* ---------- SSS akordeonu ---------- */
  (function faq() {
    var items = $$('.faq-item'); if (!items.length) return;
    function open(item, yes) {
      var panel = $('.faq-item__panel', item), btn = $('.faq-item__btn', item);
      item.classList.toggle('is-open', yes); btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
      if (yes) { panel.style.height = panel.scrollHeight + 'px'; panel.style.opacity = '1'; panel.addEventListener('transitionend', function te() { if (item.classList.contains('is-open')) panel.style.height = 'auto'; panel.removeEventListener('transitionend', te); }); }
      else { panel.style.height = panel.scrollHeight + 'px'; raf(function () { panel.style.height = '0px'; panel.style.opacity = '0'; }); }
    }
    items.forEach(function (item) {
      var panel = $('.faq-item__panel', item);
      if (item.classList.contains('is-open')) { panel.style.height = 'auto'; panel.style.opacity = '1'; }
      $('.faq-item__btn', item).addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        items.forEach(function (o) { if (o !== item && o.classList.contains('is-open')) open(o, false); });
        open(item, !isOpen);
      });
    });
  })();

  /* ---------- Formlar (sunucusuz: mailto ile devam) ---------- */
  function wireForm(id, statusId, subject, extra) {
    var form = $('#' + id), status = $('#' + statusId); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { status.textContent = 'Lütfen yıldızlı alanları doldur.'; form.reportValidity(); return; }
      var fd = new FormData(form), lines = [];
      fd.forEach(function (v, k) { if (typeof v === 'string' && v.trim()) lines.push(k + ': ' + v.trim()); });
      if (extra) lines.push('', extra);
      status.textContent = extra ? 'E-posta uygulaman açılıyor — özgeçmişini ek olarak eklemeyi unutma.' : 'Teşekkürler — mesajın hazırlandı, e-posta uygulaman açılıyor.';
      location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.reset(); var fn = $('#jFileName'); if (fn) fn.textContent = 'Dosya seç…';
    });
  }
  wireForm('contactForm', 'contactStatus', 'FY — iletişim formu');
  wireForm('joinForm', 'joinStatus', 'FY — özgeçmiş başvurusu', 'Özgeçmiş: lütfen bu e-postaya dosya olarak ekleyin.');
  var jf = $('#jFile'), jn = $('#jFileName');
  if (jf && jn) jf.addEventListener('change', function () { jn.textContent = jf.files[0] ? jf.files[0].name : 'Dosya seç…'; jn.classList.toggle('text-dim', !jf.files[0]); });

  /* ---------- Sayfa içi bağlantılarda sabit çubuk payı ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), el = id && document.getElementById(id);
      if (!el) return; e.preventDefault();
      var top = el.getBoundingClientRect().top + scrollY - 64;
      scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
    });
  });
})();
