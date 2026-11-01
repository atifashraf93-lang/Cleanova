/* Location search, AI tools, social links, WhatsApp by number, QR scan and create.
   Sites open inside Cleanova's own window (CL.webOpen2). Passwords are never read or saved by the app. */
window.CLifeInit6 = function (CL) {
  'use strict';
  var V = CL.views, $ = CL.$, tt = CL.tt, T = CL.T, esc = CL.esc, U = CL.u, TO = U.TO;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset;
  function num(x) { var n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? null : n; }
  function web(url, title) { if (CL.webOpen2) CL.webOpen2(url, title); else window.open(url, '_blank'); }
  function ext(url) { if (CL.openUrl) CL.openUrl(url); else window.open(url, '_blank'); }
  function hav(a, b, c, d) { var R = 6371, p = Math.PI / 180, x = Math.sin((c - a) * p / 2) * Math.sin((c - a) * p / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) * Math.sin((d - b) * p / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function validUrl(u) { u = String(u || '').trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { var x = new URL(u); return x.hostname.indexOf('.') > 0 ? x.href : ''; } catch (e) { return ''; } }
  function back(ur, en) { return ur; }

  /* ================= LOCATION SEARCH ================= */
  var PS = { q: '', res: [], busy: false, err: '', mode: 'driving', me: null, kind: '' };
  var KINDS = [['fuel', '⛽', ['پیٹرول', 'Petrol']], ['hospital', '🏥', ['ہسپتال', 'Hospital']], ['atm', '🏧', ['ATM', 'ATM']], ['mosque', '🕌', ['مسجد', 'Mosque']], ['pharmacy', '💊', ['فارمیسی', 'Pharmacy']], ['restaurant', '🍽', ['کھانا', 'Food']], ['bank', '🏦', ['بینک', 'Bank']], ['doctor', '🩺', ['ڈاکٹر', 'Doctor']]];
  var OQ = { fuel: ['amenity=fuel'], hospital: ['amenity=hospital', 'amenity=clinic'], atm: ['amenity=atm'], mosque: ['amenity=place_of_worship][religion=muslim'], pharmacy: ['amenity=pharmacy'], restaurant: ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe'], bank: ['amenity=bank'], doctor: ['amenity=doctors', 'amenity=clinic'] };
  var KW = [['atm', /\batm\b|cash ?machine|اے ?ٹی ?ایم/i], ['hospital', /hospital|ہسپتال|اسپتال/i], ['pharmacy', /pharmacy|medical store|chemist|میڈیکل|فارمیسی|دوا/i], ['restaurant', /food|restaurant|cafe|hotel|کھانا|ریسٹورنٹ|ہوٹل/i], ['fuel', /petrol|pump|fuel|gas station|پیٹرول|پمپ/i], ['mosque', /mosque|masjid|مسجد/i], ['bank', /\bbank\b|بینک/i], ['doctor', /doctor|clinic|dr\.? |ڈاکٹر|کلینک/i]];
  var NQ = { fuel: 'petrol pump', hospital: 'hospital', atm: 'ATM', mosque: 'mosque', pharmacy: 'pharmacy', restaurant: 'restaurant', bank: 'bank', doctor: 'clinic' };
  var OVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  function kindOf(q) { q = String(q || ''); for (var i = 0; i < KW.length; i++) if (KW[i][1].test(q)) return KW[i][0]; return ''; }
  function overpass(kind, me, R) {
    var a = 'around:' + R + ',' + me.lat + ',' + me.lon, body = OQ[kind].map(function (t) { return 'nwr(' + a + ')[' + t + '];'; }).join('');
    var data = 'data=' + encodeURIComponent('[out:json][timeout:20];(' + body + ');out center 60;');
    var one = function (url) { return new Promise(function (ok, no) {
      var ac = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ac) ac.abort(); no(new Error('timeout')); }, 14000);
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: data, signal: ac ? ac.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { clearTimeout(to); ok(j); }, function (e) { clearTimeout(to); no(e); });
    }); };
    var go = function () { return new Promise(function (ok, no) { var left = OVER.length, last; OVER.forEach(function (u) { one(u).then(ok, function (e) { last = e; if (--left === 0) no(last); }); }); }); };
    return go().then(function (j) { return (j.elements || []).map(function (e) { var t = e.tags || {}, la = e.lat !== undefined ? e.lat : e.center && e.center.lat, lo = e.lon !== undefined ? e.lon : e.center && e.center.lon; if (la === undefined || lo === undefined) return null; var nm = t['name:ur'] || t.name || t['name:en'] || t.brand || t.operator || ''; var ad = [t['addr:street'], t['addr:suburb'] || t['addr:city']].filter(Boolean).join(', '); return { name: (nm || '—') + (ad ? ', ' + ad : (nm && t.operator && t.operator !== nm ? ', ' + t.operator : '')), lat: +la, lon: +lo, unnamed: !nm }; }).filter(Boolean); });
  }
  var MODES = [['driving', '🚗', ['گاڑی', 'Car']], ['two-wheeler', '🏍', ['بائیک', 'Bike']], ['walking', '🚶', ['پیدل', 'Walk']]];
  function getMe() {
    var P = CL.TP, ask = (P && P.locRequest) ? P.locRequest().catch(function () {}) : Promise.resolve();
    return ask.then(getMe2);
  }
  function getMe2() {
    return new Promise(function (res) {
      var saved = lget('qloc', null), done = false, fin = function (m) { if (!done) { done = true; PS.me = m; res(m); } };
      try { navigator.geolocation.getCurrentPosition(function (p) { var m = { lat: p.coords.latitude, lon: p.coords.longitude, real: true }; lset('qloc', [m.lat, m.lon]); fin(m); }, function () { fin(saved ? { lat: saved[0], lon: saved[1], real: false } : null); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }); } catch (e) { fin(saved ? { lat: saved[0], lon: saved[1], real: false } : null); }
      setTimeout(function () { fin(saved ? { lat: saved[0], lon: saved[1], real: false } : null); }, 11000);
    });
  }
  function dirUrl(lat, lon) { return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '&travelmode=' + PS.mode; }
  function placeUrl(lat, lon, name) { return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lon; }
  function nominatim(q, me, d) {
    var bounded = d && d < 1;
    var u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&accept-language=en&q=' + encodeURIComponent(q);
    if (me && d) { u += '&viewbox=' + (me.lon - d) + ',' + (me.lat + d) + ',' + (me.lon + d) + ',' + (me.lat - d) + (bounded ? '&bounded=1' : ''); }
    return fetch(u, { headers: { 'Accept': 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function short(n) { var p = String(n || '').split(','); return { name: p[0].trim(), addr: p.slice(1, 4).join(',').trim() }; }
  function vPlaces() {
    CL.setTop(T('جگہ تلاش', 'Find a place'));
    var fav = lget('fav', []);
    var h = '<div class="card" style="margin-top:8px"><div class="two" style="grid-template-columns:1fr auto"><input class="inp" id="pq" placeholder="' + tt('جگہ کا نام یا پتا…', 'Place name or address…') + '" value="' + esc(PS.q) + '" style="margin:0" enterkeyhint="search"><button class="btn" id="pgo" style="width:auto;padding:0 18px">🔍</button></div>' +
      '<div class="chips" style="margin-top:8px;flex-wrap:wrap">' + KINDS.map(function (k) { return '<button class="chip' + (PS.kind === k[0] ? ' on' : '') + '" data-pk="' + k[0] + '">' + k[1] + ' ' + L(k[2]) + '</button>'; }).join('') + '</div>' +
      '<span class="fl">' + tt('سفر کا طریقہ', 'Travel by') + '</span>' + chips(MODES.map(function (m) { return [m[0], [m[1] + ' ' + m[2][0], m[1] + ' ' + m[2][1]]]; }), PS.mode, 'pm') + '</div>';
    if (fav.length) h += '<div class="sec">' + tt('محفوظ جگہیں', 'SAVED PLACES') + '</div>' + fav.map(function (f, i) { return '<div class="card"><div class="row" style="padding:0"><span class="dd" style="background:rgba(var(--c2),.18);color:rgb(var(--c2));font-size:18px">' + (f.ic || '⭐') + '</span><div class="t" style="flex:1"><b dir="auto">' + esc(f.n) + '</b></div><button class="sbtn" data-pgf="' + i + '">' + tt('جاؤ', 'Go') + '</button><button class="sbtn" data-pdf="' + i + '" style="min-height:36px;padding:0 10px">✕</button></div></div>'; }).join('');
    h += '<div id="pres"></div>' +
      '<p class="note">' + tt('تلاش OpenStreetMap (Nominatim اور Overpass) سے ہوتی ہے (انٹرنیٹ چاہیے)، اور راستہ Google Maps میں کلینووا کی اپنی ونڈو میں کھلتا ہے۔ آپ کا مقام اپنے فون سے ہی لیا جاتا ہے اور کہیں محفوظ نہیں ہوتا سوائے آخری مقام کے جو قبلہ کے لیے رکھا جاتا ہے۔', 'Search uses OpenStreetMap (needs internet); the route opens in Google Maps inside Cleanova. Your location is read on the phone; only the last one is kept (used for Qibla).') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    var paint = function () {
      var box = $('#pres'); if (!box) return;
      if (PS.busy) { box.innerHTML = '<div class="card center"><p class="mut">' + tt('تلاش ہو رہی ہے…', 'Searching…') + '</p></div>'; return; }
      var wb = (PS.q || PS.kind) ? '<button class="sbtn" id="pall" style="width:100%;margin:6px 0">🌍 ' + tt('ہر جگہ تلاش', 'Search everywhere') + '</button>' : '';
      if (PS.err) { box.innerHTML = '<div class="card center"><p class="mut">' + PS.err + '</p></div>' + wb; if ($('#pall')) $('#pall').onclick = PS.again; return; }
      box.innerHTML = (PS.note ? '<p class="note" style="margin:8px 2px">📍 ' + esc(PS.note) + '</p>' : '') + PS.res.map(function (r, i) {
        var d = PS.me ? hav(PS.me.lat, PS.me.lon, r.lat, r.lon) : null, s = short(r.name);
        return '<div class="card"><div class="row" style="padding:0;align-items:flex-start"><span class="dd" style="background:rgba(var(--c4),.18);color:rgb(var(--c4));font-size:18px">📍</span><div class="t" style="flex:1"><b dir="auto">' + esc(s.name) + '</b><small class="e" style="display:block" dir="auto">' + esc(s.addr) + '</small>' + (d !== null ? '<small class="e" style="display:block;direction:ltr;text-align:start">' + d.toFixed(d < 10 ? 1 : 0) + ' km' + (PS.mode === 'driving' ? ' · ~' + Math.max(1, Math.round(d * 1.35 / 35 * 60)) + ' min' : PS.mode === 'walking' ? ' · ~' + Math.round(d * 1.25 / 5 * 60) + ' min' : '') + '</small>' : '') + '</div></div>' +
          '<div class="two" style="margin-top:8px;grid-template-columns:1fr auto auto"><button class="btn" data-prt="' + i + '" style="min-height:42px">' + tt('راستہ ▶', 'Directions ▶') + '</button><button class="sbtn" data-pmp="' + i + '">🗺</button><button class="sbtn" data-psv="' + i + '">⭐</button></div></div>';
      }).join('') + (PS.res.length ? wb : '');
      if ($('#pall')) $('#pall').onclick = PS.again;
      bind('prt', function (i) { var r = PS.res[+i]; web(dirUrl(r.lat, r.lon), short(r.name).name); });
      bind('pmp', function (i) { var r = PS.res[+i]; web(placeUrl(r.lat, r.lon), short(r.name).name); });
      bind('psv', function (i) { var r = PS.res[+i], f = lget('fav', []); f.push({ n: short(r.name).name, lat: r.lat, lon: r.lon, ic: '⭐' }); lset('fav', f.slice(-20)); CL.toast('محفوظ ہو گیا', 'Saved'); vPlaces(); });
    };
    var tok = 0;
    var finish = function (my, list, note) {
      if (my !== tok) return; PS.busy = false; PS.note = note || '';
      if (PS.me) list.sort(function (a, b) { return hav(PS.me.lat, PS.me.lon, a.lat, a.lon) - hav(PS.me.lat, PS.me.lon, b.lat, b.lon); });
      PS.res = list.slice(0, 30);
      if (!PS.res.length) PS.err = tt('قریب میں کچھ نہیں ملا۔ نام بدل کر دیکھیں یا "ہر جگہ تلاش" دبائیں۔', 'Nothing found nearby. Try another word or tap "Search everywhere".'); paint();
    };
    var fail = function (my, e) { if (my !== tok) return; PS.busy = false; PS.err = tt('تلاش نہیں ہو سکی۔ انٹرنیٹ چیک کریں۔', 'Search failed. Check your internet.') + ' (' + esc(String(e && e.message || e)) + ')'; paint(); };
    var steps = [3000, 10000, 30000];
    var nearKind = function (kind, my, me) {
      var loop = function (n) {
        return overpass(kind, me, steps[n]).then(function (l) {
          if (l.length >= 3 || n === steps.length - 1) {
            l.sort(function (a, b) { return (a.unnamed ? 1 : 0) - (b.unnamed ? 1 : 0); });
            var km = steps[n] / 1000;
            finish(my, l, n ? tt('قریب میں کم ملا، ' + km + ' کلومیٹر تک دکھا رہے ہیں', 'Few results close by; showing up to ' + km + ' km') : tt('آپ کے آس پاس ' + km + ' کلومیٹر کے اندر', 'Within ' + km + ' km of you'));
          } else return loop(n + 1);
        });
      };
      return loop(0);
    };
    var nearText = function (q, my, me) {
      var ds = [0.05, 0.25], loop = function (n) {
        return nominatim(q, me, ds[n]).then(function (a) {
          var l = (a || []).map(function (x) { return { name: x.display_name, lat: +x.lat, lon: +x.lon }; });
          if (l.length >= 3 || n === ds.length - 1) finish(my, l, n ? tt('قریب میں کم ملا، دور تک دکھا رہے ہیں', 'Few results close by; showing wider area') : tt('آپ کے آس پاس', 'Near you'));
          else return loop(n + 1);
        });
      };
      return loop(0);
    };
    var search = function (q, kind, everywhere) {
      if (!q && !kind) return; PS.q = q || ''; PS.busy = true; PS.err = ''; PS.note = ''; PS.res = []; var my = ++tok; paint();
      getMe().then(function (me) {
        if (everywhere || !me) {
          if (!me && !everywhere) PS.noloc = true;
          return nominatim(q || kind, me, 0).then(function (a) { finish(my, (a || []).map(function (x) { return { name: x.display_name, lat: +x.lat, lon: +x.lon }; }), me ? '' : tt('⚠️ آپ کی لوکیشن نہیں ملی۔ فون میں لوکیشن آن کریں اور کلینووا کو اجازت دیں، ورنہ نتائج قریب کے نہیں ہوں گے۔', 'Your location was not found. Turn on location and allow Cleanova, otherwise results will not be nearby.')); });
        }
        kind = kind || kindOf(q);
        if (!kind) return nearText(q, my, me);
        return nearKind(kind, my, me).catch(function () { return nearText(q || NQ[kind], my, me); });
      }).catch(function (e) { fail(my, e); });
    };
    PS.again = function () { search(PS.q, PS.kind, true); };
    $('#pgo').onclick = function () { PS.kind = ''; search($('#pq').value.trim(), '', false); };
    $('#pq').onkeydown = function (e) { if (e.key === 'Enter') $('#pgo').onclick(); };
    bind('pk', function (k) { PS.kind = k; $('#pq').value = ''; search('', k, false); [].forEach.call(document.querySelectorAll('[data-pk]'), function (b) { b.classList.toggle('on', b.dataset.pk === k); }); });
    bind('pm', function (m) { PS.mode = m; [].forEach.call(document.querySelectorAll('[data-pm]'), function (b) { b.classList.toggle('on', b.dataset.pm === m); }); });
    bind('pgf', function (i) { var f = lget('fav', [])[+i]; if (f) web(dirUrl(f.lat, f.lon), f.n); });
    bind('pdf', function (i) { var f = lget('fav', []); f.splice(+i, 1); lset('fav', f); vPlaces(); });
    paint();
  }
  V.places = vPlaces;

  /* ================= AI TOOLS ================= */
  var AI = [
    { id: 'chatgpt', n: 'ChatGPT', d: ['سوال، تحریر، کوڈ', 'Questions, writing, code'], u: 'https://chatgpt.com/', c: 'chat', ic: '💬', bg: '#10b981' },
    { id: 'gemini', n: 'Gemini', d: ['گوگل کا AI', "Google's AI"], u: 'https://gemini.google.com/app', c: 'chat', ic: '✨', bg: '#3b82f6' },
    { id: 'claude', n: 'Claude', d: ['لمبی تحریر اور تجزیہ', 'Long writing and analysis'], u: 'https://claude.ai/', c: 'chat', ic: '🧡', bg: '#f97316' },
    { id: 'pplx', n: 'Perplexity', d: ['ذرائع کے ساتھ جواب', 'Answers with sources'], u: 'https://www.perplexity.ai/', c: 'chat', ic: '🔎', bg: '#06b6d4' },
    { id: 'copilot', n: 'Copilot', d: ['مائیکروسافٹ کا AI', "Microsoft's AI"], u: 'https://copilot.microsoft.com/', c: 'chat', ic: '🪟', bg: '#6366f1' },
    { id: 'deepseek', n: 'DeepSeek', d: ['چیٹ اور کوڈ', 'Chat and code'], u: 'https://chat.deepseek.com/', c: 'chat', ic: '🐋', bg: '#0ea5e9' },
    { id: 'designer', n: 'Microsoft Designer', d: ['تصویر اور ڈیزائن', 'Images and design'], u: 'https://designer.microsoft.com/', c: 'image', ic: '🎨', bg: '#ec4899' },
    { id: 'firefly', n: 'Adobe Firefly', d: ['تصویر بنائیں', 'Create images'], u: 'https://firefly.adobe.com/', c: 'image', ic: '🔥', bg: '#ef4444' },
    { id: 'ideogram', n: 'Ideogram', d: ['تحریر والی تصویریں', 'Images with text'], u: 'https://ideogram.ai/', c: 'image', ic: '🖼', bg: '#a855f7' },
    { id: 'nblm', n: 'NotebookLM', d: ['اپنی فائلوں سے پڑھائی', 'Study from your own files'], u: 'https://notebooklm.google.com/', c: 'study', ic: '📓', bg: '#14b8a6' },
    { id: 'wolfram', n: 'Wolfram Alpha', d: ['ریاضی اور سائنس', 'Maths and science'], u: 'https://www.wolframalpha.com/', c: 'study', ic: '🧮', bg: '#f43f5e' },
    { id: 'khan', n: 'Khan Academy', d: ['مفت اسباق', 'Free lessons'], u: 'https://www.khanacademy.org/', c: 'study', ic: '🎓', bg: '#22c55e' }
  ];
  var AF = { cat: 'all' };
  function vAi() {
    CL.setTop(T('AI ٹولز', 'AI tools'));
    var fav = lget('ai.fav', []), custom = lget('ai.custom', []).map(function (c, i) { return { id: 'c' + i, n: c.n, d: ['آپ کا لنک', 'Your link'], u: c.u, c: 'custom', ic: '🔗', bg: '#8b5cf6', mine: i }; });
    var all = AI.concat(custom).filter(function (a) { return AF.cat === 'all' || a.c === AF.cat || (AF.cat === 'fav' && fav.indexOf(a.id) >= 0); });
    all.sort(function (a, b) { return (fav.indexOf(b.id) >= 0) - (fav.indexOf(a.id) >= 0); });
    $('#body').innerHTML = chips([['all', ['سب', 'All']], ['fav', ['⭐', '⭐']], ['chat', ['چیٹ', 'Chat']], ['image', ['تصویر', 'Image']], ['study', ['پڑھائی', 'Study']]], AF.cat, 'ac').replace('class="chips"', 'class="chips" style="margin-top:8px"') +
      (all.length ? all.map(function (a) { return '<div class="card"><div class="row" style="padding:0"><span class="dd" style="background:' + a.bg + '33;font-size:20px">' + a.ic + '</span><div class="t" style="flex:1"><b>' + esc(a.n) + '</b><small class="e" style="display:block">' + L(a.d) + '</small></div><button class="sbtn" data-af="' + a.id + '" style="min-height:36px;padding:0 10px">' + (fav.indexOf(a.id) >= 0 ? '★' : '☆') + '</button>' + (a.mine !== undefined ? '<button class="sbtn" data-ax="' + a.mine + '" style="min-height:36px;padding:0 10px">✕</button>' : '') + '<button class="btn" data-ao="' + a.id + '" style="width:auto;min-height:40px;padding:0 14px">' + tt('کھولیں', 'Open') + '</button></div></div>'; }).join('') : '<div class="card center"><p class="mut">' + tt('ابھی کوئی پسندیدہ نہیں۔ ☆ دبائیں۔', 'No favourites yet. Tap ☆.') + '</p></div>') +
      '<button class="sbtn" id="aadd" style="width:100%;margin-top:6px">＋ ' + tt('اپنا AI لنک شامل کریں', 'Add your own AI link') + '</button>' +
      '<p class="note">' + tt('ہر سائٹ کلینووا کی ونڈو میں کھلتی ہے اور آپ کے اپنے اکاؤنٹ سے چلتی ہے۔ ان کی سروسز اور قیمتیں ان کی اپنی ہیں۔ اپنی حساس معلومات AI میں نہ لکھیں۔', 'Each site opens inside Cleanova and uses your own account. Their services and prices are their own. Do not type sensitive personal data into AI.') + '</p>' + CL.footer();
    bind('ac', function (c) { AF.cat = c; vAi(); });
    bind('af', function (id) { var f = lget('ai.fav', []), i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); lset('ai.fav', f); vAi(); });
    bind('ax', function (i) { var c = lget('ai.custom', []); c.splice(+i, 1); lset('ai.custom', c); vAi(); });
    bind('ao', function (id) { var a = AI.concat(custom).filter(function (x) { return x.id === id; })[0]; if (a) web(a.u, a.n); });
    $('#aadd').onclick = function () { CL.ask(tt('نام اور لنک (نام | لنک)', 'Name | link'), '', function (v) { var p = v.split('|'), n = (p[0] || '').trim(), u = validUrl(p[1] || p[0]); if (!u) { CL.toast('درست لنک لکھیں', 'Enter a valid link'); return; } var c = lget('ai.custom', []); c.push({ n: p[1] ? n : u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], u: u }); lset('ai.custom', c); vAi(); }, 'My AI | https://…'); };
  }
  V.ai = vAi;

  /* ================= SOCIAL ================= */
  var SOC = [['Facebook', 'f', 'https://m.facebook.com/', '#1877f2'], ['Instagram', '📸', 'https://www.instagram.com/', '#e1306c'], ['YouTube', '▶️', 'https://m.youtube.com/', '#ff0000'], ['X', '✖', 'https://x.com/', '#9ca3af'], ['LinkedIn', '💼', 'https://www.linkedin.com/', '#0a66c2'], ['TikTok', '🎵', 'https://www.tiktok.com/', '#25f4ee'], ['Snapchat', '👻', 'https://www.snapchat.com/', '#fffc00'], ['Pinterest', '📌', 'https://www.pinterest.com/', '#e60023']];
  function vSocial() {
    CL.setTop(T('سوشل', 'Social'));
    var custom = lget('soc.custom', []);
    $('#body').innerHTML = '<div class="g2" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">' + SOC.map(function (s, i) { return '<button class="card sct" data-so="' + i + '" style="margin:0;text-align:center;padding:16px 8px"><div style="font-size:28px;font-weight:800;color:' + s[3] + '">' + s[1] + '</div><b>' + s[0] + '</b></button>'; }).join('') +
      custom.map(function (c, i) { return '<button class="card sct" data-sc="' + i + '" style="margin:0;text-align:center;padding:16px 8px"><div style="font-size:28px">🔗</div><b dir="auto">' + esc(c.n) + '</b></button>'; }).join('') + '<button class="card sct" id="sadd" style="margin:0;text-align:center;padding:16px 8px"><div style="font-size:28px">＋</div><b>' + tt('اپنا لنک', 'Your link') + '</b></button></div>' +
      '<div class="card" style="margin-top:12px"><b>' + tt('یہ کیسے کام کرتا ہے', 'How it works') + '</b><p class="note" style="margin-top:6px">' + tt('1. بٹن دبائیں، سائٹ کلینووا کی ونڈو میں کھلے گی۔<br>2. login آپ خود کریں۔<br>3. اگلی بار login محفوظ ملے گا، جیسے براؤزر میں۔<br>4. واپسی کے لیے ← یا فون کا بیک۔', '1. Tap a button; the site opens inside Cleanova.<br>2. Log in yourself.<br>3. Next time you stay logged in, like in a browser.<br>4. Press ← or the phone back to return.') + '</p></div>' +
      '<div class="card"><b>🔒 ' + tt('رازداری', 'Privacy') + '</b><p class="note" style="margin-top:6px">' + tt('کلینووا آپ کا پاس ورڈ نہ دیکھتی ہے نہ محفوظ کرتی ہے۔ login صرف اس سائٹ کا اپنا ہے۔', 'Cleanova never sees or stores your password. The login belongs to the site itself.') + '</p><button class="sbtn" id="sout" style="width:100%">' + tt('تمام سائٹس سے لاگ آؤٹ کریں', 'Log out of all sites') + '</button></div>' + CL.footer();
    bind('so', function (i) { web(SOC[+i][2], SOC[+i][0]); });
    bind('sc', function (i) { var c = lget('soc.custom', [])[+i]; if (c) web(c.u, c.n); });
    [].forEach.call(document.querySelectorAll('[data-sc]'), function (b) { var t; b.addEventListener('touchstart', function () { t = setTimeout(function () { var c = lget('soc.custom', []); CL.ask(tt('"' + c[+b.dataset.sc].n + '" ہٹانے کے لیے لکھیں: ہاں', 'Type yes to remove'), '', function (v) { if (/^(yes|y|ہاں)$/i.test(v.trim())) { c.splice(+b.dataset.sc, 1); lset('soc.custom', c); vSocial(); } }); }, 700); }, { passive: true }); b.addEventListener('touchend', function () { clearTimeout(t); }); });
    $('#sadd').onclick = function () { CL.ask(tt('نام | لنک', 'Name | link'), '', function (v) { var p = v.split('|'), u = validUrl(p[1] || p[0]); if (!u) { CL.toast('درست لنک لکھیں', 'Enter a valid link'); return; } var c = lget('soc.custom', []); c.push({ n: p[1] ? p[0].trim() : u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], u: u }); lset('soc.custom', c); vSocial(); }, 'Site | https://…'); };
    $('#sout').onclick = function () {
      CL.ask(tt('سب سائٹس سے لاگ آؤٹ ہو جائے گا۔ لکھیں: ہاں', 'This logs you out of every site. Type: yes'), '', function (v) {
        if (!/^(yes|y|ہاں)$/i.test(v.trim())) { CL.toast('منسوخ', 'Cancelled'); return; }
        var W = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Web;
        if (W && W.clearAll) W.clearAll().then(function () { CL.toast('لاگ آؤٹ ہو گیا', 'Logged out'); }); else CL.toast('یہ فون کی ایپ میں چلتا ہے', 'Works in the phone app');
      });
    };
  }
  V.social = vSocial;

  /* ================= WHATSAPP BY NUMBER ================= */
  var CC = [['92', '🇵🇰 +92'], ['91', '🇮🇳 +91'], ['971', '🇦🇪 +971'], ['966', '🇸🇦 +966'], ['44', '🇬🇧 +44'], ['1', '🇺🇸 +1'], ['974', '🇶🇦 +974'], ['968', '🇴🇲 +968'], ['965', '🇰🇼 +965'], ['49', '🇩🇪 +49'], ['61', '🇦🇺 +61']];
  var WS = { cc: '92' };
  function waNumber(cc, raw) {
    var d = String(raw || '').replace(/[^\d]/g, ''); if (!d) return '';
    if (String(raw).trim().indexOf('+') === 0) return d;
    d = d.replace(/^00/, ''); if (d.indexOf('0') === 0) d = d.slice(1);
    return d.indexOf(cc) === 0 && d.length > cc.length + 8 ? d : cc + d;
  }
  function vWa() {
    CL.setTop(T('نمبر پر چیٹ', 'Chat by number'));
    var rec = lget('wa.rec', []);
    $('#body').innerHTML = '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('ملک', 'Country') + '</span><select class="inp" id="wcc">' + CC.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === WS.cc ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select><span class="fl">' + tt('نمبر', 'Number') + '</span><input class="inp" id="wnum" type="tel" inputmode="tel" placeholder="300 1234567" style="direction:ltr;text-align:start"><span class="fl">' + tt('پیغام (اختیاری)', 'Message (optional)') + '</span><textarea class="inp" id="wmsg" rows="2" style="min-height:70px"></textarea><button class="btn" id="wgo" style="margin-top:12px">WhatsApp ▶</button><p class="note">' + tt('نمبر محفوظ کیے بغیر چیٹ کھلتی ہے۔ آپ کے فون کی WhatsApp ایپ میں۔', 'Opens the chat without saving the number, in your phone\'s WhatsApp app.') + '</p></div>' +
      (rec.length ? '<div class="sec">' + tt('حالیہ', 'RECENT') + '</div>' + rec.map(function (r, i) { return '<button class="card cat" data-wr="' + i + '" style="width:100%;text-align:start"><b dir="ltr">+' + esc(r) + '</b></button>'; }).join('') : '') + CL.footer();
    $('#wgo').onclick = function () {
      WS.cc = $('#wcc').value; var n = waNumber(WS.cc, $('#wnum').value);
      if (n.length < 8) { CL.toast('درست نمبر لکھیں', 'Enter a valid number'); return; }
      var r = lget('wa.rec', []).filter(function (x) { return x !== n; }); r.unshift(n); lset('wa.rec', r.slice(0, 8));
      var m = $('#wmsg').value.trim(); ext('https://wa.me/' + n + (m ? '?text=' + encodeURIComponent(m) : ''));
    };
    bind('wr', function (i) { var n = lget('wa.rec', [])[+i]; if (n) ext('https://wa.me/' + n); });
  }
  V.wachat = vWa;

  /* ================= QR ================= */
  var QS = { tab: 'scan', stream: null, text: '' };
  function stopCam() { try { if (QS.stream) QS.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } QS.stream = null; }
  function qrResult(txt) {
    var isUrl = /^https?:\/\//i.test(txt);
    var box = $('#qres'); if (!box) return;
    box.innerHTML = '<div class="card"><b>' + tt('نتیجہ', 'Result') + '</b><p dir="auto" style="word-break:break-all;margin:8px 0;font-family:system-ui,sans-serif">' + esc(txt) + '</p><div class="two">' + (isUrl ? '<button class="btn" id="qopen">' + tt('کھولیں', 'Open') + '</button>' : '<span></span>') + '<button class="sbtn" id="qcp">' + tt('کاپی', 'Copy') + '</button></div>' + (isUrl ? '<p class="note">⚠ ' + tt('انجان QR کا لنک کھولنے سے پہلے دیکھ لیں کہ کہاں جا رہا ہے۔', 'Check where an unknown QR link goes before opening it.') + '</p>' : '') + '</div>';
    if (isUrl) $('#qopen').onclick = function () { web(txt, 'QR'); };
    $('#qcp').onclick = function () { try { navigator.clipboard.writeText(txt); } catch (e) { /* ignore */ } CL.toast('کاپی ہو گیا', 'Copied'); };
  }
  function decodeImage(src) {
    var c = document.createElement('canvas'), ctx = c.getContext('2d'), w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return null; var s = Math.min(1, 900 / Math.max(w, h)); c.width = Math.round(w * s); c.height = Math.round(h * s);
    ctx.drawImage(src, 0, 0, c.width, c.height); var d = ctx.getImageData(0, 0, c.width, c.height);
    return window.jsQR ? window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' }) : null;
  }
  function vQr() {
    CL.setTop(T('QR', 'QR code')); stopCam();
    $('#body').innerHTML = chips([['scan', ['اسکین', 'Scan']], ['make', ['بنائیں', 'Create']]], QS.tab, 'qt').replace('class="chips"', 'class="chips" style="margin-top:8px"') + '<div id="qmain"></div><div id="qres"></div>' + CL.footer();
    bind('qt', function (t) { QS.tab = t; vQr(); });
    var m = $('#qmain');
    if (QS.tab === 'scan') {
      m.innerHTML = '<div class="card"><video id="qv" playsinline muted style="width:100%;border-radius:14px;background:#000;max-height:340px;display:none"></video><button class="btn" id="qcam">📷 ' + tt('کیمرہ کھولیں', 'Open camera') + '</button><label class="sbtn" style="display:flex;justify-content:center;align-items:center;width:100%;margin-top:8px;cursor:pointer">🖼 ' + tt('گیلری کی تصویر سے', 'From a photo') + '<input type="file" id="qf" accept="image/*" hidden></label></div>';
      $('#qcam').onclick = function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { CL.toast('کیمرہ دستیاب نہیں', 'Camera not available'); return; }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (st) {
          QS.stream = st; var v = $('#qv'); v.srcObject = st; v.style.display = 'block'; v.play(); $('#qcam').style.display = 'none';
          var tick = function () {
            if (!$('#qv') || !QS.stream) { stopCam(); return; }
            if (v.readyState >= 2) { var r = null; try { r = decodeImage(v); } catch (e) { /* frame not ready */ } if (r && r.data) { stopCam(); v.style.display = 'none'; $('#qcam').style.display = ''; qrResult(r.data); try { navigator.vibrate && navigator.vibrate(60); } catch (e) { /* ignore */ } return; } }
            setTimeout(tick, 150);
          }; tick();
        }).catch(function () { CL.toast('کیمرہ کی اجازت دیں', 'Allow camera access'); });
      };
      $('#qf').onchange = function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return; var img = new Image();
        img.onload = function () { var r = null; try { r = decodeImage(img); } catch (x) { /* ignore */ } if (r && r.data) qrResult(r.data); else CL.toast('اس تصویر میں QR نہیں ملا', 'No QR found in that photo'); URL.revokeObjectURL(img.src); };
        img.src = URL.createObjectURL(f);
      };
      var chk = setInterval(function () { if (!$('#qmain') || !$('#qcam')) { clearInterval(chk); stopCam(); } }, 1000);
    } else {
      m.innerHTML = '<div class="card"><span class="fl" style="margin-top:0">' + tt('متن، لنک یا نمبر', 'Text, link or number') + '</span><textarea class="inp" id="qtx" rows="3" style="min-height:80px" placeholder="https://…">' + esc(QS.text) + '</textarea><div style="text-align:center;margin-top:12px"><canvas id="qcv" style="background:#fff;border-radius:12px;max-width:100%"></canvas></div><div class="two" style="margin-top:10px"><button class="sbtn" id="qsh">' + tt('شیئر', 'Share') + '</button><button class="sbtn" id="qsv">' + tt('محفوظ کریں', 'Save') + '</button></div></div>';
      var draw = function () {
        QS.text = $('#qtx').value; var cv = $('#qcv'), ctx = cv.getContext('2d');
        if (!QS.text || !window.qrcode) { cv.width = cv.height = 0; return; }
        try {
          var q = window.qrcode(0, 'M'); q.addData(QS.text); q.make(); var n = q.getModuleCount(), px = Math.max(3, Math.floor(280 / (n + 8))), size = (n + 8) * px;
          cv.width = cv.height = size; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#000';
          for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + 4) * px, (r + 4) * px, px, px);
        } catch (e) { cv.width = cv.height = 0; CL.toast('متن بہت لمبا ہے', 'Text is too long'); }
      };
      $('#qtx').oninput = draw; draw();
      var blob = function (cb) { $('#qcv').toBlob(cb, 'image/png'); };
      $('#qsh').onclick = function () { if (!QS.text) return; blob(function (b) { try { var f = new File([b], 'qr.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }); else CL.toast('اسکرین شاٹ لے لیں', 'Take a screenshot'); } catch (e) { CL.toast('اسکرین شاٹ لے لیں', 'Take a screenshot'); } }); };
      $('#qsv').onclick = function () { if (!QS.text) return; blob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'cleanova-qr.png'; document.body.appendChild(a); a.click(); a.remove(); CL.toast('محفوظ ہو رہا ہے…', 'Saving…'); }); };
    }
  }
  V.qr = vQr;

  [['places', 'جگہ تلاش', 'Find place', '📍', 4], ['ai', 'AI ٹولز', 'AI tools', '🤖', 5], ['social', 'سوشل', 'Social', '🌐', 6], ['wachat', 'نمبر پر چیٹ', 'Chat by number', '🟢', 2], ['qr', 'QR', 'QR', '📷', 3]].forEach(function (m) {
    TO[m[0]] = 'life'; if (CL.MORE) CL.MORE.push([m[0], m[3], m[4], [m[1], m[2]]]);
  });
};
