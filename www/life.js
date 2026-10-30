/* Cleanova Life: home, health, expenses, reminders. Everything is stored on the phone (localStorage). */
window.CLifeInit = function (CL) {
  'use strict';
  var S = CL.S, PREF = CL.PREF, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, ico = CL.ico, TP = CL.TP, MP = CL.MP, LN = CL.LN;
  var V = CL.views;
  function lget(k, d) { var v = CL.store('life.' + k); return (v === null || v === undefined) ? d : v; }
  function lset(k, v) { CL.store('life.' + k, v); }
  function uid() { return Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function nid() { return 100000 + Math.floor(Math.random() * 800000); }
  function L(a) { return PREF.lang === 'en' ? a[1] : a[0]; }
  function num(x) { var n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? null : n; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dkey(d) { d = d || new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function fdate(t) { return '<bdi dir="ltr">' + new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + pad(new Date(t).getHours()) + ':' + pad(new Date(t).getMinutes()) + '</bdi>'; }
  function fday(t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function rs(n) { return 'Rs ' + Math.round(n).toLocaleString('en'); }
  function tr(k) { var e = {}; e[k] = 1; return e; }
  var TO = CL.TAB_OF;
  ['exp', 'rem'].forEach(function (k) { TO[k] = 'life'; });
  ['health', 'profile', 'diet', 'sugar', 'bp', 'water', 'weight', 'emerg'].forEach(function (k) { TO[k] = 'health'; });
  function nav(v) { if (v === 'days') S.dl = null; CL.go(v); }
  function chips(items, cur, attr) {
    return '<div class="chips">' + items.map(function (o) { return '<button class="chip' + (cur === o[0] ? ' on' : '') + '" data-' + attr + '="' + o[0] + '">' + L(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function bind(attr, fn) { [].forEach.call(document.querySelectorAll('[data-' + attr + ']'), function (b) { b.onclick = function () { fn(b.dataset[attr], b); }; }); }
  function brand() { return 'Cleanova <span style="color:var(--acc)">Life</span>'; }
  function rgba(c, a) { return 'rgba(var(--c' + c + '),' + a + ')'; }
  function ib(c, ic) { return '<div class="ib" style="background:' + rgba(c, .18) + ';color:rgb(var(--c' + c + '))">' + ico(ic) + '</div>'; }
  function scheduleLN(list) {
    if (!LN) { return Promise.resolve(false); }
    return LN.requestPermissions().then(function (r) { if (!r || r.display !== 'granted') return false; return LN.schedule({ notifications: list }).then(function () { return true; }); }).catch(function () { return false; });
  }
  function cancelLN(ids) { if (!LN) return Promise.resolve(); return LN.cancel({ notifications: ids.map(function (i) { return { id: i }; }) }).catch(function () { /* ignore */ }); }

  /* ================= HOME ================= */
  var HM = { today: null, steps: 0, bat: null };
  function hijri() { try { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).replace(' AH', ''); } catch (e) { return ''; } }
  function loadHome() {
    TP.autoStatus().then(function (r) { HM.auto = r; HM.steps = r.stepsToday || 0; if (S.view === 'life') V.life(true); }).catch(function () { /* none */ });
    TP.dayList({ days: 2 }).then(function (r) { var k = dkey(); HM.today = ((r && r.days) || []).filter(function (x) { return x.date === k; })[0] || null; if (HM.today && HM.today.steps > HM.steps) HM.steps = HM.today.steps; if (S.view === 'life') V.life(true); }).catch(function () { /* none */ });
    MP.snapshot().then(function (s) { HM.bat = s && s.battery ? s.battery.level : null; if (S.view === 'life') V.life(true); }).catch(function () { /* none */ });
  }
  function waterToday() { var w = lget('water', {}); return w[dkey()] || 0; }
  function spentOn(from, to) { var s = 0; lget('exp', []).forEach(function (e) { if (e.t >= from && e.t < to) s += e.amt; }); return s; }
  function nextOcc(r) {
    var now = Date.now(), d = new Date(r.at), h = d.getHours(), m = d.getMinutes(), n = new Date();
    if (r.rep === 'none') return r.at >= now - 60000 ? r.at : null;
    var c = new Date(); c.setHours(h, m, 0, 0);
    if (r.rep === 'daily') { if (c.getTime() < now) c.setDate(c.getDate() + 1); return c.getTime(); }
    if (r.rep === 'weekly') { c.setDate(c.getDate() + ((d.getDay() - c.getDay() + 7) % 7)); if (c.getTime() < now) c.setDate(c.getDate() + 7); return c.getTime(); }
    if (r.rep === 'monthly') { c.setDate(d.getDate()); if (c.getTime() < now) { c.setMonth(c.getMonth() + 1); c.setDate(d.getDate()); } return c.getTime(); }
    c = new Date(n.getFullYear(), d.getMonth(), d.getDate(), h, m); if (c.getTime() < now) c = new Date(n.getFullYear() + 1, d.getMonth(), d.getDate(), h, m); return c.getTime();
  }
  var RC = { med: [4, 'pill', ['دوا', 'Medicine']], bill: [3, 'card', ['بل / قسط', 'Bill']], bday: [5, 'spark', ['سالگرہ', 'Birthday']], other: [1, 'bell', ['دوسرا', 'Other']] };
  function upcoming(n) {
    return lget('rem', []).map(function (r) { return { r: r, t: nextOcc(r) }; }).filter(function (x) { return x.t; }).sort(function (a, b) { return a.t - b.t; }).slice(0, n);
  }
  function inTxt(t) {
    var now = new Date(), d1 = startOfDay(t), d0 = startOfDay(now), dd = Math.round((d1 - d0) / 86400000), tm = pad(new Date(t).getHours()) + ':' + pad(new Date(t).getMinutes());
    if (dd <= 0) return tt('آج ', 'Today ') + tm; if (dd === 1) return tt('کل ', 'Tomorrow ') + tm; return dd + tt(' دن بعد', ' days');
  }
  function miniMap() {
    return '<svg viewBox="0 0 132 100" preserveAspectRatio="xMidYMid slice"><rect width="132" height="100" fill="#14233a"/><g stroke="#1f3452" stroke-width="5" fill="none"><path d="M-5 26 L140 48"/><path d="M-5 74 L140 60"/><path d="M36 -5 L48 105"/><path d="M92 -5 L84 105"/></g><g stroke="#1b2d48" stroke-width="2" fill="none"><path d="M-5 50 L140 34"/><path d="M66 -5 L68 105"/></g><path d="M11 20 C30 26 44 40 58 45 S82 60 92 78" fill="none" stroke="#fb7185" stroke-width="3.2" stroke-linecap="round"/><path d="M92 78 L114 86" fill="none" stroke="#60a5fa" stroke-width="3.2" stroke-dasharray="1 6" stroke-linecap="round"/><circle cx="11" cy="20" r="5.5" fill="#34d399" stroke="#0b1424" stroke-width="2"/><circle cx="114" cy="86" r="5.5" fill="#fb7185" stroke="#0b1424" stroke-width="2"/></svg>';
  }
  function vLife(soft) {
    CL.setTop(brand());
    if (!soft) { HM.today = HM.today; loadHome(); }
    var hr = new Date().getHours(), greet = hr < 12 ? ['صبح بخیر', 'Good morning'] : hr < 17 ? ['دوپہر بخیر', 'Good afternoon'] : ['شام بخیر', 'Good evening'];
    var goal = lget('goal', 10000), steps = Math.round(HM.steps || 0), pct = Math.min(100, steps / goal * 100), off = 351.9 * (1 - pct / 100);
    var td = HM.today || { distance: 0, walk: 0, vehicle: 0 };
    var cal = Math.round(steps * 0.04), wat = waterToday(), wg = lget('wgoal', 8);
    var free = S.total ? S.free : 0, usedPct = S.total ? Math.round((S.total - S.free) / S.total * 100) : 0;
    var ups = upcoming(5), pending = lget('rem', []).length;
    var date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }), hj = hijri();
    var h = '<div class="lgreet"><h2>' + greet[PREF.lang === 'en' ? 1 : 0] + ' 👋</h2><p>' + esc(date) + (hj ? ' · ' + esc(hj) + ' AH' : '') + '</p></div>';
    h += '<div class="lhero"><div class="lhr"><div class="lring"><svg viewBox="0 0 132 132"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--acc)"/><stop offset="1" stop-color="var(--acc2)"/></linearGradient></defs><circle cx="66" cy="66" r="56" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="66" cy="66" r="56" fill="none" stroke="url(#lg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="351.9" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><div class="c"><small>' + tt('قدم', 'STEPS') + '</small><b>' + steps.toLocaleString('en') + '</b><small>' + tt('ہدف ', 'of ') + goal.toLocaleString('en') + '</small></div></div>' +
      '<div class="lst"><div><span class="dd" style="background:' + rgba(1, .18) + ';color:rgb(var(--c1))">' + ico('route') + '</span><span><b>' + CL.km(td.distance || 0) + '</b><small>' + tt('آج کا سفر', 'Travelled today') + '</small></span></div>' +
      '<div><span class="dd" style="background:' + rgba(2, .18) + ';color:rgb(var(--c2))">' + ico('flame') + '</span><span><b>' + cal + ' kcal</b><small>' + tt('قدموں سے', 'From walking') + '</small></span></div>' +
      '<div><span class="dd" style="background:' + rgba(5, .2) + ';color:rgb(var(--c5))">' + ico('pulse') + '</span><span><b>' + CL.km(td.walk || 0) + '</b><small>' + tt('پیدل چلے', 'On foot') + '</small></span></div></div></div>' +
      '<div class="lchips"><div class="lchip"><div class="l" style="color:rgb(var(--c3))">' + ico('drop') + tt('پانی', 'Water') + '</div><b>' + wat + ' / ' + wg + '</b><div class="pbar"><i style="width:' + Math.min(100, wat / wg * 100) + '%;background:rgb(var(--c3))"></i></div></div>' +
      '<div class="lchip"><div class="l" style="color:rgb(var(--c6))">' + ico('bat') + tt('بیٹری', 'Battery') + '</div><b>' + (HM.bat === null ? '–' : HM.bat + '%') + '</b><div class="pbar"><i style="width:' + (HM.bat || 0) + '%;background:rgb(var(--c6))"></i></div></div>' +
      '<div class="lchip"><div class="l" style="color:rgb(var(--c4))">' + ico('hdd') + tt('خالی جگہ', 'Storage') + '</div><b>' + (S.total ? CL.fmt(free) : '–') + '</b><div class="pbar"><i style="width:' + usedPct + '%;background:rgb(var(--c4))"></i></div></div></div></div>';
    h += '<div class="rems">' + (ups.length ? ups.map(function (x) { var c = RC[x.r.cat] || RC.other; return '<button class="rm" data-nav="rem"><em style="background:' + rgba(c[0], .2) + ';color:rgb(var(--c' + c[0] + '))">' + ico(c[1]) + '</em><span>' + esc(x.r.title) + '<small>' + inTxt(x.t) + '</small></span></button>'; }).join('') : '<button class="rm" data-nav="rem"><em style="background:' + rgba(1, .2) + ';color:rgb(var(--c1))">' + ico('plus') + '</em><span>' + tt('یاد دہانی لگائیں', 'Add a reminder') + '</span></button>') + '</div>';
    var lastS = lget('sugar', []).slice(-1)[0], lastB = lget('bp', []).slice(-1)[0];
    h += '<div class="sec">' + tt('میرا ٹول کٹ', 'YOUR TOOLKIT') + '</div><div class="bento">' +
      '<button class="bc wide" data-nav="days" style="background:linear-gradient(135deg,' + rgba(1, .2) + ',' + rgba(3, .06) + ');border-color:' + rgba(1, .3) + '"><div class="tx">' + ib(1, 'route') + '<h3>' + tt('سفرنامہ', 'Travel Log') + '</h3><p>' + tt('روزانہ راستہ، جگہیں، نقشہ، قدم', 'Daily routes, places, map and steps') + '</p><span class="tg" style="background:' + rgba(1, .18) + ';color:rgb(var(--c1))">' + (HM.auto && HM.auto.on ? (td.distance ? tt('آج ', 'Today · ') + CL.km(td.distance) : tt('ریکارڈ جاری', 'Recording')) : tt('ریکارڈ شروع کریں', 'Start recording')) + '</span></div><div class="mm">' + miniMap() + '</div></button>' +
      '<button class="bc" data-nav="health" style="background:linear-gradient(160deg,' + rgba(2, .2) + ',' + rgba(2, .05) + ');border-color:' + rgba(2, .28) + '"><span class="go">' + ico('arr') + '</span>' + ib(2, 'heart') + '<h3>' + tt('صحت', 'Health') + '</h3><p>' + tt('ڈائٹ، شوگر، بی پی', 'Diet, sugar, BP') + '</p>' + (lastS ? '<div class="val" style="color:rgb(var(--c2))">' + lastS.v + ' <small>mg/dL</small></div>' : (lastB ? '<div class="val" style="color:rgb(var(--c2))">' + lastB.s + '/' + lastB.d + '</div>' : '')) + '</button>' +
      '<button class="bc" data-nav="home" style="background:linear-gradient(160deg,' + rgba(3, .2) + ',' + rgba(3, .05) + ');border-color:' + rgba(3, .28) + '"><span class="go">' + ico('arr') + '</span>' + ib(3, 'spark') + '<h3>' + tt('کلینر', 'Cleaner') + '</h3><p>' + tt('فالتو فائلیں، ڈپلیکیٹ', 'Junk, duplicates, big files') + '</p>' + (S.last ? '<div class="val" style="color:rgb(var(--c3))">' + CL.fmt(S.last.b) + ' <small>' + tt('خالی ہو سکتی ہے', 'to free') + '</small></div>' : '') + '</button>' +
      '<button class="bc" data-nav="monitor" style="background:linear-gradient(160deg,' + rgba(4, .18) + ',' + rgba(4, .04) + ');border-color:' + rgba(4, .28) + '"><span class="go">' + ico('arr') + '</span>' + ib(4, 'phone') + '<h3>' + tt('فون مانیٹر', 'Phone Monitor') + '</h3><p>' + tt('بیٹری، اسکرین ٹائم، ڈیٹا', 'Battery, screen time, data') + '</p>' + (HM.bat !== null ? '<div class="val" style="color:rgb(var(--c4))">' + HM.bat + '% <small>' + tt('بیٹری', 'battery') + '</small></div>' : '') + '</button>' +
      '<button class="bc" data-nav="exp" style="background:linear-gradient(160deg,' + rgba(5, .2) + ',' + rgba(5, .05) + ');border-color:' + rgba(5, .3) + '"><span class="go">' + ico('arr') + '</span>' + ib(5, 'card') + '<h3>' + tt('خرچ', 'Expenses') + '</h3><p>' + tt('روزانہ حساب، بجٹ', 'Daily spend and budget') + '</p><div class="val" style="color:rgb(var(--c5))">' + rs(spentOn(startOfDay(Date.now()), Date.now() + 1)) + ' <small>' + tt('آج', 'today') + '</small></div></button>' +
      '<button class="bc" data-nav="emerg" style="background:linear-gradient(160deg,' + rgba(2, .14) + ',' + rgba(2, .03) + ');border-color:' + rgba(2, .22) + '"><span class="go">' + ico('arr') + '</span>' + ib(2, 'id') + '<h3>' + tt('ایمرجنسی کارڈ', 'Emergency card') + '</h3><p>' + tt('خون کا گروپ، رابطہ', 'Blood group, contact') + '</p>' + (lget('emerg', {}).bg ? '<div class="val" style="color:rgb(var(--c2))">' + esc(lget('emerg', {}).bg) + '</div>' : '') + '</button>' +
      '<button class="bc" data-nav="rem" style="background:linear-gradient(160deg,' + rgba(6, .18) + ',' + rgba(6, .04) + ');border-color:' + rgba(6, .28) + '"><span class="go">' + ico('arr') + '</span>' + ib(6, 'bell') + '<h3>' + tt('یاد دہانیاں', 'Reminders') + '</h3><p>' + tt('دوا، بل، سالگرہ', 'Medicine, bills, birthdays') + '</p><div class="val" style="color:rgb(var(--c6))">' + pending + ' <small>' + tt('محفوظ', 'saved') + '</small></div></button></div>';
    h += CL.footer();
    $('#body').innerHTML = h;
    bind('nav', function (v) { if (v === 'monitor') { CL.openTool('monitor'); return; } if (v === 'rem') S.remCat = null; nav(v); });
  }
  V.life = vLife;

  /* ================= REMINDERS ================= */
  var RF = { cat: 'other', rep: 'none' };
  function vRem() {
    CL.setTop(T('یاد دہانیاں', 'Reminders'));
    var list = lget('rem', []), cat = S.remCat, taken = lget('taken', {});
    if (cat) RF.cat = cat;
    var shown = list.map(function (r) { return { r: r, t: nextOcc(r) }; }).filter(function (x) { return !cat || x.r.cat === cat; }).sort(function (a, b) { return (a.t || 9e15) - (b.t || 9e15); });
    var d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0);
    var dv = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), tv = pad(d.getHours()) + ':00';
    var h = '<div class="card" style="margin-top:8px"><b>' + tt('نئی یاد دہانی', 'New reminder') + '</b>' +
      '<input class="inp" id="rt" maxlength="60" placeholder="' + tt('مثلاً: میٹفارمن / بجلی کا بل', 'e.g. Metformin / Electricity bill') + '" style="direction:auto">' +
      chips(Object.keys(RC).map(function (k) { return [k, RC[k][2]]; }), RF.cat, 'rc') +
      '<div class="two"><div><span class="fl">' + tt('تاریخ', 'Date') + '</span><input class="inp" id="rd" type="date" value="' + dv + '"></div><div><span class="fl">' + tt('وقت', 'Time') + '</span><input class="inp" id="rtm" type="time" value="' + tv + '"></div></div>' +
      '<span class="fl">' + tt('دہرائیں', 'Repeat') + '</span>' + chips([['none', ['ایک بار', 'Once']], ['daily', ['روزانہ', 'Daily']], ['weekly', ['ہفتہ وار', 'Weekly']], ['monthly', ['ماہانہ', 'Monthly']], ['yearly', ['سالانہ', 'Yearly']]], RF.rep, 'rr') +
      '<button class="btn" id="rsave">' + T('محفوظ کریں', 'Save reminder') + '</button>' + (LN ? '' : '<p class="note">' + tt('نوٹیفکیشن اس ورژن میں دستیاب نہیں، یاد دہانی صرف ایپ میں دکھے گی۔', 'Notifications are unavailable here; reminders show inside the app only.') + '</p>') + '</div>';
    if (cat) h += '<div class="chips"><button class="chip" id="rall">' + tt('سب دکھائیں', 'Show all') + '</button></div>';
    h += '<div class="card">' + (shown.length ? shown.map(function (x) {
      var r = x.r, c = RC[r.cat] || RC.other, tk = taken[r.id + dkey()];
      return '<div class="ent"><span class="dd" style="background:' + rgba(c[0], .2) + ';color:rgb(var(--c' + c[0] + '))">' + ico(c[1]) + '</span><div class="m"><b>' + esc(r.title) + '</b><small>' + (x.t ? inTxt(x.t) : tt('گزر چکی', 'Past')) + ' · ' + L([{ none: 'ایک بار', daily: 'روزانہ', weekly: 'ہفتہ وار', monthly: 'ماہانہ', yearly: 'سالانہ' }[r.rep], { none: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[r.rep]]) + '</small></div>' +
        (r.cat === 'med' ? '<button class="sbtn' + (tk ? ' p' : '') + '" data-tk="' + r.id + '" style="min-height:38px;padding:2px 10px">' + ico('check') + '</button>' : '') + '<button class="x" data-rd="' + r.id + '" aria-label="delete">' + ico('trash') + '</button></div>';
    }).join('') : '<p class="mut center">' + tt('ابھی کوئی یاد دہانی نہیں', 'No reminders yet') + '</p>') + '</div>' + CL.footer();
    $('#body').innerHTML = h;
    bind('rc', function (v) { RF.cat = v; var t = $('#rt').value; vRem(); $('#rt').value = t; });
    bind('rr', function (v) { RF.rep = v; var t = $('#rt').value; vRem(); $('#rt').value = t; });
    if ($('#rall')) $('#rall').onclick = function () { S.remCat = null; vRem(); };
    bind('tk', function (id) { var t = lget('taken', {}); var k = id + dkey(); if (t[k]) delete t[k]; else t[k] = 1; lset('taken', t); vRem(); });
    bind('rd', function (id) { var l = lget('rem', []), r = l.filter(function (x) { return x.id === id; })[0]; lset('rem', l.filter(function (x) { return x.id !== id; })); if (r) cancelLN([r.nid]); vRem(); });
    $('#rsave').onclick = function () {
      var title = $('#rt').value.trim(), dd = $('#rd').value, tm = $('#rtm').value;
      if (!title || !dd || !tm) { CL.toast('نام، تاریخ اور وقت لکھیں', 'Enter a name, date and time'); return; }
      var at = new Date(dd + 'T' + tm).getTime(); if (isNaN(at)) { CL.toast('تاریخ درست نہیں', 'Invalid date'); return; }
      var r = { id: uid(), nid: nid(), title: title, cat: RF.cat, at: at, rep: RF.rep }, dt = new Date(at), body = (L(RC[r.cat][2])) + ' · ' + title, sch;
      if (r.rep === 'none') sch = { at: new Date(at), allowWhileIdle: true };
      else if (r.rep === 'daily') sch = { on: { hour: dt.getHours(), minute: dt.getMinutes() }, allowWhileIdle: true };
      else if (r.rep === 'weekly') sch = { on: { weekday: dt.getDay() + 1, hour: dt.getHours(), minute: dt.getMinutes() }, allowWhileIdle: true };
      else if (r.rep === 'monthly') sch = { on: { day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }, allowWhileIdle: true };
      else sch = { on: { month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }, allowWhileIdle: true };
      var l = lget('rem', []); l.push(r); lset('rem', l);
      scheduleLN([{ id: r.nid, title: 'Cleanova Life', body: body, schedule: sch }]).then(function (ok) { CL.toast(ok ? 'یاد دہانی محفوظ' : 'محفوظ (نوٹیفکیشن کی اجازت نہیں)', ok ? 'Reminder saved' : 'Saved (no notification permission)'); vRem(); });
    };
  }
  V.rem = vRem;

  /* ================= EXPENSES ================= */
  var EC = { food: [2, 'food', ['کھانا', 'Food']], travel: [3, 'route', ['سفر / پٹرول', 'Transport']], bills: [4, 'bell', ['بل', 'Bills']], shop: [5, 'card', ['خریداری', 'Shopping']], health: [6, 'heart', ['صحت / دوا', 'Health']], edu: [1, 'spark', ['تعلیم', 'Education']], other: [3, 'grid', ['دیگر', 'Other']] };
  var EF = { cat: 'food' };
  function vExp() {
    CL.setTop(T('خرچ', 'Expenses'));
    var list = lget('exp', []), now = Date.now(), d0 = startOfDay(now), w0 = d0 - 6 * 86400000, nd = new Date(); var m0 = new Date(nd.getFullYear(), nd.getMonth(), 1).getTime();
    var today = spentOn(d0, now + 1), week = spentOn(w0, now + 1), month = spentOn(m0, now + 1), budget = lget('budget', 0);
    var h = '<div class="stat"><div><b>' + rs(today) + '</b><small>' + tt('آج', 'Today') + '</small></div><div><b>' + rs(week) + '</b><small>' + tt('7 دن', '7 days') + '</small></div><div><b>' + rs(month) + '</b><small>' + tt('اس مہینے', 'This month') + '</small></div></div>';
    if (budget) { var p = Math.min(100, month / budget * 100); h += '<div class="card"><div class="kv"><span>' + tt('ماہانہ بجٹ', 'Monthly budget') + '</span><b>' + rs(month) + ' / ' + rs(budget) + '</b></div><div class="mbar"><i style="width:' + p + '%;background:' + (month > budget ? 'var(--red)' : 'linear-gradient(90deg,var(--acc),var(--acc2))') + '"></i></div><p class="note">' + (month > budget ? tt('بجٹ سے ' + rs(month - budget) + ' زیادہ', rs(month - budget) + ' over budget') : tt(rs(budget - month) + ' باقی', rs(budget - month) + ' left')) + '</p></div>'; }
    h += '<div class="card"><b>' + tt('نیا خرچ', 'Add expense') + '</b><input class="inp" id="ea" type="number" inputmode="decimal" placeholder="Rs"><div style="margin-top:4px"></div>' +
      chips(Object.keys(EC).map(function (k) { return [k, EC[k][2]]; }), EF.cat, 'ec') + '<input class="inp" id="en" maxlength="60" placeholder="' + tt('تفصیل (اختیاری)', 'Note (optional)') + '" style="direction:auto">' + (CL.micHtml ? '<div style="margin-top:8px">' + CL.micHtml('emic', tt('بول کر خرچ لکھیں: "پانچ سو کھانا"', 'Say it: "500 food"')) + '</div>' : '') + '<button class="btn" id="esave">' + T('محفوظ کریں', 'Save') + '</button></div>';
    var cats = {}; list.forEach(function (e) { if (e.t >= m0) cats[e.cat] = (cats[e.cat] || 0) + e.amt; });
    var ck = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
    if (ck.length) h += '<div class="sec">' + tt('اس مہینے کیٹیگری کے لحاظ سے', 'THIS MONTH BY CATEGORY') + '</div><div class="card">' + ck.map(function (k) { var c = EC[k] || EC.other; return '<div class="kv" style="border:0"><span><span class="dot" style="background:rgb(var(--c' + c[0] + '))"></span>' + L(c[2]) + '</span><b>' + rs(cats[k]) + '</b></div><div class="mbar" style="margin-top:0"><i style="width:' + (cats[k] / month * 100) + '%;background:rgb(var(--c' + c[0] + '))"></i></div>'; }).join('') + '</div>';
    h += '<div class="sec">' + tt('حالیہ خرچ', 'RECENT') + '</div><div class="card">' + (list.length ? list.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 40).map(function (e) { var c = EC[e.cat] || EC.other; return '<div class="ent"><span class="dd" style="background:' + rgba(c[0], .2) + ';color:rgb(var(--c' + c[0] + '))">' + ico(c[1]) + '</span><div class="m"><b>' + esc(e.note || L(c[2])) + '</b><small>' + fdate(e.t) + '</small></div><span class="v">' + rs(e.amt) + '</span><button class="x" data-ed="' + e.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('ابھی کوئی خرچ نہیں', 'No expenses yet') + '</p>') + '</div>' +
      '<div class="card"><span class="fl" style="margin-top:0">' + tt('ماہانہ بجٹ (Rs)', 'Monthly budget (Rs)') + '</span><input class="inp" id="eb" type="number" inputmode="numeric" value="' + (budget || '') + '" placeholder="0"><button class="sbtn" id="ebs" style="margin-top:10px">' + tt('بجٹ محفوظ کریں', 'Save budget') + '</button></div>' + CL.footer();
    $('#body').innerHTML = h;
    bind('ec', function (v) { EF.cat = v; var a = $('#ea').value, n = $('#en').value; vExp(); $('#ea').value = a; $('#en').value = n; });
    bind('ed', function (id) { lset('exp', lget('exp', []).filter(function (e) { return e.id !== id; })); vExp(); });
    if (CL.micBind) CL.micBind('emic', function (t) { var r = CL.parseExpense(t); if (r.amt) $('#ea').value = r.amt; if (r.cat) EF.cat = r.cat; if (r.note) $('#en').value = r.note; var a2 = $('#ea').value, n2 = $('#en').value; vExp(); $('#ea').value = a2; $('#en').value = n2; CL.toast('سنا: ' + t, 'Heard: ' + t); });
    $('#esave').onclick = function () { var a = num($('#ea').value); if (!a || a <= 0) { CL.toast('رقم لکھیں', 'Enter an amount'); return; } var l = lget('exp', []); l.push({ id: uid(), t: Date.now(), amt: a, cat: EF.cat, note: $('#en').value.trim() }); lset('exp', l); vExp(); };
    $('#ebs').onclick = function () { lset('budget', num($('#eb').value) || 0); CL.toast('بجٹ محفوظ', 'Budget saved'); vExp(); };
  }
  V.exp = vExp;

  /* ================= HEALTH ================= */
  function prof() { return lget('profile', {}); }
  function bmiOf(p) { return p.h && p.w ? p.w / Math.pow(p.h / 100, 2) : null; }
  function bmiCat(b) { return b < 18.5 ? [['کم وزن', 'Underweight'], 'var(--c3)'] : b < 25 ? [['نارمل', 'Normal'], 'var(--c6)'] : b < 30 ? [['زیادہ وزن', 'Overweight'], 'var(--c4)'] : [['موٹاپا', 'Obese'], 'var(--c2)']; }
  function rgb(v) { return 'rgb(' + v + ')'; }
  function disc() { return '<div class="warn">' + tt('یہ ایپ صرف عمومی معلومات اور ریکارڈ رکھنے کے لیے ہے، ڈاکٹر یا ڈائٹیشن کا متبادل نہیں۔ بیماری، دوا یا حمل میں اپنا پلان ڈاکٹر سے طے کریں۔', 'This app gives general information and a personal log only. It is not a substitute for a doctor or dietitian. For illness, medication or pregnancy, settle your plan with your doctor.') + '</div>'; }
  function bars(vals, colors, labels) {
    var mx = Math.max.apply(null, vals.concat([1]));
    return '<div class="chart">' + vals.map(function (v, i) { return '<div><i style="height:' + Math.max(3, v / mx * 84) + '%;background:' + colors[i] + '"></i><span>' + labels[i] + '</span></div>'; }).join('') + '</div>';
  }
  function vHealth() {
    CL.setTop(T('صحت', 'Health'));
    var p = prof(), b = bmiOf(p), ls = lget('sugar', []).slice(-1)[0], lb = lget('bp', []).slice(-1)[0], lw = lget('weight', []).slice(-1)[0];
    var h = '';
    if (!p.age || !p.h || !p.w) {
      h += '<div class="card center" style="margin-top:8px"><div class="dd" style="margin:0 auto 8px;width:52px;height:52px;border-radius:16px;background:' + rgba(2, .2) + ';color:rgb(var(--c2))">' + ico('user') + '</div><b style="font-size:18px">' + tt('پہلے اپنی پروفائل بنائیں', 'Set up your profile first') + '</b><p class="mut" style="margin-top:4px">' + tt('عمر، قد اور وزن سے ڈائٹ پلان اور BMI بنتا ہے۔', 'Age, height and weight give you a diet plan and BMI.') + '</p><button class="btn" id="hp">' + T('پروفائل بنائیں', 'Create profile') + '</button></div>';
    } else {
      var c = bmiCat(b);
      h += '<div class="lhero" style="margin-top:8px"><div class="kv" style="border:0"><span>' + esc(p.name || tt('میری پروفائل', 'My profile')) + '</span><button class="sbtn" id="hp" style="min-height:34px;padding:0 12px">' + tt('ترمیم', 'Edit') + '</button></div><div class="stat"><div><b>' + p.age + '</b><small>' + tt('عمر', 'Age') + '</small></div><div><b>' + p.w + ' kg</b><small>' + tt('وزن', 'Weight') + '</small></div><div><b style="color:' + rgb(c[1]) + '">' + b.toFixed(1) + '</b><small>BMI · ' + L(c[0]) + '</small></div></div></div>';
    }
    var wat = waterToday(), wg = lget('wgoal', 8);
    var T6 = [
      ['diet', 1, 'food', ['ڈائٹ پلان', 'Diet plan'], ['عمر کے مطابق کھانا', 'Meals for your age'], ''],
      ['sugar', 2, 'drop', ['شوگر لاگ', 'Sugar log'], ['ریڈنگ اور گراف', 'Readings and chart'], ls ? ls.v + ' mg/dL' : ''],
      ['bp', 2, 'pulse', ['بلڈ پریشر', 'Blood pressure'], ['ریڈنگ اور گراف', 'Readings and chart'], lb ? lb.s + '/' + lb.d : ''],
      ['water', 3, 'drop', ['پانی', 'Water'], ['روزانہ گلاس', 'Daily glasses'], wat + ' / ' + wg],
      ['weight', 4, 'scale', ['وزن اور BMI', 'Weight and BMI'], ['وزن کا ریکارڈ', 'Weight history'], lw ? lw.kg + ' kg' : ''],
      ['meds', 5, 'pill', ['دوا کی یاد دہانی', 'Medicine reminders'], ['وقت پر دوا', 'Never miss a dose'], ''],
      ['emerg', 2, 'id', ['ایمرجنسی کارڈ', 'Emergency card'], ['خون کا گروپ، رابطہ', 'Blood group, contact'], '']
    ];
    h += '<div class="sec">' + tt('صحت کے اوزار', 'HEALTH TOOLS') + '</div><div class="bento">' + T6.map(function (x) {
      return '<button class="bc" data-hv="' + x[0] + '" style="background:linear-gradient(160deg,' + rgba(x[1], .18) + ',' + rgba(x[1], .04) + ');border-color:' + rgba(x[1], .28) + '"><span class="go">' + ico('arr') + '</span>' + ib(x[1], x[2]) + '<h3>' + L(x[3]) + '</h3><p>' + L(x[4]) + '</p>' + (x[5] ? '<div class="val" style="color:rgb(var(--c' + x[1] + '))">' + x[5] + '</div>' : '') + '</button>';
    }).join('') + '</div>' + disc() + CL.footer();
    $('#body').innerHTML = h;
    if ($('#hp')) $('#hp').onclick = function () { nav('profile'); };
    bind('hv', function (v) { if (v === 'meds') { S.remCat = 'med'; nav('rem'); } else nav(v); });
  }
  V.health = vHealth;

  /* ---- profile ---- */
  var PF = null;
  function vProfile() {
    CL.setTop(T('میری پروفائل', 'My profile'));
    if (!PF) PF = JSON.parse(JSON.stringify(prof()));
    PF.cond = PF.cond || {};
    var h = '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('نام', 'Name') + '</span><input class="inp" id="pn" maxlength="40" value="' + esc(PF.name || '') + '" style="direction:auto">' +
      '<div class="two"><div><span class="fl">' + tt('عمر (سال)', 'Age (years)') + '</span><input class="inp" id="pa" type="number" inputmode="numeric" value="' + (PF.age || '') + '"></div><div><span class="fl">' + tt('قد (cm)', 'Height (cm)') + '</span><input class="inp" id="ph" type="number" inputmode="numeric" value="' + (PF.h || '') + '"></div></div>' +
      '<div class="two"><div><span class="fl">' + tt('وزن (kg)', 'Weight (kg)') + '</span><input class="inp" id="pw" type="number" inputmode="decimal" value="' + (PF.w || '') + '"></div><div><span class="fl">' + tt('قدموں کا ہدف', 'Daily step goal') + '</span><input class="inp" id="pg" type="number" inputmode="numeric" value="' + lget('goal', 10000) + '"></div></div>' +
      '<span class="fl">' + tt('جنس', 'Sex') + '</span>' + chips([['m', ['مرد', 'Male']], ['f', ['خاتون', 'Female']]], PF.sex, 'ps') +
      '<span class="fl">' + tt('روزانہ سرگرمی', 'Activity level') + '</span>' + chips([['low', ['کم (بیٹھ کر کام)', 'Low (desk)']], ['light', ['ہلکی', 'Light']], ['mod', ['درمیانی', 'Moderate']], ['high', ['زیادہ', 'High']]], PF.act, 'pc') +
      '<span class="fl">' + tt('کوئی مسئلہ (ڈاکٹر نے بتایا ہو)', 'Conditions (if a doctor told you)') + '</span><div class="chips"><button class="chip' + (PF.cond.dm ? ' on' : '') + '" data-pd="dm">' + tt('شوگر', 'Diabetes') + '</button><button class="chip' + (PF.cond.bp ? ' on' : '') + '" data-pd="bp">' + tt('بلڈ پریشر', 'High BP') + '</button>' + (PF.sex === 'f' ? '<button class="chip' + (PF.cond.preg ? ' on' : '') + '" data-pd="preg">' + tt('حمل / دودھ پلانا', 'Pregnant / breastfeeding') + '</button>' : '') + '</div>' +
      '<span class="fl">' + tt('پانی کا ہدف (گلاس)', 'Water goal (glasses)') + '</span><input class="inp" id="pwg" type="number" inputmode="numeric" value="' + lget('wgoal', 8) + '">' +
      '<button class="btn" id="psave">' + T('محفوظ کریں', 'Save') + '</button></div>';
    $('#body').innerHTML = h + CL.footer();
    function keep() { PF.name = $('#pn').value.trim(); PF.age = num($('#pa').value) || 0; PF.h = num($('#ph').value) || 0; PF.w = num($('#pw').value) || 0; }
    bind('ps', function (v) { keep(); PF.sex = v; if (v !== 'f') PF.cond.preg = false; vProfile(); });
    bind('pc', function (v) { keep(); PF.act = v; vProfile(); });
    bind('pd', function (v) { keep(); PF.cond[v] = !PF.cond[v]; vProfile(); });
    $('#psave').onclick = function () {
      keep(); if (!PF.age || PF.age < 1 || PF.age > 110 || !PF.h || PF.h < 50 || PF.h > 250 || !PF.w || PF.w < 3 || PF.w > 300) { CL.toast('عمر، قد اور وزن درست لکھیں', 'Enter a valid age, height and weight'); return; }
      PF.sex = PF.sex || 'm'; PF.act = PF.act || 'light';
      lset('profile', PF); lset('goal', num($('#pg').value) || 10000); lset('wgoal', Math.max(1, Math.round(num($('#pwg').value) || 8)));
      PF = null; CL.toast('پروفائل محفوظ', 'Profile saved'); CL.goBack();
    };
  }
  V.profile = vProfile;

  /* ---- diet ---- */
  function sp(s) { var a = s.split(' | '); return a; }
  function meals(list) { return list.map(function (m) { return { t: sp(m[0]), i: m[1].map(sp) }; }); }
  var PLAN = {
    child: { name: ['بچے (2–12 سال)', 'Children (2–12)'], meals: meals([
      ['ناشتہ | Breakfast', ['انڈا یا دہی کے ساتھ آدھی سے ایک روٹی/پراٹھا | Egg or yogurt with half to one roti/paratha', 'ایک گلاس دودھ | A glass of milk', 'موسمی پھل کا ٹکڑا | A piece of seasonal fruit']],
      ['اسکول لنچ باکس | School lunch box', ['چکن یا انڈا رول، سبزی سینڈوچ یا پلاؤ | Chicken or egg roll, veg sandwich or pulao', 'پھل اور دہی یا چھوٹا دودھ | Fruit and yogurt or small milk', 'چپس/ٹافی کی جگہ بھنے چنے یا کھجور | Roasted chana or dates instead of chips/candy']],
      ['دوپہر / رات | Lunch / dinner', ['دال، سبزی، گوشت یا مچھلی باری باری | Daal, vegetables, meat or fish in turns', 'چھوٹی روٹی یا تھوڑے چاول | Small roti or a little rice', 'سلاد: کھیرا، گاجر | Salad: cucumber, carrot']],
      ['درمیان کا وقفہ | Snacks', ['دہی، پھل، مونگ پھلی، کھجور | Yogurt, fruit, peanuts, dates']]
    ]), tips: ['روزانہ 2–3 بار دودھ یا دہی (کیلشیم) | Milk or yogurt 2–3 times a day (calcium)', 'سافٹ ڈرنک، چپس اور بسکٹ کم سے کم | Keep soft drinks, chips and biscuits to a minimum', 'کھانے کے وقت ٹی وی/موبائل بند | No TV or phone at meal time', 'بچے کو کھانے پر مجبور نہ کریں، چھوٹے حصے دیں | Do not force-feed, serve small portions'] },
    teen: { name: ['نوجوان (13–18 سال)', 'Teens (13–18)'], meals: meals([
      ['ناشتہ (چھوڑیں نہیں) | Breakfast (never skip)', ['2 انڈے یا آملیٹ اور 1–2 روٹی | 2 eggs or omelette with 1–2 rotis', 'دودھ یا لسی | Milk or lassi', 'ایک پھل | One fruit']],
      ['دوپہر | Lunch', ['دال/چکن/گوشت کا سالن | Daal, chicken or meat curry', '2 روٹی یا ایک پلیٹ چاول | 2 rotis or a plate of rice', 'سبزی اور سلاد، دہی | Vegetables, salad and yogurt']],
      ['شام | Evening', ['چنا چاٹ، پھل، خشک میوہ یا دودھ | Chana chaat, fruit, nuts or milk']],
      ['رات | Dinner', ['گوشت/دال/انڈا + سبزی | Meat, daal or egg with vegetables', '1–2 روٹی، سلاد | 1–2 rotis, salad']]
    ]), tips: ['بڑھوتری کے لیے پروٹین، آئرن اور کیلشیم ضروری | Protein, iron and calcium matter for growth', 'برگر، فاسٹ فوڈ اور انرجی ڈرنک ہفتے میں کبھی کبھار | Burgers, fast food and energy drinks only occasionally', 'کھیل یا ورزش روزانہ کم از کم 60 منٹ | At least 60 minutes of play or exercise daily', 'پانی کافی پئیں | Drink enough water'] },
    adult: { name: ['بالغ (19–50 سال)', 'Adults (19–50)'], meals: meals([
      ['ناشتہ | Breakfast', ['1–2 روٹی (آٹے کی) اور انڈا/آملیٹ | 1–2 whole-wheat rotis with egg or omelette', 'یا دلیہ / جو کا دلیہ دودھ کے ساتھ | Or daliya / oats with milk', 'چائے میں چینی کم | Less sugar in tea']],
      ['درمیانی وقت | Mid-morning', ['ایک پھل: سیب، امرود، مالٹا | One fruit: apple, guava, orange']],
      ['دوپہر | Lunch', ['سبزی یا دال + 1–2 روٹی یا چھوٹی پلیٹ چاول | Vegetable or daal with 1–2 rotis or a small plate of rice', 'سلاد اور دہی/رائتہ | Salad and yogurt/raita']],
      ['شام | Evening', ['بھنے چنے، مٹھی بھر خشک میوہ یا پھل | Roasted chana, a handful of nuts or fruit']],
      ['رات (سونے سے 2 گھنٹے پہلے) | Dinner (2 hours before bed)', ['چکن/مچھلی/دال + سبزی | Chicken, fish or daal with vegetables', 'ایک روٹی، سلاد | One roti, salad']]
    ]), tips: ['آدھی پلیٹ سبزی، چوتھائی پروٹین، چوتھائی روٹی/چاول | Half the plate vegetables, quarter protein, quarter roti or rice', 'تلی ہوئی چیزیں اور میٹھے مشروبات کم | Cut fried foods and sugary drinks', 'روزانہ 8 گلاس پانی | About 8 glasses of water a day', 'کھانا آہستہ اور بیٹھ کر کھائیں | Eat slowly, sitting down'] },
    senior: { name: ['بزرگ (51+ سال)', 'Seniors (51+)'], meals: meals([
      ['ناشتہ | Breakfast', ['دلیہ یا ایک روٹی کے ساتھ انڈا | Daliya, or one roti with egg', 'دودھ یا دہی | Milk or yogurt']],
      ['درمیانی وقت | Mid-morning', ['نرم پھل: پپیتا، کیلا، سیب | Soft fruit: papaya, banana, apple']],
      ['دوپہر | Lunch', ['دال یا نرم سبزی | Daal or soft cooked vegetables', 'ایک روٹی یا تھوڑے چاول | One roti or a little rice', 'دہی | Yogurt']],
      ['شام | Evening', ['سوپ، کھچڑی یا چائے کے ساتھ ایک بسکٹ | Soup, khichdi, or tea with one biscuit']],
      ['رات | Dinner', ['ہلکا کھانا: مچھلی/چکن شوربہ + سبزی | Light meal: fish or chicken broth with vegetables']]
    ]), tips: ['تھوڑا تھوڑا، دن میں 5–6 بار کھائیں | Eat small meals 5–6 times a day', 'کیلشیم اور وٹامن D: دودھ، دہی، صبح کی دھوپ | Calcium and vitamin D: milk, yogurt, morning sunlight', 'نمک اور چینی کم، فائبر زیادہ | Less salt and sugar, more fibre', 'پیاس نہ لگے تب بھی پانی پئیں | Sip water even when not thirsty'] },
    preg: { name: ['حمل / دودھ پلانے والی خواتین', 'Pregnancy / breastfeeding'], meals: meals([
      ['ناشتہ | Breakfast', ['انڈا، روٹی، دودھ | Egg, roti, milk', 'ایک پھل | One fruit']],
      ['درمیانی وقت | Mid-morning', ['کھجور، خشک میوہ یا دہی | Dates, nuts or yogurt']],
      ['دوپہر | Lunch', ['دال/گوشت اور سبز پتوں والی سبزی (پالک، میتھی) | Daal or meat with leafy greens (spinach, methi)', 'روٹی/چاول، سلاد، دہی | Roti or rice, salad, yogurt']],
      ['شام | Evening', ['پھل یا چنا چاٹ، دودھ | Fruit or chana chaat, milk']],
      ['رات | Dinner', ['اچھی طرح پکا چکن/مچھلی/دال + سبزی | Well-cooked chicken, fish or daal with vegetables']]
    ]), tips: ['آئرن، فولیٹ اور کیلشیم والی غذائیں | Iron, folate and calcium rich foods', 'کچا یا ادھ پکا گوشت/انڈا اور غیر پیسچرائزڈ دودھ نہ لیں | Avoid raw or undercooked meat/eggs and unpasteurised milk', 'چائے کافی کم | Limit tea and coffee', 'گولیاں اور خوراک صرف لیڈی ڈاکٹر کے مشورے سے | Supplements and diet only as your doctor advises'] }
  };
  var COND = {
    dm: { name: ['شوگر کے لیے', 'For diabetes'], tips: ['چینی، گڑ، مٹھائی، جوس اور سافٹ ڈرنک سے پرہیز | Avoid sugar, gur, mithai, juices and soft drinks', 'میدے کی جگہ آٹے/جو کی روٹی، چاول چھوٹا حصہ اور سبزی کے بعد | Whole-wheat or barley roti instead of maida; small rice portion, eaten after vegetables', 'پھل چھلکے سمیت اور کم مقدار: امرود، سیب، جامن | Fruit with skin in small portions: guava, apple, jamun', 'آم، انگور، کیلا اور کھجور بہت کم | Very little mango, grapes, banana and dates', 'کھانے کے وقت باقاعدہ رکھیں، ناشتہ نہ چھوڑیں | Keep meal times regular, do not skip breakfast', 'کھانے کے بعد 10–15 منٹ چہل قدمی | Walk 10–15 minutes after meals', 'عام رہنمائی: فی کھانا تقریباً 45–60 گرام کاربوہائیڈریٹ سے آغاز؛ اپنی مقدار ڈائٹیشن سے طے کریں | General starting point: about 45–60 g carbohydrate per meal; confirm your amount with a dietitian'] },
    bp: { name: ['بلڈ پریشر کے لیے', 'For high blood pressure'], tips: ['نمک روزانہ ایک چائے کے چمچ (5 گرام) سے کم | Salt under 5 g (about one teaspoon) a day', 'اچار، پاپڑ، نمکین، چپس اور پراسیسڈ کھانا کم | Cut pickles, papad, namkeen, chips and processed food', 'دسترخوان پر اوپر سے نمک نہ چھڑکیں | Do not add salt at the table', 'سبزی، پھل، دہی اور دالیں زیادہ | More vegetables, fruit, yogurt and pulses', 'وزن قابو میں رکھیں اور روزانہ چلیں | Keep weight in check and walk daily'] },
    wl: { name: ['وزن کم کرنے کے لیے', 'For weight loss'], tips: ['آدھی پلیٹ سبزی/سلاد، روٹی 1 یا 2 | Half the plate vegetables or salad; 1–2 rotis', 'تلی چیزیں، میٹھے مشروبات اور رات کی دیر کی خوراک بند | Stop fried foods, sugary drinks and late-night eating', 'روزانہ کم از کم 30 منٹ تیز چہل قدمی | At least 30 minutes of brisk walking daily', 'ہفتے میں آدھا کلو تک کمی محفوظ رفتار ہے | Losing up to about 0.5 kg a week is a safe pace'] },
    ram: { name: ['رمضان (سحری / افطار)', 'Ramadan (sehri / iftar)'], meals: meals([
      ['سحری | Sehri', ['دلیہ یا انڈا + 1 روٹی | Daliya, or egg with 1 roti', 'دہی/لسی اور کافی پانی | Yogurt or lassi and plenty of water', 'ایک کھجور یا پھل | A date or a fruit']],
      ['افطار | Iftar', ['کھجور اور پانی سے افطار | Break fast with dates and water', 'پھر ہلکی چیز: پھل چاٹ، شوربہ | Then something light: fruit chaat, soup', 'نماز کے بعد اصل کھانا: دال/چکن + سبزی + 1 روٹی | After prayer the main meal: daal or chicken, vegetables and 1 roti']]
    ]), tips: ['پکوڑے، سموسے اور میٹھے شربت کم | Fewer pakoras, samosas and sugary sherbet', 'افطار سے سحری تک پانی کے 8 گلاس | Drink about 8 glasses between iftar and sehri', 'شوگر، بی پی یا دوا والے روزے سے پہلے ڈاکٹر سے ضرور پوچھیں | If you have diabetes, BP or take medicine, ask your doctor before fasting'] }
  };
  var DF = null;
  function dietGroup(p) { return p.cond && p.cond.preg && p.sex === 'f' ? 'preg' : p.age < 13 ? 'child' : p.age < 19 ? 'teen' : p.age < 51 ? 'adult' : 'senior'; }
  function vDiet() {
    CL.setTop(T('ڈائٹ پلان', 'Diet plan'));
    var p = prof();
    if (!p.age) { $('#body').innerHTML = '<div class="card center" style="margin-top:8px"><b>' + tt('پہلے پروفائل بنائیں', 'Create your profile first') + '</b><button class="btn" id="hp">' + T('پروفائل بنائیں', 'Create profile') + '</button></div>'; $('#hp').onclick = function () { nav('profile'); }; return; }
    if (!DF) DF = { dm: !!(p.cond && p.cond.dm), bp: !!(p.cond && p.cond.bp), wl: false, ram: false };
    var g = dietGroup(p), pl = PLAN[g], h = '<div class="card" style="margin-top:8px"><b style="font-size:17px">' + L(pl.name) + '</b>';
    if (g === 'adult' || g === 'senior') {
      var bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5), f = { low: 1.2, light: 1.375, mod: 1.55, high: 1.725 }[p.act || 'light'], t = bmr * f, mn = p.sex === 'f' ? 1200 : 1500;
      var tgt = DF.wl ? Math.max(mn, t - 400) : t;
      h += '<div class="stat"><div><b>' + Math.round(tgt / 10) * 10 + '</b><small>' + tt('روزانہ کیلوری (اندازہ)', 'kcal / day (estimate)') + '</small></div><div><b>' + Math.round(p.w * 0.8) + ' g</b><small>' + tt('پروٹین', 'Protein') + '</small></div><div><b>' + (g === 'adult' ? 8 : 7) + '</b><small>' + tt('گلاس پانی', 'Glasses water') + '</small></div></div><p class="note">' + tt('یہ اندازہ آپ کی عمر، وزن، قد اور سرگرمی سے لگایا گیا ہے۔', 'Estimated from your age, weight, height and activity.') + '</p>';
    } else if (g === 'preg') h += '<p class="note">' + tt('حمل کے دوسرے اور تیسرے مہینوں اور دودھ پلانے میں اضافی کیلوری کی ضرورت ہوتی ہے؛ مقدار اپنی ڈاکٹر سے طے کریں۔', 'Pregnancy (later months) and breastfeeding need extra energy; settle the amount with your doctor.') + '</p>';
    else h += '<p class="note">' + tt('بچوں اور نوجوانوں میں کیلوری گننے کی بجائے متوازن کھانے اور حصوں پر توجہ دیں۔', 'For children and teens, focus on balanced meals and portions rather than counting calories.') + '</p>';
    h += '</div><div class="chips" style="margin-top:12px">' + [['dm', ['شوگر', 'Diabetes']], ['bp', ['بلڈ پریشر', 'High BP']], ['wl', ['وزن کم', 'Weight loss']], ['ram', ['رمضان', 'Ramadan']]].map(function (o) { return '<button class="chip' + (DF[o[0]] ? ' on' : '') + '" data-dc="' + o[0] + '">' + L(o[1]) + '</button>'; }).join('') + '</div>';
    function mealsHtml(ms) { return ms.map(function (m) { return '<div class="meal"><h4>' + L(m.t) + '</h4><ul>' + m.i.map(function (i) { return '<li>' + L(i) + '</li>'; }).join('') + '</ul></div>'; }).join(''); }
    h += '<div class="card">' + (DF.ram ? mealsHtml(COND.ram.meals) : mealsHtml(pl.meals)) + '</div>';
    h += '<div class="card"><b>' + tt('اہم باتیں', 'Key points') + '</b><ul style="margin-top:6px">' + pl.tips.map(function (t) { return '<li style="margin-inline-start:18px;font-size:14.5px;line-height:1.7">' + L(sp(t)) + '</li>'; }).join('') + '</ul></div>';
    ['dm', 'bp', 'wl', 'ram'].forEach(function (k) { if (DF[k]) h += '<div class="card"><b style="color:var(--acc)">' + L(COND[k].name) + '</b><ul style="margin-top:6px">' + COND[k].tips.map(function (t) { return '<li style="margin-inline-start:18px;font-size:14.5px;line-height:1.7">' + L(sp(t)) + '</li>'; }).join('') + '</ul></div>'; });
    $('#body').innerHTML = h + disc() + '<button class="sbtn" id="hp" style="margin-top:12px;width:100%">' + tt('پروفائل بدلیں', 'Edit profile') + '</button>' + CL.footer();
    bind('dc', function (k) { DF[k] = !DF[k]; var y = $('#body').scrollTop; vDiet(); $('#body').scrollTop = y; });
    $('#hp').onclick = function () { nav('profile'); };
  }
  V.diet = vDiet;

  /* ---- sugar ---- */
  var SF = { ctx: 'fast' };
  var SC = [['fast', ['خالی پیٹ', 'Fasting']], ['after', ['کھانے کے 2 گھنٹے بعد', '2h after meal']], ['bed', ['سونے سے پہلے', 'Bedtime']], ['rand', ['کبھی بھی', 'Random']]];
  function sugSt(v, ctx) {
    if (v < 70) return ['rgb(var(--c2))', ['کم', 'Low']];
    var hi = ctx === 'fast' ? 130 : 180;
    if (v <= hi) return ['rgb(var(--c6))', ['ٹھیک', 'In range']];
    if (v <= 300) return ['rgb(var(--c4))', ['زیادہ', 'High']];
    return ['rgb(var(--c2))', ['بہت زیادہ', 'Very high']];
  }
  function nowLocal() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function vSugar() {
    CL.setTop(T('شوگر لاگ', 'Sugar log'));
    var l = lget('sugar', []).slice().sort(function (a, b) { return a.t - b.t; }), last = l[l.length - 1], h = '';
    if (last) {
      var st = sugSt(last.v, last.ctx), w7 = l.filter(function (x) { return x.t > Date.now() - 7 * 86400000; }), avg = w7.length ? w7.reduce(function (a, x) { return a + x.v; }, 0) / w7.length : 0, inr = w7.length ? Math.round(w7.filter(function (x) { return sugSt(x.v, x.ctx)[1][1] === 'In range'; }).length / w7.length * 100) : 0;
      h += '<div class="lhero" style="margin-top:8px"><div class="mut">' + tt('آخری ریڈنگ', 'Last reading') + ' · ' + fdate(last.t) + '</div><div class="big2" style="color:' + st[0] + '">' + last.v + ' <small style="font-size:14px">mg/dL</small></div><div style="color:' + st[0] + ';font-weight:700">' + L(st[1]) + ' · ' + L(SC.filter(function (c) { return c[0] === last.ctx; })[0][1]) + '</div>' +
        '<div class="stat"><div><b>' + Math.round(avg) + '</b><small>' + tt('7 دن اوسط', '7-day avg') + '</small></div><div><b>' + inr + '%</b><small>' + tt('ٹھیک رینج میں', 'In range') + '</small></div><div><b>' + l.length + '</b><small>' + tt('کل ریڈنگ', 'Readings') + '</small></div></div>';
      var rc = l.slice(-14);
      h += bars(rc.map(function (x) { return x.v; }), rc.map(function (x) { return sugSt(x.v, x.ctx)[0]; }), rc.map(function (x) { return new Date(x.t).getDate(); })) + '</div>';
      if (last.v < 70) h += '<div class="warn" style="border-color:var(--red)">' + tt('شوگر کم ہے۔ چکر، پسینہ یا کپکپی ہو تو فوراً 15 گرام میٹھا (3 چائے کے چمچ چینی/آدھا گلاس جوس) لیں، 15 منٹ بعد دوبارہ چیک کریں۔ بہتری نہ ہو تو ڈاکٹر یا ایمرجنسی سے رجوع کریں۔', 'Sugar is low. If dizzy, sweaty or shaky, take about 15 g of fast sugar (3 teaspoons sugar or half a glass of juice) and recheck in 15 minutes. If it does not improve, call your doctor or emergency services.') + '</div>';
      if (last.v > 300) h += '<div class="warn" style="border-color:var(--red)">' + tt('شوگر بہت زیادہ ہے۔ پانی پئیں اور جلد ڈاکٹر سے رابطہ کریں؛ قے، سانس میں دشواری یا غنودگی ہو تو فوراً ہسپتال جائیں۔', 'Sugar is very high. Drink water and contact your doctor soon; go to hospital at once if you vomit, are short of breath or drowsy.') + '</div>';
    }
    h += '<div class="card"><b>' + tt('نئی ریڈنگ', 'Add reading') + '</b><input class="inp" id="sv" type="number" inputmode="numeric" placeholder="mg/dL">' + chips(SC, SF.ctx, 'sc') + '<span class="fl">' + tt('وقت', 'Date and time') + '</span><input class="inp" id="st" type="datetime-local" value="' + nowLocal() + '"><button class="btn" id="ssave">' + T('محفوظ کریں', 'Save') + '</button><p class="note">' + tt('عام بالغ مریضوں کا ہدف: خالی پیٹ 80–130، کھانے کے 2 گھنٹے بعد 180 سے کم۔ آپ کے ڈاکٹر کا ہدف مختلف ہو سکتا ہے۔', 'Common adult targets: fasting 80–130, under 180 two hours after meals. Your doctor may set different targets.') + '</p></div>';
    h += '<div class="card">' + (l.length ? l.slice().reverse().slice(0, 40).map(function (x) { var s = sugSt(x.v, x.ctx); return '<div class="ent"><span class="dot" style="background:' + s[0] + ';width:12px;height:12px"></span><div class="m"><b>' + L(SC.filter(function (c) { return c[0] === x.ctx; })[0][1]) + ' · ' + L(s[1]) + '</b><small>' + fdate(x.t) + '</small></div><span class="v">' + x.v + '</span><button class="x" data-sd="' + x.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('ابھی کوئی ریڈنگ نہیں', 'No readings yet') + '</p>') + '</div>';
    $('#body').innerHTML = h + disc() + CL.footer();
    bind('sc', function (v) { SF.ctx = v; var a = $('#sv').value; vSugar(); $('#sv').value = a; });
    bind('sd', function (id) { lset('sugar', lget('sugar', []).filter(function (x) { return x.id !== id; })); vSugar(); });
    $('#ssave').onclick = function () { var v = num($('#sv').value), t = new Date($('#st').value).getTime(); if (!v || v < 20 || v > 800) { CL.toast('درست ریڈنگ لکھیں (20–800)', 'Enter a valid reading (20–800)'); return; } var a = lget('sugar', []); a.push({ id: uid(), t: isNaN(t) ? Date.now() : t, v: Math.round(v), ctx: SF.ctx }); lset('sugar', a); vSugar(); };
  }
  V.sugar = vSugar;

  /* ---- blood pressure ---- */
  function bpSt(s, d) {
    if (s > 180 || d > 120) return ['rgb(var(--c2))', ['خطرناک حد', 'Hypertensive crisis']];
    if (s >= 140 || d >= 90) return ['rgb(var(--c2))', ['بلند (درجہ 2)', 'High (stage 2)']];
    if (s >= 130 || d >= 80) return ['rgb(var(--c4))', ['بلند (درجہ 1)', 'High (stage 1)']];
    if (s >= 120) return ['rgb(var(--c4))', ['کچھ بلند', 'Elevated']];
    if (s < 90 || d < 60) return ['rgb(var(--c3))', ['کم', 'Low']];
    return ['rgb(var(--c6))', ['نارمل', 'Normal']];
  }
  function vBp() {
    CL.setTop(T('بلڈ پریشر', 'Blood pressure'));
    var l = lget('bp', []).slice().sort(function (a, b) { return a.t - b.t; }), last = l[l.length - 1], h = '';
    if (last) {
      var st = bpSt(last.s, last.d), w = l.filter(function (x) { return x.t > Date.now() - 7 * 86400000; }), as = w.length ? Math.round(w.reduce(function (a, x) { return a + x.s; }, 0) / w.length) : 0, ad = w.length ? Math.round(w.reduce(function (a, x) { return a + x.d; }, 0) / w.length) : 0, rc = l.slice(-14);
      h += '<div class="lhero" style="margin-top:8px"><div class="mut">' + tt('آخری ریڈنگ', 'Last reading') + ' · ' + fdate(last.t) + '</div><div class="big2" style="color:' + st[0] + '">' + last.s + '/' + last.d + ' <small style="font-size:14px">mmHg' + (last.p ? ' · ♥ ' + last.p : '') + '</small></div><div style="color:' + st[0] + ';font-weight:700">' + L(st[1]) + '</div><div class="stat"><div><b>' + as + '/' + ad + '</b><small>' + tt('7 دن اوسط', '7-day avg') + '</small></div><div><b>' + l.length + '</b><small>' + tt('کل ریڈنگ', 'Readings') + '</small></div><div><b>' + w.length + '</b><small>' + tt('اس ہفتے', 'This week') + '</small></div></div>' + bars(rc.map(function (x) { return x.s; }), rc.map(function (x) { return bpSt(x.s, x.d)[0]; }), rc.map(function (x) { return new Date(x.t).getDate(); })) + '</div>';
      if (last.s > 180 || last.d > 120) h += '<div class="warn" style="border-color:var(--red)">' + tt('ریڈنگ بہت زیادہ ہے۔ 5 منٹ آرام کے بعد دوبارہ ناپیں؛ اب بھی زیادہ ہو یا سینے میں درد، سانس کی تنگی، شدید سر درد ہو تو فوراً ایمرجنسی جائیں۔', 'This reading is very high. Rest 5 minutes and measure again; if still high, or you have chest pain, breathlessness or a severe headache, go to emergency care at once.') + '</div>';
    }
    h += '<div class="card"><b>' + tt('نئی ریڈنگ', 'Add reading') + '</b><div class="two"><div><span class="fl">' + tt('اوپر والی (Sys)', 'Systolic') + '</span><input class="inp" id="bs" type="number" inputmode="numeric" placeholder="120"></div><div><span class="fl">' + tt('نیچے والی (Dia)', 'Diastolic') + '</span><input class="inp" id="bd" type="number" inputmode="numeric" placeholder="80"></div></div><span class="fl">' + tt('نبض (اختیاری)', 'Pulse (optional)') + '</span><input class="inp" id="bpp" type="number" inputmode="numeric"><span class="fl">' + tt('وقت', 'Date and time') + '</span><input class="inp" id="bt" type="datetime-local" value="' + nowLocal() + '"><button class="btn" id="bsave">' + T('محفوظ کریں', 'Save') + '</button><p class="note">' + tt('نارمل: 120/80 سے کم۔ ناپنے سے پہلے 5 منٹ بیٹھ کر آرام کریں۔', 'Normal is under 120/80. Sit and rest 5 minutes before measuring.') + '</p></div>';
    h += '<div class="card">' + (l.length ? l.slice().reverse().slice(0, 40).map(function (x) { var s = bpSt(x.s, x.d); return '<div class="ent"><span class="dot" style="background:' + s[0] + ';width:12px;height:12px"></span><div class="m"><b>' + L(s[1]) + '</b><small>' + fdate(x.t) + (x.p ? ' · ♥ ' + x.p : '') + '</small></div><span class="v">' + x.s + '/' + x.d + '</span><button class="x" data-bd="' + x.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('ابھی کوئی ریڈنگ نہیں', 'No readings yet') + '</p>') + '</div>';
    $('#body').innerHTML = h + disc() + CL.footer();
    bind('bd', function (id) { lset('bp', lget('bp', []).filter(function (x) { return x.id !== id; })); vBp(); });
    $('#bsave').onclick = function () { var s = num($('#bs').value), d = num($('#bd').value), p = num($('#bpp').value), t = new Date($('#bt').value).getTime(); if (!s || !d || s < 50 || s > 280 || d < 30 || d > 180 || d >= s) { CL.toast('درست ریڈنگ لکھیں', 'Enter valid readings'); return; } var a = lget('bp', []); a.push({ id: uid(), t: isNaN(t) ? Date.now() : t, s: Math.round(s), d: Math.round(d), p: p ? Math.round(p) : 0 }); lset('bp', a); vBp(); };
  }
  V.bp = vBp;

  /* ---- water ---- */
  function vWater() {
    CL.setTop(T('پانی', 'Water'));
    var w = lget('water', {}), n = w[dkey()] || 0, g = lget('wgoal', 8), h = '<div class="lhero" style="margin-top:8px"><div class="big2" style="color:rgb(var(--c3))">' + n + ' / ' + g + ' <small style="font-size:14px">' + tt('گلاس', 'glasses') + '</small></div><div class="mut">' + (n * 250) + ' ml</div><div class="glass">';
    for (var i = 1; i <= Math.max(g, n); i++) h += '<button class="gl' + (i <= n ? ' f' : '') + '" data-g="' + i + '" aria-label="glass ' + i + '">' + ico('drop') + '</button>';
    h += '</div><button class="btn" id="wadd">' + T('ایک گلاس پیا', 'I drank a glass') + '</button></div>';
    var days = [], vals = [], cols = [], labs = [];
    for (var k = 6; k >= 0; k--) { var d = new Date(Date.now() - k * 86400000), v = w[dkey(d)] || 0; vals.push(v); cols.push(v >= g ? 'rgb(var(--c6))' : 'rgb(var(--c3))'); labs.push(d.getDate()); }
    h += '<div class="card"><b>' + tt('پچھلے 7 دن', 'Last 7 days') + '</b>' + bars(vals, cols, labs) + '</div>';
    var on = !!lget('wrem', false);
    h += '<div class="card"><div class="row"><div class="t"><b>' + tt('پانی کی یاد دہانی', 'Water reminders') + '</b><small class="e" style="display:block">' + tt('دن میں 6 بار نوٹیفکیشن', '6 notifications through the day') + '</small></div><button class="sw" id="wsw" aria-pressed="' + on + '" aria-label="water reminders"></button></div></div>' + CL.footer();
    $('#body').innerHTML = h;
    function set(x) { var m = lget('water', {}); m[dkey()] = Math.max(0, x); lset('water', m); vWater(); }
    bind('g', function (i) { set(+i === n ? n - 1 : +i); });
    $('#wadd').onclick = function () { set(n + 1); };
    $('#wsw').onclick = function () {
      var on2 = !lget('wrem', false), ids = [7101, 7102, 7103, 7104, 7105, 7106];
      if (!on2) { cancelLN(ids).then(function () { lset('wrem', false); vWater(); }); return; }
      scheduleLN([9, 11, 13, 15, 17, 19].map(function (hr, i) { return { id: ids[i], title: 'Cleanova Life', body: tt('پانی پینے کا وقت 💧', 'Time for a glass of water 💧'), schedule: { on: { hour: hr, minute: 0 }, allowWhileIdle: true } }; })).then(function (ok) { if (ok) { lset('wrem', true); CL.toast('یاد دہانی آن', 'Reminders on'); } else CL.toast('نوٹیفکیشن کی اجازت نہیں ملی', 'Notification permission denied'); vWater(); });
    };
  }
  V.water = vWater;

  /* ---- weight & BMI ---- */
  function vWeight() {
    CL.setTop(T('وزن اور BMI', 'Weight and BMI'));
    var p = prof(), l = lget('weight', []).slice().sort(function (a, b) { return a.t - b.t; }), cur = l.length ? l[l.length - 1].kg : p.w, b = p.h && cur ? cur / Math.pow(p.h / 100, 2) : null, h = '';
    if (b) {
      var c = bmiCat(b), lo = 18.5 * Math.pow(p.h / 100, 2), hi = 24.9 * Math.pow(p.h / 100, 2);
      h += '<div class="lhero" style="margin-top:8px"><div class="big2" style="color:' + rgb(c[1]) + '">BMI ' + b.toFixed(1) + '</div><div style="color:' + rgb(c[1]) + ';font-weight:700">' + L(c[0]) + '</div><div class="stat"><div><b>' + cur + ' kg</b><small>' + tt('موجودہ وزن', 'Current') + '</small></div><div><b>' + lo.toFixed(0) + '–' + hi.toFixed(0) + '</b><small>' + tt('صحت مند وزن (kg)', 'Healthy range (kg)') + '</small></div><div><b>' + (l.length > 1 ? ((cur - l[0].kg) > 0 ? '+' : '') + (cur - l[0].kg).toFixed(1) : '–') + '</b><small>' + tt('تبدیلی (kg)', 'Change (kg)') + '</small></div></div>';
      if (l.length > 1) { var rc = l.slice(-12), mn = Math.min.apply(null, rc.map(function (x) { return x.kg; })); h += bars(rc.map(function (x) { return x.kg - mn + 1; }), rc.map(function () { return 'rgb(var(--c4))'; }), rc.map(function (x) { return x.kg; })); }
      h += '<p class="note">' + tt('پاکستان/جنوبی ایشیا میں اکثر ڈاکٹر BMI 23 سے اوپر کو پہلے ہی زیادہ وزن سمجھتے ہیں۔', 'South Asian guidance often treats BMI above about 23 as already overweight; ask your doctor.') + '</p></div>';
    } else h += '<div class="card center" style="margin-top:8px"><p class="mut">' + tt('BMI کے لیے پروفائل میں قد اور وزن لکھیں۔', 'Add height and weight in your profile to see BMI.') + '</p><button class="btn" id="hp">' + T('پروفائل', 'Profile') + '</button></div>';
    h += '<div class="card"><b>' + tt('آج کا وزن', "Today's weight") + '</b><input class="inp" id="wk" type="number" inputmode="decimal" placeholder="kg"><button class="btn" id="wsave">' + T('محفوظ کریں', 'Save') + '</button></div><div class="card">' + (l.length ? l.slice().reverse().slice(0, 40).map(function (x) { return '<div class="ent"><div class="m"><b>' + x.kg + ' kg</b><small>' + fdate(x.t) + '</small></div><button class="x" data-wd="' + x.id + '" aria-label="delete">' + ico('trash') + '</button></div>'; }).join('') : '<p class="mut center">' + tt('ابھی کوئی ریکارڈ نہیں', 'No entries yet') + '</p>') + '</div>';
    $('#body').innerHTML = h + CL.footer();
    if ($('#hp')) $('#hp').onclick = function () { nav('profile'); };
    bind('wd', function (id) { lset('weight', lget('weight', []).filter(function (x) { return x.id !== id; })); vWeight(); });
    $('#wsave').onclick = function () { var k = num($('#wk').value); if (!k || k < 3 || k > 300) { CL.toast('درست وزن لکھیں', 'Enter a valid weight'); return; } var a = lget('weight', []); a.push({ id: uid(), t: Date.now(), kg: Math.round(k * 10) / 10 }); lset('weight', a); var q = prof(); if (q.age) { q.w = Math.round(k * 10) / 10; lset('profile', q); } vWeight(); };
  }
  V.weight = vWeight;

  /* ---- emergency card ---- */
  function vEmerg() {
    CL.setTop(T('ایمرجنسی کارڈ', 'Emergency card'));
    var e = lget('emerg', {}), BG = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    var h = '';
    if (e.name || e.bg || e.phone) {
      h += '<div class="lhero" style="margin-top:8px;border-color:rgba(251,113,133,.5)"><div class="mut">' + tt('ایمرجنسی معلومات', 'IN CASE OF EMERGENCY') + '</div><div class="big2">' + esc(e.name || '') + '</div><div class="stat"><div><b style="color:rgb(var(--c2))">' + esc(e.bg || '–') + '</b><small>' + tt('خون کا گروپ', 'Blood group') + '</small></div><div style="grid-column:span 2"><b style="font-size:15px">' + esc(e.allergy || '–') + '</b><small>' + tt('الرجی', 'Allergies') + '</small></div></div><p style="margin-top:10px;font-size:14px">' + esc(e.cond || '') + '</p>' + (e.meds ? '<p class="mut" style="font-size:13px">' + tt('دوائیں: ', 'Medicines: ') + esc(e.meds) + '</p>' : '') + (e.phone ? '<button class="btn" id="ecall" style="background:rgb(var(--c2));color:#fff">' + ico('phoneCall') + ' ' + esc(e.cname || '') + ' · <bdi dir="ltr">' + esc(e.phone) + '</bdi></button>' : '') + '</div>';
    }
    h += '<div class="card"><b>' + tt('معلومات بھریں', 'Fill in your details') + '</b><span class="fl">' + tt('نام', 'Name') + '</span><input class="inp" id="en1" maxlength="40" value="' + esc(e.name || '') + '" style="direction:auto"><span class="fl">' + tt('خون کا گروپ', 'Blood group') + '</span>' + chips(BG.map(function (b) { return [b, [b, b]]; }), e.bg, 'bg') + '<span class="fl">' + tt('الرجی', 'Allergies') + '</span><input class="inp" id="en2" maxlength="80" value="' + esc(e.allergy || '') + '" style="direction:auto"><span class="fl">' + tt('بیماریاں', 'Conditions') + '</span><input class="inp" id="en3" maxlength="80" value="' + esc(e.cond || '') + '" style="direction:auto"><span class="fl">' + tt('دوائیں', 'Medicines') + '</span><input class="inp" id="en4" maxlength="80" value="' + esc(e.meds || '') + '" style="direction:auto"><div class="two"><div><span class="fl">' + tt('رابطہ کا نام', 'Contact name') + '</span><input class="inp" id="en5" maxlength="30" value="' + esc(e.cname || '') + '" style="direction:auto"></div><div><span class="fl">' + tt('فون نمبر', 'Phone') + '</span><input class="inp" id="en6" type="tel" value="' + esc(e.phone || '') + '"></div></div><button class="btn" id="esv">' + T('محفوظ کریں', 'Save') + '</button></div>';
    $('#body').innerHTML = h + CL.footer();
    function keep() { e.name = $('#en1').value.trim(); e.allergy = $('#en2').value.trim(); e.cond = $('#en3').value.trim(); e.meds = $('#en4').value.trim(); e.cname = $('#en5').value.trim(); e.phone = $('#en6').value.trim(); }
    bind('bg', function (v) { keep(); e.bg = v; lset('emerg', e); vEmerg(); });
    $('#esv').onclick = function () { keep(); lset('emerg', e); CL.toast('محفوظ', 'Saved'); vEmerg(); };
    if ($('#ecall')) $('#ecall').onclick = function () { var u = 'tel:' + e.phone.replace(/[^0-9+]/g, ''); TP.openUrl({ url: u }).catch(function () { window.open(u, '_blank'); }); };
  }
  V.emerg = vEmerg;

  /* ================= BACKUP ================= */
  TO.backup = 'settings';
  function vBackup() {
    CL.setTop(T('بیک اپ', 'Backup'));
    var h = '<div class="card" style="margin-top:8px"><b>' + tt('بیک اپ کاپی کریں', 'Copy a backup') + '</b><p class="note">' + tt('صحت، خرچ، یاد دہانیوں اور پروفائل کا ڈیٹا ایک متن میں کاپی ہو جاتا ہے۔ اسے اپنے نوٹس یا واٹس ایپ "Saved messages" میں پیسٹ کر کے رکھ لیں۔', 'Your health, expense, reminder and profile data is copied as one block of text. Paste it into your notes or WhatsApp "message yourself" to keep it safe.') + '</p><button class="btn" id="bkc">' + T('بیک اپ کاپی کریں', 'Copy backup') + '</button></div>' +
      '<div class="card"><b>' + tt('بیک اپ سے بحال کریں', 'Restore from backup') + '</b><textarea class="inp" id="bkt" rows="5" placeholder="' + tt('یہاں بیک اپ پیسٹ کریں', 'Paste your backup here') + '" style="min-height:110px;font-size:13px"></textarea><p class="note">' + tt('بحال کرنے سے اس فون کا موجودہ صحت اور خرچ کا ڈیٹا بدل جائے گا۔', 'Restoring replaces the health and expense data currently on this phone.') + '</p><button class="btn o" id="bkr">' + T('بحال کریں', 'Restore') + '</button></div>' + CL.footer();
    $('#body').innerHTML = h;
    $('#bkc').onclick = function () {
      var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('cleanova.life.') === 0) o[k] = localStorage.getItem(k); }
      var txt = 'CLEANOVA-LIFE-BACKUP\n' + JSON.stringify(o);
      var done = function () { CL.toast('بیک اپ کاپی ہو گیا', 'Backup copied'); };
      try { navigator.clipboard.writeText(txt).then(done, function () { fallback(txt); }); } catch (e) { fallback(txt); }
      function fallback(t) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { CL.toast('کاپی نہیں ہو سکا', 'Could not copy'); } ta.remove(); }
    };
    $('#bkr').onclick = function () {
      var t = $('#bkt').value.trim(), i = t.indexOf('\n');
      try {
        if (t.indexOf('CLEANOVA-LIFE-BACKUP') !== 0) throw new Error('x');
        var o = JSON.parse(t.slice(i + 1)), n = 0;
        Object.keys(o).forEach(function (k) { if (k.indexOf('cleanova.life.') === 0 && typeof o[k] === 'string') { JSON.parse(o[k]); localStorage.setItem(k, o[k]); n++; } });
        CL.toast('بحال ہو گیا (' + n + ')', 'Restored (' + n + ' items)');
      } catch (e) { CL.toast('بیک اپ درست نہیں', 'That is not a valid backup'); }
    };
  }
  V.backup = vBackup;
  CL.u = { lget: lget, lset: lset, uid: uid, L: L, num: num, pad: pad, dkey: dkey, startOfDay: startOfDay, chips: chips, bind: bind, rgba: rgba, ib: ib, rs: rs, nav: nav, disc: disc, bars: bars, fdate: fdate, fday: fday, scheduleLN: scheduleLN, cancelLN: cancelLN, upcoming: upcoming, waterToday: waterToday, spentOn: spentOn, prof: prof, EC: EC, EF: EF, rgb: rgb, TO: TO, nowLocal: nowLocal, sugSt: sugSt, bpSt: bpSt, brand: brand, vLife: vLife, vExp: vExp };
  if (window.CLifeInit2) window.CLifeInit2(CL);
};
