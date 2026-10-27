/* Cleanova: duplicate photo and file cleaner. Developed by SMAA. Everything runs on the phone. */
(function () {
  'use strict';

  var Cap = window.Capacitor;
  var P;
  try { P = (Cap && Cap.registerPlugin && !window.CLEANOVA_MOCK) ? Cap.registerPlugin('Cleanova') : window.CleanovaMock; } catch (e) { if (window.cleanovaDiag) window.cleanovaDiag('registerPlugin failed: ' + e.message); }
  if (!P) P = new Proxy({}, { get: function () { return function () { return Promise.reject(new Error('plugin missing')); }; } });
  var AppPlugin = null;
  try { AppPlugin = Cap && Cap.registerPlugin ? Cap.registerPlugin('App') : null; } catch (e) { AppPlugin = null; }

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function T(ur, en) { return ur + '<small class="e">' + en + '</small>'; }
  function fmt(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  }
  function store(k, v) { try { if (v === undefined) { var x = localStorage.getItem('cleanova.' + k); return x === null ? null : JSON.parse(x); } localStorage.setItem('cleanova.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } return null; }
  var toastT = 0;
  function toast(ur, en) { var t = $('#toast'); t.innerHTML = T(ur, en); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3000); }

  /* ---------- file helpers ---------- */
  var EXT = {
    img: 'jpg jpeg png webp bmp heic heif gif',
    vid: 'mp4 mkv 3gp mov avi webm',
    aud: 'mp3 m4a aac ogg opus wav amr flac',
    doc: 'pdf doc docx xls xlsx ppt pptx txt csv'
  };
  function ext(p) { var i = p.lastIndexOf('.'); return i < 0 ? '' : p.slice(i + 1).toLowerCase(); }
  function kind(p) { var e = ext(p); for (var k in EXT) if ((' ' + EXT[k] + ' ').indexOf(' ' + e + ' ') >= 0) return k; return 'other'; }
  function base(p) { return p.slice(p.lastIndexOf('/') + 1); }
  function folder(p) { var s = p.replace('/storage/emulated/0/', ''); var i = s.lastIndexOf('/'); return i < 0 ? '/' : s.slice(0, i); }
  function score(it) {
    var p = it.path.toLowerCase(), s = 0;
    if (p.indexOf('/dcim/') >= 0) s += 3;
    if (p.indexOf('/pictures/') >= 0 || p.indexOf('/movies/') >= 0) s += 1;
    if (p.indexOf('/whatsapp') >= 0 || p.indexOf('/telegram') >= 0) s -= 2;
    if (p.indexOf('/download') >= 0) s -= 1;
    if (p.indexOf('screenshot') >= 0) s -= 1;
    var n = base(p);
    if (/\(\d+\)|copy|_copy| - copy/.test(n)) s -= 2;
    return s;
  }
  function best(items, bySize) {
    var l = items.slice().sort(function (a, b) {
      var d = score(b) - score(a); if (d) return d;
      if (bySize && b.size !== a.size) return b.size - a.size;
      return a.mtime - b.mtime;
    });
    return l[0];
  }

  /* ---------- state ---------- */
  var S = { view: 'home', granted: false, free: 0, total: 0, similar: store('similar') !== false, groups: [], cats: {}, sel: {}, review: null, trash: { items: [], bytes: 0 }, trashSel: {}, prog: null, back: [] };
  var CATS = [
    { id: 'eimg', ur: 'ہو بہو ایک جیسی تصاویر', en: 'Exact photo copies', ic: '🖼' },
    { id: 'simg', ur: 'ملتی جلتی تصاویر', en: 'Similar photos (review each)', ic: '📷' },
    { id: 'evid', ur: 'ویڈیوز', en: 'Videos', ic: '🎬' },
    { id: 'eaud', ur: 'آڈیو', en: 'Audio', ic: '🎵' },
    { id: 'edoc', ur: 'دستاویزات / PDF', en: 'Documents', ic: '📄' },
    { id: 'eoth', ur: 'باقی فائلیں', en: 'Other files', ic: '📦' }
  ];
  function catOf(g) {
    var k = kind(g.items[0].path);
    if (g.type === 'similar') return 'simg';
    return { img: 'eimg', vid: 'evid', aud: 'eaud', doc: 'edoc', other: 'eoth' }[k];
  }

  function prepare(groups) {
    S.groups = groups.map(function (g, i) {
      var keeper = best(g.items, g.type === 'similar');
      return { id: i, type: g.type, size: g.size, items: g.items, keeper: keeper.path, cat: catOf(g) };
    });
    S.sel = {};
    S.groups.forEach(function (g) {
      if (g.type === 'exact') g.items.forEach(function (it) { if (it.path !== g.keeper) S.sel[it.path] = it.size; });
    });
  }
  function catStats(id) {
    var n = 0, files = 0, bytes = 0, sel = 0, selBytes = 0;
    S.groups.forEach(function (g) {
      if (g.cat !== id) return;
      n++; files += g.items.length;
      g.items.forEach(function (it) { if (it.path !== g.keeper) bytes += it.size; if (S.sel[it.path]) { sel++; selBytes += it.size; } });
    });
    return { groups: n, files: files, bytes: bytes, sel: sel, selBytes: selBytes };
  }
  function selTotals() { var n = 0, b = 0; for (var p in S.sel) { n++; b += S.sel[p]; } return { n: n, b: b }; }

  /* ---------- thumbnails ---------- */
  var thumbCache = {}, thumbQ = [], thumbBusy = 0;
  function pumpThumbs() {
    while (thumbBusy < 2 && thumbQ.length) {
      var job = thumbQ.shift(); thumbBusy++;
      (function (j) {
        P.thumbnail({ path: j.path, size: 160 }).then(function (r) { thumbCache[j.path] = (r && r.data) || ''; j.cb(thumbCache[j.path]); }).catch(function () { thumbCache[j.path] = ''; }).then(function () { thumbBusy--; pumpThumbs(); });
      })(job);
    }
  }
  var io = null;
  function watchThumbs(root) {
    if (!io && window.IntersectionObserver) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        var path = el.getAttribute('data-p');
        if (thumbCache[path] !== undefined) { if (thumbCache[path]) el.style.backgroundImage = 'url(' + thumbCache[path] + ')', el.textContent = ''; return; }
        thumbQ.push({ path: path, cb: function (d) { if (d) { el.style.backgroundImage = 'url(' + d + ')'; el.textContent = ''; } } }); pumpThumbs();
      });
    }, { root: $('#body'), rootMargin: '300px' });
    [].forEach.call(root.querySelectorAll('.im[data-p]'), function (el) { if (io) io.observe(el); });
  }

  /* ---------- navigation ---------- */
  function go(view, extra) { S.back.push({ view: S.view, review: S.review }); S.view = view; if (extra !== undefined) S.review = extra; render(); }
  function goBack() {
    if (!$('#modal').hidden) { $('#modal').hidden = true; return true; }
    if (S.view === 'scanning') return true;
    if (S.view === 'gate' || (S.view === 'home' && !S.back.length)) return false;
    var b = S.back.pop() || { view: 'home' };
    S.view = b.view; S.review = b.review; render(); return true;
  }
  try { if (AppPlugin && AppPlugin.addListener) AppPlugin.addListener('backButton', function () { if (!goBack()) AppPlugin.exitApp(); }); } catch (e) { /* back button stays default */ }

  /* ---------- screens ---------- */
  function setTop(titleHtml, act) { $('#title').innerHTML = titleHtml; $('#topact').innerHTML = act || ''; }
  function setBottom(html) { var b = $('#bottom'); b.hidden = !html; b.innerHTML = html || ''; }

  function render() {
    var fn = { gate: vGate, home: vHome, scanning: vScan, results: vResults, review: vReview, trash: vTrash, done: vDone }[S.view] || vHome;
    $('#body').scrollTop = 0;
    fn();
  }

  function vGate() {
    setTop('کلینووا <small>Cleanova</small>'); setBottom('');
    $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">🔒</div><h2 style="font-size:22px">' + T('اجازت درکار ہے', 'Permission needed') + '</h2>' +
      '<p class="mut" style="margin-top:8px">ڈپلیکیٹ فائلیں ڈھونڈنے کے لیے کلینووا کو فون کی فائلیں دیکھنے کی اجازت چاہیے۔ سب کچھ آپ کے فون میں ہی رہتا ہے، کچھ اپلوڈ نہیں ہوتا۔</p>' +
      '<p class="mut e" style="margin-top:4px">Cleanova needs access to files to find duplicates. Everything stays on your phone; nothing is uploaded.</p>' +
      '<button class="btn" id="allow">' + T('اجازت دیں', 'Allow access') + '</button>' +
      '<p class="mut" style="margin-top:12px;font-size:14px">کھلنے والی سکرین میں Cleanova کو آن کریں، پھر واپس آ جائیں۔</p></div>';
    $('#allow').onclick = function () { P.requestAccess().then(function (r) { if (r && r.granted) refreshStatus(); }).catch(function () { /* user will return */ }); };
  }

  function vHome() {
    setTop('کلینووا <small>Cleanova</small>', '<button class="iconbtn" id="tbtn" aria-label="ٹریش">🗑</button>'); setBottom('');
    var used = S.total ? Math.round((S.total - S.free) / S.total * 100) : 0;
    $('#body').innerHTML = '<div class="card"><div class="mut">' + T('فون کی جگہ', 'Phone storage') + '</div><div class="big">' + fmt(S.free) + '</div><div class="mut">خالی ہے · ' + fmt(S.total) + ' میں سے <span class="e" style="display:inline">free of total</span></div><div class="bar"><i style="width:' + used + '%"></i></div></div>' +
      '<div class="card"><div class="switch"><div>' + T('ملتی جلتی تصاویر بھی ڈھونڈیں', 'Also find similar photos (slower)') + '</div><button class="sw" id="swsim" aria-pressed="' + S.similar + '" aria-label="ملتی جلتی تصاویر"></button></div></div>' +
      '<button class="btn" id="scanbtn">' + T('اسکین شروع کریں', 'Start scan') + '</button>' +
      (S.groups.length ? '<button class="btn o" id="lastbtn">' + T('پچھلا نتیجہ دیکھیں', 'View last result') + '</button>' : '') +
      '<div class="foot">سب کچھ آپ کے فون میں ہوتا ہے۔ کچھ اپلوڈ نہیں ہوتا۔<br>Developed by SMAA</div>';
    $('#swsim').onclick = function () { S.similar = !S.similar; store('similar', S.similar); this.setAttribute('aria-pressed', String(S.similar)); };
    $('#scanbtn').onclick = startScan;
    if ($('#lastbtn')) $('#lastbtn').onclick = function () { go('results'); };
    $('#tbtn').onclick = function () { loadTrash().then(function () { go('trash'); }); };
  }

  var PH = { walk: ['فائلیں گن رہا ہوں…', 'Counting files'], hash: ['ایک جیسی فائلیں ملا رہا ہوں…', 'Matching identical files'], similar: ['ملتی جلتی تصاویر دیکھ رہا ہوں…', 'Comparing similar photos'] };
  function vScan() {
    setTop('اسکین ہو رہا ہے <small>Scanning</small>'); setBottom('');
    var p = S.prog || { phase: 'walk', done: 0, total: 0 }, ph = PH[p.phase] || PH.walk;
    $('#body').innerHTML = '<div class="card center"><div class="spin"></div><h2 style="font-size:20px">' + T(ph[0], ph[1]) + '</h2>' +
      '<div class="big" style="text-align:center;font-size:34px">' + p.done + (p.total ? ' / ' + p.total : '') + '</div><div class="bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 5) + '%"></i></div>' +
      '<p class="mut" style="margin-top:12px;font-size:14px">اسکرین کھلی رکھیں۔ فائلیں زیادہ ہوں تو کچھ منٹ لگ سکتے ہیں۔</p></div>';
  }
  var scanTick = 0;
  function startScan() {
    S.view = 'scanning'; S.back = []; S.prog = { phase: 'walk', done: 0, total: 0 }; render();
    var h;
    P.addListener('progress', function (e) {
      S.prog = e; var now = Date.now();
      if (S.view === 'scanning' && now - scanTick > 250) { scanTick = now; vScan(); }
    }).then(function (x) { h = x; });
    P.scan({ similar: S.similar }).then(function (r) {
      if (h && h.remove) h.remove();
      prepare(r.groups || []); S.scanned = r.files || 0; S.view = 'results'; S.back = [{ view: 'home' }]; render();
    }).catch(function (e) {
      if (h && h.remove) h.remove();
      S.view = 'home'; render(); toast('اسکین نہیں ہو سکا', 'Scan failed: ' + (e && e.message || e));
    });
  }

  function vResults() {
    setTop('نتیجہ <small>Results</small>');
    var t = selTotals(), possible = 0, any = false;
    S.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.path !== g.keeper) possible += it.size; }); any = true; });
    if (!any) {
      setBottom('');
      $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✨</div><h2 style="font-size:22px">' + T('کوئی ڈپلیکیٹ نہیں ملا', 'No duplicates found') + '</h2><p class="mut">' + (S.scanned || 0) + ' فائلیں دیکھی گئیں · files checked</p></div>';
      return;
    }
    var h = '<div class="card"><div class="mut">' + T('آپ بچا سکتے ہیں', 'You can save up to') + '</div><div class="big">' + fmt(possible) + '</div><div class="mut">' + S.groups.length + ' گروپ · groups</div></div><div class="card">';
    CATS.forEach(function (c) {
      var s = catStats(c.id); if (!s.groups) return;
      h += '<button class="cat" data-cat="' + c.id + '"><span>' + c.ic + ' <b>' + c.ur + '</b><small class="e">' + c.en + '</small></span><span class="pill">' + s.groups + ' · ' + fmt(s.bytes) + (s.sel ? ' · ✓' + s.sel : '') + '</span></button>';
    });
    h += '</div><p class="mut" style="margin-top:12px;font-size:14px">ہو بہو ایک جیسی فائلیں پہلے سے چنی ہوئی ہیں اور ہر گروپ میں ایک اصل فائل رہے گی۔ ملتی جلتی تصاویر آپ خود دیکھ کر چنیں۔</p>';
    $('#body').innerHTML = h;
    [].forEach.call(document.querySelectorAll('[data-cat]'), function (b) { b.onclick = function () { go('review', b.dataset.cat); }; });
    setBottom('<button class="btn" id="movebtn"' + (t.n ? '' : ' disabled') + '>' + T('ٹریش میں بھیجیں (' + t.n + ' فائلیں · ' + fmt(t.b) + ')', 'Move selected to trash') + '</button>');
    $('#movebtn').onclick = confirmMove;
  }

  function vReview() {
    var cat = CATS.filter(function (c) { return c.id === S.review; })[0];
    setTop(cat.ur + '<small class="e">' + cat.en + '</small>');
    var gs = S.groups.filter(function (g) { return g.cat === cat.id; });
    var isSim = cat.id === 'simg';
    var h = '<div class="tabs"><button id="selall">' + T(isSim ? 'تجویز کردہ چنیں' : 'سب تجویز کردہ چنیں', 'Select suggested') + '</button><button id="selnone">' + T('کچھ نہ چنیں', 'Select none') + '</button></div>' +
      '<p class="mut" style="margin-top:8px;font-size:14px">تصویر پر ٹچ کر کے رکھیں/ہٹائیں بدلیں۔ سبز = رکھیں، سرخ = ٹریش میں جائے گی۔</p>';
    gs.forEach(function (g) {
      var sv = 0; g.items.forEach(function (it) { if (S.sel[it.path]) sv += it.size; });
      h += '<div class="grp" data-g="' + g.id + '"><div class="hd"><span>' + g.items.length + ' فائلیں' + (g.type === 'similar' ? ' · ملتی جلتی' : ' · ایک جیسی') + '</span><span class="pill">' + (sv ? '−' + fmt(sv) : fmt(g.size)) + '</span></div><div class="thumbs">';
      g.items.forEach(function (it) {
        var del = !!S.sel[it.path], k = kind(it.path);
        h += '<button class="th ' + (del ? 'del' : 'keep') + '" data-p="' + esc(it.path) + '"><div class="im" ' + (k === 'img' || k === 'vid' ? 'data-p="' + esc(it.path) + '"' : '') + '>' + (k === 'img' || k === 'vid' ? '' : esc(ext(it.path) || 'file')) + '</div><div class="nm">' + esc(base(it.path)) + '</div><div class="nm">' + esc(folder(it.path)) + ' · ' + fmt(it.size) + '</div><div class="st">' + (del ? 'ہٹائیں' : (it.path === g.keeper ? 'رکھیں ★' : 'رکھیں')) + '</div></button>';
      });
      h += '</div></div>';
    });
    $('#body').innerHTML = h;
    watchThumbs($('#body'));
    $('#selall').onclick = function () { gs.forEach(function (g) { g.items.forEach(function (it) { if (it.path !== g.keeper) S.sel[it.path] = it.size; else delete S.sel[it.path]; }); }); vReview(); };
    $('#selnone').onclick = function () { gs.forEach(function (g) { g.items.forEach(function (it) { delete S.sel[it.path]; }); }); vReview(); };
    $('#body').onclick = function (e) {
      var th = e.target.closest('.th'); if (!th) return;
      var gel = th.closest('[data-g]'), g = S.groups[+gel.dataset.g], p = th.dataset.p, it = g.items.filter(function (x) { return x.path === p; })[0];
      if (S.sel[p]) delete S.sel[p];
      else {
        var left = g.items.filter(function (x) { return x.path !== p && !S.sel[x.path]; }).length;
        if (!left) return toast('ہر گروپ میں ایک کاپی رکھنا ضروری ہے', 'At least one copy must stay');
        S.sel[p] = it.size;
      }
      var y = $('#body').scrollTop; vReview(); $('#body').scrollTop = y;
    };
    var t = selTotals();
    setBottom('<button class="btn" id="movebtn"' + (t.n ? '' : ' disabled') + '>' + T('ٹریش میں بھیجیں (' + t.n + ' فائلیں · ' + fmt(t.b) + ')', 'Move selected to trash') + '</button>');
    $('#movebtn').onclick = confirmMove;
  }

  /* ---------- move to trash ---------- */
  function confirmMove() {
    var t = selTotals(); if (!t.n) return;
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<h2 style="font-size:22px">' + T('تصدیق', 'Confirm') + '</h2><p style="margin-top:6px">' + t.n + ' فائلیں ٹریش میں جائیں گی۔</p><div class="big" style="font-size:34px">' + fmt(t.b) + '</div>' +
      '<p class="mut" style="font-size:14px">فائلیں فوراً ختم نہیں ہوتیں۔ تقریباً 30 دن ٹریش میں رہتی ہیں اور آپ واپس لا سکتے ہیں۔ ہر گروپ میں ایک اصل فائل رہے گی۔</p>' +
      '<button class="btn" id="okmove">' + T('ٹریش میں بھیجیں', 'Move to trash') + '</button><button class="btn o" id="nomove">' + T('واپس جائیں', 'Cancel') + '</button>';
    $('#nomove').onclick = function () { m.hidden = true; };
    $('#okmove').onclick = function () { m.hidden = true; doMove(); };
  }
  function doMove() {
    var paths = Object.keys(S.sel), done = 0, bytes = 0, i = 0;
    S.view = 'scanning'; S.prog = { phase: 'move', done: 0, total: paths.length }; PH.move = ['ٹریش میں بھیج رہا ہوں…', 'Moving to trash']; render();
    (function next() {
      if (i >= paths.length) return finishMove(done, bytes);
      var chunk = paths.slice(i, i + 40); i += 40;
      P.trashMove({ paths: chunk }).then(function (r) { done += r.moved || 0; bytes += r.bytes || 0; S.prog = { phase: 'move', done: Math.min(i, paths.length), total: paths.length }; vScan(); next(); })
        .catch(function () { next(); });
    })();
  }
  function finishMove(done, bytes) {
    var movedSet = {}; Object.keys(S.sel).forEach(function (p) { movedSet[p] = 1; });
    S.groups.forEach(function (g) { g.items = g.items.filter(function (it) { return !movedSet[it.path]; }); });
    S.groups = S.groups.filter(function (g) { return g.items.length > 1; });
    S.groups.forEach(function (g) { if (!g.items.some(function (it) { return it.path === g.keeper; })) g.keeper = best(g.items, true).path; });
    S.sel = {}; S.lastMoved = { n: done, b: bytes }; S.back = []; S.view = 'done'; render(); refreshStatus(true);
  }
  function vDone() {
    setTop('مکمل <small>Done</small>'); setBottom('');
    var m = S.lastMoved || { n: 0, b: 0 };
    $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✅</div><h2 style="font-size:22px">' + m.n + ' فائلیں ٹریش میں بھیج دی گئیں</h2><div class="big" style="text-align:center">' + fmt(m.b) + '</div>' +
      '<p class="mut" style="margin-top:8px;font-size:14px">جگہ تب خالی ہو گی جب آپ ٹریش خالی کریں گے۔ 30 دن بعد ٹریش خود خالی ہو جاتا ہے۔</p><p class="mut e">Space is freed when the trash is emptied. It also empties itself after 30 days.</p>' +
      '<button class="btn" id="emptynow">' + T('ٹریش ابھی خالی کریں', 'Empty trash now') + '</button><button class="btn o" id="later">' + T('بعد میں', 'Later') + '</button></div>';
    $('#emptynow').onclick = function () { P.trashEmpty({}).then(function (r) { toast('جگہ خالی ہو گئی: ' + fmt(r.freed || 0), 'Freed'); S.view = 'home'; refreshStatus(); }).catch(function () { toast('خالی نہیں ہو سکا', 'Could not empty'); }); };
    $('#later').onclick = function () { S.view = S.groups.length ? 'results' : 'home'; S.back = [{ view: 'home' }]; refreshStatus(); };
  }

  /* ---------- trash ---------- */
  function loadTrash() {
    return P.trashList().then(function (r) { S.trash = { items: r.items || [], bytes: r.bytes || 0 }; S.trashSel = {}; }).catch(function () { S.trash = { items: [], bytes: 0 }; });
  }
  function vTrash() {
    setTop('ٹریش <small>Trash</small>'); setBottom('');
    var tr = S.trash, now = Date.now();
    if (!tr.items.length) { $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">🗑</div><h2 style="font-size:20px">' + T('ٹریش خالی ہے', 'Trash is empty') + '</h2></div>'; return; }
    var h = '<div class="card"><div class="mut">' + T('ٹریش میں', 'In trash') + '</div><div class="big">' + fmt(tr.bytes) + '</div><div class="mut">' + tr.items.length + ' فائلیں</div></div>' +
      '<div class="tabs"><button id="tall">' + T('سب چنیں', 'Select all') + '</button><button id="tnone">' + T('کچھ نہ چنیں', 'None') + '</button></div><div class="card" id="tlist">';
    tr.items.forEach(function (it) {
      var left = Math.max(0, 30 - Math.floor((now - it.ts) / 86400000)), k = kind(it.original);
      h += '<button class="cat" data-t="' + esc(it.id) + '" style="direction:rtl"><span class="sw" aria-pressed="' + !!S.trashSel[it.id] + '"></span><span style="flex:1;min-width:0;text-align:right"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-family:system-ui;font-size:14px">' + esc(base(it.original)) + '</b><small class="e">' + esc(folder(it.original)) + ' · ' + left + ' دن باقی (days left)</small></span><span class="pill">' + fmt(it.size) + '</span></button>';
    });
    h += '</div>';
    $('#body').innerHTML = h;
    var n = Object.keys(S.trashSel).length;
    setBottom('<div style="display:flex;gap:10px"><button class="btn" id="restore" style="flex:1"' + (n ? '' : ' disabled') + '>' + T('واپس لائیں', 'Restore') + '</button><button class="btn red" id="purge" style="flex:1"' + (n ? '' : ' disabled') + '>' + T('ہمیشہ کے لیے ہٹائیں', 'Delete forever') + '</button></div><button class="btn o" id="purgeall" style="margin-top:8px;min-height:44px">' + T('پوری ٹریش خالی کریں', 'Empty all trash') + '</button>');
    $('#tall').onclick = function () { tr.items.forEach(function (it) { S.trashSel[it.id] = 1; }); vTrash(); };
    $('#tnone').onclick = function () { S.trashSel = {}; vTrash(); };
    $('#tlist').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; var id = b.dataset.t; if (S.trashSel[id]) delete S.trashSel[id]; else S.trashSel[id] = 1; var y = $('#body').scrollTop; vTrash(); $('#body').scrollTop = y; };
    $('#restore').onclick = function () { P.trashRestore({ ids: Object.keys(S.trashSel) }).then(function (r) { toast('واپس آ گئیں: ' + (r.restored || 0), 'Restored'); loadTrash().then(vTrash); }); };
    $('#purge').onclick = function () { askForever(Object.keys(S.trashSel)); };
    $('#purgeall').onclick = function () { askForever(null); };
  }
  function askForever(ids) {
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<h2 style="font-size:22px">' + T('کیا ہمیشہ کے لیے ہٹائیں؟', 'Delete forever?') + '</h2><p class="mut" style="margin-top:6px">یہ فائلیں دوبارہ واپس نہیں آئیں گی۔</p><button class="btn red" id="yesforever">' + T('ہاں، ہٹا دیں', 'Yes, delete') + '</button><button class="btn o" id="noforever">' + T('منسوخ', 'Cancel') + '</button>';
    $('#noforever').onclick = function () { m.hidden = true; };
    $('#yesforever').onclick = function () { m.hidden = true; P.trashEmpty(ids ? { ids: ids } : {}).then(function (r) { toast('جگہ خالی ہو گئی: ' + fmt(r.freed || 0), 'Freed'); loadTrash().then(vTrash); refreshStatus(true); }); };
  }

  /* ---------- start ---------- */
  function withTimeout(promise, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout: native plugin did not answer in ' + ms / 1000 + 's')); }, ms);
      promise.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function refreshStatus(quiet) {
    var call;
    try { call = withTimeout(P.status(), 5000); } catch (e) { call = Promise.reject(e); }
    return call.then(function (r) {
      S.granted = !!r.granted; S.free = r.free || 0; S.total = r.total || 0;
      if (!quiet) { if (!S.granted) { S.view = 'gate'; } else if (S.view === 'gate') S.view = 'home'; render(); }
    }).catch(function (e) { S.view = 'gate'; render(); if (window.cleanovaDiag) window.cleanovaDiag('status failed: ' + (e && (e.message || e)) + '\nCapacitor: ' + typeof window.Capacitor + ', native: ' + (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) + ', plugin: ' + typeof P); });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && (S.view === 'gate')) refreshStatus(); });
  window.cleanovaTest = { S: S, render: render, prepare: prepare, go: go };
  refreshStatus();
})();
