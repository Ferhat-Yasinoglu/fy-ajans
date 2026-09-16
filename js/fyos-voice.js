/* FY — FYOS sesli mod: uyandırma kelimesi, konuşmadan metne, metinden sese.
   js/main.js bu dosyayı ancak ziyaretçi sesli modu açınca yükler; kapalıyken hiç inmez.
   Dış bağımlılık yok: her şey tarayıcının kendi API'leri (SpeechRecognition, speechSynthesis);
   CSP'ye yeni bir kaynak eklemez. Kendini window.FYOS_VOICE'a yazar.

   Akış: dinle → «Faiz» duy → soruyu al → main.js yanıtı üretir → sesli oku → yine dinle.
   Ziyaretçi konuşmaya başlarsa okuma kesilir (sözünü kesebilmesi için). */
(function () {
  'use strict';

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var TTS = window.speechSynthesis;

  /* Türkçe karşılaştırma: küçük harfe indir, aksanları ASCII'ye düşür.
     "İ/ı" tarayıcılar arasında tutarsız olduğundan hepsi "i" olur. */
  var FOLD = { 'ı': 'i', 'İ': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u' };
  function fold(s) {
    s = String(s || '');
    try { s = s.toLocaleLowerCase('tr'); } catch (e) { s = s.toLowerCase(); }
    var out = '';
    for (var i = 0; i < s.length; i++) { var c = s[i]; out += (FOLD[c] != null ? FOLD[c] : c); }
    return out.replace(/[^\wçğıöşü\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function words(s) { var f = fold(s); return f ? f.split(' ') : []; }
  /* Kelimelere böler ama İKİ dizi verir: 'raw' ziyaretçinin söylediği gibi (Türkçe harfler,
     noktalama yerinde), 'key' yalnızca eşleştirme için sadeleştirilmiş hâli. Soru her zaman
     raw'dan kesilir; yoksa modele "kurs kac bolum" diye sakat bir metin giderdi. */
  function tokens(s) {
    var raw = String(s || '').trim().split(/\s+/).filter(Boolean);
    return { raw: raw, key: raw.map(function (w) { return fold(w).replace(/\s+/g, ''); }) };
  }

  /* Düzenleme uzaklığı (Levenshtein). Yalnız kısa kelimeler için — uyandırma kelimesi
     tanıyıcıdan "fayiz", "fais", "vaiz" diye de dönebiliyor. */
  function dist(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      prev = cur.slice();
    }
    return prev[n];
  }

  // Tanıyıcının "faiz" yerine yazabildiği biçimler. Normalleştirilmiş (aksansız) hâlleriyle.
  var WAKE_DEFAULT = ['faiz', 'fayiz', 'fais', 'fayis', 'fayez', 'feyiz', 'faizi', 'vaiz', 'fahiz', 'faiiz'];

  /* Kelime dizisinde uyandırma kelimesini arar; bulursa dizinini döndürür, yoksa -1.
     Birebir eşleşme ya da 1 harf uzaklık (kısa kelimede yanlış pozitifi önlemek için en az 4 harf). */
  function findWake(ws, list) {
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (w.length < 3) continue;
      for (var j = 0; j < list.length; j++) {
        var k = list[j];
        if (w === k) return i;
        if (w.length >= 4 && k.length >= 4 && dist(w, k) <= 1) return i;
      }
    }
    return -1;
  }

  /* İki metnin kelime örtüşmesi (0-1). Hoparlörden çıkan kendi sesimizi mikrofonda
     geri duyduğumuzda soru sanmamak için. */
  function overlap(a, b) {
    var x = words(a), y = words(b);
    if (!x.length || !y.length) return 0;
    var set = {}, hit = 0;
    for (var i = 0; i < y.length; i++) set[y[i]] = 1;
    for (var j = 0; j < x.length; j++) if (set[x[j]]) hit++;
    return hit / x.length;
  }

  /* Cihaz içi tanıma (Chrome 138+). 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown'
     'unknown' = tarayıcı bu API'yi bilmiyor; tanıma büyük olasılıkla tarayıcının sunucusunda yapılır. */
  function localCheck(lang) {
    if (!SR || typeof SR.available !== 'function') return Promise.resolve('unknown');
    try {
      return Promise.resolve(SR.available({ langs: [lang], processLocally: true }))
        .then(function (r) { return typeof r === 'string' ? r : (r ? 'available' : 'unavailable'); })
        .catch(function () { return 'unknown'; });
    } catch (e) { return Promise.resolve('unknown'); }
  }
  function localInstall(lang) {
    if (!SR || typeof SR.install !== 'function') return Promise.resolve(false);
    try {
      return Promise.resolve(SR.install({ langs: [lang], processLocally: true }))
        .then(function (r) { return r !== false; }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  /* Sesler geç gelir: getVoices() ilk çağrıda boş dönebilir, voiceschanged'i bekleriz. */
  function voicesReady() {
    return new Promise(function (resolve) {
      if (!TTS) return resolve([]);
      var v = TTS.getVoices();
      if (v && v.length) return resolve(v);
      var done = false, t = setTimeout(function () { if (!done) { done = true; resolve(TTS.getVoices() || []); } }, 1200);
      TTS.addEventListener('voiceschanged', function h() {
        if (done) return; done = true; clearTimeout(t);
        TTS.removeEventListener('voiceschanged', h); resolve(TTS.getVoices() || []);
      });
    });
  }
  function pickVoice(list, lang) {
    var base = String(lang || 'tr').slice(0, 2).toLowerCase(), exact = null, near = null;
    for (var i = 0; i < list.length; i++) {
      var v = list[i], vl = String(v.lang || '').toLowerCase().replace('_', '-');
      if (vl === String(lang).toLowerCase()) { if (!exact || v.localService) exact = v; }
      else if (vl.slice(0, 2) === base) { if (!near || v.localService) near = v; }
    }
    return exact || near || null;
  }

  /* create(opts) → denetleyici.
     opts: lang, wake[], onState(ad), onHeard(metin, kesin), onQuestion(metin),
           onWake(), onError(kod), onLocal(bool)
     Durumlar: 'off' kapalı · 'wake' uyandırma kelimesi bekleniyor · 'open' soru dinleniyor
               'busy' yanıt üretiliyor · 'speak' yanıt okunuyor */
  function create(opts) {
    opts = opts || {};
    var lang = opts.lang || 'tr-TR';
    var wakeList = opts.wake && opts.wake.length ? opts.wake.map(fold) : WAKE_DEFAULT;
    var onState = opts.onState || function () {}, onHeard = opts.onHeard || function () {},
        onQuestion = opts.onQuestion || function () {}, onWake = opts.onWake || function () {},
        onError = opts.onError || function () {}, onLocal = opts.onLocal || function () {};

    var rec = null, mode = 'off', want = false, local = false;
    var buf = '', quiet = 0, restarts = 0, restartAt = 0, speakingText = '', utter = null, speakSeq = 0;
    // Okuma bittikten sonra da tanıyıcı son kelimeleri geç teslim edebilir: kısa bir süre
    // daha kendi metnimizi tanırız ki hoparlörden dönen kuyruk soru sanılmasın.
    var echoText = '', echoUntil = 0;

    function setMode(m) { if (mode === m) return; mode = m; onState(m); }

    function clearQuiet() { if (quiet) { clearTimeout(quiet); quiet = 0; } }
    // 'open' iken sessizlik: elde metin varsa soruyu yolla, yoksa uyandırma beklemeye dön.
    function armQuiet(ms) {
      clearQuiet();
      quiet = setTimeout(function () {
        quiet = 0;
        if (mode !== 'open') return;
        var q = buf.trim(); buf = '';
        if (q.length > 1) { setMode('busy'); onQuestion(q); }
        else setMode('wake');
      }, ms);
    }

    function handle(text, isFinal) {
      if (!want) return;
      var raw = String(text || '').trim();
      if (!raw) return;

      // Kendi sesimizin yankısı mı? Okuduğumuz (ya da az önce okuduğumuz) metinle
      // büyük ölçüde örtüşüyorsa yok say.
      if (mode === 'speak' && speakingText && overlap(raw, speakingText) >= 0.5) return;
      if (echoText && Date.now() < echoUntil && overlap(raw, echoText) >= 0.5) return;

      var tk = tokens(raw), at = findWake(tk.key, wakeList);
      var after = tk.raw.slice(at + 1).join(' ').trim();     // uyandırma kelimesinden sonrası

      // Okuma sırasında ziyaretçi konuşursa sözümüzü keseriz (araya girme).
      if (mode === 'speak') {
        if (tk.raw.length < 2 && at < 0) return;
        stopSpeaking();
        setMode('open');
        buf = at >= 0 ? after : raw;
        onHeard(buf, false);
        armQuiet(buf.length > 1 ? 1600 : 6000);
        return;
      }

      if (mode === 'wake') {
        if (at < 0) return;
        setMode('open');
        buf = after;
        onWake();
        onHeard(after, false);
        if (isFinal && after.length > 1) { clearQuiet(); buf = ''; setMode('busy'); onQuestion(after); return; }
        armQuiet(after.length > 1 ? 1800 : 7000);
        return;
      }

      if (mode === 'open') {
        // Aynı cümlede uyandırma kelimesi yine geçerse sonrasını alırız.
        buf = (at >= 0 ? after : raw).trim();
        onHeard(buf, isFinal);
        if (isFinal && buf.length > 1) { clearQuiet(); var q = buf; buf = ''; setMode('busy'); onQuestion(q); return; }
        armQuiet(buf.length > 1 ? 1800 : 7000);
      }
    }

    function build() {
      var r = new SR();
      r.lang = lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      if (local) { try { r.processLocally = true; } catch (e) {} }
      r.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var res = e.results[i];
          handle(res[0] && res[0].transcript, !!res.isFinal);
        }
      };
      r.onerror = function (e) {
        var code = e && e.error, fatal = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', 'audio-capture': 'nomic', 'language-not-supported': 'lang' }[code];
        // 'no-speech' ve 'aborted' olağandır: onend yeniden başlatır.
        if (!fatal) return;
        want = false; setMode('off'); onError(fatal);
      };
      r.onend = function () {
        if (!want) { setMode('off'); return; }
        // Chrome sürekli modu kendiliğinden bitirir; geri açarız. Saniyede bir dönüyorsa vazgeçeriz.
        var now = Date.now();
        if (now - restartAt > 10000) { restarts = 0; restartAt = now; }
        if (++restarts > 12) { want = false; setMode('off'); onError('unstable'); return; }
        setTimeout(function () { if (want) start_(); }, 250);
      };
      return r;
    }

    function start_() {
      if (!SR) { onError('unsupported'); return; }
      if (!rec) rec = build();
      try { rec.start(); }
      catch (e) { /* zaten çalışıyor: InvalidStateError — yok sayılır */ }
    }

    function start() {
      if (!SR) { onError('unsupported'); return Promise.resolve(false); }
      want = true; buf = ''; restarts = 0;
      return localCheck(lang).then(function (state) {
        if (state === 'downloadable' || state === 'downloading') {
          // Cihaz içi model inebiliyor: indir, inene kadar tarayıcının varsayılanıyla dinle.
          localInstall(lang).then(function (ok) {
            if (ok && want) { local = true; onLocal(true); try { if (rec) rec.processLocally = true; } catch (e) {} }
          });
        }
        local = state === 'available';
        onLocal(local);
        if (rec) { try { rec.processLocally = local; } catch (e) {} }
        setMode('wake');
        start_();
        return true;
      });
    }

    function stop() {
      want = false; clearQuiet(); buf = '';
      stopSpeaking();
      if (rec) { try { rec.abort(); } catch (e) {} }
      setMode('off');
    }

    /* Okumayı keser. speakSeq artar: o ana kadarki okumanın geri dönüşleri ve nöbetçisi
       artık geçersizdir, araya giren yeni durumu ezemezler. */
    function stopSpeaking() {
      speakSeq++;
      speakingText = '';
      if (TTS) { try { TTS.cancel(); } catch (e) {} }
      utter = null;
    }

    /* Yanıtı okur; bitince yine uyandırma kelimesini beklemeye döner.
       TTS yoksa ya da patlarsa da aynı yere döneriz, mod 'speak'te asılı kalmaz. */
    function speak(text, done) {
      var t = String(text || '').trim(), guard = 0, mine;
      function back() {
        if (mine !== speakSeq) return;                        // kesilmiş ya da yerine yenisi gelmiş
        speakSeq++;
        if (guard) { clearTimeout(guard); guard = 0; }
        if (speakingText) { echoText = speakingText; echoUntil = Date.now() + 1500; }
        speakingText = ''; utter = null;
        if (want) setMode('wake');
        if (done) done();
      }
      stopSpeaking();
      mine = speakSeq;
      if (!t || !TTS || !window.SpeechSynthesisUtterance) { back(); return; }
      setMode('speak');
      speakingText = t;
      voicesReady().then(function (list) {
        // Bu arada kesildi ya da yerine yenisi geldi: durumu YENİSİ yönetiyor, dokunma.
        if (mine !== speakSeq) return;
        var u = new SpeechSynthesisUtterance(t);
        var v = pickVoice(list, lang);
        if (v) u.voice = v;
        u.lang = (v && v.lang) || lang;
        u.rate = 1.02; u.pitch = 1;
        u.onend = back;
        u.onerror = back;
        utter = u;
        // Nöbetçi: bazı sistemlerde ses yoksa ya da okuma sessizce ölürse onend hiç gelmez.
        // O hâlde mod 'speak'te asılı kalır ve FYOS bir daha uyanmaz; süre dolunca kendimiz döneriz.
        guard = setTimeout(back, Math.min(90000, 6000 + t.length * 110));
        try { TTS.speak(u); } catch (e) { back(); }
        // Uzun metinlerde bazı tarayıcılar 15 sn sonra duraklar: canlı tut.
        var keep = setInterval(function () {
          if (!utter || utter !== u) { clearInterval(keep); return; }
          try { if (TTS.speaking && TTS.paused) TTS.resume(); } catch (e) {}
        }, 5000);
      });
    }

    // Yanıt üretimi bitti ama okunacak bir şey yok: dinlemeye dön.
    function resume() { if (want) { buf = ''; setMode('wake'); } }
    // Ara bilgi okunduktan sonra dinlemeye DÖNME: asıl yanıt hâlâ üretiliyor.
    function hold() { if (want) { buf = ''; setMode('busy'); } }
    /* Karşılık verildikten sonra («Efendim?») soruyu beklemeye geç. 'wake' olmaz:
       ziyaretçi adımızı çoktan söyledi, bir daha söylemek zorunda kalmasın. */
    function listen(ms) { if (want) { buf = ''; setMode('open'); armQuiet(ms || 8000); } }

    return {
      start: start, stop: stop, speak: speak, stopSpeaking: stopSpeaking, resume: resume, hold: hold, listen: listen,
      isOn: function () { return want; },
      isLocal: function () { return local; },
      mode: function () { return mode; }
    };
  }

  window.FYOS_VOICE = {
    supported: function () { return !!SR; },
    canSpeak: function () { return !!(TTS && window.SpeechSynthesisUtterance); },
    check: localCheck,
    create: create
  };
})();
