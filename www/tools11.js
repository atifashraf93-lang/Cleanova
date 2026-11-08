/* Cleanova Life: speed card on Home.
   A small card normally. When the vehicle starts moving it grows into a big speedometer circle, and goes back to small
   a while after you stop. GPS runs only while Home is on screen; nothing is recorded or uploaded.
   The speed limit is the one you set yourself in the Speed tool; it is not the road's official limit. */
window.CLifeInit16 = function (CL) {
  'use strict';
  var S = CL.S, tt = CL.tt, U = CL.u, lget = U.lget, lset = U.lset;
  var G = { w: null, sp: 0, mx: 0, dist: 0, moveT: 0, t0: 0, prev: null, acc: 0, big: false, slow: 0, fast: 0, over: 0, fix: 0, err: '' };
  var LIMS = [0, 40, 60, 80, 100, 120];
  try { if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (r) { if (r.state === 'granted') lset('spd.ok', true); }); } catch (e) { /* ignore */ }
  function isMph() { return !!lget('spmph', false); }
  function lim() { return +lget('splim', 0) || 0; }
  function cv(ms) { return ms * (isMph() ? 2.23694 : 3.6); }
  function auto() { return lget('spd.auto', true) !== false; }
  function el(id) { return document.getElementById(id); }
  function card() { return el('spdc'); }

  function haversine(a, b, c, d) { var R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
  function beep() {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var c = new A(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 1000; g.gain.value = 0.25; o.connect(g); g.connect(c.destination); o.start(); setTimeout(function () { o.stop(); c.close(); }, 300);
    } catch (e) { /* no audio */ }
  }

  function dial(frac, color) {
    var C = 2 * Math.PI * 80, track = C * 0.75;
    frac = Math.max(0, Math.min(1, frac));
    return '<svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true" style="display:block;margin:0 auto"><g transform="rotate(135 100 100)" fill="none" stroke-linecap="round" stroke-width="15">' +
      '<circle cx="100" cy="100" r="80" stroke="#1b2f52" stroke-dasharray="' + track + ' ' + C + '"/>' +
      '<circle id="spdarc" cx="100" cy="100" r="80" stroke="' + color + '" stroke-dasharray="' + (track * frac) + ' ' + C + '" style="transition:stroke-dasharray .6s ease,stroke .3s"/></g></svg>';
  }
  function html() {
    var u = isMph() ? 'mph' : 'km/h', L = lim();
    if (!G.big) {
      return '<div class="card" id="spdc" style="display:flex;gap:10px;align-items:center;margin:8px 0"><span style="font-size:22px">🚗</span>' +
        '<div style="flex:1"><b>' + tt('رفتار', 'Speed') + '</b><div class="mut" id="spdn" style="font-size:12px">' + hintText() + '</div></div>' +
        '<b id="spdv" style="font:800 22px system-ui;direction:ltr">' + (G.fix ? Math.round(cv(G.sp)) : '–') + '</b><span class="mut" style="font-size:11px;direction:ltr">' + u + '</span>' +
        '<button id="spdx" class="ib" aria-label="' + tt('بند کریں', 'Turn off') + '" style="opacity:.6">✕</button></div>';
    }
    return '<div class="card" id="spdc" style="margin:8px 0;padding:14px 10px 12px;text-align:center;color:#e8eef9;border:1px solid #234376;border-radius:26px;background:radial-gradient(120% 90% at 50% 0%,#17335c 0%,#0f2040 55%,#0b1730 100%)">' +
      '<div style="position:relative;width:200px;margin:0 auto" id="spdw">' + dial(0, '#5fd4b0') +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b id="spdv" style="font:800 64px/1 system-ui;direction:ltr">0</b><span style="font:600 13px system-ui;opacity:.8;direction:ltr">' + u + '</span></div></div>' +
      '<div style="margin-top:6px"><button id="spdl" style="border:0;border-radius:20px;padding:4px 12px;font-size:12px;background:#16294a;color:#e8eef9">' + (L ? tt('حد: ', 'Limit: ') + L + ' ✎' : tt('حد لگائیں ✎', 'Set limit ✎')) + '</button> <span id="spdw2" style="font-size:12px"></span></div>' +
      '<div style="display:flex;justify-content:space-around;margin-top:8px;direction:ltr"><div style="font:700 15px system-ui"><span id="spdd">0.0 km</span><small style="display:block;font:11px system-ui;opacity:.6;font-weight:400">' + tt('فاصلہ', 'Distance') + '</small></div>' +
      '<div style="font:700 15px system-ui"><span id="spdt">0:00</span><small style="display:block;font:11px system-ui;opacity:.6;font-weight:400">' + tt('وقت', 'Time') + '</small></div>' +
      '<div style="font:700 15px system-ui"><span id="spda">–</span><small style="display:block;font:11px system-ui;opacity:.6;font-weight:400">' + tt('اوسط', 'Average') + '</small></div>' +
      '<div style="font:700 15px system-ui"><span id="spdm">0</span><small style="display:block;font:11px system-ui;opacity:.6;font-weight:400">' + tt('زیادہ سے زیادہ', 'Top') + '</small></div></div>' +
      '<button id="spdend" style="margin-top:10px;border:0;border-radius:14px;padding:8px 18px;background:#2a3d63;color:#e8eef9;font-size:13px">' + tt('ختم کریں', 'Done') + '</button>' +
      '<div style="font-size:10.5px;opacity:.55;margin-top:8px">' + tt('گاڑی چلاتے وقت اسکرین نہ دیکھیں۔ حد آپ کی اپنی مقرر کردہ ہے، سڑک کی سرکاری حد نہیں۔', 'Do not look at the screen while driving. The limit is the one you set, not the road\'s official limit.') + '</div></div>';
  }
  function hintText() {
    if (G.err === 'denied') return tt('لوکیشن کی اجازت دیں', 'Allow location');
    if (!lget('spd.ok', false) && !G.fix) return tt('چالو کرنے کے لیے ٹیپ کریں', 'Tap to turn on');
    return G.fix ? tt('گاڑی چلتے ہی خود بڑا ہو جائے گا', 'Grows by itself when you start moving') : tt('GPS ڈھونڈ رہا ہے…', 'Finding GPS…');
  }

  function paint() {
    var c = card(); if (!c) return;
    var v = cv(G.sp), L = lim();
    if (el('spdv')) el('spdv').textContent = G.fix ? Math.round(v) : '–';
    if (!G.big) return;
    var scale = isMph() ? 100 : 160, over = L && v > L, near = L && v > L - 10 && !over, col = over ? '#ff5c6c' : near ? '#ffb347' : '#5fd4b0';
    var arc = el('spdarc'); if (arc) { var C = 2 * Math.PI * 80, track = C * 0.75; arc.setAttribute('stroke-dasharray', (track * Math.min(1, v / scale)) + ' ' + C); arc.setAttribute('stroke', col); }
    el('spdv').style.color = over ? '#ffb3bb' : '#e8eef9';
    c.style.background = over ? 'radial-gradient(120% 90% at 50% 0%,#4a1620 0%,#2a0f1a 55%,#1a0c14 100%)' : '';
    c.style.borderColor = over ? '#8a2b36' : '#234376';
    el('spdw2').textContent = over ? '⚠️ ' + tt('حد سے اوپر', 'Over the limit') : '';
    var d = isMph() ? G.dist / 1609.34 : G.dist / 1000;
    el('spdd').textContent = d.toFixed(1) + (isMph() ? ' mi' : ' km');
    var s = G.t0 ? Math.round((Date.now() - G.t0) / 1000) : 0; el('spdt').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    el('spda').textContent = G.moveT > 5 ? Math.round(cv(G.dist / G.moveT)) : '–';
    el('spdm').textContent = Math.round(cv(G.mx));
  }
  function mount() {
    var old = card(), g = document.querySelector('#body .lgreet'); if (old) old.remove(); if (!g || S.view !== 'life') return false;
    g.insertAdjacentHTML('afterend', html()); wire(); paint(); return true;
  }
  function reset() { G.sp = 0; G.mx = 0; G.dist = 0; G.moveT = 0; G.t0 = 0; G.prev = null; G.fast = 0; G.slow = 0; }
  function setBig(b) { if (G.big === b) return; G.big = b; if (b && !G.t0) G.t0 = Date.now(); if (!b) reset(); mount(); }
  function wire() {
    var x = el('spdx'), e = el('spdend'), l = el('spdl'), c = card();
    if (x) x.onclick = function (ev) { ev.stopPropagation(); lset('spd.auto', false); stop(); mount(); CL.toast('رفتار کارڈ بند۔ دوبارہ چالو کرنے کے لیے اس جگہ ٹیپ کریں', 'Speed card off. Tap here to turn it on again'); };
    if (e) e.onclick = function () { G.big = false; reset(); mount(); };
    if (l) l.onclick = function () { var L = lim(), i = LIMS.indexOf(L); lset('splim', LIMS[(i + 1) % LIMS.length]); l.textContent = lim() ? tt('حد: ', 'Limit: ') + lim() + ' ✎' : tt('حد لگائیں ✎', 'Set limit ✎'); };
    if (c && !G.big) c.onclick = function (ev) { if (ev.target.closest('#spdx')) return; if (!G.w) { lset('spd.auto', true); start(true); } else CL.go('speed'); };
  }

  function onPos(p) {
    var c = p.coords, now = p.timestamp || Date.now(), acc = c.accuracy || 0, v = c.speed;
    G.acc = acc; G.err = ''; lset('spd.ok', true);
    if (v == null || isNaN(v)) { v = 0; if (G.prev) { var dt = (now - G.prev.t) / 1000; if (dt > 0.5) v = haversine(G.prev.la, G.prev.lo, c.latitude, c.longitude) / dt; } }
    if (acc > 60) v = 0;
    if (v < 0.6) v = 0;
    G.fix = now;
    if (G.big && G.prev && acc <= 40) { var dd = haversine(G.prev.la, G.prev.lo, c.latitude, c.longitude), dts = (now - G.prev.t) / 1000; if (dts > 0 && dd / dts < 90 && dd > 2) { G.dist += dd; G.moveT += dts; } }
    G.prev = { la: c.latitude, lo: c.longitude, t: now };
    G.sp = v; if (G.big && v > G.mx && v < 90) G.mx = v;
    var kmh = v * 3.6;
    if (kmh >= 10) { G.fast++; G.slow = 0; if (!G.big && G.fast >= 2) setBig(true); }
    else { G.fast = 0; if (kmh < 5) { if (!G.slow) G.slow = Date.now(); if (G.big && Date.now() - G.slow > 30000) setBig(false); } else G.slow = 0; }
    var L = lim();
    if (G.big && L && cv(v) > L && Date.now() - G.over > 4000) { G.over = Date.now(); beep(); try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch (e) { /* ignore */ } }
    paint();
    var n = el('spdn'); if (n) n.textContent = hintText();
  }
  function start(ask) {
    if (G.w != null || !navigator.geolocation) return;
    if (!ask && !lget('spd.ok', false)) return; /* never raise the permission prompt by surprise */
    try {
      G.w = navigator.geolocation.watchPosition(onPos, function (e) {
        if (e && e.code === 1) { G.err = 'denied'; lset('spd.ok', false); stop(); var n = el('spdn'); if (n) n.textContent = hintText(); }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    } catch (e) { G.w = null; }
  }
  function stop() { if (G.w != null && navigator.geolocation) { try { navigator.geolocation.clearWatch(G.w); } catch (e) { /* ignore */ } } G.w = null; }

  /* GPS only while the card is on screen and the app is in front */
  setInterval(function () { if (G.w != null && !card()) { stop(); G.big = false; reset(); } else if (G.big) paint(); }, 2000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (card() && auto()) start(false);
  });

  (CL.homeHooks = CL.homeHooks || []).push(function () {
    if (S.view !== 'life') return;
    if (!auto()) {
      var old = card(); if (old) old.remove();
      var g = document.querySelector('#body .lgreet');
      if (g) { g.insertAdjacentHTML('afterend', '<button id="spdc" class="mut" style="display:block;margin:6px 0;background:none;border:0;font-size:12px;padding:4px">🚗 ' + tt('رفتار کارڈ بند ہے · چالو کریں', 'Speed card is off · turn on') + '</button>'); card().onclick = function () { lset('spd.auto', true); mount(); start(true); }; }
      return;
    }
    mount(); start(false);
  });
};
