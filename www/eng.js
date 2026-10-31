/* Engineering calculator (electrical + mechanical) and everyday tools. Screens only; the maths is in engcore.js */
window.CLifeInit5 = function (CL) {
  'use strict';
  var E = window.EngCore, V = CL.views, $ = CL.$, tt = CL.tt, T = CL.T, esc = CL.esc, U = CL.u, PREF = CL.PREF;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset, nav = U.nav, TO = U.TO;
  function num(x) { var n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? null : n; }
  function fmt(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return '–';
    var a = Math.abs(n); if (a !== 0 && (a >= 1e9 || a < 1e-4)) return n.toExponential(3);
    var s = Number(n.toPrecision(d || 6)).toLocaleString('en', { maximumFractionDigits: 6 }); return s;
  }
  function row(l, v) { return '<div class="kv"><span>' + l + '</span><b>' + v + '</b></div>'; }
  function big(l, v, sub) { return '<div class="mut">' + l + '</div><div class="big2" style="color:var(--acc)">' + v + '</div>' + (sub ? '<div class="mut" style="direction:ltr;text-align:start;font-family:system-ui,sans-serif;font-size:12.5px;margin-bottom:6px">' + sub + '</div>' : ''); }
  function field(id, label, val, unitLbl) { return '<span class="fl">' + label + (unitLbl ? ' <bdi dir="ltr">(' + unitLbl + ')</bdi>' : '') + '</span><input class="inp ef" id="' + id + '" type="number" inputmode="decimal" step="any" value="' + (val === undefined || val === null ? '' : val) + '" style="direction:ltr;text-align:start">'; }
  function v(id) { var e = $('#' + id); return e ? num(e.value) : null; }
  function memo(k, d) { return lget('eng.' + k, d); }
  function note(ur, en) { return '<p class="note">' + tt(ur, en) + '</p>'; }
  var WARN = '<p class="note" style="color:var(--warn,#f59e0b)">⚠ ' + tt('یہ اندازہ ہے۔ اصل ڈیزائن یا حفاظت کے کام میں code اور standard سے ملائیں۔', 'This is an estimate. For real design or safety work, check against the code and standards.') + '</p>';
  function shareBtn() { return '<div class="two" style="margin-top:8px"><button class="sbtn" id="ecp">' + tt('کاپی', 'Copy') + '</button><button class="sbtn" id="esh">' + tt('شیئر', 'Share') + '</button></div>'; }
  function wireShare(textFn) {
    var c = $('#ecp'), s = $('#esh'); if (!c) return;
    c.onclick = function () { CL.copy ? CL.copy(textFn()) : (navigator.clipboard && navigator.clipboard.writeText(textFn())); CL.toast('کاپی ہو گیا', 'Copied'); };
    s.onclick = function () { try { if (navigator.share) navigator.share({ text: textFn() }); else c.onclick(); } catch (e) { c.onclick(); } };
  }
  function resText(title) { var o = $('#eout'); return title + '\n' + (o ? o.innerText.replace(/\n+/g, '\n') : '') + '\n— Cleanova Life'; }
  function out(html) { var o = $('#eout'); if (o) o.innerHTML = html; }

  var ES = { tab: 'calc', el: 'ohm', me: 'beam', deg: true, expr: '', cat: 'pressure', from: 'bar', to: 'psi', mat: 'steel' };
  var TOP = [['calc', ['کیلکولیٹر', 'Calculator']], ['conv', ['کنورٹر', 'Convert']], ['el', ['⚡ الیکٹریکل', '⚡ Electrical']], ['me', ['⚙ مکینیکل', '⚙ Mechanical']]];
  function top() { return chips(TOP, ES.tab, 'et').replace('class="chips"', 'class="chips" style="margin-top:8px"'); }

  /* ================= SCIENTIFIC CALCULATOR ================= */
  function pageCalc() {
    var keys = [['DEG', 'o', 'deg'], ['sin(', 'o'], ['cos(', 'o'], ['tan(', 'o'], ['π', 'o'], ['log(', 'o'], ['ln(', 'o'], ['^', 'o'], ['√(', 'o'], ['!', 'o'],
      ['(', ''], [')', ''], ['asin(', 'o'], ['acos(', 'o'], ['atan(', 'o'], ['7', ''], ['8', ''], ['9', ''], ['÷', 'o'], ['⌫', 'c', 'bs'],
      ['4', ''], ['5', ''], ['6', ''], ['×', 'o'], ['C', 'c', 'clr'], ['1', ''], ['2', ''], ['3', ''], ['−', 'o'], ['Ans', ''], ['0', ''], ['.', ''], ['%', 'o'], ['+', 'o'], ['=', 'e', 'eq']];
    var hist = memo('hist', []);
    var h = '<div class="card"><div class="ecd" id="ecd"><small id="ecp2"></small><b id="ecr">0</b></div><div class="eck">' + keys.map(function (k) {
      var lbl = k[2] === 'deg' ? (ES.deg ? 'DEG' : 'RAD') : (k[0].length > 1 ? k[0].replace('(', '') : k[0]);
      return '<button class="ek ' + k[1] + '" data-k="' + esc(k[0]) + '" data-a="' + (k[2] || '') + '">' + lbl + '</button>';
    }).join('') + '</div></div>' +
      '<div class="card"><div class="row" style="padding:0"><div class="t"><b>' + tt('پرانے حساب', 'History') + '</b></div><button class="sbtn" id="ehc" style="min-height:34px">' + tt('صاف', 'Clear') + '</button></div><div id="ehl">' + hist.slice(0, 8).map(function (x) { return '<button class="eh" data-h="' + esc(x[0]) + '"><bdi dir="ltr">' + esc(x[0]) + ' = <b>' + esc(x[1]) + '</b></bdi></button>'; }).join('') + (hist.length ? '' : '<p class="note">' + tt('ابھی کچھ نہیں', 'Nothing yet') + '</p>') + '</div></div>';
    $('#ebody').innerHTML = h;
    var disp = function () {
      $('#ecp2').textContent = ES.expr || ' ';
      var r = ''; try { var val = E.calc(ES.expr, ES.deg); r = isFinite(val) ? String(Number(val.toPrecision(12))) : ''; } catch (e) { r = ''; }
      $('#ecr').textContent = ES.expr ? (r || '…') : '0'; ES.live = r;
    };
    disp();
    [].forEach.call(document.querySelectorAll('.ek'), function (b) {
      b.onclick = function () {
        var a = b.dataset.a, k = b.dataset.k;
        if (a === 'deg') { ES.deg = !ES.deg; b.textContent = ES.deg ? 'DEG' : 'RAD'; disp(); return; }
        if (a === 'clr') ES.expr = ''; else if (a === 'bs') ES.expr = ES.expr.replace(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|log\(|ln\(|√\(|Ans|.)$/, '');
        else if (a === 'eq') {
          try { var val = E.calc(ES.expr, ES.deg); if (!isFinite(val)) throw 0; var s = String(Number(val.toPrecision(12))); var hh = memo('hist', []); hh.unshift([ES.expr, s]); lset('eng.hist', hh.slice(0, 30)); window.__ans = val; E.__ans = val; ES.expr = s; pageCalc(); return; } catch (e) { CL.toast('حساب درست نہیں', 'Invalid expression'); return; }
        } else if (k === 'Ans') ES.expr += 'ans'; else ES.expr += k;
        disp();
      };
    });
    [].forEach.call(document.querySelectorAll('.eh'), function (b) { b.onclick = function () { ES.expr = b.dataset.h; pageCalc(); }; });
    $('#ehc').onclick = function () { lset('eng.hist', []); pageCalc(); };
  }

  /* ================= CONVERTER ================= */
  var CATS = [['length', ['لمبائی', 'Length']], ['area', ['رقبہ', 'Area']], ['volume', ['حجم', 'Volume']], ['mass', ['وزن', 'Mass']], ['force', ['فورس', 'Force']], ['pressure', ['پریشر', 'Pressure']], ['energy', ['توانائی', 'Energy']], ['power', ['پاور', 'Power']], ['torque', ['ٹارک', 'Torque']], ['speed', ['رفتار', 'Speed']], ['flow', ['بہاؤ', 'Flow']], ['temp', ['حرارت', 'Temp']], ['time', ['وقت', 'Time']], ['data', ['ڈیٹا', 'Data']]];
  function units(cat) { return cat === 'temp' ? ['°C', '°F', 'K'] : Object.keys(E.U[cat]); }
  function pageConv() {
    var us = units(ES.cat); if (us.indexOf(ES.from) < 0) { ES.from = us[0]; ES.to = us[1] || us[0]; } if (us.indexOf(ES.to) < 0) ES.to = us[1] || us[0];
    var opt = function (sel) { return us.map(function (u) { return '<option' + (u === sel ? ' selected' : '') + '>' + u + '</option>'; }).join(''); };
    $('#ebody').innerHTML = '<div class="chips" style="margin-top:8px;flex-wrap:wrap">' + CATS.map(function (c) { return '<button class="chip' + (ES.cat === c[0] ? ' on' : '') + '" data-cc="' + c[0] + '">' + L(c[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="card"><input class="inp" id="cva" type="number" inputmode="decimal" step="any" value="' + (ES.cv === undefined ? 1 : ES.cv) + '" style="margin-top:0;direction:ltr;text-align:start"><div class="two"><select class="inp" id="cf">' + opt(ES.from) + '</select><select class="inp" id="ct">' + opt(ES.to) + '</select></div><button class="sbtn" id="csw" style="width:100%;margin-top:8px">⇅ ' + tt('الٹ دیں', 'Swap') + '</button><div class="lhero" style="margin-top:10px"><div class="big2" id="cout" style="color:var(--acc)"></div></div></div>' +
      '<div class="card" id="call"></div>';
    var go = function () {
      var a = num($('#cva').value) || 0; ES.cv = a; ES.from = $('#cf').value; ES.to = $('#ct').value;
      $('#cout').textContent = fmt(E.conv(ES.cat, a, ES.from, ES.to), 8) + ' ' + ES.to;
      $('#call').innerHTML = us.filter(function (u) { return u !== ES.from; }).map(function (u) { return '<div class="kv"><span dir="ltr">' + u + '</span><b>' + fmt(E.conv(ES.cat, a, ES.from, u), 7) + '</b></div>'; }).join('');
    };
    $('#cva').oninput = go; $('#cf').onchange = go; $('#ct').onchange = go;
    $('#csw').onclick = function () { var t = ES.from; ES.from = ES.to; ES.to = t; pageConv(); };
    bind('cc', function (c) { ES.cat = c; ES.from = ''; pageConv(); });
    go();
  }

  /* ================= ELECTRICAL ================= */
  var ELT = [['ohm', ['Ohm', 'Ohm']], ['tp', ['3-Phase', '3-Phase']], ['wire', ['تار', 'Wire']], ['bill', ['بل', 'Bill']], ['rc', ['Resistor', 'Resistor']], ['sp', ['Series/Par', 'Series/Par']], ['bat', ['بیٹری', 'Battery']], ['tf', ['Transformer', 'Transformer']]];
  function pageEl() {
    var h = chips(ELT, ES.el, 'ee').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"') + '<div class="card" id="eform"></div><div class="lhero" id="eout"></div>';
    $('#ebody').innerHTML = h; bind('ee', function (k) { ES.el = k; pageEl(); });
    var f = $('#eform'), calcFn;
    if (ES.el === 'ohm') {
      f.innerHTML = '<p class="note" style="margin-top:0">' + tt('کوئی بھی دو خانے بھریں، باقی خود نکلیں گے۔', 'Fill any two boxes; the rest are worked out.') + '</p>' + field('oV', 'Voltage', '', 'V') + field('oI', 'Current', '', 'A') + field('oR', 'Resistance', '', 'Ω') + field('oP', 'Power', '', 'W') + '<button class="sbtn" id="oclr" style="width:100%;margin-top:8px">' + tt('صاف', 'Clear') + '</button>';
      calcFn = function () {
        var r = E.ohm({ V: v('oV'), I: v('oI'), R: v('oR'), P: v('oP') });
        if (!r) return out('<p class="note">' + tt('دو قدریں لکھیں', 'Enter two values') + '</p>');
        out(big('Power', fmt(r.P) + ' W', 'P = V × I = I²R = V²/R') + row('Voltage', fmt(r.V) + ' V') + row('Current', fmt(r.I) + ' A') + row('Resistance', fmt(r.R) + ' Ω') + row('kW', fmt(r.P / 1000)) + shareBtn()); wireShare(function () { return resText('Ohm / Power'); });
      };
      setTimeout(function () { var c = $('#oclr'); if (c) c.onclick = function () { ['oV', 'oI', 'oR', 'oP'].forEach(function (i) { $('#' + i).value = ''; }); calcFn(); }; }, 0);
    } else if (ES.el === 'tp') {
      f.innerHTML = field('tV', 'Line voltage', 415, 'V') + field('tI', 'Line current', 12, 'A') + field('tF', 'Power factor (cos φ)', 0.85, '0–1');
      calcFn = function () {
        var V_ = v('tV'), I = v('tI'), pf = v('tF'); if (!V_ || !I || !pf || pf > 1) return out('<p class="note">…</p>');
        var r = E.threePhase(V_, I, pf);
        out(big('Real power', fmt(r.P / 1000) + ' kW', 'P = √3 · V · I · cos φ') + row('Apparent (kVA)', fmt(r.S / 1000)) + row('Reactive (kVAR)', fmt(r.Q / 1000)) + row('Motor ≈ HP', fmt(r.hp)) + row('Phase voltage', fmt(V_ / Math.sqrt(3)) + ' V') + shareBtn() + WARN); wireShare(function () { return resText('3-Phase'); });
      };
    } else if (ES.el === 'wire') {
      f.innerHTML = field('wI', 'Load current', 25, 'A') + field('wL', 'One-way length', 40, 'm') + field('wV', 'Supply voltage', 220, 'V') + field('wD', 'Max voltage drop', 3, '%') + '<span class="fl">' + tt('فیز', 'Phase') + '</span>' + chips([['1', ['سنگل', 'Single']], ['3', ['3-فیز', '3-phase']]], String(ES.ph || 1), 'wp');
      calcFn = function () {
        var I = v('wI'), Lm = v('wL'), V_ = v('wV'), D = v('wD'); if (!I || !Lm || !V_ || !D) return out('<p class="note">…</p>');
        var r = E.wire(I, Lm, V_, ES.ph || 1, D);
        if (r.none) return out('<p class="note">' + tt('95 mm² سے بڑی تار چاہیے، انجینئر سے پوچھیں۔', 'Needs more than 95 mm². Ask an engineer.') + '</p>');
        out(big(tt('تجویز کردہ تار (تانبا)', 'Suggested copper cable'), r.size + ' mm²', 'min by drop: ' + fmt(r.amin, 3) + ' mm²') + row('Voltage drop', fmt(r.drop) + ' V (' + fmt(r.dropPct, 3) + '%)') + row('Cable rating (approx.)', r.amp + ' A') + row('MCB', r.mcb ? r.mcb + ' A' : '–') + shareBtn() + WARN); wireShare(function () { return resText('Wire size'); });
      };
      setTimeout(function () { bind('wp', function (p) { ES.ph = +p; pageEl(); }); }, 0);
    } else if (ES.el === 'bill') {
      pageBill(f, calcFn = function () { }); return;
    } else if (ES.el === 'rc') {
      var cols = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver'], hex = { black: '#111', brown: '#7c4a21', red: '#ef4444', orange: '#f97316', yellow: '#facc15', green: '#22c55e', blue: '#3b82f6', violet: '#a855f7', grey: '#9ca3af', white: '#f3f4f6', gold: '#d4a017', silver: '#c0c0c0' };
      var nb = ES.nb || 4, bands = ES.bands && ES.bands.length === nb ? ES.bands : (nb === 4 ? ['yellow', 'violet', 'red', 'gold'] : ['brown', 'black', 'black', 'red', 'brown']); ES.bands = bands;
      var names = nb === 4 ? ['Digit 1', 'Digit 2', 'Multiplier', 'Tolerance'] : ['Digit 1', 'Digit 2', 'Digit 3', 'Multiplier', 'Tolerance'];
      f.innerHTML = chips([['4', ['4 بینڈ', '4 band']], ['5', ['5 بینڈ', '5 band']]], String(nb), 'rn') + '<div class="rcb">' + bands.map(function (b) { return '<i style="background:' + hex[b] + '"></i>'; }).join('') + '</div>' + bands.map(function (b, i) { return '<span class="fl">' + names[i] + '</span><select class="inp rsel" data-i="' + i + '">' + cols.map(function (c) { return '<option' + (c === b ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>'; }).join('');
      calcFn = function () {
        var r = E.resistor(ES.bands);
        if (!r || r.tol === null || r.tol === undefined) return out('<p class="note">' + tt('اس رنگ کا مجموعہ درست نہیں', 'That colour combination is not valid') + '</p>');
        var o = r.ohm, s = o >= 1e6 ? fmt(o / 1e6) + ' MΩ' : o >= 1e3 ? fmt(o / 1e3) + ' kΩ' : fmt(o) + ' Ω';
        out(big('Value', s + ' ±' + r.tol + '%', ES.bands.join(' · ')) + row('Ohms', fmt(o)) + row('Range', fmt(o * (1 - r.tol / 100)) + ' – ' + fmt(o * (1 + r.tol / 100)) + ' Ω'));
      };
      setTimeout(function () { bind('rn', function (n) { ES.nb = +n; ES.bands = null; pageEl(); }); [].forEach.call(document.querySelectorAll('.rsel'), function (s) { s.onchange = function () { ES.bands[+s.dataset.i] = s.value; pageEl(); }; }); }, 0);
    } else if (ES.el === 'sp') {
      f.innerHTML = '<span class="fl">' + tt('قدریں (کوما سے الگ): Ω، µF یا H', 'Values separated by commas (Ω, µF, H)') + '</span><input class="inp ef" id="sv" value="' + esc(ES.sv || '100, 220, 470') + '" style="direction:ltr;text-align:start"><span class="fl">' + tt('قسم', 'Type') + '</span>' + chips([['r', ['Resistor / Inductor', 'Resistor / Inductor']], ['c', ['Capacitor', 'Capacitor']]], ES.spk || 'r', 'sk');
      calcFn = function () {
        ES.sv = $('#sv').value; var a = ES.sv.split(/[,\s]+/).map(num).filter(function (x) { return x !== null && x > 0; }); if (a.length < 2) return out('<p class="note">' + tt('کم از کم دو قدریں', 'At least two values') + '</p>');
        var s = E.ser(a), p = E.par(a), cap = ES.spk === 'c';
        out(big(cap ? 'Parallel (total C)' : 'Series (total)', fmt(cap ? s : s), cap ? 'C = C1 + C2 + …' : 'R = R1 + R2 + …') + row(cap ? 'Series (total C)' : 'Parallel (total)', fmt(p)) + '<p class="note">' + (cap ? tt('کیپیسیٹر میں پیرالل جمع ہوتا ہے اور سیریز الٹ۔', 'Capacitors add in parallel and combine inversely in series.') : '1/R = 1/R1 + 1/R2 + …') + '</p>');
      };
      setTimeout(function () { bind('sk', function (k) { ES.spk = k; pageEl(); }); }, 0);
    } else if (ES.el === 'bat') {
      f.innerHTML = field('bA', 'Battery capacity', 100, 'Ah') + field('bV', 'Battery voltage', 12, 'V') + field('bW', 'Load', 200, 'W') + field('bD', 'Usable depth of discharge', 50, '%') + field('bE', 'Inverter efficiency', 90, '%');
      calcFn = function () {
        var Ah = v('bA'), Vb = v('bV'), W = v('bW'), D = v('bD'), Ef = v('bE'); if (!Ah || !Vb || !W || !D || !Ef) return out('<p class="note">…</p>');
        var r = E.battery(Ah, Vb, W, D / 100, Ef / 100);
        out(big(tt('بیک اپ وقت', 'Backup time'), fmt(r.hours, 4) + ' h', fmt(r.hours * 60, 4) + ' min') + row(tt('قابل استعمال توانائی', 'Usable energy'), fmt(r.wh) + ' Wh') + shareBtn() + '<p class="note">' + tt('لیڈ ایسڈ بیٹری کو 50% سے زیادہ خالی نہ کریں۔', 'Do not discharge a lead-acid battery below 50%.') + '</p>'); wireShare(function () { return resText('Battery backup'); });
      };
    } else {
      f.innerHTML = field('xP', 'Primary voltage', 11000, 'V') + field('xS', 'Secondary voltage', 415, 'V') + field('xK', 'Rating', 100, 'kVA');
      calcFn = function () {
        var P1 = v('xP'), S1 = v('xS'), K = v('xK'); if (!P1 || !S1 || !K) return out('<p class="note">…</p>');
        out(big('Turns ratio', fmt(P1 / S1) + ' : 1', 'a = V1 / V2') + row('Primary current (1φ)', fmt(K * 1000 / P1) + ' A') + row('Secondary current (1φ)', fmt(K * 1000 / S1) + ' A') + row('3φ primary (A)', fmt(K * 1000 / (Math.sqrt(3) * P1))) + row('3φ secondary (A)', fmt(K * 1000 / (Math.sqrt(3) * S1))) + WARN);
      };
    }
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = calcFn; }); calcFn();
  }

  /* electricity bill: list of appliances */
  function pageBill(f, _) {
    var rate = memo('rate', 48), list = memo('bill', [{ n: 'AC 1.5 ton', w: 1400, h: 8, q: 1 }, { n: 'Fan', w: 75, h: 12, q: 3 }, { n: 'Fridge', w: 150, h: 10, q: 1 }]);
    f.innerHTML = field('bR', tt('فی یونٹ ریٹ', 'Rate per unit'), rate, 'Rs') + '<div id="bl"></div><div class="card" style="margin:10px 0 0"><b>' + tt('نیا آلہ', 'Add appliance') + '</b><div class="two"><div><span class="fl">' + tt('نام', 'Name') + '</span><input class="inp" id="bn" style="margin-top:0"></div><div>' + field('bw', 'Watts', '', 'W') + '</div></div><div class="two"><div>' + field('bh', 'Hours/day', '', 'h') + '</div><div>' + field('bq', 'Quantity', 1, '') + '</div></div><button class="btn" id="bad" style="margin-top:10px">＋ ' + tt('شامل کریں', 'Add') + '</button></div>';
    var go = function () {
      var r = v('bR') || 0; lset('eng.rate', r); var tot = 0, kwh = 0;
      $('#bl').innerHTML = '<div style="margin-top:8px">' + list.map(function (a, i) { var u = a.w * a.h * a.q * 30 / 1000; kwh += u; tot += u * r; return '<div class="kv"><span>' + esc(a.n) + ' <small class="mut" dir="ltr">' + a.w + 'W × ' + a.h + 'h × ' + a.q + '</small></span><b>' + fmt(u, 4) + ' u · Rs ' + Math.round(u * r).toLocaleString('en') + ' <button class="sbtn" data-bx="' + i + '" style="min-height:28px;padding:0 8px">✕</button></b></div>'; }).join('') + '</div>';
      out(big(tt('مہینے کا بل (اندازہ)', 'Monthly bill (estimate)'), 'Rs ' + Math.round(tot).toLocaleString('en'), fmt(kwh, 5) + ' units · 30 days') + shareBtn() + '<p class="note">' + tt('اس میں ٹیکس اور slab کا فرق شامل نہیں۔ اپنے بل سے ریٹ ڈالیں۔', 'Taxes and slab rates are not included. Use the rate from your bill.') + '</p>'); wireShare(function () { return resText('Electricity bill'); });
      bind('bx', function (i) { list.splice(+i, 1); lset('eng.bill', list); go(); });
    };
    $('#bR').oninput = go;
    $('#bad').onclick = function () { var n = $('#bn').value.trim(), w = v('bw'), h = v('bh'), q = v('bq') || 1; if (!n || !w || !h) { CL.toast('نام، واٹ اور گھنٹے لکھیں', 'Enter name, watts and hours'); return; } list.push({ n: n, w: w, h: h, q: q }); lset('eng.bill', list); pageEl(); };
    go();
  }

  /* ================= MECHANICAL ================= */
  var MET = [['beam', ['Beam', 'Beam']], ['sec', ['سیکشن', 'Section']], ['stress', ['Stress', 'Stress']], ['gear', ['Gear/Belt', 'Gear/Belt']], ['tq', ['Torque', 'Torque']], ['fluid', ['Fluid', 'Fluid']], ['heat', ['حرارت', 'Heat']]];
  function matChips() { return '<span class="fl">' + tt('مواد', 'Material') + '</span>' + chips(Object.keys(E.MAT).map(function (k) { return [k, E.MAT[k].n]; }), ES.mat, 'mm'); }
  function pageMe() {
    $('#ebody').innerHTML = chips(MET, ES.me, 'me').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"') + '<div class="card" id="eform"></div><div class="lhero" id="eout"></div>';
    bind('me', function (k) { ES.me = k; pageMe(); });
    var f = $('#eform'), calcFn, M = E.MAT[ES.mat];
    var afterMat = function () { bind('mm', function (m) { ES.mat = m; pageMe(); }); };
    if (ES.me === 'beam') {
      var bt = ES.bt || 'ss-point', udl = bt === 'ss-udl';
      f.innerHTML = chips([['ss-point', ['سادہ، بیچ میں لوڈ', 'Simply supported, centre load']], ['ss-udl', ['سادہ، پھیلا لوڈ', 'Simply supported, UDL']], ['cant', ['Cantilever، سرے پر لوڈ', 'Cantilever, end load']]], bt, 'bt') + field('mW', udl ? 'Load (UDL)' : 'Load', 5, udl ? 'kN/m' : 'kN') + field('mL', 'Span', 4, 'm') + matChips() + field('mE', 'E (Young\'s modulus)', M.E, 'GPa') + field('mI', 'I (second moment of area)', 8000, 'cm⁴') + field('mC', tt('انتہائی فائبر تک فاصلہ c', 'Distance to extreme fibre, c'), 100, 'mm');
      calcFn = function () {
        var W = v('mW'), Lm = v('mL'), Ev = v('mE'), I = v('mI'), c = v('mC'); if (!W || !Lm || !Ev || !I) return out('<p class="note">…</p>');
        var r = E.beam(bt, W, Lm, Ev, I, c || 0), fos = c ? M.sy / r.sigma : null;
        out(big('Max bending moment', fmt(r.M) + ' kN·m', bt === 'ss-point' ? 'M = W·L/4' : bt === 'ss-udl' ? 'M = w·L²/8' : 'M = W·L') + row('Reaction R', fmt(r.R) + ' kN' + (bt === 'cant' ? '' : ' (each)')) + row('Max deflection', fmt(r.defl) + ' mm') + row('Span / deflection', fmt(Lm * 1000 / r.defl, 4)) + (c ? row('Bending stress σ = M·c/I', fmt(r.sigma) + ' MPa') + row('Factor of safety (' + M.sy + ' MPa yield)', '<span style="color:' + (fos >= 1.5 ? 'var(--ok,#34d399)' : '#f43f5e') + '">' + fmt(fos, 3) + (fos >= 1.5 ? ' ✓' : ' ✗') + '</span>') : '') + shareBtn() + WARN); wireShare(function () { return resText('Beam'); });
      };
      setTimeout(function () { bind('bt', function (t) { ES.bt = t; pageMe(); }); afterMat(); }, 0);
    } else if (ES.me === 'sec') {
      var sk = ES.sk || 'rect';
      f.innerHTML = chips([['rect', ['مستطیل', 'Rectangle']], ['circle', ['گول راڈ', 'Round bar']], ['tube', ['ٹیوب', 'Tube']]], sk, 'sk2') + field('sA', sk === 'rect' ? 'Width b' : 'Outer diameter D', 50, 'mm') + (sk === 'rect' ? field('sB', 'Height h', 100, 'mm') : '') + (sk === 'tube' ? field('sT', 'Wall thickness t', 3, 'mm') : '');
      calcFn = function () {
        var a = v('sA'), b = v('sB'), t = v('sT'); if (!a || (sk === 'rect' && !b) || (sk === 'tube' && !t) || (sk === 'tube' && 2 * t >= a)) return out('<p class="note">…</p>');
        var r = E.section(sk, a, b, t), kg = r.A * 1e-6 * 7850;
        out(big('Area', fmt(r.A) + ' mm²', fmt(r.A / 100) + ' cm²') + row('I (about x)', fmt(r.I / 1e4) + ' cm⁴') + row('Section modulus Z', fmt(r.Z / 1e3) + ' cm³') + row('c', fmt(r.c) + ' mm') + row('Steel weight per metre', fmt(kg) + ' kg/m') + shareBtn()); wireShare(function () { return resText('Section'); });
      };
      setTimeout(function () { bind('sk2', function (k) { ES.sk = k; pageMe(); }); }, 0);
    } else if (ES.me === 'stress') {
      f.innerHTML = field('tF', 'Axial force', 50, 'kN') + field('tA', 'Area', 400, 'mm²') + field('tL', 'Length', 1, 'm') + matChips() + field('tE', 'E', M.E, 'GPa') + field('tY', 'Yield strength', M.sy, 'MPa');
      calcFn = function () {
        var F = v('tF'), A = v('tA'), Lm = v('tL'), Ev = v('tE'), sy = v('tY'); if (!F || !A || !Ev) return out('<p class="note">…</p>');
        var r = E.stress(F, A, Ev, Lm || 0, sy || 0);
        out(big('Stress σ = F/A', fmt(r.sigma) + ' MPa') + row('Strain ε = σ/E', fmt(r.strain)) + row('Elongation ΔL', fmt(r.dL) + ' mm') + (sy ? row('Factor of safety', '<span style="color:' + (r.fos >= 1.5 ? 'var(--ok,#34d399)' : '#f43f5e') + '">' + fmt(r.fos, 3) + (r.fos >= 1.5 ? ' ✓' : ' ✗') + '</span>') : '') + shareBtn() + WARN); wireShare(function () { return resText('Stress'); });
      };
      setTimeout(afterMat, 0);
    } else if (ES.me === 'gear') {
      f.innerHTML = '<b>' + tt('گیئر', 'Gears') + '</b>' + field('gA', 'Driver teeth', 20) + field('gB', 'Driven teeth', 60) + field('gR', 'Input speed', 1440, 'RPM') + field('gT', 'Input torque', 10, 'N·m') + '<b style="display:block;margin-top:14px">' + tt('پولی / بیلٹ', 'Pulley / belt') + '</b>' + field('pA', 'Small pulley D1', 100, 'mm') + field('pB', 'Large pulley D2', 200, 'mm') + field('pC', 'Centre distance', 500, 'mm');
      calcFn = function () {
        var a = v('gA'), b = v('gB'), n = v('gR'), t = v('gT'), d1 = v('pA'), d2 = v('pB'), c = v('pC'); if (!a || !b) return out('<p class="note">…</p>');
        var r = E.gear(a, b, n || 0, t || 0), h = big('Ratio', fmt(r.ratio, 4) + ' : 1', 'i = N2 / N1') + row('Output speed', fmt(r.rpm) + ' RPM') + row('Output torque (η = 100%)', fmt(r.torque) + ' N·m');
        if (d1 && d2 && c) h += row('Belt length', fmt(E.beltLen(d1, d2, c)) + ' mm') + row('Speed ratio (pulleys)', fmt(d2 / d1, 4) + ' : 1');
        out(h + shareBtn()); wireShare(function () { return resText('Gear'); });
      };
    } else if (ES.me === 'tq') {
      f.innerHTML = field('qP', 'Power', 5.5, 'kW') + field('qN', 'Speed', 1440, 'RPM') + field('qS', tt('جائز shear stress', 'Allowable shear stress'), 40, 'MPa');
      calcFn = function () {
        var P = v('qP'), N = v('qN'), s = v('qS'); if (!P || !N) return out('<p class="note">…</p>');
        var T_ = E.torque(P, N), h = big('Torque', fmt(T_) + ' N·m', 'T = 9550 · P / n') + row('HP', fmt(P / 0.7457)) + row('kgf·m', fmt(T_ / 9.80665));
        if (s) h += row('Solid shaft diameter', fmt(E.shaftD(T_, s)) + ' mm') + row('Next standard size', Math.ceil(E.shaftD(T_, s) / 2.5) * 2.5 + ' mm');
        out(h + shareBtn() + WARN); wireShare(function () { return resText('Torque'); });
      };
    } else if (ES.me === 'fluid') {
      f.innerHTML = '<p class="note" style="margin-top:0">' + tt('پانی (20°C) اور گول پائپ۔', 'Water at 20 °C in a round pipe.') + '</p>' + field('fQ', 'Flow', 5, 'L/s') + field('fD', 'Inside diameter', 75, 'mm') + field('fL', 'Pipe length', 60, 'm') + field('fR', 'Roughness', 0.045, 'mm (steel)') + field('fH', 'Static lift', 0, 'm') + field('fE', 'Pump efficiency', 60, '%');
      calcFn = function () {
        var Q = v('fQ'), D = v('fD'), Lm = v('fL'), R = v('fR'), H = v('fH') || 0, ef = v('fE'); if (!Q || !D || !Lm || !ef) return out('<p class="note">…</p>');
        var r = E.pipe(Q, D, Lm, R || 0.045, H, ef / 100);
        out(big('Velocity', fmt(r.v) + ' m/s', 'v = Q / A') + row('Reynolds number', fmt(r.Re, 5) + (r.Re > 4000 ? ' (turbulent)' : r.Re < 2300 ? ' (laminar)' : ' (transition)')) + row('Friction factor f', fmt(r.f, 4)) + row('Head loss', fmt(r.hf) + ' m') + row('Pressure drop', fmt(r.dp) + ' bar') + row('Total head', fmt(r.H) + ' m') + row('Pump shaft power', fmt(r.kw) + ' kW (' + fmt(r.kw / 0.7457) + ' HP)') + (r.v > 3 ? '<p class="note" style="color:#f59e0b">' + tt('رفتار 3 m/s سے زیادہ ہے، پائپ بڑا لیں۔', 'Velocity is over 3 m/s; consider a larger pipe.') + '</p>' : '') + shareBtn() + WARN); wireShare(function () { return resText('Pipe flow'); });
      };
    } else {
      f.innerHTML = '<b>' + tt('حرارت Q = m·c·ΔT', 'Heat  Q = m·c·ΔT') + '</b>' + field('hM', 'Mass', 10, 'kg') + field('hC', 'Specific heat', 4186, 'J/kg·K (water)') + field('hT', 'Temperature change', 40, 'K') + '<b style="display:block;margin-top:14px">' + tt('Conduction Q = k·A·ΔT / L', 'Conduction  Q = k·A·ΔT / L') + '</b>' + field('kK', 'k', 50, 'W/m·K (steel)') + field('kA', 'Area', 0.5, 'm²') + field('kT', 'ΔT', 80, 'K') + field('kL', 'Thickness', 0.02, 'm');
      calcFn = function () {
        var m = v('hM'), c = v('hC'), dT = v('hT'), k = v('kK'), A = v('kA'), dt = v('kT'), Lm = v('kL'); var h = '';
        if (m && c && dT) { var q = E.heat(m, c, dT); h += big('Heat', fmt(q / 1000) + ' kJ', fmt(q / 3.6e6, 4) + ' kWh') + row('BTU', fmt(q / 1055.056)); }
        if (k && A && dt && Lm) h += row('Conduction rate', fmt(E.conduction(k, A, dt, Lm)) + ' W');
        out(h || '<p class="note">…</p>');
      };
    }
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = calcFn; }); calcFn();
  }

  /* ================= ENGINEERING PAGE ================= */
  function vEng() {
    CL.setTop(T('انجینئرنگ', 'Engineering'));
    $('#body').innerHTML = top() + '<div id="ebody"></div>' + CL.footer();
    bind('et', function (k) { ES.tab = k; vEng(); });
    ({ calc: pageCalc, conv: pageConv, el: pageEl, me: pageMe })[ES.tab]();
  }
  V.eng = vEng;

  /* ================= EVERYDAY TOOLS ================= */
  function simple(key, titleUr, titleEn, build) {
    V[key] = function () { CL.setTop(T(titleUr, titleEn)); $('#body').innerHTML = '<div class="card" id="sform" style="margin-top:8px"></div><div class="lhero" id="eout"></div>' + CL.footer(); build($('#sform')); };
  }
  simple('bmi', 'BMI', 'BMI', function (f) {
    f.innerHTML = field('iK', 'Weight', 70, 'kg') + field('iC', 'Height', 170, 'cm');
    var go = function () {
      var k = v('iK'), c = v('iC'); if (!k || !c) return out('');
      var b = E.bmi(k, c), cat = b < 18.5 ? ['کم وزن', 'Underweight'] : b < 25 ? ['نارمل', 'Normal'] : b < 30 ? ['زیادہ وزن', 'Overweight'] : ['موٹاپا', 'Obese'], lo = 18.5 * Math.pow(c / 100, 2), hi = 24.9 * Math.pow(c / 100, 2);
      out(big('BMI', fmt(b, 3), L(cat)) + row(tt('صحت مند وزن کی حد', 'Healthy weight range'), fmt(lo, 3) + ' – ' + fmt(hi, 3) + ' kg') + '<p class="note">' + tt('BMI صرف ایک موٹا اندازہ ہے، ڈاکٹر کی رائے کا متبادل نہیں۔', 'BMI is only a rough guide and no substitute for medical advice.') + '</p>');
    };
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = go; }); go();
  });
  simple('split', 'بل بانٹیں', 'Split the bill', function (f) {
    f.innerHTML = field('sT', 'Total bill', 4500, 'Rs') + field('sN', 'People', 4) + field('sP', 'Tip / service', 5, '%');
    var go = function () {
      var t = v('sT'), n = Math.max(1, Math.round(v('sN') || 1)), p = v('sP') || 0; if (!t) return out('');
      var all = t * (1 + p / 100);
      out(big(tt('فی شخص', 'Each person'), 'Rs ' + Math.ceil(all / n).toLocaleString('en'), tt('کل', 'Total') + ' Rs ' + Math.round(all).toLocaleString('en')) + row('Tip', 'Rs ' + Math.round(t * p / 100).toLocaleString('en')));
    };
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = go; }); go();
  });
  simple('pct', 'فیصد / ڈسکاؤنٹ', 'Percent / discount', function (f) {
    f.innerHTML = field('pX', 'Price / value', 5000, '') + field('pY', 'Percent', 20, '%') + field('pZ', tt('نئی قدر (فیصد فرق کے لیے)', 'New value (for % change)'), 6200, '');
    var go = function () {
      var x = v('pX'), y = v('pY'), z = v('pZ'); var h = '';
      if (x !== null && y !== null) h += big(tt('ڈسکاؤنٹ کے بعد', 'After discount'), fmt(x * (1 - y / 100)), tt('رعایت', 'Saved') + ' ' + fmt(x * y / 100)) + row(y + '% of ' + fmt(x), fmt(x * y / 100)) + row(tt('ٹیکس/اضافہ کے ساتھ', 'With % added'), fmt(x * (1 + y / 100)));
      if (x && z !== null) h += row(tt('فیصد فرق', '% change'), fmt((z - x) / x * 100, 5) + '%');
      out(h);
    };
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = go; }); go();
  });
  simple('age', 'عمر / دن', 'Age / days', function (f) {
    var today = new Date().toISOString().slice(0, 10);
    f.innerHTML = '<span class="fl">' + tt('پہلی تاریخ (پیدائش)', 'From (birth date)') + '</span><input class="inp" type="date" id="aA" value="2000-01-01"><span class="fl">' + tt('دوسری تاریخ', 'To') + '</span><input class="inp" type="date" id="aB" value="' + today + '">';
    var go = function () {
      var a = new Date($('#aA').value), b = new Date($('#aB').value); if (isNaN(a) || isNaN(b)) return out('');
      var y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
      if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; }
      var days = Math.round((b - a) / 864e5);
      out(big(tt('فرق', 'Difference'), y + 'y ' + m + 'm ' + d + 'd') + row(tt('کل دن', 'Total days'), days.toLocaleString('en')) + row(tt('ہفتے', 'Weeks'), fmt(days / 7, 5)) + row(tt('مہینے (تقریباً)', 'Months (approx.)'), fmt(days / 30.4375, 5)));
    };
    $('#aA').onchange = $('#aB').onchange = go; go();
  });
  simple('fuel', 'فیول کا خرچ', 'Fuel cost', function (f) {
    f.innerHTML = field('uD', 'Distance', 120, 'km') + field('uM', 'Mileage', 14, 'km/L') + field('uP', 'Fuel price', 270, 'Rs/L');
    var go = function () {
      var d = v('uD'), m = v('uM'), p = v('uP'); if (!d || !m || !p) return out('');
      var l = d / m; out(big(tt('کل خرچ', 'Trip cost'), 'Rs ' + Math.round(l * p).toLocaleString('en'), fmt(l, 4) + ' L') + row(tt('فی کلومیٹر', 'Per km'), 'Rs ' + fmt(l * p / d, 4)) + row(tt('آنے جانے', 'Round trip'), 'Rs ' + Math.round(2 * l * p).toLocaleString('en')));
    };
    [].forEach.call(f.querySelectorAll('input'), function (i) { i.oninput = go; }); go();
  });

  /* qibla: bearing from your location + compass */
  var QS = { lat: null, lon: null, h: null, src: '' };
  V.qibla = function () {
    CL.setTop(T('قبلہ', 'Qibla'));
    $('#body').innerHTML = '<div class="lhero" id="qbox" style="margin-top:8px;text-align:center"><div class="qc" id="qc"><i id="qn"></i><span class="qk">🕋</span></div><div class="big2" id="qd" style="text-align:center;color:var(--acc)">…</div><div class="mut" id="qs"></div></div><p class="note">' + tt('فون کو زمین کے برابر رکھیں اور دھات اور میگنیٹ سے دور۔ اگر سوئی غلط لگے تو فون کو آٹھ (8) کی شکل میں گھمائیں۔ مقام نہ ملے تو ڈگری سے راستہ لے لیں۔', 'Hold the phone flat, away from metal and magnets. If the needle looks wrong, move the phone in a figure of 8. If no location is found, use the bearing in degrees.') + '</p>' + CL.footer();
    function draw() {
      if (QS.lat === null) return;
      var q = E.qibla(QS.lat, QS.lon);
      $('#qd').innerHTML = Math.round(q.bearing) + '° <small style="font-size:14px">' + tt('شمال سے', 'from North') + '</small>';
      $('#qs').textContent = tt('کعبہ تک ', 'Distance to Kaaba ') + Math.round(q.km).toLocaleString('en') + ' km · ' + QS.src;
      var ang = QS.h === null ? q.bearing : q.bearing - QS.h;
      $('#qn').style.transform = 'translate(-50%,-100%) rotate(' + ang + 'deg)';
      $('#qc').classList.toggle('ok', QS.h !== null && Math.abs(((ang + 540) % 360) - 180) < 6);
    }
    function loc(lat, lon, src) { QS.lat = lat; QS.lon = lon; QS.src = src; lset('qloc', [lat, lon]); draw(); }
    var saved = lget('qloc', null);
    if (saved) loc(saved[0], saved[1], tt('محفوظ مقام', 'saved location'));
    try { navigator.geolocation.getCurrentPosition(function (p) { loc(p.coords.latitude, p.coords.longitude, tt('آپ کا مقام', 'your location')); }, function () { if (!saved) loc(31.5204, 74.3587, tt('لاہور (اندازہ)', 'Lahore (default)')); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }); } catch (e) { if (!saved) loc(31.5204, 74.3587, 'Lahore'); }
    var onO = function (ev) {
      var h = null;
      if (ev.webkitCompassHeading !== undefined && ev.webkitCompassHeading !== null) h = ev.webkitCompassHeading;
      else if (ev.alpha !== null && ev.alpha !== undefined) h = (360 - ev.alpha) % 360;
      if (h !== null) { QS.h = h; draw(); }
    };
    var evn = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evn, onO, true);
    var chk = setInterval(function () { if (!$('#qc')) { clearInterval(chk); window.removeEventListener(evn, onO, true); } }, 1000);
  };

  /* register in the "More" grid on Home */
  [['eng', 'انجینئرنگ', 'Engineering', '⚙️', 3], ['bmi', 'BMI', 'BMI', '⚖️', 4], ['split', 'بل بانٹیں', 'Split bill', '🧾', 5], ['pct', 'فیصد', 'Percent', '％', 6], ['age', 'عمر / دن', 'Age / days', '📅', 2], ['fuel', 'فیول خرچ', 'Fuel cost', '⛽', 3], ['qibla', 'قبلہ', 'Qibla', '🧭', 1]].forEach(function (m) {
    TO[m[0]] = 'life'; if (CL.MORE) CL.MORE.push([m[0], m[3], m[4], [m[1], m[2]]]);
  });
};
