/* Cleanova Life: Family circle. Members install Cleanova Family on their own phones and agree to share;
   this screen shows them on a map, their battery, children's screen time and alerts. Data lives in the owner's own Firebase project. */
window.CLifeInit11 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var L = U.L, lget = U.lget, lset = U.lset, bind = U.bind;
  var FA = function () { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FamilyAlert; };
  var BASE = 'https://firestore.googleapis.com/v1/projects/cleanova-5f6f5/databases/(default)/documents/';
  CL.regTool('family', '🏠', 2, ['فیملی سرکل', 'Family circle'], 'safe', ['گھر والوں کی لوکیشن، بیٹری، بچوں کا اسکرین ٹائم اور SOS (سب کی رضامندی سے)', 'Family location, battery, kids screen time and SOS (with everyone\'s consent)'], 'فیملی سرکل خاندان گھر والے بچے لوکیشن ٹریکر family tracker location sos map اسکرین ٹائم بیٹری life360 child', true);

  var ST = { data: null, err: '', t: 0, busy: false, tm: null };
  function F() { return lget('fam', null); }
  function sheet(h) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = h; return m; }
  function closeSheet() { $('#modal').hidden = true; }
  function ago(t) { if (!t) return tt('ابھی نہیں', 'never'); var m = Math.round((Date.now() - t) / 60000); return m < 1 ? tt('ابھی', 'now') : m < 60 ? m + tt(' منٹ پہلے', ' min ago') : m < 1440 ? Math.round(m / 60) + tt(' گھنٹے پہلے', ' h ago') : Math.round(m / 1440) + tt(' دن پہلے', ' d ago'); }
  function dur(ms) { var m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? h + tt(' گھ ', 'h ') + (m % 60) + tt(' م', 'm') : m + tt(' منٹ', ' min'); }

  /* ---------- Firestore over REST ---------- */
  function auth() { var p = FA(); if (!p) return Promise.reject(new Error('plugin')); return p.token(); }
  function enc(v) { return typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : (v % 1 === 0 ? { integerValue: String(v) } : { doubleValue: v }); }
  function dec(doc) { var o = {}, f = (doc && doc.fields) || {}; for (var k in f) { var v = f[k]; o[k] = v.stringValue !== undefined ? v.stringValue : v.integerValue !== undefined ? +v.integerValue : v.doubleValue !== undefined ? v.doubleValue : v.booleanValue !== undefined ? v.booleanValue : null; } if (doc && doc.name) o._id = doc.name.split('/').pop(); return o; }
  function api(method, path, obj, q) {
    return auth().then(function (a) {
      var body, url = BASE + path + (q || '');
      if (obj && method === 'PATCH') { var f = {}; Object.keys(obj).forEach(function (k) { f[k] = enc(obj[k]); }); body = JSON.stringify({ fields: f }); url += (q ? '&' : '?') + Object.keys(obj).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&'); }
      else if (obj) { var g = {}; Object.keys(obj).forEach(function (k) { g[k] = enc(obj[k]); }); body = JSON.stringify({ fields: g }); }
      return fetch(url, { method: method, headers: { Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' }, body: body }).then(function (r) { return r.text().then(function (t) { if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; } return t ? JSON.parse(t) : {}; }); });
    });
  }
  function myUid() { return auth().then(function (a) { return a.uid; }); }
  function mkCode() { var al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = ''; (window.crypto || window.msCrypto).getRandomValues(b); for (var i = 0; i < 8; i++) s += al[b[i] % al.length]; return s; }
  function notifPerm() { try { if (CL.LN && CL.LN.requestPermissions) CL.LN.requestPermissions().catch(function () {}); } catch (e) { /* ignore */ } }
  function setAlerts(code, on) { var p = FA(); if (p) p.setup({ code: code, on: on }).catch(function () {}); }

  /* ---------- loading the circle ---------- */
  function load(force) {
    var f = F(); if (!f) return Promise.resolve();
    if (ST.busy) return Promise.resolve(); ST.busy = true;
    var c = 'circles/' + f.code;
    return Promise.all([api('GET', c), api('GET', c + '/members', null, '?pageSize=60'), api('GET', c + '/events', null, '?orderBy=ts%20desc&pageSize=15').catch(function () { return {}; })]).then(function (r) {
      return myUid().then(function (uid) {
        var circle = dec(r[0]), mem = (r[1].documents || []).map(dec), ev = (r[2].documents || []).map(dec);
        ST.data = { circle: circle, members: mem, events: ev, uid: uid, admin: circle.admin === uid, zones: [] };
        try { ST.data.zones = JSON.parse(circle.zones || '[]'); } catch (e) { ST.data.zones = []; }
        var me = mem.filter(function (m) { return m._id === uid; })[0];
        ST.data.me = me || null; ST.err = ''; ST.t = Date.now();
      });
    }).catch(function (e) { ST.err = e.status === 404 ? 'gone' : e.status === 403 ? 'denied' : 'net'; }).then(function () { ST.busy = false; });
  }

  /* ---------- screen ---------- */
  function vFamily() {
    CL.setTop(T('فیملی سرکل', 'Family circle'));
    var f = F(); clearInterval(ST.tm);
    if (!f) { intro(); return; }
    $('#body').innerHTML = '<div class="card center" style="margin-top:8px"><p class="mut">' + tt('لوڈ ہو رہا ہے…', 'Loading…') + '</p></div>' + CL.footer();
    var draw = function () { if (S.view !== 'family') { clearInterval(ST.tm); return; } paint(); };
    load().then(draw);
    ST.tm = setInterval(function () { if (S.view !== 'family') { clearInterval(ST.tm); return; } if (!$('#modal').hidden) return; load().then(function () { if ($('#modal').hidden) draw(); }); }, 30000);
  }
  function intro() {
    $('#body').innerHTML = '<div class="card" style="margin-top:8px;text-align:center"><div style="font-size:42px">🏠</div><b style="font-size:18px">' + tt('فیملی سرکل', 'Family circle') + '</b><p class="note">' + tt('گھر والوں اور بچوں کی لوکیشن، بیٹری، بچوں کا اسکرین ٹائم، گھر/اسکول پہنچنے کی اطلاع اور SOS — لیکن صرف سب کی رضامندی سے۔', 'Location, battery, kids\' screen time, arrival alerts and SOS — only with everyone\'s consent.') + '</p><button class="sbtn p" id="fc" style="width:100%">' + tt('نیا سرکل بنائیں', 'Create a circle') + '</button><button class="sbtn" id="fj" style="width:100%;margin-top:8px">' + tt('کوڈ سے شامل ہوں', 'Join with a code') + '</button></div>' +
      '<div class="card"><b>' + tt('کیسے کام کرتا ہے', 'How it works') + '</b><ol style="margin:6px 18px;line-height:1.9;font-size:14px"><li>' + tt('آپ سرکل بنائیں، 8 حرفی کوڈ ملے گا۔', 'You create a circle and get an 8-letter code.') + '</li><li>' + tt('ہر فرد اپنے فون پر "Cleanova Family" ایپ لگائے اور کوڈ ڈالے۔', 'Each person installs "Cleanova Family" on their phone and enters the code.') + '</li><li>' + tt('آپ یہاں اس کی درخواست منظور کریں۔', 'You approve the request here.') + '</li></ol><p class="note">' + tt('ہر فون پر شیئرنگ کے دوران نوٹیفکیشن نظر آتا ہے۔ پیغامات، تصویریں اور براؤزنگ کبھی نہیں پڑھے جاتے۔ صرف اپنے خاندان کے لیے۔', 'A notice is always visible on each phone while sharing. Messages, photos and browsing are never read. For your own family only.') + '</p></div>' + CL.footer();
    $('#fc').onclick = createSheet; $('#fj').onclick = joinSheet;
  }
  function createSheet() {
    sheet('<b style="font-size:17px">' + tt('نیا سرکل', 'New circle') + '</b><input class="inp" id="cn" placeholder="' + tt('سرکل کا نام (مثلاً ہمارا گھر)', 'Circle name (e.g. Our home)') + '" style="margin-top:10px"><input class="inp" id="cm" placeholder="' + tt('آپ کا نام', 'Your name') + '" style="margin-top:8px"><div class="two" style="margin-top:12px"><button class="sbtn" id="cx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="co">' + tt('بنائیں', 'Create') + '</button></div>');
    $('#cx').onclick = closeSheet;
    $('#co').onclick = function () {
      var n = $('#cn').value.trim() || 'Family', m = $('#cm').value.trim(); if (!m) { CL.toast('اپنا نام لکھیں', 'Enter your name'); return; }
      var code = mkCode(); $('#co').disabled = true;
      myUid().then(function (uid) { return api('PATCH', 'circles/' + code, { admin: uid, name: n, zones: '[]', created: Date.now() }).then(function () { return api('PATCH', 'circles/' + code + '/members/' + uid, { name: m, role: 'adult', ok: true, ts: Date.now() }); }); })
        .then(function () { lset('fam', { code: code, name: m }); setAlerts(code, true); notifPerm(); closeSheet(); CL.toast('سرکل بن گیا', 'Circle created'); vFamily(); })
        .catch(function (e) { $('#co').disabled = false; CL.toast(e.status === 403 ? 'Firebase rules ابھی نہیں لگے' : 'انٹرنیٹ یا Firebase کا مسئلہ', e.status === 403 ? 'Firebase rules not set yet' : 'Internet or Firebase problem'); });
    };
  }
  function joinSheet() {
    sheet('<b style="font-size:17px">' + tt('سرکل میں شامل ہوں', 'Join a circle') + '</b><p class="note">' + tt('اپنے کسی دوسرے بالغ کے سرکل میں شامل ہونے کے لیے۔ بچے کے فون پر "Cleanova Family" ایپ استعمال کریں۔', 'To join another adult\'s circle. Use the "Cleanova Family" app on a child\'s phone.') + '</p><input class="inp" id="jc" placeholder="CODE" maxlength="10" style="direction:ltr;text-align:center;letter-spacing:3px;text-transform:uppercase"><input class="inp" id="jn" placeholder="' + tt('آپ کا نام', 'Your name') + '" style="margin-top:8px"><div class="two" style="margin-top:12px"><button class="sbtn" id="jx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="jo">' + tt('شامل ہوں', 'Join') + '</button></div>');
    $('#jx').onclick = closeSheet;
    $('#jo').onclick = function () {
      var c = $('#jc').value.trim().toUpperCase(), n = $('#jn').value.trim(); if (c.length < 6 || !n) { CL.toast('کوڈ اور نام لکھیں', 'Enter code and name'); return; }
      $('#jo').disabled = true;
      api('GET', 'circles/' + c).then(function () { return myUid(); }).then(function (uid) { return api('PATCH', 'circles/' + c + '/members/' + uid, { name: n, role: 'adult', ok: false, ts: Date.now() }); })
        .then(function () { lset('fam', { code: c, name: n }); setAlerts(c, true); notifPerm(); closeSheet(); vFamily(); })
        .catch(function (e) { $('#jo').disabled = false; CL.toast(e.status === 404 ? 'یہ کوڈ نہیں ملا' : 'انٹرنیٹ کا مسئلہ', e.status === 404 ? 'Code not found' : 'Internet problem'); });
    };
  }

  function paint() {
    var f = F(); if (!f) return intro(); var D = ST.data;
    if (ST.err === 'gone') { $('#body').innerHTML = '<div class="card center"><p>' + tt('یہ سرکل اب موجود نہیں۔', 'This circle no longer exists.') + '</p><button class="sbtn r" id="fl">' + tt('ہٹائیں', 'Remove') + '</button></div>'; $('#fl').onclick = leave; return; }
    if (!D) { $('#body').innerHTML = '<div class="card center"><p class="mut">' + (ST.err === 'denied' ? tt('رسائی نہیں ملی۔ منتظم کی منظوری چاہیے یا Firebase rules نہیں لگے۔', 'No access yet. Needs approval, or Firebase rules are not set.') : tt('انٹرنیٹ نہیں یا لوڈ نہیں ہو سکا۔', 'No internet or could not load.')) + '</p><button class="sbtn p" id="fr">' + tt('دوبارہ کوشش', 'Retry') + '</button><button class="sbtn r" id="fl" style="margin-top:8px">' + tt('سرکل چھوڑیں', 'Leave circle') + '</button></div>'; $('#fr').onclick = function () { vFamily(); }; $('#fl').onclick = leave; return; }
    var mem = D.members, pend = mem.filter(function (m) { return !m.ok; }), ok = mem.filter(function (m) { return m.ok; }), now = Date.now();
    if (D.me && !D.me.ok && !D.admin) { $('#body').innerHTML = '<div class="card center" style="margin-top:8px"><div style="font-size:38px">⏳</div><b>' + tt('منظوری کا انتظار', 'Waiting for approval') + '</b><p class="note">' + tt('سرکل کے منتظم کو آپ کی درخواست منظور کرنی ہوگی۔', 'The circle admin must approve your request.') + '</p><button class="sbtn" id="fr" style="width:100%">' + tt('دوبارہ دیکھیں', 'Check again') + '</button><button class="sbtn r" id="fl" style="width:100%;margin-top:8px">' + tt('درخواست واپس لیں', 'Withdraw') + '</button></div>'; $('#fr').onclick = function () { vFamily(); }; $('#fl').onclick = leave; return; }
    var sosRecent = D.events.filter(function (e) { return e.type === 'sos' && now - e.ts < 3600000 && e.uid !== D.uid; })[0];
    var h = '';
    if (sosRecent) h += '<div class="warn" style="background:rgba(244,63,94,.14);border-color:rgba(244,63,94,.5)">🆘 <b>' + esc(sosRecent.name) + '</b> ' + tt('نے SOS بھیجا', 'sent an SOS') + ' · ' + ago(sosRecent.ts) + (sosRecent.lat ? ' <button class="sbtn" data-gm="' + sosRecent.lat + ',' + sosRecent.lng + '" style="min-height:34px;margin-inline-start:6px">' + tt('جگہ', 'Place') + '</button>' : '') + '</div>';
    h += '<div class="card" style="margin-top:8px"><div class="row" style="padding:0"><span class="dd">🏠</span><div class="t" style="flex:1"><b>' + esc(D.circle.name || 'Family') + '</b><small class="e" style="display:block">' + (D.admin ? tt('آپ منتظم ہیں', 'You are the admin') : tt('رکن', 'Member')) + ' · ' + ok.length + tt(' افراد', ' people') + '</small></div></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px"><b dir="ltr" style="font-size:22px;letter-spacing:4px;flex:1;text-align:center;background:var(--bg);border-radius:12px;padding:6px">' + esc(f.code) + '</b><button class="sbtn p" id="fsh">' + tt('دعوت', 'Invite') + '</button></div></div>';
    if (D.admin && pend.length) h += '<div class="sec">' + tt('نئی درخواستیں', 'REQUESTS') + '</div>' + pend.map(function (m) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><span class="dd">🙋</span><div class="t" style="flex:1"><b>' + esc(m.name || '?') + '</b><small class="e" style="display:block">' + (m.role === 'child' ? tt('بچہ', 'Child') : tt('بالغ', 'Adult')) + '</small></div><button class="sbtn p" data-ap="' + m._id + '" style="min-height:38px">' + tt('منظور', 'Approve') + '</button><button class="sbtn r" data-rm="' + m._id + '" style="min-height:38px">✕</button></div></div>'; }).join('');
    if (ok.some(function (m) { return m.lat; })) h += '<button class="sbtn" id="fall" style="width:100%;margin-top:10px">🗺 ' + tt('سب کو نقشے پر دیکھیں', 'See everyone on the map') + '</button>';
    h += '<div class="sec">' + tt('افراد', 'PEOPLE') + '</div>' + ok.map(function (m) { return memberCard(m, D, now); }).join('');
    h += '<div class="sec">' + tt('جگہیں (ہوم، اسکول…)', 'PLACES (HOME, SCHOOL…)') + '</div>' + (D.zones.length ? D.zones.map(function (z) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><span class="dd">📌</span><div class="t" style="flex:1"><b>' + esc(z.n) + '</b><small class="e" style="display:block">' + tt('دائرہ ', 'Radius ') + z.r + ' m</small></div>' + (D.admin ? '<button class="sbtn r" data-zd="' + esc(z.id) + '" style="min-height:36px">✕</button>' : '') + '</div></div>'; }).join('') : '<p class="note">' + tt('کوئی جگہ نہیں۔ جگہ شامل کریں تو کوئی پہنچے یا نکلے تو اطلاع ملے گی۔', 'No places yet. Add one to get an alert when someone arrives or leaves.') + '</p>') + (D.admin ? '<button class="sbtn" id="fz" style="width:100%;margin-top:6px">＋ ' + tt('جگہ شامل کریں', 'Add a place') + '</button>' : '');
    h += '<div class="sec">' + tt('حالیہ اطلاعات', 'RECENT ALERTS') + '</div>' + (D.events.length ? D.events.map(function (e) { var ic = { sos: '🆘', enter: '📍', leave: '🚶', low: '🔋', stop: '⚠️' }[e.type] || '•', tx = { sos: tt('نے SOS بھیجا', 'sent SOS'), enter: tt(' پہنچے: ', ' arrived: ') + esc(e.zone || ''), leave: tt(' نکلے: ', ' left: ') + esc(e.zone || ''), low: tt('کی بیٹری کم: ', 'battery low: ') + esc(e.zone || '') + '%', stop: tt('نے شیئرنگ بند کی', 'stopped sharing') }[e.type] || ''; return '<div class="card" style="margin:5px 0;padding:10px"><small>' + ic + ' <b>' + esc(e.name || '') + '</b> ' + tx + ' <span class="mut">· ' + ago(e.ts) + '</span></small></div>'; }).join('') : '<p class="note">' + tt('ابھی کوئی اطلاع نہیں۔', 'No alerts yet.') + '</p>');
    h += '<div class="sec">' + tt('سیٹنگ', 'SETTINGS') + '</div><button class="sbtn r" id="fl" style="width:100%">' + (D.admin ? tt('سرکل ختم کریں', 'Delete circle') : tt('سرکل چھوڑیں', 'Leave circle')) + '</button><p class="note">' + tt('اطلاعات تقریباً ہر 15 منٹ بعد فون پر آتی ہیں (کلینووا بند ہو تب بھی)، کھلا ہو تو ہر 30 سیکنڈ بعد تازہ ہوتا ہے۔', 'Alerts arrive about every 15 minutes even when Cleanova is closed; the screen refreshes every 30 seconds while open.') + '</p>' + CL.footer();
    $('#body').innerHTML = h; wire(D, f);
  }
  function memberCard(m, D, now) {
    var stale = now - (m.ts || 0) > 30 * 60000, me = m._id === D.uid, h = '<div class="card" style="margin:8px 0"><div class="row" style="padding:0"><span class="dd" style="background:rgba(45,212,191,.15)">' + (m.role === 'child' ? '🧒' : '🧑') + '</span><div class="t" style="flex:1;min-width:0"><b>' + esc(m.name || '?') + (me ? ' (' + tt('آپ', 'you') + ')' : '') + '</b><small class="e" style="display:block">' + (m.off ? '⚠️ ' + tt('شیئرنگ بند', 'Sharing off') : (stale ? '⚠️ ' : '🟢 ') + ago(m.ts)) + (m.bat >= 0 && m.bat !== undefined ? ' · 🔋 ' + m.bat + '%' + (m.chg ? '⚡' : '') : '') + '</small></div></div>';
    if (m.lat && m.loc !== false) h += '<div style="margin-top:8px;display:flex;gap:8px"><button class="sbtn" data-map="' + m._id + '" style="flex:1;min-height:38px">🗺 ' + tt('نقشہ اور راستہ', 'Map and route') + '</button><button class="sbtn" data-gm="' + m.lat + ',' + m.lng + '" style="min-height:38px">Google Maps</button></div><small class="e" style="display:block;margin-top:4px">📍 ' + tt('جگہ کا وقت: ', 'Location time: ') + ago(m.lts) + (m.acc ? ' · ±' + m.acc + ' m' : '') + '</small>';
    else if (!me) h += '<small class="e" style="display:block;margin-top:6px">' + tt('لوکیشن شیئر نہیں ہو رہی', 'Location not shared') + '</small>';
    if (m.use && m.ut !== undefined) { var apps = []; try { apps = JSON.parse(m.apps || '[]'); } catch (e) { /* ignore */ } h += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)"><b style="font-size:14px">⏱ ' + tt('آج کا اسکرین ٹائم: ', 'Screen time today: ') + dur(m.ut) + '</b><small class="e"> · 🔓 ' + (m.unl || 0) + '</small>' + apps.filter(function (a) { return a[1] > 60000; }).slice(0, 4).map(function (a) { return '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:3px"><span dir="auto">' + esc(a[0]) + '</span><span dir="ltr" class="mut">' + dur(a[1]) + '</span></div>'; }).join('') + '<button class="sbtn" data-wk="' + m._id + '" style="margin-top:8px;min-height:34px;width:100%">📊 ' + tt('7 دن کی رپورٹ', '7-day report') + '</button></div>'; }
    if (D.admin && !me) h += '<button class="sbtn r" data-rm="' + m._id + '" style="margin-top:8px;min-height:32px;width:100%">' + tt('سرکل سے ہٹائیں', 'Remove from circle') + '</button>';
    return h + '</div>';
  }
  function wire(D, f) {
    $('#fsh').onclick = function () { var t = tt('🏠 ہمارے فیملی سرکل میں شامل ہوں:\n1) "Cleanova Family" ایپ انسٹال کریں\n2) نام اور یہ کوڈ ڈالیں: ', '🏠 Join our family circle:\n1) Install the "Cleanova Family" app\n2) Enter your name and this code: ') + f.code; if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { try { navigator.clipboard.writeText(t); } catch (e) { /* ignore */ } CL.toast('دعوت کاپی ہو گئی', 'Invite copied'); } };
    bind('gm', function (v) { CL.openUrl('https://www.google.com/maps/search/?api=1&query=' + v); });
    bind('ap', function (id) { api('PATCH', 'circles/' + f.code + '/members/' + id, { ok: true }).then(function () { CL.toast('منظور ہو گیا', 'Approved'); vFamily(); }).catch(function () { CL.toast('ناکام', 'Failed'); }); });
    bind('rm', function (id) { api('DELETE', 'circles/' + f.code + '/members/' + id).then(function () { vFamily(); }).catch(function () { CL.toast('ناکام', 'Failed'); }); });
    bind('map', function (id) { mapSheet(D, id); });
    bind('wk', function (id) { weekSheet(D.members.filter(function (m) { return m._id === id; })[0]); });
    bind('zd', function (id) { saveZones(f, D.zones.filter(function (z) { return z.id !== id; })); });
    var a = $('#fall'); if (a) a.onclick = function () { mapSheet(D, null); };
    var z = $('#fz'); if (z) z.onclick = function () { zoneSheet(D, f); };
    $('#fl').onclick = leave;
  }
  function saveZones(f, zs) { api('PATCH', 'circles/' + f.code, { zones: JSON.stringify(zs) }).then(function () { CL.toast('محفوظ ہو گیا', 'Saved'); vFamily(); }).catch(function () { CL.toast('ناکام', 'Failed'); }); }
  function zoneSheet(D, f) {
    var pts = [{ k: 'me', t: tt('میری موجودہ جگہ', 'My current location') }].concat(D.members.filter(function (m) { return m.lat && m._id !== D.uid; }).map(function (m) { return { k: m._id, t: tt('کی جگہ: ', 'Location of: ') + m.name }; }));
    sheet('<b style="font-size:17px">' + tt('نئی جگہ', 'New place') + '</b><input class="inp" id="zn" placeholder="' + tt('نام (گھر، اسکول، ٹیوشن)', 'Name (Home, School)') + '" style="margin-top:10px"><span class="fl">' + tt('کہاں سے لیں', 'Take position from') + '</span><select class="inp" id="zs">' + pts.map(function (p) { return '<option value="' + esc(p.k) + '">' + esc(p.t) + '</option>'; }).join('') + '</select><span class="fl">' + tt('دائرہ', 'Radius') + '</span><select class="inp" id="zr"><option>100</option><option selected>200</option><option>300</option><option>500</option></select><p class="note">' + tt('جس جگہ کی بات ہو، اپنے آپ وہاں کھڑے ہو کر "میری موجودہ جگہ" چنیں، یا اس جگہ موجود فرد کی جگہ چنیں۔', 'Stand at the place and choose "My current location", or use a member who is there.') + '</p><div class="two" style="margin-top:10px"><button class="sbtn" id="zx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="zo">' + tt('محفوظ', 'Save') + '</button></div>');
    $('#zx').onclick = closeSheet;
    $('#zo').onclick = function () {
      var n = $('#zn').value.trim(); if (!n) { CL.toast('نام لکھیں', 'Enter a name'); return; } var k = $('#zs').value, r = +$('#zr').value;
      var add = function (la, lo) { var zs = D.zones.concat([{ id: 'z' + Date.now().toString(36), n: n, lat: la, lng: lo, r: r }]); closeSheet(); saveZones(f, zs); };
      if (k !== 'me') { var m = D.members.filter(function (x) { return x._id === k; })[0]; add(m.lat, m.lng); return; }
      CL.toast('لوکیشن لی جا رہی ہے…', 'Getting location…');
      try { navigator.geolocation.getCurrentPosition(function (p) { add(p.coords.latitude, p.coords.longitude); }, function () { CL.toast('لوکیشن نہیں ملی', 'Could not get location'); }, { enableHighAccuracy: true, timeout: 15000 }); } catch (e) { CL.toast('لوکیشن نہیں ملی', 'Could not get location'); }
    };
  }
  function mapSheet(D, id) {
    var list = id ? D.members.filter(function (m) { return m._id === id; }) : D.members.filter(function (m) { return m.ok && m.lat; });
    sheet('<b style="font-size:17px">🗺 ' + (id ? esc(list[0].name) : tt('سب افراد', 'Everyone')) + '</b><div id="fmap" style="height:340px;border-radius:14px;overflow:hidden;margin-top:10px;background:#cfd8e3"></div><div id="fmi" class="note" style="margin-top:6px"></div><button class="sbtn" id="fx" style="width:100%;margin-top:10px">' + tt('بند', 'Close') + '</button>');
    $('#fx').onclick = closeSheet;
    var cols = ['#ef4444', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2'];
    var build = function (tracks) {
      if (!window.TileMap) { $('#fmap').innerHTML = '<p class="note" style="padding:20px">' + tt('نقشہ دستیاب نہیں', 'Map unavailable') + '</p>'; return; }
      var mp = new window.TileMap($('#fmap'), { lat: list[0].lat, lon: list[0].lng, zoom: 15 }), layers = [], pts = [];
      D.zones.forEach(function (z) { layers.push({ type: 'dot', lat: z.lat, lon: z.lng, r: 6, color: '#64748b', label: '📌 ' + z.n }); pts.push([z.lat, z.lng]); });
      list.forEach(function (m, i) { var c = cols[i % cols.length], tr = tracks[m._id] || []; if (tr.length > 1) layers.push({ type: 'line', pts: tr, color: c, w: 4 }); layers.push({ type: 'dot', lat: m.lat, lon: m.lng, r: 9, color: c, label: m.name }); pts.push([m.lat, m.lng]); tr.forEach(function (p) { pts.push(p); }); });
      mp.setLayers(layers); setTimeout(function () { mp.resize(); mp.fit(pts, 40); }, 60);
      $('#fmi').textContent = id ? tt('لکیر: آج کا راستہ · نقطہ: تازہ ترین جگہ (', 'Line: today\'s route · dot: latest position (') + ago(list[0].lts) + ')' : '';
    };
    if (!id) { build({}); return; }
    var mid = new Date(); mid.setHours(0, 0, 0, 0);
    api('GET', 'circles/' + F().code + '/members/' + id + '/track', null, '?orderBy=ts%20desc&pageSize=100').then(function (r) { var tr = (r.documents || []).map(dec).filter(function (p) { return p.ts >= mid.getTime(); }).sort(function (a, b) { return a.ts - b.ts; }).map(function (p) { return [p.lat, p.lng]; }); var o = {}; o[id] = tr; build(o); }).catch(function () { build({}); });
  }
  function weekSheet(m) {
    var days = []; try { days = JSON.parse(m.days || '[]'); } catch (e) { /* ignore */ }
    if (!days.length) { CL.toast('رپورٹ ابھی دستیاب نہیں', 'Report not available yet'); return; }
    var mx = Math.max.apply(null, days.concat([1])), names = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'], tot = 0; days.forEach(function (d) { tot += d; });
    var apps = []; try { apps = JSON.parse(m.apps || '[]'); } catch (e) { /* ignore */ }
    sheet('<b style="font-size:17px">📊 ' + esc(m.name) + '</b><p class="note">' + tt('روزانہ اوسط: ', 'Daily average: ') + dur(tot / 7) + '</p><div style="display:flex;align-items:flex-end;gap:6px;height:120px">' + days.map(function (d, i) { var dt = new Date((m.dstart || Date.now() - 6 * 86400000) + i * 86400000); return '<div style="flex:1;text-align:center"><div style="height:' + Math.round(d / mx * 96) + 'px;min-height:2px;border-radius:6px 6px 0 0;background:var(--acc)"></div><small style="font-size:10px;color:var(--mut)">' + names[dt.getDay()] + '</small></div>'; }).join('') + '</div><div class="sec">' + tt('ہفتے کی ٹاپ ایپس', 'TOP APPS THIS WEEK') + '</div>' + apps.slice(0, 8).map(function (a) { return '<div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0"><span dir="auto">' + esc(a[0]) + '</span><b dir="ltr">' + dur(a[2]) + '</b></div>'; }).join('') + '<button class="sbtn" id="wx" style="width:100%;margin-top:12px">' + tt('بند', 'Close') + '</button>');
    $('#wx').onclick = closeSheet;
  }
  function leave() {
    var f = F(); if (!f) return; var admin = ST.data && ST.data.admin;
    sheet('<b style="font-size:17px">' + (admin ? tt('سرکل ختم کریں؟', 'Delete the circle?') : tt('سرکل چھوڑیں؟', 'Leave the circle?')) + '</b><p class="note">' + (admin ? tt('منتظم کے طور پر ختم کرنے پر سب کے لیے سرکل بند ہو جاتا ہے۔ دوسروں کے فون پر بھی شیئرنگ رک جائے گی۔', 'Deleting as admin closes the circle for everyone; sharing on the other phones will stop working.') : tt('آپ کی اپنی جگہ اور ڈیٹا سرکل سے ہٹ جائے گا۔', 'Your data is removed from the circle.')) + '</p><div class="two"><button class="sbtn" id="lx">' + tt('نہیں', 'No') + '</button><button class="sbtn r" id="ly">' + tt('ہاں', 'Yes') + '</button></div>');
    $('#lx').onclick = closeSheet;
    $('#ly').onclick = function () {
      var done = function () { lset('fam', null); setAlerts('', false); ST.data = null; closeSheet(); vFamily(); };
      myUid().then(function (uid) { return api('DELETE', 'circles/' + f.code + '/members/' + uid).catch(function () {}).then(function () { return admin ? api('DELETE', 'circles/' + f.code).catch(function () {}) : null; }); }).then(done, done);
    };
  }
  V.family = vFamily;
  if (CL.HINTS) CL.HINTS.family = ['kids', 'بچے کے اپنے فون پر Cleanova Life کا "بچوں کا اسکرین ٹائم" بھی ہے', 'Cleanova Life also has an on-device "Kids screen time" tool'];
  if (CL.wrapTools) CL.wrapTools();
};
