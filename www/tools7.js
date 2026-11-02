/* Cleanova Life: Photo Studio. Filters, beauty, face stickers, background blur/replace, stickers, text, frames, crop,
   collage and live camera. Everything runs on the phone (face and person detection use on-device models). */
window.CLifeInit12 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var chips = U.chips, bind = U.bind;
  var SP = function () { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Studio; };
  CL.regTool('studio', '🎨', 5, ['فوٹو اسٹوڈیو', 'Photo Studio'], 'files', ['فلٹر، بیوٹی، چہرے کے اسٹیکر، بیک گراؤنڈ، کولاج اور لائیو کیمرہ', 'Filters, beauty, face stickers, background, collage and live camera'], 'فوٹو اسٹوڈیو تصویر کیمرہ فلٹر سیلفی اسٹیکر کولاج بیک گراؤنڈ بیوٹی چہرہ snapchat photo editor camera filter selfie sticker collage beauty background blur lens', true);

  /* ================= data ================= */
  var FILTERS = [['orig', '', 'اصل', 'Original'], ['vivid', 'saturate(1.5) contrast(1.1)', 'شوخ', 'Vivid'], ['warm', 'sepia(.25) saturate(1.3) hue-rotate(-10deg) brightness(1.05)', 'گرم', 'Warm'], ['cool', 'hue-rotate(15deg) saturate(1.1) brightness(1.02)', 'ٹھنڈا', 'Cool'], ['vintage', 'sepia(.45) contrast(.95) brightness(1.05) saturate(.9)', 'ونٹیج', 'Vintage'], ['bw', 'grayscale(1) contrast(1.1)', 'بلیک اینڈ وائٹ', 'B&W'], ['noir', 'grayscale(1) contrast(1.5) brightness(.9)', 'نوار', 'Noir'], ['fade', 'contrast(.85) brightness(1.1) saturate(.8)', 'ہلکا', 'Fade'], ['cinema', 'contrast(1.2) saturate(1.1) hue-rotate(-8deg) brightness(.95)', 'سنیما', 'Cinema'], ['sunset', 'sepia(.3) saturate(1.6) hue-rotate(-20deg)', 'غروب', 'Sunset'], ['pastel', 'saturate(.7) brightness(1.15) contrast(.9)', 'پیسٹل', 'Pastel'], ['drama', 'contrast(1.4) saturate(1.2) brightness(.9)', 'ڈرامہ', 'Drama'], ['golden', 'sepia(.5) saturate(1.4) brightness(1.1)', 'سنہری', 'Golden'], ['retro', 'sepia(.8) contrast(1.1)', 'ریٹرو', 'Retro'], ['mint', 'hue-rotate(70deg) saturate(.9) brightness(1.08)', 'پودینہ', 'Mint'], ['rose', 'hue-rotate(-30deg) saturate(1.2) brightness(1.08) sepia(.15)', 'گلابی', 'Rose']];
  var FACEFX = [['shades', '😎', 'دھوپ کا چشمہ', 'Shades'], ['glasses', '👓', 'چشمہ', 'Glasses'], ['crown', '👑', 'تاج', 'Crown'], ['party', '🥳', 'ٹوپی', 'Party hat'], ['cat', '🐱', 'بلی کے کان', 'Cat ears'], ['bunny', '🐰', 'خرگوش', 'Bunny'], ['devil', '😈', 'سینگ', 'Horns'], ['halo', '😇', 'ہالہ', 'Halo'], ['flower', '🌸', 'پھولوں کا تاج', 'Flowers'], ['mustache', '🥸', 'مونچھیں', 'Mustache'], ['nose', '🤡', 'جوکر ناک', 'Clown nose'], ['blush', '😊', 'گلابی گال', 'Blush'], ['hearts', '😍', 'دل والی آنکھیں', 'Heart eyes']];
  var EMOJI = '😀 😍 😎 🥳 😂 😇 🤩 😘 🥰 😜 ❤️ 💖 ✨ ⭐ 🌟 🔥 🎉 🎈 🎂 🌹 🌸 🌈 ☀️ 🌙 ⚡ 💎 👑 🎀 🕌 ☪️ 🤲 🕋 🇵🇰 🦋 🐱 🐶 🍕 ☕ 🎁 💯 👍 🙏 🏆 🎵 🚗 ✈️ 🏠'.split(' ');
  var PRESETS = ['عید مبارک', 'جمعہ مبارک', 'ماشاء اللہ', 'سبحان اللہ', 'شادی مبارک', 'Happy Birthday', 'Congratulations', 'I ❤️ Pakistan'];
  var FONTS = [['sans', 'system-ui,"Noto Naskh Arabic",sans-serif', 'سادہ', 'Plain'], ['urdu', '"Noto Nastaliq Urdu","Noto Naskh Arabic",serif', 'نستعلیق', 'Nastaliq'], ['serif', 'Georgia,"Noto Naskh Arabic",serif', 'سیرف', 'Serif'], ['mono', '"Courier New",monospace', 'ٹائپ', 'Mono']];
  var COLORS = ['#ffffff', '#111827', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#ec4899'];
  var FRAMES = [['none', 'بغیر', 'None'], ['white', 'سفید', 'White'], ['black', 'کالا', 'Black'], ['polaroid', 'پولرائیڈ', 'Polaroid'], ['round', 'گول کنارے', 'Rounded'], ['gold', 'سنہری', 'Gold'], ['film', 'فلم', 'Film'], ['hearts', 'دل', 'Hearts']];
  var ARS = [['orig', 'اصل', 'Original', 0], ['1:1', '1:1', '1:1', 1], ['4:5', '4:5', '4:5', 0.8], ['3:4', '3:4', '3:4', 0.75], ['9:16', 'اسٹیٹس 9:16', 'Status 9:16', 9 / 16], ['16:9', '16:9', '16:9', 16 / 9]];

  /* ================= state ================= */
  function defaults() { return { filter: 'orig', fa: 100, bright: 0, contrast: 0, sat: 0, vig: 0, smooth: 0, glow: 0, face: {}, bg: { mode: 'none', blur: 14, c1: '#0ea5a4', c2: '#6366f1', img: null }, frame: 'none', ar: 'orig', zoom: 1, px: 0.5, py: 0.5 }; }
  var ST = { mode: 'home', base: null, W0: 0, H0: 0, faces: [], mask: null, maskState: '', objs: [], sel: null, tab: 'filter', P: defaults(), nid: 1, facing: 'user', cam: null, col: null };
  function sheet(h) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = h; return m; }
  function closeSheet() { $('#modal').hidden = true; }
  function pickFiles(accept, multi) { return new Promise(function (res) { var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multi; i.style.display = 'none'; document.body.appendChild(i); i.onchange = function () { var f = [].slice.call(i.files || []); i.remove(); res(f); }; i.click(); }); }
  function loadImg(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = u; }); }
  function fitCanvas(src, sw, sh, max) { var k = Math.min(1, max / Math.max(sw, sh)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ================= detection ================= */
  function b64(canvas, q) { return canvas.toDataURL('image/jpeg', q || 0.7); }
  function normFace(f) {
    var o = { x: f.x, y: f.y, w: f.w, h: f.h, roll: f.roll || 0 }, a = f.le, b = f.re;
    if (!a || !b) { a = { x: f.x + f.w * 0.3, y: f.y + f.h * 0.4 }; b = { x: f.x + f.w * 0.7, y: f.y + f.h * 0.4 }; }
    if (a.x > b.x) { var t = a; a = b; b = t; }
    o.e1 = a; o.e2 = b; o.nose = f.nose || null; o.lc = f.lc || null; o.rc = f.rc || null; o.mb = f.mb || null;
    return o;
  }
  function detect(canvas) {
    var p = SP(); ST.faces = [];
    if (!p) return Promise.resolve();
    var small = fitCanvas(canvas, canvas.width, canvas.height, 640);
    return p.faces({ data: b64(small, 0.7) }).then(function (r) { ST.faces = (r.faces || []).map(normFace); }).catch(function () { ST.faces = []; });
  }
  function getMask() {
    if (ST.mask || ST.maskState === 'busy') return Promise.resolve();
    var p = SP(); if (!p) { ST.maskState = 'none'; return Promise.resolve(); }
    ST.maskState = 'busy';
    var small = fitCanvas(ST.base, ST.W0, ST.H0, 512);
    return p.segment({ data: b64(small, 0.8) }).then(function (r) { return new Promise(function (res) { var im = new Image(); im.onload = function () { ST.mask = im; ST.maskState = 'ok'; res(); }; im.onerror = function () { ST.maskState = 'fail'; res(); }; im.src = r.mask; }); }).catch(function () { ST.maskState = 'fail'; });
  }

  /* ================= rendering ================= */
  function cropRect() {
    var P = ST.P, W = ST.W0, H = ST.H0, a = ARS.filter(function (x) { return x[0] === P.ar; })[0], r = a && a[3] ? a[3] : W / H, cw, ch;
    if (W / H > r) { ch = H; cw = H * r; } else { cw = W; ch = W / r; }
    cw /= P.zoom; ch /= P.zoom;
    return { x: (W - cw) * P.px, y: (H - ch) * P.py, w: cw, h: ch };
  }
  function filterCss() {
    var P = ST.P, f = FILTERS.filter(function (x) { return x[0] === P.filter; })[0], s = f ? f[1] : '';
    var adj = 'brightness(' + (1 + P.bright / 100) + ') contrast(' + (1 + P.contrast / 100) + ') saturate(' + (1 + P.sat / 100) + ')';
    return { base: s, adj: adj };
  }
  function faceOut(f, cr, w, h) {
    var k = w / cr.w, W = ST.W0, H = ST.H0;
    var pt = function (p) { return p ? { x: (p.x * W - cr.x) * k, y: (p.y * H - cr.y) * k } : null; };
    return { box: { x: (f.x * W - cr.x) * k, y: (f.y * H - cr.y) * k, w: f.w * W * k, h: f.h * H * k }, e1: pt(f.e1), e2: pt(f.e2), nose: pt(f.nose), lc: pt(f.lc), rc: pt(f.rc), mb: pt(f.mb) };
  }
  function render(cv, outW, opt) {
    opt = opt || {};
    var P = ST.P, cr = cropRect(), outH = Math.round(outW * cr.h / cr.w), ctx;
    cv.width = outW; cv.height = outH; ctx = cv.getContext('2d');
    var tmp = mk(outW, outH), t = tmp.getContext('2d');
    var bg = P.bg;
    if (bg.mode !== 'none' && ST.mask) {
      /* background first */
      if (bg.mode === 'blur') { t.filter = 'blur(' + Math.round(bg.blur * outW / 360) + 'px)'; t.drawImage(ST.base, cr.x, cr.y, cr.w, cr.h, -outW * 0.05, -outH * 0.05, outW * 1.1, outH * 1.1); t.filter = 'none'; }
      else if (bg.mode === 'color') { var g = t.createLinearGradient(0, 0, outW, outH); g.addColorStop(0, bg.c1); g.addColorStop(1, bg.c2 || bg.c1); t.fillStyle = g; t.fillRect(0, 0, outW, outH); }
      else if (bg.mode === 'image' && bg.img) { var s = Math.max(outW / bg.img.width, outH / bg.img.height); t.drawImage(bg.img, (outW - bg.img.width * s) / 2, (outH - bg.img.height * s) / 2, bg.img.width * s, bg.img.height * s); }
      var pc = mk(outW, outH), pg = pc.getContext('2d'), mw = ST.mask.width, mh = ST.mask.height;
      pg.drawImage(ST.base, cr.x, cr.y, cr.w, cr.h, 0, 0, outW, outH);
      pg.globalCompositeOperation = 'destination-in'; pg.filter = 'blur(' + Math.max(1, Math.round(outW / 400)) + 'px)';
      pg.drawImage(ST.mask, cr.x / ST.W0 * mw, cr.y / ST.H0 * mh, cr.w / ST.W0 * mw, cr.h / ST.H0 * mh, 0, 0, outW, outH);
      t.drawImage(pc, 0, 0);
    } else t.drawImage(ST.base, cr.x, cr.y, cr.w, cr.h, 0, 0, outW, outH);
    var faces = ST.faces.map(function (f) { return faceOut(f, cr, outW, outH); });
    /* beauty: smooth skin around faces */
    if (P.smooth > 0) {
      var bl = mk(outW, outH), b = bl.getContext('2d'); b.filter = 'blur(' + Math.max(2, Math.round(outW / 120)) + 'px)'; b.drawImage(tmp, 0, 0); b.filter = 'none';
      var mskc = mk(outW, outH), m = mskc.getContext('2d');
      if (faces.length) faces.forEach(function (f) { var cx = f.box.x + f.box.w / 2, cy = f.box.y + f.box.h / 2, rx = f.box.w * 0.7, ry = f.box.h * 0.8, g = m.createRadialGradient(cx, cy, 0, cx, cy, 1); m.save(); m.translate(cx, cy); m.scale(rx, ry); var gg = m.createRadialGradient(0, 0, 0, 0, 0, 1); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.6, 'rgba(255,255,255,.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); m.fillStyle = gg; m.fillRect(-1, -1, 2, 2); m.restore(); });
      else { m.fillStyle = 'rgba(255,255,255,.6)'; m.fillRect(0, 0, outW, outH); }
      b.globalCompositeOperation = 'destination-in'; b.drawImage(mskc, 0, 0);
      t.globalAlpha = Math.min(1, P.smooth / 100); t.drawImage(bl, 0, 0); t.globalAlpha = 1;
    }
    if (P.glow > 0) { var gl = mk(outW, outH), gc = gl.getContext('2d'); gc.filter = 'blur(' + Math.round(outW / 60) + 'px) brightness(1.25)'; gc.drawImage(tmp, 0, 0); t.globalCompositeOperation = 'screen'; t.globalAlpha = P.glow / 220; t.drawImage(gl, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'source-over'; }
    /* filter + adjustments */
    var fc = filterCss();
    ctx.filter = fc.adj; ctx.drawImage(tmp, 0, 0);
    if (fc.base && P.fa > 0) { ctx.globalAlpha = P.fa / 100; ctx.filter = fc.base + ' ' + fc.adj; ctx.drawImage(tmp, 0, 0); ctx.globalAlpha = 1; }
    ctx.filter = 'none';
    if (P.vig > 0) { var vg = ctx.createRadialGradient(outW / 2, outH / 2, Math.min(outW, outH) * 0.3, outW / 2, outH / 2, Math.max(outW, outH) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (P.vig / 100 * 0.85) + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, outW, outH); }
    faces.forEach(function (f) { drawFaceFx(ctx, f, P.face); });
    drawFrame(ctx, outW, outH, P.frame);
    ST.objs.forEach(function (o) { drawObj(ctx, o, outW, outH, !opt.export && o.id === ST.sel); });
    return cv;
  }

  /* ---------- face effects (drawn from landmarks, so they follow the face) ---------- */
  function tri(c, a, b, d, fill) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fillStyle = fill; c.fill(); }
  function drawFaceFx(c, f, on) {
    var e1 = f.e1, e2 = f.e2; if (!e1 || !e2) return;
    var d = Math.hypot(e2.x - e1.x, e2.y - e1.y); if (d < 4) return;
    var th = Math.atan2(e2.y - e1.y, e2.x - e1.x), E = { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 }, cs = Math.cos(th), sn = Math.sin(th);
    var loc = function (p) { var dx = p.x - E.x, dy = p.y - E.y; return { x: dx * cs + dy * sn, y: -dx * sn + dy * cs }; };
    var em = function (ch, x, y, s) { c.font = Math.round(s) + 'px "Noto Color Emoji","Apple Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, x, y); };
    c.save(); c.translate(E.x, E.y); c.rotate(th); c.lineJoin = 'round'; c.lineCap = 'round';
    if (on.crown) em('👑', 0, -1.75 * d, 1.7 * d);
    if (on.party) { c.save(); var g = c.createLinearGradient(-0.7 * d, 0, 0.7 * d, 0); g.addColorStop(0, '#f43f5e'); g.addColorStop(0.5, '#facc15'); g.addColorStop(1, '#22d3ee'); tri(c, [-0.75 * d, -1.0 * d], [0, -2.55 * d], [0.75 * d, -1.0 * d], g); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.07 * d; c.beginPath(); c.moveTo(-0.5 * d, -1.5 * d); c.lineTo(0.5 * d, -1.5 * d); c.moveTo(-0.3 * d, -2.0 * d); c.lineTo(0.3 * d, -2.0 * d); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -2.58 * d, 0.16 * d, 0, 7); c.fill(); c.restore(); }
    if (on.cat) { [-1, 1].forEach(function (s) { tri(c, [s * 1.15 * d, -0.95 * d], [s * 0.85 * d, -2.0 * d], [s * 0.1 * d, -1.05 * d], '#f4a261'); tri(c, [s * 0.95 * d, -1.1 * d], [s * 0.82 * d, -1.7 * d], [s * 0.35 * d, -1.15 * d], '#fbcfe8'); }); }
    if (on.bunny) { [-1, 1].forEach(function (s) { c.save(); c.translate(s * 0.55 * d, -1.95 * d); c.rotate(s * 0.14); c.fillStyle = '#f3f4f6'; c.beginPath(); c.ellipse(0, 0, 0.3 * d, 0.95 * d, 0, 0, 7); c.fill(); c.fillStyle = '#fbcfe8'; c.beginPath(); c.ellipse(0, 0.05 * d, 0.15 * d, 0.7 * d, 0, 0, 7); c.fill(); c.restore(); }); }
    if (on.devil) { [-1, 1].forEach(function (s) { c.fillStyle = '#dc2626'; c.beginPath(); c.moveTo(s * 0.45 * d, -1.0 * d); c.quadraticCurveTo(s * 0.95 * d, -1.1 * d, s * 0.85 * d, -1.85 * d); c.quadraticCurveTo(s * 0.5 * d, -1.35 * d, s * 0.25 * d, -1.0 * d); c.closePath(); c.fill(); }); }
    if (on.halo) { c.strokeStyle = '#facc15'; c.lineWidth = 0.14 * d; c.shadowColor = 'rgba(250,204,21,.9)'; c.shadowBlur = 0.3 * d; c.beginPath(); c.ellipse(0, -1.9 * d, 0.85 * d, 0.2 * d, 0, 0, 7); c.stroke(); c.shadowBlur = 0; }
    if (on.flower) { var fl = ['🌸', '🌼', '🌺', '🌷', '🌸', '🌼', '🌺']; for (var i = 0; i < 7; i++) { var a = Math.PI * (1.12 + i * 0.12); em(fl[i], Math.cos(a) * 1.3 * d, Math.sin(a) * 1.0 * d - 0.5 * d, 0.62 * d); } }
    if (on.shades || on.glasses) {
      var sh = !!on.shades;
      [-0.5, 0.5].forEach(function (x) { c.beginPath(); if (sh) c.ellipse(x * d, 0.04 * d, 0.46 * d, 0.34 * d, 0, 0, 7); else c.arc(x * d, 0, 0.4 * d, 0, 7); c.fillStyle = sh ? 'rgba(10,10,16,.93)' : 'rgba(190,225,255,.2)'; c.fill(); c.strokeStyle = sh ? '#0b0b10' : '#1f2937'; c.lineWidth = (sh ? 0.07 : 0.06) * d; c.stroke(); if (sh) { c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse((x - 0.14) * d, -0.1 * d, 0.14 * d, 0.07 * d, -0.4, 0, 7); c.fill(); } });
      c.strokeStyle = sh ? '#0b0b10' : '#1f2937'; c.lineWidth = 0.07 * d; c.beginPath(); c.moveTo(-0.1 * d, 0); c.lineTo(0.1 * d, 0); c.moveTo(-0.95 * d, -0.02 * d); c.lineTo(-1.3 * d, 0.05 * d); c.moveTo(0.95 * d, -0.02 * d); c.lineTo(1.3 * d, 0.05 * d); c.stroke();
    }
    if (on.hearts) { em('❤️', -0.5 * d, 0, 0.8 * d); em('❤️', 0.5 * d, 0, 0.8 * d); }
    if (on.blush) { var cl = f.lc ? loc(f.lc) : { x: -1.0 * d, y: 0.95 * d }, cr2 = f.rc ? loc(f.rc) : { x: 1.0 * d, y: 0.95 * d }; [cl, cr2].forEach(function (p) { var g2 = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 0.4 * d); g2.addColorStop(0, 'rgba(255,80,110,.5)'); g2.addColorStop(1, 'rgba(255,80,110,0)'); c.fillStyle = g2; c.beginPath(); c.ellipse(p.x, p.y, 0.4 * d, 0.26 * d, 0, 0, 7); c.fill(); }); }
    var nl = f.nose ? loc(f.nose) : { x: 0, y: 0.95 * d };
    if (on.mustache) { c.save(); c.translate(nl.x, nl.y + 0.2 * d); c.fillStyle = '#2b1b10'; c.beginPath(); c.moveTo(0, -0.04 * d); c.bezierCurveTo(0.2 * d, -0.22 * d, 0.62 * d, -0.2 * d, 0.85 * d, 0.1 * d); c.bezierCurveTo(0.55 * d, 0.06 * d, 0.3 * d, 0.14 * d, 0, 0.1 * d); c.bezierCurveTo(-0.3 * d, 0.14 * d, -0.55 * d, 0.06 * d, -0.85 * d, 0.1 * d); c.bezierCurveTo(-0.62 * d, -0.2 * d, -0.2 * d, -0.22 * d, 0, -0.04 * d); c.fill(); c.restore(); }
    if (on.nose) { c.fillStyle = '#ef4444'; c.beginPath(); c.arc(nl.x, nl.y - 0.04 * d, 0.27 * d, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(nl.x - 0.08 * d, nl.y - 0.12 * d, 0.07 * d, 0, 7); c.fill(); }
    c.restore();
  }

  /* ---------- frames ---------- */
  function drawFrame(c, w, h, id) {
    if (id === 'none') return;
    var s = Math.min(w, h), b = s * 0.04;
    c.save();
    if (id === 'white' || id === 'black') { c.strokeStyle = id === 'white' ? '#fff' : '#000'; c.lineWidth = b * 2; c.strokeRect(0, 0, w, h); }
    else if (id === 'polaroid') { c.fillStyle = '#fff'; c.fillRect(0, 0, w, b * 1.2); c.fillRect(0, 0, b * 1.2, h); c.fillRect(w - b * 1.2, 0, b * 1.2, h); c.fillRect(0, h - b * 4.2, w, b * 4.2); }
    else if (id === 'round') { c.globalCompositeOperation = 'destination-in'; c.fillStyle = '#000'; c.beginPath(); if (c.roundRect) c.roundRect(0, 0, w, h, s * 0.08); else c.rect(0, 0, w, h); c.fill(); }
    else if (id === 'gold') { var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#b45309'); g.addColorStop(1, '#fcd34d'); c.strokeStyle = g; c.lineWidth = b * 1.6; c.strokeRect(b * 0.8, b * 0.8, w - b * 1.6, h - b * 1.6); c.lineWidth = b * 0.35; c.strokeRect(b * 2.2, b * 2.2, w - b * 4.4, h - b * 4.4); }
    else if (id === 'film') { c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, b * 1.8, h); c.fillRect(w - b * 1.8, 0, b * 1.8, h); c.fillStyle = '#e5e7eb'; var n = Math.floor(h / (b * 1.6)); for (var i = 0; i < n; i++) { c.fillRect(b * 0.55, i * b * 1.6 + b * 0.4, b * 0.7, b * 0.8); c.fillRect(w - b * 1.25, i * b * 1.6 + b * 0.4, b * 0.7, b * 0.8); } }
    else if (id === 'hearts') { c.font = Math.round(b * 1.6) + 'px "Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; var st = b * 2, k; for (k = st / 2; k < w; k += st) { c.fillText('❤️', k, b * 0.9); c.fillText('❤️', k, h - b * 0.9); } for (k = st * 1.5; k < h - st; k += st) { c.fillText('❤️', b * 0.9, k); c.fillText('❤️', w - b * 0.9, k); } }
    c.restore();
  }

  /* ---------- stickers and text ---------- */
  function drawObj(c, o, W, H, selected) {
    c.save(); c.translate(o.x * W, o.y * H); c.rotate(o.rot || 0);
    var px = o.size * W; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.type === 'emoji') { c.font = Math.round(px) + 'px "Noto Color Emoji","Apple Color Emoji",sans-serif'; c.fillText(o.txt, 0, 0); }
    else {
      var fo = FONTS.filter(function (f) { return f[0] === o.font; })[0] || FONTS[0];
      c.font = (o.bold ? '700 ' : '500 ') + Math.round(px) + 'px ' + fo[1]; c.fillStyle = o.color; c.lineJoin = 'round';
      if (o.outline) { c.lineWidth = Math.max(2, px * 0.14); c.strokeStyle = o.color === '#111827' || o.color === '#000000' ? '#ffffff' : '#111827'; c.strokeText(o.txt, 0, 0); } else { c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = px * 0.12; }
      c.fillText(o.txt, 0, 0);
    }
    if (selected) { var m = c.measureText(o.txt), w2 = Math.max(m.width, px) / 2 + 8, h2 = px * 0.62 + 6; c.shadowBlur = 0; c.setLineDash([8, 6]); c.lineWidth = 2; c.strokeStyle = '#2dd4bf'; c.strokeRect(-w2, -h2, w2 * 2, h2 * 2); }
    c.restore();
  }
  function objBox(o, W, H) { var c = document.createElement('canvas').getContext('2d'), px = o.size * W; if (o.type === 'emoji') return { w: px, h: px }; var fo = FONTS.filter(function (f) { return f[0] === o.font; })[0] || FONTS[0]; c.font = (o.bold ? '700 ' : '500 ') + px + 'px ' + fo[1]; return { w: Math.max(c.measureText(o.txt).width, px), h: px * 0.9 }; }
  function hit(x, y, W, H) {
    for (var i = ST.objs.length - 1; i >= 0; i--) { var o = ST.objs[i], b = objBox(o, W, H), dx = x - o.x * W, dy = y - o.y * H, cs = Math.cos(-(o.rot || 0)), sn = Math.sin(-(o.rot || 0)), lx = dx * cs - dy * sn, ly = dx * sn + dy * cs; if (Math.abs(lx) <= b.w / 2 + 10 && Math.abs(ly) <= b.h / 2 + 10) return o; }
    return null;
  }
  /* part B (screens) follows */

  /* ================= screens ================= */
  var raf = 0;
  function redraw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; var cv = $('#stc'); if (cv && ST.base) render(cv, previewW()); }); }
  function previewW() { var g = $('#stg'); return Math.min(900, Math.round(((g && g.clientWidth) || 360) * Math.min(2, window.devicePixelRatio || 1))); }
  function loadBase(src, w, h) {
    ST.base = fitCanvas(src, w, h, 1600); ST.W0 = ST.base.width; ST.H0 = ST.base.height; ST.mask = null; ST.maskState = ''; ST.thumbs = null; ST.objs = []; ST.sel = null;
    return detect(ST.base);
  }
  function vStudio() {
    CL.setTop(T('فوٹو اسٹوڈیو', 'Photo Studio'));
    if (ST.mode === 'cam' && S.view === 'studio') return screenCam();
    if (ST.mode === 'edit' && ST.base) return screenEdit();
    if (ST.mode === 'collage') return screenCollage();
    ST.mode = 'home'; stopCam(); screenHome();
  }
  function screenHome() {
    $('#body').innerHTML = '<div class="card" style="margin-top:8px;text-align:center"><div style="font-size:42px">🎨</div><b style="font-size:18px">' + tt('فوٹو اسٹوڈیو', 'Photo Studio') + '</b><p class="note">' + tt('فلٹر، بیوٹی، چہرے پر اسٹیکر، بیک گراؤنڈ بدلنا، ٹیکسٹ، فریم اور کولاج۔ سب کچھ آپ کے فون پر ہوتا ہے؛ تصویر کہیں اپلوڈ نہیں ہوتی۔', 'Filters, beauty, face stickers, background, text, frames and collage. Everything stays on your phone; nothing is uploaded.') + '</p></div>' +
      '<button class="card" id="hc" style="width:100%;text-align:start;display:flex;gap:12px;align-items:center"><span style="font-size:30px">📷</span><span><b>' + tt('لائیو کیمرہ', 'Live camera') + '</b><br><small class="e">' + tt('فلٹر اور چہرے کے اسٹیکر کے ساتھ تصویر لیں', 'Shoot with filters and face stickers') + '</small></span></button>' +
      '<button class="card" id="hg" style="width:100%;text-align:start;display:flex;gap:12px;align-items:center"><span style="font-size:30px">🖼</span><span><b>' + tt('گیلری سے تصویر', 'Photo from gallery') + '</b><br><small class="e">' + tt('ایڈٹ کریں، سجائیں، بیک گراؤنڈ بدلیں', 'Edit, decorate, change background') + '</small></span></button>' +
      '<button class="card" id="hk" style="width:100%;text-align:start;display:flex;gap:12px;align-items:center"><span style="font-size:30px">🧩</span><span><b>' + tt('کولاج', 'Collage') + '</b><br><small class="e">' + tt('2 سے 6 تصویریں ایک فریم میں', '2 to 6 photos in one frame') + '</small></span></button>' +
      '<button class="card" id="hp" style="width:100%;text-align:start;display:flex;gap:12px;align-items:center"><span style="font-size:30px">🪪</span><span><b>' + tt('پاسپورٹ فوٹو', 'Passport photo') + '</b><br><small class="e">' + tt('"تصویر ٹولز" میں', 'In Image tools') + '</small></span></button>' + CL.footer();
    $('#hg').onclick = function () { pickFiles('image/*').then(function (f) { if (f[0]) openFile(f[0]); }); };
    $('#hc').onclick = function () { ST.mode = 'cam'; vStudio(); };
    $('#hk').onclick = function () { ST.col = ST.col || { imgs: [], lay: 0, gap: 8, rad: 0, bg: '#ffffff', ar: 1 }; ST.mode = 'collage'; vStudio(); };
    $('#hp').onclick = function () { U.nav('imgtool'); };
  }
  function openFile(file) {
    CL.toast('لوڈ ہو رہی ہے…', 'Loading…');
    loadImg(file).then(function (im) { ST.P = defaults(); return loadBase(im, im.naturalWidth, im.naturalHeight); }).then(function () { ST.mode = 'edit'; ST.tab = 'filter'; vStudio(); }).catch(function () { CL.toast('تصویر نہیں کھل سکی', 'Cannot open image'); });
  }

  /* ---------- editor ---------- */
  var TABS = [['filter', ['فلٹر', 'Filters']], ['beauty', ['بیوٹی', 'Beauty']], ['face', ['چہرہ', 'Face']], ['bg', ['بیک گراؤنڈ', 'Background']], ['sticker', ['اسٹیکر', 'Stickers']], ['text', ['ٹیکسٹ', 'Text']], ['frame', ['فریم', 'Frame']], ['crop', ['کراپ', 'Crop']]];
  function setP(k, v) { var P = ST.P, p = k.split('.'); if (p.length === 2) P[p[0]][p[1]] = v; else P[k] = v; }
  function getP(k) { var P = ST.P, p = k.split('.'); return p.length === 2 ? P[p[0]][p[1]] : P[k]; }
  function slider(k, lab, min, max, step) { return '<div class="fl" style="margin-top:8px;display:flex;justify-content:space-between"><span>' + lab + '</span><b id="sv_' + k.replace('.', '_') + '" dir="ltr">' + getP(k) + '</b></div><input type="range" data-sl="' + k + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + getP(k) + '" style="width:100%">'; }
  function wireSliders() { [].forEach.call(document.querySelectorAll('[data-sl]'), function (el) { el.oninput = function () { var v = +el.value; setP(el.dataset.sl, v); var s = $('#sv_' + el.dataset.sl.replace('.', '_')); if (s) s.textContent = Math.round(v * 100) / 100; redraw(); }; }); }
  function screenEdit() {
    $('#body').innerHTML = '<div class="card" style="margin-top:6px;padding:8px"><div id="stg" style="position:relative;touch-action:none"><canvas id="stc" style="width:100%;border-radius:12px;display:block;background:#0003"></canvas></div></div>' +
      '<div style="display:flex;gap:6px;margin:6px 0"><button class="sbtn" id="eb" style="min-height:40px;padding:0 10px">←</button><button class="sbtn" id="ero" style="min-height:40px;flex:1;padding:0 4px;white-space:nowrap">⟳ ' + tt('گھمائیں', 'Rotate') + '</button><button class="sbtn" id="efl" style="min-height:40px;flex:1;padding:0 4px;white-space:nowrap">⇋ ' + tt('الٹا', 'Flip') + '</button><button class="sbtn" id="ers" style="min-height:40px;flex:1;padding:0 4px;white-space:nowrap">↺ ' + tt('ری سیٹ', 'Reset') + '</button><button class="sbtn p" id="esv" style="min-height:40px;flex:1.3;padding:0 4px;white-space:nowrap">💾 ' + tt('محفوظ', 'Save') + '</button></div>' +
      chips(TABS, ST.tab, 'stab').replace('class="chips"', 'class="chips" style="flex-wrap:nowrap;overflow-x:auto"') + '<div id="spn"></div>' + CL.footer();
    bind('stab', function (t) { ST.tab = t; screenEdit(); });
    $('#eb').onclick = function () { sheet('<b>' + tt('واپس جائیں؟', 'Go back?') + '</b><p class="note">' + tt('محفوظ نہ کی گئی تبدیلیاں ختم ہو جائیں گی۔', 'Unsaved changes will be lost.') + '</p><div class="two"><button class="sbtn" id="n1">' + tt('نہیں', 'No') + '</button><button class="sbtn r" id="y1">' + tt('ہاں', 'Yes') + '</button></div>'); $('#n1').onclick = closeSheet; $('#y1').onclick = function () { closeSheet(); ST.mode = 'home'; ST.base = null; vStudio(); }; };
    $('#ero').onclick = function () { xform('rot'); }; $('#efl').onclick = function () { xform('flip'); };
    $('#ers').onclick = function () { ST.P = defaults(); ST.objs = []; ST.sel = null; screenEdit(); };
    $('#esv').onclick = exportSheet;
    gestures(); panel(); redraw();
  }
  function xform(kind) {
    var b = ST.base, W = b.width, H = b.height, c;
    if (kind === 'rot') { c = mk(H, W); var x = c.getContext('2d'); x.translate(H, 0); x.rotate(Math.PI / 2); x.drawImage(b, 0, 0); }
    else { c = mk(W, H); var y = c.getContext('2d'); y.translate(W, 0); y.scale(-1, 1); y.drawImage(b, 0, 0); }
    ST.base = c; ST.W0 = c.width; ST.H0 = c.height; ST.mask = null; ST.maskState = ''; ST.thumbs = null; ST.P.zoom = 1; ST.P.px = ST.P.py = 0.5;
    redraw(); detect(c).then(function () { redraw(); if (ST.tab === 'face') panel(); });
  }
  function thumbs() {
    if (ST.thumbs) return ST.thumbs;
    var s = Math.min(ST.W0, ST.H0), c = mk(72, 72), x = c.getContext('2d'); ST.thumbs = {};
    FILTERS.forEach(function (f) { x.filter = f[1] || 'none'; x.drawImage(ST.base, (ST.W0 - s) / 2, (ST.H0 - s) / 2, s, s, 0, 0, 72, 72); ST.thumbs[f[0]] = c.toDataURL('image/jpeg', 0.6); });
    return ST.thumbs;
  }
  function selObj() { return ST.objs.filter(function (o) { return o.id === ST.sel; })[0]; }
  function panel() {
    var p = $('#spn'); if (!p) return; var t = ST.tab, h = '', P = ST.P;
    if (t === 'filter') { var th = thumbs(); h = '<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0">' + FILTERS.map(function (f) { return '<button data-fl="' + f[0] + '" style="flex:none;border:2px solid ' + (P.filter === f[0] ? 'var(--acc)' : 'transparent') + ';border-radius:12px;background:none;padding:2px;color:inherit"><img src="' + th[f[0]] + '" width="64" height="64" style="border-radius:10px;display:block" alt=""><small style="font-size:11px">' + tt(f[2], f[3]) + '</small></button>'; }).join('') + '</div>' + slider('fa', tt('فلٹر کی شدت', 'Filter strength'), 0, 100) + slider('bright', tt('روشنی', 'Brightness'), -50, 50) + slider('contrast', tt('کنٹراسٹ', 'Contrast'), -50, 50) + slider('sat', tt('رنگ', 'Saturation'), -80, 80) + slider('vig', tt('کنارے گہرے', 'Vignette'), 0, 100); }
    else if (t === 'beauty') h = slider('smooth', tt('جلد ہموار', 'Skin smoothing'), 0, 100) + slider('glow', tt('نرم چمک', 'Soft glow'), 0, 100) + '<p class="note">' + (ST.faces.length ? tt('چہرے ملے: ', 'Faces found: ') + ST.faces.length : tt('چہرہ نہیں ملا، اس لیے ہموار کرنا پوری تصویر پر ہلکا لگے گا۔', 'No face found, so smoothing is applied lightly to the whole photo.')) + '</p>';
    else if (t === 'face') h = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' + FACEFX.map(function (f) { return '<button class="sbtn' + (P.face[f[0]] ? ' p' : '') + '" data-fx="' + f[0] + '" style="min-height:62px;padding:2px;flex-direction:column;line-height:1.3"><span style="font-size:24px">' + f[1] + '</span><small style="font-size:10px">' + tt(f[2], f[3]) + '</small></button>'; }).join('') + '</div><p class="note">' + (!SP() ? tt('چہرہ پہچاننا صرف ایپ میں چلتا ہے۔', 'Face detection works only inside the app.') : ST.faces.length ? tt('چہرے ملے: ', 'Faces found: ') + ST.faces.length + tt('۔ اسٹیکر چہرے کے ساتھ خود جم جاتے ہیں۔', '. Stickers snap to each face.') : tt('چہرہ نہیں ملا۔ سامنے سے صاف روشنی والی تصویر لیں۔', 'No face found. Use a clear, well-lit, front-facing photo.')) + '</p>';
    else if (t === 'bg') {
      var m = P.bg.mode; h = chips([['none', ['بغیر', 'None']], ['blur', ['دھندلا', 'Blur']], ['color', ['رنگ', 'Color']], ['image', ['تصویر', 'Image']]], m, 'bgm');
      if (m !== 'none') h += '<p class="note">' + (ST.maskState === 'busy' ? tt('انسان کو الگ کیا جا رہا ہے…', 'Finding the person…') : ST.maskState === 'fail' || ST.maskState === 'none' ? tt('انسان الگ نہیں ہو سکا (یہ صرف ایپ میں چلتا ہے)۔', 'Could not find the person (works only inside the app).') : '') + '</p>';
      if (m === 'blur') h += slider('bg.blur', tt('دھندلاہٹ', 'Blur'), 2, 40);
      if (m === 'color') { var gp = [['#0ea5a4', '#6366f1'], ['#f43f5e', '#f59e0b'], ['#22c55e', '#06b6d4'], ['#111827', '#374151'], ['#ffffff', '#e5e7eb'], ['#ec4899', '#8b5cf6']]; h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + gp.map(function (g, i) { return '<button data-gp="' + i + '" style="width:48px;height:48px;border-radius:50%;border:2px solid ' + (P.bg.c1 === g[0] ? 'var(--acc)' : 'var(--line)') + ';background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')"></button>'; }).join('') + '</div>'; }
      if (m === 'image') h += '<button class="sbtn" id="bgi" style="width:100%;margin-top:8px">' + tt('بیک گراؤنڈ تصویر چنیں', 'Choose background image') + '</button>';
    }
    else if (t === 'sticker') { var o = selObj(); h = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px">' + EMOJI.map(function (e) { return '<button data-em="' + e + '" style="font-size:24px;background:none;border:0;min-height:42px">' + e + '</button>'; }).join('') + '</div>' + objCtl(o); }
    else if (t === 'text') { var so = selObj(), to = so && so.type === 'text' ? so : null; h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + PRESETS.map(function (x, i) { return '<button class="chip" data-tp="' + i + '">' + x + '</button>'; }).join('') + '</div><div style="display:flex;gap:8px"><input class="inp" id="txi" placeholder="' + tt('یہاں لکھیں', 'Type here') + '" value="' + esc(to ? to.txt : '') + '" style="margin:0"><button class="sbtn p" id="txa">' + (to ? tt('بدلیں', 'Update') : '＋') + '</button></div>' + chips(FONTS.map(function (f) { return [f[0], [f[2], f[3]]]; }), (to && to.font) || ST.tf || 'sans', 'tfn') + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">' + COLORS.map(function (c) { return '<button data-tc="' + c + '" style="width:34px;height:34px;border-radius:50%;border:2px solid ' + (((to && to.color) || ST.tcol || '#ffffff') === c ? 'var(--acc)' : 'var(--line)') + ';background:' + c + '"></button>'; }).join('') + '</div><div class="two"><button class="sbtn' + ((to ? to.bold : ST.tb) ? ' p' : '') + '" id="tbd">' + tt('موٹا', 'Bold') + '</button><button class="sbtn' + ((to ? to.outline : ST.to) ? ' p' : '') + '" id="tol">' + tt('کنارہ', 'Outline') + '</button></div>' + objCtl(so); }
    else if (t === 'frame') h = chips(FRAMES.map(function (f) { return [f[0], [f[1], f[2]]]; }), P.frame, 'frm');
    else if (t === 'crop') h = chips(ARS.map(function (a) { return [a[0], [a[1], a[2]]]; }), P.ar, 'arc') + slider('zoom', tt('زوم', 'Zoom'), 1, 3, 0.05) + slider('px', tt('دائیں بائیں', 'Move left/right'), 0, 1, 0.01) + slider('py', tt('اوپر نیچے', 'Move up/down'), 0, 1, 0.01);
    p.innerHTML = h; wirePanel();
  }
  function objCtl(o) { if (!o) return '<p class="note">' + tt('اسٹیکر چن کر انگلی سے ہلائیں؛ دو انگلیوں سے بڑا/چھوٹا اور گھمائیں۔', 'Tap a sticker to select; drag to move, pinch to resize and rotate.') + '</p>'; return '<div style="display:flex;gap:6px;margin-top:8px"><button class="sbtn" data-oc="big" style="flex:1;min-height:40px">＋</button><button class="sbtn" data-oc="small" style="flex:1;min-height:40px">－</button><button class="sbtn" data-oc="rl" style="flex:1;min-height:40px">↺</button><button class="sbtn" data-oc="rr" style="flex:1;min-height:40px">↻</button><button class="sbtn" data-oc="dup" style="flex:1;min-height:40px">⧉</button><button class="sbtn r" data-oc="del" style="flex:1;min-height:40px">🗑</button></div>'; }
  function addObj(o) { o.id = ST.nid++; ST.objs.push(o); ST.sel = o.id; redraw(); }
  function wirePanel() {
    wireSliders();
    bind('fl', function (id) { ST.P.filter = id; panel(); redraw(); });
    bind('fx', function (id) { ST.P.face[id] = !ST.P.face[id]; panel(); redraw(); });
    bind('bgm', function (m) { ST.P.bg.mode = m; if (m !== 'none') { getMask().then(function () { if (ST.tab === 'bg') panel(); redraw(); }); } panel(); redraw(); });
    bind('gp', function (i) { var gp = [['#0ea5a4', '#6366f1'], ['#f43f5e', '#f59e0b'], ['#22c55e', '#06b6d4'], ['#111827', '#374151'], ['#ffffff', '#e5e7eb'], ['#ec4899', '#8b5cf6']][+i]; ST.P.bg.c1 = gp[0]; ST.P.bg.c2 = gp[1]; panel(); redraw(); });
    var bi = $('#bgi'); if (bi) bi.onclick = function () { pickFiles('image/*').then(function (f) { if (f[0]) loadImg(f[0]).then(function (im) { ST.P.bg.img = im; redraw(); }); }); };
    bind('em', function (e) { addObj({ type: 'emoji', txt: e, x: 0.5, y: 0.45, size: 0.2, rot: 0 }); panel(); });
    bind('tp', function (i) { addObj({ type: 'text', txt: PRESETS[+i], x: 0.5, y: 0.2, size: 0.1, rot: 0, color: ST.tcol || '#ffffff', font: /[a-z]/i.test(PRESETS[+i]) ? (ST.tf || 'sans') : 'urdu', bold: true, outline: true }); panel(); });
    bind('tfn', function (f) { ST.tf = f; var o = selObj(); if (o && o.type === 'text') o.font = f; panel(); redraw(); });
    bind('tc', function (c) { ST.tcol = c; var o = selObj(); if (o && o.type === 'text') o.color = c; panel(); redraw(); });
    var ta = $('#txa'); if (ta) ta.onclick = function () { var v = $('#txi').value.trim(), o = selObj(); if (o && o.type === 'text') { if (v) o.txt = v; redraw(); return; } if (!v) { CL.toast('کچھ لکھیں', 'Type something'); return; } addObj({ type: 'text', txt: v, x: 0.5, y: 0.8, size: 0.09, rot: 0, color: ST.tcol || '#ffffff', font: ST.tf || 'sans', bold: !!ST.tb, outline: ST.to !== false }); panel(); };
    var tb = $('#tbd'); if (tb) tb.onclick = function () { var o = selObj(); if (o && o.type === 'text') o.bold = !o.bold; else ST.tb = !ST.tb; panel(); redraw(); };
    var tl = $('#tol'); if (tl) tl.onclick = function () { var o = selObj(); if (o && o.type === 'text') o.outline = !o.outline; else ST.to = !(ST.to !== false); panel(); redraw(); };
    bind('oc', function (a) { var o = selObj(); if (!o) return; if (a === 'big') o.size *= 1.15; else if (a === 'small') o.size /= 1.15; else if (a === 'rl') o.rot = (o.rot || 0) - 0.2; else if (a === 'rr') o.rot = (o.rot || 0) + 0.2; else if (a === 'dup') { var c = JSON.parse(JSON.stringify(o)); c.x += 0.05; c.y += 0.05; addObj(c); panel(); return; } else if (a === 'del') { ST.objs = ST.objs.filter(function (x) { return x.id !== o.id; }); ST.sel = null; panel(); } redraw(); });
    bind('frm', function (f) { ST.P.frame = f; panel(); redraw(); });
    bind('arc', function (a) { ST.P.ar = a; ST.P.zoom = 1; ST.P.px = ST.P.py = 0.5; panel(); redraw(); });
  }
  function gestures() {
    var cv = $('#stc'), ptrs = {}, st = null;
    var pos = function (e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pos(e); var ids = Object.keys(ptrs);
      if (ids.length === 1) { var p = ptrs[e.pointerId], o = hit(p[0], p[1], cv.width, cv.height), prev = ST.sel; ST.sel = o ? o.id : null; st = o ? { k: 'drag', o: o, dx: o.x * cv.width - p[0], dy: o.y * cv.height - p[1] } : (ST.tab === 'crop' ? { k: 'pan', p: p, px: ST.P.px, py: ST.P.py } : null); if (prev !== ST.sel) { redraw(); if (ST.tab === 'sticker' || ST.tab === 'text') panel(); } }
      else if (ids.length === 2 && selObj()) { var a = ptrs[ids[0]], b = ptrs[ids[1]], o2 = selObj(); st = { k: 'pinch', o: o2, d: Math.hypot(a[0] - b[0], a[1] - b[1]), a: Math.atan2(b[1] - a[1], b[0] - a[0]), size: o2.size, rot: o2.rot || 0 }; }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = pos(e); if (!st) return; var ids = Object.keys(ptrs);
      if (st.k === 'drag' && ids.length === 1) { var p = ptrs[e.pointerId]; st.o.x = Math.max(0, Math.min(1, (p[0] + st.dx) / cv.width)); st.o.y = Math.max(0, Math.min(1, (p[1] + st.dy) / cv.height)); redraw(); }
      else if (st.k === 'pinch' && ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; st.o.size = Math.max(0.03, Math.min(1.2, st.size * Math.hypot(a[0] - b[0], a[1] - b[1]) / st.d)); st.o.rot = st.rot + Math.atan2(b[1] - a[1], b[0] - a[0]) - st.a; redraw(); }
      else if (st.k === 'pan' && ids.length === 1) { var q = ptrs[e.pointerId], cr = cropRect(), z = ST.P.zoom; var kx = (ST.W0 - cr.w) || 1, ky = (ST.H0 - cr.h) || 1, s = cr.w / cv.width; ST.P.px = Math.max(0, Math.min(1, st.px - (q[0] - st.p[0]) * s / kx)); ST.P.py = Math.max(0, Math.min(1, st.py - (q[1] - st.p[1]) * s / ky)); redraw(); }
    });
    var up = function (e) { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) st = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  /* ---------- export ---------- */
  function exportSheet() {
    var EX = ST.ex = ST.ex || { size: 'orig', fmt: 'jpg' };
    sheet('<b style="font-size:17px">💾 ' + tt('محفوظ کریں', 'Save') + '</b>' + chips([['orig', ['اصل سائز', 'Full size']], ['status', ['واٹس ایپ اسٹیٹس', 'WhatsApp status']], ['sq', ['1080 اسکوائر', '1080 square']], ['small', ['چھوٹی (فائل کم)', 'Small file']]], EX.size, 'exs') + chips([['jpg', ['JPG', 'JPG']], ['png', ['PNG', 'PNG']]], EX.fmt, 'exf') + '<div class="two" style="margin-top:12px"><button class="sbtn" id="xc">' + tt('منسوخ', 'Cancel') + '</button><button class="sbtn p" id="xo">' + tt('محفوظ کریں', 'Save') + '</button></div>');
    bind('exs', function (v) { EX.size = v; exportSheet(); }); bind('exf', function (v) { EX.fmt = v; exportSheet(); });
    $('#xc').onclick = closeSheet;
    $('#xo').onclick = function () {
      closeSheet(); CL.toast('تیار ہو رہی ہے…', 'Preparing…');
      setTimeout(function () {
        var cr = cropRect(), sc = Math.min(1, 2048 / Math.max(cr.w, cr.h)), w = Math.round(cr.w * sc);
        if (EX.size === 'sq') { ST.P.ar = ST.P.ar === 'orig' ? '1:1' : ST.P.ar; w = 1080; } else if (EX.size === 'small') w = Math.min(w, 1080); else if (EX.size === 'status') w = Math.min(1080, w);
        var out = mk(10, 10); render(out, w, { export: true });
        if (EX.size === 'status') { var f = mk(1080, 1920), x = f.getContext('2d'); x.filter = 'blur(40px) brightness(.8)'; x.drawImage(out, -100, -100, 1280, 2120); x.filter = 'none'; var k = Math.min(1080 / out.width, 1920 / out.height); x.drawImage(out, (1080 - out.width * k) / 2, (1920 - out.height * k) / 2, out.width * k, out.height * k); out = f; }
        var mime = EX.fmt === 'png' ? 'image/png' : 'image/jpeg';
        out.toBlob(function (b) { if (!b) { CL.toast('محفوظ نہیں ہو سکا', 'Could not save'); return; } CL.saveOut(b, 'photo-studio-' + Date.now() + (EX.fmt === 'png' ? '.png' : '.jpg'), mime); }, mime, EX.size === 'small' ? 0.7 : 0.92);
      }, 50);
    };
  }

  /* ---------- live camera ---------- */
  var SEL = { filter: 'orig', fx: {}, timer: 0 };
  function stopCam() { var c = ST.cam; if (!c) return; try { c.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } ST.cam = null; }
  function screenCam() {
    $('#body').innerHTML = '<div class="card" style="margin-top:6px;padding:6px"><div style="position:relative"><canvas id="cvl" width="480" height="640" style="width:100%;height:52vh;object-fit:contain;border-radius:12px;display:block;background:#000"></canvas><div id="cst" style="position:absolute;inset:0;display:grid;place-content:center;color:#fff;text-align:center;padding:16px;pointer-events:none">' + tt('کیمرہ شروع ہو رہا ہے…', 'Starting camera…') + '</div><div id="cnt" style="position:absolute;inset:0;display:none;place-content:center;font-size:96px;font-weight:800;color:#fff;text-shadow:0 2px 16px #000;text-align:center"></div></div></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-around;margin:6px 0"><button class="sbtn" id="cb" style="min-height:48px">←</button><button class="sbtn" id="cfp" style="min-height:48px">🔄</button><button id="csh" style="width:70px;height:70px;border-radius:50%;border:5px solid #fff;background:var(--acc)" aria-label="shutter"></button><button class="sbtn' + (SEL.timer ? ' p' : '') + '" id="ctm" style="min-height:48px">⏱ ' + (SEL.timer ? '3s' : tt('بند', 'off')) + '</button></div>' +
      '<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0">' + FILTERS.map(function (f) { return '<button class="chip' + (SEL.filter === f[0] ? ' on' : '') + '" data-cf="' + f[0] + '" style="flex:none">' + tt(f[2], f[3]) + '</button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:8px;overflow-x:auto;padding:4px 0">' + FACEFX.map(function (f) { return '<button class="sbtn' + (SEL.fx[f[0]] ? ' p' : '') + '" data-cx="' + f[0] + '" style="flex:none;min-height:46px;font-size:22px;padding:0 10px">' + f[1] + '</button>'; }).join('') + '</div><p class="note" id="cnote"></p>' + CL.footer();
    bind('cf', function (id) { SEL.filter = id; screenCam(); }); bind('cx', function (id) { SEL.fx[id] = !SEL.fx[id]; screenCam(); });
    $('#cb').onclick = function () { stopCam(); ST.mode = 'home'; vStudio(); };
    $('#cfp').onclick = function () { ST.facing = ST.facing === 'user' ? 'environment' : 'user'; startCam(); };
    $('#ctm').onclick = function () { SEL.timer = SEL.timer ? 0 : 3; screenCam(); };
    $('#csh').onclick = shutter;
    if (!ST.cam) startCam(); else camLoop();
  }
  function startCam() {
    stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camFallback(); return; }
    var ask = (SP() && SP().camRequest) ? SP().camRequest().catch(function () { return { granted: true }; }) : Promise.resolve({ granted: true });
    clearTimeout(ST.camT); ST.camT = setTimeout(function () { if (ST.mode === 'cam' && (!ST.cam || !ST.cam.v.videoWidth)) { var s = $('#cst'); if (s) s.style.display = 'none'; camFallback(); } }, 7000);
    ask.then(function (r) { if (r && r.granted === false) throw new Error('denied'); return navigator.mediaDevices.getUserMedia({ video: { facingMode: ST.facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }).then(function (stream) {
      if (ST.mode !== 'cam') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var v = document.createElement('video'); v.playsInline = true; v.muted = true; v.srcObject = stream; v.play().catch(function () {});
      ST.cam = { stream: stream, v: v, faces: [], t: 0, busy: false }; camLoop();
    }).catch(function () { camFallback(); });
  }
  function camFallback() { var s = $('#cst'); if (s) s.style.display = 'none'; var n = $('#cnote'); if (n) n.innerHTML = tt('کیمرہ نہیں کھل سکا۔ فون کی سیٹنگ میں Cleanova کو کیمرے کی اجازت دیں، یا ', 'Camera could not start. Allow Camera for Cleanova in phone settings, or ') + '<button class="sbtn" id="csys" style="min-height:38px">' + tt('سسٹم کیمرہ استعمال کریں', 'Use system camera') + '</button>'; var b = $('#csys'); if (b) b.onclick = function () { var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', ST.facing === 'user' ? 'user' : 'environment'); i.onchange = function () { if (i.files[0]) openFile(i.files[0]); }; i.click(); }; }
  function mirrorFace(f, flip) {
    var m = function (p) { return p ? { x: flip ? 1 - p.x : p.x, y: p.y } : null; };
    var o = { x: flip ? 1 - f.x - f.w : f.x, y: f.y, w: f.w, h: f.h, roll: 0, le: m(f.le), re: m(f.re), nose: m(f.nose), lc: m(f.lc), rc: m(f.rc), mb: m(f.mb) };
    return normFace(o);
  }
  function camLoop() {
    var c = ST.cam, cv = $('#cvl'); if (!c || !cv || S.view !== 'studio' || ST.mode !== 'cam') { if (!cv || S.view !== 'studio' || ST.mode !== 'cam') stopCam(); return; }
    if (c.loop) return; c.loop = true;
    (function tick() {
      if (!ST.cam || ST.cam !== c || S.view !== 'studio' || ST.mode !== 'cam' || !$('#cvl')) { if (ST.cam === c) stopCam(); return; }
      var v = c.v; cv = $('#cvl');
      if (v.videoWidth) {
        var w = 480, h = Math.round(480 * v.videoHeight / v.videoWidth); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } var st0 = $('#cst'); if (st0) st0.style.display = 'none';
        var x = cv.getContext('2d'), flip = ST.facing === 'user', f = FILTERS.filter(function (q) { return q[0] === SEL.filter; })[0];
        x.save(); if (flip) { x.translate(w, 0); x.scale(-1, 1); } x.filter = f && f[1] ? f[1] : 'none'; x.drawImage(v, 0, 0, w, h); x.restore(); x.filter = 'none';
        var any = Object.keys(SEL.fx).some(function (k) { return SEL.fx[k]; });
        if (any) c.faces.forEach(function (fo) { drawFaceFx(x, { e1: { x: fo.e1.x * w, y: fo.e1.y * h }, e2: { x: fo.e2.x * w, y: fo.e2.y * h }, nose: fo.nose && { x: fo.nose.x * w, y: fo.nose.y * h }, lc: fo.lc && { x: fo.lc.x * w, y: fo.lc.y * h }, rc: fo.rc && { x: fo.rc.x * w, y: fo.rc.y * h } }, SEL.fx); });
        if (any && !c.busy && Date.now() - c.t > 200 && SP()) {
          c.busy = true; c.t = Date.now(); var s = mk(240, 240 * v.videoHeight / v.videoWidth); s.getContext('2d').drawImage(v, 0, 0, s.width, s.height);
          SP().faces({ data: b64(s, 0.5) }).then(function (r) { var nf = (r.faces || []).map(function (q) { return mirrorFace(q, flip); }); c.faces = lerpFaces(c.faces, nf); }).catch(function () { c.faces = []; }).then(function () { c.busy = false; });
        }
        if (any && !SP()) { var n = $('#cnote'); if (n && !n.textContent) n.textContent = tt('چہرے کے اسٹیکر صرف ایپ میں چلتے ہیں۔', 'Face stickers work only inside the app.'); }
      }
      requestAnimationFrame(tick);
    })();
  }
  function lerpFaces(prev, nf) {
    if (prev.length !== nf.length) return nf;
    var L = function (a, b) { return a + (b - a) * 0.55; }, P = function (a, b) { return a && b ? { x: L(a.x, b.x), y: L(a.y, b.y) } : b; };
    return nf.map(function (n, i) { var p = prev[i]; return { x: n.x, y: n.y, w: n.w, h: n.h, e1: P(p.e1, n.e1), e2: P(p.e2, n.e2), nose: P(p.nose, n.nose), lc: P(p.lc, n.lc), rc: P(p.rc, n.rc), mb: P(p.mb, n.mb) }; });
  }
  function shutter() {
    var c = ST.cam; if (!c || !c.v.videoWidth) { CL.toast('کیمرہ تیار نہیں', 'Camera not ready'); return; }
    var go = function () {
      var v = c.v, w = v.videoWidth, h = v.videoHeight, full = mk(w, h), x = full.getContext('2d');
      if (ST.facing === 'user') { x.translate(w, 0); x.scale(-1, 1); } x.drawImage(v, 0, 0, w, h);
      stopCam(); ST.P = defaults(); ST.P.filter = SEL.filter; Object.keys(SEL.fx).forEach(function (k) { if (SEL.fx[k]) ST.P.face[k] = true; });
      loadBase(full, w, h).then(function () { ST.mode = 'edit'; ST.tab = 'filter'; vStudio(); });
    };
    if (!SEL.timer) { go(); return; }
    var el = $('#cnt'), n = SEL.timer; el.style.display = 'grid'; el.textContent = n;
    var iv = setInterval(function () { n--; if (n <= 0) { clearInterval(iv); el.style.display = 'none'; go(); } else el.textContent = n; }, 1000);
  }

  /* ---------- collage ---------- */
  function layouts(n) {
    var g = function (cols, rows) { var a = []; for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) a.push([c / cols, r / rows, 1 / cols, 1 / rows]); return a; };
    var L = { 1: [[[0, 0, 1, 1]]], 2: [g(2, 1), g(1, 2), [[0, 0, 0.65, 1], [0.65, 0, 0.35, 1]]], 3: [g(3, 1), [[0, 0, 0.6, 1], [0.6, 0, 0.4, 0.5], [0.6, 0.5, 0.4, 0.5]], [[0, 0, 1, 0.6], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]]], 4: [g(2, 2), [[0, 0, 1, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]], [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1 / 3], [0.5, 1 / 3, 0.5, 1 / 3], [0.5, 2 / 3, 0.5, 1 / 3]]], 5: [[[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]], [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.25], [0.5, 0.25, 0.5, 0.25], [0.5, 0.5, 0.5, 0.25], [0.5, 0.75, 0.5, 0.25]]], 6: [g(3, 2), g(2, 3)] };
    return L[n] || [];
  }
  function drawCollage(cv, W) {
    var C = ST.col, H = Math.round(W / C.ar), x, lay = layouts(C.imgs.length)[C.lay] || [], gap = C.gap * W / 360;
    cv.width = W; cv.height = H; x = cv.getContext('2d'); x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    lay.forEach(function (r, i) {
      var rx = r[0] * W + gap, ry = r[1] * H + gap, rw = r[2] * W - gap * 2 + (r[0] + r[2] >= 0.999 ? 0 : 0), rh = r[3] * H - gap * 2, im = C.imgs[i]; if (!im) return;
      x.save(); x.beginPath(); if (x.roundRect && C.rad) x.roundRect(rx, ry, rw, rh, C.rad * W / 360); else x.rect(rx, ry, rw, rh); x.clip();
      var s = Math.max(rw / im.width, rh / im.height); x.drawImage(im, rx + (rw - im.width * s) / 2, ry + (rh - im.height * s) / 2, im.width * s, im.height * s); x.restore();
    });
  }
  function screenCollage() {
    var C = ST.col, n = C.imgs.length, lays = layouts(n);
    $('#body').innerHTML = '<div class="card" style="margin-top:6px;padding:8px"><canvas id="ccv" style="width:100%;border-radius:10px;display:block"></canvas></div>' +
      '<div style="display:flex;gap:6px;margin:6px 0"><button class="sbtn" id="kb" style="min-height:40px">←</button><button class="sbtn" id="ka" style="flex:2;min-height:40px">＋ ' + tt('تصویریں چنیں', 'Add photos') + ' (' + n + '/6)</button><button class="sbtn p" id="ks" style="flex:1.3;min-height:40px">💾 ' + tt('محفوظ', 'Save') + '</button></div>' +
      (n >= 2 ? '<div class="sec">' + tt('ترتیب', 'LAYOUT') + '</div><div style="display:flex;gap:8px;overflow-x:auto">' + lays.map(function (l, i) { return '<button data-kl="' + i + '" style="flex:none;border:2px solid ' + (C.lay === i ? 'var(--acc)' : 'var(--line)') + ';border-radius:8px;background:var(--card);padding:3px"><svg width="52" height="52" viewBox="0 0 52 52">' + l.map(function (r) { return '<rect x="' + (r[0] * 52 + 1.5) + '" y="' + (r[1] * 52 + 1.5) + '" width="' + (r[2] * 52 - 3) + '" height="' + (r[3] * 52 - 3) + '" fill="#2dd4bf" rx="2"/>'; }).join('') + '</svg></button>'; }).join('') + '</div>' : '<p class="note">' + tt('کم از کم 2 تصویریں چنیں۔', 'Choose at least 2 photos.') + '</p>') +
      chips([['1', ['1:1', '1:1']], ['0.8', ['4:5', '4:5']], ['0.5625', ['9:16', '9:16']]], String(C.ar), 'kar') +
      '<div class="fl" style="margin-top:8px;display:flex;justify-content:space-between"><span>' + tt('فاصلہ', 'Gap') + '</span><b id="kgv">' + C.gap + '</b></div><input type="range" id="kg" min="0" max="24" value="' + C.gap + '" style="width:100%"><div class="fl" style="margin-top:8px;display:flex;justify-content:space-between"><span>' + tt('گول کنارے', 'Corners') + '</span><b id="krv">' + C.rad + '</b></div><input type="range" id="kr" min="0" max="40" value="' + C.rad + '" style="width:100%">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">' + ['#ffffff', '#111827', '#fde68a', '#fbcfe8', '#bae6fd', '#bbf7d0'].map(function (c) { return '<button data-kc="' + c + '" style="width:36px;height:36px;border-radius:50%;border:2px solid ' + (C.bg === c ? 'var(--acc)' : 'var(--line)') + ';background:' + c + '"></button>'; }).join('') + '</div><p class="note">' + tt('کسی خانے پر ٹیپ کر کے اس کی تصویر بدلیں۔', 'Tap a cell to replace its photo.') + '</p>' + CL.footer();
    var cv = $('#ccv'), draw = function () { drawCollage(cv, Math.min(900, Math.round(cv.parentNode.clientWidth * Math.min(2, window.devicePixelRatio || 1)))); }; draw();
    $('#kb').onclick = function () { ST.mode = 'home'; vStudio(); };
    $('#ka').onclick = function () { pickFiles('image/*', true).then(function (fs) { return Promise.all(fs.slice(0, 6 - C.imgs.length).map(loadImg)); }).then(function (ims) { C.imgs = C.imgs.concat(ims).slice(0, 6); C.lay = 0; screenCollage(); }).catch(function () {}); };
    bind('kl', function (i) { C.lay = +i; screenCollage(); }); bind('kar', function (a) { C.ar = +a; screenCollage(); }); bind('kc', function (c) { C.bg = c; screenCollage(); });
    $('#kg').oninput = function () { C.gap = +this.value; $('#kgv').textContent = C.gap; draw(); }; $('#kr').oninput = function () { C.rad = +this.value; $('#krv').textContent = C.rad; draw(); };
    cv.onclick = function (e) { var r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height, lay = layouts(C.imgs.length)[C.lay] || []; for (var i = 0; i < lay.length; i++) { var q = lay[i]; if (fx >= q[0] && fx <= q[0] + q[2] && fy >= q[1] && fy <= q[1] + q[3]) { pickFiles('image/*').then(function (fs) { if (fs[0]) loadImg(fs[0]).then(function (im) { C.imgs[i] = im; draw(); }); }); break; } } };
    $('#ks').onclick = function () { if (n < 2) { CL.toast('کم از کم 2 تصویریں چنیں', 'Choose at least 2 photos'); return; } var o = mk(10, 10); drawCollage(o, 1080); o.toBlob(function (b) { CL.saveOut(b, 'collage-' + Date.now() + '.jpg', 'image/jpeg'); }, 'image/jpeg', 0.92); };
  }

  V.studio = vStudio;
  if (CL.HINTS) { CL.HINTS.studio = ['imgtool', 'فارم یا پاسپورٹ کے لیے تصویر چھوٹی کرنی ہو تو "تصویر ٹولز"', 'For forms or passport photos use Image tools']; CL.HINTS.imgtool = CL.HINTS.imgtool || ['studio', 'تصویر سجانی ہو تو "فوٹو اسٹوڈیو"', 'Want to decorate a photo? Try Photo Studio']; }
  if (CL.wrapTools) CL.wrapTools();
};
