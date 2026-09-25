/* FY — Yapay Zekâ Ajansı · ana betik
   Bölümler: üst çubuk, mobil menü, görünürlük animasyonu, hero devre ağı,
   kurs kapağı, FYOS sahnesi (ağ, ses dalgası, baloncuklu sohbet), sekmeler,
   otomasyon yolculuk şeması, SSS akordeonu, formlar. Bağımlılık yok. */
(function () {
  'use strict';
  // Betik çalışıyor: giriş animasyonlarının gizlemesi ancak bu sınıfla devreye girer (css: ".js …").
  // Betik yüklenmez ya da ayrıştırılamazsa sınıf eklenmez, sayfa olduğu gibi görünür kalır.
  document.documentElement.classList.add('js');
  // Metinler: Türkçe varsayılanlar bu dosyada; diğer diller js/lang/<dil>.js ile window.FY_STRINGS'e yazılır
  // (i18n/<dil>.json → tools/build-i18n.mjs). Dil dosyası yüklenmezse Türkçe kalır.
  var T = window.FY_STRINGS || {};
  function t(k, tr) { return T[k] != null ? T[k] : tr; }
  // Bu betiğin bulunduğu kök: sonradan yüklenen dosyalar (js/fyos-local.js) sayfanın değil betiğin konumuna göre
  // çözülür; böylece de/ en/ fa/ altındaki üretilmiş sayfalarda da doğru yol bulunur.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) ? document.currentScript.src : '';
  var SCRIPT_BASE = SCRIPT_SRC.replace(/js\/main\.js(\?.*)?$/, '');
  /* Sürüm damgası: main.js kendi adresinde ?v=… ile geldiyse sonradan yüklenen betikler de onu
     taşır. Yoksa main.js tazelenirken js/fyos-voice.js eski kalabiliyordu. Damgayı üreten
     tools/lib/stamp.mjs; damga yokken boş dize kalır ve adresler bugünküyle birebir aynıdır. */
  var ASSET_Q = (SCRIPT_SRC.match(/js\/main\.js(\?[^#]*)/) || ['', ''])[1] || '';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame;
  // FYOS gerçek yapay zekâ ara sunucusu (bkz. worker/README.md). Boş bırakılırsa çevrimdışı demo çalışır.
  var FYOS_ENDPOINT = 'https://fy-ajans.ferhatyasinoglu.workers.dev';
  // Sesli yanıt ucu (worker'ın /tts yolu): yanıtları gerçek bir insan sesiyle okutur.
  // Boş bırakılırsa FYOS_ENDPOINT'ten türetilir; ikisi de boşsa tarayıcının kendi sesi kullanılır.
  var FYOS_VOICE_ENDPOINT = 'https://fy-ajans.ferhatyasinoglu.workers.dev/tts';
  /* Tarayıcı sesini elle sabitlemek için: adın bir parçası yeter ("Emel", "Yelda"…).
     Boşsa ses kendiliğinden seçilir ve kadın sesi tercih edilir. Cihazdaki sesleri görmek
     için konsola: FYOS_VOICE.voices().then(console.log) */
  var FYOS_VOICE_NAME = '';
  /* Tarayıcı sesinin perdesi.
     'auto' (varsayılan): cihazda kadın ses bulunamazsa erkek sesin perdesi yükseltilir,
     bulunursa sese hiç dokunulmaz. Bir sayı verilirse (1 = sesin kendi perdesi) her sesde
     o kullanılır; 1 yazmak inceltmeyi tümden kapatır.
     Dürüst olalım: bu incelmiş bir erkek sesidir, kadın sesi değil. Her cihazda gerçek bir
     genç kadın sesi için worker'a seslendirme anahtarı gerekir (worker/README.md). */
  var FYOS_VOICE_PITCH = 'auto';
  // Tarayıcı içi ücretsiz model (WebGPU). Kapatmak için false yap. Model adları: https://mlc.ai/models
  var FYOS_LOCAL_AI = true;
  var FYOS_LOCAL_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';       // masaüstü (~1 GB, bir kez iner)
  var FYOS_LOCAL_MODEL_SMALL = '';                                   // telefon / düşük bellek: boş = model indirme, hazır yanıtlı demo kullan (0.5B modelin Türkçesi yetersiz)

  /* ---------- Yıl ---------- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- E-posta: adres HTML'de düz metin durmaz, burada birleşir ---------- */
  var MAIL = ['farhadyaqoobi.kunduz', 'gmail.com'].join('@');
  $$('[data-mail]').forEach(function (a) {
    var subj = a.getAttribute('data-mail');
    a.setAttribute('href', 'mailto:' + MAIL + (subj ? '?subject=' + encodeURIComponent(subj) : ''));
  });
  $$('[data-mail-text]').forEach(function (el) { el.textContent = MAIL; });

  /* ---------- Üst çubuk ---------- */
  var nav = $('#nav');
  if (nav) raf(function () { nav.classList.add('is-ready'); });

  var burger = $('#burger'), menu = $('#mobileMenu');
  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? t('menuClose', 'Menüyü kapat') : t('menuOpen', 'Menüyü aç'));
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

  // Ağdan bir karta paket ulaştığında çağrılır; aşağıdaki istatistik bölümü doldurur.
  var onDeliver = null;

  /* ---------- Hero: altın devre ağı ---------- */
  (function hero() {
    var canvas = $('#heroCanvas'), logo = $('#heroLogo');
    if (!canvas) return;
    // Logo ilk boyamadan itibaren görünür (css .hero__logo); betik beklenmiyor. Kutunun transform'u yalnız aşağıdaki eğim + kaydırma için.
    var traces = [], pulses = [], mouse = { x: 0.5, y: 0.5 }, t0 = performance.now();
    var cell = 44;
    // Logo dönüşümü iki parçadan birleşir: kaydırma (ölçek + kayma) ve fare eğimi (3B). Azaltılmış hareket: ikisi de kapalı.
    var scrollT = '', tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    function applyLogo() {
      if (!logo) return;
      logo.style.transform = scrollT + (tilt.x || tilt.y ? ' rotateX(' + tilt.y.toFixed(2) + 'deg) rotateY(' + tilt.x.toFixed(2) + 'deg)' : '');
    }

    /* Ölçü ve görünürlük her karede okunmuyor. fit() ile visible() getBoundingClientRect
       çağırıyor; açılış geçişleri düzeni kirli tutarken bu, her karede zorunlu bir yeniden
       düzenleme demekti (PSI: main.js:99 ve :109 kare başına). Görünürlüğü IntersectionObserver
       bildiriyor; ölçü yarım saniyede bir tazeleniyor ki yazı tipi yüklenmesi gibi sessiz
       kaymalar kaçmasın. IntersectionObserver yoksa görünürlük de aynı turda yoklanır. */
    var F = null, shown = true, tick = 0, hasIO = 'IntersectionObserver' in window;
    function measure() { F = fit(canvas); if (!hasIO) shown = visible(canvas); }
    if (hasIO) new IntersectionObserver(function (es) { shown = es[es.length - 1].isIntersecting; }).observe(canvas);

    function build() {
      measure(); var f = F; traces = []; pulses = [];
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
      if (++tick >= 30) { tick = 0; measure(); }
      if (!shown) { raf(draw); return; }
      var f = F, ctx = f.ctx, time = (now - t0) / 1000;
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
      // fare eğimi yumuşakça hedefe yaklaşır
      if (!reduce && logo && (Math.abs(tilt.tx - tilt.x) > .01 || Math.abs(tilt.ty - tilt.y) > .01)) {
        tilt.x += (tilt.tx - tilt.x) * .08; tilt.y += (tilt.ty - tilt.y) * .08; applyLogo();
      }
      if (!reduce) raf(draw);
    }
    build(); raf(draw);
    addEventListener('resize', build);
    // Eğim yalnız gerçek imleçle: dokunmatikte tarayıcı her dokunuşa sahte mousemove üretir ve logo eğik kalırdı
    var finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
    addEventListener('mousemove', function (e) {
      mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight;
      if (!finePointer || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) return;
      tilt.tx = (mouse.x - .5) * 16; tilt.ty = -(mouse.y - .5) * 12;
    });
    document.documentElement.addEventListener('mouseleave', function () { tilt.tx = 0; tilt.ty = 0; });
    addEventListener('touchstart', function () { tilt.tx = 0; tilt.ty = 0; }, { passive: true });
    // kaydırdıkça hero içeriği hafifçe geride kalsın
    if (!reduce) addEventListener('scroll', function () {
      var s = Math.min(1, scrollY / innerHeight);
      scrollT = 'scale(' + (1 - s * .15) + ') translateY(' + (s * 60) + 'px)';
      applyLogo();
      canvas.style.opacity = String(1 - s * .9);
    }, { passive: true });
  })();

  /* ---------- Kurs kapağı: imleç paralaksı (yalnız gerçek imleç) ----------
     Sahne, halka, duraklar, logo ve başlık --px/--py ile derinliğine göre kayar (css .cover*). Dokunmatikte kapalı. */
  (function cover() {
    var els = $$('[data-cover]'); if (!els.length) return;
    if (reduce || !(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    els.forEach(function (el) {
      var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, running = false;
      function step() {
        cur.x += (tgt.x - cur.x) * .08; cur.y += (tgt.y - cur.y) * .08;
        el.style.setProperty('--px', cur.x.toFixed(3)); el.style.setProperty('--py', cur.y.toFixed(3));
        if (Math.abs(tgt.x - cur.x) > .002 || Math.abs(tgt.y - cur.y) > .002) raf(step); else running = false;
      }
      function kick() { if (!running) { running = true; raf(step); } }
      el.addEventListener('mousemove', function (e) {
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        var r = el.getBoundingClientRect(); if (!r.width) return;
        tgt.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
        tgt.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
        kick();
      });
      el.addEventListener('mouseleave', function () { tgt.x = 0; tgt.y = 0; kick(); });
    });
  })();

  /* ---------- FYOS sahnesi: canlı ağ + ses dalgası ----------
     Dört durum (idle/thinking/speaking/listening), kendi kendine renk gezintisi,
     dokununca su gibi yayılan halka, lifler üzerinde akan ışık paketleri,
     rastgele kıvılcımlar ve iz bırakan çizim. */
  (function mesh() {
    var canvas = $('#meshCanvas'), area = $('#stageArea'), voiceC = $('#voiceCanvas');
    if (!canvas || !area) return;
    /* «scan»: parlaklığın kümeler arasında dolaşması — düşünürken sahne gerçekten çalışıyor
       gibi görünsün diye. «packets»: aynı anda akan ışık paketi sayısı; eskiden her durumda
       sabit 10'du, yani durum değişimi yoğunlukta hiç karşılık bulmuyordu.
       listening artık UYANIK okunuyor: ziyaretçi konuşurken sahnenin kararıp yavaşlaması
       (bright .72, speed .55) yanlış bir işaretti — dinleyen bir şey uyanık durur. */
    var STATES = {
      idle:      { speed: 1,   fireEvery: 3,   bright: 1,    waveAmp: .25, waveFreq: 1,   shimmer: 0,   scan: 0,   packets: 10 },
      thinking:  { speed: 2,   fireEvery: 1.1, bright: 1.3,  waveAmp: .35, waveFreq: 1.6, shimmer: .3,  scan: 1,   packets: 17 },
      speaking:  { speed: 1.4, fireEvery: 2,   bright: 1.35, waveAmp: 1,   waveFreq: 2.2, shimmer: 1,   scan: 0,   packets: 13 },
      listening: { speed: .85, fireEvery: 2.4, bright: 1.12, waveAmp: .55, waveFreq: .9,  shimmer: .15, scan: .35, packets: 8 }
    };
    /* Dolaşan küresel ton. Değerlerin çoğu sekmelerin data-hue'suyla aynı (Terminal 187,
       Memory 270, Studio 330, Coaches 38); 210 ve 160 aradaki boşlukları kapatıyor ki
       tur soğuk-sıcak dengesini korusun. */
    var PALETTE = [187, 210, 270, 300, 160, 330, 38];
    /* Karede çok renk. Bunlar sitenin ZATEN kullandığı alt sistem renkleri (sekmelerdeki ve
       HUD kartlarındaki palet): Agents, Studio, Coaches, Memory, Skills, Knowledge.
       Ağ bu tonları aynı anda taşır ama hepsi küresel tonun ±TINT_SPREAD derecelik kuşağında
       kalır — sahne tek bir ruh hâlinde kalır, konfetiye dönmez. */
    var TINT_HUES = [24, 38, 199, 255, 270, 330];        // ton sırasına dizili: kümeler merkez çevresinde yumuşak bir kuşak oluşturur
    var TINTS = TINT_HUES.length, TINT_SPREAD = 52;
    var tintHue = [], tintAdd = [], tintSlot = [];       // tintHue/tintAdd her karede bir kez hesaplanır
    for (var ti0 = 0; ti0 < TINTS; ti0++) {
      tintHue.push(0); tintAdd.push(0);
      /* Kümenin küresel tondan sabit sapması. Marka tonuna doğrudan kenetlemek (ör. «en fazla
         52 derece yaklaş») altı kümeyi üç değere çökertiyordu; eşit aralıklı yuva hem altısını
         da ayrı tutuyor hem de ton gezinirken hiçbir sıçrama üretmiyor. */
      tintSlot.push((ti0 / (TINTS - 1) - .5) * 2 * TINT_SPREAD);
    }
    var BADGE = { idle: t('badgeIdle', 'Canlı ve çevrimiçi'), thinking: t('badgeThinking', 'Düşünüyorum…'), speaking: t('badgeSpeaking', 'Yanıt veriyorum'), listening: t('badgeListening', 'Dinliyorum') };
    var badge = $('#liveState');

    var seed = 1337;
    function srnd() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    function gauss() { return (srnd() + srnd() + srnd() + srnd() - 2) / 2; }

    var nodes = [], edges = [], packets = [], sparks = [], ripples = [];
    var linkC = $('#linkCanvas'), links = [], flows = [], linksReady = false;
    for (var i = 0; i < 80; i++) {
      var hub = i < 8;
      var nbx = .5 + .42 * gauss(), nby = .5 + .4 * gauss();
      var nr = hub ? 6 + 2 * srnd() : 1.5 + 2.5 * srnd();
      var sA = 1000 * srnd(), sB = 1000 * srnd();
      /* srnd() burada da bir kez tüketiliyor: eskiden «purple» bayrağını üretiyordu.
         Tüketmezsek tohum sırası kayar ve ağın yerleşimi tamamen değişirdi. */
      var jit = srnd();
      /* Küme: düğümün merkeze göre açısı. Kartlar da çevreye açıyla dizildiği için kümeler
         kendiliğinden kartlarla hizalanır; buildLinks'e bağlanmadığı için telefonda da çalışır. */
      var ang = Math.atan2(nby - .5, nbx - .5) + Math.PI + (jit - .5) * .35;
      nodes.push({
        bx: nbx, by: nby, x: 0, y: 0, r: nr, hub: hub, seedA: sA, seedB: sB,
        tint: Math.floor(ang / (2 * Math.PI) * TINTS + TINTS) % TINTS
      });
    }

    var w = 0, h = 0;
    /* Dar ve uzun ekranda taban yerleşim dikey bir şeride sıkışıyor (bx/by kare bir alan için
       ölçülmüş). Yatay yayılım en-boy oranına göre açılır; kenarları maske zaten söndürüyor. */
    var spreadX = 1;
    function nodeX(nd) { return (.5 + (nd.bx - .5) * spreadX) * w; }
    /* fit() her çağrıda getBoundingClientRect() okuyor, yani düzeni zorluyor — üstelik karede
       üç ayrı tuval için. Ölçü yalnızca pencere boyutuyla değişir; yine de yazı tipi yüklenmesi
       gibi sessiz kaymaları kaçırmamak için yarım saniyede bir tazelenir. Ölçü tazelenmediğinde
       dönüşüm matrisine de dokunmaya gerek yok: bu dosyada başka hiçbir yer onu değiştirmiyor. */
    var fitRound = 0, fitFrame = 0, fitCache = [];
    /* offsetParent okuması da düzeni zorluyor. Bir tuvalin görünürlüğü kare kare değişmez,
       o yüzden fit ölçüsüyle aynı turda, yarım saniyede bir bakılır. */
    var shownRound = -1, shownLink = false;
    function linkShown() {
      if (shownRound !== fitRound) { shownRound = fitRound; shownLink = !!(linkC && linkC.offsetParent); }
      return shownLink;
    }
    /* Sahne ekranda mı: IntersectionObserver söyler; yoksa fit turuyla aynı kadansta visible()
       ile bakılır. Eskiden her karede getBoundingClientRect okunuyordu — sahne ekranın çok
       altındayken bile, yani bütün açılış boyunca boşuna zorunlu yeniden düzenleme. */
    var meshIO = 'IntersectionObserver' in window, meshVis = !meshIO, meshRound = -1;
    if (meshIO) new IntersectionObserver(function (es) { meshVis = es[es.length - 1].isIntersecting; }).observe(canvas);
    function meshShown() {
      if (!meshIO && meshRound !== fitRound) { meshRound = fitRound; meshVis = visible(canvas); }
      return meshVis;
    }
    function fitC(c) {
      var e = null;
      for (var i = 0; i < fitCache.length; i++) if (fitCache[i].c === c) { e = fitCache[i]; break; }
      if (!e) { e = { c: c, round: -1, f: null }; fitCache.push(e); }
      if (e.round !== fitRound) { e.round = fitRound; e.f = fit(c); }
      return e.f;
    }
    function buildEdges() {
      edges = [];
      var s2 = 4242, rr = function () { s2 = s2 * 16807 % 2147483647; return (s2 - 1) / 2147483646; };
      spreadX = w && h ? Math.min(1.25, Math.max(1, Math.sqrt(h / w))) : 1;
      var reach = .24 * Math.min(w, h);
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var d = Math.hypot((nodes[i].bx - nodes[j].bx) * spreadX * w, (nodes[i].by - nodes[j].by) * h);
        if (d < reach && rr() < .55) {
          var cp = (rr() - .5) * d * .55, rv = rr();
          /* Kenarın tonu: iki ucu aynı kümedeyse o küme. Farklı kümelerdeyse çoğunlukla
             nötr (-1 = küresel ton) kalır; kümelerin içi renklenir, araları bağ dokusu olur. */
          var et = nodes[i].tint === nodes[j].tint ? nodes[i].tint : (rv < .3 ? (rv < .15 ? nodes[i].tint : nodes[j].tint) : -1);
          edges.push({ a: i, b: j, cpOff: cp, alpha: Math.max(.05, .35 * (1 - d / reach)), tint: et });
        }
      }
    }

    /* ---------- Ağ ile kartlar arasındaki omurga bağlantıları ----------
       Her kart, ağın içindeki kendisine en yakın düğüme bir kabloyla bağlanır. Kablo üzerinde
       akan paket karta ulaşınca kart o işi işliyormuş gibi canlanır (bkz. css ".hud.is-hit").
       Kartlar 768px altında gizli olduğundan orada bağlantı da kurulmaz. */
    function buildLinks() {
      links = []; flows = []; linksReady = true;
      if (!linkC || !w || !h) return;
      var ar = area.getBoundingClientRect(), cx = w / 2, cy = h / 2;
      $$('.hud', area).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;                      // gizli kart: bağlantı yok
        var x0 = r.left - ar.left, y0 = r.top - ar.top;
        // Kablonun karta girdiği yer: kartın merkeze bakan kenarı
        var px = Math.min(Math.max(cx, x0), x0 + r.width);
        var py = Math.min(Math.max(cy, y0), y0 + r.height);
        if (cx < x0) px = x0; else if (cx > x0 + r.width) px = x0 + r.width;
        if (cy < y0) py = y0; else if (cy > y0 + r.height) py = y0 + r.height;

        // Ağın içinde bu karta en yakın düğüm: kablonun çıkış geçidi
        var gate = 0, gd = Infinity, lim = Math.min(w, h) * .42;
        for (var i = 0; i < nodes.length; i++) {
          var nx = nodes[i].bx * w, ny = nodes[i].by * h;
          if (Math.hypot(nx - cx, ny - cy) > lim) continue;      // uçtaki düğümler geçit olamaz
          var d = Math.hypot(nx - px, ny - py);
          if (d < gd) { gd = d; gate = i; }
        }
        var c = (getComputedStyle(el).getPropertyValue('--c') || '').trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(c)) c = '#38BDF8';
        links.push({
          el: el, key: el.getAttribute('data-stat') || '', gate: gate, px: px, py: py, color: c,
          curve: (Math.random() - .5) * .22, next: .6 + Math.random() * 2.2
        });

        var port = $('.hud__port', el);
        if (!port) { port = document.createElement('i'); port.className = 'hud__port'; el.appendChild(port); }
        port.style.left = (px - x0 - 3.5) + 'px';
        port.style.top = (py - y0 - 3.5) + 'px';
      });
    }
    function linkPath(L) {
      var g = nodes[L.gate];
      var dx = L.px - g.x, dy = L.py - g.y, dd = Math.hypot(dx, dy) || 1, off = dd * L.curve;
      return { ax: g.x, ay: g.y, bx: L.px, by: L.py,
        cx: (g.x + L.px) / 2 + -dy / dd * off, cy: (g.y + L.py) / 2 + dx / dd * off };
    }
    function onPath(P, t) {
      var m = 1 - t;
      return { x: m * m * P.ax + 2 * m * t * P.cx + t * t * P.bx, y: m * m * P.ay + 2 * m * t * P.cy + t * t * P.by };
    }
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function fireFlow(L, dir) { if (flows.length < 24) flows.push({ L: L, t: 0, dir: dir, speed: .5 + Math.random() * .35 }); }
    function landed(L) {
      L.el.classList.add('is-hit');
      clearTimeout(L.hitT);
      L.hitT = setTimeout(function () { L.el.classList.remove('is-hit'); }, 1100);
      if (onDeliver) onDeliver(L.key);
      setTimeout(function () {                                   // iş bitti, yanıt merkeze döner
        if (links.indexOf(L) >= 0) fireFlow(L, -1);              // arada yeniden kurulduysa bırak
      }, 420);
    }
    /* Karttan dönen yanıt ağa varınca geçit düğümünde küçük bir parlama bırakır.
       Eskiden sessizce yok oluyordu: gidiş görünür, dönüş görünmezdi. */
    function returned(L) {
      var g = nodes[L.gate];
      if (g) sparks.push({ x: g.x, y: g.y, r: 2, max: 22 + 10 * Math.random(), alpha: .6, tint: g.tint });
    }
    function drawLinks(lc, lw, lh, dt) {
      lc.clearRect(0, 0, lw, lh);
      for (var li = 0; li < links.length; li++) {
        var L = links[li], P = linkPath(L), live = L.el.classList.contains('is-hit');
        var grad = lc.createLinearGradient(P.ax, P.ay, P.bx, P.by);
        grad.addColorStop(0, hexA(L.color, live ? .10 : .05));
        grad.addColorStop(.55, hexA(L.color, live ? .40 : .20));
        grad.addColorStop(1, hexA(L.color, live ? .85 : .55));
        lc.strokeStyle = grad; lc.lineWidth = live ? 1.5 : 1;
        lc.beginPath(); lc.moveTo(P.ax, P.ay); lc.quadraticCurveTo(P.cx, P.cy, P.bx, P.by); lc.stroke();
        lc.strokeStyle = hexA(L.color, .5); lc.lineWidth = 1;
        lc.beginPath(); lc.arc(P.ax, P.ay, 4.5, 0, 6.283); lc.stroke();
        if (dt && (L.next -= dt) <= 0) { L.next = 1.4 + Math.random() * 3.2; fireFlow(L, 1); }
      }
      if (!dt) return;
      for (var fi = flows.length - 1; fi >= 0; fi--) {
        var F = flows[fi];
        F.t += dt * F.speed;
        if (F.t >= 1) {
          flows.splice(fi, 1);
          if (F.dir === 1) landed(F.L);
          else returned(F.L);                                    // yanıt merkeze ulaştı: küçük bir karşılık
          continue;
        }
        var FP = linkPath(F.L), ft = F.dir === 1 ? F.t : 1 - F.t;
        for (var k = 1; k < 7; k++) {                             // kuyruk
          var kt = ft - k * .022 * F.dir;
          if (kt < 0 || kt > 1) continue;
          var kp = onPath(FP, kt);
          lc.fillStyle = hexA(F.L.color, (1 - k / 7) * .55);
          lc.beginPath(); lc.arc(kp.x, kp.y, 1.3, 0, 6.283); lc.fill();
        }
        var hp = onPath(FP, ft);
        lc.shadowColor = F.L.color; lc.shadowBlur = 9;
        lc.fillStyle = hexA(F.L.color, .95);
        lc.beginPath(); lc.arc(hp.x, hp.y, 2.4, 0, 6.283); lc.fill();
        lc.shadowBlur = 0;
      }
    }

    var HUE_PERIOD = 10;                                 // sahibinin isteği: renk tam 10 saniyede bir değişir
    var hue = 187, hueTarget = 187, hueTimer = HUE_PERIOD, hueLast = -999;
    /* Ton sırası: palet turlar hâlinde, her tur karıştırılarak gezilir. Yerine koyarak
       seçilseydi ~%14 ihtimalle aynı ton gelir ve o 10 saniye hiç değişim görünmezdi. */
    var hueBag = [], hueBagAt = 0;
    function nextHue() {
      if (hueBagAt >= hueBag.length) {
        hueBag = PALETTE.slice();
        for (var i = hueBag.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)), tmp = hueBag[i];
          hueBag[i] = hueBag[j]; hueBag[j] = tmp;
        }
        // Tur başı, önceki turun sonuyla aynıysa bir sonrakiyle yer değiştirir
        if (hueBag.length > 1 && hueBag[0] === hueTarget) { var s0 = hueBag[0]; hueBag[0] = hueBag[1]; hueBag[1] = s0; }
        hueBagAt = 0;
      }
      return hueBag[hueBagAt++];
    }
    function col(l, a, off, sat) {
      return 'hsla(' + ((hue + (off || 0) + 360) % 360) + ',' + (sat || 85) + '%,' + l + '%,' + a + ')';
    }
    // Küme tonuyla renk. t < 0 ise nötr, yani küresel ton.
    function tcol(t, l, a) {
      return 'hsla(' + (t >= 0 ? tintHue[t] : ((hue + 360) % 360)).toFixed(1) + ',85%,'
        + (t >= 0 ? l + tintAdd[t] : l).toFixed(1) + '%,' + a + ')';
    }
    /* Kenar kovaları: (küme tonu + 1) × saydamlık kademesi. «+1» nötr kenarları 0. sıraya alır.
       Diziler bir kez kurulur, her karede length = 0 ile boşaltılır — kare başına ayırma yok. */
    var ASTEPS = 8, buckets = [], edgeCss = [];
    for (var bk = 0; bk < (TINTS + 1) * ASTEPS; bk++) { buckets.push([]); edgeCss.push(''); }
    /* Küme tonlarını ve kovaların hazır CSS dizelerini kare başına BİR kez üretir. */
    function refreshTints(scan, ph) {
      for (var i = 0; i < TINTS; i++) {
        /* Marka çekimi: küresel ton kümenin kendi rengine yaklaştıkça yuva bir miktar
           daralır — genliği yuva aralığının yarısından küçük tutulduğu için sıra hiç bozulmaz. */
        var pull = TINT_SPREAD * .18 * Math.sin((TINT_HUES[i] - hue) * Math.PI / 180);
        tintHue[i] = (hue + tintSlot[i] + pull + 360) % 360;
        // Tarama dalgası her kümeden sırayla geçer; küp alınarak dar bir tepeye dönüşür
        var c = scan ? Math.cos(((ph || 0) - i / TINTS) * 6.283) : 0;
        tintAdd[i] = c > 0 ? 10 * scan * c * c * c : 0;
      }
      for (var t = -1; t < TINTS; t++) {
        var hh = (t >= 0 ? tintHue[t] : (hue + 360) % 360).toFixed(1);
        var ll = (t >= 0 ? 60 + tintAdd[t] : 60).toFixed(1);
        for (var l = 0; l < ASTEPS; l++) {
          edgeCss[(t + 1) * ASTEPS + l] = 'hsla(' + hh + ',85%,' + ll + '%,' + ((l + .5) * .7 / ASTEPS).toFixed(3) + ')';
        }
      }
    }
    /* ---------- Zemin derinliği ----------
       Köşeler dümdüz siyahtı. Üç geniş, çok düşük alfalı leke sahneye derinlik veriyor.
       Her karede yeniden üretmek pahalı olurdu: çeyrek çözünürlüklü bir tuvale çizilip
       ton 8 dereceden fazla kayana kadar saklanıyor. Kare maliyeti tek drawImage.
       Tonlar küresel tonu İZLEMİYOR, ona doğru yalnızca biraz esniyor: zemin hep lacivert
       (+ bir köşede markanın altını) kalsın diye. Küresel tona bağlansaydı sahne sarıya
       geçtiğinde zemin de zeytin yeşiline dönüp çamurlaşıyordu.
       [x, y, yarıçap, taban ton, açıklık, alfa] — hepsi sahnenin kendi oranlarında. */
    var NEB = [[.16, .2, .66, 225, 28, .32], [.86, .8, .6, 209, 24, .28], [.66, .12, .42, 42, 26, .15]];
    var neb = null, nebHue = -999, nebW = 0, nebH = 0;
    function nebula() {
      if (!w || !h) return null;
      var moved = Math.abs(((hue - nebHue + 540) % 360) - 180);
      if (neb && nebW === w && nebH === h && moved < 8) return neb;
      if (!neb) neb = document.createElement('canvas');
      nebW = w; nebH = h; nebHue = hue;
      var sw = Math.max(1, Math.round(w / 4)), sh = Math.max(1, Math.round(h / 4));
      if (neb.width !== sw || neb.height !== sh) { neb.width = sw; neb.height = sh; }
      var nc = neb.getContext('2d');
      nc.clearRect(0, 0, sw, sh);
      for (var i = 0; i < NEB.length; i++) {
        var b = NEB[i], cx = b[0] * sw, cy = b[1] * sh, rr = b[2] * Math.max(sw, sh);
        // Küresel ton yaklaştıkça leke ona doğru en fazla 20 derece esner — bağlanmaz
        var hh = ((b[3] + 20 * Math.sin((hue - b[3]) * Math.PI / 180) + 360) % 360).toFixed(1);
        var stop = ',70%,' + b[4] + '%,';
        var g = nc.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 'hsla(' + hh + stop + b[5] + ')');
        g.addColorStop(1, 'hsla(' + hh + stop + '0)');
        nc.fillStyle = g; nc.fillRect(0, 0, sw, sh);
      }
      return neb;
    }

    // Kavisli lif üzerinde nokta (quadratic bezier)
    function bez(e, t) {
      var a = nodes[e.a], b = nodes[e.b];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1;
      var cx = mx + -dy / dd * e.cpOff, cy = my + dx / dd * e.cpOff, m = 1 - t;
      return { x: m * m * a.x + 2 * m * t * cx + t * t * b.x, y: m * m * a.y + 2 * m * t * cy + t * t * b.y, cx: cx, cy: cy };
    }
    /* Halkanın geçtiği yerde ağı parlatır. Ölçü halkanın KENDİ merkezinden alınır:
       eskiden hep sahnenin ortasından ölçülüyordu, yani tıklanan yerin hiç önemi yoktu. */
    function boost(x, y) {
      var a = 0;
      for (var i = 0; i < ripples.length; i++) {
        var rp = ripples[i], d = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rp.r);
        if (d < 90) a += (1 - d / 90) * rp.alpha;
      }
      return a;
    }
    // Halka her zaman bir merkezle doğar; yer verilmezse sahnenin ortası
    function ripple(x, y) {
      if (reduce) return;
      ripples.push({ r: 0, alpha: .9, x: x == null ? w / 2 : x, y: y == null ? h / 2 : y });
    }
    function spawnPacket() {
      if (edges.length) packets.push({ fiber: Math.floor(Math.random() * edges.length), t: 0, speed: .25 + .5 * Math.random(), dir: Math.random() < .5 ? 1 : -1, trail: [] });
    }

    var stateName = 'idle', target = assign({}, STATES.idle), cur = assign({}, STATES.idle);
    function assign(o, s) { for (var k in s) o[k] = s[k]; return o; }
    function setState(name) {
      if (!STATES[name]) return;
      stateName = name; target = assign({}, STATES[name]);
      if (badge) badge.textContent = BADGE[name];
    }

    var sparkTimer = 0, tPrev = performance.now(), q = 0;
    function draw(now) {
      if (++fitFrame >= 30) { fitFrame = 0; fitRound++; }   // tur gizliyken de ilerler: yoklama ve ölçü tazelenebilsin
      if (!meshShown() && !ripples.length) { raf(draw); return; }
      var f = fitC(canvas), ctx = f.ctx;
      if (f.w !== w || f.h !== h) { w = f.w; h = f.h; buildEdges(); linksReady = false; }
      var s = Math.min((now - tPrev) / 1000, .05); tPrev = now; q += s;

      var lerp = 4.4 * s;
      for (var k in cur) cur[k] += (target[k] - cur[k]) * lerp;

      // Renk kendi kendine gezinir
      if ((hueTimer -= s) <= 0) { hueTarget = nextHue(); hueTimer = HUE_PERIOD; }
      var hd = (hueTarget - hue + 540) % 360 - 180;
      hue = (hue + hd * .55 * s) % 360;                 // ~1,8 sn'lik geçiş: 10 sn'lik turda renk bir süre durur
      if (hue < 0) hue += 360;                          // aksi hâlde ton sürekli aşağı kayıp eksiye dalıyor
      if (Math.abs(hue - hueLast) >= 2) { hueLast = hue; document.documentElement.style.setProperty('--mesh-hue', hue.toFixed(1)); }
      refreshTints(cur.scan, q * .28);

      var osc = 1 + Math.sin(q * (stateName === 'listening' ? .9 : 1.6)) * (stateName === 'listening' ? .12 : .05);
      var bright = cur.bright * osc;

      // İz bırakan zemin + derinlik katmanı
      ctx.fillStyle = 'rgba(7, 6, 4, 0.28)';
      ctx.fillRect(0, 0, w, h);
      var nb = nebula();
      /* İz bırakan zemin her karede yalnızca %28 karartıyor, yani buraya konan her şey
         ~3,5 katına yığılıyor. Kare başına alfa bu yüzden bilerek çok düşük. */
      if (nb) { ctx.globalAlpha = .18; ctx.drawImage(nb, 0, 0, w, h); ctx.globalAlpha = 1; }

      nodes.forEach(function (nd) {
        nd.x = nodeX(nd) + 6 * Math.sin(.3 * q + nd.seedA) + 4 * Math.cos(.17 * q + nd.seedB);
        nd.y = nd.by * h + 6 * Math.cos(.26 * q + nd.seedB) + 4 * Math.sin(.21 * q + nd.seedA);
      });

      // Su gibi yayılan halkalar
      for (var ri = ripples.length - 1; ri >= 0; ri--) {
        var rp = ripples[ri];
        rp.r += s * Math.max(w, h) * .75; rp.alpha -= .75 * s;
        if (rp.alpha <= 0) ripples.splice(ri, 1);
      }

      /* Kavisli lifler — KOVALI çizim.
         Eskiden her kenar tek tek strokeStyle atayıp stroke() çağırıyordu: ölçüldü, karede 379
         stroke() ve o kadar da dize ayırma. Artık kenarlar (küme tonu × saydamlık kademesi)
         kovalarına dağıtılıp kova başına TEK yol ve TEK stroke() ile çiziliyor — çağrı sayısı
         yaklaşık sekizde bire iniyor. Saydamlık 8 kademeye yuvarlanıyor; 0,7 tavanlı saç teli
         çizgilerde ve yüzlerce kenarın üst üste binmesinde adım görünmüyor. */
      ctx.lineWidth = .7;
      for (var bi = 0; bi < buckets.length; bi++) buckets[bi].length = 0;
      for (var ei = 0; ei < edges.length; ei++) {
        var e = edges[ei], a = nodes[e.a], b = nodes[e.b];
        var al = e.alpha * bright * .9;
        if (cur.shimmer > .01) al *= 1 + .5 * cur.shimmer * Math.sin(6 * q + 1.7 * ei);
        al += .4 * boost((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (al > .7) al = .7;
        var lvl = (al * ASTEPS / .7) | 0; if (lvl < 1) continue; if (lvl >= ASTEPS) lvl = ASTEPS - 1;
        buckets[(e.tint + 1) * ASTEPS + lvl].push(ei);
      }
      for (var bi = 0; bi < buckets.length; bi++) {
        var bucket = buckets[bi]; if (!bucket.length) continue;
        ctx.strokeStyle = edgeCss[bi];
        ctx.beginPath();
        for (var bj = 0; bj < bucket.length; bj++) {
          var e2 = edges[bucket[bj]], a2 = nodes[e2.a], b2 = nodes[e2.b], p2 = bez(e2, .5);
          ctx.moveTo(a2.x, a2.y); ctx.quadraticCurveTo(p2.cx, p2.cy, b2.x, b2.y);
        }
        ctx.stroke();
      }

      // Lifler üzerinde akan ışık paketleri
      while (edges.length && packets.length < cur.packets) spawnPacket();
      ctx.shadowBlur = 0;
      var heads = [];
      for (var pi = packets.length - 1; pi >= 0; pi--) {
        var pk = packets[pi];
        pk.t += s * pk.speed * cur.speed;
        if (pk.t >= 1) { packets.splice(pi, 1); continue; }
        var ease = pk.t < .5 ? 2 * pk.t * pk.t : 1 - Math.pow(-2 * pk.t + 2, 2) / 2;
        var pos = bez(edges[pk.fiber % edges.length], pk.dir === 1 ? ease : 1 - ease);
        pk.trail.push({ x: pos.x, y: pos.y });
        if (pk.trail.length > 9) pk.trail.shift();
        for (var ti = 0; ti < pk.trail.length; ti++) {
          var tp = pk.trail[ti];
          ctx.fillStyle = col(70, ti / pk.trail.length * .5 * bright);
          ctx.beginPath(); ctx.arc(tp.x, tp.y, 1.1, 0, 6.283); ctx.fill();
        }
        heads.push(pos);
      }
      ctx.shadowColor = col(62, .9); ctx.shadowBlur = 8;
      ctx.fillStyle = col(85, .95 * bright);
      heads.forEach(function (hp) { ctx.beginPath(); ctx.arc(hp.x, hp.y, 1.8, 0, 6.283); ctx.fill(); });
      ctx.shadowBlur = 0;

      // Rastgele kıvılcımlar
      if ((sparkTimer -= s) <= 0) {
        sparkTimer = (2 + 2 * Math.random()) / (cur.fireEvery > 0 ? 3 / cur.fireEvery : 1);
        var sn = nodes[Math.floor(Math.random() * nodes.length)];
        sparks.push({ x: sn.x, y: sn.y, r: 2, max: 34 + 22 * Math.random(), alpha: .75, tint: sn.tint });
      }
      for (var si = sparks.length - 1; si >= 0; si--) {
        var sp = sparks[si];
        sp.r += 46 * s; sp.alpha -= 1.15 * s;
        if (sp.alpha <= 0 || sp.r >= sp.max) { sparks.splice(si, 1); continue; }
        ctx.strokeStyle = tcol(sp.tint, 70, sp.alpha * bright); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 6.283); ctx.stroke();
        ctx.fillStyle = col(93, .8 * sp.alpha * bright, 0, 60);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.4, 0, 6.283); ctx.fill();
      }

      // Düğümler
      ctx.lineWidth = .7; ctx.shadowBlur = 0;
      nodes.forEach(function (nd) {
        if (nd.hub) return;
        var t = boost(nd.x, nd.y), a = Math.min(1, .65 * bright + t);
        ctx.fillStyle = tcol(nd.tint, 60, a);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * (1 + .4 * t), 0, 6.283); ctx.fill();
      });
      ctx.shadowBlur = 14;
      nodes.forEach(function (nd) {
        if (!nd.hub) return;
        var t = boost(nd.x, nd.y), a = Math.min(1, .9 * bright + t);
        ctx.shadowColor = tcol(nd.tint, 62, .8);
        ctx.fillStyle = tcol(nd.tint, 70, a);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * (1 + .4 * t), 0, 6.283); ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Halkaların kendisi
      ripples.forEach(function (rp) {
        ctx.strokeStyle = col(62, .5 * rp.alpha); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 6.283); ctx.stroke();
      });

      // Kartlara giden bağlantılar (sahne maskesinin dışındaki katman)
      if (linkShown()) {                          // telefonda display:none — ölçme de çizme de gereksiz
        if (!linksReady) buildLinks();
        var lf = fitC(linkC);
        drawLinks(lf.ctx, lf.w, lf.h, s);
      }

      // Ses dalgası: tek parlayan çizgi
      if (voiceC) {
        var vf = fitC(voiceC), vc = vf.ctx, C = vf.w, E = vf.h;
        vc.clearRect(0, 0, C, E);
        vc.strokeStyle = col(68, .75 + .25 * cur.waveAmp); vc.lineWidth = 1.6;
        vc.shadowBlur = 8; vc.shadowColor = col(62, .8);
        vc.beginPath();
        var D = E / 2;
        for (var x = 0; x <= C; x += 2) {
          var env = Math.sin(x / C * Math.PI), yy;
          if (stateName === 'speaking') yy = D + env * (4 * Math.sin(.11 * x + 14 * q) + 5 * Math.sin(.043 * x + 9 * q) + 3 * Math.sin(.021 * x + 21 * q)) * cur.waveAmp * .9;
          else yy = D + env * Math.sin(.05 * x + 2.4 * q * cur.waveFreq) * 28 * cur.waveAmp;
          if (x === 0) vc.moveTo(x, yy); else vc.lineTo(x, yy);
        }
        vc.stroke(); vc.shadowBlur = 0;
      }
      raf(draw);
    }

    /* Hareket azaltılmışsa çizilen tek kare. Sekmeye tıklanınca yeniden çağrılır: yoksa
       renk seçimi bu bağlamda hiçbir karşılık vermiyordu (--mesh-hue yalnızca draw()
       içinde yazılıyordu, o da burada hiç çalışmaz). */
    function paintStatic() {
      var f0 = fit(canvas);
      if (f0.w !== w || f0.h !== h) { w = f0.w; h = f0.h; buildEdges(); }
      hue = hueTarget;                                   // geçiş yok: hedef ton doğrudan uygulanır
      document.documentElement.style.setProperty('--mesh-hue', hue.toFixed(1));
      refreshTints(0, 0);
      var ctx0 = f0.ctx;
      ctx0.fillStyle = '#070604'; ctx0.fillRect(0, 0, w, h);
      var nb0 = nebula();
      if (nb0) { ctx0.globalAlpha = .32; ctx0.drawImage(nb0, 0, 0, w, h); ctx0.globalAlpha = 1; }
      nodes.forEach(function (nd) { nd.x = nodeX(nd); nd.y = nd.by * h; });
      ctx0.lineWidth = .7;
      edges.forEach(function (e) {
        var a = nodes[e.a], b = nodes[e.b], p = bez(e, .5);
        ctx0.strokeStyle = tcol(e.tint, 60, Math.min(.9 * e.alpha, .7));
        ctx0.beginPath(); ctx0.moveTo(a.x, a.y); ctx0.quadraticCurveTo(p.cx, p.cy, b.x, b.y); ctx0.stroke();
      });
      nodes.forEach(function (nd) {
        ctx0.fillStyle = tcol(nd.tint, nd.hub ? 70 : 60, nd.hub ? .9 : .65);
        ctx0.beginPath(); ctx0.arc(nd.x, nd.y, nd.r, 0, 6.283); ctx0.fill();
      });
    }
    // Durağan sahnenin tamamı: ağ + kablolar + ses çizgisi. Yeniden boyutlandırmada tekrarlanır.
    function paintStaticAll() {
      paintStatic();
      if (linkC && linkC.offsetParent) {
        buildLinks();
        var lf0 = fit(linkC);
        drawLinks(lf0.ctx, lf0.w, lf0.h, 0);
      }
      if (voiceC) {
        var vf0 = fit(voiceC), vc0 = vf0.ctx;
        vc0.clearRect(0, 0, vf0.w, vf0.h);
        vc0.strokeStyle = col(68, .8); vc0.lineWidth = 1.6;
        vc0.beginPath(); vc0.moveTo(0, vf0.h / 2); vc0.lineTo(vf0.w, vf0.h / 2); vc0.stroke();
      }
    }
    if (reduce) paintStaticAll(); else raf(draw);

    /* Hareket azaltılmışken draw() hiç çalışmıyor, yani fitRound'u kimse okumuyordu:
       telefon döndürülünce tuval eski bit eşleminde gerili kalıyordu. Android'in pil
       koruması «animasyonları kaldır»ı açıyor ve Chrome bunu prefers-reduced-motion'a
       çeviriyor — yani bu, uç durum değil, pili azalmış her telefon. */
    var reflowT = 0;
    addEventListener('resize', function () {
      linksReady = false; fitRound++;
      if (!reduce) return;
      clearTimeout(reflowT);                             // döndürme sırasında olay yağmuru olur
      reflowT = setTimeout(paintStaticAll, 150);
    });
    area.addEventListener('pointerdown', function (ev) {
      var b = canvas.getBoundingClientRect();
      if (!b.width || !b.height) { ripple(); return; }
      ripple((ev.clientX - b.left) / b.width * w, (ev.clientY - b.top) / b.height * h);
    });
    window.FYOS = {
      setHue: function (hh) {
        hueTarget = hh; hueTimer = HUE_PERIOD;
        if (reduce) { paintStatic(); return; }            // durağan karede de renk karşılık versin
        ripple();
      },
      ping: function () { ripple(); },
      setState: setState
    };
    setState('idle');
  })();

  /* ---------- Sahne kartları: canlı sayılar ----------
     Kaynak: data/fy-stats.json — dakikada bir tazelenir. Dosya yoksa, ağ yoksa ya da değer
     geçersizse HTML'deki sayılar olduğu gibi kalır (sayfa hiçbir durumda boşa düşmez).
     Analytics kartı dosyadan değil, sahnedeki ağın bu oturumda tamamladığı istek sayısından beslenir. */
  (function stats() {
    var cards = $$('.hud[data-stat]');
    if (!cards.length) return;
    var SUB = {
      agents: function (v, d) { return v + ' online · ' + (num(d.agentsOffline) || 0) + ' off'; },
      studio: function (v) { return v + ' posts'; },
      memory: function (v) { return v + ' memories'; },
      skills: function (v) { return v + ' skills'; },
      knowledge: function (v) { return v + ' notes'; },
      analytics: function (v) { return v + ' events'; },
      boardroom: function (v) { return v + ' meetings'; }
    };
    var data = {}, events = 0;
    function num(v) { return typeof v === 'number' && isFinite(v) && v >= 0 && v < 1e12 ? Math.floor(v) : null; }
    function valueOf(key) {
      if (key === 'analytics') return (num(data.analytics) || 0) + events;
      return num(data[key]);
    }
    function paint(card, flash) {
      var key = card.getAttribute('data-stat'), v = valueOf(key);
      if (v === null || !SUB[key]) return;
      var nEl = $('[data-stat-num]', card), sEl = $('[data-stat-sub]', card);
      if (!nEl) return;
      var txt = String(v), sub = SUB[key](v, data);
      if (nEl.textContent === txt && (!sEl || sEl.textContent === sub)) return;   // değişmediyse dokunma
      nEl.textContent = txt;
      if (sEl) sEl.textContent = sub;
      if (flash && !reduce) {                                    // yeni veri geldi: kart bir an canlanır
        card.classList.add('is-hit');
        clearTimeout(card._statT);
        card._statT = setTimeout(function () { card.classList.remove('is-hit'); }, 1100);
      }
    }
    function paintAll(flash) { cards.forEach(function (c) { paint(c, flash); }); }

    // Ağdan bir karta paket ulaştığında Analytics'in saydığı gerçek trafik artar
    onDeliver = function () {
      events++;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-stat') === 'analytics') { paint(cards[i], false); break; }
      }
    };

    var first = true;
    function pull() {
      if (!window.fetch || (!first && document.hidden)) return;
      fetch(SCRIPT_BASE + 'data/fy-stats.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || typeof d !== 'object') return;
          data = d; paintAll(!first); first = false;
          // Boardroom: worker'daki yaklaşan randevu sayısı (yalnızca sayı; kişisel veri yok).
          // Worker yoksa ya da cevap vermezse dosyadaki başlangıç değeri kalır.
          if (!FYOS_ENDPOINT) return;
          fetch(FYOS_ENDPOINT.replace(/\/+$/, '') + '/stats', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (s) {
              if (!s || num(s.bookings) === null) return;
              data.boardroom = s.bookings; paintAll(false);
            })
            .catch(function () {});
        })
        .catch(function () {});                                  // sessizce HTML değerlerinde kal
    }
    pull();
    setInterval(pull, 60000);
  })();

  /* ---------- Ders: içindekiler, okuma çubuğu, başa dön ----------
     İçindekiler sayfadaki h2'lerden üretilir: yeni bölüm eklenince listeye kendiliğinden girer
     ve dört dilde de başlığın çevrilmiş hâlini gösterir — ayrı çeviri anahtarı gerekmez.
     Betik yoksa liste hidden kalır; sayfa yine okunur. */
  (function toc() {
    var box = $('#toc'); if (!box) return;
    var list = $('.toc__list', box), secs = $$('.lesson__block');
    if (!list || secs.length < 3) return;
    var links = [];
    secs.forEach(function (sec) {
      var h = $('h2', sec), num = $('.lesson__num', sec);
      if (!h || !num) return;                                   // numarasız blok (özet) listeye girmez
      if (!sec.id) sec.id = 'b' + num.textContent.trim();
      var label = h.cloneNode(true), n = $('.lesson__num', label);
      if (n) n.remove();
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + sec.id;
      a.innerHTML = '<b>' + num.textContent.trim() + '</b><span></span>';
      $('span', a).textContent = label.textContent.trim();
      li.appendChild(a); list.appendChild(li); links.push({ a: a, sec: sec });
    });
    if (!links.length) return;
    box.hidden = false;
    if (innerWidth >= 900) box.open = true;
    $$('a', list).forEach(function (a) {
      a.addEventListener('click', function () { if (innerWidth < 900) box.open = false; });
    });

    // Okunan bölümü işaretle: en üstte kalan görünür bölüm geçerlidir.
    var seen = [];
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var i = seen.indexOf(e.target);
          if (e.isIntersecting && i < 0) seen.push(e.target);
          else if (!e.isIntersecting && i >= 0) seen.splice(i, 1);
        });
        var top = null;
        seen.forEach(function (el) { if (!top || el.offsetTop < top.offsetTop) top = el; });
        links.forEach(function (l) { l.a.classList.toggle('is-here', l.sec === top); });
      }, { rootMargin: '-88px 0px -55% 0px' });
      links.forEach(function (l) { io.observe(l.sec); });
    }

    // Okuma çubuğu ve başa dön düğmesi
    var bar = $('.readbar i'), up = $('.totop'), tick = false;
    function paint() {
      tick = false;
      var h = document.documentElement.scrollHeight - innerHeight;
      var r = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
      if (bar) bar.style.width = (r * 100).toFixed(2) + '%';
      if (up) up.classList.toggle('is-on', scrollY > innerHeight * 0.9);
    }
    addEventListener('scroll', function () { if (!tick) { tick = true; raf(paint); } }, { passive: true });
    addEventListener('resize', paint);
    paint();
  })();

  /* ---------- Ders: adım adım canlandırma ----------
     Sahne tek bir data-step değeriyle sürülür (biçimlendirme css'te). Kendi kendine döner;
     bir adıma tıklanınca oraya gider ve elle gezinmeye bırakır. Görünmüyorken ya da imleç
     üstündeyken durur. Hareket azaltılmışsa hiç dönmez: son kare gösterilir.
     Aynı sürücü iki sahnede kullanılıyor: Bölüm 1'in ilk sohbet anlatımı (.walk, 5 adım) ve
     Bölüm 2'nin istek kuruluşu (.build, 6 adım) ve sistem promptu kurulumu (.sys, 4 adım),
     Bölüm 3'ün ilk n8n akışı (.n8n, 5 adım). */
  function stepper(box, prefix, HOLD, last) {
    if (!box) return;
    var stage = $('.' + prefix + '__stage', box), items = $$('.' + prefix + '__steps li', box);
    if (!stage || !items.length) return;
    var step = 1, timer = 0, manual = false, hover = false, seen = false;

    function show(n) {
      step = n;
      stage.setAttribute('data-step', n);
      items.forEach(function (li, i) { li.classList.toggle('is-now', i + 1 === n); });
    }
    function stop() { clearTimeout(timer); timer = 0; }
    function tick() {
      stop();
      if (manual || hover || !seen || reduce) return;
      timer = setTimeout(function () { show(step % last + 1); tick(); }, HOLD[step] || 2400);
    }

    items.forEach(function (li, i) {
      var b = $('button', li); if (!b) return;
      b.addEventListener('click', function () { manual = true; stop(); show(i + 1); });
    });
    box.addEventListener('mouseenter', function () { hover = true; stop(); });
    box.addEventListener('mouseleave', function () { hover = false; tick(); });

    if (reduce) { show(last); return; }                 // hareket istemeyene son kare
    show(1);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { seen = e.isIntersecting; if (seen) tick(); else stop(); });
      }, { threshold: .35 }).observe(box);
    } else { seen = true; tick(); }
  }

  stepper($('[data-walk]'), 'walk', [0, 2200, 2000, 3000, 1600, 3600], 5);
  stepper($('[data-build]'), 'build', [0, 2400, 2200, 2200, 2200, 2200, 4000], 6);
  stepper($('[data-sys]'), 'sys', [0, 2200, 2000, 2800, 3800], 4);
  stepper($('[data-n8n]'), 'n8n', [0, 2200, 2000, 2200, 2400, 3800], 5);
  stepper($('[data-term]'), 'term', [0, 2000, 2400, 2600, 3200, 3800], 5);
  stepper($('[data-deploy]'), 'deploy', [0, 2200, 2400, 2400, 2000, 4000], 5);
  stepper($('[data-cut]'), 'cut', [0, 2400, 2600, 2200, 2400, 3800], 5);
  stepper($('[data-call]'), 'call', [0, 2600, 2600, 2800, 2800, 3800], 5);

  /* ---------- FYOS: sohbet ----------
     Yanıt kaynağı sırası:
       1) FYOS_ENDPOINT doluysa Cloudflare Worker (bkz. worker/README.md)
       2) FYOS_LOCAL_AI açıksa ve cihaz WebGPU destekliyorsa tarayıcı içi model (js/fyos-local.js;
          ücretsiz, hesapsız; model ilk seferde bir kez iner)
       3) Aksi hâlde hazır yanıtlı çevrimdışı demo */
  (function ask() {
    var form = $('#askForm'), input = $('#askInput'), send = $('#askSend'), log = $('#askLog'), sub = $('#stageSub'), left = $('#askLeft');
    if (!form) return;
    /* Günlük soru hakkı. Sayı TEK yerde durur: index.html'deki «en fazla N soru» notu ve
       worker'daki DAILY_LIMIT de aynı değere ayarlanır (bkz. worker/wrangler.toml). */
    var DAILY = 10;
    var quota = DAILY, key = 'fyos-quota-' + new Date().toISOString().slice(0, 10), busy = false, idleTimer = 0;
    try { quota = Math.max(0, DAILY - (parseInt(localStorage.getItem(key) || '0', 10))); } catch (e) {}
    if (left) left.textContent = quota;
    input.addEventListener('input', function () { send.disabled = !input.value.trim() || quota <= 0 || busy; });
    input.addEventListener('focus', function () { if (!busy && window.FYOS) window.FYOS.setState('listening'); });
    input.addEventListener('blur', function () { if (!busy && window.FYOS) window.FYOS.setState('idle'); });

    // Bilgi tabanı: [anahtar kelimeler (regex), yanıt]. En çok eşleşen kazanır. Diğer diller: i18n/<dil>.json "js.canned".
    var canned = T.canned || [
      ['merhaba|selam|hey|günaydın|iyi akşamlar|nasılsın|naber', 'Merhaba! İyiyim, sen nasılsın? Kurs, site paketleri, otomasyon, FY ya da benim ne olduğum — ne merak ediyorsan sor, anlatayım.'],
      ['teşekkür|sağ ol|sağol|eyvallah|süper|harika', 'Ne demek, rica ederim! Başka bir şey takılırsa buradayım. Ciddi bir konuysa iletişim formundan yaz, sana gerçek bir insan döner.'],
      ['fiyat|ücret|kaç para|kaça|ne kadar|euro|€|indirim', 'Kurs şu an tamamen ücretsiz, hiç ödeme yok — ileride ücretli olabilir ama şimdilik bedava. Site paketleri ve otomasyon projeye göre fiyatlanıyor; ücretsiz görüşmede sana net bir rakam veriyoruz.'],
      ['kaç bölüm|bölüm|müfredat|içerik|konular|ders|program', 'Kurs 7 bölüm: 1 Uyanış (temeller), 2 Formül (prompt yazımı), 3 Ajan (n8n otomasyon), 4 Atölye (Claude Code ve skill\'ler), 5 Laboratuvar (site, CRM ve FYOS kurmak), 6 Vitrin (video, Instagram, içerik), 7 Zirve (para kazandıran beceri). Her bölüm gerçek bir projeyle bitiyor, yani izleyip geçmiyorsun.'],
      ['kurs|eğitim|yolculuğu|öğren|başla|sıfırdan|acemi|yeni başlayan', 'Yapay Zekâ Yolculuğu tam sıfırdan başlıyor, programlama bilmene hiç gerek yok. 7 bölüm, hepsi proje odaklı ve her biri bir öncekinin üstüne kuruluyor. Şu an da ücretsiz; ayrıntısı eğitim bölümünde.'],
      ['prompt|promt|komut|chatgpt|model', 'Prompt yazımı kursun 2. bölümü: rol, bağlam, hedef, kısıt ve çıktı biçimi. Bu formülü bir öğrendin mi her model tam istediğini veriyor; sistem promptu ve yapılandırılmış çıktı da orada.'],
      ['n8n|otomasyon|ajan|bot|akış|workflow|webhook|zapier|make', 'Otomasyonu iki türlü yapıyoruz: kursun 3. bölümünde n8n ile kendin öğreniyorsun, ajans tarafında ise DM yanıtları, müşteri adayı puanlama, raporlama ve CRM eşitleme gibi işleri senin yerine ajanlara devrediyoruz. Ücretsiz görüşmede önce hangi darboğazı çözeceğimize birlikte karar veriyoruz.'],
      ['claude|skill|kod|code|anthropic|alt ajan|hafıza', 'Claude Code kursun 4. bölümü: skill yazımı, alt ajanlar ve kalıcı hafıza. Şu an benimle konuştuğun bu demonun mantığı da orada anlatılıyor.'],
      ['site|web|landing|sayfa|paket|crm|platform|tasarım', 'Üç paketimiz var: Temel (animasyonlu satış sayfası), Profesyonel (site + CRM + yönetim paneli — en çok bunu seçiyorlar) ve Uzman (yapay zekâ entegrasyonlu tam platform). Fiyat projeye göre; "Proje talep et" düğmesinden yazarsan konuşuruz.'],
      ['video|kurgu|instagram|reels|içerik|sosyal|takipçi|algoritma', 'Bunlar kursun 6. bölümü, Vitrin: Claude ile video kurgusu, Instagram algoritması, DM akıllılaştırma, içerik ve kampanya. Amaç markanı bir büyüme makinesi gibi döndürmek.'],
      ['para kazan|gelir|müşteri bul|freelance|iş bul|satış', 'Kursun 7. bölümü Zirve tam olarak bunun için: teklif hazırlama, fiyatlama ve müşteri kazanma. Öğrendiğin bütün beceriler orada para kazandıran tek beceriye dönüşüyor.'],
      ['kim|sen|nesin|fyos|ne işe yarar|nasıl çalış', 'Ben FYOS, FY\'nin ajantik işletim sistemi demosuyum. Ajanlar, koçlar, hafıza, beceriler ve bilgi grafiğinden oluşan bir ağın küçük bir örneğiyim. Kursun 5. bölümünde kendi sürümünü sen kuruyorsun.'],
      ['farhad|ferhat|kurucu|hoca|eğitmen|anlatan|kimdir|hakkında', 'Kursu FY\'nin kurucusu Farhad Yaqoobi anlatıyor. Almanya\'da yaşıyor, IT okuyor, dört dilde içerik üretiyor ve öğrendiklerini açık kaynak olarak GitHub\'da paylaşıyor. Hakkımda bölümünde daha çok şey var.'],
      ['dil|türkçe|almanca|ingilizce|farsça|deutsch|english', 'Kurs Türkçe. Destek ise Türkçe, Almanca, İngilizce ve Farsça — hangisi sana rahat geliyorsa ondan yaz.'],
      ['nerede|almanya|türkiye|şehir|yüz yüze|online|uzaktan|canlı', 'Her şey online. FY Almanya\'da, Kuzey Ren-Vestfalya\'da; kurs da görüşmeler de uzaktan, yani dünyanın neresinde olursan ol katılabilirsin.'],
      ['destek|soru sor|yardım|panel|erişim|lisans|izle|ömür', 'Kayıt olunca 45 gün tam destek hediye; sorularını öğrenci panelinden soruyorsun. Videolara sana özel erişimle istediğin zaman ulaşıyorsun, üstelik ömür boyu.'],
      ['taksit|ödeme|kart|havale|paypal|iban|nasıl alır|satın al', 'Kurs şu an ücretsiz, ödeme diye bir şey yok. "Ücretsiz katıl" düğmesine basman yeter; e-posta ile kaydını alıp erişim bilgilerini gönderiyoruz.'],
      ['iletişim|ulaş|mail|e-posta|telefon|whatsapp|görüşme|randevu|danışman', 'En hızlısı iletişim formu — sayfanın altında ya da üstteki "Bize Ulaşın" düğmesinde. Ücretsiz 30 dakikalık görüşme için de aynı form. Yanıt benden değil, gerçek bir insandan geliyor.'],
      ['iş|kariyer|başvuru|özgeçmiş|cv|katıl|çalışmak', 'FY\'ye katılmak istiyorsan "FY\'ye katıl" bölümünden özgeçmişini gönder; uygun görürsek biz sana dönüyoruz.'],
      ['gizlilik|veri|çerez|kvkk|güvenli', 'Bu site çerez kullanmıyor, seni izlemiyor. Sorduğun soru yanıtı üretmek için FY’nin kendi ara sunucusuna, oradan da yapay zekâ sağlayıcısına gidiyor; bir hesaba bağlanmıyor ve bizde saklanmıyor. Formdan gönderdiklerin yalnızca sana dönmek için en çok altı ay tutulur. Ayrıntısı Kurallar ve Gizlilik sayfasında.']
    ];
    function reply(q) {
      var lq = q.toLowerCase(), best = null, bestScore = 0;
      for (var i = 0; i < canned.length; i++) {
        var m = lq.match(new RegExp(canned[i][0], 'g')), score = m ? m.length : 0;
        if (score > bestScore) { bestScore = score; best = canned[i][1]; }
      }
      if (best) return best;
      return t('cannedFallback', 'Bunu demo sürümümde bilemiyorum, kusura bakma. Kurs, fiyat, bölümler, site paketleri, otomasyon, destek ya da FY hakkında sorarsan anlatırım; ayrıntı için iletişim formundan yaz, sana gerçek bir insan yanıtlar.');
    }

    // Yerel modele verilen talimat ve FY bilgileri
    var SYSTEM = T.system || ('Sen FYOS\'sun: FY yapay zekâ ajansının sitesindeki canlı asistan. Genç, güler yüzlü ve samimi bir kadın gibi konuş — karşındaki yeni tanıştığın ama hemen ısındığın biri. Gündelik, sıcak Türkçe kullan; «tabii ki», «hemen anlatayım», «bak şöyle» gibi doğal bağlayıcılar serbest. Sen diliyle konuş, resmî «siz» kurma. Kısa tut: en fazla 3-4 cümle. Emoji kullanma, yıldız ya da etiket koyma, gülmeyi yazıyla taklit etme («haha», «hihi» yazma) — bu metin sesli de okunuyor, gülümseme sesin tonundan geliyor. Soruyu tekrar etme, liste ve başlık yapma. Yalnızca aşağıdaki bilgileri kullan; bunların dışında bir şey uydurma, bilmiyorsan «bunu iletişim formundan sorabilirsin» de.\n' +
      'FY: yapay zekâ eğitimi, web sitesi kurma ve işletmeleri otomasyonla akıllılaştırma ajansı. Kurucu Farhad Yaqoobi; Almanya\'da yaşıyor, IT okuyor, Türkçe/Almanca/İngilizce/Farsça biliyor.\n' +
      'Kurs "Yapay Zekâ Yolculuğu": 7 bölüm, proje odaklı, sıfırdan başlar, programlama gerekmez, tamamen online. Şu an tamamen ücretsiz (ileride ücretli olabilir), 45 gün destek, ömür boyu erişim. Bölümler: 1 Uyanış (temeller), 2 Formül (prompt yazımı), 3 Ajan (n8n otomasyon), 4 Atölye (Claude Code, skill\'ler), 5 Laboratuvar (site, CRM, FYOS kurma), 6 Vitrin (video, Instagram, içerik), 7 Zirve (müşteri kazanma, gelir).\n' +
      'Site paketleri: Temel (satış sayfası), Profesyonel (site + CRM, en popüler), Uzman (yapay zekâlı platform); fiyat projeye göre. Otomasyon: DM yanıtı, müşteri adayı puanlama, raporlama, CRM. Ücretsiz 30 dakikalık görüşme var. İletişim: sitedeki form. Site veri toplamaz; bu sohbet ziyaretçinin cihazında çalışır, sorular sunucuya gitmez.');

    var history = [], local = { mod: null, engine: null, failed: false };
    // Küçük modellerin yanıtını toparlar: boşluk, tekrar eden cümleler, uzunluk
    function tidy(text) {
      var t = String(text || '').replace(/\s+/g, ' ').replace(/^[\s:*#\-]+/, '').trim();
      // Cümlelere böl: noktalama + boşluk. Lookbehind kullanılmaz (Safari 16.4 öncesi tüm betiği düşürürdü);
      // yakalama grubu noktalamayı ayrı parça olarak verir, aşağıda geri yapıştırılır. "3.5" gibi sayılar bölünmez.
      var raw = t.split(/([.!?…]+)\s+/), parts = [], seen = {}, keep = [];
      for (var j = 0; j < raw.length; j += 2) { var piece = (raw[j] + (raw[j + 1] || '')).trim(); if (piece) parts.push(piece); }
      for (var i = 0; i < parts.length && keep.length < 3; i++) {
        // Yinelenen cümle anahtarı: yalnızca boşluk ve noktalama atılır — harf sınıfı sınırlanmaz ki Farsça/Almanca metin boş kalmasın
        var k = parts[i].toLowerCase().replace(/[\s.,;:!?…«»"'()\[\]\-–—]/g, '');
        if (!k || seen[k]) continue; seen[k] = 1; keep.push(parts[i]);
      }
      t = keep.join(' ');
      if (t.length > 420) { t = t.slice(0, 420); var cut = Math.max(t.lastIndexOf('. '), t.lastIndexOf('! '), t.lastIndexOf('? ')); if (cut > 120) t = t.slice(0, cut + 1); }
      return t.trim();
    }
    function localModel() {
      var small = (navigator.deviceMemory && navigator.deviceMemory <= 4) || Math.min(screen.width, screen.height) < 700;
      return small ? FYOS_LOCAL_MODEL_SMALL : FYOS_LOCAL_MODEL;
    }
    function localAvailable() { return FYOS_LOCAL_AI && !local.failed && !!navigator.gpu && !!localModel(); }
    // Modül dosyası CSP'ye uygun biçimde (eval'siz) <script type="module"> ile yüklenir; kendini window.FYOS_LOCAL'a yazar.
    function importLocal() {
      return new Promise(function (resolve, reject) {
        if (window.FYOS_LOCAL) return resolve(window.FYOS_LOCAL);
        try {
          var sc = document.createElement('script'); sc.type = 'module'; sc.src = SCRIPT_BASE + 'js/fyos-local.js' + ASSET_Q;
          sc.onload = function () { if (window.FYOS_LOCAL) resolve(window.FYOS_LOCAL); else reject(new Error('modül boş')); };
          sc.onerror = function () { reject(new Error('modül yüklenemedi')); };
          document.head.appendChild(sc);
        } catch (e) { reject(e); }
      });
    }
    function loadLocal(onProgress) {
      var p = local.mod ? Promise.resolve(local.mod) : importLocal().then(function (m) { local.mod = m; return m; });
      return p.then(function (m) { return m.load(localModel(), onProgress); }).then(function (e) { local.engine = e; return e; });
    }

    /* answer(q, ui, done): ui.onToken(metin) akış, ui.onProgress(yüzde) model inişi; done(metin, meta) */
    function answer(q, ui, done) {
      if (FYOS_ENDPOINT && window.fetch) {
        var ctrl = window.AbortController ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : 0;
        fetch(FYOS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q, history: history.slice(-6) }), signal: ctrl ? ctrl.signal : undefined })
          .then(function (res) { return res.json(); })
          .then(function (d) { clearTimeout(timer); done((d && d.reply) || reply(q), d); })
          .catch(function () { clearTimeout(timer); done(reply(q)); });
        return;
      }
      if (localAvailable()) {
        var run = function () {
          var msgs = [{ role: 'system', content: SYSTEM }].concat(history.slice(-6)).concat([{ role: 'user', content: q }]);
          local.mod.ask(local.engine, msgs, function (partial) { ui.onToken(tidy(partial)); }).then(function (t) { t = tidy(t); done(t || reply(q), { local: true }); })
            .catch(function () { done(reply(q)); });
        };
        if (local.engine) { ui.onStream(); run(); return; }
        loadLocal(ui.onProgress).then(function () { ui.onStream(); run(); })
          .catch(function (e) { local.failed = true; try { console.warn('Yerel model yüklenemedi', e); } catch (er) {} done(reply(q)); });
        return;
      }
      setTimeout(function () { done(reply(q)); }, 600);
    }

    function bubble(role, text) {
      var d = document.createElement('div');
      d.className = 'msg msg--' + role; d.textContent = text;
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }
    /* sendQuestion(q, spoken): yazılı formun da sesli modun da tek girişi.
       spoken=true ise yanıt sesli okunur, sonra sesli mod yine dinlemeye döner.
       false döner: soru boş, günlük hak bitmiş ya da bir yanıt sürüyor. */
    function sendQuestion(q, spoken) {
      q = String(q || '').trim();
      if (!q || quota <= 0 || busy) return false;
      quota--; if (left) left.textContent = quota;
      try { localStorage.setItem(key, String(DAILY - quota)); } catch (er) {}
      busy = true;
      clearTimeout(idleTimer);
      bubble('user', q);
      if (window.FYOS) window.FYOS.setState('thinking');
      if (sub) sub.textContent = t('badgeThinking', 'Düşünüyorum…');
      history.push({ role: 'user', content: q });
      var b = null, streamed = false, told = false, ended = false, deadline = 0;
      /* Emniyet süresi: yanıt kaynağı hiç dönmezse (tarayıcı içi model takılır, ağ sessizce
         ölür) busy sonsuza kadar açık kalır ve o andan sonra sorulan HER soru sessizce
         düşer — sesli modda bu, FYOS'un bir kez konuşup bir daha hiç cevap vermemesi demek.
         İlerleme geldikçe süre tazelenir; 1 GB'lık model inişi bu yüzden kesilmez. */
      function bump() {
        clearTimeout(deadline);
        deadline = setTimeout(function () {
          if (ended) return;
          var msg = t('answerStuck', 'Bu soruda takıldım. Bir daha sorar mısın?');
          if (!b) b = bubble('bot', '');
          b.textContent = msg;
          finish(msg);
        }, 60000);
      }
      bump();
      function finish(text) {
        if (ended) return;
        ended = true;
        clearTimeout(deadline);
        busy = false;
        if (sub) sub.textContent = quota > 0 ? t('subMore', 'Başka bir şey sor.') : t('subDone', 'Bugünlük bu kadar — yarın yine buradayım.');
        idleTimer = setTimeout(function () { if (!busy && window.FYOS) window.FYOS.setState('idle'); }, 3500);
        if (spoken) voiceSay(text);
      }
      answer(q, {
        onProgress: function (pct) {
          if (!b) b = bubble('bot', '');
          b.textContent = t('modelLoading', 'Yapay zekâ bu cihazda, tarayıcında çalışacak. Model bir kez indiriliyor (yaklaşık 1 GB), sonra hazır kalıyor… %{pct}').replace('{pct}', pct) + (pct < 100 ? ' ' + t('modelLoadingHint', '— bu arada sayfayı gezebilirsin.') : '');
          if (sub) sub.textContent = t('subLoading', 'Model yükleniyor %{pct}').replace('{pct}', pct);
          bump();
          // Sesli modda model inerken sessizlik dakikalarca sürebilir: bir kez haber ver.
          if (spoken && !told) { told = true; voiceSay(t('voiceLoading', 'Bir saniye, beynimi indiriyorum. Biraz sürebilir.'), true); }
        },
        onStream: function () {
          streamed = true;
          bump();
          if (!b) b = bubble('bot', '');
          b.textContent = '…';
          if (sub) sub.textContent = t('subTyping', 'Yazıyorum…');
          if (window.FYOS) { window.FYOS.setState('speaking'); window.FYOS.ping(); }
        },
        onToken: function (text) { bump(); if (b) { b.textContent = text; log.scrollTop = log.scrollHeight; } }
      }, function (text, meta) {
        /* Günlük hak bitişi ile saniyelik fren farklı şeylerdir. Sunucu yalnızca günlük hak
           bitince limited+left:0 döner; «biraz yavaşla» yanıtı busy gelir (eski sürümlerde
           left'siz limited). Karıştırılırsa tek bir 429 sohbeti gün sonuna kadar kapatıyordu. */
        var dayOver = meta && meta.limited && meta.left === 0;
        // counted:false = sunucu yanıt üretemedi ve hakkı kendi tarafında iade etti; burada da iade et,
        // yoksa modelin her arızası ziyaretçinin günlük hakkını yer.
        var slowDown = meta && !dayOver && (meta.busy || meta.limited || meta.counted === false);
        if (dayOver) { quota = 0; if (left) left.textContent = 0; try { localStorage.setItem(key, String(DAILY)); } catch (er) {} }
        else if (slowDown) { quota = Math.min(DAILY, quota + 1); if (left) left.textContent = quota; try { localStorage.setItem(key, String(DAILY - quota)); } catch (er) {} }
        history.push({ role: 'assistant', content: text });
        if (streamed) { if (b) b.textContent = text; finish(text); return; }
        if (!b) b = bubble('bot', '');
        if (window.FYOS) { window.FYOS.setState('speaking'); window.FYOS.ping(); }
        // Sesli modda daktilo animasyonu yok: harf harf yazmak konuşmayı saniyelerce geciktirir.
        if (spoken) { b.textContent = text; log.scrollTop = log.scrollHeight; finish(text); return; }
        var i = 0;
        (function type() {
          b.textContent = text.slice(0, i); log.scrollTop = log.scrollHeight;
          if (i++ < text.length) setTimeout(type, 14);
          else finish(text);
        })();
      });
      return true;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sendQuestion(input.value, false)) { input.value = ''; send.disabled = true; }
    });

    /* ---------- FYOS: canlı sesli mod ----------
       Mikrofona bir kez basılır (tarayıcı izni bir kez sorar); sonrası tıklamasızdır.
       «Melis» denince FYOS uyanır, soruyu dinler, yanıtı sesli okur ve yine dinlemeye döner.
       Sonraki ziyaretlerde izin zaten verilmişse kendiliğinden açılır — hiç basılmaz.
       Motor js/fyos-voice.js; ancak sesli mod ilk açıldığında indirilir, kapalıyken hiç inmez. */
    var mic = $('#askMic'), vline = $('#askVoice'), vtext = $('#askVoiceText');
    var vnode = $('#askVoiceNote');
    /* Gerçek ses düşüş sebebi: her sebep SESLİ OTURUM başına bir kez söylenir. Sayfa ömrü boyunca
       bir kez olsaydı, sahibi mikrofonu kapatıp yeniden açtığında yine erkek ses duyup hiçbir
       açıklama göremezdi — düzeltmek istediğimiz döngünün ta kendisi. */
    var vFell = {};
    function vnote(k, tr) { if (!vnode) return; vnode.textContent = t(k, tr); vnode.hidden = false; }
    function vclear() { if (vnode) { vnode.textContent = ''; vnode.hidden = true; } }
    var vcons = $('#voiceConsent'), vconsWhere = $('#voiceConsentWhere');
    var voice = null, vBusy = false, vGreet = 0;
    var VKEY = 'fyos-voice-on', VOK = 'fyos-voice-ok';
    // Tanıyıcı ve seslendirme tam dil etiketi ister; sayfanın <html lang> değeri kısadır.
    var VLANG = { tr: 'tr-TR', de: 'de-DE', en: 'en-US', fa: 'fa-IR' }[(document.documentElement.lang || 'tr').slice(0, 2)] || 'tr-TR';

    function voiceSay(text, interim) {
      if (!voice || !voice.isOn()) return;
      voice.speak(text, function () { if (interim && voice) voice.hold(); });
    }
    function vsay(k, tr) { if (vtext) vtext.textContent = t(k, tr); }
    function vshow(on) { if (vline) vline.hidden = !on; }
    function micOn(on) {
      if (!mic) return;
      mic.classList.toggle('is-on', !!on);
      mic.setAttribute('aria-pressed', on ? 'true' : 'false');
      mic.setAttribute('aria-label', on ? t('micOff', 'Sesli modu kapat') : t('micOn', 'Sesli modu aç'));
    }
    function vremember(on) { try { on ? localStorage.setItem(VKEY, '1') : localStorage.removeItem(VKEY); } catch (e) {} }

    // Motoru getirir. Mikrofonu açmaz: yalnız dosyayı indirir, izin sorulmaz.
    function importVoice() {
      return new Promise(function (resolve, reject) {
        if (window.FYOS_VOICE) return resolve(window.FYOS_VOICE);
        try {
          var sc = document.createElement('script'); sc.src = SCRIPT_BASE + 'js/fyos-voice.js' + ASSET_Q;
          sc.onload = function () { if (window.FYOS_VOICE) resolve(window.FYOS_VOICE); else reject(new Error('modül boş')); };
          sc.onerror = function () { reject(new Error('modül yüklenemedi')); };
          document.head.appendChild(sc);
        } catch (e) { reject(e); }
      });
    }

    /* Sesli yanıt ucu. Ayrı bir adres verilmediyse sohbet ucunun /tts yolu kullanılır —
       worker ikisini de aynı yerde sunuyor. Uç yoksa motor tarayıcı sesine döner. */
    function ttsEndpoint() {
      if (FYOS_VOICE_ENDPOINT) return FYOS_VOICE_ENDPOINT;
      if (FYOS_ENDPOINT) return FYOS_ENDPOINT.replace(/\/+$/, '') + '/tts';
      return '';
    }

    function buildVoice(V) {
      return V.create({
        lang: VLANG,
        ttsUrl: ttsEndpoint(),
        voiceName: FYOS_VOICE_NAME,
        pitch: typeof FYOS_VOICE_PITCH === 'number' ? FYOS_VOICE_PITCH : null,
        /* Gerçek ses devreye giremeyince SEBEBİ söyler. Eskiden düşüş tümüyle sessizdi:
           yanıt tarayıcının kendi sesiyle okunuyordu (çoğu Android'de erkek) ve ne ziyaretçi
           ne de sahibi nedenini görebiliyordu. Her sebep oturumda bir kez yazılır. */
        onFallback: function (why) {
          // null = gerçek ses çalıştı: geçici bir aksaklıktan kalan açıklama ekranda asılı kalmasın,
          // yoksa satır «ulaşılamadı» derken altında coral sesi konuşuyor olurdu.
          if (why === null) { vclear(); return; }
          if (!voice || !voice.isOn()) return;             // mikrofon kapandıktan sonra geç gelen bildirim
          if (vFell[why]) return;
          vFell[why] = true;
          if (why === 'off') vnote('voiceOffKey', 'Gerçek ses şu an kapalı — tarayıcının kendi sesiyle okuyorum.');
          else if (why === 'limit') vnote('voiceTtsQuota', 'Bugünlük gerçek ses hakkın doldu; tarayıcının kendi sesiyle okuyorum.');
          else if (why === 'play') vnote('voiceTtsPlay', 'Gerçek ses geldi ama tarayıcı çalamadı; kendi sesiyle okuyorum.');
          else vnote('voiceTtsFail', 'Gerçek sese ulaşılamadı; tarayıcının kendi sesiyle okuyorum.');
        },
        onLocal: function (isLocal) {
          if (!vtext) return;
          // Yalnız bilgi: sesin nerede çözüldüğünü söyler, durum satırını ezmez.
          vtext.title = isLocal ? t('voiceLocal', 'Ses bu cihazda çözülüyor; dışarı çıkmıyor.')
                                : t('voiceCloud', 'Sesi tarayıcının konuşma servisi çözüyor.');
        },
        onState: function (m) {
          if (m === 'wake') { vsay('voiceWake', '«Melis» de — dinliyorum.'); if (!busy && window.FYOS) window.FYOS.setState('idle'); }
          else if (m === 'open') { vsay('voiceOpen', 'Dinliyorum…'); if (window.FYOS) window.FYOS.setState('listening'); }
          else if (m === 'speak') { if (window.FYOS) { window.FYOS.setState('speaking'); window.FYOS.ping(); } }
          else if (m === 'off') { vshow(false); micOn(false); vclear(); vFell = {}; if (window.FYOS) window.FYOS.setState('idle'); }
        },
        onWake: function () {
          if (window.FYOS) window.FYOS.ping();
          // Yalnız «Melis» denip susulduysa karşılık ver; cümle sürüyorsa üstüne konuşma.
          clearTimeout(vGreet);
          vGreet = setTimeout(function () {
            if (!voice || voice.mode() !== 'open') return;
            voice.speak(t('voiceGreet', 'Buyur, dinliyorum.'), function () { if (voice) voice.listen(); });
          }, 900);
        },
        onHeard: function (text) {
          if (text && text.length > 1) clearTimeout(vGreet);
          if (vtext && text) vtext.textContent = '“' + text + '”';
        },
        onQuestion: function (q) {
          clearTimeout(vGreet);
          if (sendQuestion(q, true)) return;
          if (quota <= 0) voiceSay(t('voiceQuota', 'Bugünlük soru hakkın doldu; yarın yine buradayım.'));
          else if (voice) voice.resume();
        },
        onError: function (code) {
          vshow(true); micOn(false);
          if (code === 'denied') { vremember(false); vsay('voiceDenied', 'Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden izin verip yeniden dene.'); }
          else if (code === 'nomic') vsay('voiceNoMic', 'Mikrofon bulunamadı.');
          else if (code === 'unsupported') vsay('voiceUnsupported', 'Bu tarayıcı canlı sesi desteklemiyor; Chrome ya da Edge dene.');
          else if (code === 'lang') vsay('voiceLang', 'Bu tarayıcı bu dili sesle tanımıyor.');
          else { vremember(false); vsay('voiceStopped', 'Ses durdu. Yeniden açmak için mikrofona bas.'); }
        }
      });
    }

    function startVoice() {
      if (vBusy || (voice && voice.isOn())) return;
      vBusy = true;
      vshow(true); vsay('voiceStarting', 'Mikrofon açılıyor…');
      importVoice().then(function (V) {
        vBusy = false;
        if (!V.supported()) { micOn(false); vsay('voiceUnsupported', 'Bu tarayıcı canlı sesi desteklemiyor; Chrome ya da Edge dene.'); return; }
        if (!voice) voice = buildVoice(V);
        micOn(true);
        if (sesTeshisi()) showVoices(V);
        return voice.start().then(function () { vremember(true); });
      }).catch(function (e) {
        vBusy = false; micOn(false);
        try { console.warn('Sesli mod açılamadı', e); } catch (er) {}
        vsay('voiceStopped', 'Ses durdu. Yeniden açmak için mikrofona bas.');
      });
    }
    /* Ses teşhisi: adresin sonuna ?ses eklenince, mikrofon açıldığında FYOS cihazdaki
       sesleri sohbete yazar. Konsol açmadan (telefonda da) görülebilsin diye böyle:
       «hâlâ erkek sesi» derken sebebin cihazda mı kodda mı olduğu ancak bu listeyle anlaşılıyor.
       Sıradan ziyaretçi bunu hiç görmez. */
    function sesTeshisi() {
      try { return /[?&](ses|voices)\b/.test(location.search); } catch (e) { return false; }
    }
    function showVoices(V) {
      if (!V || !V.voices) return;
      V.voices(VLANG).then(function (d) {
        var satir = 'Ses teşhisi (' + d.dil + ')\n' +
          'Seçilen: ' + d.secilen + (d.kadinMi ? ' — kadın' : ' — kadın DEĞİL') + '\n' +
          'Bu cihazdaki sesler (' + d.hepsi.length + '):\n' + (d.hepsi.join('\n') || '(hiç yok)');
        var b = bubble('bot', satir);
        b.style.whiteSpace = 'pre-wrap';
        b.style.maxWidth = '100%';
      }).catch(function () {});
    }

    function stopVoice() {
      clearTimeout(vGreet);
      vremember(false);
      if (voice) voice.stop(); else { micOn(false); vshow(false); }
    }

    /* Onay: mikrofon ilk kez açılırken sesin nerede çözüleceğini yazıp sorar.
       Cihaz içi tanıma varsa ses cihazdan çıkmaz; yoksa tarayıcının konuşma servisine gider
       ve bu açıkça yazılır (bkz. Kurallar ve Gizlilik). */
    function askConsent() {
      if (!vcons) { startVoice(); return; }
      vcons.hidden = false;
      if (vconsWhere) vconsWhere.textContent = t('voiceWhereChecking', 'Kontrol ediliyor…');
      importVoice().then(function (V) {
        return V.check(VLANG).then(function (state) {
          var here = state === 'available' || state === 'downloadable' || state === 'downloading';
          if (vconsWhere) vconsWhere.textContent = here
            ? t('voiceWhereLocal', 'Bu tarayıcı sesi cihazın içinde çözebiliyor: söylediklerin dışarı çıkmaz.')
            : t('voiceWhereCloud', 'Bu tarayıcı sesi kendi konuşma servisinde çözüyor: söylediklerin tanıma için tarayıcı üreticisine gider. Yanıtı üreten model yine cihazında çalışır.');
        });
      }).catch(function () {
        if (vconsWhere) vconsWhere.textContent = t('voiceWhereCloud', 'Bu tarayıcı sesi kendi konuşma servisinde çözüyor: söylediklerin tanıma için tarayıcı üreticisine gider. Yanıtı üreten model yine cihazında çalışır.');
      });
    }

    if (mic) {
      // Tarayıcıda konuşma tanıma yoksa düğmeyi hiç gösterme.
      if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) mic.hidden = true;
      else {
        micOn(false);
        mic.addEventListener('click', function () {
          if (voice && voice.isOn()) { stopVoice(); return; }
          var ok = false; try { ok = localStorage.getItem(VOK) === '1'; } catch (e) {}
          if (ok) startVoice(); else askConsent();
        });
        var cgo = $('#voiceConsentGo'), cno = $('#voiceConsentNo');
        if (cgo) cgo.addEventListener('click', function () {
          try { localStorage.setItem(VOK, '1'); } catch (e) {}
          if (vcons) vcons.hidden = true;
          startVoice();
        });
        if (cno) cno.addEventListener('click', function () { if (vcons) vcons.hidden = true; });

        /* Sonraki ziyaretler: daha önce açılmışsa ve mikrofon izni duruyorsa kendiliğinden başlar.
           İzin durumu okunamıyorsa hiçbir şey yapılmaz — kimseye sürpriz izin penceresi çıkmaz. */
        (function autoStart() {
          var on = false; try { on = localStorage.getItem(VKEY) === '1'; } catch (e) {}
          if (!on || !navigator.permissions || !navigator.permissions.query) return;
          try {
            navigator.permissions.query({ name: 'microphone' }).then(function (st) {
              if (st.state === 'granted') startVoice();
              else if (st.state === 'denied') vremember(false);
            }).catch(function () {});
          } catch (e) {}
        })();
      }
    }

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

  /* ---------- Otomasyon: «Kaynak» merkez-ve-kollar şeması ----------
     Kaynak dairesi, hâlesi ve beş adım kartı HTML/CSS'te. Burada yalnız bağlayıcı kollar çizilir:
     kaynağın kenarından her kartın noktasına birer kübik Bézier. İki uç da ÖLÇÜLÜR — dil değişse,
     yazı tipi geç yüklense, kart yüksekliği veya pencere boyutu değişse de kollar yerinde kalır.
     Kare başına iş yok: akan ışık ve «sıcak kart» vurgusu saf CSS animasyonu, JS yalnız ölçer. */
  (function journey() {
    var root = $('#journey'); if (!root) return;
    var body = $('#journeyBody'), svg = $('#journeySvg'), armsG = $('#jArms'), hub = $('.hub', root);
    if (!body || !svg || !armsG || !hub) return;
    var steps = $$('.jstep', root); if (!steps.length) return;
    var NS = 'http://www.w3.org/2000/svg', SEG = 24;      // SEG: akan ışığın uzunluğu (px) — CSS'teki dash ile aynı
    var arms = [];

    /* Altın bokeh: kenarlara yığılmış, yavaşça süzülen ışık lekeleri (CSSOM ile; CSP satır içi stile izin verir) */
    var bk = $('.journey__bokeh', root);
    if (bk && !reduce) for (var i = 0; i < 18; i++) {
      var sp = document.createElement('i'), sz = 3 + Math.random() * 26, side = Math.random();
      var x = side < .4 ? Math.random() * 16 : side < .8 ? 84 + Math.random() * 16 : Math.random() * 100;
      sp.style.left = x.toFixed(1) + '%'; sp.style.top = (Math.random() * 100).toFixed(1) + '%';
      sp.style.width = sp.style.height = sz.toFixed(1) + 'px';
      sp.style.setProperty('--o', (.2 + Math.random() * .5).toFixed(2));
      sp.style.animationDuration = (8 + Math.random() * 8).toFixed(1) + 's';
      sp.style.animationDelay = '-' + (Math.random() * 12).toFixed(1) + 's';
      bk.appendChild(sp);
    }

    function f(n) { return (Math.round(n * 10) / 10).toString(); }

    /* Her kol üç yol: geniş hâle, altın çizgi, akan ışık. Işığın gecikmesi kartınkiyle aynı (--jd). */
    function ensure() {
      while (arms.length < steps.length) {
        var g = document.createElementNS(NS, 'g'), set = [], cls = ['jarm-glow', 'jarm', 'jflow'];
        for (var j = 0; j < 3; j++) {
          var pth = document.createElementNS(NS, 'path');
          pth.setAttribute('class', cls[j]); g.appendChild(pth); set.push(pth);
        }
        var d = steps[arms.length].style.getPropertyValue('--jd');
        if (d) set[2].style.setProperty('--jd', d);
        armsG.appendChild(g); arms.push(set);
      }
    }

    function build() {
      var br = body.getBoundingClientRect(), W = br.width, H = br.height; if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + f(W) + ' ' + f(H));
      var hr = hub.getBoundingClientRect();
      var hx = hr.left + hr.width / 2 - br.left, hy = hr.top + hr.height / 2 - br.top;
      var rad = Math.min(hr.width, hr.height) / 2 + 6;    // çıkış noktası halkanın hemen dışında
      var pts = [], firstTop = Infinity, minX = Infinity, maxX = -Infinity, k;
      for (k = 0; k < steps.length; k++) {
        var node = $('.jstep__dot', steps[k]);
        var r = node && node.getBoundingClientRect();
        if (!r || (!r.width && !r.height)) { pts.push(null); continue; }
        var px = r.left + r.width / 2 - br.left;
        pts.push([px, r.top + r.height / 2 - br.top]);
        if (r.top - br.top < firstTop) firstTop = r.top - br.top;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
      }
      // Kaynak kartların üstündeyse (tek sütun) kollar hemen kartların dışındaki oluğa inip demet
      // hâlinde akar; yan yanaysa yatay teğetle çıkıp yatay teğetle varır.
      var stacked = (hr.bottom - br.top) <= firstTop + 4;
      var rtl = minX > W / 2;                                       // noktalar sağdaysa (RTL) oluk da sağda
      var rail = rtl ? Math.min(W - 3, maxX + 16) : Math.max(3, minX - 16);
      ensure();
      for (k = 0; k < pts.length; k++) {
        var p = pts[k], set = arms[k]; if (!p || !set) continue;
        var vx = p[0] - hx, vy = p[1] - hy, m = Math.sqrt(vx * vx + vy * vy) || 1;
        var sx = hx + vx / m * rad, sy = hy + vy / m * rad;
        var dx = p[0] - sx, dy = p[1] - sy, c1x, c1y, c2x, c2y;
        var bow = Math.max(24, Math.min(80, Math.abs(dy) * .42));
        if (stacked) {                                   // demet: hemen oluğa in, dikey ak, noktaya kanca
          c1x = rail; c1y = sy + bow; c2x = rail; c2y = p[1] - bow;
        } else {                                         // yelpaze: kaynaktan ışınsal çık, karta yatay var
          var out = Math.max(28, m * .3);
          c1x = sx + vx / m * out; c1y = sy + vy / m * out;
          c2x = p[0] - (dx < 0 ? -1 : 1) * Math.max(38, Math.abs(dx) * .42); c2y = p[1];
        }
        var dd = 'M' + f(sx) + ' ' + f(sy) + 'C' + f(c1x) + ' ' + f(c1y) + ' ' + f(c2x) + ' ' + f(c2y) + ' ' + f(p[0]) + ' ' + f(p[1]);
        set[0].setAttribute('d', dd); set[1].setAttribute('d', dd); set[2].setAttribute('d', dd);
        var L = m; try { L = set[1].getTotalLength() || m; } catch (e) { L = m; }
        set[2].style.setProperty('--jend', '-' + Math.round(L + SEG + 2) + 'px');   // ışık ucu geçince söner
      }
    }

    function intro() {
      build();
      steps.forEach(function (s, i) { setTimeout(function () { s.classList.add('is-in'); }, reduce ? 0 : 130 * i); });
      if (reduce) return;                                 // hareket azaltılmışsa kartlar görünür, akış yok
      setTimeout(function () { build(); root.classList.add('journey--drawn'); }, 760);
    }

    if ('ResizeObserver' in window) new ResizeObserver(function () { build(); }).observe(body);
    else addEventListener('resize', build);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    build();

    // Gözlemci iki iş yapar: ilk görünüşte şemayı başlatır, ekrandan çıkınca CSS döngülerini duraklatır.
    if ('IntersectionObserver' in window) {
      var seen = false;
      var io = new IntersectionObserver(function (en) {
        var e = en[en.length - 1];
        if (!seen && e.isIntersecting && e.intersectionRatio >= .15) { seen = true; intro(); }
        root.classList.toggle('is-off', !e.isIntersecting);
      }, { threshold: [0, .15] });
      io.observe(root);
    } else intro();
  })();

  /* ---------- Portre çerçevesi: imleç eğimi, paralaks ve parlama (yalnız gerçek imleç) ---------- */
  (function portrait() {
    var els = $$('[data-portrait]'); if (!els.length || reduce) return;
    if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    els.forEach(function (el) {
      var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, running = false;
      function step() {
        cur.x += (tgt.x - cur.x) * .1; cur.y += (tgt.y - cur.y) * .1;
        el.style.setProperty('--rx', (cur.x * 12).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (-cur.y * 12).toFixed(2) + 'deg');
        el.style.setProperty('--px', (cur.x * -8).toFixed(1) + 'px');
        el.style.setProperty('--py', (cur.y * -8).toFixed(1) + 'px');
        el.style.setProperty('--sx', (50 + cur.x * 50).toFixed(1) + '%');
        el.style.setProperty('--sy', (40 + cur.y * 50).toFixed(1) + '%');
        if (Math.abs(tgt.x - cur.x) > .002 || Math.abs(tgt.y - cur.y) > .002) raf(step); else running = false;
      }
      function kick() { if (!running) { running = true; raf(step); } }
      el.addEventListener('mousemove', function (e) {
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        var r = el.getBoundingClientRect(); if (!r.width) return;
        tgt.x = Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5));
        tgt.y = Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5));
        kick();
      });
      el.addEventListener('mouseleave', function () { tgt.x = 0; tgt.y = 0; kick(); });
    });
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

  /* ---------- Formlar ----------
     Worker bağlıysa (FYOS_ENDPOINT) kayıt POST /lead ile sunucuya yazılır: ziyaretçi e-posta
     uygulaması açmadan «alındı» görür, sahibi kaydı /leads'te okur. Worker'a ulaşılamazsa ya da
     bağlı değilse eski yol: mailto ile ziyaretçinin e-posta uygulaması açılır. Alan adları
     sunucunun beklediği İngilizce anahtarlara çevrilir (formlar Türkçe ad kullanabiliyor).
     guard: tarayıcının kendi doğrulamasının gösteremediği durumlar için (gizli alan odaklanamadığı
     için reportValidity hiçbir balon çıkaramaz, form sessizce takılırdı). Hata metnini döndürür. */
  var FIELD_MAP = { ad: 'name', name: 'name', 'نام': 'name', 'e-posta': 'email', eposta: 'email', email: 'email', 'e-mail': 'email', 'ایمیل': 'email',
    telefon: 'phone', phone: 'phone', 'تلفن': 'phone', sirket: 'company', 'şirket': 'company', 'işletme': 'company', isletme: 'company', unternehmen: 'company', business: 'company', company: 'company', 'کسب\u200cوکار': 'company',
    mesaj: 'message', message: 'message', nachricht: 'message', 'پیام': 'message', website: 'website' };
  function leadPayload(form, kind) {
    var fd = new FormData(form), out = { kind: kind || '', lang: document.documentElement.lang || 'tr' };
    fd.forEach(function (v, k) {
      if (typeof v !== 'string' || !v.trim()) return;
      var key = FIELD_MAP[String(k).toLowerCase()] || String(k).toLowerCase();
      out[key] = v.trim();
    });
    return out;
  }
  /* sendLead(payload, onDone): worker yanıt verirse onDone(true), aksi hâlde onDone(false). */
  function sendLead(payload, onDone) {
    if (!FYOS_ENDPOINT || !window.fetch) { onDone(false); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : 0;
    fetch(FYOS_ENDPOINT.replace(/\/+$/, '') + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) { return res.json().then(function (d) { return res.ok && d && d.ok; }); })
      .then(function (okay) { clearTimeout(timer); onDone(!!okay); })
      .catch(function () { clearTimeout(timer); onDone(false); });
  }
  function wireForm(id, statusId, subject, extra, guard) {
    var form = $('#' + id), status = $('#' + statusId); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var own = guard && guard();
      if (own) { status.textContent = own.msg; if (own.focus && own.focus.focus) own.focus.focus(); return; }
      if (!form.checkValidity()) { status.textContent = t('formRequired', 'Lütfen yıldızlı alanları doldur.'); form.reportValidity(); return; }
      var fd = new FormData(form), lines = [];
      fd.forEach(function (v, k) { if (typeof v === 'string' && v.trim()) lines.push(k + ': ' + v.trim()); });
      if (extra) lines.push('', extra);
      var viaMail = function () {
        status.textContent = extra ? t('formStatusResume', 'E-posta uygulaman açılıyor — özgeçmişini ek olarak eklemeyi unutma.') : t('formStatusSent', 'Teşekkürler — mesajın hazırlandı, e-posta uygulaman açılıyor.');
        location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        form.reset(); var fn = $('#jFileName'); if (fn) fn.textContent = t('fileChoose', 'Dosya seç…');
      };
      // Dosya ekli formlar (özgeçmiş) sunucuya gitmez: ek yalnızca e-postayla gidebilir.
      if (extra) { viaMail(); return; }
      var btn = $('button[type="submit"]', form); if (btn) btn.disabled = true;
      status.textContent = t('formSending', 'Gönderiliyor…');
      sendLead(leadPayload(form, subject), function (okay) {
        if (btn) btn.disabled = false;
        if (!okay) { viaMail(); return; }
        status.textContent = t('formStatusSaved', 'Teşekkürler — mesajın ulaştı. En geç iki iş günü içinde gerçek bir insan dönüş yapar.');
        form.reset();
      });
    });
  }
  wireForm('contactForm', 'contactStatus', t('subjContact', 'FY — iletişim formu'));
  wireForm('joinForm', 'joinStatus', t('subjJoin', 'FY — özgeçmiş başvurusu'), t('resumeNote', 'Özgeçmiş: lütfen bu e-postaya dosya olarak ekleyin.'), function () {
    var f = $('#jFile');
    if (f && !(f.files && f.files.length)) return { msg: t('fileRequired', 'Lütfen özgeçmiş dosyanı seç (PDF veya Word).'), focus: $('#jFileBtn') };
    return null;
  });
  // Öğrenci paneli: panel açılana kadar şifre alınmaz; yalnızca "açılınca haber ver" e-postası hazırlanır.
  wireForm('loginForm', 'loginStatus', t('subjPortal', 'FY — öğrenci paneli açılınca haber ver'));
  var jf = $('#jFile'), jn = $('#jFileName'), jb = $('#jFileBtn');
  if (jf && jn) jf.addEventListener('change', function () { jn.textContent = jf.files[0] ? jf.files[0].name : t('fileChoose', 'Dosya seç…'); jn.classList.toggle('text-dim', !jf.files[0]); });
  // Dosya alanı gizli olduğu için etiket klavyeyle çalışmıyordu: Enter ve boşluk seçiciyi açar.
  if (jf && jb) jb.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); jf.click(); }
  });

  /* ---------- İletişim penceresi ---------- */
  (function modal() {
    var root = $('#contactModal'); if (!root) return;
    var main = $('#modalMain'), topic = $('#modalTopic'), form = $('#modalForm'), done = $('#modalDone');
    /* Randevu modu: «Ücretsiz danışmanlık görüşmesi» düğmesi data-book taşır. O zaman formun içine
       gün + saat seçici gelir (boş saatler worker'daki /slots'tan), gönderim /book'a gider ve bitiş
       panelinde randevu saati + «Takvime ekle» (.ics) bağlantısı görünür. Worker yoksa ya da saat
       listesi yüklenemezse form sıradan mesaj gibi çalışır (ziyaretçi uygun zamanı mesaja yazar). */
    var booking = false, slotsData = null;
    var doneSub = $('.modal__sub', done), doneSubMail = doneSub ? doneSub.textContent : '';
    var pick = document.createElement('div'); pick.className = 'book'; pick.id = 'bookPick'; pick.hidden = true;
    pick.innerHTML = '<p class="book__hint" id="bookHint"></p><div class="book__row">' +
      '<select class="input" id="bookDay"></select><select class="input" id="bookTime"></select></div>' +
      '<p class="form-status book__status" id="bookStatus" role="status" aria-live="polite"></p>';
    var msgField = $('textarea', form); if (msgField) form.insertBefore(pick, msgField);
    var bookDay = $('#bookDay', pick), bookTime = $('#bookTime', pick), bookStatus = $('#bookStatus', pick), bookHint = $('#bookHint', pick);
    bookDay.setAttribute('aria-label', t('bookDay', 'Gün')); bookTime.setAttribute('aria-label', t('bookTime', 'Saat'));
    var lang = document.documentElement.lang || 'tr';
    function fmtDay(iso, tz) { try { return new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)); } catch (e) { return iso.slice(0, 10); } }
    function fmtWhen(iso, tz) { try { return new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch (e) { return iso; } }
    function fillTimes() {
      var d = slotsData && slotsData.days.filter(function (x) { return x.date === bookDay.value; })[0];
      bookTime.innerHTML = '';
      (d ? d.slots : []).forEach(function (sl) { var o = document.createElement('option'); o.value = sl.at; o.textContent = sl.local; bookTime.appendChild(o); });
    }
    function loadSlots() {
      slotsData = null; bookDay.innerHTML = ''; bookTime.innerHTML = '';
      bookStatus.textContent = t('bookLoading', 'Boş saatler yükleniyor…');
      if (!FYOS_ENDPOINT || !window.fetch) { bookStatus.textContent = t('bookNone', 'Şu an boş saat yok; mesajında uygun zamanı yaz, biz ayarlarız.'); return; }
      fetch(FYOS_ENDPOINT.replace(/\/+$/, '') + '/slots').then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.days || !d.days.length) { bookStatus.textContent = t('bookNone', 'Şu an boş saat yok; mesajında uygun zamanı yaz, biz ayarlarız.'); return; }
        slotsData = d;
        d.days.forEach(function (x) { var o = document.createElement('option'); o.value = x.date; o.textContent = fmtDay(x.slots[0].at, d.tz); bookDay.appendChild(o); });
        fillTimes();
        bookHint.textContent = t('bookHint', 'Saatler {tz} saatine göre · {min} dakika').replace('{tz}', d.tz.replace(/_/g, ' ')).replace('{min}', d.slotMin);
        bookStatus.textContent = '';
      }).catch(function () { bookStatus.textContent = t('bookNone', 'Şu an boş saat yok; mesajında uygun zamanı yaz, biz ayarlarız.'); });
    }
    bookDay.addEventListener('change', fillTimes);
    function showDone(kind, d) {
      var when = $('#modalWhen', done), ics = $('#modalIcs', done);
      if (doneSub) doneSub.textContent = kind === 'mail' ? doneSubMail : t('formStatusSaved', 'Teşekkürler — mesajın ulaştı. En geç iki iş günü içinde gerçek bir insan dönüş yapar.');
      if (when) { when.hidden = kind !== 'book'; if (kind === 'book') when.textContent = t('bookDone', 'Randevun alındı: {when}. Onay ve görüşme bağlantısı e-postayla gelecek.').replace('{when}', fmtWhen(d.at, d.tz)); }
      if (ics) { ics.hidden = kind !== 'book'; if (kind === 'book') { ics.href = FYOS_ENDPOINT.replace(/\/+$/, '') + d.ics; ics.textContent = t('bookAdd', 'Takvime ekle'); } }
      form.reset(); main.hidden = true; done.hidden = false;
    }
    var card = $('.modal__card', root);
    var lastFocus = null, subject = '', trapped = false;
    /* Kart aria-modal="true" diyor; klavyede de öyle davranmalı. Tab pencerenin içinde döner,
       dışarı kaçan odak geri çekilir — yoksa arkadaki bağlantıya Enter basıldığında sayfa
       yeniden yükleniyor ve yazılmış mesaj siliniyordu. */
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function tabbables() {
      return $$(FOCUSABLE, card).filter(function (el) { return !el.hidden && el.offsetParent !== null; });
    }
    function open(subj, book) {
      subject = subj || '';
      booking = !!book;
      pick.hidden = !booking;
      if (booking) loadSlots();
      trapped = true;
      lastFocus = document.activeElement;
      if (topic) { topic.hidden = !subject; topic.textContent = subject ? t('modalTopic', 'Konu: ') + subject : ''; }
      main.hidden = false; done.hidden = true;
      root.hidden = false;
      raf(function () { raf(function () { root.classList.add('is-open'); }); });
      document.body.style.overflow = 'hidden';
      var first = $('input', form); if (first) setTimeout(function () { first.focus(); }, 300);
    }
    function close() {
      if (root.hidden) return;
      trapped = false;
      root.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { root.hidden = true; }, 260);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$('[data-modal]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); open(el.getAttribute('data-modal'), el.hasAttribute('data-book')); });
    });
    $$('[data-modal-close]', root).forEach(function (el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (!trapped || e.key !== 'Tab') return;
      var f = tabbables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!card.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener('focusin', function (e) {
      if (!trapped || card.contains(e.target)) return;
      var f = tabbables(); if (f.length) f[0].focus();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var fd = new FormData(form), lines = [];
      fd.forEach(function (v, k) { if (typeof v === 'string' && v.trim()) lines.push(k + ': ' + v.trim()); });
      var subj = 'FY — ' + (subject || t('subjDefault', 'iletişim'));
      var btn = $('button[type="submit"]', form); if (btn) btn.disabled = true;
      var viaMail = function () { location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines.join('\n')); showDone('mail'); };
      var payload = leadPayload(form, subject || t('subjDefault', 'iletişim'));
      var at = booking && slotsData && bookTime.value;
      if (at) {
        // Randevu: /book; saat az önce alındıysa listeyi tazele ve pencerede kal.
        payload.at = at;
        var ctrl = window.AbortController ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : 0;
        fetch(FYOS_ENDPOINT.replace(/\/+$/, '') + '/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
          .then(function (res) { return res.json().then(function (d) { return { status: res.status, d: d }; }); })
          .then(function (r) {
            clearTimeout(timer); if (btn) btn.disabled = false;
            if (r.status === 200 && r.d && r.d.ok) { showDone('book', r.d); return; }
            if (r.status === 409) { bookStatus.textContent = t('bookTaken', 'Bu saat az önce alındı; başka bir saat seç.'); loadSlots(); return; }
            bookStatus.textContent = (r.d && r.d.error) || t('bookFail', 'Randevu alınamadı; mesajını e-postayla gönderiyoruz.');
            if (r.status !== 400 && r.status !== 429) viaMail();
          })
          .catch(function () { clearTimeout(timer); if (btn) btn.disabled = false; bookStatus.textContent = t('bookFail', 'Randevu alınamadı; mesajını e-postayla gönderiyoruz.'); viaMail(); });
        return;
      }
      sendLead(payload, function (okay) {
        if (btn) btn.disabled = false;
        if (!okay) { viaMail(); return; }
        showDone('lead');
      });
    });
  })();
  /* ---------- Bölüm kapakları: canlı sahne yalnız gerektiğinde ----------
     Kapaklar <img> ile gömülü SVG; içlerinde bir şey kıpırdadığı anda görüntünün tamamı her karede
     yeniden rasterize ediliyor. Yedisi birden canlanınca bölüm ızgarası ekrandayken kare süresi ikiye
     katlanıyordu (ölçüldü: 1280 px'de 60 fps → 35 fps). Bu yüzden varsayılan sabit sürüm: ince imleçte
     kartın üstüne gelince o kart canlanır; dokunmatikte ekranda en çok görünen iki kart canlanır — sayı
     bilerek sınırlı: dokunmatik tablette ızgara üç ya da dört sütun olduğu için "görünen her kart" demek
     yedisinin birden canlanması demekti. Hareket azaltmada ve JavaScript kapalıyken hep sabit kalır. */
  (function chapters() {
    var imgs = $$('.chapter__img[data-live]');
    if (!imgs.length || reduce) return;
    imgs.forEach(function (img) { img.setAttribute('data-still', img.getAttribute('src')); });
    function show(img, live) {
      var next = img.getAttribute(live ? 'data-live' : 'data-still');
      if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
    }
    if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      imgs.forEach(function (img) {
        var card = img.parentNode;
        while (card && !(card.classList && card.classList.contains('chapter'))) card = card.parentNode;
        if (!card) return;
        card.addEventListener('mouseenter', function () { show(img, true); });
        card.addEventListener('mouseleave', function () { show(img, false); });
      });
      // Canlı dosyaları boşta ısıt: ilk üstüne gelmede ağdan çekme ile ölçek geçişi çakışmasın.
      var warm = function () {
        imgs.forEach(function (img) { var w = new Image(); w.src = img.getAttribute('data-live'); });
      };
      if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 2500);
      return;
    }
    if (!('IntersectionObserver' in window)) { imgs.forEach(function (img) { show(img, true); }); return; }
    var seen = [];                                  // {img, ratio} — o an ekranda olanlar
    function mark(img, ratio) {
      var i, hit = -1;
      for (i = 0; i < seen.length; i++) if (seen[i].img === img) { hit = i; break; }
      if (ratio > 0) { if (hit < 0) seen.push({ img: img, ratio: ratio }); else seen[hit].ratio = ratio; }
      else if (hit >= 0) seen.splice(hit, 1);
    }
    function apply() {
      var win = seen.slice().sort(function (a, b) { return b.ratio - a.ratio; }).slice(0, 2)
        .map(function (o) { return o.img; });
      imgs.forEach(function (img) { show(img, win.indexOf(img) >= 0); });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { mark(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
      apply();
    }, { threshold: [0, .25, .5, .75] });
    imgs.forEach(function (img) { io.observe(img); });
  })();

  /* ---------- Sayfa içi bağlantılarda sabit çubuk payı ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (a.hasAttribute('data-modal')) return;
      var id = a.getAttribute('href').slice(1), el = id && document.getElementById(id);
      if (!el) return; e.preventDefault();
      var top = el.getBoundingClientRect().top + scrollY - 64;
      scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
    });
  });
})();
