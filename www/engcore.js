/* Engineering maths (pure functions, no screen code) so they can be tested on their own. */
(function (root) {
  'use strict';
  var PI = Math.PI;

  /* ---------- expression calculator (no eval) ---------- */
  function fact(n) { if (n < 0 || n !== Math.floor(n) || n > 170) return NaN; var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function calc(src, deg) {
    var s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\s+/g, ''), p = 0;
    var toR = function (x) { return deg ? x * PI / 180 : x; }, fromR = function (x) { return deg ? x * 180 / PI : x; };
    var F = {
      sin: function (x) { return Math.sin(toR(x)); }, cos: function (x) { return Math.cos(toR(x)); }, tan: function (x) { return Math.tan(toR(x)); },
      asin: function (x) { return fromR(Math.asin(x)); }, acos: function (x) { return fromR(Math.acos(x)); }, atan: function (x) { return fromR(Math.atan(x)); },
      log: Math.log10, ln: Math.log, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, fact: fact,
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh
    };
    function err() { throw new Error('x'); }
    function expr() { var v = term(); while (s[p] === '+' || s[p] === '-') { var o = s[p++], r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() {
      var v = unary();
      for (;;) {
        if (s[p] === '*' || s[p] === '/') { var o = s[p++], r = unary(); v = o === '*' ? v * r : v / r; }
        else if (p < s.length && /[0-9.a-z(]/.test(s[p])) { v = v * unary(); }   /* 2(3), 2pi */
        else break;
      }
      return v;
    }
    function power() { var b = post(); if (s[p] === '^') { p++; var e = unary(); return Math.pow(b, e); } return b; }
    function unary() { if (s[p] === '-') { p++; return -unary(); } if (s[p] === '+') { p++; return unary(); } return power(); }
    function post() {
      var v = prim();
      for (;;) { if (s[p] === '!') { p++; v = fact(v); } else if (s[p] === '%') { p++; v = v / 100; } else break; }
      return v;
    }
    function prim() {
      var m;
      if (s[p] === '(') { p++; var v = expr(); if (s[p] !== ')') err(); p++; return v; }
      m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(p));
      if (m) { var t = m[0]; p += t.length; return parseFloat(t); }
      m = /^[a-z]+/.exec(s.slice(p));
      if (m) {
        var id = m[0];
        if (id === 'pi') { p += 2; return PI; }
        if (id === 'e') { p += 1; return Math.E; }
        if (id === 'ans') { p += 3; return root.__ans || 0; }
        if (F[id]) { p += id.length; if (s[p] !== '(') err(); p++; var a = expr(); if (s[p] !== ')') err(); p++; return F[id](a); }
      }
      err();
    }
    if (!s) return NaN;
    var r = expr(); if (p < s.length) err();
    return r;
  }

  /* ---------- unit conversion (everything through an SI base) ---------- */
  var U = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, 'µm': 1e-6, in: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344 },
    area: { 'm²': 1, 'cm²': 1e-4, 'mm²': 1e-6, 'km²': 1e6, 'ft²': 0.09290304, 'in²': 6.4516e-4, acre: 4046.8564224, marla: 25.2929538, kanal: 505.857 },
    volume: { 'm³': 1, L: 1e-3, mL: 1e-6, 'cm³': 1e-6, 'ft³': 0.0283168466, gal: 0.003785411784, 'in³': 1.6387064e-5 },
    mass: { kg: 1, g: 1e-3, mg: 1e-6, tonne: 1000, lb: 0.45359237, oz: 0.028349523, tola: 0.011663804, seer: 0.9331 },
    force: { N: 1, kN: 1000, kgf: 9.80665, lbf: 4.4482216, dyn: 1e-5 },
    pressure: { Pa: 1, kPa: 1000, MPa: 1e6, bar: 1e5, psi: 6894.757293, atm: 101325, mmHg: 133.322, 'kgf/cm²': 98066.5 },
    energy: { J: 1, kJ: 1000, kWh: 3.6e6, cal: 4.184, kcal: 4184, BTU: 1055.056, 'ft·lbf': 1.355818 },
    power: { W: 1, kW: 1000, MW: 1e6, HP: 745.6998716, 'BTU/h': 0.29307107, 'kcal/h': 1.163 },
    torque: { 'N·m': 1, 'kN·m': 1000, 'kgf·m': 9.80665, 'lbf·ft': 1.3558179, 'lbf·in': 0.1129848 },
    speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444, 'ft/s': 0.3048 },
    flow: { 'm³/s': 1, 'L/s': 1e-3, 'L/min': 1 / 60000, 'm³/h': 1 / 3600, gpm: 6.309019640e-5, 'ft³/min': 4.71947443e-4 },
    time: { s: 1, min: 60, h: 3600, day: 86400, ms: 1e-3 },
    data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, bit: 0.125 }
  };
  function conv(cat, v, from, to) {
    if (cat === 'temp') {
      var c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
      return to === '°C' ? c : to === '°F' ? c * 9 / 5 + 32 : c + 273.15;
    }
    return v * U[cat][from] / U[cat][to];
  }

  /* ---------- electrical ---------- */
  function ohm(v) {
    /* v: {V,I,R,P} any two numbers, the rest null */
    var V = v.V, I = v.I, R = v.R, P = v.P, k = [V, I, R, P].filter(function (x) { return x !== null && x !== undefined && !isNaN(x); }).length;
    if (k < 2) return null;
    if (V != null && I != null) { R = V / I; P = V * I; }
    else if (V != null && R != null) { I = V / R; P = V * V / R; }
    else if (V != null && P != null) { I = P / V; R = V * V / P; }
    else if (I != null && R != null) { V = I * R; P = I * I * R; }
    else if (I != null && P != null) { V = P / I; R = P / (I * I); }
    else if (R != null && P != null) { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
    return { V: V, I: I, R: R, P: P };
  }
  function threePhase(Vl, I, pf) { var S = Math.sqrt(3) * Vl * I, P = S * pf, Q = S * Math.sqrt(Math.max(0, 1 - pf * pf)); return { S: S, P: P, Q: Q, hp: P / 745.7 }; }
  var CABLE = [[1.5, 15.5], [2.5, 21], [4, 28], [6, 36], [10, 50], [16, 68], [25, 89], [35, 110], [50, 134], [70, 171], [95, 207]];   /* copper, PVC, in conduit: approximate IEC 60364 method B1 */
  var MCB = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  function wire(I, L, Vs, phases, maxDropPct) {
    var rho = 0.0175, k = phases === 3 ? Math.sqrt(3) : 2, vd = Vs * maxDropPct / 100;
    var amin = k * rho * L * I / vd, mcb = null, pick = null, i;
    for (i = 0; i < MCB.length; i++) if (MCB[i] >= I) { mcb = MCB[i]; break; }
    for (i = 0; i < CABLE.length; i++) if (CABLE[i][0] >= amin && CABLE[i][1] >= Math.max(I, mcb || 0)) { pick = CABLE[i]; break; }
    if (!pick) return { amin: amin, none: true };
    var drop = k * rho * L * I / pick[0];
    return { amin: amin, size: pick[0], amp: pick[1], drop: drop, dropPct: drop / Vs * 100, mcb: mcb };
  }
  var RC = { black: [0, 1, null], brown: [1, 10, 1], red: [2, 100, 2], orange: [3, 1e3, null], yellow: [4, 1e4, null], green: [5, 1e5, 0.5], blue: [6, 1e6, 0.25], violet: [7, 1e7, 0.1], grey: [8, 1e8, 0.05], white: [9, 1e9, null], gold: [null, 0.1, 5], silver: [null, 0.01, 10] };
  function resistor(bands) {
    /* 4 or 5 colour names: digits..., multiplier, tolerance */
    var n = bands.length, d = n === 5 ? [bands[0], bands[1], bands[2]] : [bands[0], bands[1]], m = bands[n - 2], t = bands[n - 1], val = 0;
    for (var i = 0; i < d.length; i++) { var x = RC[d[i]][0]; if (x === null) return null; val = val * 10 + x; }
    val *= RC[m][1];
    return { ohm: val, tol: RC[t][2] };
  }
  function par(a) { var s = 0; a.forEach(function (x) { s += 1 / x; }); return 1 / s; }
  function ser(a) { var s = 0; a.forEach(function (x) { s += x; }); return s; }
  function battery(Ah, V, W, dod, eff) { var wh = Ah * V * dod * eff; return { wh: wh, hours: wh / W }; }

  /* ---------- mechanical ---------- */
  var MAT = { steel: { n: ['اسٹیل', 'Steel'], E: 200, sy: 250, rho: 7850 }, ss: { n: ['اسٹین لیس', 'Stainless'], E: 193, sy: 215, rho: 8000 }, al: { n: ['ایلومینیم', 'Aluminium'], E: 69, sy: 95, rho: 2700 }, cu: { n: ['تانبا', 'Copper'], E: 117, sy: 70, rho: 8960 }, ci: { n: ['کاسٹ آئرن', 'Cast iron'], E: 100, sy: 130, rho: 7200 } };
  function beam(type, W, L, E, I, c) {
    /* W in kN (point) or kN/m (udl); L in m; E in GPa; I in cm4; c in mm. Returns kN, kN.m, mm, MPa */
    var M, R, d;
    var EI = E * 1e9 * I * 1e-8;   /* N.m2 */
    if (type === 'ss-point') { R = W / 2; M = W * L / 4; d = (W * 1e3) * Math.pow(L, 3) / (48 * EI) * 1000; }
    else if (type === 'ss-udl') { R = W * L / 2; M = W * L * L / 8; d = 5 * (W * 1e3) * Math.pow(L, 4) / (384 * EI) * 1000; }
    else { R = W; M = W * L; d = (W * 1e3) * Math.pow(L, 3) / (3 * EI) * 1000; }   /* cantilever, end load */
    var sigma = I > 0 ? M * 1e3 * (c / 1000) / (I * 1e-8) / 1e6 : NaN;   /* MPa */
    return { R: R, M: M, defl: d, sigma: sigma };
  }
  function gear(z1, z2, rpm, T) { var ratio = z2 / z1; return { ratio: ratio, rpm: rpm / ratio, torque: T * ratio }; }
  function beltLen(D1, D2, C) { return 2 * C + PI * (D1 + D2) / 2 + Math.pow(D2 - D1, 2) / (4 * C); }
  function torque(kw, rpm) { return 9550 * kw / rpm; }
  function shaftD(T, tau) { return Math.cbrt(16 * T * 1000 / (PI * tau)); }   /* T in N.m, tau in MPa -> mm */
  function pipe(Q, D, Lp, rough, head, eta) {
    /* Q L/s, D mm, Lp m, rough mm, static head m, eta 0..1 (water 20C) */
    var q = Q / 1000, d = D / 1000, A = PI * d * d / 4, v = q / A, nu = 1.004e-6, Re = v * d / nu, g = 9.81, rho = 998, f;
    if (Re < 2300) f = 64 / Re;
    else f = 0.25 / Math.pow(Math.log10(rough / 1000 / (3.7 * d) + 5.74 / Math.pow(Re, 0.9)), 2);
    var hf = f * (Lp / d) * v * v / (2 * g), dp = rho * g * hf / 1e5;
    var H = hf + head, pw = rho * g * q * H / (eta || 1) / 1000;
    return { v: v, Re: Re, f: f, hf: hf, dp: dp, kw: pw, H: H };
  }
  function stress(F, A, E, Lm, sy) { var s = F * 1000 / A; return { sigma: s, strain: s / (E * 1000), dL: s / (E * 1000) * Lm * 1000, fos: sy / s }; }
  function section(kind, a, b, t) {
    /* mm -> A mm2, I mm4 (about x), Z mm3 */
    var A, I, c;
    if (kind === 'rect') { A = a * b; I = a * Math.pow(b, 3) / 12; c = b / 2; }
    else if (kind === 'circle') { A = PI * a * a / 4; I = PI * Math.pow(a, 4) / 64; c = a / 2; }
    else { var d = a - 2 * t; A = PI * (a * a - d * d) / 4; I = PI * (Math.pow(a, 4) - Math.pow(d, 4)) / 64; c = a / 2; }
    return { A: A, I: I, Z: I / c, c: c };
  }
  function heat(m, c, dT) { return m * c * dT; }
  function conduction(k, A, dT, L) { return k * A * dT / L; }

  /* ---------- daily ---------- */
  function emi(P, r, n) { r = r / 1200; return r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n; }
  function bmi(kg, cm) { return kg / Math.pow(cm / 100, 2); }
  function qibla(lat, lon) {
    var p = PI / 180, la1 = lat * p, la2 = 21.4225 * p, dl = (39.8262 - lon) * p;
    var y = Math.sin(dl) * Math.cos(la2), x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dl);
    var b = Math.atan2(y, x) / p; b = (b + 360) % 360;
    var d = 2 * 6371 * Math.asin(Math.sqrt(Math.pow(Math.sin((la2 - la1) / 2), 2) + Math.cos(la1) * Math.cos(la2) * Math.pow(Math.sin(dl / 2), 2)));
    return { bearing: b, km: d };
  }

  root.EngCore = { calc: calc, U: U, conv: conv, ohm: ohm, threePhase: threePhase, wire: wire, CABLE: CABLE, MCB: MCB, RC: RC, resistor: resistor, par: par, ser: ser, battery: battery, MAT: MAT, beam: beam, gear: gear, beltLen: beltLen, torque: torque, shaftD: shaftD, pipe: pipe, stress: stress, section: section, heat: heat, conduction: conduction, emi: emi, bmi: bmi, qibla: qibla };
})(typeof window !== 'undefined' ? window : globalThis);
