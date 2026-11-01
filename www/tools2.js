/* Cleanova Life: tool catalog and discovery (search, categories, favourites, recents, tool of the day, "what's new"),
   Pakistan services hub, status maker, travel and booking. Everything is stored on the phone. */
window.CLifeInit7 = function (CL) {
  'use strict';
  var S = CL.S, PREF = CL.PREF, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u, TO = CL.TAB_OF;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset, nav = U.nav, rgba = U.rgba;
  function web(url, title) { if (CL.webOpen2) CL.webOpen2(url, title); else window.open(url, '_blank'); }
  function ext(url) { if (CL.openUrl) CL.openUrl(url); else window.open(url, '_blank'); }
  function cp(t, ok) {
    var done = function () { CL.toast(ok ? ok[0] : 'کاپی ہو گیا', ok ? ok[1] : 'Copied'); };
    try { navigator.clipboard.writeText(t).then(done, fb); } catch (e) { fb(); }
    function fb() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[آأإ]/g, 'ا').replace(/ی|ي/g, 'ی').trim(); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dstr(d); }

  /* ================= CATALOG ================= */
  var CATS = [['all', ['سب', 'All']], ['daily', ['روزمرہ', 'Daily']], ['money', ['پیسہ', 'Money']], ['travel', ['سفر', 'Travel']], ['health', ['صحت', 'Health']], ['files', ['فائلیں', 'Files']], ['safe', ['حفاظت', 'Safety']], ['web', ['آن لائن', 'Online']]];
  /* id: [category, description ur, description en, search words (urdu, roman, english)] */
  var EX = {
    weather: ['daily', 'آج اور آنے والے دنوں کا موسم', 'Weather today and ahead', 'موسم mausam barish garmi sardi temperature weather'],
    rates: ['money', 'ڈالر، سونا اور پیٹرول کے ریٹ', 'Dollar, gold and petrol rates', 'ریٹ ڈالر سونا پیٹرول rate dollar gold sona petrol currency'],
    calc: ['money', 'عام اور خاص کیلکولیٹر', 'Calculators', 'کیلکولیٹر حساب calculator hisab'],
    email: ['web', 'ای میل لکھنے میں مدد', 'Email helper', 'ای میل email mail gmail'],
    habits: ['daily', 'روز کی عادتیں بنائیں اور گنیں', 'Build daily habits', 'عادت عادتیں aadat habit streak'],
    journal: ['daily', 'روز کی ڈائری', 'Daily journal', 'ڈائری diary journal notes yaddasht'],
    week: ['daily', 'ہفتے کی رپورٹ', 'Weekly report', 'رپورٹ report weekly hafta'],
    food: ['health', 'کھانے کا ریکارڈ', 'Food log', 'کھانا khana food calories'],
    focus: ['daily', 'فوکس ٹائمر', 'Focus timer', 'فوکس focus timer pomodoro study parhai'],
    ledger: ['money', 'ادھار لین دین کا حساب', 'Money lent and borrowed', 'ادھار قرض udhar udhaar karz ledger loan hisab'],
    sos: ['safe', 'ایمرجنسی میں رابطہ اور لوکیشن', 'Emergency contacts and location', 'ایمرجنسی sos emergency khatra madad'],
    prefs: ['safe', 'پرائیویسی اور ترتیبات', 'Privacy and settings', 'پرائیویسی privacy lock pin settings tarteebat'],
    eng: ['daily', 'انجینئرنگ کیلکولیٹر', 'Engineering calculators', 'انجینئرنگ engineering resistor ohm'],
    bmi: ['health', 'BMI اور وزن', 'BMI and weight', 'بی ایم آئی bmi weight wazan mota'],
    split: ['money', 'بل دوستوں میں برابر بانٹیں', 'Split a bill', 'بل بانٹیں split bill baant'],
    pct: ['money', 'فیصد، چھوٹ اور اضافہ', 'Percent and discount', 'فیصد percent discount chhoot'],
    age: ['daily', 'عمر اور دنوں کا فرق', 'Age and date difference', 'عمر age birthday salgirah date din'],
    fuel: ['travel', 'سفر کا ایندھن اور خرچ', 'Fuel and trip cost', 'پیٹرول fuel petrol mileage kharch safar'],
    qibla: ['daily', 'قبلے کی سمت', 'Qibla direction', 'قبلہ qibla namaz kaaba'],
    places: ['travel', 'قریب کی جگہیں: ATM، ہسپتال، کھانا', 'Nearby ATM, hospital, food', 'جگہ atm hospital ہسپتال کھانا petrol pump near map qareeb'],
    ai: ['web', 'AI سروسز کے شارٹ کٹ', 'AI service shortcuts', 'ای آئی ai chatgpt claude gemini'],
    social: ['web', 'سوشل سائٹس ایک جگہ', 'Social sites in one place', 'سوشل facebook instagram youtube tiktok'],
    wachat: ['daily', 'نمبر محفوظ کیے بغیر واٹس ایپ چیٹ', 'WhatsApp chat without saving', 'واٹس ایپ whatsapp chat number'],
    qr: ['files', 'QR اسکین اور بنانا', 'Scan and create QR', 'کیو آر qr scan barcode code']
  };
  var REG = {}, ORDER = [];
  function reg(id, ic, c, n, cat, d, kw, isNew) {
    REG[id] = { id: id, ic: ic, c: c, n: n, cat: cat, d: d, kw: kw || '', isNew: !!isNew };
    if (ORDER.indexOf(id) < 0) ORDER.push(id); TO[id] = 'life';
    if (isNew && CL.MORE && !CL.MORE.some(function (m) { return m[0] === id; })) CL.MORE.push([id, ic, c, n]);
  }
  var tileMore = CL.MORE.slice();
  /* new tools in this release */
  reg('pks', '🧾', 4, ['پاکستان سروسز', 'Pakistan services'], 'web', ['بل، SIM چیک، IMEI، سرکاری سروسز ایک جگہ', 'Bills, SIM check, IMEI, government services'], 'سروسز بل بجلی گیس bijli bil bill electricity gas sui پانی sim imei پی ٹی اے pta nadra نادرا fbr پاسپورٹ passport بیلنس balance jazz zong ufone telenor bisp 8171 668 8484 excise ایکسائز', true);
  reg('status', '🖼', 5, ['اسٹیٹس بنائیں', 'Status maker'], 'daily', ['اردو جملہ خوبصورت تصویر میں بنا کر شیئر کریں', 'Turn a line into a shareable picture'], 'اسٹیٹس status quote شعر شعر کارڈ مبارک eid jumma mubarak greeting card dp واٹس ایپ whatsapp تصویر', true);
  reg('tbook', '🚌', 3, ['سفر اور بکنگ', 'Travel & booking'], 'travel', ['بس، ٹرین، ہوٹل، فلائٹ کی بکنگ اور میرے سفر', 'Bus, train, hotel, flight and my trips'], 'سفر بکنگ ٹکٹ بس ٹرین ریل ہوٹل فلائٹ جہاز travel booking ticket bus train hotel flight daewoo faisal movers railway pia airblue booking agoda', true);
  reg('tools', '🧰', 6, ['تمام ٹولز', 'All tools'], 'daily', ['سرچ اور زمرے کے ساتھ سب ٹولز', 'Search and browse every tool'], 'ٹولز سرچ search all tools سب', false);
  tileMore.forEach(function (m) { var e = EX[m[0]] || ['daily', '', '', '']; reg(m[0], m[1], m[2], m[3], e[0], [e[1], e[2]], e[3], false); });
  CL.REG = REG; CL.regTool = function (id, ic, c, n, cat, d, kw, isNew) { reg(id, ic, c, n, cat, d, kw, isNew); };

  /* ================= TRACKING ================= */
  function opened() { return lget('tl.opened', {}); }
  function track(id) {
    var r = lget('tl.recent', []).filter(function (x) { return x !== id; }); r.unshift(id); lset('tl.recent', r.slice(0, 12));
    var st = lget('tl.stat', {}), s = st[id] || { n: 0, t: 0 }, now = Date.now(); if (now - s.t > 60000) s.n++; s.t = now; st[id] = s; lset('tl.stat', st);
    if (REG[id] && REG[id].isNew) { var o = opened(); if (!o[id]) { o[id] = 1; lset('tl.opened', o); } }
  }
  function isFav(id) { return lget('tl.fav', []).indexOf(id) >= 0; }
  function toggleFav(id) { var f = lget('tl.fav', []), i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); lset('tl.fav', f); }
  function icon(m) { return m.ic.length < 4 ? '<span style="font-size:19px;line-height:1">' + m.ic + '</span>' : CL.ico(m.ic); }
  function tile(id) {
    var m = REG[id]; if (!m) return '';
    var nw = m.isNew && !opened()[id];
    return '<button class="mt" data-mv="' + id + '">' + (nw ? '<span class="nwb">' + tt('نیا', 'NEW') + '</span>' : '') + '<span class="dd" style="background:' + rgba(m.c, .18) + ';color:rgb(var(--c' + m.c + '))">' + icon(m) + '</span><span>' + L(m.n) + '</span></button>';
  }

  /* ================= TOOL OF THE DAY ================= */
  function dayNum() { return Math.floor((Date.now() + 5 * 3600000) / 86400000); }
  function pickOtd() {
    var cur = lget('tl.otd', null), dn = dayNum();
    if (cur && cur.day === dn && REG[cur.id]) return cur.id;
    var dis = lget('tl.dis', []), st = lget('tl.stat', {}), op = opened(), today = Date.now() - 86400000;
    var list = ORDER.filter(function (id) { return id !== 'tools' && dis.indexOf(id) < 0 && !(st[id] && st[id].t > today); });
    if (!list.length) return null;
    var score = function (id) { var s = st[id], m = REG[id]; return (!s ? 3000 : 0) + (m.isNew && !op[id] ? 2000 : 0) + (s ? (Date.now() - s.t) / 86400000 : 0) - (s ? s.n * 5 : 0); };
    list.sort(function (a, b) { return score(b) - score(a); });
    var top = list.slice(0, Math.min(4, list.length)), id = top[dn % top.length];
    lset('tl.otd', { day: dn, id: id }); return id;
  }
  function otdCard() {
    if (lget('tl.otdoff', false)) return '';
    var id = pickOtd(); if (!id) return '';
    var m = REG[id], skip = lget('tl.skip', 0) === dayNum();
    if (skip) return '';
    return '<div class="card otd"><div class="row" style="padding:0;align-items:flex-start"><span class="dd" style="background:rgba(255,255,255,.14);color:#fff">' + icon(m) + '</span><div class="t" style="flex:1"><small class="e" style="display:block;opacity:.85">💡 ' + tt('آج کا ٹول', 'Tool of the day') + '</small><b>' + L(m.n) + '</b><small class="e" style="display:block;opacity:.9">' + L(m.d) + '</small></div></div>' +
      '<div class="two" style="margin-top:10px;grid-template-columns:1fr auto auto"><button class="sbtn p" data-mv="' + id + '">' + tt('آزمائیں', 'Try it') + '</button><button class="sbtn" data-otdl="1">' + tt('پھر کبھی', 'Later') + '</button><button class="sbtn" data-otdn="' + id + '" aria-label="no">✕</button></div></div>';
  }

  /* ================= HOME BLOCK ================= */
  function homeBlock() {
    var fav = lget('tl.fav', []).filter(function (x) { return REG[x]; }), rec = lget('tl.recent', []).filter(function (x) { return REG[x] && fav.indexOf(x) < 0 && x !== 'tools'; });
    var rest = ORDER.filter(function (x) { return x !== 'tools' && fav.indexOf(x) < 0 && rec.indexOf(x) < 0; });
    var news = rest.filter(function (x) { return REG[x].isNew && !opened()[x]; });
    rest = news.concat(rest.filter(function (x) { return news.indexOf(x) < 0; }));
    var order = fav.concat(news.filter(function (x) { return fav.indexOf(x) < 0; })).concat(rec.filter(function (x) { return news.indexOf(x) < 0; })).concat(rest.filter(function (x) { return news.indexOf(x) < 0; }));
    var seen = {}; order = order.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
    var shown = order.slice(0, 11);
    return otdCard() +
      '<button class="srch" id="tsb">🔍 ' + tt('ٹول ڈھونڈیں… (مثلاً بل، پیٹرول، ٹکٹ)', 'Find a tool… (bill, fuel, ticket)') + '</button>' +
      '<div class="sec">' + (fav.length ? '⭐ ' + tt('پسندیدہ اور مزید', 'FAVOURITES & MORE') : tt('مزید', 'MORE')) + '</div><div class="mg">' + shown.map(tile).join('') + '<button class="mt" data-mv="tools"><span class="dd" style="background:' + rgba(6, .18) + ';color:rgb(var(--c6))"><span style="font-size:19px;line-height:1">🧰</span></span><span>' + tt('سب ٹولز', 'All tools') + ' (' + (ORDER.length - 1) + ')</span></button></div>';
  }
  var baseLife = V.life;
  V.life = function (soft) {
    baseLife(soft);
    try {
      var mg = document.querySelector('#body .mg'); if (!mg) return;
      var sec = mg.previousElementSibling, html = homeBlock(), ref = mg.nextElementSibling;
      if (sec && sec.classList.contains('sec')) sec.remove(); mg.remove();
      var foot = document.querySelector('#body .foot');
      if (foot) foot.insertAdjacentHTML('beforebegin', html); else $('#body').insertAdjacentHTML('beforeend', html);
      bind('mv', function (v) { nav(v); });
      var sb = $('#tsb'); if (sb) sb.onclick = function () { TF.q = ''; nav('tools'); };
      bind('otdl', function () { lset('tl.skip', dayNum()); V.life(true); });
      bind('otdn', function (id) { var d = lget('tl.dis', []); if (d.indexOf(id) < 0) d.push(id); lset('tl.dis', d); lset('tl.otd', null); CL.toast('ٹھیک ہے، یہ نہیں دکھائیں گے', 'OK, will not show this one'); V.life(true); });
      if (!soft) setTimeout(maybeWhatsNew, 1500);
    } catch (e) { /* keep original home */ }
  };

  /* ================= WHAT'S NEW ================= */
  function maybeWhatsNew() {
    if (S.view !== 'life' || !lget('onb', false)) return; var m = $('#modal'); if (!m || !m.hidden || $('#lock')) return;
    var seen = lget('tl.seen', null), all = ORDER.filter(function (x) { return REG[x].isNew; });
    if (seen === null) { /* first install of this feature: show everything new once */ seen = []; }
    var fresh = all.filter(function (x) { return seen.indexOf(x) < 0; });
    if (fresh.length) showNew(fresh, true);
  }
  function showNew(ids, auto) {
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<div class="grab"></div><h2 style="font-size:21px;text-align:center">✨ ' + tt('کلینووا میں نیا کیا ہے', "What's new in Cleanova") + '</h2><p class="note" style="text-align:center;margin-top:2px">' + tt('اب آپ یہ بھی کر سکتے ہیں، سیدھا کھول کر دیکھیں۔', 'You can now do this too. Tap to open.') + '</p>' +
      ids.map(function (id) { var t = REG[id]; return '<div class="card" style="margin:8px 0"><div class="row" style="padding:0"><span class="dd" style="background:' + rgba(t.c, .18) + ';color:rgb(var(--c' + t.c + '))">' + icon(t) + '</span><div class="t" style="flex:1"><b>' + L(t.n) + '</b><small class="e" style="display:block">' + L(t.d) + '</small></div><button class="sbtn p" data-nw="' + id + '" style="min-height:38px">' + tt('کھولیں', 'Open') + '</button></div></div>'; }).join('') +
      '<button class="sbtn p" id="nwok" style="width:100%;margin-top:6px">' + tt('ٹھیک ہے', 'OK') + '</button>';
    var markSeen = function () { var s = lget('tl.seen', []) || []; ids.forEach(function (x) { if (s.indexOf(x) < 0) s.push(x); }); lset('tl.seen', s); };
    $('#nwok').onclick = function () { markSeen(); m.hidden = true; };
    bind('nw', function (id) { markSeen(); m.hidden = true; nav(id); });
  }

  /* ================= ALL TOOLS (search) ================= */
  var TF = { cat: 'all', q: '' };
  function matches(id) {
    var m = REG[id]; if (id === 'tools') return false;
    if (TF.cat !== 'all' && m.cat !== TF.cat) return false;
    var q = norm(TF.q); if (!q) return true;
    var hay = norm(m.n[0] + ' ' + m.n[1] + ' ' + m.d[0] + ' ' + m.d[1] + ' ' + m.kw);
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function listHtml() {
    var fav = lget('tl.fav', []), ids = ORDER.filter(matches);
    ids.sort(function (a, b) { return (fav.indexOf(b) >= 0) - (fav.indexOf(a) >= 0); });
    if (!ids.length) return '<div class="card center"><p class="mut">' + tt('کچھ نہیں ملا۔ دوسرا لفظ لکھ کر دیکھیں۔', 'Nothing found. Try another word.') + '</p></div>';
    return ids.map(function (id) {
      var m = REG[id], nw = m.isNew && !opened()[id];
      return '<div class="card" style="margin:8px 0"><div class="row" style="padding:0"><button class="trow" data-mv="' + id + '" style="display:flex;align-items:center;gap:10px;flex:1;text-align:start;background:none;border:0;color:inherit;padding:0"><span class="dd" style="background:' + rgba(m.c, .18) + ';color:rgb(var(--c' + m.c + '))">' + icon(m) + '</span><span class="t" style="flex:1"><b>' + L(m.n) + (nw ? ' <span class="nwb" style="position:static">' + tt('نیا', 'NEW') + '</span>' : '') + '</b><small class="e" style="display:block">' + L(m.d) + '</small></span></button><button class="sbtn" data-tf="' + id + '" style="min-height:38px;padding:0 10px" aria-label="fav">' + (fav.indexOf(id) >= 0 ? '⭐' : '☆') + '</button></div></div>';
    }).join('');
  }
  function paintList() {
    var b = $('#tlist'); if (!b) return; b.innerHTML = listHtml();
    bind('mv', function (v) { nav(v); });
    bind('tf', function (id) { toggleFav(id); paintList(); });
  }
  function vTools() {
    CL.setTop(T('تمام ٹولز', 'All tools'));
    $('#body').innerHTML = '<input class="inp" id="tq" placeholder="' + tt('🔍 ڈھونڈیں: بل، ٹکٹ، پیٹرول، qr…', '🔍 Search: bill, ticket, fuel, qr…') + '" value="' + esc(TF.q) + '" style="margin-top:8px" enterkeyhint="search">' +
      chips(CATS, TF.cat, 'tc').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"') +
      '<div id="tlist"></div><button class="sbtn" id="tnew" style="width:100%;margin-top:6px">✨ ' + tt('نیا کیا ہے', "What's new") + '</button>' +
      '<label class="uchk2"><input type="checkbox" id="totd"' + (lget('tl.otdoff', false) ? '' : ' checked') + '> ' + tt('ہوم پر "آج کا ٹول" دکھائیں', 'Show "Tool of the day" on Home') + '</label>' + CL.footer();
    paintList();
    $('#tq').oninput = function () { TF.q = this.value; paintList(); };
    bind('tc', function (c) { TF.cat = c; vTools(); });
    $('#tnew').onclick = function () { showNew(ORDER.filter(function (x) { return REG[x].isNew; }), false); };
    $('#totd').onchange = function () { lset('tl.otdoff', !this.checked); lset('tl.dis', []); };
  }
  V.tools = vTools;

  /* ================= PAKISTAN SERVICES ================= */
  var PK = [
    { t: ['موبائل بیلنس اور مینو', 'Mobile balance'], note: ['کوڈ نیٹ ورک بدل سکتا ہے۔ ڈائلر کھلے گا، آپ خود کال کا بٹن دبائیں گے۔', 'Codes can change. The dialer opens; you press call yourself.'], items: [
      ['Jazz', 'بیلنس / مینو', 'tel', '*111#'], ['Zong', 'بیلنس', 'tel', '*222#'], ['Ufone', 'بیلنس', 'tel', '*124#'], ['Telenor', 'بیلنس', 'tel', '*444#'], ['اپنا IMEI معلوم کریں', 'ڈائلر میں', 'tel', '*#06#']] },
    { t: ['SIM اور موبائل کی جانچ', 'SIM and phone checks'], note: ['SMS کا عام چارجز لگ سکتے ہیں۔ پیغام بھیجنے سے پہلے آپ دیکھ لیں گے۔', 'Normal SMS charges may apply. You review the message before sending.'], items: [
      ['میرے CNIC پر کتنی SIMs ہیں', 'CNIC (بغیر ڈیش) 668 پر', 'sms', '668', 'CNIC', 'اپنا CNIC نمبر (13 ہندسے، بغیر ڈیش)', 13], ['فون PTA رجسٹرڈ ہے؟', 'IMEI (15 ہندسے) 8484 پر', 'sms', '8484', 'IMEI', 'فون کا IMEI (15 ہندسے)', 15], ['اسپیم SMS کی شکایت', 'اسپیم پیغام 9000 کو فارورڈ کریں', 'tel', 'sms:9000'], ['ٹیلی مارکیٹنگ بند کروائیں', 'خالی پیغام 3627 پر', 'tel', 'sms:3627'], ['PTA ویب سائٹ', 'شکایت اور معلومات', 'web', 'https://www.pta.gov.pk'], ['موبائل کی تصدیق (DIRBS)', 'آن لائن چیک', 'web', 'https://dirbs.pta.gov.pk'], ['PTA ہیلپ لائن', '0800-55055 (مفت)', 'tel', '0800-55055']] },
    { t: ['شناخت اور سرکاری', 'Identity and government'], note: ['یہ سب سرکاری سائٹس کلینووا کی اپنی ونڈو میں کھلتی ہیں۔ کوئی ذاتی معلومات ہم نہیں لیتے۔', 'These open in Cleanova. We never collect your details.'], items: [
      ['BISP / احساس: اہلیت', 'CNIC بغیر ڈیش 8171 پر', 'sms', '8171', 'CNIC', 'اپنا CNIC نمبر (13 ہندسے، بغیر ڈیش)', 13], ['NADRA', 'شناختی کارڈ کی سروسز', 'web', 'https://www.nadra.gov.pk'], ['پاسپورٹ (DGIP)', 'ٹریکنگ اور فارم', 'web', 'https://www.dgip.gov.pk'], ['FBR (ٹیکس)', 'ٹیکس دہندہ سروسز', 'web', 'https://www.fbr.gov.pk'], ['حکومتِ پاکستان پورٹل', 'سرکاری سروسز', 'web', 'https://www.pakistan.gov.pk']] },
    { t: ['بجلی بل', 'Electricity bill'], note: ['اپنی کمپنی کی سائٹ پر کنزیومر/ریفرنس نمبر لکھ کر بل دیکھیں۔', 'Enter your consumer/reference number on your company site.'], items: [
      ['تمام کمپنیاں (PITC)', 'ایک جگہ بل چیک', 'web', 'https://bill.pitc.com.pk'], ['LESCO (لاہور)', '', 'web', 'https://www.lesco.gov.pk'], ['IESCO (اسلام آباد)', '', 'web', 'https://www.iesco.com.pk'], ['FESCO (فیصل آباد)', '', 'web', 'https://www.fesco.com.pk'], ['MEPCO (ملتان)', '', 'web', 'https://www.mepco.com.pk'], ['GEPCO (گوجرانوالہ)', '', 'web', 'https://www.gepco.com.pk'], ['PESCO (پشاور)', '', 'web', 'https://www.pesco.gov.pk'], ['HESCO (حیدرآباد)', '', 'web', 'http://www.hesco.gov.pk'], ['QESCO (کوئٹہ)', '', 'web', 'http://www.qesco.com.pk'], ['K-Electric (کراچی)', '', 'web', 'https://www.ke.com.pk']] },
    { t: ['گیس اور انٹرنیٹ', 'Gas and internet'], items: [
      ['SNGPL (پنجاب، KP)', 'گیس بل', 'web', 'https://www.sngpl.com.pk'], ['SSGC (سندھ، بلوچستان)', 'گیس بل', 'web', 'https://www.ssgc.com.pk'], ['PTCL', 'انٹرنیٹ اور فون بل', 'web', 'https://www.ptcl.com.pk']] },
    { t: ['گاڑی', 'Vehicle'], note: ['صوبے کے مطابق سائٹ الگ ہے۔ نیچے پنجاب کی ہے، دوسرے صوبے کے لیے تلاش کا بٹن ہے۔', 'Each province has its own site.'], items: [
      ['ایکسائز (پنجاب)', 'گاڑی کی تصدیق اور ٹوکن', 'web', 'https://excise.punjab.gov.pk'], ['دوسرے صوبے کی ایکسائز', 'گوگل پر تلاش', 'web', 'https://www.google.com/search?q=vehicle+verification+excise+and+taxation+online']] }
  ];
  function smsAsk(it) {
    var m = $('#modal'); m.hidden = false;
    $('#sheet').innerHTML = '<b style="font-size:17px">' + esc(it[0]) + '</b><p class="note">' + esc(it[5]) + '</p><input class="inp" id="smv" inputmode="numeric" maxlength="' + it[6] + '" placeholder="' + esc(it[4]) + '" style="direction:ltr"><p class="note" style="margin-top:6px">' + tt('نمبر کہیں محفوظ نہیں ہوتا؛ پیغام آپ کے میسج ایپ میں تیار ہو کر کھلے گا، آپ خود بھیجیں گے۔', 'The number is not stored. The message opens in your SMS app; you send it yourself.') + '</p><div class="two" style="margin-top:12px"><button class="sbtn" id="smx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="smo">' + tt('پیغام تیار کریں', 'Prepare message') + '</button></div>';
    $('#smx').onclick = function () { m.hidden = true; };
    $('#smo').onclick = function () { var v = $('#smv').value.replace(/\D/g, ''); if (v.length !== it[6]) { CL.toast(it[6] + ' ہندسے لکھیں', 'Enter ' + it[6] + ' digits'); return; } m.hidden = true; ext('sms:' + it[3] + '?body=' + encodeURIComponent(v)); };
  }
  function vPks() {
    CL.setTop(T('پاکستان سروسز', 'Pakistan services'));
    var h = '<div class="note" style="margin-top:8px">' + tt('روز کی سرکاری اور موبائل سروسز ایک جگہ۔ لنک یا کوڈ پرانا لگے تو نیچے "رپورٹ" دبائیں۔', 'Everyday government and mobile services in one place.') + '</div>';
    PK.forEach(function (sec, si) {
      h += '<div class="sec">' + L(sec.t) + '</div>' + (sec.note ? '<p class="note" style="margin-top:0">' + L(sec.note) + '</p>' : '');
      sec.items.forEach(function (it, ii) {
        var label = it[2] === 'tel' ? (it[3].indexOf('sms:') === 0 ? '✉ ' + tt('کھولیں', 'Open') : '📞 <bdi dir="ltr">' + esc(it[3]) + '</bdi>') : it[2] === 'sms' ? '✉ SMS <bdi dir="ltr">' + it[3] + '</bdi>' : tt('کھولیں', 'Open');
        h += '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><div class="t" style="flex:1"><b dir="auto">' + esc(it[0]) + '</b>' + (it[1] ? '<small class="e" style="display:block">' + esc(it[1]) + '</small>' : '') + '</div><button class="sbtn p" data-pk="' + si + '_' + ii + '" style="min-height:40px;direction:ltr">' + label + '</button></div></div>';
      });
    });
    h += '<button class="sbtn" id="pkrep" style="width:100%;margin-top:12px">⚠ ' + tt('کوئی لنک/کوڈ غلط ہے؟ رپورٹ کریں', 'Report a wrong link/code') + '</button><p class="note">' + tt('یہ سروسز ان اداروں کی اپنی ہیں؛ کلینووا ان سے وابستہ نہیں۔ OTP یا PIN کسی کو نہ بتائیں۔', 'These belong to their providers; Cleanova is not affiliated. Never share your OTP or PIN.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    bind('pk', function (k) {
      var p = k.split('_'), it = PK[+p[0]].items[+p[1]];
      if (it[2] === 'web') web(it[3], it[0]);
      else if (it[2] === 'sms') smsAsk(it);
      else if (it[3].indexOf('sms:') === 0) ext(it[3]);
      else ext('tel:' + it[3].replace(/#/g, '%23'));
    });
    $('#pkrep').onclick = function () { CL.ask(tt('کیا غلط ہے؟ (نام اور وجہ)', 'What is wrong? (name and reason)'), '', function (v) { ext('mailto:?subject=' + encodeURIComponent('Cleanova: services report') + '&body=' + encodeURIComponent(v)); }); };
  }
  V.pks = vPks;

  /* ================= STATUS MAKER ================= */
  var BGS = [['#0f766e', '#134e4a'], ['#1e3a8a', '#7c3aed'], ['#be123c', '#f97316'], ['#065f46', '#84cc16'], ['#111827', '#374151'], ['#7c2d12', '#f59e0b'], ['#312e81', '#0ea5e9'], ['#831843', '#db2777'], ['#14532d', '#0f172a'], ['#3b0764', '#f43f5e'], ['#0c4a6e', '#22d3ee'], ['#422006', '#fcd34d']];
  var FONTS = [['نسخ', '"Noto Naskh Arabic","Droid Arabic Naskh",serif', '700'], ['نستعلیق', '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Noto Naskh Arabic",serif', '400'], ['سادہ', 'system-ui,"Noto Sans Arabic",sans-serif', '700'], ['موٹا', '"Noto Naskh Arabic",system-ui,serif', '900']];
  var QUOTES = [
    ['صبر', 'صبر وہ دعا ہے جو زبان سے نہیں، دل سے مانگی جاتی ہے۔'], ['صبر', 'جو اپنا معاملہ رب پر چھوڑ دے، رب اسے کبھی اکیلا نہیں چھوڑتا۔'], ['صبر', 'ہر مشکل کے بعد آسانی ضرور آتی ہے، بس دل کو مضبوط رکھیں۔'],
    ['شکر', 'شکر کرنے والا دل کم میں بھی بہت کچھ پا لیتا ہے۔'], ['شکر', 'جو ملا اس پر شکر، جو نہ ملا اس پر صبر، یہی سکون کا راز ہے۔'],
    ['محنت', 'محنت کا پھل دیر سے سہی، مگر میٹھا ضرور ہوتا ہے۔'], ['محنت', 'وقت پر کیا ہوا چھوٹا کام، بعد کے بڑے کام سے بہتر ہے۔'], ['محنت', 'منزل انہیں ملتی ہے جو راستے کی تھکن سے نہیں گھبراتے۔'],
    ['ماں', 'ماں کی دعا وہ دروازہ ہے جو کبھی بند نہیں ہوتا۔'], ['ماں', 'ماں کے قدموں میں جو سکون ہے، وہ دنیا میں کہیں نہیں۔'],
    ['دوستی', 'اچھے دوست وہ ہیں جو آپ کے حال سے نہیں، آپ کے دل سے واقف ہوں۔'], ['دوستی', 'سچا دوست مشکل میں پہچانا جاتا ہے، خوشی میں تو سب ساتھ ہوتے ہیں۔'],
    ['زندگی', 'سکون چیزوں کے زیادہ ہونے میں نہیں، دل کے مطمئن ہونے میں ہے۔'], ['زندگی', 'لوگوں کے بارے میں اچھا گمان رکھیں، دل ہلکا رہتا ہے۔'], ['زندگی', 'اپنی غلطی ماننا کمزوری نہیں، بڑے کردار کی نشانی ہے۔'], ['زندگی', 'دعا کیجیے، اور پھر اللہ پر بھروسا رکھیے۔'],
    ['مبارک', 'جمعہ مبارک! اللہ آپ کی ہر دعا قبول فرمائے۔'], ['مبارک', 'عید مبارک! اللہ آپ کی خوشیوں میں برکت دے۔'], ['مبارک', 'سالگرہ مبارک! اللہ آپ کو صحت، خوشی اور لمبی عمر دے۔'], ['مبارک', 'رمضان مبارک! اللہ ہمیں روزے اور قیام کی توفیق دے۔'],
    ['صبح و رات', 'صبح بخیر! اللہ آپ کا ہر دن آسان فرمائے۔'], ['صبح و رات', 'رات بخیر! اللہ آپ کو سکون کی نیند عطا فرمائے۔'], ['صبح و رات', 'آج کا دن اللہ کی طرف سے ایک نیا موقع ہے، اسے ضائع نہ کریں۔']
  ];
  var SM = { text: QUOTES[0][1], by: '', bg: 0, font: 0, size: 92, ratio: 'story', align: 'center', cat: 'all', frame: 1 };
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line);
    });
    return out;
  }
  function drawStatus(cv) {
    var W = 1080, H = SM.ratio === 'story' ? 1920 : 1080; cv.width = W; cv.height = H; var ctx = cv.getContext('2d'), b = BGS[SM.bg];
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, b[0]); g.addColorStop(1, b[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .08; ctx.fillStyle = '#fff';
    for (var i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc((i * 337) % W, (i * 521) % H, 90 + (i * 53) % 190, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (SM.frame) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.strokeRect(44, 44, W - 88, H - 88); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(62, 62, W - 124, H - 124); }
    var f = FONTS[SM.font], rtl = /[؀-ۿ]/.test(SM.text), size = +SM.size;
    ctx.font = f[2] + ' ' + size + 'px ' + f[1]; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textBaseline = 'middle';
    var maxW = W - 220, lines = wrap(ctx, SM.text, maxW), lh = size * (rtl ? 1.95 : 1.45), total = lines.length * lh, y = (H - total) / 2 + lh / 2 - (SM.by ? 40 : 0);
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    var ax = SM.align === 'center' ? W / 2 : (SM.align === 'right' ? W - 110 : 110);
    ctx.textAlign = SM.align === 'center' ? 'center' : (SM.align === 'right' ? 'right' : 'left');
    lines.forEach(function (l, i) { ctx.fillText(l, ax, y + i * lh); });
    ctx.shadowColor = 'transparent';
    if (SM.by) { ctx.font = '600 ' + Math.round(size * .5) + 'px ' + f[1]; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center'; ctx.fillText('— ' + SM.by, W / 2, y + total / 2 + lh * .5 + 40); }
    ctx.font = '600 28px system-ui,sans-serif'; ctx.direction = 'ltr'; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.textAlign = 'center'; ctx.fillText('Cleanova Life', W / 2, H - 86);
  }
  function shareCanvas(cv, name) {
    cv.toBlob(function (bl) {
      if (!bl) { CL.toast('تصویر نہیں بنی', 'Could not make image'); return; }
      try { var f = new File([bl], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); return; } } catch (e) { /* fall through */ }
      var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = name; document.body.appendChild(a); a.click(); a.remove(); CL.toast('محفوظ ہو گیا', 'Saved');
    }, 'image/png');
  }
  function vStatus() {
    CL.setTop(T('اسٹیٹس بنائیں', 'Status maker'));
    var qc = ['all'].concat(QUOTES.map(function (q) { return q[0]; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    $('#body').innerHTML = '<canvas id="smcv" style="width:100%;max-height:52vh;object-fit:contain;border-radius:16px;margin-top:8px;display:block;background:transparent"></canvas>' +
      '<textarea class="inp" id="smt" rows="3" placeholder="' + tt('اپنا جملہ یا شعر لکھیں…', 'Write your line…') + '" style="margin-top:10px;direction:auto;min-height:84px">' + esc(SM.text) + '</textarea>' +
      '<input class="inp" id="smb" placeholder="' + tt('نام (اختیاری)', 'Name (optional)') + '" value="' + esc(SM.by) + '" style="margin-top:8px;direction:auto">' +
      '<span class="fl">' + tt('تیار جملے', 'Ready lines') + '</span><div class="chips" style="flex-wrap:wrap">' + qc.map(function (c) { return '<button class="chip' + (SM.cat === c ? ' on' : '') + '" data-sqc="' + c + '">' + (c === 'all' ? tt('سب', 'All') : c) + '</button>'; }).join('') + '</div>' +
      '<div id="sql" style="max-height:170px;overflow:auto;margin-top:6px"></div>' +
      '<span class="fl">' + tt('پس منظر', 'Background') + '</span><div class="sw">' + BGS.map(function (b, i) { return '<button class="swb' + (SM.bg === i ? ' on' : '') + '" data-sbg="' + i + '" style="background:linear-gradient(135deg,' + b[0] + ',' + b[1] + ')" aria-label="bg"></button>'; }).join('') + '</div>' +
      '<span class="fl">' + tt('فونٹ', 'Font') + '</span>' + chips(FONTS.map(function (f, i) { return [String(i), [f[0], f[0]]]; }), String(SM.font), 'sfo') +
      '<span class="fl">' + tt('سائز', 'Size') + '</span><input type="range" id="smz" min="44" max="130" value="' + SM.size + '" style="width:100%">' +
      '<div class="two"><div><span class="fl">' + tt('شکل', 'Shape') + '</span>' + chips([['story', ['اسٹیٹس', 'Story']], ['post', ['چوکور', 'Square']]], SM.ratio, 'sra') + '</div><div><span class="fl">' + tt('ترتیب', 'Align') + '</span>' + chips([['right', ['دائیں', 'Right']], ['center', ['بیچ', 'Centre']], ['left', ['بائیں', 'Left']]], SM.align, 'sal') + '</div></div>' +
      '<label class="uchk2"><input type="checkbox" id="smf"' + (SM.frame ? ' checked' : '') + '> ' + tt('فریم لگائیں', 'Add frame') + '</label>' +
      '<div class="two" style="margin-top:10px"><button class="sbtn p" id="smsh">' + tt('شیئر کریں', 'Share') + '</button><button class="sbtn" id="smsv">' + tt('محفوظ کریں', 'Save') + '</button></div>' +
      '<p class="note">' + tt('نستعلیق فونٹ اگر آپ کے فون میں نہ ہو تو نسخ دکھے گا۔ جملے ایپ کے اپنے ہیں، اپنا لکھنا بہتر ہے۔', 'If your phone has no Nastaliq font, Naskh is used instead.') + '</p>' + CL.footer();
    var cv = $('#smcv'), redraw = function () { drawStatus(cv); };
    var ql = function () { $('#sql').innerHTML = QUOTES.filter(function (q) { return SM.cat === 'all' || q[0] === SM.cat; }).map(function (q, i) { return '<button class="sbtn" data-sq="' + esc(q[1]) + '" style="width:100%;margin:3px 0;min-height:40px;text-align:start;justify-content:flex-start;font-weight:400;font-size:13.5px;line-height:1.6;direction:rtl">' + esc(q[1]) + '</button>'; }).join(''); bind('sq', function (t) { SM.text = t; $('#smt').value = t; redraw(); }); };
    ql(); redraw();
    var repaint = function () { var t = SM.text, b = SM.by; vStatus(); };
    $('#smt').oninput = function () { SM.text = this.value; redraw(); }; $('#smb').oninput = function () { SM.by = this.value; redraw(); };
    $('#smz').oninput = function () { SM.size = +this.value; redraw(); }; $('#smf').onchange = function () { SM.frame = this.checked ? 1 : 0; redraw(); };
    bind('sbg', function (i) { SM.bg = +i; [].forEach.call(document.querySelectorAll('[data-sbg]'), function (b) { b.classList.toggle('on', b.dataset.sbg === i); }); redraw(); });
    bind('sfo', function (i) { SM.font = +i; [].forEach.call(document.querySelectorAll('[data-sfo]'), function (b) { b.classList.toggle('on', b.dataset.sfo === i); }); redraw(); });
    bind('sra', function (r) { SM.ratio = r; [].forEach.call(document.querySelectorAll('[data-sra]'), function (b) { b.classList.toggle('on', b.dataset.sra === r); }); redraw(); });
    bind('sal', function (a) { SM.align = a; [].forEach.call(document.querySelectorAll('[data-sal]'), function (b) { b.classList.toggle('on', b.dataset.sal === a); }); redraw(); });
    bind('sqc', function (c) { SM.cat = c; [].forEach.call(document.querySelectorAll('[data-sqc]'), function (b) { b.classList.toggle('on', b.dataset.sqc === c); }); ql(); });
    $('#smsh').onclick = function () { shareCanvas(cv, 'status.png'); }; $('#smsv').onclick = function () { shareCanvas(cv, 'cleanova-status.png'); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  }
  V.status = vStatus;

  /* ================= TRAVEL & BOOKING ================= */
  var TB = { tab: 'bus' }, TBF = lget('tb.form', null) || { from: '', to: '', date: plusDays(1), ret: '', pax: 1, city: '', cin: plusDays(1), cout: plusDays(2), guests: 2 };
  var TABS = [['bus', '🚌', ['بس', 'Bus']], ['train', '🚆', ['ٹرین', 'Train']], ['hotel', '🏨', ['ہوٹل', 'Hotel']], ['flight', '✈️', ['فلائٹ', 'Flight']], ['trips', '🎫', ['میرے سفر', 'My trips']]];
  function enc(s) { return encodeURIComponent(s); }
  function prov() {
    var f = TBF, from = f.from.trim(), to = f.to.trim(), city = f.city.trim();
    return {
      bus: [['Daewoo Express', 'https://www.daewoo.com.pk'], ['Faisal Movers', 'https://www.faisalmovers.com'], ['BookMe', 'https://bookme.pk'], [tt('گوگل پر تلاش', 'Search on Google'), 'https://www.google.com/search?q=' + enc('bus tickets ' + from + ' to ' + to + ' ' + f.date)]],
      train: [['Pakistan Railways', 'https://www.pakrail.gov.pk'], ['BookMe', 'https://bookme.pk'], [tt('گوگل پر تلاش', 'Search on Google'), 'https://www.google.com/search?q=' + enc('train tickets ' + from + ' to ' + to + ' ' + f.date)]],
      hotel: [['Booking.com', 'https://www.booking.com/searchresults.html?ss=' + enc(city) + '&checkin=' + f.cin + '&checkout=' + f.cout + '&group_adults=' + f.guests], ['Google Hotels', 'https://www.google.com/travel/search?q=' + enc('hotels in ' + city + ' ' + f.cin)], ['Airbnb', 'https://www.airbnb.com/s/' + enc(city) + '/homes?checkin=' + f.cin + '&checkout=' + f.cout + '&adults=' + f.guests], ['Agoda', 'https://www.agoda.com']],
      flight: [['Google Flights', 'https://www.google.com/travel/flights?q=' + enc('Flights from ' + from + ' to ' + to + ' on ' + f.date + (f.ret ? ' returning ' + f.ret : ''))], ['PIA', 'https://www.piac.com.pk'], ['Airblue', 'https://www.airblue.com'], ['AirSial', 'https://www.airsial.com'], ['Serene Air', 'https://www.sereneair.com'], ['Skyscanner', 'https://www.skyscanner.net']]
    }[TB.tab];
  }
  function summary() {
    var f = TBF;
    return TB.tab === 'hotel' ? f.city + ' · ' + f.cin + ' → ' + f.cout + ' · ' + f.guests : f.from + ' → ' + f.to + ' · ' + f.date + (f.ret ? ' ↩ ' + f.ret : '') + ' · ' + f.pax;
  }
  var CHK = {
    dom: ['اصل CNIC', 'ٹکٹ (فون میں یا پرنٹ)', 'چارجر اور پاور بینک', 'دوائیں', 'پانی اور ہلکا کھانا', 'نقد رقم (چھوٹے نوٹ)', 'ہوٹل/میزبان کا فون نمبر', 'گھر کے دروازے، گیس اور بجلی بند'],
    intl: ['پاسپورٹ (6 ماہ کی میعاد)', 'ویزا اور ٹکٹ کی کاپیاں', 'ہوٹل بکنگ کی تفصیل', 'ٹیکے کا سرٹیفکیٹ (اگر ضرورت ہو)', 'کرنسی اور کارڈ', 'سم/رومنگ اور فون چارجر، ایڈاپٹر', 'دوائیں اور نسخہ', 'بیگ کا وزن چیک (ایئرلائن کی حد)', 'سفارت خانے کا نمبر اور ایمرجنسی رابطہ']
  };
  function tripsHtml() {
    var tr = lget('tb.trips', []).slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); }), now = Date.now(), h = '';
    if (!tr.length) h += '<div class="card center"><p class="mut">' + tt('ابھی کوئی سفر محفوظ نہیں۔ بک کرنے کے بعد تفصیل یہاں لکھ لیں۔', 'No trips saved yet. After booking, save the details here.') + '</p></div>';
    tr.forEach(function (t) {
      var past = t.at && t.at < now - 6 * 3600000, ic = { bus: '🚌', train: '🚆', hotel: '🏨', flight: '✈️' }[t.k] || '🎫';
      h += '<div class="card"' + (past ? ' style="opacity:.55"' : '') + '><div class="row" style="padding:0;align-items:flex-start"><span class="dd" style="background:rgba(var(--c3),.18);font-size:20px">' + ic + '</span><div class="t" style="flex:1"><b dir="auto">' + esc(t.from + (t.to ? ' → ' + t.to : '')) + '</b><small class="e" style="display:block;direction:ltr;text-align:start">' + esc((t.date || '') + ' ' + (t.time || '')) + (t.seat ? ' · seat ' + esc(t.seat) : '') + '</small>' + (t.ref ? '<small class="e" style="display:block;direction:ltr;text-align:start">Ref: <b>' + esc(t.ref) + '</b></small>' : '') + (t.note ? '<small class="e" style="display:block" dir="auto">' + esc(t.note) + '</small>' : '') + '</div></div>' +
        '<div class="two" style="margin-top:8px;grid-template-columns:1fr auto auto"><button class="sbtn" data-tsh="' + t.id + '">' + tt('شیئر', 'Share') + '</button><button class="sbtn" data-tcp="' + t.id + '">📋</button><button class="sbtn r" data-tdl="' + t.id + '">✕</button></div></div>';
    });
    h += '<button class="sbtn p" id="tadd" style="width:100%;margin-top:8px">＋ ' + tt('سفر محفوظ کریں', 'Save a trip') + '</button>';
    var ck = lget('tb.chk', {});
    [['dom', 'اندرونِ ملک روانگی کی چیک لسٹ', 'Domestic departure checklist'], ['intl', 'بیرونِ ملک روانگی کی چیک لسٹ', 'International departure checklist']].forEach(function (c) {
      h += '<div class="sec">' + tt(c[1], c[2]) + '</div><div class="card">' + CHK[c[0]].map(function (x, i) { var k = c[0] + i; return '<label class="uchk2" style="margin:0;padding:5px 0"><input type="checkbox" data-tck="' + k + '"' + (ck[k] ? ' checked' : '') + '> ' + esc(x) + '</label>'; }).join('') + '<button class="sbtn" data-tcr="' + c[0] + '" style="margin-top:6px;min-height:36px">' + tt('صاف کریں', 'Clear') + '</button></div>';
    });
    return h;
  }
  function tripSheet() {
    var m = $('#modal'); m.hidden = false; var d = plusDays(1);
    $('#sheet').innerHTML = '<b style="font-size:17px">' + tt('سفر محفوظ کریں', 'Save a trip') + '</b>' + chips(TABS.slice(0, 4).map(function (t) { return [t[0], [t[1] + ' ' + t[2][0], t[1] + ' ' + t[2][1]]]; }), TB.tripk || 'bus', 'tk') +
      '<input class="inp" id="tf1" placeholder="' + tt('کہاں سے (یا ہوٹل کا نام)', 'From (or hotel name)') + '" style="margin-top:8px"><input class="inp" id="tf2" placeholder="' + tt('کہاں تک (ہوٹل کے لیے خالی چھوڑیں)', 'To (leave empty for hotel)') + '" style="margin-top:8px">' +
      '<div class="two" style="margin-top:8px"><input class="inp" type="date" id="tf3" value="' + d + '" style="direction:ltr"><input class="inp" type="time" id="tf4" value="09:00" style="direction:ltr"></div>' +
      '<div class="two" style="margin-top:8px"><input class="inp" id="tf5" placeholder="' + tt('ریفرنس/PNR', 'Reference / PNR') + '" style="direction:ltr"><input class="inp" id="tf6" placeholder="' + tt('سیٹ', 'Seat') + '" style="direction:ltr"></div>' +
      '<input class="inp" id="tf7" placeholder="' + tt('نوٹ (اختیاری)', 'Note (optional)') + '" style="margin-top:8px"><label class="uchk2"><input type="checkbox" id="tf8" checked> ' + tt('روانگی سے پہلے یاد دلائیں (ایک دن اور 3 گھنٹے)', 'Remind me (1 day and 3 hours before)') + '</label>' +
      '<div class="two" style="margin-top:12px"><button class="sbtn" id="tfx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="tfo">' + tt('محفوظ', 'Save') + '</button></div>';
    bind('tk', function (k) { TB.tripk = k; [].forEach.call(document.querySelectorAll('[data-tk]'), function (b) { b.classList.toggle('on', b.dataset.tk === k); }); });
    $('#tfx').onclick = function () { m.hidden = true; };
    $('#tfo').onclick = function () {
      var from = $('#tf1').value.trim(); if (!from) { CL.toast('جگہ لکھیں', 'Enter a place'); return; }
      var date = $('#tf3').value, time = $('#tf4').value || '09:00', at = new Date(date + 'T' + time).getTime(); if (isNaN(at)) at = 0;
      var t = { id: U.uid(), k: TB.tripk || 'bus', from: from, to: $('#tf2').value.trim(), date: date, time: time, at: at, ref: $('#tf5').value.trim(), seat: $('#tf6').value.trim(), note: $('#tf7').value.trim(), nids: [] };
      var list = [], title = 'Cleanova Life', body = from + (t.to ? ' → ' + t.to : '') + ' · ' + time;
      if ($('#tf8').checked && at) {
        [[at - 86400000, tt('کل روانگی ہے: ', 'Tomorrow: ')], [at - 3 * 3600000, tt('3 گھنٹے بعد روانگی: ', 'In 3 hours: ')]].forEach(function (x) { if (x[0] > Date.now()) { var id = 100000 + Math.floor(Math.random() * 800000); t.nids.push(id); list.push({ id: id, title: title, body: x[1] + body, schedule: { at: new Date(x[0]), allowWhileIdle: true } }); } });
      }
      var l = lget('tb.trips', []); l.push(t); lset('tb.trips', l); m.hidden = true;
      if (list.length) U.scheduleLN(list).then(function (ok) { CL.toast(ok ? 'محفوظ، یاددہانی لگ گئی' : 'محفوظ (نوٹیفکیشن کی اجازت نہیں)', ok ? 'Saved with reminders' : 'Saved (no notification permission)'); vTbook(); }); else { CL.toast('محفوظ ہو گیا', 'Saved'); vTbook(); }
    };
  }
  function tripText(t) { return '🎫 ' + t.from + (t.to ? ' → ' + t.to : '') + '\n📅 ' + t.date + ' ' + t.time + (t.seat ? '\n💺 ' + t.seat : '') + (t.ref ? '\n🔖 Ref: ' + t.ref : '') + (t.note ? '\n📝 ' + t.note : '') + '\n— Cleanova Life'; }
  function vTbook() {
    CL.setTop(T('سفر اور بکنگ', 'Travel & booking'));
    var h = chips(TABS.map(function (t) { return [t[0], [t[1] + ' ' + t[2][0], t[1] + ' ' + t[2][1]]]; }), TB.tab, 'tt').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"');
    if (TB.tab === 'trips') h += tripsHtml();
    else {
      var f = TBF, hotel = TB.tab === 'hotel';
      h += '<div class="card" style="margin-top:8px">' + (hotel ?
        '<span class="fl" style="margin-top:0">' + tt('شہر', 'City') + '</span><input class="inp" id="bcity" value="' + esc(f.city) + '" placeholder="Lahore">' +
        '<div class="two"><div><span class="fl">' + tt('آمد', 'Check-in') + '</span><input class="inp" type="date" id="bcin" value="' + f.cin + '" style="direction:ltr"></div><div><span class="fl">' + tt('روانگی', 'Check-out') + '</span><input class="inp" type="date" id="bcout" value="' + f.cout + '" style="direction:ltr"></div></div>' +
        '<span class="fl">' + tt('مہمان', 'Guests') + '</span><input class="inp" type="number" min="1" id="bgu" value="' + f.guests + '" style="direction:ltr">' :
        '<div class="two"><div><span class="fl" style="margin-top:0">' + tt('کہاں سے', 'From') + '</span><input class="inp" id="bfrom" value="' + esc(f.from) + '" placeholder="Lahore"></div><div><span class="fl" style="margin-top:0">' + tt('کہاں تک', 'To') + '</span><input class="inp" id="bto" value="' + esc(f.to) + '" placeholder="Karachi"></div></div>' +
        '<div class="two"><div><span class="fl">' + tt('تاریخ', 'Date') + '</span><input class="inp" type="date" id="bdate" value="' + f.date + '" style="direction:ltr"></div><div><span class="fl">' + tt('واپسی (اختیاری)', 'Return (optional)') + '</span><input class="inp" type="date" id="bret" value="' + f.ret + '" style="direction:ltr"></div></div>' +
        '<span class="fl">' + tt('افراد', 'Travellers') + '</span><input class="inp" type="number" min="1" id="bpax" value="' + f.pax + '" style="direction:ltr">') + '</div>' +
        '<div class="sec">' + tt('کہاں بک کریں', 'WHERE TO BOOK') + '</div><p class="note" style="margin-top:0">' + tt('بٹن دبانے پر آپ کی تفصیل کاپی ہو کر سائٹ کلینووا میں کھلے گی۔ جہاں سائٹ لنک سے بھرنا قبول کرتی ہے وہاں خود بھر جائے گی۔ بکنگ اور ادائیگی اسی سائٹ پر ہوگی۔', 'Your details are copied and the site opens in Cleanova. Booking and payment happen on the site itself.') + '</p><div id="bprov"></div>';
      if (TB.tab === 'bus' || TB.tab === 'train') h += '<div class="sec">' + tt('اڈے / اسٹیشن', 'TERMINALS / STATIONS') + '</div><div class="chips" style="flex-wrap:wrap"><button class="chip" data-bmap="' + (TB.tab === 'bus' ? 'bus terminal near me' : 'railway station near me') + '">📍 ' + tt('قریب کا ' + (TB.tab === 'bus' ? 'بس اڈہ' : 'ریلوے اسٹیشن'), 'Nearest ' + (TB.tab === 'bus' ? 'bus terminal' : 'station')) + '</button></div>';
      if (TB.tab === 'flight') h += '<p class="note">' + tt('ایئرپورٹ پہنچنے کا وقت: اندرونِ ملک 2 گھنٹے اور بیرونِ ملک 3 گھنٹے پہلے۔', 'Be at the airport 2 hours early (domestic) or 3 hours (international).') + '</p>';
    }
    $('#body').innerHTML = h + CL.footer();
    bind('tt', function (k) { TB.tab = k; vTbook(); });
    var pb = $('#bprov'); if (pb) {
      var paint = function () { pb.innerHTML = prov().map(function (p, i) { return '<button class="sbtn" data-bp="' + i + '" style="width:100%;margin:4px 0;justify-content:space-between"><span dir="ltr">' + esc(p[0]) + '</span><span>↗</span></button>'; }).join(''); bind('bp', function (i) { var p = prov()[+i]; cp(summary(), ['تفصیل کاپی ہو گئی', 'Details copied']); setTimeout(function () { web(p[1], p[0]); }, 250); }); };
      var upd = function () { var g = function (id) { var e = $('#' + id); return e ? e.value : ''; }; if (TB.tab === 'hotel') { TBF.city = g('bcity'); TBF.cin = g('bcin'); TBF.cout = g('bcout'); TBF.guests = +g('bgu') || 1; } else { TBF.from = g('bfrom'); TBF.to = g('bto'); TBF.date = g('bdate'); TBF.ret = g('bret'); TBF.pax = +g('bpax') || 1; } lset('tb.form', TBF); paint(); };
      [].forEach.call(document.querySelectorAll('#body input.inp'), function (i) { i.oninput = upd; i.onchange = upd; }); paint();
    }
    bind('bmap', function (q) { web('https://www.google.com/maps/search/' + enc(q), 'Maps'); });
    var ta = $('#tadd'); if (ta) ta.onclick = tripSheet;
    var find = function (id) { return lget('tb.trips', []).filter(function (x) { return x.id === id; })[0]; };
    bind('tsh', function (id) { var t = find(id); if (!t) return; if (navigator.share) navigator.share({ text: tripText(t) }).catch(function () {}); else cp(tripText(t)); });
    bind('tcp', function (id) { var t = find(id); if (t) cp(tripText(t)); });
    bind('tdl', function (id) { var t = find(id); if (t && t.nids && t.nids.length) U.cancelLN(t.nids); lset('tb.trips', lget('tb.trips', []).filter(function (x) { return x.id !== id; })); vTbook(); });
    [].forEach.call(document.querySelectorAll('[data-tck]'), function (c) { c.onchange = function () { var k = lget('tb.chk', {}); k[c.dataset.tck] = c.checked; lset('tb.chk', k); }; });
    bind('tcr', function (p) { var k = lget('tb.chk', {}); Object.keys(k).forEach(function (x) { if (x.indexOf(p) === 0) delete k[x]; }); lset('tb.chk', k); vTbook(); });
  }
  V.tbook = vTbook;

  /* ================= HINTS, TRACKING, REGISTER ================= */
  var HINTS = { fuel: ['tbook', 'سفر پر جانا ہے؟ بس، ٹرین یا ہوٹل بھی یہیں بک کریں', 'Planning a trip? Book bus, train or hotel too'], places: ['tbook', 'راستے میں ہوٹل یا اڈہ ڈھونڈنا ہو تو "سفر اور بکنگ" دیکھیں', 'Need a hotel or terminal? Try Travel & booking'], ledger: ['split', 'دوستوں میں بل بانٹنا ہو تو "بل بانٹیں" بھی دیکھیں', 'Splitting a bill? Try Split bill'], split: ['ledger', 'کسی سے رقم لینی ہو تو "ادھار" میں لکھ لیں', 'Someone owes you? Note it in Ledger'], tbook: ['fuel', 'گاڑی سے جا رہے ہیں؟ "فیول خرچ" سے خرچ نکالیں', 'Driving? Work out the cost in Fuel cost'], pks: ['sos', 'ایمرجنسی میں "SOS" میں اپنے رابطے پہلے سے رکھیں', 'Set up your contacts in SOS beforehand'], status: ['wachat', 'کسی کو بھیجنا ہے؟ "نمبر پر چیٹ" سے نمبر محفوظ کیے بغیر بھیجیں', 'Send to someone via Chat by number'], qr: ['status', 'اپنی بات کو خوبصورت تصویر بنانا ہو تو "اسٹیٹس بنائیں"', 'Make a nice picture with Status maker'], rates: ['calc', 'حساب کرنا ہے؟ کیلکولیٹر بھی کھولیں', 'Need maths? Open Calculators'], weather: ['tbook', 'موسم دیکھ کر سفر کا پروگرام بنا رہے ہیں؟', 'Planning a trip around the weather?'] };
  function addHint(id) {
    var h = HINTS[id]; if (!h || !REG[h[0]] || S.view !== id) return;
    var b = $('#body'); if (!b || b.querySelector('.hintx')) return;
    var html = '<button class="card hintx" data-mv="' + h[0] + '" style="width:100%;text-align:start;margin-top:12px;border-style:dashed">💡 ' + tt(h[1], h[2]) + ' <b style="color:var(--acc)">←</b></button>', foot = b.querySelector('.foot');
    if (foot) foot.insertAdjacentHTML('beforebegin', html); else b.insertAdjacentHTML('beforeend', html);
    bind('mv', function (v) { nav(v); });
  }
  function wrapAll() {
    ORDER.forEach(function (id) {
      var f = V[id]; if (typeof f !== 'function' || f.__w) return;
      var w = function () { track(id); var r = f.apply(this, arguments); try { addHint(id); } catch (e) { /* ignore */ } return r; }; w.__w = 1; V[id] = w;
    });
  }
  wrapAll();
  CL.wrapTools = wrapAll;
};
