/* Cleanova Life: setup wizard, health check and update notice.
   Shows what the phone allows (notifications, battery, background work), checks the Firebase connection and tells when a new version is out. */
window.CLifeInit14 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var lget = U.lget, lset = U.lset;
  var FA = function () { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FamilyAlert; };
  var BUILD = window.CL_BUILD || 0;
  var REPO = 'https://api.github.com/repos/atifashraf93-lang/Cleanova/releases?per_page=12';

  function sheet(h) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = '<div style="max-height:80vh;overflow-y:auto">' + h + '</div>'; }
  function closeSheet() { $('#modal').hidden = true; }
  function ago(t) { if (!t) return tt('کبھی نہیں', 'never'); var m = Math.round((Date.now() - t) / 60000); return m < 1 ? tt('ابھی', 'just now') : m < 60 ? m + tt(' منٹ پہلے', ' min ago') : m < 1440 ? Math.floor(m / 60) + tt(' گھنٹے پہلے', ' h ago') : Math.floor(m / 1440) + tt(' دن پہلے', ' d ago'); }

  CL.regTool('diag', '🩺', 1, ['سیٹ اپ اور ہیلتھ چیک', 'Setup & health check'], 'safe', ['نوٹیفکیشن، بیٹری، کنکشن اور ورژن کی جانچ', 'Check notifications, battery, connection and version'], 'سیٹ اپ ہیلتھ چیک تشخیص نوٹیفکیشن بیٹری اپ ڈیٹ diagnostics health update battery', true);

  /* ---------- what the phone allows ---------- */
  function readDiag() {
    var p = FA(); if (!p || !p.diag) return Promise.resolve(null);
    return p.diag().catch(function () { return null; });
  }
  function net() {
    var p = FA(); if (!p) return Promise.resolve({ ok: false, why: 'plugin' });
    return p.token().then(function (a) {
      return fetch('https://firestore.googleapis.com/v1/projects/cleanova-5f6f5/databases/(default)/documents/rooms/PINGPING', { headers: { Authorization: 'Bearer ' + a.token } }).then(function (r) {
        return { ok: true, code: r.status, uid: a.uid };
      });
    }).catch(function () { return { ok: false, why: 'net' }; });
  }
  function row(ok, title, sub, btn, id) {
    return '<div class="row" style="align-items:flex-start"><span style="font-size:22px;width:34px;text-align:center">' + (ok === null ? '➖' : ok ? '✅' : '⚠️') + '</span><div class="t" style="flex:1;min-width:0"><b>' + title + '</b><small class="e" style="display:block;color:var(--mut);line-height:1.6">' + sub + '</small></div>' + (btn && !ok ? '<button class="sbtn p" id="' + id + '" style="flex:none">' + btn + '</button>' : '') + '</div>';
  }
  function fixes(d) {
    var p = FA();
    var n = $('#dgn'); if (n) n.onclick = function () { try { CL.LN.requestPermissions().then(function () { return readDiag(); }).then(function (x) { if (x && !x.notif && p.autoStart) { /* still blocked: send to settings */ p.batteryAsk(); } }); } catch (e) { /* ignore */ } setTimeout(function () { rerender(); }, 1500); };
    var b = $('#dgb'); if (b) b.onclick = function () { p.batteryAsk(); };
    var a = $('#dga'); if (a) a.onclick = function () { p.autoStart(); };
  }
  var rerender = function () { if (S.view === 'diag') V.diag(); else if (!$('#modal').hidden && $('#wzb')) CL.setupWizard(); };

  function checklist(d, withExtra) {
    var h = '';
    if (!d) return '<p class="note">' + tt('یہ جانچ صرف انسٹال شدہ ایپ میں چلتی ہے۔', 'This check runs only in the installed app.') + '</p>';
    h += row(!!d.notif, tt('نوٹیفکیشن', 'Notifications'), d.notif ? tt('اجازت ہے', 'Allowed') : tt('بند ہیں، چیٹ اور یاددہانی کی اطلاع نہیں آئے گی', 'Blocked: chat and reminders cannot alert you'), tt('اجازت دیں', 'Allow'), 'dgn');
    h += row(!!d.battery, tt('بیٹری: بغیر پابندی', 'Battery: no restrictions'), d.battery ? tt('ٹھیک ہے', 'Fine') : tt('فون ایپ کو پس منظر میں بند کر سکتا ہے، نوٹیفکیشن دیر سے آئیں گے', 'The phone may stop the app in the background, so alerts arrive late'), tt('پابندی ہٹائیں', 'Remove limit'), 'dgb');
    h += '<div class="row" style="align-items:flex-start"><span style="font-size:22px;width:34px;text-align:center">⚙️</span><div class="t" style="flex:1;min-width:0"><b>' + tt('آٹو اسٹارٹ / پس منظر میں چلنا', 'Auto-start / run in background') + '</b><small class="e" style="display:block;color:var(--mut);line-height:1.6">' + tt('Oppo، Realme، Xiaomi، Vivo، Infinix جیسے فونز میں یہ الگ سے آن کرنا پڑتا ہے۔ فون کے صفحے پر Cleanova Life کو آن کریں۔', 'On Oppo, Realme, Xiaomi, Vivo, Infinix phones this must be switched on separately. Turn Cleanova Life on in the page that opens.') + '</small></div><button class="sbtn p" id="dga" style="flex:none">' + tt('کھولیں', 'Open') + '</button></div>';
    return h;
  }
  CL.setupWizard = function () {
    readDiag().then(function (d) {
      var all = d && d.notif && d.battery;
      sheet('<div id="wzb"><b style="font-size:18px">🔔 ' + tt('فوری نوٹیفکیشن کے لیے سیٹ اپ', 'Set up fast notifications') + '</b><p class="note" style="margin-top:6px">' + tt('چیٹ میسج ایپ بند ہونے پر بھی آئیں، اس کے لیے یہ تین چیزیں فون میں ٹھیک ہونی چاہییں۔', 'So chat messages arrive even when the app is closed, these three things must be right on your phone.') + '</p>' + checklist(d) +
        '<button class="btn o" id="wzt">🔔 ' + tt('ٹیسٹ نوٹیفکیشن (5 سیکنڈ بعد)', 'Test notification (in 5 s)') + '</button><button class="btn" id="wzd">' + (all ? tt('سب ٹھیک ہے', 'All good') : tt('بعد میں', 'Later')) + '</button></div>');
      fixes(d); $('#wzd').onclick = closeSheet; $('#wzt').onclick = testNotif;
    });
  };
  function testNotif() {
    U.scheduleLN([{ id: 7300, title: 'Cleanova Life', body: tt('ٹیسٹ: نوٹیفکیشن ٹھیک چل رہے ہیں ✅', 'Test: notifications work ✅'), schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }]).then(function (ok) { CL.toast(ok ? '5 سیکنڈ میں اطلاع آئے گی، ایپ کو پیچھے کر دیں' : 'نوٹیفکیشن کی اجازت نہیں', ok ? 'Arrives in 5 s, send the app to the background' : 'Notifications are not allowed'); });
  }

  /* ---------- the health check screen ---------- */
  function vDiag() {
    CL.setTop(T('سیٹ اپ اور ہیلتھ چیک', 'Setup & health check'));
    $('#body').innerHTML = '<div class="card center" style="margin-top:8px"><p class="mut">' + tt('جانچ ہو رہی ہے…', 'Checking…') + '</p></div>';
    Promise.all([readDiag(), net(), upd(true)]).then(function (r) {
      if (S.view !== 'diag') return;
      var d = r[0], n = r[1], u = r[2], c = lget('chat', null) || {}, rooms = (c.rooms || []).length;
      var h = '<div class="card" style="margin-top:8px"><b>' + tt('فون کی اجازتیں', 'Phone permissions') + '</b>' + checklist(d) + '<button class="btn o" id="dgt">🔔 ' + tt('ٹیسٹ نوٹیفکیشن', 'Test notification') + '</button></div>';
      h += '<div class="card"><b>' + tt('کنکشن اور چیٹ', 'Connection and chat') + '</b>' +
        row(n.ok, tt('انٹرنیٹ اور Firebase', 'Internet and Firebase'), n.ok ? tt('جڑا ہوا ہے', 'Connected') + (n.code === 403 ? ' · ' + tt('(rules چل رہے ہیں)', '(rules active)') : '') : tt('جڑ نہیں سکا۔ انٹرنیٹ دیکھیں۔', 'Could not connect. Check the internet.'), '', '') +
        row(rooms ? true : null, tt('چیٹ روم', 'Chat rooms'), rooms ? rooms + ' ' + tt('روم', 'rooms') + ' · ' + (c.fast ? tt('تیز نوٹیفکیشن آن', 'fast notifications on') : tt('تیز نوٹیفکیشن بند (15 منٹ)', 'fast notifications off (15 min)')) : tt('ابھی کوئی روم نہیں', 'No rooms yet'), '', '') +
        (d ? row(d.lastRun ? Date.now() - d.lastRun < 3600000 : null, tt('آخری پس منظر کی جانچ', 'Last background check'), ago(d.lastRun) + (d.err ? '<br><span style="color:var(--red)">' + esc(String(d.err).slice(0, 120)) + '</span>' : ''), '', '') : '') + '</div>';
      h += '<div class="card"><b>' + tt('ایپ ورژن', 'App version') + '</b>' + row(u && u.n > BUILD ? false : (BUILD ? true : null), tt('ورژن', 'Version') + ' ' + (BUILD || '–'), u ? (u.n > BUILD ? tt('نیا ورژن ', 'New version ') + u.n + tt(' دستیاب ہے', ' is available') : tt('آپ کے پاس تازہ ترین ہے', 'You have the latest')) + (lget('otaerr', '') ? '<br><span style="color:var(--red);direction:ltr;display:block;font-size:11.5px">' + esc(String(lget('otaerr', '')).slice(0, 260)) + '</span>' : '') : tt('معلوم نہیں ہو سکا', 'Could not check'), lget('otaready', null) ? tt('ابھی لگائیں', 'Apply now') : tt('اپڈیٹ کریں', 'Update'), 'dgu') + '</div>';
      if (d) h += '<p class="note">📱 ' + esc(d.brand || '') + ' · Android ' + (d.sdk || '') + '</p>';
      $('#body').innerHTML = h + CL.footer();
      fixes(d); $('#dgt').onclick = testNotif;
      if ($('#dgu')) $('#dgu').onclick = function () { if (lget('otaready', null) && CL.applyOta) CL.applyOta(); else if (u && CL.doUpdate) CL.doUpdate(u); else if (u && u.url) CL.openUrl(u.url); };
    });
  }
  V.diag = vDiag;

  /* ---------- new version notice ---------- */
  function upd(force) {
    var last = lget('upd', null);
    if (!force && last && Date.now() - last.t < 6 * 3600000) return Promise.resolve(last);
    return fetch(REPO).then(function (r) { return r.json(); }).then(function (rs) {
      var best = null;
      (rs || []).forEach(function (x) {
        var m = /^apk-(\d+)$/.exec(x.tag_name || ''); if (!m || !x.assets || (best && +m[1] <= best.n)) return;
        var apk = null, zip = null; x.assets.forEach(function (a) { if (/\.apk$/i.test(a.name)) apk = a.browser_download_url; else if (a.name === 'www.zip') zip = a.browser_download_url; });
        var nd = /need=(\d+)/.exec(x.body || ''), sh = /sha=([0-9a-f]{7,40})/.exec(x.body || '');
        if (apk) best = { n: +m[1], url: apk, zip: zip, need: nd ? +nd[1] : 1, sha: sh ? sh[1] : '', t: Date.now() };
      });
      if (best) lset('upd', best);
      return best;
    }).catch(function () { return last; });
  }
  CL.checkUpd = upd;
  (CL.homeHooks = CL.homeHooks || []).push(function () {
    var old = document.getElementById('updc'); if (old) old.remove();
    var u = lget('upd', null); if (!BUILD || !u || u.n <= BUILD || S.view !== 'life') return;
    var g = document.querySelector('#body .lgreet'); if (!g) return;
    g.insertAdjacentHTML('afterend', '<div class="card" id="updc" style="border-color:var(--acc);display:flex;gap:12px;align-items:center"><span style="font-size:26px">⬆️</span><div style="flex:1"><b>' + tt('نیا ورژن دستیاب', 'New version available') + '</b><small style="display:block;color:var(--mut);font-size:12.5px">' + tt('ورژن ', 'Version ') + u.n + '</small></div><button class="sbtn p" id="updb">' + (lget('otaready', null) ? tt('ابھی لگائیں', 'Apply now') : tt('اپڈیٹ کریں', 'Update')) + '</button></div>');
    $('#updb').onclick = function () { if (lget('otaready', null) && CL.applyOta) CL.applyOta(); else if (CL.doUpdate) CL.doUpdate(u); else CL.openUrl(u.url); };
  });
  setTimeout(function () { upd(false).then(function (u) { if (u && BUILD && u.n > BUILD && S.view === 'life' && CL.views.life) { try { CL.views.life(true); } catch (e) { /* ignore */ } } }); }, 6000);

  if (CL.wrapTools) CL.wrapTools();
};
