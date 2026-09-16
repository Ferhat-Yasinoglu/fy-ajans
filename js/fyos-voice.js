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
  /* Tarayıcı sesleri cinsiyet bilgisi vermez; elde yalnızca ad var. Bu yüzden bilinen
     kadın/erkek ses adlarıyla eşleştiriyoruz. Önemi şu: Windows'ta Türkçe varsayılanı
     «Tolga» (erkek), oysa yanında «Emel» (kadın) duruyor — ad bakılmazsa hep erkek seçilir. */
  var SHE = ['emel', 'yelda', 'filiz', 'seda', 'aylin',                       // tr
             'anna', 'katja', 'marlene', 'vicki', 'hedda', 'petra', 'amala',  // de
             'samantha', 'karen', 'zira', 'aria', 'jenny', 'ava', 'joanna', 'salli', 'kimberly', 'moira', 'tessa', 'serena', 'fiona', 'susan', 'michelle', // en
             'dilara', 'darya', 'dilnavaz',                                   // fa
             'female', 'kadın', 'woman', 'weiblich'];
  var HE = ['tolga', 'ahmet', 'burak', 'stefan', 'conrad', 'hans', 'yannick', 'klaus',
            'daniel', 'david', 'mark', 'alex', 'fred', 'guy', 'ryan', 'thomas', 'george', 'james', 'oliver', 'aaron',
            'farid', 'male', 'erkek', 'man', 'männlich'];
  function nameHas(name, list) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < list.length; i++) if (n.indexOf(list[i]) >= 0) return true;
    return false;
  }
  /* Ses seçimi puanla: önce dil (tam etiket > aynı dil), sonra kadın sesi, sonra cihazda
     yüklü olması (localService — ağa çıkmaz, gecikmesi yoktur). */
  function pickVoice(list, lang) {
    var want = String(lang || 'tr-TR').toLowerCase(), base = want.slice(0, 2), best = null, bestScore = -1;
    for (var i = 0; i < list.length; i++) {
      var v = list[i], vl = String(v.lang || '').toLowerCase().replace('_', '-');
      var score = 0;
      if (vl === want) score += 100;
      else if (vl.slice(0, 2) === base) score += 60;
      else continue;                                       // başka dil: hiç bakma
      if (nameHas(v.name, SHE)) score += 30;
      else if (nameHas(v.name, HE)) score -= 20;
      if (v.localService) score += 5;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  /* create(opts) → denetleyici.
     opts: lang, wake[], onState(ad), onHeard(metin, kesin), onQuestion(metin),
           onWake(), onError(kod), onLocal(bool)
     Durumlar: 'off' kapalı · 'wake' uyandırma kelimesi bekleniyor · 'open' soru dinleniyor
               'busy' yanıt üretiliyor · 'speak' yanıt okunuyor */
  function create(opts) {
    opts = opts || {};
    var lang = opts.lang || 'tr-TR';
    /* ttsUrl verilirse yanıtlar gerçek bir insan sesiyle okunur (worker'ın /tts ucu).
       Ulaşılamaz, kapalı ya da günlük ses hakkı bitmişse sessizce tarayıcının kendi
       sesine dönülür — ses hiçbir durumda tümden kesilmez. */
    var ttsUrl = opts.ttsUrl || '';
    var wakeList = opts.wake && opts.wake.length ? opts.wake.map(fold) : WAKE_DEFAULT;
    var onState = opts.onState || function () {}, onHeard = opts.onHeard || function () {},
        onQuestion = opts.onQuestion || function () {}, onWake = opts.onWake || function () {},
        onError = opts.onError || function () {}, onLocal = opts.onLocal || function () {};

    var rec = null, mode = 'off', want = false, local = false;
    var buf = '', quiet = 0, speakingText = '', utter = null, speakSeq = 0;
    /* Tanıyıcı dayanıklılığı: 'backoff' art arda kapanmalarda giderek uzayan bekleme,
       'lastAlive' tanıyıcıdan gelen son olayın zamanı, 'starting' start() ile onstart
       arasındaki aralık, 'reopen'/'heal' zamanlayıcılar. */
    var backoff = 250, lastAlive = 0, starting = false, reopen = 0, heal = 0;
    // Okuma bittikten sonra da tanıyıcı son kelimeleri geç teslim edebilir: kısa bir süre
    // daha kendi metnimizi tanırız ki hoparlörden dönen kuyruk soru sanılmasın.
    var echoText = '', echoUntil = 0;
    var audio = null, audioUrl = '';                       // uzak sesin çalan öğesi ve blob adresi
    var warned = false;                                    // uzak ses uyarısı bir kez yazılır

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
      // Her olay «tanıyıcı yaşıyor» demektir; sağlık nöbetçisi buna bakar.
      r.onstart = function () { starting = false; backoff = 250; lastAlive = Date.now(); };
      r.onaudiostart = function () { lastAlive = Date.now(); };
      r.onspeechstart = function () { lastAlive = Date.now(); };
      r.onresult = function (e) {
        lastAlive = Date.now();
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var res = e.results[i];
          handle(res[0] && res[0].transcript, !!res.isFinal);
        }
      };
      r.onerror = function (e) {
        lastAlive = Date.now();
        var code = e && e.error, fatal = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', 'audio-capture': 'nomic', 'language-not-supported': 'lang' }[code];
        // 'no-speech', 'aborted', 'network' olağandır: onend yeniden açar.
        if (!fatal) return;
        want = false; setMode('off'); onError(fatal);
      };
      /* Chrome sürekli dinlemeyi kendiliğinden bitirir — ve yanıt okunurken bunu üst üste
         yapar (hoparlörden çıkan ses tanıyıcıyı tetikleyip durduruyor). Burada eskiden
         kapanmalar sayılıyordu ve 10 saniyede 12 tanesi sesli modu TÜMDEN kapatıyordu:
         uzun bir yanıtı okurken FYOS kendi kendini sağır ediyordu, bir daha da açılmıyordu.
         Artık vazgeçme yok; yalnızca giderek uzayan bir bekleme var (250 ms → en çok 5 sn)
         ve ilk başarılı açılışta bekleme sıfırlanıyor. */
      r.onend = function () {
        var neverStarted = starting;                       // start() çağrıldı ama onstart gelmedi
        starting = false;
        if (!want) { setMode('off'); return; }
        schedule(neverStarted);
      };
      return r;
    }

    /* Yeniden açmayı zamanlar. Bekleme YALNIZCA açılış gerçekten başarısız olduğunda uzar
       (start() çağrıldı ama onstart hiç gelmedi). Düzgün çalışıp kendiliğinden biten bir
       oturumdan sonra bekleme sıfırlanır: yoksa okuma sırasındaki arka arkaya kapanmalar
       beklemeyi saniyelere şişirir ve o süre boyunca araya girilemez. */
    function schedule(escalate) {
      if (!want) return;
      if (!escalate) backoff = 250;
      if (reopen) clearTimeout(reopen);
      reopen = setTimeout(function () { reopen = 0; start_(); }, backoff);
      if (escalate) backoff = Math.min(3000, Math.round(backoff * 1.6));
    }

    /* Tanıyıcıyı baştan kurar. start() «zaten çalışıyor» dışında bir sebeple patladığında
       nesne ölmüş demektir; eskiden hata yutuluyordu ve onend de hiç gelmediği için mikrofon
       bir daha açılmıyordu — ekranda hâlâ «dinliyorum» yazarken FYOS sağırdı. */
    function rebuild() {
      if (rec) {
        try { rec.onend = rec.onerror = rec.onresult = rec.onstart = null; } catch (e) {}
        try { rec.abort(); } catch (e) {}
      }
      rec = null;
      schedule(true);
    }

    function start_() {
      if (!SR) { onError('unsupported'); return; }
      if (!want) return;
      if (!rec) rec = build();
      starting = true;
      try { rec.start(); }
      catch (e) {
        starting = false;
        if (String(e && e.name) === 'InvalidStateError') { lastAlive = Date.now(); return; }  // zaten çalışıyor
        rebuild();
      }
    }

    /* Sağlık nöbetçisi: tanıyıcı sessizce de ölebiliyor (start() patlar, onend hiç gelmez,
       ya da tarayıcı mikrofonu bırakır). Dinlemede olmamız gerekirken bir süredir hiçbir
       olay gelmediyse tanıyıcıyı yeniden kurarız. Okuma ve yanıt üretimi sırasında sayaç
       işletilmez: orada zaten olay beklemiyoruz. */
    function healthTick() {
      if (!want) return;
      if (mode === 'speak' || mode === 'busy' || starting) { lastAlive = Date.now(); return; }
      if (Date.now() - lastAlive > 15000) { lastAlive = Date.now(); rebuild(); }
    }

    function start() {
      if (!SR) { onError('unsupported'); return Promise.resolve(false); }
      want = true; buf = ''; backoff = 250; lastAlive = Date.now();
      if (!heal) heal = setInterval(healthTick, 5000);
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
      if (reopen) { clearTimeout(reopen); reopen = 0; }
      if (heal) { clearInterval(heal); heal = 0; }
      stopSpeaking();
      if (rec) { try { rec.abort(); } catch (e) {} }
      setMode('off');
    }

    /* Okumayı keser. speakSeq artar: o ana kadarki okumanın geri dönüşleri ve nöbetçisi
       artık geçersizdir, araya giren yeni durumu ezemezler. */
    function dropAudio() {
      if (audio) { try { audio.pause(); } catch (e) {} }
      if (audioUrl) { try { URL.revokeObjectURL(audioUrl); } catch (e) {} }
      audio = null; audioUrl = '';
    }
    function stopSpeaking() {
      speakSeq++;
      speakingText = '';
      if (TTS) { try { TTS.cancel(); } catch (e) {} }
      dropAudio();
      utter = null;
    }

    /* Yanıtı okur; bitince yine uyandırma kelimesini beklemeye döner.
       İki arka uç var: worker'ın /tts ucundan gelen gerçek ses, ve tarayıcının kendi sesi.
       Uzak ses herhangi bir sebeple gelmezse (kapalı, hata, hak bitti, ağ yok) tarayıcı sesi
       devreye girer; mod hiçbir durumda 'speak'te asılı kalmaz. */
    function speak(text, done) {
      var t = String(text || '').trim(), guard = 0, mine;
      function back() {
        if (mine !== speakSeq) return;                     // kesilmiş ya da yerine yenisi gelmiş
        speakSeq++;
        if (guard) { clearTimeout(guard); guard = 0; }
        if (speakingText) { echoText = speakingText; echoUntil = Date.now() + 1500; }
        speakingText = ''; utter = null;
        dropAudio();
        if (want) setMode('wake');
        if (done) done();
      }
      stopSpeaking();
      mine = speakSeq;
      if (!t) { back(); return; }
      setMode('speak');
      speakingText = t;
      // Nöbetçi iki yol için de burada kurulur: hiçbir 'bitti' olayı gelmezse süre dolunca döneriz.
      guard = setTimeout(back, Math.min(90000, 8000 + t.length * 110));
      function toBrowser() { if (mine === speakSeq) sayLocal(t, mine, back); }
      if (ttsUrl) sayRemote(t, mine, back, toBrowser); else toBrowser();
    }

    // Worker'dan ses baytlarını indirip çalar. Ses gelmezse onFail ile tarayıcı sesine devreder.
    function sayRemote(t, mine, onEnd, onFail) {
      // Devretme tek seferlik: play() sözü ile onerror aynı başarısızlıkta ikisi birden
      // ateşlenebiliyor; korumasız bırakılırsa aynı cümle iki kez okunurdu.
      var handed = false;
      function fail(why) {
        if (handed) return; handed = true;
        // Sessiz düşüş geliştiriciyi yanıltır: en sık sebep, worker adresinin sayfanın
        // CSP'sindeki connect-src listesinde olmamasıdır (bkz. worker/README.md).
        if (!warned) { warned = true; try { console.warn('FYOS: uzak ses alınamadı, tarayıcı sesine dönüldü.', why || ''); } catch (e) {} }
        onFail();
      }
      function end() { if (handed) return; handed = true; onEnd(); }
      if (!window.fetch || !window.URL || !window.URL.createObjectURL) { fail('tarayıcı desteklemiyor'); return; }
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 12000) : 0;
      fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, lang: lang }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        // Ses yoksa worker JSON döner (kapalı, hak bitti, hata): tarayıcı sesine geçilir.
        var ct = (res.headers && res.headers.get('Content-Type')) || '';
        if (!res.ok || ct.indexOf('audio') < 0) throw new Error('ses yok: HTTP ' + res.status);
        return res.blob();
      }).then(function (blob) {
        if (mine !== speakSeq) return;                     // bu arada kesildi
        dropAudio();
        audioUrl = URL.createObjectURL(blob);
        var a = new Audio(audioUrl);
        audio = a;
        a.onended = end;
        a.onerror = function () { fail('ses çalınamadı'); };
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function (e) { fail(e && e.message); });
      }).catch(function (e) {
        if (timer) clearTimeout(timer);
        fail(e && e.message);
      });
    }

    /* Uzun metni cümlelere böler (en çok ~180 karakterlik parçalar). Sebebi tarayıcı:
       Chrome uzun bir konuşma parçasında onend'i bazen hiç göndermiyor, gönderse de
       ortada duraklıyor. Kısa parçalarda olay güvenilir geliyor; ayrıca araya girmek
       daha çabuk kesiyor. Lookbehind YOK — Safari 16.4 öncesi tüm dosyayı düşürürdü. */
    function pieces(t) {
      var raw = String(t).split(/([.!?…]+)\s+/), list = [], cur = '';
      for (var i = 0; i < raw.length; i += 2) {
        var p = (raw[i] + (raw[i + 1] || '')).trim();
        if (!p) continue;
        if (cur && (cur + ' ' + p).length > 180) { list.push(cur); cur = p; }
        else cur = cur ? cur + ' ' + p : p;
      }
      if (cur) list.push(cur);
      return list.length ? list : [String(t)];
    }

    // Tarayıcının kendi sesi (ücretsiz, çevrimdışı; sesi sistemin yüklü seslerinden seçilir).
    function sayLocal(t, mine, onEnd) {
      if (!TTS || !window.SpeechSynthesisUtterance) { onEnd(); return; }
      var list = pieces(t), at = 0;
      voicesReady().then(function (voices) {
        // Bu arada kesildi ya da yerine yenisi geldi: durumu YENİSİ yönetiyor, dokunma.
        if (mine !== speakSeq) return;
        var v = pickVoice(voices, lang);
        (function next() {
          if (mine !== speakSeq) return;
          if (at >= list.length) { onEnd(); return; }
          var piece = list[at++];
          var u = new SpeechSynthesisUtterance(piece);
          if (v) u.voice = v;
          u.lang = (v && v.lang) || lang;
          u.rate = 1.02; u.pitch = 1;
          var moved = false, wd = 0, began = false;
          function step() {
            if (moved) return; moved = true;
            if (wd) { clearTimeout(wd); wd = 0; }
            next();
          }
          u.onstart = function () { began = true; };
          u.onend = step;
          u.onerror = step;
          utter = u;
          /* İki nöbetçi var, çünkü iki ayrı arıza var.
             Kısa olan: bazı sistemlerde speak() sessizce yutuluyor, hiçbir olay gelmiyor ve
             ses de çıkmıyor. Konuşma gerçekten başladı mı 1,5 saniyede anlaşılır; başlamadıysa
             uzun nöbetçiyi beklemeye gerek yok, hemen geçeriz.
             Uzun olan: konuşma başladı ama onend gelmedi (Chrome'un bilinen hatası). */
          setTimeout(function () {
            if (moved || began) return;
            var alive = false;
            try { alive = TTS.speaking || TTS.pending; } catch (e) {}
            if (!alive) step();
          }, 1500);
          wd = setTimeout(step, 3000 + piece.length * 95);
          try {
            if (TTS.paused) TTS.resume();                  // önceki parçada donduysa çöz
            TTS.speak(u);
          } catch (e) { step(); }
        })();
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
