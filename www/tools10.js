/* Cleanova Life: Sensors (noise meter, speedometer, level and compass, light meter, vibration, Wi-Fi signal) and self-update.
   Every sensor runs only while its screen is open and stops when you leave. Nothing is recorded or uploaded. */
window.CLifeInit15 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var lget = U.lget, lset = U.lset;
  var SN = function () { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Sense; };

  CL.regTool('sensors', '📡', 2, ['سینسرز', 'Sensors'], 'sense', ['شور، رفتار، لیول، روشنی، وائی فائی', 'Noise, speed, level, light, Wi-Fi'], 'سینسر sensor شور noise db ڈیسیبل رفتار speed speedometer لیول level compass قطب نما روشنی light lux wifi وائی فائی vibration', true);
  CL.regTool('noise', '🔊', 5, ['شور ناپیں (dB)', 'Noise meter'], 'sense', ['مائیک سے آواز کی بلندی', 'Sound level from the mic'], 'شور آواز noise sound db decibel ڈیسیبل مائیک', false);
  CL.regTool('speed', '🚗', 1, ['گاڑی کی رفتار', 'Speedometer'], 'sense', ['GPS سے رفتار، حد کا الرٹ، HUD', 'GPS speed, limit alert, HUD'], 'رفتار speed speedometer gaari gari km/h mph gps hud', false);
  CL.regTool('level', '🧭', 3, ['لیول اور قطب نما', 'Level & compass'], 'sense', ['سیدھ ناپیں اور سمت دیکھیں', 'Spirit level and compass'], 'لیول level spirit قطب نما compass سمت direction angle زاویہ', false);
  CL.regTool('light', '💡', 4, ['روشنی ناپیں', 'Light meter'], 'sense', ['کمرے کی روشنی (lux)', 'Room brightness in lux'], 'روشنی light lux brightness bulb', false);
  CL.regTool('vib', '📳', 6, ['لرزش ناپیں', 'Vibration meter'], 'sense', ['مشین یا گاڑی کی لرزش', 'Vibration of a machine or vehicle'], 'لرزش vibration shake accelerometer jhatka', false);
  CL.regTool('wifi', '📶', 2, ['وائی فائی سگنل', 'Wi-Fi signal'], 'sense', ['گھر میں سب سے اچھی جگہ ڈھونڈیں', 'Find the best spot at home'], 'وائی فائی wifi wi-fi signal router سگنل', false);

  /* ---------- shared helpers ---------- */
  var cur = '', stops = [];
  function begin(name, title) { endAll(); cur = name; CL.setTop(title); }
  function onStop(fn) { stops.push(fn); }
  function endAll() { var s = stops; stops = []; s.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); cur = ''; }
  setInterval(function () { if (cur && S.view !== cur) endAll(); }, 700);
  document.addEventListener('visibilitychange', function () { if (document.hidden && cur && cur !== 'speed') endAll(); });
  function chipsRow(opts, val, cls) {
    return '<div class="chips">' + opts.map(function (o) { return '<button class="chip' + (String(o[0]) === String(val) ? ' on' : '') + '" data-' + cls + '="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function graph(el, arr, min, max, color, lim) {
    var c = el, g = c.getContext('2d'), w = c.width = c.clientWidth * 2 || 600, h = c.height = c.clientHeight * 2 || 200;
    g.clearRect(0, 0, w, h);
    if (lim !== undefined && lim >= min && lim <= max) { var ly = h - (lim - min) / (max - min) * h; g.strokeStyle = 'rgba(239,68,68,.6)'; g.setLineDash([8, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(0, ly); g.lineTo(w, ly); g.stroke(); g.setLineDash([]); }
    if (arr.length < 2) return;
    g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
    arr.forEach(function (v, i) { var x = i / Math.max(1, arr.length - 1) * w, y = h - Math.max(0, Math.min(1, (v - min) / (max - min))) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.stroke();
  }
  function beep(freq, ms) {
    try {
      var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), gn = a.createGain();
      o.frequency.value = freq || 880; gn.gain.value = 0.25; o.connect(gn); gn.connect(a.destination); o.start();
      setTimeout(function () { o.stop(); a.close(); }, ms || 250);
    } catch (e) { /* no audio */ }
    try { navigator.vibrate && navigator.vibrate(200); } catch (e) { /* ignore */ }
  }
  var KEEP = null;
  function awake(on) {
    try {
      if (on && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { KEEP = l; }).catch(function () { /* ignore */ });
      else if (!on && KEEP) { KEEP.release(); KEEP = null; }
    } catch (e) { /* ignore */ }
  }
  function note(h) { return '<p class="note" style="margin-top:10px">' + h + '</p>'; }
  function bigNum(id, color) { return '<div class="center" style="margin:6px 0"><div id="' + id + '" style="font-size:72px;font-weight:800;line-height:1.1;direction:ltr;color:' + (color || 'var(--text)') + '">–</div></div>'; }

  /* ---------- hub ---------- */
  V.sensors = function () {
    begin('sensors', T('سینسرز', 'Sensors'));
    var ids = ['noise', 'speed', 'level', 'light', 'vib', 'wifi'], R = CL.REG;
    $('#body').innerHTML = '<p class="note" style="margin-top:8px">' + tt('یہ سب فون کے اپنے سینسر سے چلتے ہیں۔ کوئی آواز یا لوکیشن ریکارڈ یا اپلوڈ نہیں ہوتی، اور اسکرین بند کرتے ہی سینسر رک جاتا ہے۔', 'These use the phone\'s own sensors. No sound or location is recorded or uploaded, and each sensor stops when you leave its screen.') + '</p><div class="grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
      ids.map(function (id) { var r = R[id]; return '<button class="card center" data-sn="' + id + '" style="margin:0;padding:16px 8px"><div style="font-size:34px">' + r.ic + '</div><b style="display:block;margin-top:6px">' + CL.L(r.n) + '</b><small class="e" style="display:block;color:var(--mut);margin-top:4px">' + CL.L(r.d) + '</small></button>'; }).join('') + '</div>' + CL.footer();
    [].forEach.call(document.querySelectorAll('[data-sn]'), function (b) { b.onclick = function () { CL.go(b.dataset.sn); }; });
  };
  CL.L = CL.L || U.L;

  /* ---------- noise meter ---------- */
  var NOTE_DB = [[30, 'سرگوشی / خاموش کمرہ', 'Whisper / quiet room'], [50, 'عام گھر', 'Normal home'], [60, 'بات چیت', 'Conversation'], [70, 'ٹریفک، ٹی وی بلند', 'Traffic, loud TV'], [85, 'بہت شور، کان کے لیے نقصان دہ ہو سکتا ہے', 'Very loud, can harm hearing'], [200, 'خطرناک شور', 'Dangerous noise']];
  function dbLabel(db) { for (var i = 0; i < NOTE_DB.length; i++) if (db < NOTE_DB[i][0]) return tt(NOTE_DB[i][1], NOTE_DB[i][2]); return ''; }
  V.noise = function () {
    begin('noise', T('شور ناپیں', 'Noise meter'));
    var cal = +lget('noisecal', 0) || 0, lim = +lget('noiselim', 85) || 0, run = false;
    $('#body').innerHTML = '<div class="card" style="margin-top:8px">' + bigNum('nd') + '<div class="center mut" style="margin-top:-4px">dB <span id="nl"></span></div>' +
      '<canvas id="ng" style="width:100%;height:100px;margin-top:10px;background:var(--bg);border-radius:12px"></canvas>' +
      '<div class="kv"><span>' + tt('کم از کم', 'Min') + '</span><b id="nmin">–</b></div><div class="kv"><span>' + tt('اوسط', 'Average') + '</span><b id="navg">–</b></div><div class="kv"><span>' + tt('زیادہ سے زیادہ', 'Max') + '</span><b id="nmax">–</b></div>' +
      '<button class="btn" id="nbtn">▶ ' + tt('شروع کریں', 'Start') + '</button></div>' +
      '<div class="card"><b>' + tt('حد کا الرٹ', 'Limit alert') + '</b>' + chipsRow([[0, tt('بند', 'Off')], [60, '60'], [70, '70'], [85, '85'], [100, '100']], lim, 'nl') +
      '<div class="kv" style="margin-top:10px"><span>' + tt('کیلیبریشن (dB)', 'Calibration (dB)') + '</span><span><button class="chip" id="ncm">−</button> <b id="ncv" style="margin:0 8px">' + (cal > 0 ? '+' : '') + cal + '</b> <button class="chip" id="ncp">+</button></span></div></div>' +
      note('⚠️ ' + tt('فون کے مائیک کی ناپ تقریباً ہوتی ہے (3 سے 5 dB کا فرق)۔ بہتر نتیجے کے لیے کسی معلوم ناپنے والے آلے سے ملا کر کیلیبریشن بدلیں۔ آواز ریکارڈ نہیں ہوتی، صرف ناپی جاتی ہے۔', 'A phone mic gives an estimate (about 3 to 5 dB off). Adjust calibration against a known meter for better accuracy. Sound is measured only, never recorded.')) + CL.footer();
    var stream = null, ac = null, an = null, buf = null, tm = 0, hist = [], mn = 999, mx = 0, sum = 0, cnt = 0, lastAlert = 0;
    function stop() { run = false; clearInterval(tm); try { stream && stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } try { ac && ac.close(); } catch (e) { /* ignore */ } stream = ac = null; var b = $('#nbtn'); if (b) b.innerHTML = '▶ ' + tt('شروع کریں', 'Start'); }
    onStop(stop);
    function tick() {
      an.getFloatTimeDomainData(buf);
      var s = 0, i; for (i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      var rms = Math.sqrt(s / buf.length); var db = Math.max(0, Math.round(20 * Math.log10(Math.max(rms, 1e-7)) + 94 + cal));
      hist.push(db); if (hist.length > 120) hist.shift();
      mn = Math.min(mn, db); mx = Math.max(mx, db); sum += db; cnt++;
      var col = db >= 85 ? '#ef4444' : db >= 70 ? '#f59e0b' : 'var(--text)';
      var nd = $('#nd'); if (!nd) return stop();
      nd.textContent = db; nd.style.color = col; $('#nl').textContent = '· ' + dbLabel(db);
      $('#nmin').textContent = mn; $('#navg').textContent = Math.round(sum / cnt); $('#nmax').textContent = mx;
      graph($('#ng'), hist, 20, 110, '#22c55e', lim || undefined);
      if (lim && db >= lim && Date.now() - lastAlert > 4000) { lastAlert = Date.now(); beep(700, 300); CL.toast('شور حد سے زیادہ: ' + db + ' dB', 'Noise above limit: ' + db + ' dB'); }
    }
    function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { CL.toast('مائیک دستیاب نہیں', 'Microphone not available'); return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (st) {
        if (cur !== 'noise') { st.getTracks().forEach(function (t) { t.stop(); }); return; }
        stream = st; ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 2048; buf = new Float32Array(an.fftSize);
        ac.createMediaStreamSource(st).connect(an); var zg = ac.createGain(); zg.gain.value = 0; an.connect(zg); zg.connect(ac.destination); if (ac.resume) ac.resume();
        run = true; mn = 999; mx = 0; sum = 0; cnt = 0; hist = []; tm = setInterval(tick, 250); $('#nbtn').innerHTML = '⏹ ' + tt('روکیں', 'Stop');
      }).catch(function () { CL.toast('مائیک کی اجازت نہیں ملی', 'Microphone permission denied'); });
    }
    $('#nbtn').onclick = function () { if (run) stop(); else start(); };
    [].forEach.call(document.querySelectorAll('[data-nl]'), function (b) { b.onclick = function () { lim = +b.dataset.nl; lset('noiselim', lim); [].forEach.call(document.querySelectorAll('[data-nl]'), function (x) { x.classList.toggle('on', x === b); }); }; });
    function setCal(d) { cal = Math.max(-30, Math.min(30, cal + d)); lset('noisecal', cal); $('#ncv').textContent = (cal > 0 ? '+' : '') + cal; }
    $('#ncm').onclick = function () { setCal(-1); }; $('#ncp').onclick = function () { setCal(1); };
    start();
  };

  /* ---------- speedometer ---------- */
  V.speed = function () {
    begin('speed', T('گاڑی کی رفتار', 'Speedometer'));
    var mph = lget('spmph', false), lim = +lget('splim', 0) || 0, hud = false, wid = null, prev = null, sp = 0, mx = 0, dist = 0, t0 = 0, moveT = 0, over = 0, acc = 0, hist = [];
    var u = function () { return mph ? 'mph' : 'km/h'; }, cv = function (ms) { return ms * (mph ? 2.23694 : 3.6); };
    $('#body').innerHTML = '<div id="sproot"><div class="card" style="margin-top:8px"><div id="spbox">' + bigNum('spv').replace('72px', '110px') + '<div class="center mut" style="margin-top:-6px" id="spu">km/h</div></div>' +
      '<canvas id="spg" style="width:100%;height:70px;margin-top:10px;background:var(--bg);border-radius:12px"></canvas>' +
      '<div class="kv"><span>' + tt('زیادہ سے زیادہ', 'Top speed') + '</span><b id="spmx">0</b></div><div class="kv"><span>' + tt('چلتے وقت اوسط', 'Average while moving') + '</span><b id="spav">0</b></div><div class="kv"><span>' + tt('فاصلہ', 'Distance') + '</span><b id="spd">0 km</b></div><div class="kv"><span>' + tt('وقت', 'Time') + '</span><b id="spt">0:00</b></div><div class="kv"><span>GPS</span><b id="spa">…</b></div></div>' +
      '<div class="card"><b>' + tt('رفتار کی حد (بیپ)', 'Speed limit (beep)') + '</b>' + chipsRow([[0, tt('بند', 'Off')], [40, '40'], [60, '60'], [80, '80'], [100, '100'], [120, '120']], lim, 'sl') +
      '<div class="chips"><button class="chip" id="spun">' + tt('یونٹ: ', 'Unit: ') + '<span id="spunt"></span></button><button class="chip" id="sphud">🪞 HUD</button><button class="chip" id="sprs">↺ ' + tt('ری سیٹ', 'Reset') + '</button></div></div>' +
      '<div class="card center" id="sptrip"><button class="btn o" id="sptr">🧭 ' + tt('سفر کا ریکارڈ کھولیں (راستہ بھی محفوظ ہو)', 'Open Travel Log (also saves the route)') + '</button></div>' +
      note('⚠️ ' + tt('گاڑی چلاتے وقت اسکرین نہ دیکھیں۔ فون ہولڈر میں لگائیں اور بیپ پر بھروسہ کریں۔ GPS کی رفتار سرنگ یا عمارت کے اندر درست نہیں ہوتی۔', 'Do not look at the screen while driving. Use a phone holder and rely on the beep. GPS speed is unreliable in tunnels or indoors.')) + '</div>' + CL.footer();
    function paint() {
      if (!$('#spv')) return;
      $('#spv').textContent = Math.round(cv(sp)); $('#spu').textContent = u(); $('#spunt').textContent = u();
      $('#spv').style.color = lim && cv(sp) > lim ? '#ef4444' : 'var(--text)';
      $('#spmx').textContent = Math.round(cv(mx)) + ' ' + u();
      var d = mph ? dist / 1609.34 : dist / 1000;
      $('#spd').textContent = d.toFixed(2) + (mph ? ' mi' : ' km');
      var el = t0 ? Math.round((Date.now() - t0) / 1000) : 0; $('#spt').textContent = Math.floor(el / 60) + ':' + String(el % 60).padStart(2, '0');
      $('#spav').textContent = moveT > 5 ? Math.round(cv(dist / moveT)) + ' ' + u() : '–';
      $('#spa').textContent = acc ? '±' + Math.round(acc) + ' m' : '…';
      graph($('#spg'), hist, 0, Math.max(60, cv(mx) + 10), '#38bdf8', lim || undefined);
    }
    function onPos(p) {
      var c = p.coords, now = p.timestamp || Date.now(); acc = c.accuracy || 0;
      var v = c.speed;
      if (v == null || isNaN(v)) { v = 0; if (prev) { var dt = (now - prev.t) / 1000; if (dt > 0.5) v = haversine(prev.la, prev.lo, c.latitude, c.longitude) / dt; } }
      if (acc > 60) v = 0;
      if (v < 0.6) v = 0;
      if (!t0) t0 = Date.now();
      if (prev && acc <= 40) { var dd = haversine(prev.la, prev.lo, c.latitude, c.longitude), dts = (now - prev.t) / 1000; if (dts > 0 && dd / dts < 90 && dd > 2) { dist += dd; moveT += dts; } }
      prev = { la: c.latitude, lo: c.longitude, t: now };
      sp = v; if (v > mx && v < 90) mx = v;
      hist.push(cv(v)); if (hist.length > 90) hist.shift();
      if (lim && cv(v) > lim && Date.now() - over > 3000) { over = Date.now(); beep(1000, 350); }
      paint();
    }
    function haversine(a, b, c, d) { var R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
    if (!navigator.geolocation) { $('#spa').textContent = tt('GPS دستیاب نہیں', 'No GPS'); } else {
      wid = navigator.geolocation.watchPosition(onPos, function () { var a = $('#spa'); if (a) a.textContent = tt('لوکیشن کی اجازت دیں', 'Allow location'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    }
    awake(true);
    onStop(function () { if (wid != null) navigator.geolocation.clearWatch(wid); awake(false); });
    [].forEach.call(document.querySelectorAll('[data-sl]'), function (b) { b.onclick = function () { lim = +b.dataset.sl; lset('splim', lim); [].forEach.call(document.querySelectorAll('[data-sl]'), function (x) { x.classList.toggle('on', x === b); }); paint(); }; });
    $('#spun').onclick = function () { mph = !mph; lset('spmph', mph); paint(); };
    $('#sphud').onclick = function () { hud = !hud; $('#spbox').style.transform = hud ? 'scaleX(-1)' : ''; $('#sphud').classList.toggle('on', hud); };
    $('#sprs').onclick = function () { mx = 0; dist = 0; moveT = 0; t0 = Date.now(); hist = []; paint(); };
    $('#sptr').onclick = function () { S.tr = null; CL.go('trips'); };
    paint();
  };

  /* ---------- level and compass ---------- */
  V.level = function () {
    begin('level', T('لیول اور قطب نما', 'Level & compass'));
    var tab = 'level', ox = +lget('lvx', 0) || 0, oy = +lget('lvy', 0) || 0, beta = 0, gamma = 0, head = null;
    $('#body').innerHTML = '<div class="chips" style="margin-top:8px"><button class="chip on" data-lt="level">' + tt('لیول', 'Level') + '</button><button class="chip" data-lt="comp">' + tt('قطب نما', 'Compass') + '</button></div><div class="card" id="lvc" style="margin-top:8px"></div>' + CL.footer();
    function draw() {
      var c = $('#lvc'); if (!c) return;
      if (tab === 'level') {
        var x = gamma - ox, y = beta - oy, tilt = Math.sqrt(x * x + y * y), px = Math.max(-1, Math.min(1, x / 30)) * 100, py = Math.max(-1, Math.min(1, y / 30)) * 100, ok = tilt < 1;
        c.innerHTML = '<div style="position:relative;width:260px;height:260px;margin:6px auto;border-radius:50%;border:3px solid var(--line);background:var(--bg)"><div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)"></div><div style="position:absolute;top:50%;left:0;right:0;height:1px;background:var(--line)"></div><div style="position:absolute;left:calc(50% - 22px + ' + (px * 1.05) + 'px);top:calc(50% - 22px + ' + (py * 1.05) + 'px);width:44px;height:44px;border-radius:50%;background:' + (ok ? '#22c55e' : '#38bdf8') + ';opacity:.9"></div></div>' +
          '<div class="center" style="font-size:44px;font-weight:800;direction:ltr;color:' + (ok ? '#22c55e' : 'var(--text)') + '">' + tilt.toFixed(1) + '°</div><div class="center mut" style="direction:ltr">X ' + x.toFixed(1) + '° · Y ' + y.toFixed(1) + '°</div><button class="btn o" id="lvz">🎯 ' + tt('اس جگہ کو صفر بنائیں', 'Set zero here') + '</button><button class="btn o" id="lvr">↺ ' + tt('صفر ہٹائیں', 'Clear zero') + '</button>' + note(tt('فون کو سطح پر سیدھا رکھیں۔ سبز رنگ کا مطلب 1° سے کم جھکاؤ ہے۔', 'Lay the phone flat on the surface. Green means under 1° of tilt.'));
        $('#lvz').onclick = function () { ox = gamma; oy = beta; lset('lvx', ox); lset('lvy', oy); };
        $('#lvr').onclick = function () { ox = oy = 0; lset('lvx', 0); lset('lvy', 0); };
      } else {
        var h = head == null ? 0 : head, dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], nm = dirs[Math.round(h / 45) % 8];
        c.innerHTML = '<div style="position:relative;width:260px;height:260px;margin:6px auto;border-radius:50%;border:3px solid var(--line);background:var(--bg)"><div style="position:absolute;inset:0;transform:rotate(' + (-h) + 'deg);transition:transform .15s"><b style="position:absolute;left:50%;top:6px;transform:translateX(-50%);color:#ef4444">N</b><b style="position:absolute;right:8px;top:50%;transform:translateY(-50%)">E</b><b style="position:absolute;left:50%;bottom:6px;transform:translateX(-50%)">S</b><b style="position:absolute;left:8px;top:50%;transform:translateY(-50%)">W</b><div style="position:absolute;left:calc(50% - 4px);top:30px;width:8px;height:100px;background:linear-gradient(#ef4444 50%,var(--mut) 50%);border-radius:4px"></div></div></div>' +
          '<div class="center" style="font-size:44px;font-weight:800;direction:ltr">' + (head == null ? '–' : Math.round(h) + '° ' + nm) + '</div>' + note(tt(head == null ? 'سینسر کا انتظار… فون کو 8 کی شکل میں ہلا کر کیلیبریٹ کریں۔' : 'قطب نما درست رکھنے کے لیے فون کو 8 کی شکل میں ہلائیں، اور دھات یا مقناطیس سے دور رکھیں۔', head == null ? 'Waiting for the sensor… wave the phone in a figure 8 to calibrate.' : 'Wave the phone in a figure 8 to calibrate, and keep it away from metal and magnets.'));
      }
    }
    function oriA(e) { if (e.alpha != null) head = e.absolute === false && head != null ? head : (e.webkitCompassHeading != null ? e.webkitCompassHeading : (360 - e.alpha) % 360); }
    function ori(e) { if (e.beta != null) { beta = e.beta; gamma = e.gamma; } if (head == null && e.alpha != null) head = (360 - e.alpha) % 360; }
    window.addEventListener('deviceorientationabsolute', oriA, true); window.addEventListener('deviceorientation', ori, true);
    var tm = setInterval(draw, 120);
    onStop(function () { clearInterval(tm); window.removeEventListener('deviceorientationabsolute', oriA, true); window.removeEventListener('deviceorientation', ori, true); });
    [].forEach.call(document.querySelectorAll('[data-lt]'), function (b) { b.onclick = function () { tab = b.dataset.lt; [].forEach.call(document.querySelectorAll('[data-lt]'), function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    draw();
  };

  /* ---------- light meter ---------- */
  var LUX = [[10, 'تقریباً اندھیرا', 'Very dark'], [50, 'مدھم روشنی', 'Dim'], [150, 'ہلکی روشنی (آرام کے لیے)', 'Soft (relaxing)'], [300, 'عام کمرہ', 'Normal room'], [500, 'پڑھنے اور کام کے لیے اچھی', 'Good for reading and work'], [1000, 'بہت روشن (باریک کام)', 'Bright (detail work)'], [1e9, 'دھوپ یا بہت تیز روشنی', 'Daylight or very bright']];
  V.light = function () {
    begin('light', T('روشنی ناپیں', 'Light meter'));
    $('#body').innerHTML = '<div class="card" style="margin-top:8px">' + bigNum('lx') + '<div class="center mut" style="margin-top:-4px">lux <span id="ll"></span></div><canvas id="lg" style="width:100%;height:80px;margin-top:10px;background:var(--bg);border-radius:12px"></canvas><div class="kv"><span>' + tt('کم از کم', 'Min') + '</span><b id="lmin">–</b></div><div class="kv"><span>' + tt('زیادہ سے زیادہ', 'Max') + '</span><b id="lmax">–</b></div></div>' +
      '<div class="card"><b>' + tt('اندازہ', 'Guide') + '</b><div class="kv"><span>' + tt('پڑھائی اور مطالعہ', 'Reading and study') + '</span><b>300–500</b></div><div class="kv"><span>' + tt('باورچی خانہ / کام', 'Kitchen / desk work') + '</span><b>300–750</b></div><div class="kv"><span>' + tt('آرام کا کمرہ', 'Living room') + '</span><b>100–200</b></div><div class="kv"><span>' + tt('پودوں کے لیے کم از کم', 'Plants (minimum)') + '</span><b>1000+</b></div></div>' + note(tt('اپنے فون کے روشنی کے سینسر کو (عموماً اسکرین کے اوپر) روشنی کی طرف رکھیں۔', 'Point the phone\'s light sensor (usually near the top of the screen) at the light.')) + CL.footer();
    var p = SN(), hist = [], mn = 1e9, mx = 0, tm = 0, ws = null;
    function show(v) {
      var e = $('#lx'); if (!e) return; v = Math.round(v); e.textContent = v; mn = Math.min(mn, v); mx = Math.max(mx, v); $('#lmin').textContent = mn; $('#lmax').textContent = mx;
      for (var i = 0; i < LUX.length; i++) if (v < LUX[i][0]) { $('#ll').textContent = '· ' + tt(LUX[i][1], LUX[i][2]); break; }
      hist.push(Math.log10(v + 1)); if (hist.length > 100) hist.shift(); graph($('#lg'), hist, 0, 4.5, '#facc15');
    }
    if (p && p.lightStart) {
      p.lightStart().then(function () { tm = setInterval(function () { p.lightRead().then(function (r) { if (r && r.lux >= 0) show(r.lux); }); }, 500); }).catch(function () { $('#lx').textContent = '✖'; $('#ll').textContent = tt('اس فون میں روشنی کا سینسر نہیں', 'No light sensor on this phone'); });
      onStop(function () { clearInterval(tm); try { p.lightStop(); } catch (e) { /* ignore */ } });
    } else if (window.AmbientLightSensor) {
      try { ws = new window.AmbientLightSensor({ frequency: 2 }); ws.onreading = function () { show(ws.illuminance); }; ws.start(); onStop(function () { ws.stop(); }); } catch (e) { $('#ll').textContent = tt('سینسر دستیاب نہیں', 'Sensor not available'); }
    } else $('#ll').textContent = tt('یہ سینسر انسٹال شدہ ایپ میں چلتا ہے', 'This sensor works in the installed app');
  };

  /* ---------- vibration meter ---------- */
  V.vib = function () {
    begin('vib', T('لرزش ناپیں', 'Vibration meter'));
    $('#body').innerHTML = '<div class="card" style="margin-top:8px">' + bigNum('vv') + '<div class="center mut" style="margin-top:-4px">m/s² <span id="vl"></span></div><div style="height:14px;border-radius:7px;background:var(--bg);margin-top:10px;overflow:hidden"><i id="vbar" style="display:block;height:100%;width:0;background:#22c55e;transition:width .15s"></i></div><canvas id="vg" style="width:100%;height:80px;margin-top:10px;background:var(--bg);border-radius:12px"></canvas><div class="kv"><span>' + tt('زیادہ سے زیادہ', 'Peak') + '</span><b id="vpk">0</b></div></div>' +
      '<button class="btn o" id="vrs">↺ ' + tt('ری سیٹ', 'Reset') + '</button>' + note(tt('فون کو مشین، میز یا گاڑی کی سیٹ پر رکھیں۔ یہ آپ کے فون کے ایکسلرومیٹر سے اندازہ ہے، پیشہ ورانہ ناپ نہیں۔', 'Place the phone on the machine, table or vehicle seat. This is an estimate from the phone accelerometer, not a professional measurement.')) + CL.footer();
    var win = [], hist = [], pk = 0, g = [0, 0, 0], got = false;
    function mot(e) {
      var a = e.acceleration, x, y, z;
      if (a && a.x != null) { x = a.x; y = a.y; z = a.z; }
      else { a = e.accelerationIncludingGravity; if (!a || a.x == null) return; g = [g[0] * .9 + a.x * .1, g[1] * .9 + a.y * .1, g[2] * .9 + a.z * .1]; x = a.x - g[0]; y = a.y - g[1]; z = a.z - g[2]; }
      got = true; win.push(x * x + y * y + z * z); if (win.length > 25) win.shift();
    }
    window.addEventListener('devicemotion', mot, true);
    var tm = setInterval(function () {
      var el = $('#vv'); if (!el) return;
      if (!got) { $('#vl').textContent = tt('سینسر کا انتظار…', 'Waiting for sensor…'); return; }
      var r = Math.sqrt(win.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, win.length)); pk = Math.max(pk, r);
      el.textContent = r.toFixed(2); $('#vpk').textContent = pk.toFixed(2);
      $('#vl').textContent = '· ' + (r < 0.1 ? tt('ساکن', 'Still') : r < 0.5 ? tt('ہلکی', 'Light') : r < 2 ? tt('درمیانی', 'Moderate') : tt('تیز', 'Strong'));
      $('#vbar').style.width = Math.min(100, r / 5 * 100) + '%'; $('#vbar').style.background = r > 2 ? '#ef4444' : r > 0.5 ? '#f59e0b' : '#22c55e';
      hist.push(r); if (hist.length > 100) hist.shift(); graph($('#vg'), hist, 0, Math.max(1, pk), '#a78bfa');
    }, 150);
    onStop(function () { clearInterval(tm); window.removeEventListener('devicemotion', mot, true); });
    $('#vrs').onclick = function () { pk = 0; hist = []; };
  };

  /* ---------- Wi-Fi signal finder ---------- */
  function wq(r) { return Math.max(0, Math.min(100, Math.round((r + 100) * 100 / 55))); }
  V.wifi = function () {
    begin('wifi', T('وائی فائی سگنل', 'Wi-Fi signal'));
    var p = SN(), spots = lget('wifispots', []) || [], last = null, mn = 0, mx = -200, tm = 0;
    function list() {
      var s = spots.slice().sort(function (a, b) { return b.r - a.r; });
      return s.length ? s.map(function (x, i) { return '<div class="kv"><span>' + (i === 0 ? '🏆 ' : '') + esc(x.n) + '</span><b style="direction:ltr">' + x.r + ' dBm · ' + wq(x.r) + '%</b></div>'; }).join('') : '<p class="mut" style="margin-top:8px">' + tt('ابھی کوئی جگہ محفوظ نہیں۔ ہر کمرے میں جا کر "یہ جگہ محفوظ کریں" دبائیں۔', 'No spots saved yet. Walk to each room and tap "Save this spot".') + '</p>';
    }
    $('#body').innerHTML = '<div class="card" style="margin-top:8px">' + bigNum('wd') + '<div class="center mut" style="margin-top:-4px">dBm <span id="wl"></span></div><div style="height:14px;border-radius:7px;background:var(--bg);margin-top:10px;overflow:hidden"><i id="wbar" style="display:block;height:100%;width:0;background:#22c55e;transition:width .3s"></i></div>' +
      '<div class="kv"><span>' + tt('نیٹ ورک', 'Network') + '</span><b id="wn">–</b></div><div class="kv"><span>' + tt('رفتار', 'Link speed') + '</span><b id="wsp">–</b></div><div class="kv"><span>' + tt('بینڈ', 'Band') + '</span><b id="wfq">–</b></div><div class="kv"><span>' + tt('اس سیشن میں بہترین / کمزور', 'Best / weakest this session') + '</span><b id="wmm" style="direction:ltr">–</b></div>' +
      '<input id="wnm" placeholder="' + tt('جگہ کا نام (مثلاً بیڈ روم)', 'Spot name (e.g. Bedroom)') + '" style="width:100%;min-height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:15px;margin-top:10px"><button class="btn" id="wsv">📍 ' + tt('یہ جگہ محفوظ کریں', 'Save this spot') + '</button></div>' +
      '<div class="card"><div class="sec" style="margin:0 0 4px">' + tt('جگہوں کا موازنہ', 'SPOTS COMPARED') + '</div><div id="wsl">' + list() + '</div>' + (spots.length ? '<button class="btn o" id="wcl">' + tt('فہرست صاف کریں', 'Clear list') + '</button>' : '') + '</div>' +
      note(tt('اچھا سگنل: -50 سے -60 dBm۔ ٹھیک: -70 تک۔ کمزور: -80 سے نیچے۔ راؤٹر کھلی اور اونچی جگہ، گھر کے بیچ میں رکھیں۔', 'Great: -50 to -60 dBm. OK: up to -70. Weak: below -80. Place the router high and in the open, near the middle of the home.')) + CL.footer();
    function poll() {
      if (!p || !p.wifi) { $('#wl').textContent = tt('یہ سینسر انسٹال شدہ ایپ میں چلتا ہے', 'This works in the installed app'); return; }
      p.wifi().then(function (r) {
        if (!$('#wd')) return; last = r;
        if (!r.connected) { $('#wd').textContent = '–'; $('#wl').textContent = '· ' + (r.enabled === false ? tt('وائی فائی بند ہے', 'Wi-Fi is off') : tt('کسی نیٹ ورک سے نہیں جڑے', 'Not connected')); return; }
        var q = wq(r.rssi); $('#wd').textContent = r.rssi; $('#wl').textContent = '· ' + q + '% ' + (q > 70 ? tt('بہترین', 'great') : q > 45 ? tt('ٹھیک', 'OK') : tt('کمزور', 'weak'));
        $('#wd').style.color = q > 70 ? '#22c55e' : q > 45 ? '#f59e0b' : '#ef4444';
        $('#wbar').style.width = q + '%'; $('#wbar').style.background = q > 70 ? '#22c55e' : q > 45 ? '#f59e0b' : '#ef4444';
        $('#wn').textContent = r.ssid || '–'; $('#wsp').textContent = r.speed ? r.speed + ' Mbps' : '–'; $('#wfq').textContent = r.freq ? (r.freq > 4000 ? '5 GHz' : '2.4 GHz') : '–';
        if (!mn || r.rssi < mn) mn = r.rssi; if (r.rssi > mx) mx = r.rssi; $('#wmm').textContent = mx + ' / ' + mn;
      }).catch(function () { /* ignore */ });
    }
    tm = setInterval(poll, 1000); poll(); onStop(function () { clearInterval(tm); });
    $('#wsv').onclick = function () {
      if (!last || !last.connected) { CL.toast('پہلے وائی فائی سے جڑیں', 'Connect to Wi-Fi first'); return; }
      var n = ($('#wnm').value || '').trim() || tt('جگہ ', 'Spot ') + (spots.length + 1);
      spots.push({ n: n, r: last.rssi, t: Date.now() }); lset('wifispots', spots); $('#wnm').value = ''; $('#wsl').innerHTML = list(); CL.toast('محفوظ ہو گیا', 'Saved');
    };
    var cl = $('#wcl'); if (cl) cl.onclick = function () { spots = []; lset('wifispots', []); V.wifi(); };
  };

  /* ---------- self-update ---------- */
  var API = 1, ready = null, busy = false;
  if (SN() && SN().api) SN().api().then(function (r) { API = r.api || 1; }).catch(function () { /* old build */ });
  function wv() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WebView; }
  function otaOk() { try { var p = SN(); if (p && p.otaOk) p.otaOk(); } catch (e) { /* ignore */ } }
  setTimeout(otaOk, 4000);
  /* new web files: download in the background, switch the next time the app comes to the front */
  var REPOP = 'atifashraf93-lang/Cleanova';
  function zipUrls(u) {
    var l = [u.zip];
    if (!u.sha) l.push('https://raw.githubusercontent.com/' + REPOP + '/ota/www.zip');
    if (u.sha) { l.push('https://cdn.jsdelivr.net/gh/' + REPOP + '@' + u.sha + '/www.zip'); l.push('https://raw.githubusercontent.com/' + REPOP + '/' + u.sha + '/www.zip'); }
    return l;
  }
  function bar(txt) {
    var b = document.getElementById('otabar');
    if (!txt) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'otabar'; b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:92px;z-index:99;background:var(--card,#111a2e);border:1px solid var(--acc);color:var(--text);border-radius:14px;padding:10px 14px;text-align:center;font-size:14px;direction:ltr'; document.body.appendChild(b); }
    b.textContent = txt;
  }
  var lis = false;
  function listen(p) { if (lis || !p.addListener) return; lis = true; try { p.addListener('otaProgress', function (e) { bar('⬇ ' + e.pct + '%'); }); p.addListener('apkProgress', function (e) { bar('⬇ ' + e.pct + '%'); }); } catch (e) { /* ignore */ } }
  function fail(e) {
    busy = false; bar(null);
    var m = String((e && (e.message || e.errorMessage)) || e || 'unknown'); lset('otaerr', m);
    CL.toast('اپڈیٹ نہیں لگ سکی: ' + m.slice(0, 140), 'Update failed: ' + m.slice(0, 140));
  }
  /* new web files: download in the background, switch the next time the app comes to the front */
  CL.doUpdate = function (u) {
    var p = SN(), w = wv();
    if (!u) return;
    if (p) listen(p);
    if (u.zip && p && p.otaApply && w && w.setServerBasePath && (u.need || 1) <= API) {
      if (busy) return; busy = true; lset('otaerr', ''); bar('⬇ 0%'); CL.toast('اپڈیٹ ڈاؤن لوڈ ہو رہی ہے…', 'Downloading update…');
      p.otaApply({ url: u.zip, urls: zipUrls(u), build: u.n }).then(function (r) { busy = false; bar(null); lset('otaerr', ''); ready = { path: r.path, n: u.n }; lset('otaready', ready); CL.toast('اپڈیٹ تیار ہے: "ابھی لگائیں" دبائیں یا ایپ دوبارہ کھولیں', 'Update ready: tap "Apply now" or reopen the app'); if (S.view === 'diag') V.diag(); else if (S.view === 'life') { var mo = $('#modal'); if (!mo || mo.hidden) setTimeout(function () { if (S.view === 'life') applyReady(); }, 1500); } }).catch(fail);
    } else if (p && p.apkInstall && /\.apk(\?|$)/i.test(u.url || '')) {
      if (busy) return; busy = true; bar('⬇ 0%'); CL.toast('نئی ایپ ڈاؤن لوڈ ہو رہی ہے…', 'Downloading the new app…');
      p.apkInstall({ url: u.url, urls: [u.url] }).then(function (r) { busy = false; bar(null); if (r && r.needPerm) CL.toast('"اس سورس سے انسٹال کی اجازت" آن کریں، پھر دوبارہ دبائیں', 'Allow installs from this app, then tap again'); }).catch(function (e) { fail(e); setTimeout(function () { CL.openUrl(u.url); }, 2500); });
    } else if (u.url) CL.openUrl(u.url);
  };
  function applyReady() {
    var r = lget('otaready', null), w = wv(); if (!r || !w || !w.setServerBasePath) return false;
    if ((window.CL_BUILD || 0) >= r.n) { lset('otaready', null); return false; }
    lset('otaready', null); lset('otatry', r.n);
    try { w.setServerBasePath({ path: r.path }).then(function () { return w.persistServerBasePath ? w.persistServerBasePath() : null; }); } catch (e) { /* ignore */ }
    return true;
  }
  CL.applyOta = function () { if (!applyReady()) CL.toast('اپڈیٹ پہلے ہی لگ چکی ہے', 'Already up to date'); };
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 20000) { if (!applyReady()) autoCheck(); }
  });
  function autoCheck() {
    var u = lget('upd', null), last = lget('updchk', 0);
    if (Date.now() - last < 30 * 60000) return;
    lset('updchk', Date.now());
    if (CL.checkUpd) CL.checkUpd(true).then(function (x) { if (x && x.n > (window.CL_BUILD || 0) && x.zip && (x.need || 1) <= API && lget('otabad', 0) !== x.n) CL.doUpdate(x); });
  }
  setTimeout(function () { if (!applyReady()) autoCheck(); }, 9000);
  /* the first start after an OTA switch: confirm */
  var ot = lget('otatry', 0); if (ot && (window.CL_BUILD || 0) >= ot) { lset('otatry', 0); CL.toast('ایپ اپڈیٹ ہو گئی ✅', 'App updated ✅'); }

  /* ---------- my utility bills ---------- */
  CL.regTool('bills', '🧾', 4, ['میری بلز', 'My bills'], 'money', ['K-Electric، SSGC، KWSB: نمبر، رقم، آخری تاریخ، یاد دہانی', 'K-Electric, SSGC, KWSB: number, amount, due date, reminders'], 'بل bill بجلی گیس پانی k-electric ke کے الیکٹرک ssgc sui gas سوئی گیس kwsb kwsc water پانی utility', true);
  var BC = { ke: ['K-Electric', '⚡', 'https://www.ke.com.pk/', 'کے الیکٹرک'], ssgc: ['SSGC', '🔥', 'https://www.ssgc.com.pk/', 'سوئی سدرن گیس'], kwsb: ['KWSB', '💧', 'https://www.kwsc.gos.pk/', 'واٹر بورڈ'] };
  function bdata() { var d = lget('bills', null); if (!d || !d.items) d = { items: [], hist: [] }; return d; }
  function bsave(d) { lset('bills', d); remind(d); }
  function dleft(due) { if (!due) return null; var t = new Date(due + 'T00:00:00'); return Math.round((t - new Date(new Date().toDateString())) / 86400000); }
  function remind(d) {
    var n = [], i = 0;
    d.items.forEach(function (b) {
      if (b.paid || !b.due) return;
      var t = new Date(b.due + 'T09:00:00');
      [[3, 'کی آخری تاریخ 3 دن میں ہے', ' is due in 3 days'], [0, 'کی آخری تاریخ آج ہے', ' is due today']].forEach(function (k) {
        var at = new Date(t.getTime() - k[0] * 86400000); if (at.getTime() > Date.now()) n.push({ id: 7410 + (i++), title: 'Cleanova Life', body: BC[b.co][0] + ' ' + tt('بل ' + k[1], 'bill' + k[2]) + (b.amt ? ' · Rs. ' + b.amt : ''), schedule: { at: at, allowWhileIdle: true } });
      });
    });
    d.items.forEach(function (b, j) {
      var day = billDay(b);
      n.push({ id: 7430 + j, title: 'Cleanova Life', body: BC[b.co][1] + ' ' + BC[b.co][0] + ': ' + tt('نیا بل آنے کا وقت ہے، بل دیکھیں', 'time to check your new bill'), schedule: { on: { day: day, hour: 10, minute: 0 }, allowWhileIdle: true } });
    });
    try {
      var ids = []; for (var k = 7410; k < 7450; k++) ids.push({ id: k });
      var go = function () { if (n.length) U.scheduleLN(n); };
      if (CL.LN && CL.LN.cancel) CL.LN.cancel({ notifications: ids }).then(go, go); else go();
    } catch (e) { /* ignore */ }
  }
  function billDay(b) { var d = +b.rd; if (d >= 1 && d <= 28) return d; var m = /-(\d{2})$/.exec(b.due || ''); return m ? Math.max(1, Math.min(28, +m[1] - 7)) : 5; }
  function bsheet(h) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = '<div style="max-height:80vh;overflow-y:auto">' + h + '</div>'; }
  var INP = 'width:100%;min-height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:15px;margin-top:8px;direction:ltr';
  /* "SSGC 4498860000 1050 2026-11-02, KWSB G0280405000, KE 0400010029501 10241 2026-11-10" */
  function parseLine(t) {
    var out = [];
    String(t).split(/[,\n;]+/).forEach(function (seg) {
      var w = seg.trim().split(/\s+/); if (w.length < 2) return;
      var k = /ssgc|gas/i.test(w[0]) ? 'ssgc' : /kwsb|kwsc|water/i.test(w[0]) ? 'kwsb' : /^(ke|kel|k-?electric)$/i.test(w[0]) ? 'ke' : '';
      if (!k) return;
      var it = { co: k, num: w[1].replace(/[^A-Za-z0-9]/g, '') }, a = +w[2]; if (w[2] && !isNaN(a)) it.amt = a; if (w[3] && /^\d{4}-\d{2}-\d{2}$/.test(w[3])) it.due = w[3];
      out.push(it);
    });
    return out;
  }
  function openBill(b) {
    try { navigator.clipboard.writeText(b.num); } catch (e) { /* ignore */ }
    CL.toast('نمبر کاپی ہو گیا: ' + b.num, 'Number copied: ' + b.num);
    var W = CL.webOpen2; if (W) W(b.url || BC[b.co][2], BC[b.co][0], b.num); else CL.openUrl(b.url || BC[b.co][2]);
  }
  function editBill(i) {
    var d = bdata(), b = i == null ? { co: 'ke', num: '' } : d.items[i];
    bsheet('<b style="font-size:18px">' + (i == null ? tt('نیا بل', 'New bill') : BC[b.co][0]) + '</b>' +
      (i == null ? '<div class="chips">' + Object.keys(BC).map(function (k) { return '<button class="chip' + (k === b.co ? ' on' : '') + '" data-bco="' + k + '">' + BC[k][0] + '</button>'; }).join('') + '</div>' : '') +
      '<input id="bn" inputmode="text" placeholder="' + tt('کنزیومر / اکاؤنٹ نمبر', 'Consumer / account number') + '" value="' + esc(b.num || '') + '" style="' + INP + '">' +
      '<input id="ba" inputmode="numeric" placeholder="' + tt('بل کی رقم (روپے)', 'Bill amount (Rs.)') + '" value="' + (b.amt || '') + '" style="' + INP + '">' +
      '<input id="bd" type="date" value="' + (b.due || '') + '" style="' + INP + '">' +
      '<div class="mut" style="font-size:12.5px;margin-top:8px">' + tt('ہر مہینے نئے بل کی یاد دہانی (تاریخ 1 سے 28)', 'Monthly reminder to check the new bill (day 1 to 28)') + '</div><input id="brd" inputmode="numeric" placeholder="5" value="' + (b.co && b.num ? billDay(b) : '') + '" style="' + INP + '"><input id="bu" placeholder="' + tt('بل دیکھنے کا لنک (اختیاری)', 'Bill page link (optional)') + '" value="' + esc(b.url || '') + '" style="' + INP + '">' +
      '<button class="btn" id="bsv">' + tt('محفوظ کریں', 'Save') + '</button>' + (i != null ? '<button class="btn o" id="bdl" style="color:var(--red)">' + tt('ہٹائیں', 'Remove') + '</button>' : ''));
    [].forEach.call(document.querySelectorAll('[data-bco]'), function (x) { x.onclick = function () { b.co = x.dataset.bco; [].forEach.call(document.querySelectorAll('[data-bco]'), function (y) { y.classList.toggle('on', y === x); }); }; });
    $('#bsv').onclick = function () {
      var n = $('#bn').value.replace(/[^A-Za-z0-9]/g, ''); if (!n) { CL.toast('نمبر لکھیں', 'Enter the number'); return; }
      var it = { co: b.co, num: n, amt: +$('#ba').value || 0, due: $('#bd').value || '', url: ($('#bu').value || '').trim(), rd: Math.max(1, Math.min(28, +$('#brd').value || 0)) || 0, paid: b.paid && b.due === $('#bd').value && b.amt === (+$('#ba').value || 0) };
      if (i == null) d.items.push(it); else d.items[i] = it;
      bsave(d); $('#modal').hidden = true; V.bills();
    };
    if (i != null) $('#bdl').onclick = function () { d.items.splice(i, 1); bsave(d); $('#modal').hidden = true; V.bills(); };
  }
  function importSheet() {
    bsheet('<b style="font-size:18px">' + tt('نمبر ایک ساتھ ڈالیں', 'Paste all numbers') + '</b><p class="note">' + tt('ایک لائن چپکائیں، مثلاً: SSGC 4498860000 1050 2026-11-02, KWSB G0280405000, KE 0400010029501 10241 2026-11-10 (رقم اور تاریخ اختیاری ہیں)', 'Paste one line, e.g.: SSGC 4498860000 1050 2026-11-02, KWSB G0280405000, KE 0400010029501 10241 2026-11-10 (amount and date are optional)') + '</p><textarea id="bp" rows="4" style="' + INP + ';padding:10px"></textarea><button class="btn" id="bpg">' + tt('شامل کریں', 'Add') + '</button>');
    $('#bpg').onclick = function () {
      var l = parseLine($('#bp').value); if (!l.length) { CL.toast('کوئی نمبر نہیں ملا', 'No numbers found'); return; }
      var d = bdata(); l.forEach(function (n) { var k = -1; d.items.forEach(function (x, j) { if (x.co === n.co && x.num === n.num) k = j; }); if (k >= 0) d.items[k] = Object.assign(d.items[k], n); else d.items.push(n); });
      bsave(d); $('#modal').hidden = true; V.bills(); CL.toast(l.length + ' بل شامل ہوئے', l.length + ' bills added');
    };
  }
  V.bills = function () {
    begin('bills', T('میری بلز', 'My bills'));
    var d = bdata(), h = '';
    var due = d.items.filter(function (b) { return !b.paid && b.amt; }), tot = due.reduce(function (a, b) { return a + b.amt; }, 0);
    h += '<div class="card" style="margin-top:8px"><div class="kv"><span>' + tt('کل ادائیگی باقی', 'Total unpaid') + '</span><b style="font-size:22px;direction:ltr">Rs. ' + tot.toLocaleString('en') + '</b></div></div>';
    if (!d.items.length) h += '<div class="card center mut">' + tt('ابھی کوئی بل نہیں۔ نیچے سے نمبر شامل کریں۔', 'No bills yet. Add your numbers below.') + '</div>';
    d.items.forEach(function (b, i) {
      var left = dleft(b.due), st = b.paid ? ['✅', tt('ادا ہو گیا', 'Paid'), '#22c55e'] : left == null ? ['', '', 'var(--mut)'] : left < 0 ? ['⚠️', tt('آخری تاریخ گزر گئی (' + (-left) + ' دن)', 'Overdue (' + (-left) + ' days)'), '#ef4444'] : left <= 3 ? ['⏰', tt(left + ' دن باقی', left + ' days left'), '#f59e0b'] : ['', tt(left + ' دن باقی', left + ' days left'), 'var(--mut)'];
      h += '<div class="card"><div class="kv" style="border:0"><span style="font-size:17px"><b>' + BC[b.co][1] + ' ' + BC[b.co][0] + '</b></span><b style="direction:ltr;font-size:20px">' + (b.amt ? 'Rs. ' + b.amt.toLocaleString('en') : '–') + '</b></div>' +
        '<div class="kv" style="border:0"><span class="mut" style="direction:ltr">' + esc(b.num) + '</span><span style="color:' + st[2] + '">' + st[0] + ' ' + st[1] + '</span></div>' + (b.due ? '<div class="mut" style="font-size:12.5px;direction:ltr">' + tt('آخری تاریخ: ', 'Due: ') + b.due + '</div>' : '') + '<div class="mut" style="font-size:12.5px">🔔 ' + tt('ہر مہینے ' + billDay(b) + ' تاریخ کو یاد دہانی', 'Reminder on day ' + billDay(b) + ' every month') + '</div>' +
        '<div class="chips"><button class="chip on" data-bo="' + i + '">🔎 ' + tt('بل دیکھیں', 'View bill') + '</button><button class="chip" data-bp="' + i + '">' + (b.paid ? tt('↺ باقی کریں', '↺ Unpaid') : '✔ ' + tt('ادا کر دیا', 'Mark paid')) + '</button><button class="chip" data-be="' + i + '">✎ ' + tt('درست کریں', 'Edit') + '</button></div></div>';
    });
    h += '<button class="btn" id="bad">＋ ' + tt('بل شامل کریں', 'Add bill') + '</button><button class="btn o" id="bim">📋 ' + tt('سب نمبر ایک ساتھ ڈالیں', 'Paste all numbers') + '</button>';
    var hist = d.hist || [];
    if (hist.length) {
      var by = {}; hist.forEach(function (x) { by[x.m] = (by[x.m] || 0) + x.a; }); var ms = Object.keys(by).sort().slice(-6), mx = Math.max.apply(null, ms.map(function (k) { return by[k]; })) || 1;
      h += '<div class="sec">' + tt('پچھلے مہینے', 'PAST MONTHS') + '</div><div class="card">' + ms.map(function (k) { return '<div class="kv" style="border:0"><span style="direction:ltr">' + k + '</span><b style="direction:ltr">Rs. ' + by[k].toLocaleString('en') + '</b></div><div class="mbar" style="margin-top:0"><i style="width:' + (by[k] / mx * 100) + '%;background:#38bdf8"></i></div>'; }).join('') + '</div>';
    }
    h += '<div class="sec">' + tt('بلز کی خبریں', 'BILLS NEWS') + '</div><div class="card" id="bnews"><span class="mut">…</span></div>';
    h += '<p class="note">' + tt('نمبر صرف آپ کے فون میں رہتے ہیں۔ "بل دیکھیں" دبانے پر نمبر کاپی ہو جاتا ہے اور کمپنی کی اصل سائٹ کھلتی ہے، کیپچا ہو تو آپ خود لکھیں۔ رقم اور تاریخ بل دیکھ کر درست کر دیں تو یاد دہانی خود لگ جاتی ہے (آخری تاریخ سے 3 دن پہلے اور اسی دن)۔', 'Numbers stay on your phone. "View bill" copies the number and opens the company\'s own site; type the captcha yourself if asked. Enter the amount and due date and reminders are set for 3 days before and on the due date.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    [].forEach.call(document.querySelectorAll('[data-bo]'), function (x) { x.onclick = function () { openBill(d.items[+x.dataset.bo]); }; });
    [].forEach.call(document.querySelectorAll('[data-be]'), function (x) { x.onclick = function () { editBill(+x.dataset.be); }; });
    [].forEach.call(document.querySelectorAll('[data-bp]'), function (x) { x.onclick = function () {
      var b = d.items[+x.dataset.bp]; b.paid = !b.paid; var mo = (b.due || new Date().toISOString().slice(0, 10)).slice(0, 7);
      d.hist = (d.hist || []).filter(function (y) { return !(y.co === b.co && y.m === mo); }); if (b.paid && b.amt) d.hist.push({ co: b.co, m: mo, a: b.amt });
      bsave(d); V.bills();
    }; });
    $('#bad').onclick = function () { editBill(null); }; $('#bim').onclick = importSheet;
    function news() {
      var el = $('#bnews'); if (!el) return; var l = CL.newsBills ? CL.newsBills() : [];
      el.innerHTML = l.length ? l.map(function (x) { return '<div class="kv" style="border:0;padding:6px 0"><a data-nl2="' + esc(x.l) + '" style="flex:1;cursor:pointer;direction:ltr;text-align:left;font-size:13.5px">' + esc(x.t) + '</a></div>'; }).join('') + '<button class="btn o" id="bnall">' + tt('سب خبریں', 'All bills news') + '</button>' : '<span class="mut">' + tt('ابھی کوئی خبر نہیں', 'No news yet') + '</span>';
      [].forEach.call(el.querySelectorAll('[data-nl2]'), function (a) { a.onclick = function () { var W = CL.webOpen2; if (W) W(a.dataset.nl2, T('خبر', 'News')); else CL.openUrl(a.dataset.nl2); }; });
      var all = $('#bnall'); if (all) all.onclick = function () { if (CL.newsCat) CL.newsCat('bills'); CL.go('news'); };
    }
    news(); if (CL.newsRefresh) CL.newsRefresh(false).then(news, function () { /* offline */ });
  };

  /* ---------- fuel rate (from the latest Pakistan news headlines) ---------- */
  CL.regTool('fuel', '⛽', 1, ['پیٹرول کی قیمت', 'Fuel rate'], 'money', ['پیٹرول، ڈیزل کی تازہ قیمت اور خرچ کا حساب', 'Latest petrol and diesel price and a cost calculator'], 'پیٹرول petrol ڈیزل diesel fuel قیمت price rate ریٹ ایندھن', true);
  var FQ = 'https://news.google.com/rss/search?q=petrol+price+Pakistan+per+litre+OGRA&hl=en-PK&gl=PK&ceid=PK:en';
  function fparse(xml) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml'), out = [];
    [].forEach.call(doc.getElementsByTagName('item'), function (n) {
      var g = function (t) { var e = n.getElementsByTagName(t)[0]; return e ? e.textContent : ''; };
      var t = g('title'), l = g('link'), d = Date.parse(g('pubDate')) || 0; if (t && /^https?:/.test(l)) out.push({ t: t, l: l, d: d });
    });
    return out.sort(function (a, b) { return b.d - a.d; });
  }
  function fprice(list, re) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i].t, m = re.exec(t);
      if (m) return { v: +m[1], t: t, l: list[i].l, d: list[i].d };
    }
    return null;
  }
  var PSO = 'https://psopk.com/ur/fuels/fuel-prices';
  function psoParse(html) {
    var tx = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    function row(name) {
      var re = new RegExp(name + '[^0-9]{0,80}?(?<![\\d.])(\\d{3}(?:\\.\\d{1,2})?)(?!\\d)', 'g'), m;
      while ((m = re.exec(tx))) { var v = +m[1]; if (v >= 100 && v < 1500) { var e = /([A-Z][a-z]+ \\d{1,2}, \\d{4})/.exec(tx.slice(m.index, m.index + 260)); return { v: v, eff: e ? e[1] : '', pso: true }; } }
      return null;
    }
    return { petrol: row('Premier Euro 5'), diesel: row('Hi-Cetane Diesel Euro 5'), octane: row('Octane Euro 5'), ldo: row('LDO'), sko: row('SKO') };
  }
  function fuelLoad(force) {
    var c = lget('fuel', null);
    if (!force && c && Date.now() - c.t < 3600000) return Promise.resolve(c);
    var news = fetch(FQ, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }).then(function (x) { return fparse(x).slice(0, 12); }).catch(function () { return []; });
    var pso = fetch(PSO, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }).then(psoParse).catch(function () { return null; });
    return Promise.all([news, pso]).then(function (r) {
      var list = r[0], o = r[1] || {}, p = o.petrol, d = o.diesel;
      if (!p) { var h = fprice(list, /petrol[^0-9]{0,40}Rs\.?\s?(\d{3}(?:\.\d{1,2})?)/i) || fprice(list, /Rs\.?\s?(\d{3}(?:\.\d{1,2})?)[^.]{0,30}petrol/i); if (h) p = h; }
      if (!d) { var h2 = fprice(list, /(?:diesel|hsd)[^0-9]{0,40}Rs\.?\s?(\d{3}(?:\.\d{1,2})?)/i); if (h2) d = h2; }
      if (!p && !d && !list.length) return c;
      var prevV = c && c.petrol ? c.petrol.v : 0;
      var n = { t: Date.now(), list: list, petrol: p || (c && c.petrol), diesel: d || (c && c.diesel), octane: o.octane || null, ldo: o.ldo || null, sko: o.sko || null, prev: c && c.petrol && p && prevV !== p.v ? prevV : (c && c.prev) || null };
      lset('fuel', n); return n;
    }).catch(function () { return c; });
  }
  V.fuel = function () {
    begin('fuel', T('پیٹرول کی قیمت', 'Fuel rate'));
    $('#body').innerHTML = '<div class="card" style="margin-top:8px" id="fbox"><span class="mut">…</span></div><div id="fcalc"></div><div class="sec">' + tt('تازہ خبریں', 'LATEST HEADLINES') + '</div><div class="card" id="fnews"></div>' +
      note(tt('قیمت PSO کی سرکاری سائٹ سے لی جاتی ہے، نہ مل سکے تو خبروں کی سرخیوں سے۔ ادائیگی سے پہلے پمپ کی قیمت دیکھ لیں۔', 'The price is read from the official PSO site, or from news headlines if that fails. Check the pump price before you rely on it.')) + CL.footer();
    function paint(c) {
      var b = $('#fbox'); if (!b) return;
      if (!c || !c.list || !c.list.length) { b.innerHTML = '<span class="mut">' + tt('قیمت نہیں مل سکی، انٹرنیٹ دیکھیں', 'Could not get the price, check the internet') + '</span><button class="btn o" id="frf">⟳ ' + tt('دوبارہ', 'Retry') + '</button>'; $('#frf').onclick = function () { fuelLoad(true).then(paint); }; return; }
      var P = c.petrol, D = c.diesel, ch = P && c.prev ? P.v - c.prev : 0;
      b.innerHTML = '<div class="kv" style="border:0"><span style="font-size:17px">⛽ ' + tt('پیٹرول', 'Petrol') + '</span><b style="font-size:26px;direction:ltr">' + (P ? 'Rs. ' + P.v : '–') + '</b></div>' + (ch ? '<div style="text-align:end;color:' + (ch < 0 ? '#22c55e' : '#ef4444') + ';direction:ltr;font-size:13px">' + (ch < 0 ? '▼ ' : '▲ ') + Math.abs(ch).toFixed(2) + '</div>' : '') +
        '<div class="kv"><span>🛢 ' + tt('ڈیزل', 'Diesel') + '</span><b style="direction:ltr">' + (D ? 'Rs. ' + D.v : '–') + '</b></div>' + (c.octane ? '<div class="kv"><span>🏎 ' + tt('ہائی اوکٹین', 'High octane') + '</span><b style="direction:ltr">Rs. ' + c.octane.v + '</b></div>' : '') + (c.ldo ? '<div class="kv"><span>' + tt('لائٹ ڈیزل (LDO)', 'Light diesel (LDO)') + '</span><b style="direction:ltr">Rs. ' + c.ldo.v + '</b></div>' : '') + (c.sko ? '<div class="kv"><span>' + tt('مٹی کا تیل', 'Kerosene') + '</span><b style="direction:ltr">Rs. ' + c.sko.v + '</b></div>' : '') + '<div class="mut" style="font-size:12px;margin-top:6px">' + (P && P.pso ? '✅ ' + tt('PSO کی سرکاری سائٹ سے', 'From the official PSO site') + (P.eff ? ' · ' + tt('نافذ: ', 'Effective: ') + P.eff : '') : '⚠️ ' + tt('خبروں کی سرخیوں سے، سرکاری قیمت نہیں مل سکی', 'From news headlines; the official price could not be read')) + '<br>' + tt('آخری اپ ڈیٹ: ', 'Updated: ') + new Date(c.t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) + '</div><button class="btn o" id="frf">⟳ ' + tt('تازہ کریں', 'Refresh') + '</button>';
      $('#frf').onclick = function () { fuelLoad(true).then(paint); };
      var pr = P ? P.v : (D ? D.v : 0);
      $('#fcalc').innerHTML = pr ? '<div class="card"><b>' + tt('خرچ کا حساب', 'Cost calculator') + '</b><input id="fl" inputmode="decimal" placeholder="' + tt('لیٹر', 'Litres') + '" style="' + INP + '"><div id="flr" class="center" style="font-size:18px;font-weight:700;margin:8px 0;direction:ltr">–</div><input id="fr" inputmode="numeric" placeholder="' + tt('رقم (روپے)', 'Amount (Rs.)') + '" style="' + INP + '"><div id="frr" class="center" style="font-size:18px;font-weight:700;margin-top:8px;direction:ltr">–</div></div>' : '';
      if (pr) { $('#fl').oninput = function () { var v = +this.value; $('#flr').textContent = v ? 'Rs. ' + Math.round(v * pr).toLocaleString('en') : '–'; }; $('#fr').oninput = function () { var v = +this.value; $('#frr').textContent = v ? (v / pr).toFixed(2) + ' L' : '–'; }; }
      $('#fnews').innerHTML = c.list.slice(0, 6).map(function (x) { return '<div class="kv" style="border:0;padding:6px 0"><a data-fn="' + esc(x.l) + '" style="flex:1;cursor:pointer;direction:ltr;text-align:left;font-size:13.5px">' + esc(x.t) + '</a></div>'; }).join('');
      [].forEach.call(document.querySelectorAll('[data-fn]'), function (a) { a.onclick = function () { var W = CL.webOpen2; if (W) W(a.dataset.fn, T('خبر', 'News')); else CL.openUrl(a.dataset.fn); }; });
    }
    var c0 = lget('fuel', null); if (c0) paint(c0);
    fuelLoad(!c0 || Date.now() - c0.t > 600000).then(paint);
  };
  (CL.homeHooks = CL.homeHooks || []).push(function () {
    var g = document.querySelector('#body .lgreet'), old = document.getElementById('fuelc'); if (old) old.remove(); if (!g) return;
    var c = lget('fuel', null); if (!c || !c.petrol) return;
    var ch = c.prev ? c.petrol.v - c.prev : 0;
    g.insertAdjacentHTML('afterend', '<button class="card" id="fuelc" style="width:100%;display:flex;gap:12px;align-items:center;margin:8px 0;text-align:start"><span style="font-size:24px">⛽</span><div style="flex:1"><b>' + tt('پیٹرول', 'Petrol') + ' Rs. ' + c.petrol.v + '</b><small style="display:block;color:var(--mut);font-size:12.5px">' + (c.diesel ? tt('ڈیزل', 'Diesel') + ' Rs. ' + c.diesel.v : '') + '</small></div>' + (ch ? '<b style="color:' + (ch < 0 ? '#22c55e' : '#ef4444') + ';direction:ltr">' + (ch < 0 ? '▼ ' : '▲ ') + Math.abs(ch).toFixed(2) + '</b>' : '<small style="color:var(--mut);direction:ltr">' + new Date(c.t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) + '</small>') + '</button>');
    document.getElementById('fuelc').onclick = function () { CL.go('fuel'); };
  });
  setTimeout(function () { var c = lget('fuel', null); if (!c || Date.now() - c.t > 3600000) fuelLoad(false); }, 7000);

  if (CL.wrapTools) CL.wrapTools();
};
