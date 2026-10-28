/* Cleanova: duplicate and junk cleaner. Developed by SMAA. Everything runs on the phone. */
(function () {
  'use strict';

  var Cap = window.Capacitor;
  var PL = (Cap && Cap.Plugins) || {};
  var P = (!window.CLEANOVA_MOCK && PL.Cleanova) ? PL.Cleanova : window.CleanovaMock;
  if (!P) {
    if (window.cleanovaDiag) window.cleanovaDiag('native plugin not found. Plugins: ' + Object.keys(PL).join(', '));
    P = new Proxy({}, { get: function () { return function () { return Promise.reject(new Error('plugin missing')); }; } });
  }
  var AppPlugin = (!window.CLEANOVA_MOCK && PL.App) ? PL.App : null;
  var LN = (!window.CLEANOVA_MOCK && PL.LocalNotifications) ? PL.LocalNotifications : null;

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) { var x = localStorage.getItem('cleanova.' + k); return x === null ? null : JSON.parse(x); } localStorage.setItem('cleanova.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } return null; }

  /* ---------- preferences and language ---------- */
  var PREF = {
    lang: store('lang') || 'both',            /* en | ur | both (Urdu with English caption) */
    theme: store('theme') || 'dark',
    similar: store('similar') !== false,
    quality: store('quality') !== false,
    keep: store('keep') || 'camera',
    protect: store('protect') || [],
    remind: !!store('remind'),
    trashDays: store('trashDays') || 30
  };
  function T(ur, en) {
    if (PREF.lang === 'en') return en;
    if (PREF.lang === 'ur') return ur;
    return ur + '<small class="e">' + en + '</small>';
  }
  function tt(ur, en) { return PREF.lang === 'en' ? en : ur; }       /* plain text (no markup) */
  function applyLook() {
    var h = document.documentElement;
    h.setAttribute('data-theme', PREF.theme);
    h.setAttribute('dir', PREF.lang === 'en' ? 'ltr' : 'rtl');
    h.setAttribute('lang', PREF.lang === 'en' ? 'en' : 'ur');
    document.body.className = PREF.lang === 'en' ? 'en' : '';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', PREF.theme === 'light' ? '#eef3f8' : '#080e1a');
  }
  function setPref(k, v) { PREF[k] = v; store(k, v); }
  var toastT = 0;
  function toast(ur, en) { var t = $('#toast'); t.innerHTML = T(ur, en); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200); }
  function fmt(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  }
  function nfiles(n) { return T(n + ' فائلیں', n + (n === 1 ? ' file' : ' files')); }

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
      if (PREF.keep === 'oldest' && a.mtime !== b.mtime) return a.mtime - b.mtime;
      if (PREF.keep === 'newest' && a.mtime !== b.mtime) return b.mtime - a.mtime;
      if (PREF.keep === 'largest' && a.size !== b.size) return b.size - a.size;
      var d = score(b) - score(a); if (d) return d;
      if (bySize && b.size !== a.size) return b.size - a.size;
      return a.mtime - b.mtime;
    });
    return l[0];
  }

  /* ---------- state ---------- */
  var S = {
    view: 'home', granted: false, free: 0, total: 0, scanned: false, groups: [], x: { large: [], wa: [], shots: [], junk: [], old: [], blurry: [] }, dirSet: {},
    sel: {}, review: null, list: null, limit: 150, trash: { items: [], bytes: 0 }, trashSel: {}, prog: null, back: [],
    f: { shots: 0, old: 30, blurry: 'all', junk: 'all', waAge: 90, waDir: 'all' }, last: store('last') || null
  };
  var CATS = [
    { id: 'eimg', ur: 'ہو بہو ایک جیسی تصاویر', en: 'Exact photo copies', ic: '🖼' },
    { id: 'simg', ur: 'ملتی جلتی تصاویر (خود دیکھ کر چنیں)', en: 'Similar photos (review each)', ic: '📷' },
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
  function catLabel(c) { return T(c.ur, c.en); }

  function prepare(groups, extras) {
    S.groups = groups.map(function (g, i) {
      var keeper = best(g.items, g.type === 'similar');
      return { id: i, type: g.type, size: g.size, items: g.items, keeper: keeper.path, cat: catOf(g) };
    });
    S.sel = {};
    S.groups.forEach(function (g) {
      if (g.type === 'exact') g.items.forEach(function (it) { if (it.path !== g.keeper) S.sel[it.path] = it.size; });
    });
    var x = extras || {};
    S.x = { large: x.large || [], wa: x.wa || [], shots: x.shots || [], junk: (x.junk || []).slice(), old: x.old || [], blurry: x.blurry || [] };
    S.dirSet = {};
    (x.empty || []).forEach(function (d) { S.dirSet[d] = 1; S.x.junk.push({ path: d, size: 0, mtime: 0, dir: true }); });
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
  function sumItems(l) { var b = 0; l.forEach(function (i) { b += i.size; }); return b; }
  function dupBytes() { var b = 0; S.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.path !== g.keeper) b += it.size; }); }); return b; }
  /* easy wins: duplicate extras + junk + blurry + old screenshots, each file counted once */
  function potential() {
    var seen = {}, b = 0;
    function add(p, s) { if (!seen[p]) { seen[p] = 1; b += s; } }
    S.groups.forEach(function (g) { if (g.type === 'exact') g.items.forEach(function (it) { if (it.path !== g.keeper) add(it.path, it.size); }); });
    S.x.junk.forEach(function (i) { add(i.path, i.size); });
    S.x.blurry.forEach(function (i) { add(i.path, i.size); });
    S.x.shots.forEach(function (i) { if (Date.now() - i.mtime > 30 * 864e5) add(i.path, i.size); });
    return b;
  }
  function savePotential() { S.last = { b: potential(), t: Date.now() }; store('last', S.last); }

  /* ---------- extra lists ---------- */
  var DAY = 864e5;
  function older(it, days) { return !days || (Date.now() - it.mtime) > days * DAY; }
  function waType(it) {
    var p = it.path.toLowerCase();
    if (p.indexOf('voice notes') >= 0) return 'voice';
    return kind(it.path);
  }
  var WA_TYPES = [
    { id: 'img', ur: 'تصاویر', en: 'Images', ic: '🖼' }, { id: 'vid', ur: 'ویڈیوز', en: 'Videos', ic: '🎬' },
    { id: 'voice', ur: 'وائس نوٹس', en: 'Voice notes', ic: '🎙' }, { id: 'aud', ur: 'آڈیو', en: 'Audio', ic: '🎵' },
    { id: 'doc', ur: 'دستاویزات', en: 'Documents', ic: '📄' }, { id: 'other', ur: 'باقی', en: 'Other', ic: '📦' }
  ];
  function waFiltered() {
    return S.x.wa.filter(function (it) {
      if (!older(it, S.f.waAge)) return false;
      var sent = it.path.indexOf('/Sent/') >= 0;
      if (S.f.waDir === 'sent' && !sent) return false;
      if (S.f.waDir === 'recv' && sent) return false;
      return true;
    });
  }
  var AGE_OPTS = function (key) { return { key: key, opts: [[30, '1 ماہ سے پرانی', 'Over 1 month'], [90, '3 ماہ سے پرانی', 'Over 3 months'], [180, '6 ماہ سے پرانی', 'Over 6 months']] }; };
  function listDef(id) {
    var d;
    if (id === 'large') d = { ur: 'بڑی فائلیں', en: 'Large files', hint: ['50 MB سے بڑی فائلیں، سب سے بڑی پہلے۔ خود دیکھ کر چنیں۔', 'Files over 50 MB, biggest first. Pick what you do not need.'], items: S.x.large.slice(), chips: [] };
    else if (id === 'shots') d = { ur: 'اسکرین شاٹس', en: 'Screenshots', hint: ['پرانے اسکرین شاٹس جو شاید اب کام کے نہیں۔', 'Old screenshots you probably do not need.'], items: S.x.shots.filter(function (i) { return older(i, S.f.shots); }), chips: [{ key: 'shots', opts: [[0, 'سب', 'All'], [30, '1 ماہ سے پرانے', 'Over 1 month'], [90, '3 ماہ سے پرانے', 'Over 3 months']] }] };
    else if (id === 'blurry') d = { ur: 'دھندلی اور تاریک تصاویر', en: 'Blurry and dark photos', hint: ['سافٹ ویئر کا اندازہ ہے، غلط بھی ہو سکتا ہے۔ ہر تصویر خود دیکھ کر چنیں۔', 'This is an automatic guess and can be wrong. Check each photo.'], items: S.x.blurry.filter(function (i) { return S.f.blurry === 'all' || i.reason === S.f.blurry; }), chips: [{ key: 'blurry', opts: [['all', 'سب', 'All'], ['blur', 'دھندلی', 'Blurry'], ['dark', 'تاریک', 'Dark']] }] };
    else if (id === 'junk') d = { ur: 'فالتو فائلیں', en: 'Junk files', hint: ['پرانی انسٹالر APK، عارضی فائلیں اور خالی فولڈر۔', 'Old installer APKs, temporary files and empty folders.'], items: S.x.junk.filter(function (i) { var e = ext(i.path), f = S.f.junk; return f === 'all' || (f === 'apk' && e === 'apk' && !i.dir) || (f === 'dir' && i.dir) || (f === 'tmp' && e !== 'apk' && !i.dir); }), chips: [{ key: 'junk', opts: [['all', 'سب', 'All'], ['apk', 'APK', 'APK'], ['tmp', 'عارضی', 'Temp'], ['dir', 'خالی فولڈر', 'Empty folders']] }] };
    else if (id === 'old') d = { ur: 'پرانی ڈاؤن لوڈز', en: 'Old downloads', hint: ['Download فولڈر کی پرانی فائلیں۔', 'Old files in your Download folder.'], items: S.x.old.filter(function (i) { return older(i, S.f.old); }), chips: [AGE_OPTS('old')] };
    else if (id.indexOf('wa:') === 0) {
      var t = id.slice(3), wt = WA_TYPES.filter(function (x) { return x.id === t; })[0];
      d = { ur: 'واٹس ایپ · ' + wt.ur, en: 'WhatsApp · ' + wt.en, hint: ['واٹس ایپ کا پرانا میڈیا۔ ہٹانے سے چیٹ کا متن نہیں جاتا۔', 'Old WhatsApp media. Chat text is not touched.'], items: waFiltered().filter(function (i) { return waType(i) === t; }), chips: [AGE_OPTS('waAge'), { key: 'waDir', opts: [['all', 'سب', 'All'], ['recv', 'موصول شدہ', 'Received'], ['sent', 'بھیجی ہوئی', 'Sent']] }] };
    }
    d.items.sort(function (a, b) { return (b.dir ? -1 : 0) - (a.dir ? -1 : 0) || b.size - a.size; });
    d.id = id;
    return d;
  }

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
        if (thumbCache[path] !== undefined) { if (thumbCache[path]) { el.style.backgroundImage = 'url(' + thumbCache[path] + ')'; el.textContent = ''; } return; }
        thumbQ.push({ path: path, cb: function (d) { if (d) { el.style.backgroundImage = 'url(' + d + ')'; el.textContent = ''; } } }); pumpThumbs();
      });
    }, { root: $('#body'), rootMargin: '300px' });
    [].forEach.call(root.querySelectorAll('.im[data-p]'), function (el) { if (io) io.observe(el); });
  }

  /* ---------- navigation ---------- */
  var TABS = [
    { id: 'home', ic: '🏠', ur: 'ہوم', en: 'Home' }, { id: 'overview', ic: '📊', ur: 'نتیجہ', en: 'Results' },
    { id: 'monitor', ic: '📈', ur: 'مانیٹر', en: 'Monitor' }, { id: 'trash', ic: '🗑', ur: 'ٹریش', en: 'Trash' }, { id: 'settings', ic: '⚙', ur: 'ترتیبات', en: 'Settings' }
  ];
  var TAB_OF = { home: 'home', overview: 'overview', dups: 'overview', review: 'overview', list: 'overview', wa: 'overview', trash: 'trash', settings: 'settings', done: 'home', contacts: 'home', monitor: 'monitor' };
  function go(view, extra) { S.back.push({ view: S.view, review: S.review, list: S.list }); S.view = view; if (extra !== undefined) { if (view === 'review') S.review = extra; else S.list = extra; } S.limit = 150; render(); }
  function goBack() {
    if (!$('#modal').hidden) { $('#modal').hidden = true; return true; }
    if (S.view === 'scanning') return true;
    if (S.view === 'gate' || (S.view === 'home' && !S.back.length)) return false;
    var b = S.back.pop() || { view: 'home' };
    S.view = b.view; S.review = b.review; S.list = b.list; render(); return true;
  }
  try { if (AppPlugin && AppPlugin.addListener) AppPlugin.addListener('backButton', function () { if (!goBack()) AppPlugin.exitApp(); }); } catch (e) { /* back button stays default */ }

  /* ---------- chrome ---------- */
  function langToggle() {
    return '<div class="lang"><button data-l="en" class="' + (PREF.lang === 'en' ? 'on' : '') + '">EN</button><button data-l="ur" class="' + (PREF.lang !== 'en' ? 'on' : '') + '">اردو</button></div>';
  }
  function setTop(titleHtml) {
    $('#title').innerHTML = titleHtml;
    $('#topact').innerHTML = langToggle();
    [].forEach.call(document.querySelectorAll('#topact [data-l]'), function (b) {
      b.onclick = function () { var l = b.dataset.l; if (l === 'en') setPref('lang', 'en'); else if (PREF.lang === 'en') setPref('lang', 'both'); applyLook(); render(); };
    });
  }
  function setBottom(html) { var b = $('#action'); b.hidden = !html; b.innerHTML = html || ''; }
  function setNav(on) {
    var n = $('#nav'); n.hidden = !on; if (!on) return;
    var cur = TAB_OF[S.view];
    n.innerHTML = TABS.map(function (t) { return '<button data-tab="' + t.id + '" class="' + (t.id === cur ? 'on' : '') + '"><i>' + t.ic + '</i>' + (PREF.lang === 'en' ? t.en : t.ur) + '</button>'; }).join('');
    [].forEach.call(n.querySelectorAll('[data-tab]'), function (b) {
      b.onclick = function () {
        var id = b.dataset.tab; S.back = [];
        if (id === 'contacts') { S.ct = { st: 'init', groups: [], sel: {}, act: 'merge' }; go('contacts'); return; }
    if (id === 'monitor') { S.mon = null; go('monitor'); return; }
    if (id === 'trash') { loadTrash().then(function () { S.view = 'trash'; render(); }); return; }
        S.view = id; render();
      };
    });
  }
  function moveBar() {
    var t = selTotals();
    if (!t.n) return setBottom('');
    setBottom('<button class="btn" id="movebtn">' + T('ٹریش میں بھیجیں (' + t.n + ' · ' + fmt(t.b) + ')', 'Move selected to trash (' + t.n + ' · ' + fmt(t.b) + ')') + '</button>');
    $('#movebtn').onclick = confirmMove;
  }
  function footer() { return '<div class="foot">' + tt('سب کچھ آپ کے فون میں ہوتا ہے، کچھ اپلوڈ نہیں ہوتا۔', 'Everything stays on your phone. Nothing is uploaded.') + '<br>Developed by <b>SMAA</b></div>'; }

  function render() {
    var fn = { gate: vGate, home: vHome, scanning: vScan, overview: vOverview, dups: vDups, review: vReview, list: vList, wa: vWa, trash: vTrash, settings: vSettings, done: vDone, contacts: vContacts, monitor: vMonitor }[S.view] || vHome;
    if (S.view !== 'monitor') clearMon();
    $('#body').scrollTop = 0;
    $('#body').onclick = null;
    setNav(S.view !== 'gate' && S.view !== 'scanning');
    setBottom('');
    fn();
  }

  function needScan() {
    $('#body').innerHTML = '<div class="card center"><div style="font-size:50px">🔍</div><h2 style="font-size:20px">' + T('پہلے اسکین کریں', 'Scan first') + '</h2><p class="mut">' + tt('فون اسکین کرنے کے بعد یہاں نتیجہ نظر آئے گا۔', 'The result will appear here after a scan.') + '</p><button class="btn" id="scanhere">' + T('فون اسکین کریں', 'Scan my phone') + '</button></div>' + footer();
    $('#scanhere').onclick = startScan;
  }

  /* ---------- screens ---------- */
  function vGate() {
    setTop(T('کلینووا', 'Cleanova')); setNav(false);
    $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">🔒</div><h2 style="font-size:22px">' + T('اجازت درکار ہے', 'Permission needed') + '</h2>' +
      '<p class="mut" style="margin-top:8px">' + tt('فائلیں ڈھونڈنے اور صاف کرنے کے لیے کلینووا کو فون کی فائلیں دیکھنے کی اجازت چاہیے۔ سب کچھ آپ کے فون میں ہی رہتا ہے، کچھ اپلوڈ نہیں ہوتا۔', 'Cleanova needs access to your files to find and clean them. Everything stays on your phone; nothing is uploaded.') + '</p>' +
      '<button class="btn" id="allow">' + T('اجازت دیں', 'Allow access') + '</button>' +
      '<p class="mut" style="margin-top:12px">' + tt('کھلنے والی سکرین میں Cleanova کو آن کریں، پھر واپس آ جائیں۔', 'Turn Cleanova on in the screen that opens, then come back.') + '</p></div>' + footer();
    $('#allow').onclick = function () { P.requestAccess().then(function (r) { if (r && r.granted) refreshStatus(); }).catch(function () { /* user will return */ }); };
  }

  function ring(pct) {
    var dash = Math.max(2, Math.min(100, pct)) * 0.97;
    return '<div class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" stroke-width="3.4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--acc)" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="' + dash + ' 100"/></svg><div>' + pct + '%<small>' + tt('استعمال', 'used') + '</small></div></div>';
  }
  function tile(id, ic, ur, en, sub, size) {
    var cap = PREF.lang === 'en' ? sub[1] : (PREF.lang === 'ur' ? sub[0] : en);
    return '<button class="tool" data-open="' + id + '"><div class="ic">' + ic + '</div>' + (size ? '<span class="sz">' + size + '</span>' : '') + '<b>' + (PREF.lang === 'en' ? en : ur) + '</b><small class="e" style="display:block">' + cap + '</small></button>';
  }
  function openTool(id) {
    if (id === 'contacts') { S.ct = { st: 'init', groups: [], sel: {}, act: 'merge' }; go('contacts'); return; }
    if (id === 'monitor') { S.mon = null; go('monitor'); return; }
    if (id === 'trash') { loadTrash().then(function () { S.back = []; go('trash'); }); return; }
    if (!S.scanned) { go(id === 'dups' ? 'dups' : (id === 'wa' ? 'wa' : 'list'), id === 'dups' || id === 'wa' ? undefined : id); return; }
    if (id === 'dups') go('dups'); else if (id === 'wa') go('wa'); else go('list', id);
  }

  function vHome() {
    setTop(T('کلینووا', 'Cleanova'));
    var used = S.total ? Math.round((S.total - S.free) / S.total * 100) : 0;
    var pot = S.scanned ? potential() : (S.last ? S.last.b : null);
    var hero = '<div class="hero">' + ring(used) + '<div><div class="k">' + (pot === null ? T('اسکین کر کے دیکھیں', 'Scan to see how much you can free') : T('آپ خالی کر سکتے ہیں', 'You can free up to')) + '</div>' + (pot === null ? '' : '<div class="big">' + fmt(pot) + '</div>') + '<div class="k" style="font-size:12.5px">' + tt(fmt(S.free) + ' خالی · کل ' + fmt(S.total), fmt(S.free) + ' free of ' + fmt(S.total)) + '</div></div></div>';
    var sz = function (b) { return S.scanned && b ? fmt(b) : ''; };
    var sub = {
      dups: ['ایک جیسی اور ملتی جلتی', 'Exact and similar'], large: ['سب سے بڑی پہلے', 'Biggest first'], wa: ['پرانا میڈیا', 'Old media'], shots: ['عمر کے لحاظ سے', 'By age'],
      blurry: ['خود دیکھ کر چنیں', 'Review each'], junk: ['خالی فولڈر، APK', 'Empty folders, APKs'], old: ['Download کی پرانی فائلیں', 'Old downloads folder'], trash: ['واپس لانے کے لیے', 'Undo and restore'], contacts: ['ایک جیسے نمبر والے', 'Same numbers or names']
    };
    $('#body').innerHTML = hero +
      '<button class="btn" id="scanbtn">' + T('فون اسکین کریں', 'Scan my phone') + '<small class="e">' + tt('ڈپلیکیٹ، کچرا اور بڑی فائلیں ڈھونڈیں', 'Finds duplicates, junk and big files') + '</small></button>' +
      '<div class="sec">' + tt('صفائی کے اوزار', 'CLEAN-UP TOOLS') + '</div><div class="grid">' +
      tile('dups', '🖼', 'ڈپلیکیٹ فائلیں', 'Duplicates', sub.dups, sz(dupBytes())) +
      tile('large', '📦', 'بڑی فائلیں', 'Large files', sub.large, sz(sumItems(S.x.large))) +
      tile('wa', '💬', 'واٹس ایپ', 'WhatsApp', sub.wa, sz(sumItems(waFiltered()))) +
      tile('shots', '📱', 'اسکرین شاٹس', 'Screenshots', sub.shots, sz(sumItems(S.x.shots))) +
      tile('blurry', '🌫', 'دھندلی تصاویر', 'Blurry photos', sub.blurry, sz(sumItems(S.x.blurry))) +
      tile('junk', '🧹', 'فالتو فائلیں', 'Junk files', sub.junk, sz(sumItems(S.x.junk))) +
      tile('old', '📥', 'پرانی ڈاؤن لوڈز', 'Old downloads', sub.old, sz(sumItems(S.x.old.filter(function (i) { return older(i, 30); })))) +
      tile('contacts', '👥', 'ڈپلیکیٹ کانٹیکٹس', 'Duplicate contacts', sub.contacts, '') +
      tile('monitor', '📈', 'فون مانیٹر', 'Phone monitor', ['بیٹری، RAM، استعمال', 'Battery, RAM, usage'], '') +
      tile('trash', '♻', 'ٹریش', 'Trash', sub.trash, '') + '</div>' + footer();
    $('#scanbtn').onclick = startScan;
    [].forEach.call(document.querySelectorAll('[data-open]'), function (b) { b.onclick = function () { openTool(b.dataset.open); }; });
  }

  function vOverview() {
    setTop(T('نتیجہ', 'Results'));
    if (!S.scanned) return needScan();
    var rows = [['dups', '🖼', 'ڈپلیکیٹ فائلیں', 'Duplicates', dupBytes(), S.groups.length], ['large', '📦', 'بڑی فائلیں', 'Large files', sumItems(S.x.large), S.x.large.length], ['wa', '💬', 'واٹس ایپ', 'WhatsApp (3 months+)', sumItems(waFiltered()), waFiltered().length],
      ['shots', '📱', 'اسکرین شاٹس', 'Screenshots', sumItems(S.x.shots), S.x.shots.length], ['blurry', '🌫', 'دھندلی تصاویر', 'Blurry and dark', sumItems(S.x.blurry), S.x.blurry.length],
      ['junk', '🧹', 'فالتو فائلیں', 'Junk files', sumItems(S.x.junk), S.x.junk.length], ['old', '📥', 'پرانی ڈاؤن لوڈز', 'Old downloads', sumItems(S.x.old), S.x.old.length]];
    var h = '<div class="hero" style="display:block"><div class="k">' + T('آسانی سے بچ سکتا ہے', 'Easy wins') + '</div><div class="big">' + fmt(potential()) + '</div><div class="k" style="font-size:12.5px">' + nfiles(S.scanned) + ' ' + tt('دیکھی گئیں', 'checked') + '</div></div><div class="card">';
    rows.forEach(function (r) { h += '<button class="cat" data-open="' + r[0] + '"><span>' + r[1] + ' <b>' + (PREF.lang === 'en' ? r[3] : r[2]) + '</b>' + (PREF.lang === 'both' ? '<small class="e">' + r[3] + '</small>' : '') + '</span><span class="pill' + (r[5] ? ' a' : '') + '">' + r[5] + ' · ' + fmt(r[4]) + '</span></button>'; });
    $('#body').innerHTML = h + '</div>' + footer();
    [].forEach.call(document.querySelectorAll('[data-open]'), function (b) { b.onclick = function () { openTool(b.dataset.open); }; });
  }

  var PH = { walk: ['فائلیں گن رہا ہوں…', 'Counting files'], hash: ['ایک جیسی فائلیں ملا رہا ہوں…', 'Matching identical files'], similar: ['ملتی جلتی تصاویر دیکھ رہا ہوں…', 'Comparing similar photos'], quality: ['دھندلی تصاویر جانچ رہا ہوں…', 'Checking photo quality'], move: ['ٹریش میں بھیج رہا ہوں…', 'Moving to trash'] };
  function vScan() {
    setTop(T('اسکین ہو رہا ہے', 'Scanning')); setBottom(''); setNav(false);
    var p = S.prog || { phase: 'walk', done: 0, total: 0 }, ph = PH[p.phase] || PH.walk;
    $('#body').innerHTML = '<div class="card center"><div class="spin"></div><h2 style="font-size:20px">' + T(ph[0], ph[1]) + '</h2>' +
      '<div class="big" style="text-align:center;font-size:32px">' + p.done + (p.total ? ' / ' + p.total : '') + '</div><div class="bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 5) + '%"></i></div>' +
      '<p class="mut" style="margin-top:12px">' + tt('اسکرین کھلی رکھیں۔ فائلیں زیادہ ہوں تو کچھ منٹ لگ سکتے ہیں۔', 'Keep the screen on. It can take a few minutes with many files.') + '</p></div>';
  }
  var scanTick = 0;
  function startScan() {
    S.view = 'scanning'; S.back = []; S.prog = { phase: 'walk', done: 0, total: 0 }; render();
    var h;
    try {
      var lr = P.addListener('progress', function (e) {
        S.prog = e; var now = Date.now();
        if (S.view === 'scanning' && now - scanTick > 250) { scanTick = now; vScan(); }
      });
      if (lr && lr.then) lr.then(function (x) { h = x; }); else h = lr;
    } catch (e) { /* progress is optional */ }
    P.scan({ similar: PREF.similar, quality: PREF.quality, skip: PREF.protect }).then(function (r) {
      try { if (h && h.remove) h.remove(); } catch (e) { /* ignore */ }
      prepare(r.groups || [], r.extras); S.scanned = r.files || 1; savePotential(); S.view = 'overview'; S.back = []; render();
    }).catch(function (e) {
      try { if (h && h.remove) h.remove(); } catch (e2) { /* ignore */ }
      S.view = 'home'; render(); toast('اسکین نہیں ہو سکا', 'Scan failed: ' + (e && e.message || e));
    });
  }

  /* duplicates overview (categories) */
  function vDups() {
    setTop(T('ڈپلیکیٹ فائلیں', 'Duplicates'));
    if (!S.scanned) return needScan();
    var any = S.groups.length > 0, possible = dupBytes();
    if (!any) { $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✨</div><h2 style="font-size:22px">' + T('کوئی ڈپلیکیٹ نہیں ملا', 'No duplicates found') + '</h2></div>' + footer(); return; }
    var h = '<div class="hero" style="display:block"><div class="k">' + T('آپ بچا سکتے ہیں', 'You can save up to') + '</div><div class="big">' + fmt(possible) + '</div><div class="k">' + S.groups.length + ' ' + tt('گروپ', 'groups') + '</div></div><div class="card">';
    CATS.forEach(function (c) {
      var s = catStats(c.id); if (!s.groups) return;
      h += '<button class="cat" data-cat="' + c.id + '"><span>' + c.ic + ' <b>' + (PREF.lang === 'en' ? c.en : c.ur) + '</b>' + (PREF.lang === 'both' ? '<small class="e">' + c.en + '</small>' : '') + '</span><span class="pill a">' + s.groups + ' · ' + fmt(s.bytes) + (s.sel ? ' · ✓' + s.sel : '') + '</span></button>';
    });
    h += '</div><p class="mut" style="margin-top:12px">' + tt('ہو بہو ایک جیسی فائلیں پہلے سے چنی ہوئی ہیں اور ہر گروپ میں ایک اصل فائل رہے گی۔ ملتی جلتی تصاویر آپ خود دیکھ کر چنیں۔', 'Exact copies are pre-selected and one original always stays in each group. Choose similar photos yourself.') + '</p>';
    $('#body').innerHTML = h + footer();
    [].forEach.call(document.querySelectorAll('[data-cat]'), function (b) { b.onclick = function () { go('review', b.dataset.cat); }; });
    moveBar();
  }

  function vReview() {
    var cat = CATS.filter(function (c) { return c.id === S.review; })[0];
    setTop(catLabel(cat));
    var gs = S.groups.filter(function (g) { return g.cat === cat.id; });
    var isSim = cat.id === 'simg';
    var h = '<div class="tabs"><button id="selall">' + T(isSim ? 'تجویز کردہ چنیں' : 'سب تجویز کردہ چنیں', 'Select suggested') + '</button><button id="selnone">' + T('کچھ نہ چنیں', 'Select none') + '</button></div>' +
      '<p class="mut" style="margin-top:8px">' + tt('تصویر پر ٹچ کر کے رکھیں/ہٹائیں بدلیں۔ سبز = رکھیں، سرخ = ٹریش میں جائے گی۔', 'Tap a photo to switch keep/remove. Green = keep, red = goes to trash.') + '</p>';
    gs.forEach(function (g) {
      var sv = 0; g.items.forEach(function (it) { if (S.sel[it.path]) sv += it.size; });
      h += '<div class="grp" data-g="' + g.id + '"><div class="hd"><span>' + nfiles(g.items.length) + ' · ' + (g.type === 'similar' ? tt('ملتی جلتی', 'similar') : tt('ایک جیسی', 'identical')) + '</span><span class="pill">' + (sv ? '−' + fmt(sv) : fmt(g.size)) + '</span></div><div class="thumbs">';
      g.items.forEach(function (it) {
        var del = !!S.sel[it.path], k = kind(it.path);
        h += '<button class="th ' + (del ? 'del' : 'keep') + '" data-p="' + esc(it.path) + '"><div class="im" ' + (k === 'img' || k === 'vid' ? 'data-p="' + esc(it.path) + '"' : '') + '>' + (k === 'img' || k === 'vid' ? '' : esc(ext(it.path) || 'file')) + '</div><div class="nm">' + esc(base(it.path)) + '</div><div class="nm">' + esc(folder(it.path)) + ' · ' + fmt(it.size) + '</div><div class="st">' + (del ? tt('ہٹائیں', 'Remove') : (it.path === g.keeper ? tt('رکھیں ★', 'Keep ★') : tt('رکھیں', 'Keep'))) + '</div></button>';
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
    moveBar();
  }

  /* generic list: large files, screenshots, blurry, junk, old downloads, WhatsApp types */
  function chipsHtml(def) {
    var h = '';
    def.chips.forEach(function (c) {
      h += '<div class="chips">';
      c.opts.forEach(function (o) { h += '<button class="chip' + (S.f[c.key] === o[0] ? ' on' : '') + '" data-f="' + c.key + '" data-v="' + o[0] + '">' + (PREF.lang === 'en' ? o[2] : o[1]) + '</button>'; });
      h += '</div>';
    });
    return h;
  }
  function vList() {
    var def = listDef(S.list);
    setTop(T(def.ur, def.en));
    if (!S.scanned) return needScan();
    var items = def.items, total = sumItems(items), shown = items.slice(0, S.limit);
    var h = '<p class="mut" style="margin-top:6px">' + tt(def.hint[0], def.hint[1]) + '</p>' + chipsHtml(def) +
      '<div class="card" style="margin-top:12px;padding:10px 14px"><span class="mut">' + nfiles(items.length) + ' · </span><b style="font-family:system-ui;color:var(--acc)">' + fmt(total) + '</b></div>';
    if (!items.length) h += '<div class="card center"><div style="font-size:46px">✨</div><h2 style="font-size:19px">' + T('کچھ نہیں ملا', 'Nothing found') + '</h2></div>';
    else {
      h += '<div class="tabs"><button id="selall">' + T('سب چنیں', 'Select all') + '</button><button id="selnone">' + T('کچھ نہ چنیں', 'Select none') + '</button></div><div class="lg">';
      shown.forEach(function (it) {
        var on = !!S.sel[it.path], k = it.dir ? 'dir' : kind(it.path), media = k === 'img' || k === 'vid';
        h += '<button class="th' + (on ? ' del' : '') + '" data-p="' + esc(it.path) + '"><div class="im" ' + (media ? 'data-p="' + esc(it.path) + '"' : '') + '>' + (media ? '' : (it.dir ? '📁' : esc(ext(it.path) || 'file'))) + '</div>' +
          (it.reason ? '<span class="tag">' + (it.reason === 'dark' ? tt('تاریک', 'dark') : tt('دھندلی', 'blur')) + '</span>' : '') +
          '<div class="nm">' + esc(base(it.path)) + '</div><div class="nm">' + esc(it.dir ? folder(it.path) : fmt(it.size) + ' · ' + new Date(it.mtime).toISOString().slice(0, 10)) + '</div><div class="st">' + (on ? tt('ہٹائیں', 'Remove') : '&nbsp;') + '</div></button>';
      });
      h += '</div>';
      if (items.length > shown.length) h += '<button class="btn o" id="more">' + T('مزید دکھائیں', 'Show more') + '</button>';
    }
    $('#body').innerHTML = h;
    watchThumbs($('#body'));
    [].forEach.call(document.querySelectorAll('[data-f]'), function (b) {
      b.onclick = function () { var v = b.dataset.v; S.f[b.dataset.f] = isNaN(+v) || v === '' ? v : +v; S.limit = 150; vList(); };
    });
    if (items.length) {
      $('#selall').onclick = function () { items.forEach(function (it) { S.sel[it.path] = it.size; }); var y = $('#body').scrollTop; vList(); $('#body').scrollTop = y; };
      $('#selnone').onclick = function () { items.forEach(function (it) { delete S.sel[it.path]; }); var y = $('#body').scrollTop; vList(); $('#body').scrollTop = y; };
      $('#body').onclick = function (e) {
        var th = e.target.closest('.th'); if (!th) return;
        var p = th.dataset.p, it = items.filter(function (x) { return x.path === p; })[0];
        if (S.sel[p] !== undefined) delete S.sel[p]; else S.sel[p] = it.size;
        var y = $('#body').scrollTop; vList(); $('#body').scrollTop = y;
      };
    }
    if ($('#more')) $('#more').onclick = function () { S.limit += 150; var y = $('#body').scrollTop; vList(); $('#body').scrollTop = y; };
    moveBar();
  }

  function vWa() {
    setTop(T('واٹس ایپ صفائی', 'WhatsApp cleaner'));
    if (!S.scanned) return needScan();
    var f = waFiltered();
    var h = '<p class="mut" style="margin-top:6px">' + tt('واٹس ایپ کا پرانا میڈیا۔ چیٹ کا متن نہیں چھیڑا جاتا۔', 'Old WhatsApp media. Your chat text is not touched.') + '</p>' + chipsHtml({ chips: [AGE_OPTS('waAge'), { key: 'waDir', opts: [['all', 'سب', 'All'], ['recv', 'موصول شدہ', 'Received'], ['sent', 'بھیجی ہوئی', 'Sent']] }] }) + '<div class="card">';
    WA_TYPES.forEach(function (t) {
      var l = f.filter(function (i) { return waType(i) === t.id; });
      h += '<button class="cat" data-wt="' + t.id + '"><span>' + t.ic + ' <b>' + (PREF.lang === 'en' ? t.en : t.ur) + '</b>' + (PREF.lang === 'both' ? '<small class="e">' + t.en + '</small>' : '') + '<small class="e" style="display:block">' + nfiles(l.length) + '</small></span><span class="pill a">' + fmt(sumItems(l)) + '</span></button>';
    });
    $('#body').innerHTML = h + '</div>' + footer();
    [].forEach.call(document.querySelectorAll('[data-f]'), function (b) { b.onclick = function () { var v = b.dataset.v; S.f[b.dataset.f] = isNaN(+v) ? v : +v; vWa(); }; });
    [].forEach.call(document.querySelectorAll('[data-wt]'), function (b) { b.onclick = function () { go('list', 'wa:' + b.dataset.wt); }; });
    moveBar();
  }

  /* ---------- move to trash ---------- */
  function confirmMove() {
    var t = selTotals(); if (!t.n) return;
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<h2 style="font-size:22px">' + T('تصدیق', 'Confirm') + '</h2><p style="margin-top:6px">' + tt(t.n + ' آئٹم ٹریش میں جائیں گے۔', t.n + ' items will go to trash.') + '</p><div class="big" style="font-size:32px">' + fmt(t.b) + '</div>' +
      '<p class="mut">' + tt('فائلیں فوراً ختم نہیں ہوتیں۔ ' + PREF.trashDays + ' دن تک ٹریش میں رہتی ہیں اور آپ واپس لا سکتے ہیں۔ ڈپلیکیٹ گروپ میں ایک اصل فائل رہے گی۔', 'Nothing is deleted right away. Files stay in the trash for ' + PREF.trashDays + ' days and you can restore them. One original always stays in each duplicate group.') + '</p>' +
      '<button class="btn" id="okmove">' + T('ٹریش میں بھیجیں', 'Move to trash') + '</button><button class="btn o" id="nomove">' + T('واپس جائیں', 'Cancel') + '</button>';
    $('#nomove').onclick = function () { m.hidden = true; };
    $('#okmove').onclick = function () { m.hidden = true; doMove(); };
  }
  function doMove() {
    var all = Object.keys(S.sel), dirs = all.filter(function (p) { return S.dirSet[p]; }), paths = all.filter(function (p) { return !S.dirSet[p]; }), done = 0, bytes = 0, i = 0, total = all.length;
    S.view = 'scanning'; S.prog = { phase: 'move', done: 0, total: total }; render();
    (function next() {
      if (i >= paths.length) {
        if (!dirs.length) return finishMove(done, bytes);
        return P.deleteEmptyDirs({ paths: dirs }).then(function (r) { done += (r && r.deleted) || 0; finishMove(done, bytes); }).catch(function () { finishMove(done, bytes); });
      }
      var chunk = paths.slice(i, i + 40); i += 40;
      P.trashMove({ paths: chunk }).then(function (r) { done += r.moved || 0; bytes += r.bytes || 0; S.prog = { phase: 'move', done: Math.min(i, total), total: total }; vScan(); next(); })
        .catch(function () { next(); });
    })();
  }
  function finishMove(done, bytes) {
    var gone = {}; Object.keys(S.sel).forEach(function (p) { gone[p] = 1; });
    function keep(it) { return !gone[it.path]; }
    S.groups.forEach(function (g) { g.items = g.items.filter(keep); });
    S.groups = S.groups.filter(function (g) { return g.items.length > 1; });
    S.groups.forEach(function (g) { if (!g.items.some(function (it) { return it.path === g.keeper; })) g.keeper = best(g.items, true).path; });
    ['large', 'wa', 'shots', 'junk', 'old', 'blurry'].forEach(function (k) { S.x[k] = S.x[k].filter(keep); });
    S.sel = {}; S.lastMoved = { n: done, b: bytes }; S.back = [];
    store('freed', (store('freed') || 0) + bytes);
    savePotential(); S.view = 'done'; render(); refreshStatus(true);
  }
  function vDone() {
    setTop(T('مکمل', 'Done')); setBottom('');
    var m = S.lastMoved || { n: 0, b: 0 };
    $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✅</div><h2 style="font-size:21px">' + T(m.n + ' آئٹم ٹریش میں بھیج دیے گئے', m.n + ' items moved to trash') + '</h2><div class="big" style="text-align:center">' + fmt(m.b) + '</div>' +
      '<p class="mut" style="margin-top:8px">' + tt('جگہ تب خالی ہو گی جب آپ ٹریش خالی کریں گے۔ ' + PREF.trashDays + ' دن بعد ٹریش خود خالی ہو جاتا ہے۔', 'Space is freed when the trash is emptied. It also empties itself after ' + PREF.trashDays + ' days.') + '</p>' +
      '<div class="row" style="margin-top:8px"><div class="t"><span class="mut">' + tt('اب تک کل صفائی', 'Total cleaned so far') + '</span></div><b style="font-family:system-ui;color:var(--acc)">' + fmt(store('freed') || 0) + '</b></div>' +
      '<button class="btn" id="emptynow">' + T('ٹریش ابھی خالی کریں', 'Empty trash now') + '</button><button class="btn o" id="later">' + T('بعد میں', 'Later') + '</button></div>' + footer();
    $('#emptynow').onclick = function () { P.trashEmpty({}).then(function (r) { toast('جگہ خالی ہو گئی: ' + fmt(r.freed || 0), 'Freed ' + fmt(r.freed || 0)); S.view = 'home'; refreshStatus(); }).catch(function () { toast('خالی نہیں ہو سکا', 'Could not empty'); }); };
    $('#later').onclick = function () { S.view = 'overview'; S.back = []; refreshStatus(); };
  }

  /* ---------- trash ---------- */
  function loadTrash() {
    return P.trashList().then(function (r) { S.trash = { items: r.items || [], bytes: r.bytes || 0 }; S.trashSel = {}; }).catch(function () { S.trash = { items: [], bytes: 0 }; });
  }
  function vTrash() {
    setTop(T('ٹریش', 'Trash'));
    var tr = S.trash, now = Date.now();
    if (!tr.items.length) { $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">🗑</div><h2 style="font-size:20px">' + T('ٹریش خالی ہے', 'Trash is empty') + '</h2></div>' + footer(); return; }
    var h = '<div class="hero" style="display:block"><div class="k">' + T('ٹریش میں', 'In trash') + '</div><div class="big">' + fmt(tr.bytes) + '</div><div class="k">' + nfiles(tr.items.length) + '</div></div>' +
      '<div class="tabs"><button id="tall">' + T('سب چنیں', 'Select all') + '</button><button id="tnone">' + T('کچھ نہ چنیں', 'None') + '</button></div><div class="card" id="tlist">';
    tr.items.forEach(function (it) {
      var left = Math.max(0, PREF.trashDays - Math.floor((now - it.ts) / 86400000));
      h += '<button class="cat" data-t="' + esc(it.id) + '"><span class="sw" aria-pressed="' + !!S.trashSel[it.id] + '"></span><span class="t" style="flex:1;min-width:0;text-align:start"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-family:system-ui;font-size:14px;text-align:start">' + esc(base(it.original)) + '</b><small class="e" style="display:block">' + esc(folder(it.original)) + ' · ' + left + ' ' + tt('دن باقی', 'days left') + '</small></span><span class="pill">' + fmt(it.size) + '</span></button>';
    });
    h += '</div>';
    $('#body').innerHTML = h;
    var n = Object.keys(S.trashSel).length;
    setBottom('<div style="display:flex;gap:10px"><button class="btn" id="restore" style="flex:1"' + (n ? '' : ' disabled') + '>' + T('واپس لائیں', 'Restore') + '</button><button class="btn red" id="purge" style="flex:1"' + (n ? '' : ' disabled') + '>' + T('ہمیشہ کے لیے ہٹائیں', 'Delete forever') + '</button></div><button class="btn o" id="purgeall" style="margin-top:8px;min-height:44px">' + T('پوری ٹریش خالی کریں', 'Empty all trash') + '</button>');
    $('#tall').onclick = function () { tr.items.forEach(function (it) { S.trashSel[it.id] = 1; }); vTrash(); };
    $('#tnone').onclick = function () { S.trashSel = {}; vTrash(); };
    $('#tlist').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; var id = b.dataset.t; if (S.trashSel[id]) delete S.trashSel[id]; else S.trashSel[id] = 1; var y = $('#body').scrollTop; vTrash(); $('#body').scrollTop = y; };
    $('#restore').onclick = function () {
      var ids = Object.keys(S.trashSel), back = 0; tr.items.forEach(function (it) { if (S.trashSel[it.id]) back += it.size; });
      P.trashRestore({ ids: ids }).then(function (r) { store('freed', Math.max(0, (store('freed') || 0) - back)); toast('واپس آ گئیں: ' + (r.restored || 0), 'Restored ' + (r.restored || 0)); loadTrash().then(vTrash); });
    };
    $('#purge').onclick = function () { askForever(Object.keys(S.trashSel)); };
    $('#purgeall').onclick = function () { askForever(null); };
  }
  function askForever(ids) {
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<h2 style="font-size:22px">' + T('کیا ہمیشہ کے لیے ہٹائیں؟', 'Delete forever?') + '</h2><p class="mut" style="margin-top:6px">' + tt('یہ فائلیں دوبارہ واپس نہیں آئیں گی۔', 'These files cannot be brought back.') + '</p><button class="btn red" id="yesforever">' + T('ہاں، ہٹا دیں', 'Yes, delete') + '</button><button class="btn o" id="noforever">' + T('منسوخ', 'Cancel') + '</button>';
    $('#noforever').onclick = function () { m.hidden = true; };
    $('#yesforever').onclick = function () { m.hidden = true; P.trashEmpty(ids ? { ids: ids } : {}).then(function (r) { toast('جگہ خالی ہو گئی: ' + fmt(r.freed || 0), 'Freed ' + fmt(r.freed || 0)); loadTrash().then(vTrash); refreshStatus(true); }); };
  }

  /* ---------- settings ---------- */
  function chipRow(key, opts) {
    return '<div class="chips">' + opts.map(function (o) { return '<button class="chip' + (PREF[key] === o[0] ? ' on' : '') + '" data-pref="' + key + '" data-v="' + o[0] + '">' + (PREF.lang === 'en' ? o[2] : o[1]) + '</button>'; }).join('') + '</div>';
  }
  function swRow(key, ur, en, sub) {
    return '<div class="row"><div class="t"><b>' + (PREF.lang === 'en' ? en : ur) + '</b><small class="e" style="display:block">' + (PREF.lang === 'en' ? sub[1] : sub[0]) + '</small></div><button class="sw" data-sw="' + key + '" aria-pressed="' + !!PREF[key] + '" aria-label="' + en + '"></button></div>';
  }
  function vSettings() {
    setTop(T('ترتیبات', 'Settings'));
    var h = '<div class="card"><div class="row"><div class="t"><b>' + tt('زبان', 'Language') + '</b></div></div>' + chipRow('lang', [['en', 'English', 'English'], ['ur', 'اردو', 'اردو'], ['both', 'اردو + English', 'اردو + English']]) +
      '<div class="row" style="margin-top:6px"><div class="t"><b>' + tt('تھیم', 'Theme') + '</b></div></div>' + chipRow('theme', [['dark', 'ڈارک', 'Dark'], ['light', 'لائٹ', 'Light']]) + '</div>' +
      '<div class="card">' + swRow('similar', 'ملتی جلتی تصاویر', 'Find similar photos', ['اسکین سست مگر زیادہ نتائج', 'Slower scan, more results']) + swRow('quality', 'دھندلی تصاویر جانچیں', 'Check blurry photos', ['اسکین میں کچھ زیادہ وقت لگے گا', 'Adds some time to the scan']) + '</div>' +
      '<div class="card"><div class="row"><div class="t"><b>' + tt('ڈپلیکیٹ میں کون سی کاپی رکھیں', 'Which copy to keep') + '</b></div></div>' + chipRow('keep', [['camera', 'کیمرہ اصل', 'Camera original'], ['oldest', 'سب سے پرانی', 'Oldest'], ['newest', 'سب سے نئی', 'Newest'], ['largest', 'سب سے بڑی', 'Largest']]) + '</div>' +
      '<div class="card"><button class="cat" id="protbtn" style="padding:6px 0"><span class="t"><b>' + tt('محفوظ فولڈرز', 'Protected folders') + '</b><small class="e" style="display:block">' + tt('کبھی اسکین نہیں ہوں گے · ' + PREF.protect.length, 'Never scanned · ' + PREF.protect.length) + '</small></span><span class="pill a">' + tt('بدلیں', 'Edit') + '</span></button></div>' +
      '<div class="card">' + swRow('remind', 'ماہانہ یاد دہانی', 'Monthly reminder', ['ہر مہینے صفائی کی یاد دہانی', 'A nudge to clean once a month']) + '<div class="row"><div class="t"><b>' + tt('ٹریش خود خالی ہو', 'Trash auto-empty') + '</b></div></div>' + chipRow('trashDays', [[7, '7 دن', '7 days'], [30, '30 دن', '30 days'], [60, '60 دن', '60 days'], [90, '90 دن', '90 days']]) + '</div>' +
      '<div class="card center"><div class="logo" style="margin:0 auto 8px;width:56px;height:56px;border-radius:17px;font-size:26px">✦</div><b style="font-size:19px;font-family:system-ui">Cleanova</b><div class="mut" style="font-family:system-ui;font-size:12.5px;line-height:1.8;margin-top:4px">Version 2.0 · ' + tt('مفت · اشتہارات نہیں', 'Free · No ads') + '<br>' + tt('سارا اسکین آپ کے فون میں ہی ہوتا ہے', 'All scanning stays on your phone') + '<br><span style="color:var(--acc);font-weight:700">Developed by SMAA</span></div></div>' +
      '<div class="card"><div class="mut">' + tt('اب تک کل صفائی', 'Total cleaned so far') + '</div><div class="big">' + fmt(store('freed') || 0) + '</div></div>';
    $('#body').innerHTML = h;
    [].forEach.call(document.querySelectorAll('[data-pref]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.pref, v = b.dataset.v; v = isNaN(+v) ? v : +v;
        setPref(k, v); if (k === 'lang' || k === 'theme') applyLook(); if (k === 'trashDays') P.trashPurge({ days: v }).catch(function () { /* ignore */ });
        var y = $('#body').scrollTop; render(); $('#body').scrollTop = y;
      };
    });
    [].forEach.call(document.querySelectorAll('[data-sw]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.sw, v = !PREF[k];
        if (k === 'remind') return setReminder(v).then(function () { vSettings(); });
        setPref(k, v); vSettings();
      };
    });
    $('#protbtn').onclick = protectSheet;
  }
  function protectSheet() {
    P.dirs().then(function (r) {
      var m = $('#modal'); m.hidden = false;
      var h = '<h2 style="font-size:21px">' + T('محفوظ فولڈرز', 'Protected folders') + '</h2><p class="mut">' + tt('چنے ہوئے فولڈرز کبھی اسکین یا صاف نہیں ہوں گے۔', 'Selected folders are never scanned or cleaned.') + '</p><div class="card" id="plist">';
      (r.dirs || []).forEach(function (d) { h += '<button class="cat" data-d="' + esc(d.path) + '"><span class="sw" aria-pressed="' + (PREF.protect.indexOf(d.path) >= 0) + '"></span><span class="t" style="flex:1;font-family:system-ui;text-align:start">' + esc(d.name) + '</span></button>'; });
      $('#sheet').innerHTML = h + '</div><button class="btn" id="pdone">' + T('ٹھیک ہے', 'Done') + '</button>';
      $('#plist').onclick = function (e) {
        var b = e.target.closest('[data-d]'); if (!b) return; var p = b.dataset.d, i = PREF.protect.indexOf(p);
        if (i >= 0) PREF.protect.splice(i, 1); else PREF.protect.push(p);
        store('protect', PREF.protect); b.querySelector('.sw').setAttribute('aria-pressed', String(PREF.protect.indexOf(p) >= 0));
      };
      $('#pdone').onclick = function () { m.hidden = true; vSettings(); };
    }).catch(function () { toast('فولڈر نہیں مل سکے', 'Could not list folders'); });
  }
  function setReminder(on) {
    if (!LN) { setPref('remind', on); toast(on ? 'یاد دہانی آن (صرف ایپ میں)' : 'یاد دہانی بند', on ? 'Reminder on (app only)' : 'Reminder off'); return Promise.resolve(); }
    if (!on) { setPref('remind', false); return LN.cancel({ notifications: [{ id: 7001 }] }).catch(function () { /* ignore */ }); }
    return LN.requestPermissions().then(function (r) {
      if (!r || r.display !== 'granted') { toast('نوٹیفکیشن کی اجازت نہیں ملی', 'Notification permission denied'); return; }
      return LN.schedule({ notifications: [{ id: 7001, title: 'Cleanova', body: 'مہینے کی صفائی کا وقت ہے · Time for a monthly clean-up', schedule: { on: { day: 1, hour: 10, minute: 0 }, allowWhileIdle: true } }] }).then(function () { setPref('remind', true); toast('ہر مہینے کی 1 تاریخ کو یاد دلاؤں گا', 'I will remind you on the 1st of each month'); });
    }).catch(function () { toast('چالو نہیں ہو سکا', 'Could not turn on'); });
  }

  /* ---------- duplicate contacts (merge by default, always backed up first) ---------- */
  /* ---------- phone monitor ---------- */
  var MP = (Cap && Cap.Plugins && Cap.Plugins.Monitor && !window.CLEANOVA_MOCK) ? Cap.Plugins.Monitor : window.MonitorMock;
  var monTimer = 0;
  function clearMon() { if (monTimer) { clearInterval(monTimer); monTimer = 0; } }
  function dur(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60); m = m % 60;
    if (!h && !m) return PREF.lang === 'en' ? '<1 min' : '1 منٹ سے کم';
    return PREF.lang === 'en' ? (h ? h + 'h ' : '') + m + 'm' : (h ? h + ' گھنٹے ' : '') + (m ? m + ' منٹ' : '');
  }
  function monBars(vals, fmtv, color) {
    var mx = Math.max.apply(null, vals.concat([1])), nm = PREF.lang === 'en' ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['اتو', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'], d = new Date(), h = '<div class="mcols">';
    vals.forEach(function (v, i) {
      var dd = new Date(d.getTime() - (vals.length - 1 - i) * 86400000);
      h += '<div class="mc"><span class="mv">' + (v ? fmtv(v) : '') + '</span><i style="height:' + Math.max(3, Math.round(v / mx * 70)) + 'px;background:' + (color || 'var(--acc)') + (i === vals.length - 1 ? '' : ';opacity:.55') + '"></i><span class="ml">' + nm[dd.getDay()] + '</span></div>';
    });
    return h + '</div>';
  }
  function spark(samples) {
    if (samples.length < 2) return '<div class="mut" style="font-size:12px;margin-top:8px">' + tt('ہسٹری بننے میں کچھ وقت لگے گا، ایپ کھولتے رہیں۔', 'History builds up as you open the app.') + '</div>';
    var t0 = samples[0].t, t1 = samples[samples.length - 1].t, W = 300, H = 60, span = Math.max(1, t1 - t0);
    var pts = samples.map(function (s) { return ((s.t - t0) / span * W).toFixed(1) + ',' + (H - s.l / 100 * H).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:64px;margin-top:8px;direction:ltr"><polyline points="' + pts + '" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linejoin="round"/></svg><div class="mut" style="font-size:11px;display:flex;justify-content:space-between;direction:ltr"><span>' + Math.max(1, Math.round(span / 3600000)) + 'h</span><span>' + tt('اب', 'now') + '</span></div>';
  }
  function recordBat(level) {
    try {
      var a = JSON.parse(localStorage.getItem('cl.bat') || '[]'), now = Date.now();
      if (!a.length || now - a[a.length - 1].t > 5 * 60000) { a.push({ t: now, l: level }); a = a.filter(function (x) { return now - x.t < 86400000; }); localStorage.setItem('cl.bat', JSON.stringify(a)); }
      return a;
    } catch (e) { return []; }
  }
  function loadMon(full) {
    var M = S.mon = S.mon || {};
    MP.snapshot().then(function (s) { M.snap = s; if (S.view === 'monitor') vMonitor(true); }).catch(function () { M.err = true; if (S.view === 'monitor') vMonitor(true); });
    if (!full) return;
    MP.usageStatus().then(function (r) {
      M.ug = !!(r && r.granted);
      if (S.view === 'monitor') vMonitor(true);
      if (!M.ug) return;
      MP.usage().then(function (u) { M.usage = u; if (S.view === 'monitor') vMonitor(true); }).catch(function () { M.usageErr = true; });
      MP.dataUsage().then(function (u) { M.data = u; if (S.view === 'monitor') vMonitor(true); }).catch(function () { M.dataErr = true; });
    }).catch(function () { M.ug = false; });
  }
  function appRows(list, key, max, bytes) {
    return list.filter(function (a) { return a[key] > 0; }).sort(function (a, b) { return b[key] - a[key]; }).slice(0, 8).map(function (a) {
      var val = bytes ? fmt(a.v) : dur(a.v);
      return '<div class="arow">' + (a.icon ? '<img src="' + a.icon + '" alt="">' : '<span class="noic">📦</span>') + '<div style="flex:1;min-width:0"><b class="an">' + (a.label || a.pkg) + '</b><div class="mbar"><i style="width:' + Math.max(3, Math.round(a[key] / max * 100)) + '%"></i></div></div><span class="av">' + val + '</span></div>';
    }).join('');
  }
  function vMonitor(soft) {
    setTop(T('فون مانیٹر', 'Phone monitor'));
    var M = S.mon = S.mon || {};
    if (!soft) { clearMon(); loadMon(true); monTimer = setInterval(function () { if (S.view !== 'monitor') return clearMon(); loadMon(false); }, 5000); }
    if (!soft || !$('#monroot')) { $('#body').innerHTML = '<div id="monroot"></div>'; }
    var s = M.snap, h = '';
    if (!s) { $('#monroot').innerHTML = '<div class="card center"><div class="spin"></div></div>'; return; }
    var b = s.battery || {}, lvl = b.level || 0, hist = recordBat(lvl);
    var plug = { ac: tt('چارجر', 'AC charger'), usb: 'USB', wireless: tt('وائرلیس', 'Wireless'), none: '' }[b.plug] || '';
    var healthN = { 2: ['اچھی', 'Good'], 3: ['زیادہ گرم', 'Overheated'], 4: ['خراب', 'Dead'], 5: ['زیادہ وولٹیج', 'Over voltage'], 6: ['خرابی', 'Failure'], 7: ['بہت ٹھنڈی', 'Cold'] }[b.health] || ['نامعلوم', 'Unknown'];
    var mA = b.currentUa ? Math.round(Math.abs(b.currentUa) / (Math.abs(b.currentUa) > 20000 ? 1000 : 1)) : 0, cap = b.chargeUah ? Math.round(b.chargeUah / 1000) : 0, left = '';
    if (b.charging && b.chargeMs) left = dur(b.chargeMs) + ' ' + tt('میں مکمل چارج', 'to full');
    else if (!b.charging && cap && mA > 20) left = '≈ ' + dur(cap / mA * 3600000) + ' ' + tt('باقی', 'left');
    var hot = b.temp >= 40, col = lvl <= 15 && !b.charging ? 'var(--red)' : 'var(--acc)';
    h += '<div class="hero" style="margin-top:6px"><div class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" stroke-width="3.4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="' + col + '" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="' + (Math.max(2, lvl) * 0.97).toFixed(1) + ' 100"/></svg><div>' + lvl + '%</div></div><div style="flex:1"><div class="k">' + (b.full ? T('بیٹری مکمل', 'Fully charged') : b.charging ? T('چارج ہو رہی ہے ⚡', 'Charging ⚡') : T('بیٹری', 'Battery')) + '</div><div style="margin-top:4px;font-size:15px">' + (left || '') + '</div><div class="mut" style="font-size:12.5px">' + plug + (b.saver ? ' · ' + tt('بیٹری سیور آن', 'Battery saver on') : '') + '</div></div></div>';
    h += '<div class="card"><div class="kv"><span>' + tt('درجہ حرارت', 'Temperature') + '</span><b style="color:' + (hot ? 'var(--red)' : 'inherit') + '">' + (b.temp != null ? b.temp.toFixed(1) + ' °C' : '–') + (hot ? ' ⚠' : '') + '</b></div>' +
      '<div class="kv"><span>' + tt('بیٹری کی صحت', 'Health') + '</span><b>' + tt(healthN[0], healthN[1]) + '</b></div>' +
      '<div class="kv"><span>' + tt('وولٹیج', 'Voltage') + '</span><b>' + (b.voltage ? (b.voltage / 1000).toFixed(2) + ' V' : '–') + '</b></div>' +
      (mA ? '<div class="kv"><span>' + tt(b.charging ? 'چارجنگ کرنٹ' : 'استعمال کا کرنٹ', b.charging ? 'Charging current' : 'Draw') + '</span><b>' + mA + ' mA</b></div>' : '') +
      (cap ? '<div class="kv"><span>' + tt('موجودہ چارج', 'Charge now') + '</span><b>' + cap + ' mAh</b></div>' : '') +
      (b.tech ? '<div class="kv"><span>' + tt('ٹیکنالوجی', 'Technology') + '</span><b>' + b.tech + '</b></div>' : '') +
      '<div class="sec" style="margin:12px 0 0">' + tt('پچھلے 24 گھنٹے', 'LAST 24 HOURS') + '</div>' + spark(hist) + '</div>';
    var ru = s.ram.total - s.ram.avail, rp = Math.round(ru / s.ram.total * 100), su = s.storage.total - s.storage.free, sp = s.storage.total ? Math.round(su / s.storage.total * 100) : 0;
    h += '<div class="sec">' + tt('میموری اور اسٹوریج', 'MEMORY AND STORAGE') + '</div><div class="card"><div class="kv"><span>RAM</span><b>' + fmt(ru) + ' / ' + fmt(s.ram.total) + ' (' + rp + '%)</b></div><div class="mbar"><i style="width:' + rp + '%' + (rp > 85 ? ';background:var(--red)' : '') + '"></i></div>' +
      '<div class="kv" style="margin-top:12px"><span>' + tt('اسٹوریج', 'Storage') + '</span><b>' + fmt(su) + ' / ' + fmt(s.storage.total) + ' (' + sp + '%)</b></div><div class="mbar"><i style="width:' + sp + '%' + (sp > 90 ? ';background:var(--red)' : '') + '"></i></div></div>';
    var d = s.device, up = dur(d.uptime);
    h += '<div class="sec">' + tt('فون کی معلومات', 'DEVICE') + '</div><div class="card"><div class="kv"><span>' + tt('ماڈل', 'Model') + '</span><b>' + (d.brand ? d.brand.charAt(0).toUpperCase() + d.brand.slice(1) + ' ' : '') + d.model + '</b></div><div class="kv"><span>Android</span><b>' + d.android + ' (API ' + d.sdk + ')</b></div><div class="kv"><span>' + tt('پروسیسر کور', 'CPU cores') + '</span><b>' + d.cores + (d.abi ? ' · ' + d.abi : '') + '</b></div><div class="kv"><span>' + tt('آن ہوئے کو', 'Uptime') + '</span><b>' + up + '</b></div><div class="kv"><span>' + tt('نیٹ ورک', 'Network') + '</span><b>' + ({ wifi: 'Wi-Fi', mobile: tt('موبائل ڈیٹا', 'Mobile data'), none: tt('بند', 'Offline'), other: tt('دیگر', 'Other') }[s.net] || '–') + '</b></div></div>';
    h += '<div class="sec">' + tt('ایپس کا استعمال', 'APP USAGE') + '</div>';
    if (M.ug === false) {
      h += '<div class="card center"><div style="font-size:40px">📊</div><h2 style="font-size:18px">' + T('Usage access کی اجازت', 'Usage access needed') + '</h2><p class="mut" style="margin-top:6px">' + tt('اسکرین ٹائم اور ڈیٹا کا استعمال دیکھنے کے لیے کھلنے والی سکرین میں Cleanova کو آن کریں، پھر واپس آ جائیں۔ یہ معلومات فون سے باہر نہیں جاتیں۔', 'To see screen time and data use, turn Cleanova on in the screen that opens, then come back. This data never leaves your phone.') + '</p><button class="btn" id="uallow">' + T('اجازت دیں', 'Grant access') + '</button></div>';
    } else if (M.usage) {
      var u = M.usage, tot = 0; u.days.forEach(function (x) { tot += x; });
      h += '<div class="card"><div class="kv"><span>' + tt('آج کا اسکرین ٹائم', 'Screen time today') + '</span><b style="font-size:18px;color:var(--acc)">' + dur(u.days[6]) + '</b></div><div class="kv"><span>' + tt('روزانہ اوسط (7 دن)', 'Daily average (7 days)') + '</span><b>' + dur(tot / 7) + '</b></div>' + (u.unlocks ? '<div class="kv"><span>' + tt('آج فون کھولا', 'Unlocks today') + '</span><b>' + u.unlocks + '</b></div>' : '') + monBars(u.days, function (v) { return Math.round(v / 360000) / 10 + 'h'; }) + '</div>';
      var mx = Math.max.apply(null, u.apps.map(function (a) { return a.week; }).concat([1]));
      h += '<div class="card"><div class="sec" style="margin:0 0 8px">' + tt('سب سے زیادہ استعمال (7 دن)', 'MOST USED (7 DAYS)') + '</div>' + appRows(u.apps.map(function (a) { return { label: a.label, pkg: a.pkg, icon: a.icon, week: a.week, v: a.week }; }), 'week', mx) + '</div>';
    } else if (M.usageErr) { h += '<div class="card mut">' + tt('استعمال کی معلومات نہیں مل سکیں۔', 'Could not read app usage.') + '</div>'; }
    else if (M.ug) { h += '<div class="card center"><div class="spin"></div></div>'; }
    if (M.ug && M.data) {
      var dd = M.data, wt = 0, mt = 0; dd.wifi.forEach(function (x) { wt += x; }); dd.mobile.forEach(function (x) { mt += x; });
      var both = dd.wifi.map(function (x, i) { return x + dd.mobile[i]; });
      h += '<div class="sec">' + tt('ڈیٹا کا استعمال', 'DATA USAGE') + '</div><div class="card"><div class="kv"><span>' + tt('آج Wi-Fi', 'Wi-Fi today') + '</span><b>' + fmt(dd.wifi[6]) + '</b></div><div class="kv"><span>' + tt('آج موبائل ڈیٹا', 'Mobile data today') + '</span><b>' + fmt(dd.mobile[6]) + '</b></div><div class="kv"><span>' + tt('7 دن: Wi-Fi / موبائل', '7 days: Wi-Fi / mobile') + '</span><b>' + fmt(wt) + ' / ' + fmt(mt) + '</b></div>' + monBars(both, function (v) { return fmt(v).replace(' ', ''); }, 'var(--acc2)') + '</div>';
      var dm = Math.max.apply(null, dd.apps.map(function (a) { return a.week; }).concat([1]));
      h += '<div class="card"><div class="sec" style="margin:0 0 8px">' + tt('سب سے زیادہ ڈیٹا (7 دن)', 'TOP DATA USERS (7 DAYS)') + '</div>' + appRows(dd.apps.map(function (a) { return { label: a.label, pkg: a.pkg, icon: a.icon, week: a.week, v: a.week }; }), 'week', dm, true) + '</div>';
    }
    h += '<p class="mut" style="font-size:12px;margin:14px 4px">' + tt('نوٹ: اعداد و شمار اینڈرائیڈ سسٹم سے لیے جاتے ہیں، کچھ فونز پر کچھ قدریں دستیاب نہیں ہوتیں۔', 'Note: values come from Android and some phones do not report every reading.') + '</p>' + footer();
    $('#monroot').innerHTML = h;
    var ua = $('#uallow'); if (ua) ua.onclick = function () { MP.usageRequest().catch(function () { /* settings unavailable */ }); };
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.view === 'monitor' && S.mon && S.mon.ug === false) { S.mon.ug = undefined; vMonitor(); } });

  function vContacts() {
    setTop(T('ڈپلیکیٹ کانٹیکٹس', 'Duplicate contacts')); setBottom('');
    var c = S.ct = S.ct || { st: 'init', groups: [], sel: {}, act: 'merge' };
    if (c.st === 'init') {
      c.st = 'checking'; P.contactsStatus().then(function (r) { c.st = r && r.granted ? 'ready' : 'need'; if (S.view === 'contacts') vContacts(); }).catch(function () { c.st = 'need'; if (S.view === 'contacts') vContacts(); });
      $('#body').innerHTML = '<div class="card center"><div class="spin"></div></div>'; return;
    }
    if (c.st === 'checking' || c.st === 'working') { $('#body').innerHTML = '<div class="card center"><div class="spin"></div><h2 style="font-size:19px">' + T(c.st === 'working' ? 'کام جاری ہے…' : 'دیکھ رہا ہوں…', c.st === 'working' ? 'Working…' : 'Checking…') + '</h2></div>'; return; }
    if (c.st === 'need') {
      $('#body').innerHTML = '<div class="card center"><div style="font-size:50px">👥</div><h2 style="font-size:21px">' + T('کانٹیکٹس کی اجازت', 'Contacts permission') + '</h2><p class="mut" style="margin-top:8px">' + tt('ڈپلیکیٹ کانٹیکٹس ڈھونڈنے اور جوڑنے کے لیے کانٹیکٹس پڑھنے اور بدلنے کی اجازت چاہیے۔ سب کچھ آپ کے فون میں رہتا ہے، کچھ اپلوڈ نہیں ہوتا۔', 'To find and merge duplicate contacts, Cleanova needs permission to read and change contacts. Everything stays on your phone; nothing is uploaded.') + '</p><button class="btn" id="callow">' + T('اجازت دیں', 'Allow') + '</button></div>' + footer();
      $('#callow').onclick = function () { P.contactsRequest().then(function (r) { c.st = r && r.granted ? 'ready' : 'need'; if (!(r && r.granted)) toast('اجازت نہیں ملی', 'Permission not granted'); vContacts(); }).catch(function () { toast('اجازت نہیں ملی', 'Permission not granted'); }); };
      return;
    }
    if (c.st === 'ready') {
      $('#body').innerHTML = '<div class="card center"><div style="font-size:50px">👥</div><h2 style="font-size:21px">' + T('ڈپلیکیٹ کانٹیکٹس', 'Duplicate contacts') + '</h2><p class="mut" style="margin-top:8px">' + tt('ایک ہی نمبر یا ایک ہی نام کے کانٹیکٹس ڈھونڈے جائیں گے۔ کوئی تبدیلی آپ کی تصدیق کے بغیر نہیں ہو گی، اور تبدیلی سے پہلے سارے کانٹیکٹس کی بیک اپ فائل بنے گی۔', 'Finds contacts with the same number or name. Nothing changes without your confirmation, and a backup file of all contacts is saved before any change.') + '</p><button class="btn" id="cscan">' + T('ڈپلیکیٹ ڈھونڈیں', 'Find duplicates') + '</button></div>' + footer();
      $('#cscan').onclick = function () {
        c.st = 'working'; vContacts();
        P.contactsScan().then(function (r) {
          c.groups = r.groups || []; c.total = r.total || 0; c.sel = {};
          c.groups.forEach(function (g, i) { if (g.reason === 'number') c.sel[i] = 1; });
          c.st = 'list'; vContacts();
        }).catch(function (e) { c.st = 'ready'; vContacts(); toast('اسکین نہیں ہو سکا', 'Scan failed: ' + (e && e.message || e)); });
      };
      return;
    }
    if (c.st === 'result') {
      var m = c.result;
      $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✅</div><h2 style="font-size:21px">' + T(m.act === 'merge' ? m.n + ' گروپ جوڑ دیے گئے' : m.n + ' فالتو کانٹیکٹس ہٹا دیے گئے', m.act === 'merge' ? m.n + ' groups merged' : m.n + ' extra contacts removed') + '</h2>' +
        '<p class="mut" style="margin-top:8px">' + tt('بیک اپ فائل (' + m.count + ' کانٹیکٹس) یہاں محفوظ ہے:', 'Backup file (' + m.count + ' contacts) saved at:') + '</p><div class="pill" style="display:block;white-space:normal;word-break:break-all;margin-top:6px;text-align:start">' + esc(m.path.replace('/storage/emulated/0/', '')) + '</div>' +
        '<p class="mut" style="margin-top:10px">' + tt('اگر کچھ غلط ہو جائے تو فون کی Contacts ایپ کھولیں، Settings میں Import کا آپشن چنیں اور یہ .vcf فائل منتخب کریں۔', 'If anything goes wrong, open your phone\'s Contacts app, choose Import in its settings, and pick this .vcf file.') + '</p>' +
        '<button class="btn" id="cdone">' + T('ٹھیک ہے', 'Done') + '</button></div>' + footer();
      $('#cdone').onclick = function () { S.back = []; S.view = 'home'; render(); };
      return;
    }
    /* list */
    if (!c.groups.length) { $('#body').innerHTML = '<div class="card center"><div style="font-size:54px">✨</div><h2 style="font-size:21px">' + T('کوئی ڈپلیکیٹ نہیں ملا', 'No duplicate contacts') + '</h2><p class="mut">' + c.total + ' ' + tt('کانٹیکٹس دیکھے گئے', 'contacts checked') + '</p></div>' + footer(); return; }
    var h = '<div class="hero" style="display:block"><div class="k">' + T('ڈپلیکیٹ گروپ ملے', 'Duplicate groups found') + '</div><div class="big">' + c.groups.length + '</div><div class="k" style="font-size:12.5px">' + c.total + ' ' + tt('کانٹیکٹس میں سے', 'contacts checked') + '</div></div>' +
      '<div class="chips"><button class="chip' + (c.act === 'merge' ? ' on' : '') + '" data-act="merge">' + tt('جوڑیں (تجویز کردہ)', 'Merge (recommended)') + '</button><button class="chip' + (c.act === 'delete' ? ' on' : '') + '" data-act="delete">' + tt('فالتو ہٹائیں', 'Delete extra') + '</button></div>' +
      '<p class="mut" style="margin-top:8px">' + (c.act === 'merge' ? tt('جوڑنے سے سب نمبر ایک کانٹیکٹ میں آ جاتے ہیں، کچھ ضائع نہیں ہوتا۔', 'Merging puts all numbers into one contact; nothing is lost.') : tt('ہر گروپ میں سب سے زیادہ نمبروں والا رہے گا، باقی ہٹ جائیں گے۔', 'In each group the contact with the most numbers stays; the others are removed.')) + '</p>';
    c.groups.forEach(function (g, i) {
      h += '<div class="grp"><div class="hd"><span>' + (g.reason === 'number' ? tt('ایک ہی نمبر', 'Same number') : tt('ایک ہی نام، نمبر مختلف', 'Same name, different numbers')) + '</span><button class="sw" data-g="' + i + '" aria-pressed="' + !!c.sel[i] + '" aria-label="select"></button></div>';
      g.contacts.forEach(function (ct, k) {
        h += '<div class="row"><div class="t"><b>' + esc(ct.name || '—') + '</b><small class="e" style="display:block;direction:ltr;text-align:start">' + esc((ct.numbers || []).join(' · ')) + '</small></div>' + (c.act === 'delete' ? '<span class="pill' + (k === 0 ? ' a' : '') + '">' + (k === 0 ? tt('رکھیں ★', 'Keep ★') : tt('ہٹائیں', 'Remove')) + '</span>' : '') + '</div>';
      });
      h += '</div>';
    });
    $('#body').innerHTML = h + footer();
    [].forEach.call(document.querySelectorAll('[data-act]'), function (b) { b.onclick = function () { c.act = b.dataset.act; var y = $('#body').scrollTop; vContacts(); $('#body').scrollTop = y; }; });
    [].forEach.call(document.querySelectorAll('[data-g]'), function (b) { b.onclick = function () { var i = b.dataset.g; if (c.sel[i]) delete c.sel[i]; else c.sel[i] = 1; var y = $('#body').scrollTop; vContacts(); $('#body').scrollTop = y; }; });
    var n = Object.keys(c.sel).length;
    setBottom('<button class="btn" id="capply"' + (n ? '' : ' disabled') + '>' + T(c.act === 'merge' ? 'چنے ہوئے ' + n + ' گروپ جوڑیں' : 'چنے ہوئے ' + n + ' گروپ سے فالتو ہٹائیں', c.act === 'merge' ? 'Merge ' + n + ' selected groups' : 'Remove extras from ' + n + ' groups') + '</button>');
    $('#capply').onclick = confirmContacts;
  }
  function confirmContacts() {
    var c = S.ct, n = Object.keys(c.sel).length; if (!n) return;
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<h2 style="font-size:22px">' + T('تصدیق', 'Confirm') + '</h2><p style="margin-top:6px">' + tt(c.act === 'merge' ? n + ' گروپ کے کانٹیکٹس جوڑے جائیں گے۔' : n + ' گروپ میں سے فالتو کانٹیکٹس ہٹائے جائیں گے۔', c.act === 'merge' ? n + ' groups will be merged.' : 'Extra contacts in ' + n + ' groups will be removed.') + '</p>' +
      '<p class="mut">' + tt('پہلے سارے کانٹیکٹس کی بیک اپ فائل (.vcf) بنے گی۔', 'A backup file (.vcf) of all contacts is made first.') + '</p>' +
      '<button class="btn' + (c.act === 'delete' ? ' red' : '') + '" id="okc">' + T('ٹھیک ہے، شروع کریں', 'Yes, go ahead') + '</button><button class="btn o" id="noc">' + T('واپس جائیں', 'Cancel') + '</button>';
    $('#noc').onclick = function () { m.hidden = true; };
    $('#okc').onclick = function () { m.hidden = true; applyContacts(); };
  }
  function applyContacts() {
    var c = S.ct, idx = Object.keys(c.sel), act = c.act, bk;
    c.st = 'working'; setBottom(''); vContacts();
    P.contactsBackup().then(function (b) {
      bk = b;
      if (act === 'merge') return P.contactsMerge({ groups: idx.map(function (i) { return c.groups[i].contacts.map(function (x) { return x.id; }); }) }).then(function (r) { return r.merged || 0; });
      var ids = []; idx.forEach(function (i) { c.groups[i].contacts.slice(1).forEach(function (x) { ids.push(x.id); }); });
      return P.contactsDelete({ ids: ids }).then(function (r) { return r.deleted || 0; });
    }).then(function (n) {
      c.result = { act: act, n: n, path: bk.path, count: bk.count }; c.st = 'result'; vContacts();
    }).catch(function (e) { c.st = 'list'; vContacts(); toast('کام نہیں ہو سکا، کچھ نہیں بدلا', 'Failed, nothing was changed: ' + (e && e.message || e)); });
  }

  /* ---------- start ---------- */
  function withTimeout(promise, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout: native plugin did not answer in ' + ms / 1000 + 's')); }, ms);
      promise.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  var purged = false;
  function refreshStatus(quiet) {
    var call;
    try { call = withTimeout(P.status(), 5000); } catch (e) { call = Promise.reject(e); }
    return call.then(function (r) {
      S.granted = !!r.granted; S.free = r.free || 0; S.total = r.total || 0;
      if (S.granted && !purged) { purged = true; P.trashPurge({ days: PREF.trashDays }).catch(function () { /* ignore */ }); }
      if (!quiet) { if (!S.granted) { S.view = 'gate'; } else if (S.view === 'gate') S.view = 'home'; render(); }
    }).catch(function (e) { S.view = 'gate'; render(); if (window.cleanovaDiag) window.cleanovaDiag('status failed: ' + (e && (e.message || e)) + '\nCapacitor: ' + typeof window.Capacitor + ', native: ' + (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) + ', plugin: ' + typeof P); });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && (S.view === 'gate')) refreshStatus(); });
  window.cleanovaTest = { S: S, PREF: PREF, render: render, prepare: prepare, go: go };
  applyLook();
  refreshStatus();
})();
