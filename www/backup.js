/* Automatic backup: a copy of all app data is kept in Documents/Cleanova (survives uninstall) and offered back on a fresh install. */
(function () {
  window.CLifeInit4 = function (CL) {
    var Cap = window.Capacitor, B = window.__bkTest || ((Cap && Cap.Plugins && Cap.Plugins.Backup && !window.CLEANOVA_MOCK) ? Cap.Plugins.Backup : null);
    var $ = CL.$, tt = CL.tt, T = CL.T, V = CL.views, esc = CL.esc;
    var KEY = 'cleanova.life.bk.auto', lastSig = '', busy = false, status = { t: 0, err: '' };
    function on() { return localStorage.getItem(KEY) !== '0'; }
    function snapshot() {
      var o = {}, i, k;
      for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k.indexOf('cleanova.') === 0 && k !== KEY && !/cache|\.bk\./.test(k)) o[k] = localStorage.getItem(k); }
      return o;
    }
    function fresh() { return localStorage.getItem('cleanova.life.onb') === null && Object.keys(snapshot()).length < 4; }
    function pack(o) { return JSON.stringify({ app: 'cleanova-life', v: 2, t: Date.now(), data: o }); }
    function save(force) {
      if (!B || busy || (!force && !on()) || fresh()) return Promise.resolve(false);
      var o = snapshot(), sig = JSON.stringify(o);
      if (!force && sig === lastSig) return Promise.resolve(false);
      busy = true;
      return B.write({ text: pack(o) }).then(function () { lastSig = sig; status = { t: Date.now(), err: '' }; return true; })
        .catch(function (e) { status.err = String((e && e.message) || e); return false; })
        .then(function (r) { busy = false; return r; });
    }
    function parse(text) {
      var t = String(text || '').trim(), o;
      if (t.indexOf('CLEANOVA-LIFE-BACKUP') === 0) o = JSON.parse(t.slice(t.indexOf('\n') + 1)); /* older copy-paste format */
      else { var j = JSON.parse(t); o = j && j.data; }
      if (!o || typeof o !== 'object') throw new Error('bad');
      return o;
    }
    function apply(o) {
      var n = 0; Object.keys(o).forEach(function (k) { if (k.indexOf('cleanova.') === 0 && typeof o[k] === 'string') { try { JSON.parse(o[k]); } catch (e) { return; } localStorage.setItem(k, o[k]); n++; } });
      return n;
    }
    function fmtT(ms) { try { var d = new Date(ms); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

    /* offer the old data back after a reinstall */
    function offer() {
      if (!B || !fresh()) return;
      B.read().then(function (r) {
        if (!r || !r.exists || document.getElementById('bkpop')) return;
        var o; try { o = parse(r.text); } catch (e) { return; }
        if (Object.keys(o).length < 4) return;
        var d = document.createElement('div'); d.id = 'bkpop'; d.className = 'bkpop';
        d.innerHTML = '<div class="bks"><div style="font-size:38px">♻️</div><b>' + tt('پرانا ڈیٹا مل گیا', 'Your old data was found') + '</b><p>' + tt('اس فون پر کلینووا کا محفوظ شدہ ڈیٹا موجود ہے۔ محفوظ تاریخ: ', 'A saved copy of your Cleanova data is on this phone. Saved: ') + '<br><b dir="ltr">' + esc(fmtT(r.mtime)) + '</b></p><button class="btn" id="bkyes">' + tt('ڈیٹا واپس لائیں', 'Restore my data') + '</button><button class="sbtn" id="bkno" style="width:100%;margin-top:8px">' + tt('نئے سرے سے شروع کریں', 'Start fresh') + '</button></div>';
        document.body.appendChild(d);
        $('#bkyes').onclick = function () { var n = apply(o); d.remove(); CL.toast('ڈیٹا واپس آ گیا (' + n + ')', 'Data restored (' + n + ')'); setTimeout(function () { location.reload(); }, 900); };
        $('#bkno').onclick = function () { d.remove(); };
      }).catch(function () { });
    }

    /* backup screen: automatic section on top */
    var baseB = V.backup;
    V.backup = function () {
      baseB();
      var card = document.createElement('div'); card.className = 'card'; card.style.marginTop = '8px'; card.id = 'bkauto';
      $('#body').insertBefore(card, $('#body').firstChild);
      function paint() {
        B ? B.read().then(function (r) { draw(r || {}); }).catch(function () { draw({}); }) : draw({ nb: true });
      }
      function draw(r) {
        var ok = r.exists, msg = '';
        if (r.nb) msg = tt('یہ سہولت فون کی ایپ میں چلتی ہے۔', 'This works in the phone app.');
        else if (r.allowed === false) msg = '⚠ ' + tt('"تمام فائلوں تک رسائی" کی اجازت دیں: فون کی سیٹنگز ← ایپس ← کلینووا ← اجازتیں / Special access۔ اس کے بغیر بیک اپ بچا نہیں رہ سکتا۔', 'Allow "All files access": Phone Settings → Apps → Cleanova → Permissions / Special access. Without it the backup cannot survive an uninstall.');
        else if (status.err) msg = '⚠ ' + esc(status.err);
        else if (ok) msg = '✓ ' + tt('آخری محفوظ: ', 'Last saved: ') + '<b dir="ltr">' + esc(fmtT(r.mtime)) + '</b>';
        else msg = tt('ابھی تک کوئی بیک اپ فائل نہیں۔', 'No backup file yet.');
        card.innerHTML = '<div class="row" style="padding:0"><div class="t"><b>♻️ ' + tt('خودکار بیک اپ', 'Automatic backup') + '</b><small class="e" style="display:block">' + tt('ڈیٹا فون کے Documents/Cleanova میں محفوظ رہتا ہے، ان انسٹال پر بھی', 'Data is kept in Documents/Cleanova, even after uninstall') + '</small></div><button class="sw" id="bkon" aria-pressed="' + on() + '"></button></div>' +
          '<p class="note" style="margin-top:8px">' + msg + '</p><div class="two"><button class="sbtn" id="bkn">' + tt('ابھی محفوظ کریں', 'Save now') + '</button><button class="sbtn" id="bkf"' + (ok ? '' : ' disabled') + '>' + tt('فائل سے بحال کریں', 'Restore from file') + '</button></div>';
        $('#bkon').onclick = function () { localStorage.setItem(KEY, on() ? '0' : '1'); if (on()) save(true).then(paint); else paint(); };
        $('#bkn').onclick = function () { save(true).then(function (r2) { CL.toast(r2 ? 'محفوظ ہو گیا' : 'محفوظ نہیں ہو سکا', r2 ? 'Saved' : 'Could not save'); paint(); }); };
        $('#bkf').onclick = function () {
          B.read().then(function (r3) {
            var o; try { o = parse(r3.text); } catch (e) { CL.toast('فائل درست نہیں', 'Backup file is not valid'); return; }
            CL.ask(tt('موجودہ ڈیٹا بدل جائے گا۔ لکھیں: ہاں', 'This replaces current data. Type: yes'), '', function (v) {
              if (!/^(yes|y|ہاں|ہاں)$/i.test(v.trim())) { CL.toast('منسوخ', 'Cancelled'); return; }
              var n = apply(o); CL.toast('بحال ہو گیا (' + n + ')', 'Restored (' + n + ')'); setTimeout(function () { location.reload(); }, 900);
            });
          });
        };
      }
      paint();
    };

    if (B) {
      setTimeout(offer, 1800);
      setTimeout(function () { save(false); }, 6000);
      setInterval(function () { save(false); }, 60000);
      document.addEventListener('visibilitychange', function () { if (document.hidden) save(false); });
      try { var A = Cap.Plugins.App; if (A && A.addListener) A.addListener('pause', function () { save(false); }); } catch (e) { }
    }
  };
})();
