/* Cleanova Life: children's screen time (transparent, parent PIN) and parent-child agreement.
   Uses the phone's own app-usage data; nothing is uploaded and no messages, photos or browsing are ever read. */
window.CLifeInit10 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u, MP = CL.MP;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset, pad = U.pad;
  CL.regTool('kids', '👨‍👩‍👧', 6, ['بچوں کا اسکرین ٹائم', 'Kids screen time'], 'safe', ['شفاف اسکرین ٹائم رپورٹ، حدیں، معاہدہ اور انعامی ہدف', 'Transparent screen-time report, limits, agreement, goals'], 'بچے بچوں اسکرین ٹائم نگرانی والدین kids child parental control screen time limit موبائل گیم یوٹیوب ٹک ٹاک معاہدہ family link', true);

  var G = [['game', '🎮', ['گیمز', 'Games']], ['social', '💬', ['سوشل', 'Social']], ['video', '▶️', ['ویڈیو', 'Video']], ['study', '📚', ['پڑھائی', 'Study']], ['other', '📱', ['دیگر', 'Other']]];
  var RE = { social: /facebook|instagram|snapchat|tiktok|musically|ugc\.trill|twitter|android\.x|telegram|whatsapp|discord|likee|bigo|imo\.|messenger|threads/i, video: /youtube|netflix|vimeo|dailymotion|disney|primevideo|tapmad|mxtech|hotstar/i, game: /game|pubg|tencent|supercell|clash|freefire|garena|roblox|minecraft|ludo|candy|subway|miniclip|mojang|epicgames|activision|gameloft|zynga|rovio|playrix|voodoo|ketchapp|innersloth|brawl|carrom|8ball|bgmi|kingsoft|moonton|mobilelegends/i, study: /classroom|duolingo|khanacademy|coursera|udemy|quran|school|learn|edu|dictionary|scholar|kindle|reader|zoom|meet|teams/i };
  var DEFAULT = { on: false, name: '', pin: '', total: 180, lim: { game: 60, social: 60, video: 60 }, map: {}, bed: { on: false, from: '22:00', to: '06:30' }, study: { on: false, from: '17:00', to: '19:00' }, weekly: true, nids: [], rules: ['رات سونے کے وقت فون کمرے سے باہر چارجنگ پر رکھوں گا/گی۔', 'کھانے اور مہمانوں کے ساتھ بیٹھتے وقت فون استعمال نہیں کروں گا/گی۔', 'پہلے پڑھائی اور ہوم ورک، پھر گیمز اور ویڈیوز۔', 'نئی ایپ انسٹال کرنے سے پہلے والدین کو بتاؤں گا/گی۔', 'کسی اجنبی سے بات نہیں کروں گا/گی اور اپنی ذاتی معلومات نہیں دوں گا/گی۔', 'کوئی بھی پریشان کن بات ہو تو والدین کو فوراً بتاؤں گا/گی۔'], agreed: '', reward: '' };
  function K() { var k = lget('kids', null); if (!k) return JSON.parse(JSON.stringify(DEFAULT)); for (var a in DEFAULT) if (k[a] === undefined) k[a] = DEFAULT[a]; return k; }
  function save(k) { lset('kids', k); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }
  function grp(k, pkg) { if (k.map[pkg]) return k.map[pkg]; for (var g in RE) if (RE[g].test(pkg)) return g; return 'other'; }
  function gInfo(id) { return G.filter(function (x) { return x[0] === id; })[0] || G[4]; }
  function dur(ms) { var m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? h + tt(' گھ ', 'h ') + (m % 60) + tt(' م', 'm') : m + tt(' منٹ', ' min'); }
  var cache = { t: 0, u: null }, ST = { tab: 'today', perm: null };
  function getUsage(force) {
    if (!MP) return Promise.reject(new Error('no plugin'));
    if (!force && cache.u && Date.now() - cache.t < 120000) return Promise.resolve(cache.u);
    return MP.usageStatus().then(function (r) { ST.perm = !!(r && r.granted); if (!ST.perm) throw new Error('no access'); return MP.usage(); }).then(function (u) { cache = { t: Date.now(), u: u }; return u; });
  }
  function pinGate(k, cb) {
    if (!k.pin) { cb(); return; }
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<b style="font-size:17px">🔒 ' + tt('والدین کا PIN', 'Parent PIN') + '</b><input class="inp" id="kp" type="password" inputmode="numeric" maxlength="6" style="margin-top:10px;direction:ltr;text-align:center;letter-spacing:6px"><div class="two" style="margin-top:12px"><button class="sbtn" id="kx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="ko">' + tt('کھولیں', 'Unlock') + '</button></div>';
    $('#kx').onclick = function () { m.hidden = true; };
    $('#ko').onclick = function () { if (hash($('#kp').value) === k.pin) { m.hidden = true; cb(); } else { CL.toast('PIN درست نہیں', 'Wrong PIN'); } };
    setTimeout(function () { var i = $('#kp'); if (i) i.focus(); }, 100);
  }
  function setup() {
    var k = K(), m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<b style="font-size:18px">👨‍👩‍👧 ' + tt('بچوں کا اسکرین ٹائم', 'Kids screen time') + '</b><p class="note">' + tt('یہ ٹول شفاف ہے: بچے کو معلوم ہوتا ہے، فون پر نشان نظر آتا ہے، اور رپورٹ بچہ بھی دیکھ سکتا ہے۔ صرف ایپس پر گزارا وقت دیکھا جاتا ہے؛ پیغامات، تصویریں، براؤزنگ یا لوکیشن کبھی نہیں پڑھے جاتے۔ یہ صرف اپنے نابالغ بچے کے لیے ہے۔', 'This tool is transparent: the child knows, a notice is shown, and the child can see the report. Only time spent in apps is read; never messages, photos, browsing or location. For your own minor child only.') + '</p>' +
      '<input class="inp" id="kn" placeholder="' + tt('بچے کا نام', "Child's name") + '" value="' + esc(k.name) + '" style="margin-top:6px"><input class="inp" id="kpn" type="password" inputmode="numeric" maxlength="6" placeholder="' + tt('والدین کا PIN (4 سے 6 ہندسے)', 'Parent PIN (4 to 6 digits)') + '" style="margin-top:8px;direction:ltr"><label class="uchk2"><input type="checkbox" id="kc"> ' + tt('بچے کو بتا دیا ہے کہ اس فون پر اسکرین ٹائم دیکھا جائے گا', 'The child knows screen time is tracked on this phone') + '</label><div class="two" style="margin-top:12px"><button class="sbtn" id="kx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="ko">' + tt('شروع کریں', 'Start') + '</button></div>';
    $('#kx').onclick = function () { m.hidden = true; };
    $('#ko').onclick = function () {
      var n = $('#kn').value.trim(), p = $('#kpn').value.trim();
      if (!n) { CL.toast('بچے کا نام لکھیں', 'Enter a name'); return; } if (!/^\d{4,6}$/.test(p)) { CL.toast('PIN 4 سے 6 ہندسے', 'PIN must be 4–6 digits'); return; } if (!$('#kc').checked) { CL.toast('پہلے بچے کو بتائیں اور نشان لگائیں', 'Tell the child first and tick the box'); return; }
      k.name = n; k.pin = hash(p); k.on = true; k.since = Date.now(); save(k); m.hidden = true;
      MP && MP.usageStatus().then(function (r) { if (!(r && r.granted)) { CL.toast('اب "استعمال تک رسائی" کی اجازت دیں', 'Now allow Usage access'); MP.usageRequest().catch(function () {}); } }).catch(function () {});
      vKids();
    };
  }
  function schedule(k) {
    if (k.nids && k.nids.length) U.cancelLN(k.nids); k.nids = []; var list = [];
    var add = function (hhmm, body, extra) { var p = hhmm.split(':'), id = 100000 + Math.floor(Math.random() * 800000); k.nids.push(id); var on = { hour: +p[0], minute: +p[1] }; if (extra) for (var x in extra) on[x] = extra[x]; list.push({ id: id, title: 'Cleanova Life', body: body, schedule: { on: on, allowWhileIdle: true } }); };
    if (k.bed.on) { add(k.bed.from, '🌙 ' + tt('سونے کا وقت ہو گیا، فون چارجنگ پر رکھ دیں۔', 'Bedtime: put the phone on charge.')); add(k.bed.to, '☀️ ' + tt('صبح بخیر! نیا دن مبارک۔', 'Good morning!')); }
    if (k.study.on) { add(k.study.from, '📚 ' + tt('پڑھائی کا وقت شروع، گیمز اور ویڈیوز بعد میں۔', 'Study time: games and videos later.')); }
    if (k.weekly) add('20:00', '📊 ' + tt('ہفتے کی اسکرین ٹائم رپورٹ دیکھیں اور بچے کے ساتھ بات کریں۔', 'Review the weekly screen-time report with your child.'), { weekday: 1 });
    return list.length ? U.scheduleLN(list) : Promise.resolve(true);
  }
  function report(k, u) {
    var today = u.days[u.days.length - 1], within = u.days.filter(function (d) { return d <= k.total * 60000; }).length, tot = 0; u.days.forEach(function (d) { tot += d; });
    return '📊 ' + tt('اسکرین ٹائم رپورٹ: ', 'Screen-time report: ') + k.name + '\n' + tt('آج: ', 'Today: ') + dur(today) + tt(' (حد ', ' (limit ') + dur(k.total * 60000) + ')\n' + tt('7 دن کی اوسط: ', '7-day average: ') + dur(tot / 7) + '\n' + tt('حد کے اندر دن: ', 'Days within limit: ') + within + '/7\n' + u.apps.slice(0, 5).map(function (a, i) { return (i + 1) + '. ' + a.label + ' — ' + dur(a.week); }).join('\n') + '\n— Cleanova Life';
  }
  function vKids() {
    CL.setTop(T('بچوں کا اسکرین ٹائم', 'Kids screen time'));
    var k = K();
    if (!k.on) {
      $('#body').innerHTML = '<div class="card" style="margin-top:8px;text-align:center"><div style="font-size:42px">👨‍👩‍👧</div><b style="font-size:18px">' + tt('بچوں کا اسکرین ٹائم', 'Kids screen time') + '</b><p class="note">' + tt('اپنے بچے کے فون پر کلینووا کھول کر یہ ٹول چلائیں۔ ایپس پر گزارا وقت، روزانہ حدیں، سونے/پڑھائی کی یاددہانی، ہفتہ وار رپورٹ، اور بچے کے ساتھ مل کر معاہدہ۔', 'Run this on your child\'s phone: time per app, daily limits, bedtime/study reminders, weekly report and a family agreement.') + '</p><button class="sbtn p" id="kst" style="width:100%">' + tt('شروع کریں', 'Get started') + '</button></div>' +
        '<div class="card"><b>' + tt('کیا نہیں ہوگا', 'What it does not do') + '</b><ul style="margin:6px 18px;line-height:1.9;font-size:14px"><li>' + tt('پیغامات، تصویریں، براؤزنگ یا لوکیشن نہیں دیکھے جاتے۔', 'No messages, photos, browsing or location are read.') + '</li><li>' + tt('ایپس بند یا فون لاک نہیں ہوتا (بچہ چاہے تو اجازت بند کر سکتا ہے)۔', 'Apps are not blocked or the phone locked.') + '</li><li>' + tt('کوئی ڈیٹا سرور پر نہیں جاتا۔', 'Nothing is sent to a server.') + '</li></ul><p class="note">' + tt('مکمل بلاک اور لوکیشن کے لیے Google Family Link استعمال کریں۔', 'For full blocking and location, use Google Family Link.') + '</p></div>' + CL.footer();
      $('#kst').onclick = setup; return;
    }
    var tabs = [['today', ['آج', 'Today']], ['lim', ['حدیں', 'Limits']], ['rep', ['رپورٹ', 'Report']], ['agr', ['معاہدہ', 'Agreement']], ['help', ['مدد', 'Help']]];
    var h = '<div class="warn" style="background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.35);margin-top:8px">🛡 ' + tt('اس فون پر اسکرین ٹائم دیکھا جا رہا ہے: ', 'Screen time is being tracked on this phone: ') + '<b>' + esc(k.name) + '</b></div>' + chips(tabs, ST.tab, 'ktb').replace('class="chips"', 'class="chips" style="flex-wrap:wrap"') + '<div id="kbody"></div>';
    $('#body').innerHTML = h + CL.footer();
    bind('ktb', function (t) { ST.tab = t; vKids(); });
    var kb = $('#kbody'), wait = function (msg) { kb.innerHTML = '<div class="card center"><p class="mut">' + msg + '</p></div>'; };
    if (ST.tab === 'lim') { pinGate(k, function () { kb.innerHTML = limitsHtml(k); wireLimits(k); }); kb.innerHTML = '<div class="card center"><p class="mut">🔒 ' + tt('PIN درکار ہے', 'PIN needed') + '</p></div>'; return; }
    if (ST.tab === 'agr') { kb.innerHTML = agreementHtml(k); wireAgreement(k); return; }
    if (ST.tab === 'help') { kb.innerHTML = helpHtml(); wireHelp(k); return; }
    wait(tt('معلومات لی جا رہی ہیں…', 'Loading…'));
    getUsage(true).then(function (u) { if (S.view !== 'kids') return; if (ST.tab === 'today') { kb.innerHTML = todayHtml(k, u); wireToday(k); } else { kb.innerHTML = reportHtml(k, u); wireReport(k, u); } }).catch(function (e) {
      if (S.view !== 'kids') return; kb.innerHTML = '<div class="card center"><p class="mut">' + (e && e.message === 'no access' ? tt('"استعمال تک رسائی" کی اجازت چاہیے۔', 'Usage access permission is needed.') : tt('معلومات نہیں مل سکیں۔', 'Could not read usage.')) + '</p><button class="sbtn p" id="kall">' + tt('اجازت دیں', 'Allow') + '</button><p class="note">' + tt('کھلنے والی سیٹنگ میں Cleanova چنیں اور "Permit usage access" آن کریں، پھر واپس آئیں۔', 'In the settings that open, choose Cleanova and turn on usage access, then come back.') + '</p></div>'; var b = $('#kall'); if (b) b.onclick = function () { MP && MP.usageRequest().catch(function () {}); };
    });
  }
  function ring(pct, big, small) { pct = Math.min(100, Math.max(0, pct)); return '<div style="width:150px;height:150px;margin:8px auto;border-radius:50%;background:conic-gradient(' + (pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : 'var(--acc)') + ' ' + pct + '%,var(--bg) 0);display:grid;place-content:center;position:relative;text-align:center"><div style="position:absolute;inset:11px;border-radius:50%;background:var(--card)"></div><b style="position:relative;font-size:22px;direction:ltr">' + big + '</b><small style="position:relative;color:var(--mut)">' + small + '</small></div>'; }
  function todayHtml(k, u) {
    var today = u.days[u.days.length - 1], lim = k.total * 60000, gs = {}; u.apps.forEach(function (a) { var g = grp(k, a.pkg); gs[g] = (gs[g] || 0) + a.today; });
    var h = '<div class="card center">' + ring(today / lim * 100, dur(today), tt('حد ', 'limit ') + dur(lim)) + '<small class="e">🔓 ' + tt('آج ' + u.unlocks + ' بار فون کھولا', u.unlocks + ' unlocks today') + '</small></div>';
    h += '<div class="card">' + G.slice(0, 4).map(function (g) { var used = gs[g[0]] || 0, lm = (k.lim[g[0]] || 0) * 60000, pct = lm ? Math.min(100, used / lm * 100) : 0; return '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>' + g[1] + ' ' + L(g[2]) + '</span><b style="direction:ltr">' + dur(used) + (lm ? ' / ' + dur(lm) : '') + '</b></div>' + (lm ? '<div style="height:10px;border-radius:5px;background:var(--bg);overflow:hidden;margin-top:4px"><i style="display:block;height:100%;width:' + pct + '%;background:' + (pct >= 100 ? '#f43f5e' : 'var(--acc)') + '"></i></div>' : '') + '</div>'; }).join('') + '</div>';
    h += '<div class="sec">' + tt('آج کی ایپس', 'TODAY BY APP') + '</div>' + u.apps.filter(function (a) { return a.today > 60000; }).map(function (a) { var g = gInfo(grp(k, a.pkg)); return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0">' + (a.icon ? '<img src="' + a.icon + '" width="38" height="38" style="border-radius:10px" alt="">' : '<span class="dd">📱</span>') + '<div class="t" style="flex:1;min-width:0"><b dir="auto">' + esc(a.label) + '</b><small class="e" style="display:block">' + dur(a.today) + '</small></div><button class="sbtn" data-kg="' + esc(a.pkg) + '" style="min-height:36px;padding:0 10px">' + g[1] + ' ' + L(g[2]) + '</button></div></div>'; }).join('') + '<p class="note">' + tt('گروپ بدلنے کے لیے ایپ کے بٹن پر ٹیپ کریں (PIN درکار)۔ صرف سب سے زیادہ استعمال والی 15 ایپس شمار ہوتی ہیں۔', 'Tap the group button to change it (PIN needed). Only the 15 most-used apps are counted.') + '</p>';
    return h;
  }
  function wireToday(k) { bind('kg', function (pkg) { pinGate(k, function () { var order = G.map(function (g) { return g[0]; }), cur = grp(k, pkg), nx = order[(order.indexOf(cur) + 1) % order.length]; k.map[pkg] = nx; save(k); vKids(); }); }); }
  function limitsHtml(k) {
    return '<div class="card"><span class="fl" style="margin-top:0">' + tt('روزانہ کل حد (منٹ)', 'Daily total limit (min)') + ': <b id="ktv">' + k.total + '</b></span><input type="range" id="kt" min="30" max="480" step="15" value="' + k.total + '" style="width:100%"></div>' +
      '<div class="card">' + G.slice(0, 3).map(function (g) { return '<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><span style="flex:1">' + g[1] + ' ' + L(g[2]) + ' (' + tt('منٹ', 'min') + ')</span><input class="inp" type="number" min="0" max="480" data-kl="' + g[0] + '" value="' + (k.lim[g[0]] || 0) + '" style="width:90px;direction:ltr;min-height:40px"></div>'; }).join('') + '<p class="note" style="margin-top:2px">0 = کوئی الگ حد نہیں۔</p></div>' +
      '<div class="card"><label class="uchk2" style="margin-top:0"><input type="checkbox" id="kbo"' + (k.bed.on ? ' checked' : '') + '> 🌙 ' + tt('سونے کی یاددہانی', 'Bedtime reminder') + '</label><div class="two" style="margin-top:8px"><div><span class="fl" style="margin-top:0">' + tt('سونے کا وقت', 'Bedtime') + '</span><input class="inp" type="time" id="kbf" value="' + k.bed.from + '" style="direction:ltr"></div><div><span class="fl" style="margin-top:0">' + tt('اٹھنے کا وقت', 'Wake') + '</span><input class="inp" type="time" id="kbt" value="' + k.bed.to + '" style="direction:ltr"></div></div></div>' +
      '<div class="card"><label class="uchk2" style="margin-top:0"><input type="checkbox" id="kso"' + (k.study.on ? ' checked' : '') + '> 📚 ' + tt('پڑھائی کے وقت کی یاددہانی', 'Study-time reminder') + '</label><div class="two" style="margin-top:8px"><input class="inp" type="time" id="ksf" value="' + k.study.from + '" style="direction:ltr"></div></div>' +
      '<label class="uchk2"><input type="checkbox" id="kwk"' + (k.weekly ? ' checked' : '') + '> 📊 ' + tt('اتوار رات 8 بجے ہفتہ وار رپورٹ کی یاددہانی', 'Sunday 8pm weekly report reminder') + '</label>' +
      '<button class="sbtn p" id="kls" style="width:100%;margin-top:10px">' + tt('محفوظ کریں', 'Save') + '</button><p class="note">' + tt('حد پوری ہونے پر بچے کو ایپ کھولنے پر اطلاع ملے گی۔ ایپس خود بند نہیں ہوتیں؛ مقصد بچے کو خود حد یاد رکھنا سکھانا ہے۔', 'When a limit is reached the child sees a notice on opening Cleanova. Apps are not closed; the aim is self-awareness.') + '</p>' +
      '<div class="sec">' + tt('PIN بدلیں / ٹول بند کریں', 'CHANGE PIN / TURN OFF') + '</div><div class="two"><button class="sbtn" id="kcp">' + tt('PIN بدلیں', 'Change PIN') + '</button><button class="sbtn r" id="koff">' + tt('ٹول بند کریں', 'Turn off') + '</button></div>';
  }
  function wireLimits(k) {
    $('#kt').oninput = function () { $('#ktv').textContent = this.value; };
    $('#kls').onclick = function () {
      k.total = +$('#kt').value; [].forEach.call(document.querySelectorAll('[data-kl]'), function (i) { k.lim[i.dataset.kl] = Math.max(0, +i.value || 0); });
      k.bed = { on: $('#kbo').checked, from: $('#kbf').value || '22:00', to: $('#kbt').value || '06:30' }; k.study = { on: $('#kso').checked, from: $('#ksf').value || '17:00', to: '19:00' }; k.weekly = $('#kwk').checked;
      schedule(k).then(function () { save(k); CL.toast('محفوظ ہو گیا', 'Saved'); });
    };
    $('#kcp').onclick = function () { CL.ask(tt('نیا PIN (4 سے 6 ہندسے)', 'New PIN (4–6 digits)'), '', function (v) { if (!/^\d{4,6}$/.test(v)) { CL.toast('PIN 4 سے 6 ہندسے', 'PIN must be 4–6 digits'); return; } k.pin = hash(v); save(k); CL.toast('PIN بدل گیا', 'PIN changed'); }); };
    $('#koff').onclick = function () { if (k.nids && k.nids.length) U.cancelLN(k.nids); var n = K(); n.on = false; n.nids = []; save(n); CL.toast('ٹول بند ہو گیا', 'Turned off'); vKids(); };
  }
  function reportHtml(k, u) {
    var mx = Math.max.apply(null, u.days.concat([k.total * 60000])), lim = k.total * 60000, names = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'], tot = 0; u.days.forEach(function (d) { tot += d; });
    var within = u.days.filter(function (d) { return d <= lim; }).length, h = '<div class="card"><div class="two"><div class="center"><b style="font-size:20px;direction:ltr;display:block">' + dur(tot / 7) + '</b><small class="e">' + tt('روزانہ اوسط', 'Daily average') + '</small></div><div class="center"><b style="font-size:20px;display:block">' + within + '/7</b><small class="e">' + tt('حد کے اندر دن', 'Days within limit') + '</small></div></div></div>';
    h += '<div class="card"><div style="display:flex;align-items:flex-end;gap:6px;height:130px;position:relative"><div style="position:absolute;inset-inline:0;bottom:' + Math.round(lim / mx * 110 + 18) + 'px;border-top:1px dashed #f59e0b"></div>' + u.days.map(function (d, i) { var dt = new Date((u.dayStart || (Date.now() - 6 * 86400000)) + i * 86400000); return '<div style="flex:1;text-align:center"><div style="height:' + Math.round(d / mx * 110) + 'px;border-radius:6px 6px 0 0;background:' + (d > lim ? '#f43f5e' : 'var(--acc)') + ';min-height:2px"></div><small style="font-size:10px;color:var(--mut)">' + (names[dt.getDay()] || '').slice(0, 3) + '</small></div>'; }).join('') + '</div></div>';
    h += '<div class="sec">' + tt('ہفتے کی سب سے زیادہ ایپس', 'TOP APPS THIS WEEK') + '</div>' + u.apps.slice(0, 8).map(function (a) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0">' + (a.icon ? '<img src="' + a.icon + '" width="34" height="34" style="border-radius:9px" alt="">' : '<span class="dd">📱</span>') + '<div class="t" style="flex:1"><b dir="auto">' + esc(a.label) + '</b></div><b style="direction:ltr">' + dur(a.week) + '</b></div></div>'; }).join('');
    var stars = Math.min(7, within); h += '<div class="card center" style="margin-top:10px"><b>' + tt('ہفتہ وار ستارے', 'Weekly stars') + '</b><div style="font-size:26px;letter-spacing:4px;margin:4px 0">' + '⭐'.repeat(stars) + '<span style="opacity:.25">' + '⭐'.repeat(7 - stars) + '</span></div><small class="e">' + (k.reward ? '🎁 ' + esc(k.reward) : tt('معاہدے کے صفحے پر انعام لکھیں', 'Write a reward on the Agreement tab')) + '</small></div>';
    h += '<button class="sbtn p" id="krs" style="width:100%;margin-top:10px">' + tt('رپورٹ شیئر کریں', 'Share report') + '</button>';
    return h;
  }
  function wireReport(k, u) { $('#krs').onclick = function () { var t = report(k, u); if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { try { navigator.clipboard.writeText(t); } catch (e) { /* ignore */ } CL.toast('رپورٹ کاپی ہو گئی', 'Report copied'); } }; }
  function agreementHtml(k) {
    return '<div class="card"><b>📜 ' + tt('ہمارا خاندانی معاہدہ', 'Our family agreement') + '</b><p class="note" style="margin-top:4px">' + tt('والدین اور بچہ ساتھ بیٹھ کر طے کریں۔ ہر بات پر دونوں راضی ہوں تو نشان لگائیں۔', 'Sit together. Tick each rule only when both agree.') + '</p>' + k.rules.map(function (r, i) { var ch = k.ag && k.ag[i]; return '<label class="uchk2" style="align-items:flex-start"><input type="checkbox" data-kar="' + i + '"' + (ch ? ' checked' : '') + '> <span>' + esc(r) + '</span></label>'; }).join('') + '</div>' +
      '<div class="card"><span class="fl" style="margin-top:0">' + tt('روزانہ اسکرین ٹائم', 'Daily screen time') + ': <b>' + dur(k.total * 60000) + '</b> (' + tt('حدیں کے ٹیب سے', 'set in Limits') + ')</span><span class="fl">' + tt('اپنی طرف سے نیا اصول', 'Add a rule') + '</span><div class="two" style="grid-template-columns:1fr auto"><input class="inp" id="kar" placeholder="..." style="margin:0"><button class="sbtn" id="kaa">＋</button></div><span class="fl">🎁 ' + tt('اچھے ہفتے کا انعام', 'Reward for a good week') + '</span><input class="inp" id="krw" value="' + esc(k.reward) + '" placeholder="' + tt('مثلاً ہفتے کو آئس کریم', 'e.g. ice cream on Saturday') + '"></div>' +
      '<div class="card"><span class="fl" style="margin-top:0">✍️ ' + tt('دستخط (نام لکھیں)', 'Signatures (type names)') + '</span><div class="two"><input class="inp" id="ks1" placeholder="' + tt('بچہ', 'Child') + '" value="' + esc(k.s1 || k.name) + '"><input class="inp" id="ks2" placeholder="' + tt('والدین', 'Parent') + '" value="' + esc(k.s2 || '') + '"></div></div>' +
      '<div class="two"><button class="sbtn p" id="kag">' + tt('محفوظ کریں', 'Save') + '</button><button class="sbtn" id="kas">' + tt('شیئر', 'Share') + '</button></div>' + (k.agreed ? '<p class="note center">✅ ' + tt('آخری بار طے ہوا: ', 'Agreed on: ') + esc(k.agreed) + '</p>' : '');
  }
  function wireAgreement(k) {
    var read = function () { k.ag = {}; [].forEach.call(document.querySelectorAll('[data-kar]'), function (c) { k.ag[c.dataset.kar] = c.checked; }); k.reward = $('#krw').value.trim(); k.s1 = $('#ks1').value.trim(); k.s2 = $('#ks2').value.trim(); };
    $('#kaa').onclick = function () { var v = $('#kar').value.trim(); if (!v) return; read(); k.rules.push(v); save(k); vKids(); };
    $('#kag').onclick = function () { read(); k.agreed = new Date().toLocaleDateString('en-GB'); save(k); CL.toast('معاہدہ محفوظ ہو گیا', 'Agreement saved'); vKids(); };
    $('#kas').onclick = function () { read(); var t = '📜 ' + tt('ہمارا خاندانی معاہدہ', 'Our family agreement') + '\n\n' + k.rules.map(function (r, i) { return (k.ag[i] ? '✅ ' : '▫️ ') + r; }).join('\n') + '\n\n' + tt('روزانہ اسکرین ٹائم: ', 'Daily screen time: ') + dur(k.total * 60000) + (k.reward ? '\n🎁 ' + k.reward : '') + '\n\n✍️ ' + (k.s1 || '') + ' / ' + (k.s2 || '') + '\n— Cleanova Life'; if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { try { navigator.clipboard.writeText(t); } catch (e) { /* ignore */ } CL.toast('کاپی ہو گیا', 'Copied'); } };
  }
  function helpHtml() {
    return '<div class="card"><b>' + tt('یہ ٹول کیسے کام کرتا ہے', 'How it works') + '</b><ul style="margin:6px 18px;line-height:1.9;font-size:14px"><li>' + tt('بچے کے فون پر کلینووا میں چلتا ہے، ڈیٹا فون ہی میں رہتا ہے۔', 'Runs inside Cleanova on the child\'s phone; data stays there.') + '</li><li>' + tt('آج، ہفتے اور ایپ کے حساب سے وقت دکھاتا ہے۔', 'Shows time per day, week and app.') + '</li><li>' + tt('حد، سونے اور پڑھائی کی یاددہانی نوٹیفکیشن سے آتی ہے۔', 'Limits and reminders use notifications.') + '</li></ul></div><div class="card"><b>' + tt('حدیں', 'Limits') + '</b><p class="note" style="margin-top:4px">' + tt('بچہ چاہے تو ایپ کی اجازت بند کر سکتا ہے۔ اسی لیے اصل کام اعتماد، بات چیت اور معاہدے کا ہے۔ ایپس بلاک کرنے، فون لاک کرنے یا لوکیشن کے لیے Google Family Link استعمال کریں۔', 'A child can turn off the permission. Trust and talking matter most. Use Google Family Link to block apps, lock the phone or share location.') + '</p><button class="sbtn" id="kfl" style="width:100%">Google Family Link ↗</button></div><div class="card"><b>' + tt('بچوں سے بات کرنے کے مشورے', 'Talking tips') + '</b><ul style="margin:6px 18px;line-height:1.9;font-size:14px"><li>' + tt('پہلے سنیں کہ وہ کیا دیکھتے ہیں، پھر حد طے کریں۔', 'Listen first, then set limits.') + '</li><li>' + tt('سزا کی بجائے انعام اور واضح قاعدے رکھیں۔', 'Prefer rewards and clear rules over punishment.') + '</li><li>' + tt('خود بھی کھانے اور سونے کے وقت فون ایک طرف رکھیں۔', 'Model it: put your own phone away at meals and bedtime.') + '</li></ul></div>';
  }
  function wireHelp() { $('#kfl').onclick = function () { (CL.webOpen2 || function (u) { window.open(u); })('https://families.google.com/familylink/', 'Family Link'); }; }
  V.kids = vKids;

  /* home: visible notice + limit alerts (the child sees these too) */
  var hook = function (soft) {
    var k = K(); if (!k.on) return; var b = $('#body'); if (!b) return;
    var lg = b.querySelector('.lgreet'); if (!lg) return;
    var id = 'kidsnote'; if ($('#' + id)) return;
    lg.insertAdjacentHTML('afterend', '<button class="card" id="' + id + '" style="width:100%;text-align:start;margin-top:10px;border-color:rgba(96,165,250,.4)">🛡 ' + tt('اس فون پر اسکرین ٹائم دیکھا جا رہا ہے', 'Screen time is being tracked on this phone') + '</button>');
    $('#' + id).onclick = function () { U.nav('kids'); };
    getUsage(false).then(function (u) {
      var today = u.days[u.days.length - 1], msgs = [], gs = {}; u.apps.forEach(function (a) { var g = grp(k, a.pkg); gs[g] = (gs[g] || 0) + a.today; });
      if (today >= k.total * 60000) msgs.push(tt('آج کی کل حد پوری ہو گئی', 'Today\'s total limit is reached')); else if (today >= k.total * 60000 * .8) msgs.push(tt('آج کی حد کے قریب ہیں', 'Close to today\'s limit'));
      G.slice(0, 3).forEach(function (g) { var lm = (k.lim[g[0]] || 0) * 60000; if (lm && (gs[g[0]] || 0) >= lm) msgs.push(g[1] + ' ' + L(g[2]) + tt(' کی حد پوری', ' limit reached')); });
      var n = $('#' + id); if (n && msgs.length) n.insertAdjacentHTML('afterend', '<div class="warn">⏳ ' + msgs.join(' · ') + '</div>');
    }).catch(function () { /* no access yet */ });
  };
  (CL.homeHooks = CL.homeHooks || []).push(hook);
  if (CL.HINTS) { CL.HINTS.kids = ['scam', 'بچوں کو فراڈ اور اجنبیوں سے بچانے کے لیے "فراڈ سیفٹی" ساتھ دیکھیں', 'Also see Scam safety to protect children from scams']; }
  if (CL.wrapTools) CL.wrapTools();
};
