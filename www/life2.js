/* Cleanova Life 2: security, voice, weather, rates, calculators, email writer, habits, journal, reports. */
window.CLifeInit2 = function (CL) {
  'use strict';
  var S = CL.S, PREF = CL.PREF, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, ico = CL.ico, TP = CL.TP, U = CL.u, V = CL.views, TO = CL.TAB_OF;
  var lget = U.lget, lset = U.lset, L = U.L, num = U.num, pad = U.pad, dkey = U.dkey, chips = U.chips, bind = U.bind, rgba = U.rgba, ib = U.ib, rs = U.rs, nav = U.nav, disc = U.disc, bars = U.bars, uid = U.uid;
  var Cap = window.Capacitor, SF = (Cap && Cap.Plugins && Cap.Plugins.Safety && !window.CLEANOVA_MOCK) ? Cap.Plugins.Safety : window.SafetyMock;
  /* extra icons */
  var X = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cloud: '<path d="M18 10a6 6 0 0 0-11.6-1.5A4.5 4.5 0 0 0 7 18h11a4 4 0 0 0 0-8z"/>',
    dollar: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  };
  for (var k in X) CL.IC[k] = X[k];
  var TOe = ['weather', 'rates', 'calc', 'email', 'habits', 'journal', 'week', 'food', 'focus', 'ledger', 'sos', 'prefs', 'more'];
  TOe.forEach(function (k) { TO[k] = 'life'; });
  function ext(fn) { sup = true; var r; try { r = fn(); } catch (e) { sup = false; throw e; } setTimeout(function () { sup = false; }, 4000); return r; }
  function openUrl(u) { return ext(function () { return TP.openUrl({ url: u }).catch(function () { window.open(u, '_blank'); }); }); }
  function copyText(t, ok) {
    var done = function () { CL.toast(ok ? ok[0] : 'کاپی ہو گیا', ok ? ok[1] : 'Copied'); };
    try { navigator.clipboard.writeText(t).then(done, fb); } catch (e) { fb(); }
    function fb() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { CL.toast('کاپی نہیں ہو سکا', 'Could not copy'); } ta.remove(); }
  }
  function ask(title, initial, cb, ph) {
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<b style="font-size:17px">' + title + '</b><input class="inp" id="askv" value="' + esc(initial || '') + '" placeholder="' + esc(ph || '') + '" style="direction:auto"><div class="two" style="margin-top:12px"><button class="sbtn" id="askx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="asko">' + tt('ٹھیک ہے', 'OK') + '</button></div>';
    $('#askx').onclick = function () { m.hidden = true; }; $('#asko').onclick = function () { var v = $('#askv').value.trim(); m.hidden = true; if (v) cb(v); };
    setTimeout(function () { var i = $('#askv'); if (i) i.focus(); }, 100);
  }
  CL.ask = ask;

  /* ================= VOICE ================= */
  var NW = { 'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'چھے': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10, 'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19, 'بیس': 20, 'تیس': 30, 'چالیس': 40, 'پچاس': 50, 'ساٹھ': 60, 'ستر': 70, 'اسی': 80, 'نوے': 90, 'سو': 100, 'ہزار': 1000, 'لاکھ': 100000, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000, lac: 100000 };
  var CK = { food: 'کھانا روٹی چائے بریانی کھانے ناشتہ دودھ سبزی فروٹ food lunch dinner breakfast tea milk grocery groceries biryani', travel: 'پیٹرول کرایہ رکشہ بس ٹیکسی اوبر petrol fuel fare rickshaw taxi uber bus cng', bills: 'بل بجلی گیس انٹرنیٹ کرایہ bill electricity gas internet rent', health: 'دوا دوائی ڈاکٹر ٹیسٹ medicine doctor hospital test pharmacy', shop: 'خریداری کپڑے جوتے shopping clothes shoes', edu: 'فیس اسکول کتاب کتابیں fee fees school book books tuition' };
  CL.parseExpense = function (text) {
    var t = String(text).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 1632; }).replace(/,/g, ''), w = t.split(/\s+/), total = 0, cur = 0, found = false, used = [], note = [];
    w.forEach(function (x) {
      var lx = x.toLowerCase().replace(/[^\p{L}\p{N}.]/gu, '');
      if (/^\d+(\.\d+)?$/.test(lx)) { cur += parseFloat(lx); found = true; used.push(x); return; }
      var v = NW[lx];
      if (v === undefined) { note.push(x); return; }
      found = true; used.push(x);
      if (v >= 1000) { total += (cur || 1) * v; cur = 0; } else if (v === 100) cur = (cur || 1) * 100; else cur += v;
    });
    var amt = total + cur, cat = '', low = t.toLowerCase();
    Object.keys(CK).forEach(function (k) { if (!cat && CK[k].split(' ').some(function (kw) { return kw && low.indexOf(kw) >= 0; })) cat = k; });
    return { amt: found ? amt : 0, cat: cat, note: note.join(' ').replace(/روپے|روپیہ|rupees|rupee|rs/gi, '').trim() };
  };
  function vlang() { return lget('vlang', PREF.lang === 'en' ? 'en-PK' : 'ur-PK'); }
  CL.micHtml = function (id, hint) {
    return '<div style="display:flex;gap:8px;align-items:center"><button class="sbtn p" id="' + id + '" style="min-height:44px">' + ico('mic') + ' ' + tt('بولیں', 'Speak') + '</button><button class="sbtn" id="' + id + 'l" style="min-height:44px;direction:ltr">' + (vlang() === 'ur-PK' ? 'اردو' : 'English') + '</button><small class="mut" style="font-size:12px;flex:1">' + (hint || '') + '</small></div>';
  };
  CL.micBind = function (id, cb) {
    var b = $('#' + id), l = $('#' + id + 'l'); if (!b) return;
    l.onclick = function () { lset('vlang', vlang() === 'ur-PK' ? 'en-PK' : 'ur-PK'); l.textContent = vlang() === 'ur-PK' ? 'اردو' : 'English'; };
    b.onclick = function () {
      ext(function () { return SF.voice({ lang: vlang(), prompt: tt('بولیں…', 'Speak now…') }); }).then(function (r) { var t = r && r.results && r.results[0]; if (t) cb(t); }).catch(function (e) { if (String(e && (e.message || e)).indexOf('cancel') < 0) CL.toast('آواز کی سہولت دستیاب نہیں', 'Voice input is not available'); });
    };
  };

  /* ================= APP LOCK ================= */
  var sup = false, hiddenAt = 0, locked = false, lk = function () { return lget('lock', { on: false, hash: '', bio: false, delay: 30000, secure: false }); };
  function hash(pin) {
    var s = 'cl-life:' + pin;
    try { if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return pad(x.toString(16)); }).join(''); }); } catch (e) { /* fallback */ }
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Promise.resolve('d' + h);
  }
  var tries = 0, until = 0;
  function showLock() {
    var c = lk(); if (!c.on || !c.hash) return; if (locked) return; locked = true;
    var el = document.createElement('div'); el.id = 'lock'; var pin = '';
    function draw(msg) {
      el.innerHTML = '<div class="lkin"><div class="logo" style="width:60px;height:60px;border-radius:19px;margin:0 auto">' + ico('lock') + '</div><h2 style="margin:12px 0 2px;font-size:21px">Cleanova <span style="color:var(--acc)">Life</span></h2><p class="mut" id="lkm">' + (msg || tt('پن درج کریں', 'Enter your PIN')) + '</p><div class="lkd">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i < pin.length ? 'f' : '') + '"></i>'; }).join('') + '</div><div class="lkp">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'b', 0, 'ok'].map(function (k) { return '<button data-k="' + k + '">' + (k === 'b' ? '⌫' : k === 'ok' ? '✓' : k) + '</button>'; }).join('') + '</div><button class="sbtn" id="lkb" style="margin-top:14px">' + ico('shield') + ' ' + tt('فنگر پرنٹ / چہرہ / فون لاک', 'Fingerprint / face / phone lock') + '</button></div>';
      [].forEach.call(el.querySelectorAll('[data-k]'), function (b) { b.onclick = function () { var k = b.dataset.k; if (k === 'b') pin = pin.slice(0, -1); else if (k === 'ok') return check(); else if (pin.length < 6) pin += k; draw(); if (pin.length >= 4 && k !== 'b' && pin.length === (lk().len || 4)) check(); }; });
      el.querySelector('#lkb').onclick = bio;
    }
    function ok() { locked = false; el.remove(); }
    function check() {
      if (Date.now() < until) { draw(tt('کچھ دیر بعد کوشش کریں', 'Try again shortly')); return; }
      hash(pin).then(function (h) { if (h === lk().hash) { tries = 0; ok(); } else { tries++; pin = ''; if (tries >= 5) { until = Date.now() + 30000; tries = 0; } draw(tt('پن غلط ہے', 'Wrong PIN')); } });
    }
    function bio() { ext(function () { return SF.biometricAuth({ title: 'Cleanova Life', cancel: tt('پن استعمال کریں', 'Use PIN') }); }).then(ok).catch(function () { /* stay locked */ }); }
    document.body.appendChild(el); draw();
    if (c.bio) setTimeout(bio, 250);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    var c = lk(); if (c.on && !sup && hiddenAt && Date.now() - hiddenAt >= (c.delay || 0)) showLock();
  });
  try { if (lk().on) showLock(); if (lk().secure) SF.secure({ on: true }); } catch (e) { /* ignore */ }

  /* ================= PRIVACY & DISPLAY ================= */
  var PN = null;
  function swr(id, ur, en, on, sub) { return '<div class="row"><div class="t"><b>' + tt(ur, en) + '</b>' + (sub ? '<small class="e" style="display:block">' + tt(sub[0], sub[1]) + '</small>' : '') + '</div><button class="sw" id="' + id + '" aria-pressed="' + !!on + '"></button></div>'; }
  var HOMECARDS = [['travel', ['سفرنامہ', 'Travel log']], ['health', ['صحت', 'Health']], ['clean', ['کلینر', 'Cleaner']], ['monitor', ['فون مانیٹر', 'Phone monitor']], ['exp', ['خرچ', 'Expenses']], ['emerg', ['ایمرجنسی کارڈ', 'Emergency card']], ['rem', ['یاد دہانیاں', 'Reminders']]];
  function vPrefs() {
    CL.setTop(T('پرائیویسی اور ڈسپلے', 'Privacy and display'));
    var c = lk(), bio = (SF && SF.biometricInfo) ? lget('biocap', null) : null;
    if (bio === null && SF && SF.biometricInfo) SF.biometricInfo().then(function (r) { lset('biocap', { a: !!r.available, b: !!r.biometric }); if (S.view === 'prefs') vPrefs(); }).catch(function () { lset('biocap', { a: false, b: false }); });
    var hid = lget('hide', []);
    var h = '<div class="card" style="margin-top:8px"><b>' + tt('ایپ لاک', 'App lock') + '</b>' + swr('pl', 'پن سے ایپ لاک', 'Lock app with PIN', c.on, ['صحت اور مالی ڈیٹا محفوظ رکھیں', 'Protect health and money data']);
    if (c.on) {
      h += (bio && bio.a ? swr('pb', 'فنگر پرنٹ / چہرہ / فون لاک سے کھولیں', 'Unlock with fingerprint / face / phone lock', c.bio, bio.b ? null : ['اس فون پر صرف فون کا پن/پیٹرن', 'This phone offers phone PIN/pattern only']) : '<p class="note">' + tt('اس فون پر بائیومیٹرک دستیاب نہیں یا سیٹ نہیں۔', 'Biometrics are not available or not set up on this phone.') + '</p>') +
        '<span class="fl">' + tt('کتنی دیر بعد لاک ہو', 'Lock after leaving the app') + '</span>' + chips([[0, ['فوراً', 'Immediately']], [30000, ['30 سیکنڈ', '30 seconds']], [120000, ['2 منٹ', '2 minutes']], [600000, ['10 منٹ', '10 minutes']]], c.delay, 'pd') +
        '<button class="sbtn" id="pchg" style="margin-top:12px;width:100%">' + tt('پن بدلیں', 'Change PIN') + '</button>';
    }
    h += '</div><div class="card">' + swr('ps', 'ریسینٹ ایپس اور اسکرین شاٹ میں چھپائیں', 'Hide in recent apps and block screenshots', c.secure) + '</div>';
    h += '<div class="card"><b>' + tt('ڈسپلے', 'Display') + '</b>' + swr('pbig', 'بڑے حروف', 'Large text', lget('big', false), ['بڑی عمر کے لیے آسانی', 'Easier to read']) + '<span class="fl">' + tt('ہوم پر کارڈ', 'Cards on home') + '</span><div class="chips">' + HOMECARDS.map(function (x) { return '<button class="chip' + (hid.indexOf(x[0]) < 0 ? ' on' : '') + '" data-hc="' + x[0] + '">' + L(x[1]) + '</button>'; }).join('') + '</div></div>';
    h += '<div class="card"><button class="cat" data-go="sos" style="padding:6px 0"><span class="t"><b>' + tt('SOS رابطے', 'SOS contacts') + '</b></span><span>›</span></button></div>' + CL.footer();
    $('#body').innerHTML = h;
    $('#pl').onclick = function () { if (c.on) { c.on = false; c.hash = ''; c.bio = false; lset('lock', c); vPrefs(); } else setPin(function () { vPrefs(); }); };
    if ($('#pb')) $('#pb').onclick = function () { c.bio = !c.bio; lset('lock', c); vPrefs(); };
    if ($('#pchg')) $('#pchg').onclick = function () { setPin(function () { vPrefs(); }); };
    bind('pd', function (v) { c.delay = +v; lset('lock', c); vPrefs(); });
    $('#ps').onclick = function () { c.secure = !c.secure; lset('lock', c); SF.secure({ on: c.secure }).catch(function () { /* ignore */ }); vPrefs(); };
    $('#pbig').onclick = function () { lset('big', !lget('big', false)); applyBig(); vPrefs(); };
    bind('hc', function (k) { var l = lget('hide', []), i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); lset('hide', l); vPrefs(); });
    bind('go', function (v) { nav(v); });
  }
  V.prefs = vPrefs;
  function applyBig() { document.body.style.zoom = lget('big', false) ? '1.15' : ''; }
  applyBig();
  function setPin(done) {
    var m = $('#modal'); m.hidden = false; var step = 1, first = '';
    function draw(msg) {
      $('#sheet').innerHTML = '<b style="font-size:17px">' + (step === 1 ? tt('نیا پن (4 سے 6 ہندسے)', 'New PIN (4 to 6 digits)') : tt('پن دوبارہ لکھیں', 'Enter the PIN again')) + '</b><input class="inp" id="pv" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="letter-spacing:8px;text-align:center"><p class="note" id="pm">' + (msg || tt('پن بھولنے پر فون کے فنگر پرنٹ/پن سے کھل سکتی ہے۔', 'If you forget the PIN you can still unlock with your phone fingerprint / lock.')) + '</p><div class="two"><button class="sbtn" id="px">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="po">' + tt('آگے', 'Next') + '</button></div>';
      $('#px').onclick = function () { m.hidden = true; };
      $('#po').onclick = function () {
        var v = $('#pv').value; if (!/^\d{4,6}$/.test(v)) { draw(tt('4 سے 6 ہندسے لکھیں', 'Enter 4 to 6 digits')); return; }
        if (step === 1) { first = v; step = 2; draw(); setTimeout(function () { $('#pv').focus(); }, 50); return; }
        if (v !== first) { step = 1; draw(tt('پن نہیں ملے، دوبارہ کوشش کریں', 'PINs did not match, try again')); return; }
        hash(v).then(function (h) { var c = lk(); c.on = true; c.hash = h; c.len = v.length; lset('lock', c); m.hidden = true; CL.toast('ایپ لاک آن', 'App lock on'); done(); });
      };
    }
    draw(); setTimeout(function () { var i = $('#pv'); if (i) i.focus(); }, 100);
  }

  /* ================= SOS ================= */
  function vSos() {
    CL.setTop(T('SOS', 'SOS'));
    var cs = lget('sos', []), em = lget('emerg', {});
    if (!cs.length && em.phone) cs = [{ name: em.cname || 'Contact', phone: em.phone }];
    var msg = lget('sosmsg', 'I need help. Please call me. My location:');
    var h = '<div class="warn" style="border-color:rgba(251,113,133,.6)">' + tt('بٹن دبانے پر آپ کی موجودہ لوکیشن کا نقشہ لنک پیغام میں لگ جاتا ہے۔ پیغام کی ایپ کھلے گی، آپ کو بھیجیں دبانا ہوگا۔', 'Tapping a button puts a map link of your current location into a message. Your messaging app opens and you press send.') + '</div>';
    h += '<div class="card"><b>' + tt('بھیجنے والے لوگ (زیادہ سے زیادہ 3)', 'People to alert (up to 3)') + '</b>' + (cs.length ? cs.map(function (c, i) { return '<div class="ent"><div class="m"><b>' + esc(c.name) + '</b><small>' + esc(c.phone) + '</small></div><button class="sbtn p" data-ss="' + i + '" style="min-height:40px;padding:0 10px">SMS</button><button class="sbtn" data-sw="' + i + '" style="min-height:40px;padding:0 10px">WhatsApp</button><button class="x" data-sx="' + i + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('کوئی رابطہ نہیں', 'No contacts yet') + '</p>') + (cs.length < 3 ? '<div class="two"><input class="inp" id="sn" placeholder="' + tt('نام', 'Name') + '" style="direction:auto"><input class="inp" id="sp" type="tel" placeholder="03xx / +92…"></div><button class="sbtn" id="sa" style="margin-top:10px;width:100%">' + ico('plus') + ' ' + tt('شامل کریں', 'Add') + '</button>' : '') + '</div>';
    h += '<div class="card"><span class="fl" style="margin-top:0">' + tt('پیغام', 'Message') + '</span><input class="inp" id="sm" value="' + esc(msg) + '" style="direction:auto"></div><p class="note" id="sst"></p>' + CL.footer();
    $('#body').innerHTML = h; lset('sos', cs);
    $('#sm').onchange = function () { lset('sosmsg', $('#sm').value); };
    if ($('#sa')) $('#sa').onclick = function () { var n = $('#sn').value.trim(), p = $('#sp').value.replace(/[^\d+]/g, ''); if (!n || p.length < 7) { CL.toast('نام اور نمبر لکھیں', 'Enter a name and number'); return; } cs.push({ name: n, phone: p }); lset('sos', cs); vSos(); };
    bind('sx', function (i) { cs.splice(+i, 1); lset('sos', cs); vSos(); });
    function send(i, via) {
      var c = cs[i], st = $('#sst'); st.textContent = tt('لوکیشن لے رہا ہوں…', 'Getting your location…');
      var go = function (link) {
        var body = $('#sm').value + (link ? ' ' + link : ''), ph = c.phone.replace(/^0/, '+92').replace(/^\+?92/, '+92');
        st.textContent = link ? '' : tt('لوکیشن نہیں ملی، پیغام بغیر لنک کے بھیج رہا ہوں۔', 'Location unavailable; sending without a link.');
        openUrl(via === 'sms' ? 'sms:' + ph + '?body=' + encodeURIComponent(body) : 'https://wa.me/' + ph.replace('+', '') + '?text=' + encodeURIComponent(body));
      };
      if (!navigator.geolocation) return go('');
      navigator.geolocation.getCurrentPosition(function (p) { go('https://maps.google.com/?q=' + p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6)); }, function () { go(''); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    }
    bind('ss', function (i) { send(+i, 'sms'); }); bind('sw', function (i) { send(+i, 'wa'); });
  }
  V.sos = vSos;

  /* ================= NETWORK HELPERS ================= */
  function getJson(url, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms || 12000);
      fetch(url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (j) { clearTimeout(t); res(j); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function ago(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? tt('ابھی', 'just now') : m < 60 ? m + tt(' منٹ پہلے', ' min ago') : Math.round(m / 60) + tt(' گھنٹے پہلے', ' h ago'); }
  /* ================= WEATHER ================= */
  function wx(c) { return c === 0 ? ['☀️', 'صاف', 'Clear'] : c <= 2 ? ['🌤', 'کچھ بادل', 'Partly cloudy'] : c === 3 ? ['☁️', 'ابر آلود', 'Overcast'] : c <= 48 ? ['🌫', 'دھند', 'Fog'] : c <= 57 ? ['🌦', 'ہلکی پھوار', 'Drizzle'] : c <= 67 ? ['🌧', 'بارش', 'Rain'] : c <= 77 ? ['❄️', 'برف', 'Snow'] : c <= 82 ? ['🌦', 'بوچھاڑ', 'Showers'] : ['⛈', 'آندھی طوفان', 'Thunderstorm']; }
  var WC = null;
  function loadWeather(force) {
    var city = lget('wcity', { name: 'Karachi', lat: 24.8607, lon: 67.0011 }), c = lget('wcache', null);
    if (!force && c && c.city === city.name && Date.now() - c.t < 3600000) return Promise.resolve(c);
    return getJson('https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=4').then(function (j) {
      var o = { t: Date.now(), city: city.name, cur: j.current, daily: j.daily }; lset('wcache', o); return o;
    });
  }
  function vWeather() {
    CL.setTop(T('موسم', 'Weather'));
    var city = lget('wcity', { name: 'Karachi', lat: 24.8607, lon: 67.0011 }), c = lget('wcache', null), err = WC && WC.err;
    var h = '<div class="card" style="margin-top:8px"><div class="two"><input class="inp" id="wq" placeholder="' + tt('شہر تلاش کریں (مثلاً Lahore)', 'Search a city (e.g. Lahore)') + '" style="margin-top:0"><button class="sbtn p" id="wgo">' + tt('تلاش', 'Search') + '</button></div><div id="wres"></div></div>';
    if (c && c.cur) {
      var w = wx(c.cur.weather_code), d = c.daily;
      h += '<div class="lhero"><div class="mut">' + esc(c.city) + ' · ' + ago(c.t) + '</div><div style="display:flex;align-items:center;gap:12px"><div style="font-size:56px">' + w[0] + '</div><div><div class="big2">' + Math.round(c.cur.temperature_2m) + '°C</div><div class="mut">' + (PREF.lang === 'en' ? w[2] : w[1]) + ' · ' + tt('محسوس ', 'feels ') + Math.round(c.cur.apparent_temperature) + '°</div></div></div><div class="stat"><div><b>' + c.cur.relative_humidity_2m + '%</b><small>' + tt('نمی', 'Humidity') + '</small></div><div><b>' + Math.round(c.cur.wind_speed_10m) + '</b><small>km/h ' + tt('ہوا', 'wind') + '</small></div><div><b>' + (d.precipitation_probability_max ? d.precipitation_probability_max[0] : 0) + '%</b><small>' + tt('بارش کا امکان', 'Rain chance') + '</small></div></div></div>';
      h += '<div class="card">' + d.time.map(function (day, i) { var x = wx(d.weather_code[i]); return '<div class="ent"><span style="font-size:26px">' + x[0] + '</span><div class="m"><b>' + (i === 0 ? tt('آج', 'Today') : new Date(day).toLocaleDateString('en-GB', { weekday: 'long' })) + '</b><small>' + (PREF.lang === 'en' ? x[2] : x[1]) + '</small></div><span class="v">' + Math.round(d.temperature_2m_max[i]) + '° / ' + Math.round(d.temperature_2m_min[i]) + '°</span></div>'; }).join('') + '</div>';
    } else h += '<div class="card center"><div class="spin"></div></div>';
    if (err) h += '<p class="note">' + tt('انٹرنیٹ سے موسم نہیں آ سکا۔ پچھلا محفوظ موسم دکھایا جا رہا ہے۔', 'Could not reach the internet. Showing the last saved weather.') + '</p>';
    $('#body').innerHTML = h + '<p class="note">' + tt('ڈیٹا Open-Meteo سے، انٹرنیٹ درکار۔', 'Data from Open-Meteo, internet needed.') + '</p>' + CL.footer();
    if (!c || Date.now() - c.t > 600000) loadWeather(true).then(function () { WC = null; if (S.view === 'weather') vWeather(); }).catch(function () { WC = { err: 1 }; if (S.view === 'weather' && c) { /* keep cached */ } else if (S.view === 'weather') { $('#body').insertAdjacentHTML('beforeend', '<p class="note">' + tt('انٹرنیٹ نہیں ہے۔', 'No internet connection.') + '</p>'); } });
    $('#wgo').onclick = function () {
      var q = $('#wq').value.trim(); if (!q) return;
      getJson('https://geocoding-api.open-meteo.com/v1/search?count=5&name=' + encodeURIComponent(q)).then(function (j) {
        var r = (j.results || []);
        $('#wres').innerHTML = r.length ? r.map(function (x, i) { return '<button class="cat" data-wc="' + i + '"><span>' + esc(x.name) + (x.admin1 ? ', ' + esc(x.admin1) : '') + ' · ' + esc(x.country || '') + '</span><span>›</span></button>'; }).join('') : '<p class="note">' + tt('کوئی شہر نہیں ملا', 'No city found') + '</p>';
        bind('wc', function (i) { var x = r[+i]; lset('wcity', { name: x.name, lat: x.latitude, lon: x.longitude }); lset('wcache', null); vWeather(); });
      }).catch(function () { $('#wres').innerHTML = '<p class="note">' + tt('انٹرنیٹ نہیں ہے', 'No internet connection') + '</p>'; });
    };
  }
  V.weather = vWeather;

  /* ================= RATES ================= */
  var CUR = ['USD', 'SAR', 'AED', 'GBP', 'EUR', 'CAD', 'AUD', 'CNY'], RF2 = { amt: '100', from: 'USD', tab: 'pk', a: '1000', f: 'EUR', t: 'USD' };
  var PAIRS = [['EUR', 'USD', '🇪🇺'], ['GBP', 'USD', '🇬🇧'], ['USD', 'JPY', '🇯🇵'], ['USD', 'CHF', '🇨🇭'], ['AUD', 'USD', '🇦🇺'], ['USD', 'CAD', '🇨🇦'], ['USD', 'CNY', '🇨🇳'], ['USD', 'SAR', '🇸🇦'], ['USD', 'AED', '🇦🇪'], ['EUR', 'GBP', '🇪🇺'], ['USD', 'INR', '🇮🇳'], ['USD', 'TRY', '🇹🇷']];
  var DEFP = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'USD/CNY', 'USD/SAR', 'USD/AED'];
  var ALLC = ['PKR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY', 'INR', 'TRY', 'KWD', 'QAR', 'OMR', 'BHD', 'MYR', 'SGD', 'THB', 'KRW', 'NZD', 'SEK', 'NOK', 'EGP', 'BDT'];
  function loadRates() {
    return Promise.all([getJson('https://open.er-api.com/v6/latest/USD'), getJson('https://api.gold-api.com/price/XAU').catch(function () { return null; }), getJson('https://api.gold-api.com/price/XAG').catch(function () { return null; }), getJson('https://api.gold-api.com/price/XPT').catch(function () { return null; })]).then(function (a) {
      if (!a[0] || !a[0].rates) throw new Error('no rates');
      var o = { t: Date.now(), r: a[0].rates, au: a[1] && a[1].price, ag: a[2] && a[2].price, ap: a[3] && a[3].price }; lset('rcache', o);
      var hist = lget('rhist', {}), k = dkey(); hist[k] = { au: o.au, ag: o.ag, ap: o.ap, r: o.r };
      Object.keys(hist).sort().slice(0, -12).forEach(function (x) { delete hist[x]; }); lset('rhist', hist); return o;
    });
  }
  var TOLA = 11.6638, OZ = 31.1035;
  function prevSnap() { var h = lget('rhist', {}), k = dkey(), ks = Object.keys(h).filter(function (x) { return x < k; }).sort(); return ks.length ? h[ks[ks.length - 1]] : null; }
  function chg(cur, prev) { if (!cur || !prev) return ''; var p = (cur - prev) / prev * 100; return '<span class="' + (p >= 0 ? 'up' : 'dn') + '" style="font-size:12px;font-weight:600;color:' + (p >= 0 ? '#4ade80' : '#fb7185') + '">' + (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(2) + '%</span>'; }
  function fx(r, b, q) { return r[q] / r[b]; }
  function vRates() {
    CL.setTop(T('ریٹس', 'Rates'));
    var c = lget('rcache', null), h = chips([['pk', ['🇵🇰 پاکستان', 'Pakistan (PKR)']], ['intl', ['🌍 بین الاقوامی', 'International']]], RF2.tab, 'rtab').replace('class="chips"', 'class="chips" style="margin-top:8px"');
    if (c && RF2.tab === 'pk') {
      var pk = c.r.PKR, cv = function (code) { return pk / c.r[code]; };
      var gold = c.au ? c.au / OZ * pk : 0, silver = c.ag ? c.ag / OZ * pk : 0;
      h += '<div class="lhero"><div class="mut">' + tt('اپ ڈیٹ: ', 'Updated: ') + ago(c.t) + '</div><b style="font-size:17px">' + tt('روپے کے مقابلے میں', 'Against the rupee') + '</b>' + CUR.map(function (x) { return '<div class="kv"><span>1 ' + x + '</span><b>Rs ' + cv(x).toFixed(2) + '</b></div>'; }).join('') + '</div>';
      if (gold) h += '<div class="card"><b>' + tt('سونا (عالمی ریٹ کے مطابق اندازہ)', 'Gold (estimate from world price)') + '</b><div class="kv"><span>' + tt('24 قیراط، فی تولہ', '24K per tola') + '</span><b>' + rs(gold * TOLA) + '</b></div><div class="kv"><span>' + tt('22 قیراط، فی تولہ', '22K per tola') + '</span><b>' + rs(gold * TOLA * 22 / 24) + '</b></div><div class="kv"><span>' + tt('24 قیراط، فی گرام', '24K per gram') + '</span><b>' + rs(gold) + '</b></div>' + (silver ? '<div class="kv"><span>' + tt('چاندی، فی تولہ', 'Silver per tola') + '</span><b>' + rs(silver * TOLA) + '</b></div>' : '') + '<p class="note">' + tt('یہ عالمی قیمت اور ڈالر ریٹ سے نکالا گیا اندازہ ہے۔ مقامی صرافہ کا ریٹ، پریمیم اور ٹیکس کی وجہ سے مختلف ہوتا ہے۔', 'Calculated from the world price and dollar rate. Local sarafa rates differ because of premium and taxes.') + '</p></div>';
    } else if (c) {
      var pv = prevSnap(), hist = lget('rhist', {}), pts = Object.keys(hist).sort().map(function (k) { return hist[k].au; }).filter(Boolean), sel = lget('pairs', DEFP);
      if (c.au) {
        h += '<div class="lhero" style="background:linear-gradient(150deg,rgba(251,191,36,.22),rgba(251,191,36,.04));border-color:rgba(251,191,36,.35)"><div style="display:flex;justify-content:space-between"><b style="color:#fcd34d;font-size:13px">' + tt('سونا · XAU/USD', 'GOLD · XAU/USD') + '</b>' + chg(c.au, pv && pv.au) + '</div><div class="big2" style="color:#fcd34d">$' + c.au.toLocaleString('en', { maximumFractionDigits: 2 }) + ' <small style="font-size:13px;color:var(--mut)">/ oz</small></div>';
        if (pts.length > 1) { var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), sp = mx - mn || 1; h += '<svg viewBox="0 0 330 56" width="100%" height="56" style="margin-top:6px"><polyline fill="none" stroke="#fbbf24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" points="' + pts.map(function (v, i) { return (i / (pts.length - 1) * 326 + 2).toFixed(1) + ',' + (50 - (v - mn) / sp * 44).toFixed(1); }).join(' ') + '"/></svg>'; }
        h += '<div class="two" style="margin-top:12px">' + [[tt('چاندی · XAG/USD', 'Silver · XAG/USD'), c.ag, pv && pv.ag], [tt('پلاٹینم · XPT/USD', 'Platinum · XPT/USD'), c.ap, pv && pv.ap], [tt('سونا فی گرام', 'Gold per gram'), c.au / OZ, pv && pv.au && pv.au / OZ], [tt('سونا/چاندی تناسب', 'Gold / silver ratio'), 0, 0]].map(function (x, i) { return '<div style="background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px"><small class="mut" style="font-size:11px">' + x[0] + '</small><div style="font-family:system-ui;font-weight:800;font-size:18px;direction:ltr;text-align:start">' + (i === 3 ? (c.ag ? (c.au / c.ag).toFixed(1) : '–') : (x[1] ? '$' + x[1].toLocaleString('en', { maximumFractionDigits: 2 }) : '–')) + '</div>' + (i < 3 ? chg(x[1], x[2]) : '') + '</div>'; }).join('') + '</div></div>';
      }
      h += '<div class="sh"><h2>' + tt('فاریکس جوڑے', 'Forex pairs') + '</h2><button class="sbtn" id="pedit" style="min-height:32px;padding:0 12px">' + tt('فہرست بدلیں', 'Edit list') + '</button></div><div class="card">' + PAIRS.filter(function (p) { return sel.indexOf(p[0] + '/' + p[1]) >= 0; }).map(function (p) {
        var v = fx(c.r, p[0], p[1]), pvv = pv && pv.r ? fx(pv.r, p[0], p[1]) : 0;
        return '<div class="ent"><span class="dd" style="background:var(--bg);font-size:20px">' + p[2] + '</span><div class="m"><b>' + p[0] + ' / ' + p[1] + '</b></div><div style="text-align:end"><span class="v" style="display:block">' + v.toFixed(v > 20 ? 2 : 4) + '</span>' + chg(v, pvv) + '</div></div>';
      }).join('') + '</div>';
      h += '<div class="card"><b>' + tt('کوئی بھی جوڑا کنورٹ کریں', 'Any pair converter') + '</b><div class="two"><input class="inp" id="xa" type="number" inputmode="decimal" value="' + RF2.a + '"><select class="sel" id="xf">' + ALLC.filter(function (x) { return c.r[x]; }).map(function (x) { return '<option' + (x === RF2.f ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div><div class="two" style="margin-top:6px"><div class="big2" id="xo" style="padding-top:8px;font-size:24px;color:var(--acc)"></div><select class="sel" id="xt">' + ALLC.filter(function (x) { return c.r[x]; }).map(function (x) { return '<option' + (x === RF2.t ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>';
    } else h += '<div class="card center"><div class="spin"></div></div>';
    if (c && RF2.tab === 'pk') h += '<div class="card"><b>' + tt('کنورٹر', 'Converter') + '</b><div class="two"><input class="inp" id="ra" type="number" inputmode="decimal" value="' + RF2.amt + '"><select class="sel" id="rf">' + CUR.concat(['PKR']).map(function (x) { return '<option' + (x === RF2.from ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div><div class="big2" id="ro" style="margin-top:10px"></div></div>';
    $('#body').innerHTML = h + '<p class="note">' + tt('ڈیٹا open.er-api.com اور gold-api.com سے، انٹرنیٹ درکار۔ عالمی اسپاٹ قیمتیں ہیں، مقامی صرافہ ریٹ نہیں۔ فرق کا نشان پچھلے دن کی محفوظ قیمت سے نکلتا ہے، اس لیے دوسرے دن سے نظر آئے گا۔', 'Data from open.er-api.com and gold-api.com, internet needed. World spot prices, not local sarafa rates. Changes compare with the last day saved on your phone, so they appear from the second day.') + '</p>' + CL.footer();
    bind('rtab', function (v) { RF2.tab = v; vRates(); });
    function conv() { if (!c || !$('#ra')) return; var a = num($('#ra').value) || 0, f = $('#rf').value; RF2.amt = $('#ra').value; RF2.from = f; var inPkr = f === 'PKR' ? a : a * c.r.PKR / c.r[f]; $('#ro').innerHTML = f === 'PKR' ? CUR.slice(0, 4).map(function (x) { return '<div style="font-size:16px">' + (inPkr * c.r[x] / c.r.PKR).toFixed(2) + ' ' + x + '</div>'; }).join('') : 'Rs ' + inPkr.toLocaleString('en', { maximumFractionDigits: 0 }); }
    if (c && $('#ra')) { $('#ra').oninput = conv; $('#rf').onchange = conv; conv(); }
    function xconv() { var a = num($('#xa').value) || 0; RF2.a = $('#xa').value; RF2.f = $('#xf').value; RF2.t = $('#xt').value; $('#xo').textContent = (a * c.r[RF2.t] / c.r[RF2.f]).toLocaleString('en', { maximumFractionDigits: 4 }); }
    if (c && $('#xa')) { $('#xa').oninput = xconv; $('#xf').onchange = xconv; $('#xt').onchange = xconv; xconv(); }
    if ($('#pedit')) $('#pedit').onclick = function () {
      var m = $("#modal"), sel2 = lget("pairs", DEFP).slice(); m.hidden = false;
      function dr() { $('#sheet').innerHTML = '<b style="font-size:17px">' + tt('کون سے جوڑے دکھائیں', 'Pairs to show') + '</b><div class="chips">' + PAIRS.map(function (p) { var k = p[0] + '/' + p[1]; return '<button class="chip' + (sel2.indexOf(k) >= 0 ? ' on' : '') + '" data-pp="' + k + '">' + p[2] + ' ' + k + '</button>'; }).join('') + '</div><button class="btn" id="pdn">' + T('ٹھیک ہے', 'Done') + '</button>'; bind('pp', function (k) { var i = sel2.indexOf(k); if (i >= 0) sel2.splice(i, 1); else sel2.push(k); dr(); }); $('#pdn').onclick = function () { lset('pairs', sel2); m.hidden = true; vRates(); }; }
      dr();
    };
    if (!c || Date.now() - c.t > 1800000) loadRates().then(function () { if (S.view === 'rates') vRates(); }).catch(function () { if (S.view === 'rates' && !c) $('#body').insertAdjacentHTML('afterbegin', '<div class="warn">' + tt('انٹرنیٹ نہیں ہے، ریٹس نہیں آ سکے۔', 'No internet; could not load rates.') + '</div>'); });
  }
  V.rates = vRates;
  CL.ratesCache = function () { return lget('rcache', null); };

  /* ================= CALCULATORS ================= */
  var CF = { tab: 'zakat', cat: 'area', from: 0, to: 1, basis: 'silver' };
  var UN = { area: [['مرلہ', 'Marla', 272.25], ['کنال', 'Kanal', 5445], ['مربع فٹ', 'Sq ft', 1], ['مربع گز', 'Sq yard', 9], ['مربع میٹر', 'Sq metre', 10.7639], ['ایکڑ', 'Acre', 43560]], weight: [['گرام', 'Gram', 1], ['کلو', 'Kg', 1000], ['تولہ', 'Tola', 11.6638], ['ماشہ', 'Masha', 0.97198], ['سیر', 'Seer', 933.1], ['اونس', 'Ounce', 28.3495], ['پاؤنڈ', 'Pound', 453.592]], length: [['میٹر', 'Metre', 1], ['کلومیٹر', 'Km', 1000], ['فٹ', 'Foot', 0.3048], ['انچ', 'Inch', 0.0254], ['میل', 'Mile', 1609.34]], temp: [['سیلسیئس', '°C', 0], ['فارن ہائٹ', '°F', 0]] };
  function vCalc() {
    CL.setTop(T('کیلکولیٹر', 'Calculators'));
    var h = chips([['zakat', ['زکوٰۃ', 'Zakat']], ['emi', ['قسط / EMI', 'EMI']], ['unit', ['یونٹ', 'Units']]], CF.tab, 'ct').replace('class="chips"', 'class="chips" style="margin-top:8px"');
    var rc = CL.ratesCache(), g = rc && rc.au ? Math.round(rc.au / OZ * rc.r.PKR * TOLA) : '', sv = rc && rc.ag ? Math.round(rc.ag / OZ * rc.r.PKR * TOLA) : '';
    if (CF.tab === 'zakat') {
      h += '<div class="card"><span class="fl" style="margin-top:0">' + tt('سونا (تولہ)', 'Gold (tola)') + '</span><input class="inp zk" id="zg" type="number" inputmode="decimal"><span class="fl">' + tt('چاندی (تولہ)', 'Silver (tola)') + '</span><input class="inp zk" id="zs" type="number" inputmode="decimal"><span class="fl">' + tt('نقدی، بینک، سیونگ (Rs)', 'Cash, bank, savings (Rs)') + '</span><input class="inp zk" id="zc" type="number" inputmode="decimal"><span class="fl">' + tt('تجارتی مال / سرمایہ کاری (Rs)', 'Business goods / investments (Rs)') + '</span><input class="inp zk" id="zb" type="number" inputmode="decimal"><span class="fl">' + tt('قرض جو آپ کو دینا ہے (Rs)', 'Debts you owe (Rs)') + '</span><input class="inp zk" id="zd" type="number" inputmode="decimal">' +
        '<div class="two"><div><span class="fl">' + tt('سونا فی تولہ (Rs)', 'Gold per tola (Rs)') + '</span><input class="inp zk" id="zpg" type="number" value="' + g + '"></div><div><span class="fl">' + tt('چاندی فی تولہ (Rs)', 'Silver per tola (Rs)') + '</span><input class="inp zk" id="zps" type="number" value="' + sv + '"></div></div>' +
        '<span class="fl">' + tt('نصاب کی بنیاد', 'Nisab basis') + '</span>' + chips([['silver', ['چاندی (52.5 تولہ)', 'Silver (52.5 tola)']], ['gold', ['سونا (7.5 تولہ)', 'Gold (7.5 tola)']]], CF.basis, 'zb') + '</div><div class="lhero" id="zout"></div><p class="note">' + tt('ریٹ انٹرنیٹ سے بھرنے کے لیے "ریٹس" صفحہ ایک بار کھولیں۔ زکوٰۃ کے مسائل میں اپنے عالم سے تصدیق کر لیں۔', 'Open the Rates page once to fill prices from the internet. Confirm zakat rulings with your scholar.') + '</p>';
    } else if (CF.tab === 'emi') {
      h += '<div class="card"><span class="fl" style="margin-top:0">' + tt('قرض / قیمت (Rs)', 'Loan amount (Rs)') + '</span><input class="inp ec" id="ep" type="number" inputmode="decimal" value="1000000"><span class="fl">' + tt('سالانہ منافع (%)', 'Annual rate (%)') + '</span><input class="inp ec" id="er" type="number" inputmode="decimal" value="18"><span class="fl">' + tt('مدت (مہینے)', 'Months') + '</span><input class="inp ec" id="em" type="number" inputmode="numeric" value="36"></div><div class="lhero" id="eout"></div>';
    } else {
      var cat = UN[CF.cat], opt = function (sel) { return cat.map(function (u, i) { return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + L([u[0], u[1]]) + '</option>'; }).join(''); };
      h += chips([['area', ['رقبہ', 'Area']], ['weight', ['وزن', 'Weight']], ['length', ['لمبائی', 'Length']], ['temp', ['درجہ حرارت', 'Temperature']]], CF.cat, 'cc') + '<div class="card"><input class="inp uc" id="ua" type="number" inputmode="decimal" value="1" style="margin-top:0"><div class="two"><select class="sel" id="uf">' + opt(CF.from) + '</select><select class="sel" id="ut">' + opt(CF.to) + '</select></div><div class="big2" id="uo" style="margin-top:12px"></div></div>';
    }
    $('#body').innerHTML = h + CL.footer();
    bind('ct', function (v) { CF.tab = v; vCalc(); }); bind('cc', function (v) { CF.cat = v; CF.from = 0; CF.to = 1; vCalc(); }); bind('zb', function (v) { CF.basis = v; vCalc(); });
    function f0(n) { return n.toLocaleString('en', { maximumFractionDigits: 0 }); }
    if (CF.tab === 'zakat') {
      var zc = function () {
        var v = function (id) { return num($('#' + id).value) || 0; }, pg = v('zpg'), ps = v('zps'), assets = v('zg') * pg + v('zs') * ps + v('zc') + v('zb'), net = assets - v('zd'), ns = 52.5 * ps, ng = 7.5 * pg, nis = CF.basis === 'silver' ? ns : ng, due = nis > 0 && net >= nis;
        $('#zout').innerHTML = '<div class="kv"><span>' + tt('کل مال', 'Total assets') + '</span><b>' + rs(assets) + '</b></div><div class="kv"><span>' + tt('قرض کے بعد', 'After debts') + '</span><b>' + rs(net) + '</b></div><div class="kv"><span>' + tt('نصاب', 'Nisab') + '</span><b>' + (nis ? rs(nis) : '–') + '</b></div><div class="big2" style="margin-top:10px;color:' + (due ? 'var(--acc)' : 'var(--mut)') + '">' + (due ? rs(net * 0.025) : tt('زکوٰۃ واجب نہیں', 'No zakat due')) + '</div>' + (due ? '<div class="mut">' + tt('2.5٪ زکوٰۃ', '2.5% zakat') + '</div>' : (nis ? '' : '<div class="mut">' + tt('سونے/چاندی کا ریٹ لکھیں', 'Enter gold/silver prices') + '</div>'));
      };
      [].forEach.call(document.querySelectorAll('.zk'), function (e) { e.oninput = zc; }); zc();
    } else if (CF.tab === 'emi') {
      var ecf = function () {
        var p = num($('#ep').value) || 0, r = (num($('#er').value) || 0) / 1200, n = Math.round(num($('#em').value) || 0), e = n ? (r ? p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : p / n) : 0;
        $('#eout').innerHTML = '<div class="mut">' + tt('ماہانہ قسط', 'Monthly instalment') + '</div><div class="big2" style="color:var(--acc)">' + rs(e) + '</div><div class="kv"><span>' + tt('کل ادائیگی', 'Total payment') + '</span><b>' + rs(e * n) + '</b></div><div class="kv"><span>' + tt('کل منافع', 'Total interest') + '</span><b>' + rs(e * n - p) + '</b></div>';
      };
      [].forEach.call(document.querySelectorAll('.ec'), function (e) { e.oninput = ecf; }); ecf();
    } else {
      var ucf = function () {
        var a = num($('#ua').value) || 0, i = +$('#uf').value, j = +$('#ut').value; CF.from = i; CF.to = j; var out;
        if (CF.cat === 'temp') out = i === j ? a : (i === 0 ? a * 9 / 5 + 32 : (a - 32) * 5 / 9); else out = a * UN[CF.cat][i][2] / UN[CF.cat][j][2];
        $('#uo').textContent = (Math.round(out * 10000) / 10000).toLocaleString('en', { maximumFractionDigits: 4 }) + ' ' + L([UN[CF.cat][j][0], UN[CF.cat][j][1]]);
      };
      $('#ua').oninput = ucf; $('#uf').onchange = ucf; $('#ut').onchange = ucf; ucf();
    }
  }
  V.calc = vCalc;

  /* ================= EMAIL WRITER ================= */
  var EM = { type: 'leave', lang: 'en', tone: 'formal', to: '', me: '', rcpt: '', a: '', d1: '', d2: '', ref: '' };
  var ET = [['leave', ['چھٹی کی درخواست', 'Leave request'], 'Leave Application'], ['appt', ['ملاقات / اپوائنٹمنٹ', 'Appointment'], 'Appointment Request'], ['complaint', ['شکایت', 'Complaint'], 'Complaint'], ['follow', ['یاد دہانی / فالو اپ', 'Follow-up'], 'Follow-up'], ['thanks', ['شکریہ', 'Thank you'], 'Thank You'], ['job', ['نوکری کی درخواست', 'Job application'], 'Job Application'], ['resign', ['استعفیٰ', 'Resignation'], 'Resignation'], ['pay', ['ادائیگی کی یاد دہانی', 'Payment reminder'], 'Payment Reminder']];
  function mkEmail(f) {
    var en = f.lang === 'en', fo = f.tone === 'formal', sh = f.tone === 'short', me = f.me || (en ? '[Your name]' : '[آپ کا نام]'), r = f.rcpt || (en ? (fo ? 'Sir/Madam' : 'there') : 'محترم'), a = f.a.trim(), d1 = f.d1, d2 = f.d2, ref = f.ref;
    var hi = en ? (fo ? 'Dear ' + r + ',' : 'Hi ' + r + ',') : 'السلام علیکم ' + r + '،', bye = en ? (fo ? 'Yours sincerely,\n' : 'Best regards,\n') + me : 'والسلام،\n' + me, subj, body = [];
    var dt = d1 ? (d2 && d2 !== d1 ? (en ? 'from ' + d1 + ' to ' + d2 : d1 + ' سے ' + d2 + ' تک') : (en ? 'on ' + d1 : d1 + ' کو')) : '';
    if (f.type === 'leave') { subj = en ? 'Leave application' + (d1 ? ' – ' + d1 : '') : 'چھٹی کی درخواست'; body = [en ? 'I am writing to request leave ' + dt + (a ? ' due to ' + a : '') + '.' + (sh ? '' : ' I will make sure my pending work is handled before I leave and I will be reachable in case of urgency.') : 'گزارش ہے کہ مجھے ' + dt + ' چھٹی درکار ہے' + (a ? '، وجہ: ' + a : '') + '۔ براہ کرم منظور فرمائیں۔']; }
    else if (f.type === 'appt') { subj = en ? 'Request for an appointment' : 'ملاقات کی درخواست'; body = [en ? 'I would like to request an appointment' + (dt ? ' ' + dt : '') + (a ? ' regarding ' + a : '') + '.' + (sh ? '' : ' Please let me know a time that suits you.') : 'میں ' + (dt ? dt + ' ' : '') + 'ملاقات کا وقت لینا چاہتا ہوں' + (a ? '، موضوع: ' + a : '') + '۔ آپ کو جو وقت مناسب ہو بتا دیں۔']; }
    else if (f.type === 'complaint') { subj = en ? 'Complaint' + (ref ? ' – ' + ref : '') : 'شکایت' + (ref ? ' – ' + ref : ''); body = [en ? 'I am writing to complain about ' + (a || 'the issue I experienced') + (ref ? ' (reference: ' + ref + ')' : '') + '.' + (sh ? '' : ' This has caused me inconvenience, and I would appreciate it if you could look into it and resolve it at the earliest.') : 'میں ' + (a || 'اپنے مسئلے') + ' کی شکایت کرنا چاہتا ہوں' + (ref ? ' (حوالہ: ' + ref + ')' : '') + '۔ براہ کرم جلد از جلد اس کا ازالہ کریں۔']; }
    else if (f.type === 'follow') { subj = en ? 'Following up' + (ref ? ' – ' + ref : '') : 'یاد دہانی' + (ref ? ' – ' + ref : ''); body = [en ? 'I am following up on ' + (a || 'my earlier message') + (ref ? ' (' + ref + ')' : '') + '.' + (sh ? '' : ' I would be grateful for an update when you have a moment.') : 'میں ' + (a || 'اپنے پچھلے پیغام') + ' کے بارے میں یاد دہانی کرانا چاہتا ہوں۔ اپنی سہولت سے جواب دے دیں۔']; }
    else if (f.type === 'thanks') { subj = en ? 'Thank you' : 'شکریہ'; body = [en ? 'Thank you very much for ' + (a || 'your help') + '.' + (sh ? '' : ' I truly appreciate your time and support.') : 'آپ کا ' + (a || 'تعاون') + ' کے لیے بہت شکریہ۔ آپ کی مہربانی کا شکر گزار ہوں۔']; }
    else if (f.type === 'job') { subj = en ? 'Application for ' + (ref || 'the position') : (ref || 'ملازمت') + ' کے لیے درخواست'; body = [en ? 'I would like to apply for the position of ' + (ref || '[position]') + '.' + (a ? ' ' + a : '') + (sh ? '' : ' My CV is attached for your review. I would welcome the chance to discuss how I can contribute to your team.') : 'میں ' + (ref || '[عہدہ]') + ' کی آسامی کے لیے درخواست دینا چاہتا ہوں۔' + (a ? ' ' + a : '') + ' میرا سی وی ساتھ منسلک ہے۔']; }
    else if (f.type === 'resign') { subj = en ? 'Resignation' : 'استعفیٰ'; body = [en ? 'Please accept this email as my formal resignation' + (ref ? ' from the position of ' + ref : '') + (d1 ? ', with my last working day being ' + d1 : '') + '.' + (a ? ' ' + a : '') + (sh ? '' : ' Thank you for the opportunities and I will help with a smooth handover.') : 'میں ' + (ref ? ref + ' کے عہدے سے ' : '') + 'اپنا استعفیٰ پیش کرتا ہوں' + (d1 ? '، آخری کام کا دن ' + d1 : '') + '۔' + (a ? ' ' + a : '') + ' آپ کی مہربانیوں کا شکریہ۔']; }
    else { subj = en ? 'Payment reminder' + (ref ? ' – ' + ref : '') : 'ادائیگی کی یاد دہانی'; body = [en ? 'This is a ' + (fo ? 'gentle ' : 'friendly ') + 'reminder about ' + (a || 'the pending payment') + (ref ? ' (' + ref + ')' : '') + (d1 ? ', which was due ' + (en ? 'on ' + d1 : '') : '') + '.' + (sh ? '' : ' Kindly arrange the payment at your earliest convenience, and let me know if you have any questions.') : 'ادائیگی کی ' + (a ? a + ' کے بارے میں ' : '') + 'یاد دہانی ہے' + (d1 ? '، آخری تاریخ ' + d1 : '') + '۔ براہ کرم جلد ادائیگی کر دیں۔']; }
    return { subject: subj, body: hi + '\n\n' + body.join('\n\n') + '\n\n' + bye };
  }
  function vEmail() {
    CL.setTop(T('ای میل لکھیں', 'Email writer'));
    var o = mkEmail(EM), isDate = EM.type === 'leave' || EM.type === 'resign' || EM.type === 'pay', isRef = EM.type !== 'leave' && EM.type !== 'thanks';
    var h = '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('کس قسم کی ای میل', 'What kind of email') + '</span>' + chips(ET.map(function (x) { return [x[0], x[1]]; }), EM.type, 'et') + '<span class="fl">' + tt('زبان اور انداز', 'Language and tone') + '</span>' + chips([['en', ['English', 'English']], ['ur', ['اردو', 'Urdu']]], EM.lang, 'el') + chips([['formal', ['رسمی', 'Formal']], ['friendly', ['دوستانہ', 'Friendly']], ['short', ['مختصر', 'Short']]], EM.tone, 'eto') +
      '<div class="two"><div><span class="fl">' + tt('آپ کا نام', 'Your name') + '</span><input class="inp ef" id="fm" value="' + esc(EM.me || lget('profile', {}).name || '') + '" style="direction:auto"></div><div><span class="fl">' + tt('وصول کنندہ کا نام', 'Recipient name') + '</span><input class="inp ef" id="fr" value="' + esc(EM.rcpt) + '" style="direction:auto"></div></div><span class="fl">' + tt('ای میل ایڈریس', 'Email address') + '</span><input class="inp ef" id="ft" type="email" value="' + esc(EM.to) + '">' +
      (isDate ? '<div class="two"><div><span class="fl">' + tt('تاریخ سے', 'Date / from') + '</span><input class="inp ef" id="fd1" value="' + esc(EM.d1) + '" placeholder="5 Nov"></div><div><span class="fl">' + tt('تاریخ تک', 'To') + '</span><input class="inp ef" id="fd2" value="' + esc(EM.d2) + '" placeholder="7 Nov"></div></div>' : '') +
      (isRef ? '<span class="fl">' + tt(EM.type === 'job' ? 'عہدہ' : 'حوالہ نمبر / عہدہ', EM.type === 'job' ? 'Position' : 'Reference / position') + '</span><input class="inp ef" id="fref" value="' + esc(EM.ref) + '" style="direction:auto">' : '') +
      '<span class="fl">' + tt('وجہ / تفصیل', 'Reason / details') + '</span><textarea class="inp ef" id="fa" rows="3" style="min-height:80px;font-size:15px;direction:auto">' + esc(EM.a) + '</textarea>' + CL.micHtml('fmic', tt('بول کر تفصیل لکھیں', 'Dictate the details')) + '</div>';
    h += '<div class="card"><b>' + tt('تیار ای میل', 'Your email') + '</b><div class="kv" style="margin-top:6px"><span>' + tt('موضوع', 'Subject') + '</span><b style="direction:auto;font-family:inherit;text-align:end">' + esc(o.subject) + '</b></div><pre id="eprev" style="white-space:pre-wrap;font:inherit;font-size:14.5px;line-height:1.7;margin-top:8px;direction:' + (EM.lang === 'en' ? 'ltr' : 'rtl') + ';text-align:start">' + esc(o.body) + '</pre></div>' +
      '<button class="btn" id="eopen">' + ico('mail') + ' ' + T('ای میل ایپ میں کھولیں', 'Open in email app') + '</button><div class="two" style="margin-top:10px"><button class="sbtn" id="ecp">' + ico('copy') + ' ' + tt('کاپی', 'Copy') + '</button><button class="sbtn" id="ewa">' + ico('share') + ' WhatsApp</button></div><p class="note">' + tt('یہ تیار شدہ نمونوں سے بنتی ہے، خود AI نہیں؛ بھیجنے سے پہلے پڑھ لیں۔ آپ کی ای میل صرف آپ کی ای میل ایپ تک جاتی ہے۔', 'These are built from ready templates (not AI). Read before sending. The email only goes to your own email app.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    function keep() { [['fm', 'me'], ['fr', 'rcpt'], ['ft', 'to'], ['fd1', 'd1'], ['fd2', 'd2'], ['fref', 'ref'], ['fa', 'a']].forEach(function (x) { var e = $('#' + x[0]); if (e) EM[x[1]] = e.value; }); }
    function upd() { keep(); var q = mkEmail(EM); $('#eprev').textContent = q.body; $('#body').querySelector('.kv b').textContent = q.subject; }
    [].forEach.call(document.querySelectorAll('.ef'), function (e) { e.oninput = upd; });
    bind('et', function (v) { keep(); EM.type = v; vEmail(); }); bind('el', function (v) { keep(); EM.lang = v; vEmail(); }); bind('eto', function (v) { keep(); EM.tone = v; vEmail(); });
    CL.micBind('fmic', function (t) { keep(); EM.a = (EM.a ? EM.a + ' ' : '') + t; vEmail(); });
    $('#eopen').onclick = function () { keep(); var q = mkEmail(EM); openUrl('mailto:' + encodeURIComponent(EM.to.trim()) + '?subject=' + encodeURIComponent(q.subject) + '&body=' + encodeURIComponent(q.body)); };
    $('#ecp').onclick = function () { keep(); var q = mkEmail(EM); copyText(q.subject + '\n\n' + q.body); };
    $('#ewa').onclick = function () { keep(); var q = mkEmail(EM); openUrl('https://wa.me/?text=' + encodeURIComponent(q.subject + '\n\n' + q.body)); };
  }
  V.email = vEmail;

  /* ================= HABITS ================= */
  function vHabits() {
    CL.setTop(T('عادتیں', 'Habits'));
    var hs = lget('habits', null);
    if (!hs) { hs = [['نماز', 'Prayers'], ['قرآن', 'Quran'], ['ورزش', 'Exercise'], ['پانی', 'Water']].map(function (n) { return { id: uid(), n: n }; }); lset('habits', hs); }
    var lg = lget('hlog', {}), days = []; for (var i = 6; i >= 0; i--) days.push(new Date(Date.now() - i * 86400000));
    function streak(id) { var s = 0, d = new Date(); if (!(lg[id] || {})[dkey(d)]) d = new Date(Date.now() - 86400000); while ((lg[id] || {})[dkey(d)]) { s++; d = new Date(d.getTime() - 86400000); } return s; }
    var h = '<div class="card" style="margin-top:8px;overflow-x:auto"><div class="ent" style="direction:ltr;border:0"><div class="m" style="min-width:90px"></div>' + days.map(function (d) { return '<span style="width:34px;text-align:center;font-size:11px;color:var(--mut)">' + d.toLocaleDateString('en-GB', { weekday: 'narrow' }) + d.getDate() + '</span>'; }).join('') + '</div>' + hs.map(function (x) {
      var st = streak(x.id); return '<div class="ent" style="direction:ltr"><div class="m" style="min-width:90px;direction:' + (PREF.lang === 'en' ? 'ltr' : 'rtl') + '"><b>' + (typeof x.n === 'string' ? esc(x.n) : L(x.n)) + '</b><small>' + (st ? '🔥 ' + st + tt(' دن', ' days') : '') + '</small></div>' + days.map(function (d) { var k = dkey(d), on = (lg[x.id] || {})[k]; return '<button class="gl' + (on ? ' f' : '') + '" data-hk="' + x.id + '|' + k + '" style="width:34px;height:34px;border-radius:10px;padding:0;align-items:center">' + (on ? ico('check') : '') + '</button>'; }).join('') + '<button class="x" data-hd="' + x.id + '" aria-label="delete" style="width:28px">' + ico('trash') + '</button></div>';
    }).join('') + '</div><div class="card"><div class="two"><input class="inp" id="hn" placeholder="' + tt('نئی عادت', 'New habit') + '" style="margin-top:0;direction:auto"><button class="sbtn p" id="ha">' + ico('plus') + ' ' + tt('شامل', 'Add') + '</button></div></div>' + CL.footer();
    $('#body').innerHTML = h;
    bind('hk', function (v) { var p = v.split('|'); var l = lget('hlog', {}); l[p[0]] = l[p[0]] || {}; if (l[p[0]][p[1]]) delete l[p[0]][p[1]]; else l[p[0]][p[1]] = 1; lset('hlog', l); var y = $('#body').scrollTop; vHabits(); $('#body').scrollTop = y; });
    bind('hd', function (id) { lset('habits', hs.filter(function (x) { return x.id !== id; })); vHabits(); });
    $('#ha').onclick = function () { var n = $('#hn').value.trim(); if (!n) return; hs.push({ id: uid(), n: n }); lset('habits', hs); vHabits(); };
  }
  V.habits = vHabits;

  /* ================= JOURNAL ================= */
  var JF = { mood: 3 }, MOODS = ['😞', '😕', '😐', '🙂', '😄'];
  function vJournal() {
    CL.setTop(T('ڈائری', 'Journal'));
    var l = lget('journal', []);
    var h = '<div class="card" style="margin-top:8px"><b>' + tt('آج کیسا رہا؟', 'How was today?') + '</b><div class="chips">' + MOODS.map(function (m, i) { return '<button class="chip' + (JF.mood === i ? ' on' : '') + '" data-jm="' + i + '" style="font-size:22px;padding:2px 12px">' + m + '</button>'; }).join('') + '</div><textarea class="inp" id="jt" rows="4" style="min-height:100px;font-size:15px;direction:auto" placeholder="' + tt('آج کے بارے میں لکھیں…', 'Write about your day…') + '"></textarea>' + CL.micHtml('jmic', tt('بول کر لکھیں', 'Dictate')) + '<button class="btn" id="jsave">' + T('محفوظ کریں', 'Save') + '</button></div><div class="card">' + (l.length ? l.slice().reverse().slice(0, 40).map(function (e) {
      var k = dkey(new Date(e.t)), w = (lget('water', {})[k] || 0), sp = 0; lget('exp', []).forEach(function (x) { if (dkey(new Date(x.t)) === k) sp += x.amt; });
      return '<div class="ent" style="align-items:flex-start"><span style="font-size:26px">' + MOODS[e.m] + '</span><div class="m"><b style="white-space:pre-wrap;font-weight:500;direction:auto">' + esc(e.x) + '</b><small>' + U.fday(e.t) + ' · 💧' + w + (sp ? ' · ' + rs(sp) : '') + '</small></div><button class="x" data-jd="' + e.id + '" aria-label="delete">' + ico('trash') + '</button></div>';
    }).join('') : '<p class="mut center">' + tt('ابھی کوئی اندراج نہیں', 'No entries yet') + '</p>') + '</div>' + CL.footer();
    $('#body').innerHTML = h;
    bind('jm', function (v) { JF.mood = +v; var t = $('#jt').value; vJournal(); $('#jt').value = t; });
    bind('jd', function (id) { lset('journal', lget('journal', []).filter(function (x) { return x.id !== id; })); vJournal(); });
    CL.micBind('jmic', function (t) { var e = $('#jt'); e.value = (e.value ? e.value + ' ' : '') + t; });
    $('#jsave').onclick = function () { var t = $('#jt').value.trim(); if (!t) { CL.toast('کچھ لکھیں', 'Write something'); return; } var a = lget('journal', []); a.push({ id: uid(), t: Date.now(), m: JF.mood, x: t }); lset('journal', a); vJournal(); };
  }
  V.journal = vJournal;

  /* ================= WEEKLY SUMMARY + DOCTOR REPORT ================= */
  var WF = { tab: 'week', days: null };
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function reportText(kind) {
    var p = lget('profile', {}), now = Date.now(), d = kind === 'doc' ? 30 : 7, since = now - d * 86400000, sg = lget('sugar', []).filter(function (x) { return x.t >= since; }).sort(function (a, b) { return a.t - b.t; }), bp = lget('bp', []).filter(function (x) { return x.t >= since; }).sort(function (a, b) { return a.t - b.t; }), wt = lget('weight', []).filter(function (x) { return x.t >= since; });
    var t = 'Cleanova Life – ' + (kind === 'doc' ? 'Health report (last 30 days)' : 'Weekly summary') + '\n' + (p.name ? p.name + (p.age ? ', ' + p.age + ' y' : '') + '\n' : '') + new Date().toLocaleDateString('en-GB') + '\n';
    if (sg.length) { t += '\nBLOOD SUGAR (mg/dL) – ' + sg.length + ' readings, avg ' + Math.round(avg(sg.map(function (x) { return x.v; }))) + ', min ' + Math.min.apply(null, sg.map(function (x) { return x.v; })) + ', max ' + Math.max.apply(null, sg.map(function (x) { return x.v; })) + '\n'; if (kind === 'doc') sg.forEach(function (x) { t += new Date(x.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + pad(new Date(x.t).getHours()) + ':' + pad(new Date(x.t).getMinutes()) + '  ' + x.v + '  (' + ({ fast: 'fasting', after: '2h after meal', bed: 'bedtime', rand: 'random' }[x.ctx]) + ')\n'; }); }
    if (bp.length) { t += '\nBLOOD PRESSURE (mmHg) – ' + bp.length + ' readings, avg ' + Math.round(avg(bp.map(function (x) { return x.s; }))) + '/' + Math.round(avg(bp.map(function (x) { return x.d; }))) + '\n'; if (kind === 'doc') bp.forEach(function (x) { t += new Date(x.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '  ' + x.s + '/' + x.d + (x.p ? '  pulse ' + x.p : '') + '\n'; }); }
    if (wt.length) t += '\nWEIGHT: ' + wt[0].kg + ' → ' + wt[wt.length - 1].kg + ' kg\n';
    var meds = lget('rem', []).filter(function (r) { return r.cat === 'med'; }); if (meds.length && kind === 'doc') t += '\nMEDICINES: ' + meds.map(function (m) { return m.title; }).join(', ') + '\n';
    var em = lget('emerg', {}); if (kind === 'doc' && (em.cond || em.allergy)) t += '\nConditions: ' + (em.cond || '-') + '\nAllergies: ' + (em.allergy || '-') + '\n';
    if (kind !== 'doc') { var w = lget('water', {}), ws = []; for (var i = 0; i < 7; i++) ws.push(w[dkey(new Date(now - i * 86400000))] || 0); t += '\nWater: avg ' + avg(ws).toFixed(1) + ' glasses/day\nSpending: ' + rs(U.spentOn(now - 7 * 86400000, now + 1)) + '\n'; if (WF.days) t += 'Travel: ' + CL.km(WF.days.reduce(function (a, x) { return a + x.distance; }, 0)) + ', steps ' + Math.round(WF.days.reduce(function (a, x) { return a + x.steps; }, 0)).toLocaleString('en') + '\n'; }
    return t + '\nPersonal log from Cleanova Life; not a medical record.';
  }
  function vWeek() {
    CL.setTop(T('رپورٹ', 'Reports'));
    if (!WF.days) TP.dayList({ days: 7 }).then(function (r) { WF.days = (r && r.days) || []; if (S.view === 'week') vWeek(); }).catch(function () { WF.days = []; });
    var now = Date.now(), h = chips([['week', ['ہفتہ وار خلاصہ', 'Weekly summary']], ['doc', ['ڈاکٹر کے لیے رپورٹ', 'Doctor report']]], WF.tab, 'wt').replace('class="chips"', 'class="chips" style="margin-top:8px"');
    if (WF.tab === 'week') {
      var ds = WF.days || [], w = lget('water', {}), wv = [], sv = [], lb = [], ex = lget('exp', []);
      for (var i = 6; i >= 0; i--) { var dd = new Date(now - i * 86400000), k = dkey(dd); wv.push(w[k] || 0); var s = 0; ex.forEach(function (x) { if (dkey(new Date(x.t)) === k) s += x.amt; }); sv.push(s); lb.push(dd.getDate()); }
      var sg = lget('sugar', []).filter(function (x) { return x.t > now - 7 * 86400000; }), bp = lget('bp', []).filter(function (x) { return x.t > now - 7 * 86400000; }), hs = lget('habits', []), lg = lget('hlog', {}), done = 0;
      hs.forEach(function (x) { for (var j = 0; j < 7; j++) if ((lg[x.id] || {})[dkey(new Date(now - j * 86400000))]) done++; });
      h += '<div class="stat"><div><b>' + CL.km(ds.reduce(function (a, x) { return a + x.distance; }, 0)) + '</b><small>' + tt('کل سفر', 'Travelled') + '</small></div><div><b>' + Math.round(ds.reduce(function (a, x) { return a + x.steps; }, 0)).toLocaleString('en') + '</b><small>' + tt('قدم', 'Steps') + '</small></div><div><b>' + rs(sv.reduce(function (a, b) { return a + b; }, 0)) + '</b><small>' + tt('خرچ', 'Spent') + '</small></div></div>' +
        '<div class="stat"><div><b>' + (sg.length ? Math.round(avg(sg.map(function (x) { return x.v; }))) : '–') + '</b><small>' + tt('شوگر اوسط', 'Avg sugar') + '</small></div><div><b>' + (bp.length ? Math.round(avg(bp.map(function (x) { return x.s; }))) + '/' + Math.round(avg(bp.map(function (x) { return x.d; }))) : '–') + '</b><small>' + tt('بی پی اوسط', 'Avg BP') + '</small></div><div><b>' + (hs.length ? Math.round(done / (hs.length * 7) * 100) + '%' : '–') + '</b><small>' + tt('عادتیں مکمل', 'Habits done') + '</small></div></div>' +
        '<div class="card"><b>' + tt('پانی (گلاس)', 'Water (glasses)') + '</b>' + bars(wv, wv.map(function () { return 'rgb(var(--c3))'; }), lb) + '</div><div class="card"><b>' + tt('روزانہ خرچ', 'Daily spending') + '</b>' + bars(sv, sv.map(function () { return 'rgb(var(--c5))'; }), lb) + '</div>';
    }
    var txt = reportText(WF.tab);
    h += '<div class="card"><b>' + tt('شیئر کرنے کے لیے متن', 'Text to share') + '</b><pre style="white-space:pre-wrap;font:12.5px/1.6 system-ui,monospace;margin-top:8px;direction:ltr;text-align:start;max-height:260px;overflow:auto">' + esc(txt) + '</pre></div><div class="two"><button class="sbtn p" id="rwa">' + ico('share') + ' WhatsApp</button><button class="sbtn" id="rem2">' + ico('mail') + ' Email</button></div><button class="sbtn" id="rcp" style="margin-top:10px;width:100%">' + ico('copy') + ' ' + tt('کاپی', 'Copy') + '</button>' + (WF.tab === 'doc' ? disc() : '') + CL.footer();
    $('#body').innerHTML = h;
    bind('wt', function (v) { WF.tab = v; vWeek(); });
    $('#rwa').onclick = function () { openUrl('https://wa.me/?text=' + encodeURIComponent(txt)); };
    $('#rem2').onclick = function () { openUrl('mailto:?subject=' + encodeURIComponent(WF.tab === 'doc' ? 'Health report' : 'Weekly summary') + '&body=' + encodeURIComponent(txt)); };
    $('#rcp').onclick = function () { copyText(txt); };
  }
  V.week = vWeek;

  /* ================= FOOD LOG ================= */
  var FOODS = [['روٹی', 'Roti (1)', 100], ['پراٹھا', 'Paratha (1)', 260], ['نان', 'Naan (1)', 280], ['چاول (پلیٹ)', 'Rice (plate)', 260], ['بریانی (پلیٹ)', 'Biryani (plate)', 450], ['دال (کٹوری)', 'Daal (bowl)', 180], ['چکن سالن', 'Chicken curry', 250], ['گوشت سالن', 'Beef/mutton curry', 320], ['سبزی (کٹوری)', 'Vegetable curry', 120], ['ابلا انڈا', 'Boiled egg', 75], ['آملیٹ (2 انڈے)', 'Omelette (2 eggs)', 190], ['دودھ (گلاس)', 'Milk (glass)', 150], ['دہی (کٹوری)', 'Yogurt (bowl)', 100], ['میٹھی لسی', 'Sweet lassi', 200], ['چائے (کپ)', 'Tea with milk/sugar', 60], ['سموسہ', 'Samosa', 260], ['پکوڑے (4)', 'Pakora (4)', 200], ['سیب', 'Apple', 80], ['کیلا', 'Banana', 105], ['مالٹا', 'Orange', 65], ['آم', 'Mango', 150], ['کھجور (3)', 'Dates (3)', 70], ['امرود', 'Guava', 70], ['سلاد (پلیٹ)', 'Salad (plate)', 30], ['نہاری (پلیٹ)', 'Nihari (plate)', 500], ['حلیم (کٹوری)', 'Haleem (bowl)', 350], ['کڑاہی (حصہ)', 'Karahi (portion)', 350], ['سیخ کباب', 'Seekh kebab', 150], ['چپس (پیکٹ)', 'Chips (packet)', 300], ['بسکٹ (2)', 'Biscuits (2)', 100], ['کولڈ ڈرنک', 'Cold drink', 140], ['جوس (گلاس)', 'Juice (glass)', 120], ['دلیہ (کٹوری)', 'Daliya (bowl)', 150], ['بھنے چنے (مٹھی)', 'Roasted chana', 100], ['خشک میوہ (مٹھی)', 'Nuts (handful)', 170]];
  function vFood() {
    CL.setTop(T('کھانے کا ریکارڈ', 'Food log'));
    var l = lget('food', []), k = dkey(), today = l.filter(function (e) { return dkey(new Date(e.t)) === k; }), tot = today.reduce(function (a, e) { return a + e.kcal; }, 0), p = lget('profile', {}), tgt = 0;
    if (p.age >= 19 && p.h && p.w) { var bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5); tgt = Math.round(bmr * ({ low: 1.2, light: 1.375, mod: 1.55, high: 1.725 }[p.act || 'light']) / 10) * 10; }
    var h = '<div class="lhero" style="margin-top:8px"><div class="mut">' + tt('آج کی کیلوری (اندازہ)', "Today's calories (estimate)") + '</div><div class="big2" style="color:rgb(var(--c4))">' + tot + ' <small style="font-size:14px">kcal' + (tgt ? ' / ' + tgt : '') + '</small></div>' + (tgt ? '<div class="pbar" style="margin-top:8px"><i style="width:' + Math.min(100, tot / tgt * 100) + '%;background:' + (tot > tgt ? 'var(--red)' : 'rgb(var(--c4))') + '"></i></div>' : '') + '</div>';
    h += '<div class="card"><b>' + tt('ایک ٹچ سے شامل کریں', 'Tap to add') + '</b><div class="chips">' + FOODS.map(function (f, i) { return '<button class="chip" data-fa="' + i + '">' + L(f) + ' · ' + f[2] + '</button>'; }).join('') + '</div><div class="two" style="margin-top:12px"><input class="inp" id="fn" placeholder="' + tt('دوسرا کھانا', 'Other food') + '" style="margin-top:0;direction:auto"><input class="inp" id="fk" type="number" inputmode="numeric" placeholder="kcal" style="margin-top:0"></div><button class="sbtn" id="fadd" style="margin-top:10px;width:100%">' + ico('plus') + ' ' + tt('شامل', 'Add') + '</button></div>';
    h += '<div class="card">' + (today.length ? today.slice().reverse().map(function (e) { return '<div class="ent"><div class="m"><b>' + esc(e.n) + '</b><small>' + U.fdate(e.t) + '</small></div><span class="v">' + e.kcal + '</span><button class="x" data-fd="' + e.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('آج ابھی کچھ درج نہیں', 'Nothing logged today') + '</p>') + '</div><p class="note">' + tt('کیلوری اندازاً ہیں، حصے کے سائز سے فرق پڑتا ہے۔', 'Calories are rough estimates and vary with portion size.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    function add(n, kc) { var a = lget('food', []); a.push({ id: uid(), t: Date.now(), n: n, kcal: kc }); lset('food', a); var y = $('#body').scrollTop; vFood(); $('#body').scrollTop = y; }
    bind('fa', function (i) { add(L(FOODS[+i]), FOODS[+i][2]); });
    bind('fd', function (id) { lset('food', lget('food', []).filter(function (e) { return e.id !== id; })); vFood(); });
    $('#fadd').onclick = function () { var n = $('#fn').value.trim(), kc = num($('#fk').value); if (!n || !kc) { CL.toast('نام اور کیلوری لکھیں', 'Enter a name and calories'); return; } add(n, Math.round(kc)); };
  }
  V.food = vFood;

  /* ================= FOCUS TIMER ================= */
  var FT = { end: 0, len: 25, int: 0 };
  function vFocus() {
    CL.setTop(T('فوکس ٹائمر', 'Focus timer'));
    var h = '<div class="lhero" style="margin-top:8px;text-align:center"><div class="big2" id="ftm" style="font-size:54px;text-align:center"></div><div class="chips" style="justify-content:center">' + [[15, '15'], [25, '25'], [45, '45'], [60, '60']].map(function (m) { return '<button class="chip' + (FT.len === m[0] ? ' on' : '') + '" data-fl="' + m[0] + '">' + m[1] + ' ' + tt('منٹ', 'min') + '</button>'; }).join('') + '</div><button class="btn" id="fgo"></button></div><p class="note">' + tt('وقت ختم ہونے پر نوٹیفکیشن آئے گا۔', 'You get a notification when time is up.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    function draw() { var left = FT.end ? Math.max(0, FT.end - Date.now()) : FT.len * 60000; $('#ftm') && ($('#ftm').textContent = pad(Math.floor(left / 60000)) + ':' + pad(Math.floor(left / 1000) % 60)); $('#fgo') && ($('#fgo').innerHTML = FT.end ? T('روکیں', 'Stop') : T('شروع کریں', 'Start')); if (FT.end && left <= 0) { FT.end = 0; clearInterval(FT.int); CL.toast('وقت پورا ہو گیا 🎉', 'Time is up 🎉'); } }
    bind('fl', function (v) { if (FT.end) return; FT.len = +v; vFocus(); });
    $('#fgo').onclick = function () {
      if (FT.end) { FT.end = 0; clearInterval(FT.int); U.cancelLN([7201]); draw(); return; }
      FT.end = Date.now() + FT.len * 60000; clearInterval(FT.int); FT.int = setInterval(function () { if (S.view !== 'focus') return; draw(); }, 1000);
      U.scheduleLN([{ id: 7201, title: 'Cleanova Life', body: tt('فوکس کا وقت پورا ہو گیا', 'Focus time is up'), schedule: { at: new Date(FT.end), allowWhileIdle: true } }]); draw();
    };
    draw(); if (FT.end) { clearInterval(FT.int); FT.int = setInterval(function () { if (S.view !== 'focus') return; draw(); }, 1000); }
  }
  V.focus = vFocus;

  /* ================= MONEY LEDGER ================= */
  var LF = { dir: 'owed' };
  function vLedger() {
    CL.setTop(T('ادھار کا حساب', 'Money ledger'));
    var l = lget('ledger', []), open = l.filter(function (x) { return !x.done; }), owed = 0, owe = 0; open.forEach(function (x) { if (x.dir === 'owed') owed += x.amt; else owe += x.amt; });
    var h = '<div class="stat"><div><b style="color:rgb(var(--c6))">' + rs(owed) + '</b><small>' + tt('لوگوں سے لینا ہے', 'Owed to me') + '</small></div><div><b style="color:rgb(var(--c2))">' + rs(owe) + '</b><small>' + tt('مجھے دینا ہے', 'I owe') + '</small></div><div><b>' + rs(owed - owe) + '</b><small>' + tt('خالص', 'Net') + '</small></div></div>' +
      '<div class="card"><b>' + tt('نیا اندراج', 'New entry') + '</b>' + chips([['owed', ['اس نے مجھے دینا ہے', 'They owe me']], ['owe', ['مجھے اسے دینا ہے', 'I owe them']]], LF.dir, 'ld') + '<div class="two"><input class="inp" id="lw" placeholder="' + tt('نام', 'Name') + '" style="direction:auto"><input class="inp" id="la" type="number" inputmode="decimal" placeholder="Rs"></div><input class="inp" id="ln" placeholder="' + tt('نوٹ (اختیاری)', 'Note (optional)') + '" style="direction:auto"><button class="btn" id="lsave">' + T('محفوظ کریں', 'Save') + '</button></div><div class="card">' + (l.length ? l.slice().sort(function (a, b) { return (a.done - b.done) || (b.t - a.t); }).map(function (x) { return '<div class="ent" style="' + (x.done ? 'opacity:.5' : '') + '"><span class="dot" style="background:' + (x.dir === 'owed' ? 'rgb(var(--c6))' : 'rgb(var(--c2))') + ';width:12px;height:12px"></span><div class="m"><b>' + esc(x.who) + (x.done ? ' ✓' : '') + '</b><small>' + U.fday(x.t) + (x.note ? ' · ' + esc(x.note) : '') + '</small></div><span class="v">' + rs(x.amt) + '</span>' + (x.done ? '' : '<button class="sbtn" data-lk="' + x.id + '" style="min-height:36px;padding:0 10px">' + ico('check') + '</button>') + '<button class="x" data-lx="' + x.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('ابھی کوئی اندراج نہیں', 'No entries yet') + '</p>') + '</div>' + CL.footer();
    $('#body').innerHTML = h;
    bind('ld', function (v) { LF.dir = v; vLedger(); });
    bind('lk', function (id) { var a = lget('ledger', []); a.forEach(function (x) { if (x.id === id) x.done = 1; }); lset('ledger', a); vLedger(); });
    bind('lx', function (id) { lset('ledger', lget('ledger', []).filter(function (x) { return x.id !== id; })); vLedger(); });
    $('#lsave').onclick = function () { var w = $('#lw').value.trim(), a = num($('#la').value); if (!w || !a || a <= 0) { CL.toast('نام اور رقم لکھیں', 'Enter a name and amount'); return; } var q = lget('ledger', []); q.push({ id: uid(), t: Date.now(), who: w, amt: a, dir: LF.dir, note: $('#ln').value.trim(), done: 0 }); lset('ledger', q); vLedger(); };
  }
  V.ledger = vLedger;

  /* ================= PLACES (named stops) ================= */
  function hav(a, b, c, d) { var R = 6371000, p = Math.PI / 180, x = Math.sin((c - a) * p / 2) * Math.sin((c - a) * p / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) * Math.sin((d - b) * p / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  CL.savedName = function (lat, lon) { var l = lget('places', []), best = null, bd = 150; l.forEach(function (p) { var d = hav(lat, lon, p.lat, p.lon); if (d < bd) { bd = d; best = p.name; } }); return best; };
  CL.savePlace = function (name, lat, lon) { var l = lget('places', []).filter(function (p) { return hav(lat, lon, p.lat, p.lon) > 150; }); l.push({ name: name, lat: lat, lon: lon }); lset('places', l); };

  /* ================= MORE HUB + HOME ================= */
  var MORE = [['weather', 'sun', 3, ['موسم', 'Weather']], ['rates', 'dollar', 4, ['ریٹس', 'Rates']], ['calc', 'calc', 1, ['کیلکولیٹر', 'Calculators']], ['email', 'mail', 5, ['ای میل', 'Email']], ['habits', 'check', 6, ['عادتیں', 'Habits']], ['journal', 'book', 2, ['ڈائری', 'Journal']], ['week', 'chart', 3, ['رپورٹ', 'Reports']], ['food', 'food', 4, ['کھانا', 'Food log']], ['focus', 'timer', 5, ['فوکس', 'Focus']], ['ledger', 'users', 6, ['ادھار', 'Ledger']], ['sos', 'alert', 2, ['SOS', 'SOS']], ['prefs', 'shield', 1, ['پرائیویسی', 'Privacy']]];
  function moreGrid() {
    return '<div class="sec">' + tt('مزید', 'MORE') + '</div><div class="mg">' + MORE.map(function (m) { return '<button class="mt" data-mv="' + m[0] + '"><span class="dd" style="background:' + rgba(m[2], .18) + ';color:rgb(var(--c' + m[2] + '))">' + ico(m[1]) + '</span><span>' + L(m[3]) + '</span></button>'; }).join('') + '</div>';
  }
  var baseLife = V.life;
  V.life = function (soft) {
    baseLife(soft);
    var hid = lget('hide', []), map = { travel: 'days', health: 'health', clean: 'home', monitor: 'monitor', exp: 'exp', emerg: 'emerg', rem: 'rem' };
    hid.forEach(function (k) { var e = document.querySelector('.bento [data-nav="' + map[k] + '"]'); if (e) e.remove(); });
    var foot = document.querySelector('#body .foot'); if (foot) foot.insertAdjacentHTML('beforebegin', moreGrid());
    var wc = lget('wcache', null), g = document.querySelector('.lgreet');
    if (g) { g.style.position = 'relative'; g.insertAdjacentHTML('beforeend', '<button id="wchip" class="sbtn" style="position:absolute;top:0;inset-inline-end:0;min-height:38px;padding:0 12px;direction:ltr">' + (wc && wc.cur ? wx(wc.cur.weather_code)[0] + ' ' + Math.round(wc.cur.temperature_2m) + '°' : '☁ --') + '</button>'); $('#wchip').onclick = function () { nav('weather'); }; }
    var up = lget('upd', null); if (up && g && !soft) g.insertAdjacentHTML('afterend', '<button class="warn" id="updb" style="display:block;width:100%;text-align:start">⬆ ' + tt('نیا ورژن دستیاب ہے: ', 'New version available: ') + esc(up.tag) + '</button>');
    if ($('#updb')) $('#updb').onclick = function () { openUrl(up.url); };
    bind('mv', function (v) { nav(v); });
    if (!soft && !lget('onb', false)) setTimeout(onboard, 600);
    if (!soft && !(wc && Date.now() - wc.t < 3600000)) loadWeather(false).then(function () { if (S.view === 'life') V.life(true); }).catch(function () { /* offline */ });
  };
  function onboard() {
    if (S.view !== 'life' || lget('onb', false) || $('#lock')) return; var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<div class="logo" style="width:56px;height:56px;border-radius:17px;margin:0 auto 10px">' + ico('spark') + '</div><h2 style="text-align:center;font-size:21px">' + tt('Cleanova Life میں خوش آمدید', 'Welcome to Cleanova Life') + '</h2><ul style="margin:12px 18px;line-height:1.9;font-size:15px"><li>' + tt('سب کچھ آپ کے فون میں رہتا ہے', 'Everything stays on your phone') + '</li><li>' + tt('پروفائل بنائیں تاکہ ڈائٹ اور BMI نکلے', 'Create a profile for diet and BMI') + '</li><li>' + tt('ترتیبات میں تھیم، رنگ اور ایپ لاک', 'Theme, colour and app lock are in Settings') + '</li></ul><button class="btn" id="obp">' + T('پروفائل بنائیں', 'Create profile') + '</button><button class="sbtn" id="obl" style="width:100%;margin-top:10px">' + tt('بعد میں', 'Maybe later') + '</button>';
    $('#obl').onclick = function () { lset('onb', true); m.hidden = true; }; $('#obp').onclick = function () { lset('onb', true); m.hidden = true; nav('profile'); };
  }
  /* update notice (works only when the release page is public) */
  setTimeout(function () {
    try {
      var A = Cap && Cap.Plugins && Cap.Plugins.App; if (!A || window.CLEANOVA_MOCK) return;
      A.getInfo().then(function (i) { var cur = parseInt(String(i.version).split('.').pop(), 10); return getJson('https://api.github.com/repos/atifashraf93-lang/Cleanova/releases/latest', 8000).then(function (r) { var n = parseInt(String(r.tag_name).replace(/\D/g, ''), 10); if (n > cur) lset('upd', { tag: r.tag_name, url: r.html_url }); else lset('upd', null); }); }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }, 4000);
};
