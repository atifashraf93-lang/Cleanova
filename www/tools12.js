/* Cleanova Life: smart Home (changes with the time of day) and the Coordinates tool.
   Coordinates: your own GPS fix, a place found by name (OpenStreetMap Nominatim), a coordinate read out of a pasted
   link or text, distance between two points, and places you saved on this phone. Nothing is uploaded except the
   place name you type into the search box. */
window.CLifeInit17 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var lget = U.lget, lset = U.lset;

  /* ================= SMART HOME ================= */
  function slot() { var h = new Date().getHours(); return h >= 5 && h < 11 ? 'm' : h >= 11 && h < 17 ? 'd' : h >= 17 && h < 21 ? 'e' : 'n'; }
  var BN = { ke: ['K-Electric', '⚡'], ssgc: ['SSGC', '🔥'], kwsb: ['KWSB', '💧'] };
  function dleft(due) { if (!due) return null; var t = new Date(due + 'T00:00:00'); return Math.round((t - new Date(new Date().toDateString())) / 86400000); }
  function needs() {
    var d = lget('bills', null), best = null;
    if (!d || !d.items) return null;
    d.items.forEach(function (b) {
      if (b.paid) return; var n = dleft(b.due); if (n === null || n > 3) return;
      if (!best || n < best.n) best = { b: b, n: n };
    });
    if (!best) return null;
    var nm = (BN[best.b.co] || [best.b.co || '', '🧾']), amt = best.b.amt ? 'Rs. ' + Math.round(best.b.amt).toLocaleString('en') : '';
    var late = best.n < 0, when = late ? tt('آخری تاریخ گزر گئی', 'Overdue') : best.n === 0 ? tt('آج آخری تاریخ ہے', 'Due today') : tt(best.n + ' دن باقی', best.n + ' days left');
    return '<button class="card" id="smnow" style="width:100%;text-align:start;margin:10px 0 4px;padding:16px;border:0;color:#fff;border-radius:24px;background:linear-gradient(135deg,' + (late ? '#7a3b12,#b8641c' : '#0f5e4d,#1f8f78') + ')">' +
      '<div style="font:600 11px system-ui;letter-spacing:.8px;opacity:.8">' + tt('آج آپ کی توجہ چاہیے', 'NEEDS YOU TODAY') + '</div>' +
      '<div style="font:800 24px/1.25 system-ui;margin-top:6px">' + nm[1] + ' ' + esc(nm[0]) + ' · ' + when + '</div>' +
      '<div style="opacity:.9;margin-top:4px;font-size:13.5px">' + (amt ? '<b style="direction:ltr;display:inline-block">' + amt + '</b> · ' : '') + tt('بل کھولیں ›', 'Open bills ›') + '</div></button>';
  }

  function arrange() {
    var b = $('#body'); if (!b || S.view !== 'life' || !b.querySelector('.lgreet') || document.getElementById('smmore')) return;
    var q = function (s) { return b.querySelector(s); };
    var keep = { 'lgreet': 1, 'foot': 1 }, foot = q('.foot');
    var hero = q('.lhero'), rems = q('.rems'), news = q('#nwsC'), fuel = q('#fuelc'), spd = q('#spdc'), tsb = q('#tsb'), mg = q('.mg');
    var secs = [].filter.call(b.children, function (e) { return e.classList.contains('sec'); });
    var sl = slot(), plan = { m: [rems, fuel, news, hero], d: [fuel, news, rems, hero], e: [hero, rems, fuel, news], n: [rems, hero] }[sl].filter(Boolean);
    var order = [], used = [];
    function put(e) { if (e && used.indexOf(e) < 0) { used.push(e); order.push(e); } }
    var nowHtml = needs(); if (nowHtml) { var g = q('.lgreet'); var tmp = document.createElement('div'); tmp.innerHTML = nowHtml; var nowEl = tmp.firstChild; order.push(nowEl); used.push(nowEl); nowEl.onclick = function () { CL.go('bills'); }; }
    put(spd); plan.forEach(put);
    /* quick actions: three favourites and the "all tools" tile */
    var quick = null;
    if (mg) {
      var tiles = [].slice.call(mg.querySelectorAll('.mt')), all = tiles.filter(function (t) { return t.dataset.mv === 'tools'; })[0], pick = tiles.filter(function (t) { return t !== all; }).slice(0, 3);
      quick = document.createElement('div'); quick.className = 'mg'; quick.id = 'smq'; pick.concat(all ? [all] : []).forEach(function (t) { quick.appendChild(t); });
      var qt = document.createElement('div'); qt.className = 'sec'; qt.textContent = tt('فوری رسائی', 'QUICK ACCESS'); order.push(qt); order.push(quick); used.push(qt); used.push(quick);
    }
    put(tsb);
    var more = document.createElement('div'); more.id = 'smmore'; more.hidden = true;
    var btn = document.createElement('button'); btn.className = 'card'; btn.id = 'smmb'; btn.style.cssText = 'width:100%;text-align:center;margin:12px 0 4px;font-weight:700';
    btn.textContent = '⌄ ' + tt('سب ٹولز اور مزید', 'All tools & more');
    btn.onclick = function () { more.hidden = !more.hidden; btn.textContent = (more.hidden ? '⌄ ' : '⌃ ') + tt('سب ٹولز اور مزید', 'All tools & more'); if (!more.hidden) setTimeout(function () { try { more.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ } }, 50); };
    [].slice.call(b.children).forEach(function (e) {
      if (used.indexOf(e) >= 0 || e === foot || e === more || e === btn) return;
      var k = e.classList.contains('lgreet') || e.id === 'updc' || e.id === 'kidsnote' || e.id === 'spdc';
      if (!k) more.appendChild(e);
    });
    order.forEach(function (e) { b.insertBefore(e, foot || null); });
    b.insertBefore(btn, foot || null); b.insertBefore(more, foot || null);
    if (CL.driveHide) CL.driveHide();
  }
  (CL.homeHooks = CL.homeHooks || []).push(function () { try { arrange(); } catch (e) { /* keep the plain Home */ } });

  /* ================= COORDINATES ================= */
  CL.regTool('coords', '📍', 3, ['لوکیشن کوآرڈینیٹ', 'Coordinates'], 'travel', ['اپنی جگہ یا کسی بھی جگہ کا latitude اور longitude', 'Latitude and longitude of your place or any place'], 'کوآرڈینیٹ coordinates coordinate latitude longitude lat lon gps location لوکیشن جگہ نقشہ map مقام پتہ', true);

  function ok(la, lo) { la = +la; lo = +lo; return isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? { lat: la, lon: lo } : null; }
  function dms(v, p, n) { var h = v >= 0 ? p : n; v = Math.abs(v); var d = Math.floor(v), m = Math.floor((v - d) * 60), s = ((v - d) * 60 - m) * 60; if (s >= 59.95) { s = 0; m++; } if (m >= 60) { m = 0; d++; } return d + '°' + m + "'" + s.toFixed(1) + '"' + h; }
  function parseCoord(t) {
    t = String(t || '').trim(); if (!t) return null;
    try { t = decodeURIComponent(t); } catch (e) { /* keep as is */ }
    var m, N = '(-?\\d{1,3}(?:\\.\\d+)?)';
    if ((m = new RegExp('@' + N + ',' + N).exec(t))) return ok(m[1], m[2]);
    if ((m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(t))) return ok(m[1], m[2]);
    if ((m = new RegExp('[?&](?:q|ll|query|destination|center|daddr|saddr)=' + N + '[,+ ]+' + N).exec(t))) return ok(m[1], m[2]);
    if ((m = new RegExp('(?:geo:)' + N + ',' + N).exec(t))) return ok(m[1], m[2]);
    if ((m = /(\d{1,3})\s*[°d]\s*(\d{1,2})\s*['′m]\s*(\d{1,2}(?:\.\d+)?)\s*["″s]?\s*([NSns])[\s,;]*(\d{1,3})\s*[°d]\s*(\d{1,2})\s*['′m]\s*(\d{1,2}(?:\.\d+)?)\s*["″s]?\s*([EWew])/.exec(t))) {
      var la = +m[1] + m[2] / 60 + m[3] / 3600, lo = +m[5] + m[6] / 60 + m[7] / 3600;
      return ok(/s/i.test(m[4]) ? -la : la, /w/i.test(m[8]) ? -lo : lo);
    }
    if ((m = new RegExp('^\\s*' + N + '\\s*°?\\s*([NSns])?\\s*[,;\\s]\\s*' + N + '\\s*°?\\s*([EWew])?\\s*$').exec(t))) {
      return ok(/s/i.test(m[2] || '') ? -Math.abs(m[1]) : m[1], /w/i.test(m[4] || '') ? -Math.abs(m[3]) : m[3]);
    }
    return null;
  }
  function hav(a, b, c, d) { var R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
  function bear(a, b, c, d) { var r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r), x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r); return (Math.atan2(y, x) / r + 360) % 360; }
  var DIRS = [['شمال', 'N'], ['شمال مشرق', 'NE'], ['مشرق', 'E'], ['جنوب مشرق', 'SE'], ['جنوب', 'S'], ['جنوب مغرب', 'SW'], ['مغرب', 'W'], ['شمال مغرب', 'NW']];
  function dirName(deg) { var d = DIRS[Math.round(deg / 45) % 8]; return tt(d[0], d[1]); }
  function copy(t) {
    var done = function () { CL.toast('کاپی ہو گیا', 'Copied'); };
    function fb() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
    try { navigator.clipboard.writeText(t).then(done, fb); } catch (e) { fb(); }
  }
  function mapLink(p) { return 'https://www.google.com/maps?q=' + p.lat.toFixed(6) + ',' + p.lon.toFixed(6); }
  var INP = 'width:100%;min-height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--text);padding:0 12px;font-size:15px;margin-top:8px';
  var BTN = 'min-height:44px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);padding:0 12px;font-size:14px;font-weight:600';

  V.coords = function () {
    CL.setTop(T('لوکیشن کوآرڈینیٹ', 'Coordinates'));
    var cur = null, A = null, B = null, lastQ = 0;
    var places = function () { var l = lget('coords', []); return Array.isArray(l) ? l : []; };
    $('#body').innerHTML =
      '<div class="card" style="margin-top:8px"><b>📡 ' + tt('میری موجودہ جگہ', 'My location') + '</b><div class="mut" style="font-size:12.5px;margin-top:2px">' + tt('GPS سے، کھلی جگہ پر زیادہ درست ہوتا ہے', 'From GPS, more accurate outdoors') + '</div><button class="btn" id="cmy" style="margin-top:10px;width:100%">' + tt('میری جگہ معلوم کریں', 'Get my location') + '</button></div>' +
      '<div class="card"><b>🔎 ' + tt('جگہ کا نام لکھیں', 'Search a place') + '</b><input id="cq" style="' + INP + '" placeholder="' + tt('مثلاً Clifton Beach, Karachi', 'e.g. Clifton Beach, Karachi') + '" autocomplete="off"><button class="btn" id="cgo" style="margin-top:8px;width:100%">' + tt('ڈھونڈیں', 'Search') + '</button><div id="cls"></div>' +
      '<div class="note">' + tt('نام انٹرنیٹ پر OpenStreetMap سے ڈھونڈا جاتا ہے۔ ہر جگہ نہیں ملتی، خاص طور پر چھوٹی گلیاں۔', 'Names are looked up online on OpenStreetMap. Not every place is found, especially small streets.') + '</div></div>' +
      '<div class="card"><b>🔗 ' + tt('لنک یا coordinate پیسٹ کریں', 'Paste a link or coordinate') + '</b><input id="cpl" style="' + INP + ';direction:ltr" placeholder="https://maps.google.com/…  or  24.8607, 67.0011"><button class="btn" id="cpg" style="margin-top:8px;width:100%">' + tt('نکالیں', 'Read it') + '</button>' +
      '<div class="note">' + tt('چھوٹے لنک (maps.app.goo.gl) سے coordinate نہیں نکل سکتا۔ Google Maps میں کھول کر پورا لنک یا coordinate کاپی کریں۔', 'Short links (maps.app.goo.gl) cannot be read. Open it in Google Maps and copy the full link or the coordinate.') + '</div></div>' +
      '<div id="cres"></div>' +
      '<div class="card"><b>📏 ' + tt('دو جگہوں کا فاصلہ', 'Distance between two points') + '</b>' +
      '<div class="mut" style="font-size:12.5px;margin-top:2px">' + tt('کوئی جگہ ڈھونڈ کر "نقطہ A" یا "نقطہ B" دبائیں، یا نیچے coordinate لکھیں۔', 'Find a place then tap "Point A" or "Point B", or type coordinates below.') + '</div>' +
      '<input id="cda" style="' + INP + ';direction:ltr" placeholder="A: 24.8607, 67.0011"><input id="cdb" style="' + INP + ';direction:ltr" placeholder="B: 31.5204, 74.3587"><button class="btn" id="cdg" style="margin-top:8px;width:100%">' + tt('فاصلہ ناپیں', 'Measure') + '</button><div id="cdr"></div></div>' +
      '<div class="card"><b>⭐ ' + tt('محفوظ جگہیں', 'Saved places') + '</b><div id="csv"></div><div class="note">' + tt('یہ صرف آپ کے فون میں رہتی ہیں۔', 'Kept only on this phone.') + '</div></div>';

    function row(p, extra) { return '<div style="direction:ltr;font:700 17px system-ui;margin-top:6px">' + p.lat.toFixed(6) + ', ' + p.lon.toFixed(6) + '</div><div style="direction:ltr;font-size:12.5px;opacity:.75;margin-top:2px">' + dms(p.lat, 'N', 'S') + ' ' + dms(p.lon, 'E', 'W') + '</div>' + (extra || ''); }
    function show(p, title, extra) {
      cur = p; p.name = title || p.name || '';
      $('#cres').innerHTML = '<div class="card" style="border-color:var(--acc)"><b>📍 ' + esc(title || tt('جگہ', 'Place')) + '</b>' + row(p, extra) +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
        '<button id="c1" style="' + BTN + '">📋 ' + tt('اعشاری کاپی', 'Copy decimal') + '</button><button id="c2" style="' + BTN + '">📋 DMS</button>' +
        '<button id="c3" style="' + BTN + '">🔗 ' + tt('نقشے کا لنک', 'Copy map link') + '</button><button id="c4" style="' + BTN + '">🗺 ' + tt('نقشے میں کھولیں', 'Open in Maps') + '</button>' +
        '<button id="c5" style="' + BTN + '">📤 ' + tt('شیئر', 'Share') + '</button><button id="c6" style="' + BTN + '">⭐ ' + tt('محفوظ کریں', 'Save') + '</button>' +
        '<button id="c7" style="' + BTN + '">A ' + tt('نقطہ', 'Point') + '</button><button id="c8" style="' + BTN + '">B ' + tt('نقطہ', 'Point') + '</button></div></div>';
      $('#c1').onclick = function () { copy(p.lat.toFixed(6) + ', ' + p.lon.toFixed(6)); };
      $('#c2').onclick = function () { copy(dms(p.lat, 'N', 'S') + ' ' + dms(p.lon, 'E', 'W')); };
      $('#c3').onclick = function () { copy(mapLink(p)); };
      $('#c4').onclick = function () { (CL.openUrl || function (u) { window.open(u, '_blank'); })(mapLink(p)); };
      $('#c5').onclick = function () { var tx = (p.name ? p.name + '\n' : '') + p.lat.toFixed(6) + ', ' + p.lon.toFixed(6) + '\n' + mapLink(p); if (navigator.share) navigator.share({ text: tx }).catch(function () { /* cancelled */ }); else copy(tx); };
      $('#c6').onclick = function () {
        var l = places(), n = p.name || ((tt('جگہ ', 'Place ')) + (l.length + 1));
        l.unshift({ n: n, lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), t: Date.now() }); lset('coords', l.slice(0, 100)); paintSaved(); CL.toast('محفوظ ہو گیا', 'Saved');
      };
      $('#c7').onclick = function () { A = p; $('#cda').value = p.lat.toFixed(6) + ', ' + p.lon.toFixed(6); CL.toast('نقطہ A لگ گیا', 'Point A set'); };
      $('#c8').onclick = function () { B = p; $('#cdb').value = p.lat.toFixed(6) + ', ' + p.lon.toFixed(6); CL.toast('نقطہ B لگ گیا', 'Point B set'); };
      try { $('#cres').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
    }
    function paintSaved() {
      var l = places(), box = $('#csv');
      box.innerHTML = l.length ? l.map(function (x, i) { return '<div class="kv" style="align-items:center"><button data-ci="' + i + '" style="background:none;border:0;color:var(--text);text-align:start;flex:1;padding:6px 0"><b>' + esc(x.n) + '</b><div style="direction:ltr;font-size:12px;opacity:.7;text-align:start">' + x.lat.toFixed(5) + ', ' + x.lon.toFixed(5) + '</div></button><button data-cd="' + i + '" aria-label="delete" style="background:none;border:0;color:var(--mut);font-size:18px;padding:6px 10px">🗑</button></div>'; }).join('') : '<div class="mut" style="margin-top:8px;font-size:13px">' + tt('ابھی کوئی جگہ محفوظ نہیں', 'Nothing saved yet') + '</div>';
      [].forEach.call(box.querySelectorAll('[data-ci]'), function (b) { b.onclick = function () { var x = places()[+b.dataset.ci]; if (x) show({ lat: x.lat, lon: x.lon }, x.n); }; });
      [].forEach.call(box.querySelectorAll('[data-cd]'), function (b) { b.onclick = function () { var l2 = places(); l2.splice(+b.dataset.cd, 1); lset('coords', l2); paintSaved(); }; });
    }
    paintSaved();

    $('#cmy').onclick = function () {
      var b = $('#cmy'); if (!navigator.geolocation) { CL.toast('GPS دستیاب نہیں', 'No GPS'); return; }
      b.disabled = true; b.textContent = tt('جگہ ڈھونڈ رہا ہے…', 'Finding you…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        b.disabled = false; b.textContent = tt('میری جگہ معلوم کریں', 'Get my location');
        var c = pos.coords; show({ lat: c.latitude, lon: c.longitude }, tt('میری جگہ', 'My location'), '<div style="font-size:12.5px;opacity:.75;margin-top:4px">' + tt('درستگی ±', 'Accuracy ±') + Math.round(c.accuracy || 0) + ' m' + (c.altitude != null ? ' · ' + tt('بلندی ', 'Altitude ') + Math.round(c.altitude) + ' m' : '') + '</div>');
      }, function (e) {
        b.disabled = false; b.textContent = tt('میری جگہ معلوم کریں', 'Get my location');
        CL.toast(e && e.code === 1 ? 'لوکیشن کی اجازت دیں' : 'جگہ نہیں مل سکی، کھلی جگہ پر کوشش کریں', e && e.code === 1 ? 'Allow location' : 'No fix yet, try outdoors');
      }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
    };

    function search() {
      var q = $('#cq').value.trim(); if (q.length < 2) return;
      var pc = parseCoord(q); if (pc) { show(pc, tt('آپ کا coordinate', 'Your coordinate')); return; }
      if (Date.now() - lastQ < 1200) { CL.toast('ذرا رکیں، پھر دوبارہ دبائیں', 'Wait a second, then try again'); return; }
      lastQ = Date.now(); $('#cls').innerHTML = '<div class="mut" style="margin-top:8px">' + tt('ڈھونڈ رہا ہے…', 'Searching…') + '</div>';
      var ac = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ac) ac.abort(); }, 15000);
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&accept-language=' + (CL.PREF && CL.PREF.lang === 'en' ? 'en' : 'en') + '&q=' + encodeURIComponent(q), { signal: ac ? ac.signal : undefined, headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (a) {
          clearTimeout(to);
          if (!a || !a.length) { $('#cls').innerHTML = '<div class="mut" style="margin-top:8px">' + tt('کوئی جگہ نہیں ملی۔ نام مختلف لکھ کر دیکھیں، شہر کے ساتھ۔', 'Nothing found. Try another spelling, with the city.') + '</div>'; return; }
          $('#cls').innerHTML = a.map(function (x, i) { return '<button data-ri="' + i + '" class="kv" style="width:100%;background:none;border:0;border-top:1px solid var(--line);color:var(--text);text-align:start;padding:10px 0;display:block"><b style="font-size:13.5px;direction:ltr;display:block;text-align:start">' + esc(x.display_name) + '</b><span style="direction:ltr;font-size:12px;opacity:.7;display:block;text-align:start">' + (+x.lat).toFixed(5) + ', ' + (+x.lon).toFixed(5) + '</span></button>'; }).join('');
          [].forEach.call($('#cls').querySelectorAll('[data-ri]'), function (b) { b.onclick = function () { var x = a[+b.dataset.ri]; show({ lat: +x.lat, lon: +x.lon }, String(x.display_name).split(',').slice(0, 2).join(',')); }; });
        })
        .catch(function () { clearTimeout(to); $('#cls').innerHTML = '<div class="mut" style="margin-top:8px;color:#ef4444">' + tt('انٹرنیٹ یا سروس کا مسئلہ۔ تھوڑی دیر بعد کوشش کریں۔', 'Internet or service problem. Try again shortly.') + '</div>'; });
    }
    $('#cgo').onclick = search;
    $('#cq').addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });
    $('#cpg').onclick = function () {
      var t = $('#cpl').value, p = parseCoord(t);
      if (p) { show(p, tt('لنک سے نکلا', 'From your link')); return; }
      CL.toast(/goo\.gl|maps\.app/i.test(t) ? 'چھوٹے لنک سے coordinate نہیں نکل سکتا' : 'اس میں coordinate نہیں ملا', /goo\.gl|maps\.app/i.test(t) ? 'Short links cannot be read' : 'No coordinate found in that');
    };
    $('#cdg').onclick = function () {
      var a = parseCoord($('#cda').value), b = parseCoord($('#cdb').value), r = $('#cdr');
      if (!a || !b) { r.innerHTML = '<div class="mut" style="margin-top:8px;color:#ef4444">' + tt('دونوں جگہوں کے صحیح coordinate لکھیں', 'Enter valid coordinates for both points') + '</div>'; return; }
      var km = hav(a.lat, a.lon, b.lat, b.lon), br = bear(a.lat, a.lon, b.lat, b.lon);
      r.innerHTML = '<div class="kv"><span>' + tt('سیدھا فاصلہ', 'Straight-line distance') + '</span><b style="direction:ltr">' + (km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(km < 100 ? 2 : 1) + ' km') + '</b></div><div class="kv"><span>' + tt('A سے B کی سمت', 'Direction A to B') + '</span><b>' + dirName(br) + ' · ' + Math.round(br) + '°</b></div><div class="note">' + tt('یہ ہوا میں سیدھا فاصلہ ہے، سڑک کا نہیں۔', 'This is the straight distance, not the road distance.') + '</div>';
    };
  };
  CL.parseCoord = parseCoord;
};
