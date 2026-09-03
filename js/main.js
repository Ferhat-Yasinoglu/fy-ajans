/* FY — Yapay Zekâ Ajansı · ana betik
   Bölümler: üst çubuk, mobil menü, görünürlük animasyonu, hero devre ağı,
   kurs kapağı, FYOS sahnesi (ağ, ses dalgası, baloncuklu sohbet), sekmeler, beyin grafiği,
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

  /* ---------- FYOS sahnesi: canlı ağ + ses dalgası ----------
     Dört durum (idle/thinking/speaking/listening), kendi kendine renk gezintisi,
     dokununca su gibi yayılan halka, lifler üzerinde akan ışık paketleri,
     rastgele kıvılcımlar ve iz bırakan çizim. */
  (function mesh() {
    var canvas = $('#meshCanvas'), area = $('#stageArea'), voiceC = $('#voiceCanvas');
    if (!canvas || !area) return;
    var STATES = {
      idle:      { speed: 1,   fireEvery: 3,   bright: 1,    waveAmp: .25, waveFreq: 1,   shimmer: 0 },
      thinking:  { speed: 2,   fireEvery: 1.1, bright: 1.25, waveAmp: .35, waveFreq: 1.6, shimmer: .3 },
      speaking:  { speed: 1.4, fireEvery: 2,   bright: 1.35, waveAmp: 1,   waveFreq: 2.2, shimmer: 1 },
      listening: { speed: .55, fireEvery: 4.5, bright: .72,  waveAmp: .12, waveFreq: .5,  shimmer: 0 }
    };
    var PALETTE = [190, 210, 265, 300, 160, 330, 45];
    var BADGE = { idle: 'Canlı ve çevrimiçi', thinking: 'Düşünüyorum…', speaking: 'Yanıt veriyorum', listening: 'Dinliyorum' };
    var badge = $('#liveState');

    var seed = 1337;
    function srnd() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    function gauss() { return (srnd() + srnd() + srnd() + srnd() - 2) / 2; }

    var nodes = [], edges = [], packets = [], sparks = [], ripples = [];
    for (var i = 0; i < 80; i++) {
      var hub = i < 8;
      nodes.push({
        bx: .5 + .42 * gauss(), by: .5 + .4 * gauss(), x: 0, y: 0,
        r: hub ? 6 + 2 * srnd() : 1.5 + 2.5 * srnd(), hub: hub,
        seedA: 1000 * srnd(), seedB: 1000 * srnd(), purple: srnd() < .12
      });
    }

    var w = 0, h = 0;
    function buildEdges() {
      edges = [];
      var s2 = 4242, rr = function () { s2 = s2 * 16807 % 2147483647; return (s2 - 1) / 2147483646; };
      var reach = .24 * Math.min(w, h);
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var d = Math.hypot((nodes[i].bx - nodes[j].bx) * w, (nodes[i].by - nodes[j].by) * h);
        if (d < reach && rr() < .55) edges.push({
          a: i, b: j, cpOff: (rr() - .5) * d * .55,
          alpha: Math.max(.05, .35 * (1 - d / reach)),
          purple: (nodes[i].purple || nodes[j].purple) ? rr() < .5 : rr() < .06
        });
      }
    }

    var hue = 190, hueTarget = 190, hueTimer = 9, hueLast = -999;
    function col(l, a, off, sat) {
      return 'hsla(' + ((hue + (off || 0) + 360) % 360) + ',' + (sat || 85) + '%,' + l + '%,' + a + ')';
    }
    // Kavisli lif üzerinde nokta (quadratic bezier)
    function bez(e, t) {
      var a = nodes[e.a], b = nodes[e.b];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1;
      var cx = mx + -dy / dd * e.cpOff, cy = my + dx / dd * e.cpOff, m = 1 - t;
      return { x: m * m * a.x + 2 * m * t * cx + t * t * b.x, y: m * m * a.y + 2 * m * t * cy + t * t * b.y, cx: cx, cy: cy };
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
      if (!visible(canvas) && !ripples.length) { raf(draw); return; }
      var f = fit(canvas), ctx = f.ctx;
      if (f.w !== w || f.h !== h) { w = f.w; h = f.h; buildEdges(); }
      var s = Math.min((now - tPrev) / 1000, .05); tPrev = now; q += s;

      var lerp = 2.2 * Math.min(1, s / .5);
      for (var k in cur) cur[k] += (target[k] - cur[k]) * lerp;

      // Renk kendi kendine gezinir
      if ((hueTimer -= s) <= 0) { hueTarget = PALETTE[Math.floor(Math.random() * PALETTE.length)]; hueTimer = 12 + 10 * Math.random(); }
      var hd = (hueTarget - hue + 540) % 360 - 180;
      hue += hd * Math.min(1, .35 * s);
      if (Math.abs(hue - hueLast) >= .5) { hueLast = hue; document.documentElement.style.setProperty('--mesh-hue', hue.toFixed(1)); }

      var osc = 1 + Math.sin(q * (stateName === 'listening' ? .9 : 1.6)) * (stateName === 'listening' ? .12 : .05);
      var bright = cur.bright * osc;

      // İz bırakan zemin
      ctx.fillStyle = 'rgba(7, 6, 4, 0.28)';
      ctx.fillRect(0, 0, w, h);

      nodes.forEach(function (nd) {
        nd.x = nd.bx * w + 6 * Math.sin(.3 * q + nd.seedA) + 4 * Math.cos(.17 * q + nd.seedB);
        nd.y = nd.by * h + 6 * Math.cos(.26 * q + nd.seedB) + 4 * Math.sin(.21 * q + nd.seedA);
      });

      // Su gibi yayılan halkalar
      for (var ri = ripples.length - 1; ri >= 0; ri--) {
        var rp = ripples[ri];
        rp.r += s * Math.max(w, h) * .75; rp.alpha -= .75 * s;
        if (rp.alpha <= 0) ripples.splice(ri, 1);
      }
      function boost(x, y) {
        var a = 0;
        for (var i = 0; i < ripples.length; i++) {
          var d = Math.abs(Math.hypot(x - w / 2, y - h / 2) - ripples[i].r);
          if (d < 90) a += (1 - d / 90) * ripples[i].alpha;
        }
        return a;
      }

      // Kavisli lifler
      ctx.lineWidth = .7;
      for (var ei = 0; ei < edges.length; ei++) {
        var e = edges[ei], a = nodes[e.a], b = nodes[e.b], p = bez(e, .5);
        var al = e.alpha * bright * .9;
        if (cur.shimmer > .01) al *= 1 + .5 * cur.shimmer * Math.sin(6 * q + 1.7 * ei);
        al += .4 * boost((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.strokeStyle = e.purple ? col(75, Math.min(al, .7), 55) : col(60, Math.min(al, .7));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(p.cx, p.cy, b.x, b.y); ctx.stroke();
      }

      // Lifler üzerinde akan ışık paketleri
      while (edges.length && packets.length < 10) spawnPacket();
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
        sparks.push({ x: sn.x, y: sn.y, r: 2, max: 34 + 22 * Math.random(), alpha: .75 });
      }
      for (var si = sparks.length - 1; si >= 0; si--) {
        var sp = sparks[si];
        sp.r += 46 * s; sp.alpha -= 1.15 * s;
        if (sp.alpha <= 0 || sp.r >= sp.max) { sparks.splice(si, 1); continue; }
        ctx.strokeStyle = col(70, sp.alpha * bright); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 6.283); ctx.stroke();
        ctx.fillStyle = col(93, .8 * sp.alpha * bright, 0, 60);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.4, 0, 6.283); ctx.fill();
      }

      // Düğümler
      ctx.lineWidth = .7; ctx.shadowBlur = 0;
      nodes.forEach(function (nd) {
        if (nd.hub) return;
        var t = boost(nd.x, nd.y), a = Math.min(1, .65 * bright + t);
        ctx.fillStyle = nd.purple ? col(75, a, 55) : col(60, a);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * (1 + .4 * t), 0, 6.283); ctx.fill();
      });
      ctx.shadowBlur = 14;
      nodes.forEach(function (nd) {
        if (!nd.hub) return;
        var t = boost(nd.x, nd.y), a = Math.min(1, .9 * bright + t);
        ctx.shadowColor = nd.purple ? col(75, .8, 55) : col(62, .8);
        ctx.fillStyle = nd.purple ? col(75, a, 55) : col(70, a);
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r * (1 + .4 * t), 0, 6.283); ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Halkaların kendisi
      ripples.forEach(function (rp) {
        ctx.strokeStyle = col(62, .5 * rp.alpha); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, rp.r, 0, 6.283); ctx.stroke();
      });

      // Ses dalgası: tek parlayan çizgi
      if (voiceC) {
        var vf = fit(voiceC), vc = vf.ctx, C = vf.w, E = vf.h;
        vc.clearRect(0, 0, C, E);
        vc.strokeStyle = col(68, .75 + .25 * cur.waveAmp); vc.lineWidth = 1.6;
        vc.shadowBlur = 8; vc.shadowColor = col(62, .8);
        vc.beginPath();
        var D = E / 2;
        for (var x = 0; x <= C; x += 2) {
          var env = Math.sin(x / C * Math.PI), yy;
          if (stateName === 'speaking') yy = D + env * (4 * Math.sin(.11 * x + 14 * q) + 5 * Math.sin(.043 * x + 9 * q) + 3 * Math.sin(.021 * x + 21 * q)) * cur.waveAmp * .9;
          else yy = D + env * Math.sin(.05 * x + 2.4 * q * cur.waveFreq) * 7 * cur.waveAmp * 4;
          if (x === 0) vc.moveTo(x, yy); else vc.lineTo(x, yy);
        }
        vc.stroke(); vc.shadowBlur = 0;
      }
      raf(draw);
    }

    if (reduce) {
      // Hareket azaltılmışsa: tek karelik durağan çizim
      var f0 = fit(canvas); w = f0.w; h = f0.h; buildEdges();
      var ctx0 = f0.ctx;
      ctx0.fillStyle = '#070604'; ctx0.fillRect(0, 0, w, h);
      nodes.forEach(function (nd) { nd.x = nd.bx * w; nd.y = nd.by * h; });
      ctx0.lineWidth = .7;
      edges.forEach(function (e) {
        var a = nodes[e.a], b = nodes[e.b], p = bez(e, .5);
        ctx0.strokeStyle = e.purple ? col(75, Math.min(.9 * e.alpha, .7), 55) : col(60, Math.min(.9 * e.alpha, .7));
        ctx0.beginPath(); ctx0.moveTo(a.x, a.y); ctx0.quadraticCurveTo(p.cx, p.cy, b.x, b.y); ctx0.stroke();
      });
      nodes.forEach(function (nd) {
        ctx0.fillStyle = nd.purple ? col(75, nd.hub ? .9 : .65, 55) : col(nd.hub ? 70 : 60, nd.hub ? .9 : .65);
        ctx0.beginPath(); ctx0.arc(nd.x, nd.y, nd.r, 0, 6.283); ctx0.fill();
      });
      if (voiceC) {
        var vf0 = fit(voiceC), vc0 = vf0.ctx;
        vc0.strokeStyle = col(68, .8); vc0.lineWidth = 1.6;
        vc0.beginPath(); vc0.moveTo(0, vf0.h / 2); vc0.lineTo(vf0.w, vf0.h / 2); vc0.stroke();
      }
    } else {
      raf(draw);
    }

    area.addEventListener('pointerdown', function () { if (!reduce) ripples.push({ r: 0, alpha: .9 }); });
    window.FYOS = {
      setHue: function (hh) { hueTarget = hh; hueTimer = 15; if (!reduce) ripples.push({ r: 0, alpha: .9 }); },
      ping: function () { if (!reduce) ripples.push({ r: 0, alpha: .9 }); },
      setState: setState
    };
    setState('idle');
  })();

  /* ---------- FYOS: sohbet (çevrimdışı demo, baloncuklu geçmiş) ----------
     Gerçek bir modele bağlamak için reply() içindeki yanıt üretimini
     kendi API çağrınla değiştir. */
  (function ask() {
    var form = $('#askForm'), input = $('#askInput'), send = $('#askSend'), log = $('#askLog'), sub = $('#stageSub'), left = $('#askLeft');
    if (!form) return;
    var quota = 4, key = 'fyos-quota-' + new Date().toISOString().slice(0, 10), busy = false, idleTimer = 0;
    try { quota = Math.max(0, 4 - (parseInt(localStorage.getItem(key) || '0', 10))); } catch (e) {}
    if (left) left.textContent = quota;
    input.addEventListener('input', function () { send.disabled = !input.value.trim() || quota <= 0 || busy; });
    input.addEventListener('focus', function () { if (!busy && window.FYOS) window.FYOS.setState('listening'); });
    input.addEventListener('blur', function () { if (!busy && window.FYOS) window.FYOS.setState('idle'); });
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
    function bubble(role, text) {
      var d = document.createElement('div');
      d.className = 'msg msg--' + role; d.textContent = text;
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim(); if (!q || quota <= 0 || busy) return;
      quota--; if (left) left.textContent = quota;
      try { localStorage.setItem(key, String(4 - quota)); } catch (er) {}
      input.value = ''; send.disabled = true; busy = true;
      clearTimeout(idleTimer);
      bubble('user', q);
      if (window.FYOS) window.FYOS.setState('thinking');
      if (sub) sub.textContent = 'Düşünüyorum…';
      setTimeout(function () {
        var text = reply(q), b = bubble('bot', ''), i = 0;
        if (window.FYOS) { window.FYOS.setState('speaking'); window.FYOS.ping(); }
        (function type() {
          b.textContent = text.slice(0, i); log.scrollTop = log.scrollHeight;
          if (i++ < text.length) setTimeout(type, 14);
          else {
            busy = false;
            if (sub) sub.textContent = quota > 0 ? 'Başka bir şey sor.' : 'Bugünlük bu kadar — yarın yine buradayım.';
            idleTimer = setTimeout(function () { if (!busy && window.FYOS) window.FYOS.setState('idle'); }, 3500);
          }
        })();
      }, 600);
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

  /* ---------- İletişim penceresi ---------- */
  (function modal() {
    var root = $('#contactModal'); if (!root) return;
    var main = $('#modalMain'), topic = $('#modalTopic'), form = $('#modalForm'), done = $('#modalDone');
    var lastFocus = null, subject = '';
    function open(subj) {
      subject = subj || '';
      lastFocus = document.activeElement;
      if (topic) { topic.hidden = !subject; topic.textContent = subject ? 'Konu: ' + subject : ''; }
      main.hidden = false; done.hidden = true;
      root.hidden = false;
      raf(function () { raf(function () { root.classList.add('is-open'); }); });
      document.body.style.overflow = 'hidden';
      var first = $('input', form); if (first) setTimeout(function () { first.focus(); }, 300);
    }
    function close() {
      if (root.hidden) return;
      root.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { root.hidden = true; }, 260);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    $$('[data-modal]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); open(el.getAttribute('data-modal')); });
    });
    $$('[data-modal-close]', root).forEach(function (el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var fd = new FormData(form), lines = [];
      fd.forEach(function (v, k) { if (typeof v === 'string' && v.trim()) lines.push(k + ': ' + v.trim()); });
      var subj = 'FY — ' + (subject || 'iletişim');
      location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(lines.join('\n'));
      form.reset(); main.hidden = true; done.hidden = false;
    });
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
