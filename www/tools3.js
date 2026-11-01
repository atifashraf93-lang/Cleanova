/* Cleanova Life: bills, parcel tracking, prize bonds, my numbers, useful sites, scam safety. Everything stays on the phone. */
window.CLifeInit8 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset, nav = U.nav, rgba = U.rgba, pad = U.pad;
  function web(url, title) { if (CL.webOpen2) CL.webOpen2(url, title); else window.open(url, '_blank'); }
  function ext(url) { if (CL.openUrl) CL.openUrl(url); else window.open(url, '_blank'); }
  function cp(t, ok) {
    var done = function () { CL.toast(ok ? ok[0] : 'کاپی ہو گیا', ok ? ok[1] : 'Copied'); };
    try { navigator.clipboard.writeText(t).then(done, fb); } catch (e) { fb(); }
    function fb() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  }
  function sheet(html) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = html; return m; }
  function ymk(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function validUrl(u) { u = String(u || '').trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { var x = new URL(u); return x.hostname.indexOf('.') > 0 ? x.href : ''; } catch (e) { return ''; } }
  function nidr() { return 100000 + Math.floor(Math.random() * 800000); }
  var reg = CL.regTool;
  reg('bills', '🧾', 4, ['میرے بل', 'My bills'], 'money', ['بجلی، گیس، انٹرنیٹ، کرایہ، قسط کی تاریخیں اور یاددہانی', 'Due dates and reminders for bills'], 'بل بجلی گیس پانی انٹرنیٹ کرایہ قسط فیس bill bijli electricity gas rent instalment due kist yaad', true);
  reg('parcel', '📦', 5, ['پارسل ٹریکنگ', 'Parcel tracking'], 'daily', ['TCS، Leopards، M&P، Trax وغیرہ کے پارسل ایک فہرست میں', 'Track parcels from all couriers'], 'پارسل ٹریکنگ کوریئر tcs leopards trax postex blueex mnp daraz parcel courier tracking dak', true);
  reg('bond', '🎟', 6, ['پرائز بانڈ', 'Prize bonds'], 'money', ['اپنے بانڈ نمبر محفوظ کریں اور ڈرا کی فہرست سے ملائیں', 'Save bond numbers and match draw results'], 'پرائز بانڈ انعامی bond prize draw result نتیجہ 750 1500 7500 15000 40000 100 200 25000', true);
  reg('mynums', '🔢', 1, ['میرے نمبرز', 'My numbers'], 'safe', ['کنزیومر، رول، ٹریکنگ، رجسٹریشن نمبر محفوظ اور کاپی', 'Save reference, roll and tracking numbers'], 'نمبر ریفرنس رول نمبر کنزیومر رجسٹریشن گاڑی reference roll number consumer registration vehicle saved vault', true);
  reg('sites', '🌍', 3, ['مفید ویب سائٹس', 'Useful websites'], 'web', ['PDF، تصویر، AI، فائل شیئرنگ، میٹنگ، فری لانس سائٹس', 'PDF, image, AI, file sharing, meetings, freelance'], 'ویب سائٹ canva photopea removebg ilovepdf smallpdf tinywow drive dropbox wetransfer zoom meet telegram notion trello fiverr upwork daraz website site link', true);
  reg('scam', '🛡', 2, ['فراڈ سیفٹی', 'Scam safety'], 'safe', ['اسپیم نمبر، فراڈ کی پہچان، لٹ جائیں تو کیا کریں', 'Spam numbers, scam signs, what to do if scammed'], 'فراڈ اسپیم scam fraud spam نمبر جعلی پیغام لنک link otp انعام bisp easypaisa jazzcash بلاک block سیفٹی safety', true);

  /* ================= BILLS ================= */
  var BT = [['elec', '⚡', ['بجلی', 'Electricity']], ['gas', '🔥', ['گیس', 'Gas']], ['water', '💧', ['پانی', 'Water']], ['net', '🌐', ['انٹرنیٹ/فون', 'Internet/Phone']], ['rent', '🏠', ['کرایہ', 'Rent']], ['inst', '💳', ['قسط', 'Instalment']], ['fee', '🎓', ['فیس', 'Fee']], ['other', '🧾', ['دیگر', 'Other']]];
  var COMP = { elec: [['PITC (تمام)', 'https://bill.pitc.com.pk'], ['LESCO', 'https://www.lesco.gov.pk'], ['IESCO', 'https://www.iesco.com.pk'], ['FESCO', 'https://www.fesco.com.pk'], ['MEPCO', 'https://www.mepco.com.pk'], ['GEPCO', 'https://www.gepco.com.pk'], ['PESCO', 'https://www.pesco.gov.pk'], ['HESCO', 'http://www.hesco.gov.pk'], ['QESCO', 'http://www.qesco.com.pk'], ['K-Electric', 'https://www.ke.com.pk']], gas: [['SNGPL', 'https://www.sngpl.com.pk'], ['SSGC', 'https://www.ssgc.com.pk']], net: [['PTCL', 'https://www.ptcl.com.pk']] };
  var BF = { type: 'elec' };
  function dueDate(b, from) {
    var now = from || new Date(), d = new Date(now.getFullYear(), now.getMonth(), Math.min(+b.day, 28), 23, 59);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(+b.day, 28), 23, 59);
    return d;
  }
  function billState(b) {
    var paid = b.paid && b.paid[ymk()], now = new Date(), thisDue = new Date(now.getFullYear(), now.getMonth(), Math.min(+b.day, 28), 23, 59), days = Math.ceil((thisDue - now) / 86400000);
    if (paid) return { k: 'ok', t: tt('✓ ادا ہو گیا', '✓ Paid'), days: days };
    if (days < 0) return { k: 'late', t: tt('گزر گئی: ' + (-days) + ' دن', 'Overdue: ' + (-days) + ' d'), days: days };
    return { k: days <= 3 ? 'soon' : 'wait', t: days === 0 ? tt('آج آخری تاریخ', 'Due today') : tt(days + ' دن باقی', days + ' days left'), days: days };
  }
  function schedBill(b) {
    if (b.nid) U.cancelLN([b.nid]);
    var rd = Math.max(1, Math.min(+b.day, 28) - (+b.rem || 2)); b.nid = nidr();
    return U.scheduleLN([{ id: b.nid, title: 'Cleanova Life', body: tt('بل کی تاریخ قریب ہے: ', 'Bill due soon: ') + b.title, schedule: { on: { day: rd, hour: 9, minute: 0 }, allowWhileIdle: true } }]);
  }
  function billSheet(id) {
    var l = lget('bills', []), b = id ? l.filter(function (x) { return x.id === id; })[0] : null; b = b || { type: BF.type, title: '', ref: '', day: 10, rem: 2, comp: '', amt: '' };
    var m = sheet('<b style="font-size:17px">' + (id ? tt('بل ایڈٹ', 'Edit bill') : tt('نیا بل', 'New bill')) + '</b>' + chips(BT.map(function (t) { return [t[0], [t[1] + ' ' + t[2][0], t[1] + ' ' + t[2][1]]]; }), b.type, 'bt').replace('class="chips"', 'class="chips" style="flex-wrap:wrap;margin-top:8px"') +
      '<input class="inp" id="bn" placeholder="' + tt('نام (مثلاً گھر کا بجلی بل)', 'Name') + '" value="' + esc(b.title) + '" style="margin-top:8px"><div id="bcw"></div>' +
      '<input class="inp" id="br" placeholder="' + tt('کنزیومر/ریفرنس نمبر (اختیاری)', 'Consumer / reference no. (optional)') + '" value="' + esc(b.ref) + '" style="margin-top:8px;direction:ltr">' +
      '<div class="two" style="margin-top:8px"><div><span class="fl" style="margin-top:0">' + tt('ہر ماہ آخری تاریخ', 'Due day of month') + '</span><input class="inp" id="bd" type="number" min="1" max="28" value="' + b.day + '" style="direction:ltr"></div><div><span class="fl" style="margin-top:0">' + tt('کتنے دن پہلے یاد دلائیں', 'Remind days before') + '</span><input class="inp" id="bm" type="number" min="0" max="10" value="' + b.rem + '" style="direction:ltr"></div></div>' +
      '<input class="inp" id="ba" type="number" placeholder="' + tt('عام رقم (اختیاری)', 'Usual amount (optional)') + '" value="' + esc(b.amt) + '" style="margin-top:8px;direction:ltr"><p class="note">' + tt('تاریخ 28 تک رکھیں تاکہ ہر مہینے میں کام کرے۔', 'Keep the day at 28 or below so it works every month.') + '</p>' +
      '<div class="two" style="margin-top:10px"><button class="sbtn" id="bx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="bo">' + tt('محفوظ', 'Save') + '</button></div>');
    var paintC = function () { var cs = COMP[b.type]; $('#bcw').innerHTML = cs ? '<span class="fl">' + tt('کمپنی', 'Company') + '</span>' + chips(cs.map(function (c) { return [c[0], [c[0], c[0]]]; }), b.comp, 'bc').replace('class="chips"', 'class="chips" style="flex-wrap:wrap"') : ''; bind('bc', function (c) { b.comp = c; paintC(); }); };
    paintC();
    bind('bt', function (t) { b.type = t; BF.type = t; b.comp = ''; [].forEach.call(document.querySelectorAll('[data-bt]'), function (x) { x.classList.toggle('on', x.dataset.bt === t); }); paintC(); });
    $('#bx').onclick = function () { m.hidden = true; };
    $('#bo').onclick = function () {
      b.title = $('#bn').value.trim() || L(BT.filter(function (x) { return x[0] === b.type; })[0][2]); b.ref = $('#br').value.trim(); b.day = Math.max(1, Math.min(28, +$('#bd').value || 10)); b.rem = Math.max(0, Math.min(10, +$('#bm').value || 0)); b.amt = $('#ba').value;
      if (!b.id) { b.id = U.uid(); b.paid = {}; l.push(b); } m.hidden = true; lset('bills', l);
      schedBill(b).then(function () { lset('bills', l); CL.toast('بل محفوظ', 'Bill saved'); vBills(); });
    };
  }
  function vBills() {
    CL.setTop(T('میرے بل', 'My bills'));
    var l = lget('bills', []), now = new Date(), unpaid = 0, tot = 0;
    var rows = l.map(function (b) { return { b: b, s: billState(b) }; }).sort(function (a, c) { return (a.s.k === 'ok') - (c.s.k === 'ok') || a.s.days - c.s.days; });
    rows.forEach(function (r) { if (r.s.k !== 'ok') { unpaid++; tot += +r.b.amt || 0; } });
    var h = l.length ? '<div class="card" style="margin-top:8px"><div class="two"><div class="center"><b style="font-size:26px">' + unpaid + '</b><small class="e" style="display:block">' + tt('اس ماہ باقی', 'Unpaid this month') + '</small></div><div class="center"><b style="font-size:20px;direction:ltr;display:block">Rs ' + Math.round(tot).toLocaleString('en') + '</b><small class="e" style="display:block">' + tt('اندازاً رقم', 'Estimated total') + '</small></div></div></div>' : '<div class="card center" style="margin-top:8px"><p class="mut">' + tt('ابھی کوئی بل نہیں۔ بجلی، گیس، انٹرنیٹ، کرایہ یا قسط شامل کریں، ہر ماہ یاددہانی آئے گی۔', 'No bills yet. Add one to get monthly reminders.') + '</p></div>';
    h += rows.map(function (r) {
      var b = r.b, t = BT.filter(function (x) { return x[0] === b.type; })[0] || BT[7], col = { ok: 'var(--acc)', late: '#f43f5e', soon: '#f59e0b', wait: 'var(--mut)' }[r.s.k], site = COMP[b.type] && (COMP[b.type].filter(function (c) { return c[0] === b.comp; })[0] || COMP[b.type][0]);
      return '<div class="card"><div class="row" style="padding:0;align-items:flex-start"><span class="dd" style="background:rgba(var(--c4),.18);font-size:20px">' + t[1] + '</span><div class="t" style="flex:1"><b dir="auto">' + esc(b.title) + '</b><small class="e" style="display:block;color:' + col + ';font-weight:700">' + r.s.t + ' · ' + tt('ہر ماہ ' + b.day + ' تاریخ', 'day ' + b.day + ' monthly') + '</small>' + (b.ref ? '<small class="e" style="display:block;direction:ltr;text-align:start">Ref ' + esc(b.ref) + '</small>' : '') + '</div><button class="sbtn" data-be="' + b.id + '" style="min-height:36px;padding:0 10px">✎</button></div>' +
        '<div class="two" style="margin-top:8px;grid-template-columns:' + (site ? '1fr 1fr' : '1fr') + '">' + (site ? '<button class="sbtn" data-bk="' + b.id + '">🔎 ' + tt('بل دیکھیں', 'View bill') + '</button>' : '') + '<button class="sbtn p" data-bp="' + b.id + '">' + (r.s.k === 'ok' ? tt('دوبارہ لکھیں', 'Edit paid') : '✓ ' + tt('ادا ہو گیا', 'Mark paid')) + '</button></div></div>';
    }).join('');
    h += '<button class="sbtn p" id="badd" style="width:100%;margin-top:10px">＋ ' + tt('نیا بل', 'Add bill') + '</button>';
    var hist = []; l.forEach(function (b) { Object.keys(b.paid || {}).forEach(function (k) { hist.push({ k: k, t: b.title, a: +(b.paid[k].amt) || 0 }); }); });
    if (hist.length) { var by = {}; hist.forEach(function (x) { by[x.k] = (by[x.k] || 0) + x.a; }); var ks = Object.keys(by).sort().slice(-6), mx = Math.max.apply(null, ks.map(function (k) { return by[k]; })) || 1; h += '<div class="sec">' + tt('پچھلے مہینوں کا خرچ', 'PAST MONTHS') + '</div><div class="card">' + ks.map(function (k) { return '<div style="display:flex;align-items:center;gap:8px;margin:5px 0"><span style="width:62px;direction:ltr;font-size:12px">' + k + '</span><span style="flex:1;height:14px;border-radius:7px;background:var(--bg);overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(by[k] / mx * 100) + '%;background:linear-gradient(90deg,var(--acc),var(--acc2))"></i></span><b style="font-size:12px;direction:ltr">' + Math.round(by[k]).toLocaleString('en') + '</b></div>'; }).join('') + '</div>'; }
    var ec = lget('bills.est', { rate: '', fixed: '', tax: '' });
    h += '<div class="sec">' + tt('بجلی بل کا اندازہ', 'ELECTRICITY ESTIMATE') + '</div><div class="card"><div class="two"><div><span class="fl" style="margin-top:0">' + tt('یونٹ', 'Units') + '</span><input class="inp" id="eu" type="number" inputmode="decimal" style="direction:ltr"></div><div><span class="fl" style="margin-top:0">' + tt('فی یونٹ ریٹ (Rs)', 'Rate / unit (Rs)') + '</span><input class="inp" id="er" type="number" inputmode="decimal" value="' + esc(ec.rate) + '" style="direction:ltr"></div></div><div class="two"><div><span class="fl">' + tt('فکسڈ چارجز', 'Fixed charges') + '</span><input class="inp" id="ef" type="number" value="' + esc(ec.fixed) + '" style="direction:ltr"></div><div><span class="fl">' + tt('ٹیکس %', 'Tax %') + '</span><input class="inp" id="et" type="number" value="' + esc(ec.tax) + '" style="direction:ltr"></div></div><div class="center" style="margin-top:10px"><b id="eo" style="font-size:22px;direction:ltr;display:block">—</b></div><p class="note">' + tt('ریٹ اپنے پچھلے بل سے دیکھ کر لکھیں؛ سلیب اور ٹیرف بدلتے رہتے ہیں اس لیے یہ صرف موٹا اندازہ ہے۔', 'Take the rate from your last bill. Tariffs change, so this is only a rough estimate.') + '</p></div>' + CL.footer();
    $('#body').innerHTML = h;
    var est = function () { var u = parseFloat($('#eu').value), r = parseFloat($('#er').value), f = parseFloat($('#ef').value) || 0, tx = parseFloat($('#et').value) || 0; lset('bills.est', { rate: $('#er').value, fixed: $('#ef').value, tax: $('#et').value }); if (isNaN(u) || isNaN(r)) { $('#eo').textContent = '—'; return; } var sub = u * r + f; $('#eo').textContent = 'Rs ' + Math.round(sub * (1 + tx / 100)).toLocaleString('en'); };
    ['eu', 'er', 'ef', 'et'].forEach(function (i) { $('#' + i).oninput = est; });
    $('#badd').onclick = function () { billSheet(null); };
    bind('be', function (id) { billSheet(id); });
    bind('bk', function (id) { var b = l.filter(function (x) { return x.id === id; })[0], c = COMP[b.type] && (COMP[b.type].filter(function (x) { return x[0] === b.comp; })[0] || COMP[b.type][0]); if (b.ref) cp(b.ref, ['ریفرنس نمبر کاپی ہو گیا', 'Reference copied']); setTimeout(function () { web(c[1], c[0]); }, 300); });
    bind('bp', function (id) {
      var b = l.filter(function (x) { return x.id === id; })[0];
      CL.ask(tt('ادا کی گئی رقم (خالی چھوڑ سکتے ہیں)', 'Amount paid (optional)'), b.amt || '', function (v) { b.paid = b.paid || {}; b.paid[ymk()] = { amt: parseFloat(v) || 0, at: Date.now() }; if (parseFloat(v)) b.amt = String(parseFloat(v)); lset('bills', l); CL.toast('ادا ہو گیا ✓', 'Marked paid'); vBills(); });
    });
  }
  V.bills = vBills;

  /* ================= PARCEL ================= */
  var COUR = [['TCS', 'https://www.tcsexpress.com'], ['Leopards', 'https://www.leopardscourier.com'], ['M&P', 'https://www.mulphilog.com'], ['Trax', 'https://trax.pk'], ['PostEx', 'https://postex.pk'], ['BlueEx', 'https://www.blue-ex.com'], ['Call Courier', 'https://callcourier.com.pk'], ['Pakistan Post', 'https://ep.gov.pk'], ['Daraz', 'https://www.daraz.pk'], ['DHL', 'https://www.dhl.com/pk-en/home/tracking.html'], ['FedEx', 'https://www.fedex.com/en-pk/tracking.html']];
  var PF = { c: 'TCS' };
  function guessCourier(n) { n = String(n).trim().toUpperCase(); if (/^[A-Z]{2}\d{9}PK$/.test(n)) return 'Pakistan Post'; return null; }
  function parcelSheet() {
    var m = sheet('<b style="font-size:17px">' + tt('نیا پارسل', 'New parcel') + '</b><input class="inp" id="pn" placeholder="' + tt('ٹریکنگ نمبر', 'Tracking number') + '" style="margin-top:8px;direction:ltr"><input class="inp" id="pt" placeholder="' + tt('کیا ہے؟ (مثلاً جوتے، Daraz)', 'What is it?') + '" style="margin-top:8px"><span class="fl">' + tt('کوریئر', 'Courier') + '</span><div id="pc"></div><div class="two" style="margin-top:12px"><button class="sbtn" id="px">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="po">' + tt('محفوظ', 'Save') + '</button></div>');
    var paint = function () { $('#pc').innerHTML = chips(COUR.map(function (c) { return [c[0], [c[0], c[0]]]; }), PF.c, 'pcx').replace('class="chips"', 'class="chips" style="flex-wrap:wrap"'); bind('pcx', function (c) { PF.c = c; paint(); }); }; paint();
    $('#pn').oninput = function () { var g = guessCourier(this.value); if (g && g !== PF.c) { PF.c = g; paint(); } };
    $('#px').onclick = function () { m.hidden = true; };
    $('#po').onclick = function () { var n = $('#pn').value.trim(); if (!n) { CL.toast('ٹریکنگ نمبر لکھیں', 'Enter the number'); return; } var l = lget('parcels', []); l.unshift({ id: U.uid(), no: n, c: PF.c, t: $('#pt').value.trim(), at: Date.now(), done: false }); lset('parcels', l); m.hidden = true; vParcel(); };
  }
  function vParcel() {
    CL.setTop(T('پارسل ٹریکنگ', 'Parcel tracking'));
    var l = lget('parcels', []), act = l.filter(function (x) { return !x.done; }), dn = l.filter(function (x) { return x.done; });
    var card = function (p) {
      var c = COUR.filter(function (x) { return x[0] === p.c; })[0] || COUR[0], days = Math.floor((Date.now() - p.at) / 86400000);
      return '<div class="card"' + (p.done ? ' style="opacity:.6"' : '') + '><div class="row" style="padding:0;align-items:flex-start"><span class="dd" style="background:rgba(var(--c5),.18);font-size:20px">📦</span><div class="t" style="flex:1"><b dir="auto">' + esc(p.t || p.c) + '</b><small class="e" style="display:block;direction:ltr;text-align:start">' + esc(p.c) + ' · ' + esc(p.no) + '</small><small class="e" style="display:block">' + (p.done ? tt('✓ مل گیا', '✓ Delivered') : tt(days + ' دن پہلے شامل ہوا', 'Added ' + days + ' d ago')) + '</small></div><button class="sbtn r" data-pd="' + p.id + '" style="min-height:36px;padding:0 10px">✕</button></div><div class="two" style="margin-top:8px"><button class="sbtn p" data-ptk="' + p.id + '">🔎 ' + tt('ٹریک کریں', 'Track') + '</button><button class="sbtn" data-pok="' + p.id + '">' + (p.done ? tt('واپس', 'Undo') : '✓ ' + tt('مل گیا', 'Received')) + '</button></div></div>';
    };
    $('#body').innerHTML = (act.length ? act.map(card).join('') : '<div class="card center" style="margin-top:8px"><p class="mut">' + tt('کوئی چلتا ہوا پارسل نہیں۔ ٹریکنگ نمبر لکھ کر شامل کریں۔', 'No parcels on the way. Add a tracking number.') + '</p></div>') +
      '<button class="sbtn p" id="padd" style="width:100%;margin-top:8px">＋ ' + tt('پارسل شامل کریں', 'Add parcel') + '</button>' + (dn.length ? '<div class="sec">' + tt('مل چکے', 'RECEIVED') + '</div>' + dn.map(card).join('') : '') +
      '<p class="note">' + tt('"ٹریک کریں" دبانے پر نمبر کاپی ہو کر کوریئر کی سائٹ کھلتی ہے؛ وہاں نمبر پیسٹ کر دیں۔ ہر کوریئر کی اپنی سائٹ کی سروس ہے۔', 'Tap Track: the number is copied and the courier site opens. Paste it there.') + '</p>' + CL.footer();
    $('#padd').onclick = parcelSheet;
    var find = function (id) { return l.filter(function (x) { return x.id === id; })[0]; };
    bind('ptk', function (id) { var p = find(id), c = COUR.filter(function (x) { return x[0] === p.c; })[0] || COUR[0]; cp(p.no, ['ٹریکنگ نمبر کاپی ہو گیا', 'Number copied']); setTimeout(function () { web(c[1], c[0]); }, 300); });
    bind('pok', function (id) { var p = find(id); p.done = !p.done; lset('parcels', l); vParcel(); });
    bind('pd', function (id) { lset('parcels', l.filter(function (x) { return x.id !== id; })); vParcel(); });
  }
  V.parcel = vParcel;

  /* ================= PRIZE BONDS ================= */
  var DEN = ['100', '200', '750', '1500', '7500', '15000', '25000', '40000'];
  var BS = { d: '750' };
  function nums(txt) { var m = String(txt).match(/\d{6}/g) || []; return m.filter(function (x, i) { return m.indexOf(x) === i; }); }
  function vBond() {
    CL.setTop(T('پرائز بانڈ', 'Prize bonds'));
    var l = lget('bonds', []), byD = {}; l.forEach(function (b) { (byD[b.d] = byD[b.d] || []).push(b.n); });
    var h = '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('مالیت', 'Denomination') + '</span>' + chips(DEN.map(function (d) { return [d, ['Rs ' + d, 'Rs ' + d]]; }), BS.d, 'bdn').replace('class="chips"', 'class="chips" style="flex-wrap:wrap"') +
      '<textarea class="inp" id="bnn" rows="2" placeholder="' + tt('بانڈ نمبر (6 ہندسے)، کئی نمبر خالی جگہ یا نئی لائن سے الگ', 'Bond numbers (6 digits), separate with spaces or new lines') + '" style="margin-top:8px;direction:ltr;min-height:60px"></textarea><button class="sbtn p" id="bna" style="width:100%;margin-top:8px">＋ ' + tt('شامل کریں', 'Add') + '</button></div>';
    var ds = Object.keys(byD).sort(function (a, b) { return +a - +b; });
    h += ds.length ? ds.map(function (d) { return '<div class="sec">Rs ' + d + ' · ' + byD[d].length + '</div><div class="card"><div style="display:flex;flex-wrap:wrap;gap:6px">' + byD[d].map(function (n) { return '<span class="chip" style="direction:ltr">' + n + ' <button data-bdl="' + d + ':' + n + '" style="background:none;border:0;color:var(--red);padding:0 2px" aria-label="del">✕</button></span>'; }).join('') + '</div></div>'; }).join('') + '<button class="sbtn" id="bchk" style="width:100%;margin-top:10px">🔎 ' + tt('ڈرا کی فہرست سے ملائیں', 'Match against a draw list') + '</button>' : '<p class="note">' + tt('اپنے بانڈ نمبر شامل کریں، پھر ڈرا کی فہرست پیسٹ کر کے ایک ٹیپ میں مل جائیں گے۔', 'Add your numbers, then paste a draw list to check them.') + '</p>';
    h += '<div class="sec">' + tt('ڈرا کی سرکاری فہرست', 'OFFICIAL DRAW RESULTS') + '</div><div class="two"><button class="sbtn" id="bsv">' + tt('قومی بچت (سرکاری)', 'National Savings') + '</button><button class="sbtn" id="bgg">' + tt('گوگل پر نتیجہ', 'Search result') + '</button></div><p class="note">' + tt('ڈرا کی تاریخیں اور نتائج صرف سرکاری ذرائع سے مانیں۔ یہاں کا نتیجہ آپ کی پیسٹ کی ہوئی فہرست سے نمبر ملانے تک محدود ہے، انعام کی رقم یا حتمی تصدیق نہیں۔', 'Trust only official sources for draw dates and results. This tool only matches numbers against the list you paste; it does not confirm prizes.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    bind('bdn', function (d) { BS.d = d; [].forEach.call(document.querySelectorAll('[data-bdn]'), function (b) { b.classList.toggle('on', b.dataset.bdn === d); }); });
    $('#bna').onclick = function () { var ns = nums($('#bnn').value); if (!ns.length) { CL.toast('6 ہندسوں کا نمبر لکھیں', 'Enter 6-digit numbers'); return; } var n = 0; ns.forEach(function (x) { if (!l.some(function (b) { return b.d === BS.d && b.n === x; })) { l.push({ d: BS.d, n: x }); n++; } }); lset('bonds', l); CL.toast(n + ' نمبر شامل', n + ' added'); vBond(); };
    bind('bdl', function (k) { var p = k.split(':'); lset('bonds', l.filter(function (b) { return !(b.d === p[0] && b.n === p[1]); })); vBond(); });
    $('#bsv').onclick = function () { web('https://savings.gov.pk', 'National Savings'); }; $('#bgg').onclick = function () { web('https://www.google.com/search?q=' + encodeURIComponent('Rs ' + BS.d + ' prize bond draw result'), 'Result'); };
    var bc = $('#bchk'); if (bc) bc.onclick = function () {
      var m = sheet('<b style="font-size:17px">' + tt('نتیجے کی فہرست پیسٹ کریں', 'Paste the draw list') + '</b><p class="note">' + tt('سرکاری فہرست کا متن (یا اس کا حصہ) یہاں پیسٹ کریں؛ 6 ہندسوں کے سب نمبر ملا کر دیکھے جائیں گے۔', 'Paste the text of the official list. All 6-digit numbers are compared.') + '</p><textarea class="inp" id="bdl" rows="5" style="direction:ltr;min-height:120px"></textarea><div id="bres"></div><div class="two" style="margin-top:10px"><button class="sbtn" id="bcx">' + tt('بند', 'Close') + '</button><button class="sbtn p" id="bco">' + tt('ملائیں', 'Match') + '</button></div>');
      $('#bcx').onclick = function () { m.hidden = true; };
      $('#bco').onclick = function () { var set = {}; nums($('#bdl').value).forEach(function (x) { set[x] = 1; }); var hit = l.filter(function (b) { return set[b.n]; }); $('#bres').innerHTML = hit.length ? '<div class="warn" style="background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.4)">🎉 ' + tt('ملنے والے نمبر: ', 'Matches: ') + hit.map(function (b) { return '<b dir="ltr">' + b.n + '</b> (Rs ' + b.d + ')'; }).join('، ') + '<br><small>' + tt('سرکاری فہرست سے دوبارہ تصدیق کریں اور بانڈ کی مالیت کے مطابق انعام دیکھیں۔', 'Confirm on the official list and check the prize for that denomination.') + '</small></div>' : '<div class="card center"><p class="mut">' + tt('کوئی نمبر نہیں ملا۔', 'No matches.') + '</p></div>'; };
    };
  }
  V.bond = vBond;

  /* ================= MY NUMBERS ================= */
  var NC = [['ref', ['ریفرنس', 'Reference']], ['roll', ['رول نمبر', 'Roll no.']], ['track', ['ٹریکنگ', 'Tracking']], ['veh', ['گاڑی/رجسٹریشن', 'Vehicle']], ['other', ['دیگر', 'Other']]];
  var NS = { q: '', rev: {} };
  function vNums() {
    CL.setTop(T('میرے نمبرز', 'My numbers'));
    var l = lget('nums', []), q = NS.q.toLowerCase(), shown = l.filter(function (x) { return !q || (x.l + ' ' + x.v).toLowerCase().indexOf(q) >= 0; });
    var h = '<div class="warn" style="margin-top:8px">' + tt('⚠️ یہاں CNIC، پاسپورٹ، کارڈ نمبر، PIN یا پاس ورڈ نہ لکھیں۔ صرف ریفرنس، رول اور ٹریکنگ جیسے نمبر۔', 'Do not store CNIC, passport, card numbers, PINs or passwords here. Only reference-type numbers.') + '</div>' +
      '<input class="inp" id="nq" placeholder="🔍 ' + tt('ڈھونڈیں', 'Search') + '" value="' + esc(NS.q) + '" style="margin-top:8px">' +
      shown.map(function (x) {
        var r = NS.rev[x.id], v = r ? x.v : (x.v.length > 3 ? '•'.repeat(Math.max(3, x.v.length - 3)) + x.v.slice(-3) : '•••');
        return '<div class="card"><div class="row" style="padding:0"><div class="t" style="flex:1"><b dir="auto">' + esc(x.l) + '</b><small class="e" style="display:block;direction:ltr;text-align:start;letter-spacing:1px">' + esc(v) + '</small><small class="e" style="display:block">' + L((NC.filter(function (c) { return c[0] === x.c; })[0] || NC[4])[1]) + '</small></div><button class="sbtn" data-nv="' + x.id + '" style="min-height:38px;padding:0 10px">👁</button><button class="sbtn" data-nc="' + x.id + '" style="min-height:38px;padding:0 10px">📋</button><button class="sbtn r" data-nd="' + x.id + '" style="min-height:38px;padding:0 10px">✕</button></div></div>';
      }).join('') + (!l.length ? '<div class="card center"><p class="mut">' + tt('ابھی کچھ محفوظ نہیں۔', 'Nothing saved yet.') + '</p></div>' : '') +
      '<button class="sbtn p" id="nadd" style="width:100%;margin-top:10px">＋ ' + tt('نمبر شامل کریں', 'Add number') + '</button><p class="note">' + tt('یہ صرف آپ کے فون میں ہے۔ پرائیویسی میں ایپ لاک لگا کر اسے بند رکھیں۔', 'Stored only on your phone. Turn on the app lock in Privacy.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    $('#nq').oninput = function () { NS.q = this.value; var p = this.selectionStart; vNums(); var e = $('#nq'); e.focus(); try { e.setSelectionRange(p, p); } catch (x) { /* ignore */ } };
    $('#nadd').onclick = function () {
      var kind = 'ref', m = sheet('<b style="font-size:17px">' + tt('نیا نمبر', 'New number') + '</b><input class="inp" id="nl" placeholder="' + tt('نام (مثلاً بجلی کنزیومر، میٹرک رول نمبر)', 'Label') + '" style="margin-top:8px"><input class="inp" id="nvv" placeholder="' + tt('نمبر', 'Number') + '" style="margin-top:8px;direction:ltr">' + chips(NC, kind, 'nk').replace('class="chips"', 'class="chips" style="flex-wrap:wrap;margin-top:8px"') + '<div class="two" style="margin-top:12px"><button class="sbtn" id="nx">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="no">' + tt('محفوظ', 'Save') + '</button></div>');
      bind('nk', function (k) { kind = k; [].forEach.call(document.querySelectorAll('[data-nk]'), function (b) { b.classList.toggle('on', b.dataset.nk === k); }); });
      $('#nx').onclick = function () { m.hidden = true; };
      $('#no').onclick = function () { var lab = $('#nl').value.trim(), v = $('#nvv').value.trim(); if (!lab || !v) { CL.toast('نام اور نمبر لکھیں', 'Enter label and number'); return; } var a = lget('nums', []); a.unshift({ id: U.uid(), l: lab, v: v, c: kind }); lset('nums', a); m.hidden = true; vNums(); };
    };
    bind('nv', function (id) { NS.rev[id] = !NS.rev[id]; vNums(); });
    bind('nc', function (id) { var x = l.filter(function (y) { return y.id === id; })[0]; if (x) cp(x.v, ['نمبر کاپی ہو گیا', 'Number copied']); });
    bind('nd', function (id) { lset('nums', l.filter(function (y) { return y.id !== id; })); vNums(); });
  }
  V.mynums = vNums;

  /* ================= USEFUL SITES ================= */
  var SG = [
    [['PDF اور فائلیں', 'PDF & files'], [['iLovePDF', 'PDF بنانا، جوڑنا، بدلنا', 'https://www.ilovepdf.com', '📄'], ['Smallpdf', 'PDF کنورٹ', 'https://www.smallpdf.com', '📑'], ['TinyWow', 'مفت فائل ٹولز', 'https://tinywow.com', '🧰'], ['Online Convert', 'فائل فارمیٹ بدلیں', 'https://www.online-convert.com', '🔁']]],
    [['تصویر', 'Images'], [['Canva', 'ڈیزائن، پوسٹر، CV', 'https://www.canva.com', '🎨'], ['Photopea', 'آن لائن فوٹوشاپ', 'https://www.photopea.com', '🖌'], ['remove.bg', 'تصویر کا بیک گراؤنڈ ہٹائیں', 'https://www.remove.bg', '✂️']]],
    [['فائل بھیجنا', 'Share files'], [['Google Drive', '', 'https://drive.google.com', '☁️'], ['Dropbox', '', 'https://www.dropbox.com', '📦'], ['OneDrive', '', 'https://onedrive.live.com', '☁️'], ['MEGA', '', 'https://mega.io', '🗄'], ['WeTransfer', 'بڑی فائل بھیجیں', 'https://wetransfer.com', '📤']]],
    [['میٹنگ اور رابطہ', 'Meetings'], [['Google Meet', '', 'https://meet.google.com', '🎥'], ['Zoom', '', 'https://zoom.us', '🎦'], ['Telegram', '', 'https://web.telegram.org', '✈️'], ['WhatsApp Web', '', 'https://web.whatsapp.com', '💬']]],
    [['کام اور آمدنی', 'Work'], [['Notion', 'نوٹس اور منصوبے', 'https://www.notion.so', '🗒'], ['Trello', 'کاموں کے بورڈ', 'https://trello.com', '📋'], ['Fiverr', 'فری لانس کام', 'https://www.fiverr.com', '💼'], ['Upwork', 'فری لانس کام', 'https://www.upwork.com', '💻'], ['Daraz', 'آن لائن خریداری', 'https://www.daraz.pk', '🛍']]]
  ];
  function vSites() {
    CL.setTop(T('مفید ویب سائٹس', 'Useful websites'));
    var custom = lget('sites.custom', []), h = '<p class="note" style="margin-top:8px">' + tt('ہر سائٹ کلینووا کی ونڈو میں کھلتی ہے اور آپ کے اپنے اکاؤنٹ سے چلتی ہے۔ حساس معلومات اور دستاویزات کی اپ لوڈ اپنی ذمہ داری پر کریں۔ ہمارے PDF اور تصویر ٹولز آف لائن ہیں، فائل کہیں نہیں جاتی۔', 'Each site opens inside Cleanova with your own account. Our PDF and image tools work offline.') + '</p>';
    SG.forEach(function (g) { h += '<div class="sec">' + L(g[0]) + '</div><div class="g2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + g[1].map(function (s) { return '<button class="card sct" data-so="' + esc(s[2]) + '|' + esc(s[0]) + '" style="margin:0;padding:12px 8px;text-align:center"><div style="font-size:24px">' + s[3] + '</div><b dir="ltr" style="font-size:13.5px">' + esc(s[0]) + '</b>' + (s[1] ? '<small class="e" style="display:block;font-size:11px">' + s[1] + '</small>' : '') + '</button>'; }).join('') + '</div>'; });
    h += '<div class="sec">' + tt('میرے لنک', 'MY LINKS') + '</div>' + custom.map(function (c, i) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><div class="t" style="flex:1"><b dir="auto">' + esc(c.n) + '</b></div><button class="sbtn p" data-so="' + esc(c.u) + '|' + esc(c.n) + '" style="min-height:38px">' + tt('کھولیں', 'Open') + '</button><button class="sbtn r" data-sx="' + i + '" style="min-height:38px;padding:0 10px">✕</button></div></div>'; }).join('') + '<button class="sbtn" id="sadd" style="width:100%;margin-top:6px">＋ ' + tt('اپنا لنک شامل کریں', 'Add your link') + '</button>' + CL.footer();
    $('#body').innerHTML = h;
    bind('so', function (v) { var p = v.split('|'); web(p[0], p[1]); });
    bind('sx', function (i) { var c = lget('sites.custom', []); c.splice(+i, 1); lset('sites.custom', c); vSites(); });
    $('#sadd').onclick = function () { CL.ask(tt('نام | لنک', 'Name | link'), '', function (v) { var p = v.split('|'), n = (p[0] || '').trim(), u = validUrl(p[1] || p[0]); if (!u) { CL.toast('درست لنک لکھیں', 'Enter a valid link'); return; } var c = lget('sites.custom', []); c.push({ n: n || u, u: u }); lset('sites.custom', c); vSites(); }); };
  }
  V.sites = vSites;

  /* ================= SCAM SAFETY ================= */
  var SC = { tab: 'num' };
  var PREF_NET = [['Jazz', /^03(0\d|2\d)/], ['Zong', /^031\d|^037\d/], ['Ufone', /^033\d/], ['Telenor', /^034\d/], ['SCO', /^0355/]];
  function netOf(n) { n = String(n).replace(/\D/g, ''); if (n.indexOf('92') === 0) n = '0' + n.slice(2); if (n.length < 4) return ''; for (var i = 0; i < PREF_NET.length; i++) if (PREF_NET[i][1].test(n)) return PREF_NET[i][0]; return ''; }
  var SIGNS = [['"آپ کا انعام نکلا ہے / BISP کی رقم ملے گی"', 'پہلے پیسے یا کارڈ نمبر مانگا جائے تو فراڈ ہے۔ BISP کی رقم 8171 یا سرکاری سینٹر سے چیک ہوتی ہے۔'], ['"آپ کا اکاؤنٹ بند ہو رہا ہے، OTP بتائیں"', 'بینک یا ایزی پیسہ/جاز کیش کبھی فون پر OTP، PIN یا پاس ورڈ نہیں مانگتا۔'], ['"غلطی سے رقم آ گئی، واپس بھیج دیں"', 'جعلی میسج اور ٹرانزیکشن کی اسکرین شاٹ دکھا کر آپ سے اصل رقم بھجوائی جاتی ہے۔ اپنا بیلنس خود چیک کریں۔'], ['بہت سستی چیز یا فوراً نوکری', 'ایڈوانس رقم، "رجسٹریشن فیس" یا "کارگو چارجز" مانگنے والے فراڈ ہوتے ہیں۔'], ['"اپنے بیٹے/رشتہ دار کو حادثہ ہو گیا، فوراً رقم بھیجیں"', 'گھبرانے سے پہلے خود اس رشتہ دار کو کال کریں۔'], ['ایپ ڈاؤنلوڈ کرنے یا اسکرین شیئر کرنے کو کہنا (AnyDesk وغیرہ)', 'اس سے آپ کا فون اور بینکنگ دوسرے کے ہاتھ میں چلی جاتی ہے۔ کبھی نہ کریں۔'], ['مختصر لنک یا عجیب نام والی سائٹ پر لاگ اِن', 'بینک/سرکاری سائٹ کا ایڈریس خود ٹائپ کریں، پیغام کا لنک نہ کھولیں۔']];
  var STEPS = ['فوراً اپنے بینک/ایزی پیسہ/جاز کیش کی ہیلپ لائن پر کال کر کے اکاؤنٹ یا کارڈ بلاک کروائیں اور رقم روکنے کی درخواست کریں (جتنی جلدی ممکن ہو، پہلے گھنٹے میں)۔', 'اپنے تمام پاس ورڈ بدلیں، خصوصاً بینکنگ، ای میل اور واٹس ایپ کا ٹو اسٹیپ۔', 'فراڈ کرنے والے کا نمبر، پیغام اور اسکرین شاٹ، ٹرانزیکشن ID اور وقت محفوظ رکھیں۔', 'FIA سائبر کرائم کو رپورٹ کریں (ہیلپ لائن 1991، یا ویب سائٹ پر آن لائن شکایت)۔', 'فراڈ نمبر کی شکایت PTA کو کریں (0800-55055)۔', 'اگر آپ نے کوئی ایپ انسٹال کی یا اسکرین شیئر کی تھی تو اسے ہٹائیں اور فون کی سیکیورٹی اسکین چلائیں۔', 'اپنے CNIC پر چلنے والی SIMs چیک کریں (668)۔'];
  var HELP = [['FIA سائبر کرائم', '1991', 'tel:1991'], ['PTA ہیلپ لائن', '0800-55055', 'tel:0800-55055'], ['JazzCash', '4444', 'tel:4444'], ['Easypaisa', '3737', 'tel:3737']];
  function linkCheck(u) {
    u = String(u).trim(); if (!u) return null; var out = [], url; try { url = new URL(/^[a-z]+:\/\//i.test(u) ? u : 'https://' + u); } catch (e) { return [['bad', 'یہ درست لنک نہیں لگتا۔']]; }
    var h = url.hostname.toLowerCase(), parts = h.split('.'), tld = parts[parts.length - 1], root = parts.slice(-2).join('.');
    if (url.protocol !== 'https:') out.push(['warn', 'https نہیں ہے؛ لاگ اِن یا ادائیگی ہرگز نہ کریں۔']);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) out.push(['bad', 'ایڈریس نمبروں میں ہے (IP)۔ اصل کمپنیاں ایسا نہیں کرتیں۔']);
    if (/\.(xyz|top|click|loan|work|gq|tk|ml|cf|buzz|icu|live|online|site|shop|cyou)$/.test(h)) out.push(['warn', 'سائٹ کا اختتام "' + tld + '" ہے جو فراڈ سائٹس میں عام ہے۔']);
    if (/(bit\.ly|tinyurl|t\.co|cutt\.ly|is\.gd|rb\.gy|shorturl|wa\.me\/message)/.test(h)) out.push(['warn', 'مختصر لنک ہے؛ اصل منزل چھپی ہوئی ہے۔']);
    if (parts.length > 4) out.push(['warn', 'ایڈریس میں بہت سے حصے ہیں؛ اصل نام آخر کے دو حصے ہیں: ' + root]);
    if (/(login|verify|secure|update|bank|jazzcash|easypaisa|bisp|nadra|hbl|ubl|mcb|meezan)/.test(h) && !/(\.gov\.pk|hbl\.com|ubl\.com\.pk|mcb\.com\.pk|meezanbank\.com|jazzcash\.com\.pk|easypaisa\.com\.pk|nadra\.gov\.pk)$/.test(h)) out.push(['bad', 'ایڈریس میں بینک/سروس کا نام ہے مگر یہ ان کا اصل ایڈریس نہیں لگتا۔ ہوشیار!']);
    if (/xn--/.test(h)) out.push(['bad', 'ایڈریس میں مصنوعی حروف (punycode) ہیں جو نقل کے لیے استعمال ہوتے ہیں۔']);
    if (!out.length) out.push(['ok', 'کوئی واضح خطرے کی علامت نہیں ملی۔ یہ مکمل ضمانت نہیں؛ بینک یا سرکاری سروس کے لیے ہمیشہ اس کا اصل ایڈریس خود ٹائپ کریں۔']);
    return out;
  }
  function vScam() {
    CL.setTop(T('فراڈ سیفٹی', 'Scam safety'));
    var h = chips([['num', ['نمبر', 'Number']], ['lnk', ['لنک', 'Link']], ['sig', ['فراڈ کی پہچان', 'Scam signs']], ['hlp', ['لٹ گئے تو', 'If scammed']]], SC.tab, 'sct').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"');
    if (SC.tab === 'num') {
      var spam = lget('spam', []);
      h += '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('نمبر لکھیں', 'Enter a number') + '</span><input class="inp" id="sn" inputmode="tel" placeholder="03xx xxxxxxx" style="direction:ltr"><div id="sno" class="note" style="min-height:22px"></div><button class="sbtn p" id="ssv" style="width:100%">⛔ ' + tt('اسپیم لسٹ میں ڈالیں', 'Add to my spam list') + '</button></div>' +
        '<div class="sec">' + tt('میری اسپیم لسٹ', 'MY SPAM LIST') + ' (' + spam.length + ')</div>' + (spam.length ? spam.map(function (s, i) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><div class="t" style="flex:1"><b dir="ltr" style="text-align:start;display:block">' + esc(s.n) + '</b><small class="e" style="display:block">' + esc(netOf(s.n) || '') + ' ' + esc(s.w || '') + '</small></div><button class="sbtn" data-sbk="' + i + '" style="min-height:38px">' + tt('بلاک', 'Block') + '</button><button class="sbtn r" data-sdl="' + i + '" style="min-height:38px;padding:0 10px">✕</button></div></div>'; }).join('') : '<p class="note">' + tt('ابھی خالی ہے۔', 'Empty.') + '</p>') +
        '<div class="sec">' + tt('مفید کوڈ', 'USEFUL CODES') + '</div><div class="card"><div class="row" style="padding:0"><div class="t" style="flex:1"><b>668</b><small class="e" style="display:block">' + tt('آپ کے CNIC پر کتنی SIMs ہیں', 'SIMs registered on your CNIC') + '</small></div><button class="sbtn" id="s668">✉</button></div><div class="row" style="padding:6px 0 0"><div class="t" style="flex:1"><b>9000</b><small class="e" style="display:block">' + tt('اسپیم SMS فارورڈ کریں', 'Forward spam SMS') + '</small></div><button class="sbtn" id="s9000">✉</button></div></div><p class="note">' + tt('نیٹ ورک کا اندازہ نمبر کے شروع کے ہندسوں سے لگتا ہے؛ نمبر دوسرے نیٹ ورک پر منتقل (MNP) ہو چکا ہو تو غلط ہو سکتا ہے۔ ہم کسی نمبر کے مالک کا نام یا پتہ نہیں بتاتے۔', 'The network is a guess from the prefix and may be wrong after number porting. We never show who owns a number.') + '</p>';
    } else if (SC.tab === 'lnk') {
      h += '<div class="card" style="margin-top:8px"><span class="fl" style="margin-top:0">' + tt('مشکوک لنک پیسٹ کریں', 'Paste a suspicious link') + '</span><input class="inp" id="sl" placeholder="https://" style="direction:ltr"><div id="slo" style="margin-top:10px"></div></div><p class="note">' + tt('لنک نہیں کھولا جاتا، صرف اس کے ایڈریس کو دیکھا جاتا ہے۔ یہ ایک سادہ اندازہ ہے، مکمل ضمانت نہیں۔', 'The link is not opened; only its address is examined. This is a simple check, not a guarantee.') + '</p>';
    } else if (SC.tab === 'sig') {
      h += SIGNS.map(function (s) { return '<div class="card" style="margin:8px 0"><b>' + s[0] + '</b><p class="note" style="margin-top:4px">' + s[1] + '</p></div>'; }).join('') + '<div class="warn">' + tt('سنہری اصول: OTP، PIN، پاس ورڈ یا کارڈ کے پیچھے کا نمبر کسی کو، کسی بھی وجہ سے، کبھی نہ بتائیں۔ شک ہو تو کال کاٹ دیں اور خود بینک کے آفیشل نمبر پر کال کریں۔', 'Golden rule: never share an OTP, PIN, password or card CVV. If in doubt, hang up and call the official number yourself.') + '</div>';
    } else {
      h += '<div class="card" style="margin-top:8px"><b>' + tt('لٹ جائیں تو فوراً یہ کریں', 'If you were scammed') + '</b><ol style="margin:8px 18px;line-height:1.9;font-size:14.5px">' + STEPS.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div><div class="sec">' + tt('ہیلپ لائنز', 'HELPLINES') + '</div>' + HELP.map(function (x, i) { return '<div class="card" style="margin:6px 0"><div class="row" style="padding:0"><div class="t" style="flex:1"><b>' + x[0] + '</b></div><button class="sbtn p" data-shl="' + i + '" style="direction:ltr">📞 ' + x[1] + '</button></div></div>'; }).join('') + '<p class="note">' + tt('نمبر وقت کے ساتھ بدل سکتے ہیں؛ بینک کا نمبر ہمیشہ اپنے کارڈ کی پشت سے لیں۔', 'Numbers may change; take your bank number from the back of your card.') + '</p>';
    }
    $('#body').innerHTML = h + CL.footer();
    bind('sct', function (t) { SC.tab = t; vScam(); });
    var sn = $('#sn'); if (sn) {
      sn.oninput = function () { var n = netOf(this.value); $('#sno').innerHTML = n ? '📶 ' + tt('نیٹ ورک (اندازاً): ', 'Network (estimate): ') + '<b>' + n + '</b>' : ''; };
      $('#ssv').onclick = function () { var v = sn.value.trim(); if (v.replace(/\D/g, '').length < 5) { CL.toast('نمبر لکھیں', 'Enter a number'); return; } CL.ask(tt('وجہ (مثلاً BISP فراڈ)', 'Reason (e.g. fake prize)'), '', function (w) { var s = lget('spam', []); s.unshift({ n: v, w: w }); lset('spam', s); vScam(); }); };
      bind('sbk', function (i) { var n = lget('spam', [])[+i].n; CL.toast('فون کی کال سیٹنگ میں بلاک کریں', 'Block it in the phone dialer settings'); ext('tel:' + n.replace(/\s/g, '')); });
      bind('sdl', function (i) { var s = lget('spam', []); s.splice(+i, 1); lset('spam', s); vScam(); });
      $('#s668').onclick = function () { ext('sms:668'); }; $('#s9000').onclick = function () { ext('sms:9000'); };
    }
    var sl = $('#sl'); if (sl) sl.oninput = function () { var r = linkCheck(this.value); $('#slo').innerHTML = r ? r.map(function (x) { var c = { ok: '#22c55e', warn: '#f59e0b', bad: '#f43f5e' }[x[0]], ic = { ok: '✅', warn: '⚠️', bad: '⛔' }[x[0]]; return '<div style="border-inline-start:4px solid ' + c + ';padding:6px 10px;margin:6px 0;background:var(--bg);border-radius:8px;font-size:14px;line-height:1.7">' + ic + ' ' + x[1] + '</div>'; }).join('') : ''; };
    bind('shl', function (i) { ext(HELP[+i][2]); });
  }
  V.scam = vScam;
  if (CL.HINTS) { CL.HINTS.bills = ['pks', 'بل کی کمپنی کی سائٹ اور SIM چیک "پاکستان سروسز" میں ہیں', 'Company sites and SIM checks are in Pakistan services']; CL.HINTS.parcel = ['scam', 'پارسل کے نام پر آنے والے جعلی پیغامات سے بچاؤ: "فراڈ سیفٹی"', 'Fake parcel messages: see Scam safety']; CL.HINTS.scam = ['pks', 'اپنی SIMs چیک کرنے کے لیے "پاکستان سروسز" کھولیں', 'Check your SIMs in Pakistan services']; CL.HINTS.bond = ['mynums', 'دوسرے ریفرنس نمبر "میرے نمبرز" میں رکھیں', 'Keep other reference numbers in My numbers']; }
  if (CL.wrapTools) CL.wrapTools();
};
