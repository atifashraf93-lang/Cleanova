/* Cleanova Life: PDF toolkit and image tools. Everything is done on the phone; no file is uploaded. */
window.CLifeInit9 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var L = U.L, chips = U.chips, bind = U.bind, lget = U.lget, lset = U.lset;
  var reg = CL.regTool;
  reg('pdf', '📄', 1, ['PDF ٹولز', 'PDF tools'], 'files', ['تصویر سے PDF، PDF جوڑنا، صفحات نکالنا اور گھمانا (آف لائن)', 'Images to PDF, merge, extract, rotate (offline)'], 'پی ڈی ایف pdf تصویر سے pdf جوڑیں merge split الگ صفحات rotate گھمائیں compress ilovepdf smallpdf کاغذات فارم', true);
  reg('imgtool', '🖼', 5, ['تصویر ٹولز', 'Image tools'], 'files', ['KB کم کرنا، سائز بدلنا، پاسپورٹ/CNIC سائز شیٹ', 'Reduce KB, resize, passport photo sheet'], 'تصویر image photo کم کریں compress kb resize سائز پاسپورٹ passport photo cnic شیٹ 4x6 jpg png webp فارم پورٹل', true);

  /* ---------- helpers ---------- */
  var FP = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Files && !window.CLEANOVA_MOCK) ? window.Capacitor.Plugins.Files : null;
  function toB64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function saveOut(blob, name, mime) {
    if (FP) {
      return toB64(blob).then(function (b64) { return FP.save({ name: name, mime: mime, data: b64 }); }).then(function (r) {
        var m = $('#modal'); m.hidden = false;
        $('#sheet').innerHTML = '<b style="font-size:17px">✅ ' + tt('محفوظ ہو گیا', 'Saved') + '</b><p class="note" dir="ltr" style="text-align:start">' + esc(r.path) + '</p><div class="two" style="margin-top:10px"><button class="sbtn p" id="fo">' + tt('کھولیں', 'Open') + '</button><button class="sbtn" id="fs">' + tt('شیئر', 'Share') + '</button></div><button class="sbtn" id="fx" style="width:100%;margin-top:8px">' + tt('بند', 'Close') + '</button>';
        $('#fo').onclick = function () { FP.open({ uri: r.uri, mime: mime }).catch(function () { CL.toast('کھول نہیں سکا', 'Cannot open'); }); };
        $('#fs').onclick = function () { FP.share({ uri: r.uri, mime: mime }).catch(function () { CL.toast('شیئر نہیں ہو سکا', 'Cannot share'); }); };
        $('#fx').onclick = function () { m.hidden = true; };
      }).catch(function () { CL.toast('محفوظ نہیں ہو سکا', 'Could not save'); });
    }
    try { var f = new File([blob], name, { type: mime }); if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f] }).catch(function () {}); } catch (e) { /* fall through */ }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); CL.toast('محفوظ ہو گیا', 'Saved'); return Promise.resolve();
  }
  function pick(accept, multiple) {
    return new Promise(function (res) { var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.style.display = 'none'; document.body.appendChild(i); i.onchange = function () { var f = [].slice.call(i.files || []); i.remove(); res(f); }; i.click(); });
  }
  function readBuf(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(f); }); }
  function loadImg(f) { return new Promise(function (res, rej) { var u = URL.createObjectURL(f), im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('image')); }; im.src = u; }); }
  var libP = null;
  function loadLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib); if (libP) return libP;
    libP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'lib/pdf-lib.min.js'; s.onload = function () { res(window.PDFLib); }; s.onerror = function () { libP = null; rej(new Error('lib')); }; document.head.appendChild(s); });
    return libP;
  }
  function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function canvasBlob(cv, type, q) { return new Promise(function (res) { cv.toBlob(res, type, q); }); }
  function stamp() { var d = new Date(); return d.getFullYear() + U.pad(d.getMonth() + 1) + U.pad(d.getDate()) + '-' + U.pad(d.getHours()) + U.pad(d.getMinutes()); }
  function busy(on, msg) { var b = $('#tbusy'); if (!b) return; b.hidden = !on; b.textContent = msg || tt('کام ہو رہا ہے…', 'Working…'); }

  /* ================= PDF ================= */
  var PD = { tab: 'img', imgs: [], pdfs: [], one: null, q: 'med', size: 'a4', ranges: '', rot: 90 };
  var QUAL = { high: [2400, .88], med: [1700, .75], low: [1100, .6] };
  function imgToJpegBytes(f, maxSide, q) {
    return loadImg(f).then(function (im) {
      var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h)), cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0, cv.width, cv.height);
      return canvasBlob(cv, 'image/jpeg', q).then(readBuf).then(function (buf) { return { buf: buf, w: cv.width, h: cv.height }; });
    });
  }
  function makeImgPdf() {
    if (!PD.imgs.length) { CL.toast('پہلے تصویریں چنیں', 'Pick images first'); return; }
    busy(true);
    loadLib().then(function (P) {
      return P.PDFDocument.create().then(function (doc) {
        var qq = QUAL[PD.q], chain = Promise.resolve();
        PD.imgs.forEach(function (f) {
          chain = chain.then(function () { return imgToJpegBytes(f, qq[0], qq[1]); }).then(function (o) {
            return doc.embedJpg(o.buf).then(function (im) {
              var pw, ph; if (PD.size === 'fit') { pw = o.w; ph = o.h; } else { var land = o.w > o.h; pw = land ? 841.89 : 595.28; ph = land ? 595.28 : 841.89; }
              var page = doc.addPage([pw, ph]), m = PD.size === 'fit' ? 0 : 20, k = Math.min((pw - 2 * m) / o.w, (ph - 2 * m) / o.h), dw = o.w * k, dh = o.h * k;
              page.drawImage(im, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
            });
          });
        });
        return chain.then(function () { return doc.save(); });
      });
    }).then(function (bytes) { busy(false); return saveOut(new Blob([bytes], { type: 'application/pdf' }), 'cleanova-' + stamp() + '.pdf', 'application/pdf'); }).catch(function () { busy(false); CL.toast('PDF نہیں بن سکی', 'Could not make the PDF'); });
  }
  function mergePdfs() {
    if (PD.pdfs.length < 2) { CL.toast('کم از کم 2 PDF چنیں', 'Pick at least 2 PDFs'); return; }
    busy(true);
    loadLib().then(function (P) {
      return P.PDFDocument.create().then(function (out) {
        var chain = Promise.resolve();
        PD.pdfs.forEach(function (f) { chain = chain.then(function () { return readBuf(f); }).then(function (b) { return P.PDFDocument.load(b, { ignoreEncryption: false }); }).then(function (d) { return out.copyPages(d, d.getPageIndices()); }).then(function (pgs) { pgs.forEach(function (p) { out.addPage(p); }); }); });
        return chain.then(function () { return out.save(); });
      });
    }).then(function (bytes) { busy(false); return saveOut(new Blob([bytes], { type: 'application/pdf' }), 'merged-' + stamp() + '.pdf', 'application/pdf'); }).catch(function () { busy(false); CL.toast('جوڑ نہیں سکا (پاس ورڈ والی فائل ہو سکتی ہے)', 'Could not merge (file may be protected)'); });
  }
  function parseRanges(s, n) {
    var out = [], seen = {}; String(s).split(/[,،\s]+/).filter(Boolean).forEach(function (p) {
      var m = p.match(/^(\d+)(?:-(\d+))?$/); if (!m) return; var a = +m[1], b = m[2] ? +m[2] : a; if (a > b) { var t = a; a = b; b = t; }
      for (var i = a; i <= b && i <= n; i++) if (i >= 1 && !seen[i]) { seen[i] = 1; out.push(i - 1); }
    }); return out;
  }
  function editPdf(mode) {
    if (!PD.one) { CL.toast('پہلے PDF چنیں', 'Pick a PDF first'); return; }
    busy(true);
    Promise.all([loadLib(), readBuf(PD.one)]).then(function (a) {
      var P = a[0]; return P.PDFDocument.load(a[1]).then(function (src) {
        if (mode === 'rot') { src.getPages().forEach(function (p) { p.setRotation(P.degrees((p.getRotation().angle + PD.rot) % 360)); }); return src.save(); }
        var idx = parseRanges(PD.ranges, src.getPageCount()); if (!idx.length) throw new Error('range');
        return P.PDFDocument.create().then(function (out) { return out.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (p) { out.addPage(p); }); return out.save(); }); });
      });
    }).then(function (bytes) { busy(false); return saveOut(new Blob([bytes], { type: 'application/pdf' }), (mode === 'rot' ? 'rotated-' : 'pages-') + stamp() + '.pdf', 'application/pdf'); }).catch(function (e) { busy(false); CL.toast(e && e.message === 'range' ? 'صفحات کی درست رینج لکھیں (مثلاً 1-3,5)' : 'PDF نہیں کھل سکی', e && e.message === 'range' ? 'Enter a valid range like 1-3,5' : 'Could not open the PDF'); });
  }
  function listFiles(arr, attr) { return arr.map(function (f, i) { return '<div class="card" style="margin:5px 0"><div class="row" style="padding:0"><span class="dd" style="background:rgba(var(--c1),.18)">' + (i + 1) + '</span><div class="t" style="flex:1;min-width:0"><b dir="auto" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block">' + esc(f.name) + '</b><small class="e">' + fmtSize(f.size) + '</small></div><button class="sbtn" data-' + attr + 'u="' + i + '" style="min-height:34px;padding:0 9px">↑</button><button class="sbtn r" data-' + attr + 'd="' + i + '" style="min-height:34px;padding:0 9px">✕</button></div></div>'; }).join(''); }
  function vPdf() {
    CL.setTop(T('PDF ٹولز', 'PDF tools'));
    var h = chips([['img', ['تصویر ← PDF', 'Images → PDF']], ['mer', ['جوڑیں', 'Merge']], ['ext', ['صفحات نکالیں', 'Extract']], ['rot', ['گھمائیں', 'Rotate']]], PD.tab, 'pt').replace('class="chips"', 'class="chips" style="margin-top:8px;flex-wrap:wrap"') + '<div id="tbusy" class="warn" hidden></div>';
    if (PD.tab === 'img') h += '<button class="sbtn p" id="pi" style="width:100%;margin-top:8px">🖼 ' + tt('تصویریں چنیں', 'Pick images') + '</button><div id="pl">' + listFiles(PD.imgs, 'pi') + '</div><span class="fl">' + tt('معیار (چھوٹا PDF = کم معیار)', 'Quality (smaller PDF = lower)') + '</span>' + chips([['high', ['اعلیٰ', 'High']], ['med', ['درمیانہ', 'Medium']], ['low', ['چھوٹا', 'Small']]], PD.q, 'pq') + '<span class="fl">' + tt('صفحہ', 'Page') + '</span>' + chips([['a4', ['A4', 'A4']], ['fit', ['تصویر کے سائز', 'Fit image']]], PD.size, 'ps') + '<button class="sbtn p" id="pgo" style="width:100%;margin-top:12px">📄 ' + tt('PDF بنائیں', 'Make PDF') + '</button><p class="note">' + tt('CNIC، بل یا فارم کی تصویریں چن کر ایک PDF بنائیں۔ ترتیب بدلنے کے لیے ↑ دبائیں۔', 'Choose photos of documents and make one PDF. Use ↑ to reorder.') + '</p>';
    if (PD.tab === 'mer') h += '<button class="sbtn p" id="pm" style="width:100%;margin-top:8px">📑 ' + tt('PDF فائلیں چنیں', 'Pick PDFs') + '</button><div id="pl">' + listFiles(PD.pdfs, 'pm') + '</div><button class="sbtn p" id="pgo" style="width:100%;margin-top:12px">🔗 ' + tt('جوڑیں', 'Merge') + '</button>';
    if (PD.tab === 'ext' || PD.tab === 'rot') h += '<button class="sbtn p" id="po" style="width:100%;margin-top:8px">📑 ' + tt('PDF چنیں', 'Pick a PDF') + '</button>' + (PD.one ? '<div class="card" style="margin:5px 0"><b dir="auto">' + esc(PD.one.name) + '</b> <small class="e">' + fmtSize(PD.one.size) + '</small></div>' : '');
    if (PD.tab === 'ext') h += '<span class="fl">' + tt('جو صفحات رکھنے ہیں (مثلاً 1-3,5)', 'Pages to keep (e.g. 1-3,5)') + '</span><input class="inp" id="pr" value="' + esc(PD.ranges) + '" style="direction:ltr" placeholder="1-3,5"><button class="sbtn p" id="pgo" style="width:100%;margin-top:12px">✂️ ' + tt('نکالیں', 'Extract') + '</button><p class="note">' + tt('جو صفحات لکھیں گے وہی نئی PDF میں رہیں گے، باقی ہٹ جائیں گے۔', 'Only the pages you list remain; the rest are removed.') + '</p>';
    if (PD.tab === 'rot') h += '<span class="fl">' + tt('گھمائیں', 'Rotate') + '</span>' + chips([['90', ['90° دائیں', '90° right']], ['180', ['180°', '180°']], ['270', ['90° بائیں', '90° left']]], String(PD.rot), 'pro') + '<button class="sbtn p" id="pgo" style="width:100%;margin-top:12px">🔄 ' + tt('گھمائیں اور محفوظ', 'Rotate and save') + '</button>';
    $('#body').innerHTML = h + '<p class="note">' + tt('فائل آپ کے فون میں ہی بنتی ہے، کہیں اپ لوڈ نہیں ہوتی۔ پاس ورڈ والی PDF نہیں کھلیں گی۔', 'Files are made on your phone and never uploaded. Password-protected PDFs will not open.') + '</p>' + CL.footer();
    bind('pt', function (t) { PD.tab = t; vPdf(); });
    var move = function (arr, i) { i = +i; if (i > 0) { var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; } };
    var pi = $('#pi'); if (pi) pi.onclick = function () { pick('image/*', true).then(function (f) { if (f.length) { PD.imgs = PD.imgs.concat(f); vPdf(); } }); };
    var pm = $('#pm'); if (pm) pm.onclick = function () { pick('application/pdf', true).then(function (f) { if (f.length) { PD.pdfs = PD.pdfs.concat(f); vPdf(); } }); };
    var po = $('#po'); if (po) po.onclick = function () { pick('application/pdf', false).then(function (f) { if (f[0]) { PD.one = f[0]; vPdf(); } }); };
    bind('piu', function (i) { move(PD.imgs, i); vPdf(); }); bind('pid', function (i) { PD.imgs.splice(+i, 1); vPdf(); });
    bind('pmu', function (i) { move(PD.pdfs, i); vPdf(); }); bind('pmd', function (i) { PD.pdfs.splice(+i, 1); vPdf(); });
    bind('pq', function (q) { PD.q = q; vPdf(); }); bind('ps', function (s) { PD.size = s; vPdf(); }); bind('pro', function (r) { PD.rot = +r; vPdf(); });
    var pr = $('#pr'); if (pr) pr.oninput = function () { PD.ranges = this.value; };
    var go = $('#pgo'); if (go) go.onclick = function () { if (PD.tab === 'img') makeImgPdf(); else if (PD.tab === 'mer') mergePdfs(); else editPdf(PD.tab); };
  }
  V.pdf = vPdf;

  /* ================= IMAGE TOOLS ================= */
  var IM = { tab: 'size', file: null, img: null, kb: '200', maxpx: '', fmt: 'jpeg', rot: 0, out: null, pp: 0, ppsz: 0, ppsheet: 0, zoom: 1, ox: 0, oy: 0 };
  var PPS = [['35×45 mm (پاسپورٹ/ویزا)', 35, 45], ['40×50 mm', 40, 50], ['25×30 mm (CNIC سائز)', 25, 30], ['2×2 inch (51 mm)', 50.8, 50.8]];
  var SHEETS = [['4×6 inch', 1200, 1800], ['A4', 2480, 3508], ['5×7 inch', 1500, 2100]];
  function drawRot(im, rot, maxpx) {
    var w = im.naturalWidth, h = im.naturalHeight, k = maxpx ? Math.min(1, maxpx / Math.max(w, h)) : 1, sw = Math.round(w * k), sh = Math.round(h * k), cv = document.createElement('canvas'), q = rot % 180 !== 0;
    cv.width = q ? sh : sw; cv.height = q ? sw : sh; var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.translate(cv.width / 2, cv.height / 2); c.rotate(rot * Math.PI / 180); c.drawImage(im, -sw / 2, -sh / 2, sw, sh); return cv;
  }
  function squeeze(cv, type, targetKB) {
    var tb = targetKB * 1024;
    if (type === 'image/png') return canvasBlob(cv, type);
    var step = function (c, tries) {
      var lo = .08, hi = .95, best = null, i = 0;
      var loop = function () { if (i++ >= 7) return Promise.resolve(best); var mid = (lo + hi) / 2; return canvasBlob(c, type, mid).then(function (b) { if (b.size <= tb) { best = b; lo = mid; } else hi = mid; return loop(); }); };
      return loop().then(function (b) { if (b || tries <= 0) return b || canvasBlob(c, type, .08); var n = document.createElement('canvas'); n.width = Math.round(c.width * .85); n.height = Math.round(c.height * .85); n.getContext('2d').drawImage(c, 0, 0, n.width, n.height); return step(n, tries - 1); });
    };
    return step(cv, 8);
  }
  function runSize() {
    if (!IM.img) { CL.toast('پہلے تصویر چنیں', 'Pick a photo first'); return; }
    busy(true);
    var type = 'image/' + IM.fmt, cv = drawRot(IM.img, IM.rot, +IM.maxpx || 0), kb = Math.max(10, +IM.kb || 200);
    (IM.fmt === 'png' ? canvasBlob(cv, type) : squeeze(cv, type, kb)).then(function (b) { busy(false); IM.out = b; var o = $('#iout'); if (o) o.innerHTML = '<div class="card"><b>' + tt('نتیجہ', 'Result') + ': ' + fmtSize(b.size) + '</b> · ' + cv.width + '×' + cv.height + (IM.fmt !== 'png' && b.size > kb * 1024 ? '<br><small class="e">' + tt('اتنا چھوٹا نہیں ہو سکا؛ سائز کم کریں', 'Could not reach the target; lower the pixel size') + '</small>' : '') + '</div><button class="sbtn p" id="isv" style="width:100%;margin-top:8px">💾 ' + tt('محفوظ / شیئر', 'Save / share') + '</button>'; $('#isv').onclick = function () { saveOut(b, 'photo-' + stamp() + '.' + (IM.fmt === 'jpeg' ? 'jpg' : IM.fmt), type); }; }).catch(function () { busy(false); CL.toast('نہیں ہو سکا', 'Failed'); });
  }
  function drawSheet(cv, final) {
    var sh = SHEETS[IM.ppsheet], ps = PPS[IM.ppsz], dpi = 300, W = sh[1], H = sh[2], pw = Math.round(ps[1] / 25.4 * dpi), ph = Math.round(ps[2] / 25.4 * dpi), gap = 24, mar = 40;
    cv.width = W; cv.height = H; var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    var cols = Math.max(1, Math.floor((W - 2 * mar + gap) / (pw + gap))), rows = Math.max(1, Math.floor((H - 2 * mar + gap) / (ph + gap)));
    if (!IM.img) { c.fillStyle = '#999'; c.font = '60px sans-serif'; c.textAlign = 'center'; c.fillText('Photo', W / 2, H / 2); return cols * rows; }
    var im = IM.img, ar = pw / ph, sw, sh2; if (im.naturalWidth / im.naturalHeight > ar) { sh2 = im.naturalHeight / IM.zoom; sw = sh2 * ar; } else { sw = im.naturalWidth / IM.zoom; sh2 = sw / ar; }
    var sx = (im.naturalWidth - sw) / 2 + IM.ox * (im.naturalWidth - sw) / 2, sy = (im.naturalHeight - sh2) / 2 + IM.oy * (im.naturalHeight - sh2) / 2;
    sx = Math.max(0, Math.min(im.naturalWidth - sw, sx)); sy = Math.max(0, Math.min(im.naturalHeight - sh2, sy));
    var gw = cols * pw + (cols - 1) * gap, gh = rows * ph + (rows - 1) * gap, x0 = (W - gw) / 2, y0 = (H - gh) / 2;
    for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) { var x = x0 + q * (pw + gap), y = y0 + r * (ph + gap); c.drawImage(im, sx, sy, sw, sh2, x, y, pw, ph); c.strokeStyle = '#bbb'; c.lineWidth = 2; c.strokeRect(x - 1, y - 1, pw + 2, ph + 2); }
    return cols * rows;
  }
  function vImg() {
    CL.setTop(T('تصویر ٹولز', 'Image tools'));
    var h = chips([['size', ['KB / سائز', 'KB / size']], ['pass', ['پاسپورٹ شیٹ', 'Passport sheet']]], IM.tab, 'it').replace('class="chips"', 'class="chips" style="margin-top:8px"') + '<div id="tbusy" class="warn" hidden></div><button class="sbtn p" id="ipk" style="width:100%;margin-top:8px">🖼 ' + (IM.file ? esc(IM.file.name) : tt('تصویر چنیں', 'Pick a photo')) + '</button>';
    if (IM.tab === 'size') h += '<div class="card" style="margin-top:8px"><div class="two"><div><span class="fl" style="margin-top:0">' + tt('زیادہ سے زیادہ KB', 'Target KB') + '</span><input class="inp" id="ikb" type="number" value="' + esc(IM.kb) + '" style="direction:ltr"></div><div><span class="fl" style="margin-top:0">' + tt('لمبائی/چوڑائی (px، اختیاری)', 'Max side px (optional)') + '</span><input class="inp" id="imx" type="number" value="' + esc(IM.maxpx) + '" placeholder="1200" style="direction:ltr"></div></div><span class="fl">' + tt('فارمیٹ', 'Format') + '</span>' + chips([['jpeg', ['JPG', 'JPG']], ['webp', ['WebP', 'WebP']], ['png', ['PNG', 'PNG']]], IM.fmt, 'if') + '<span class="fl">' + tt('گھمائیں', 'Rotate') + '</span><div class="two"><button class="sbtn" id="irl">↺ 90°</button><button class="sbtn" id="irr">↻ 90°</button></div></div><button class="sbtn p" id="igo" style="width:100%;margin-top:10px">⚙️ ' + tt('تیار کریں', 'Process') + '</button><div id="iout" style="margin-top:8px"></div><p class="note">' + tt('پورٹلز پر "100 KB کے اندر" جیسی شرط کے لیے KB لکھیں؛ ایپ معیار گھٹا کر ہدف تک پہنچتی ہے۔', 'Enter the KB limit a portal asks for; quality is lowered until it fits.') + '</p>';
    else h += '<canvas id="icv" style="width:100%;border-radius:12px;margin-top:8px;background:#fff;max-height:46vh;object-fit:contain"></canvas><div id="icnt" class="note"></div><span class="fl">' + tt('فوٹو کا سائز', 'Photo size') + '</span>' + chips(PPS.map(function (p, i) { return [String(i), [p[0], p[0]]]; }), String(IM.ppsz), 'ipp').replace('class="chips"', 'class="chips" style="flex-wrap:wrap"') + '<span class="fl">' + tt('شیٹ', 'Sheet') + '</span>' + chips(SHEETS.map(function (p, i) { return [String(i), [p[0], p[0]]]; }), String(IM.ppsheet), 'ish') + '<span class="fl">' + tt('زوم', 'Zoom') + '</span><input type="range" id="izm" min="1" max="3" step="0.05" value="' + IM.zoom + '" style="width:100%"><span class="fl">' + tt('دائیں بائیں', 'Left / right') + '</span><input type="range" id="ixx" min="-1" max="1" step="0.02" value="' + IM.ox + '" style="width:100%"><span class="fl">' + tt('اوپر نیچے', 'Up / down') + '</span><input type="range" id="iyy" min="-1" max="1" step="0.02" value="' + IM.oy + '" style="width:100%"><button class="sbtn p" id="isv2" style="width:100%;margin-top:12px">💾 ' + tt('شیٹ محفوظ / شیئر (پرنٹ کے لیے)', 'Save / share sheet (to print)') + '</button><p class="note">' + tt('چہرہ فریم کے بیچ لائیں۔ شیٹ 300 DPI پر بنتی ہے؛ پرنٹ کروانے والی دکان کو بتائیں کہ "100% سائز" پر پرنٹ کریں۔ سرکاری فوٹو کی شرائط (پس منظر، چہرے کا سائز) اپنے ادارے کی دیکھ لیں۔', 'Centre the face. The sheet is 300 DPI; print at 100% size. Check your authority\'s photo rules (background, face size).') + '</p>';
    $('#body').innerHTML = h + CL.footer();
    bind('it', function (t) { IM.tab = t; vImg(); });
    $('#ipk').onclick = function () { pick('image/*', false).then(function (f) { if (!f[0]) return; loadImg(f[0]).then(function (im) { IM.file = f[0]; IM.img = im; IM.rot = 0; IM.out = null; vImg(); }).catch(function () { CL.toast('تصویر نہیں کھلی', 'Cannot open the photo'); }); }); };
    if (IM.tab === 'size') {
      $('#ikb').oninput = function () { IM.kb = this.value; }; $('#imx').oninput = function () { IM.maxpx = this.value; };
      bind('if', function (f) { IM.fmt = f; vImg(); });
      $('#irl').onclick = function () { IM.rot = (IM.rot + 270) % 360; CL.toast('گھمائی گئی', 'Rotated'); }; $('#irr').onclick = function () { IM.rot = (IM.rot + 90) % 360; CL.toast('گھمائی گئی', 'Rotated'); };
      $('#igo').onclick = runSize;
    } else {
      var cv = $('#icv'), up = function () { var n = drawSheet(cv); $('#icnt').textContent = tt('اس شیٹ پر ' + n + ' تصویریں آئیں گی۔', n + ' photos fit on this sheet.'); }; up();
      bind('ipp', function (i) { IM.ppsz = +i; vImg(); }); bind('ish', function (i) { IM.ppsheet = +i; vImg(); });
      $('#izm').oninput = function () { IM.zoom = +this.value; up(); }; $('#ixx').oninput = function () { IM.ox = +this.value; up(); }; $('#iyy').oninput = function () { IM.oy = +this.value; up(); };
      $('#isv2').onclick = function () { if (!IM.img) { CL.toast('پہلے تصویر چنیں', 'Pick a photo first'); return; } canvasBlob(cv, 'image/jpeg', .95).then(function (b) { saveOut(b, 'passport-sheet-' + stamp() + '.jpg', 'image/jpeg'); }); };
    }
  }
  V.imgtool = vImg;
  if (CL.HINTS) { CL.HINTS.pdf = ['imgtool', 'فارم کے لیے تصویر چھوٹی کرنی ہے؟ "تصویر ٹولز" دیکھیں', 'Need a smaller photo? Try Image tools']; CL.HINTS.imgtool = ['pdf', 'تصویر کو PDF بنانا ہو تو "PDF ٹولز"', 'Need a PDF? Try PDF tools']; CL.HINTS.sites = ['pdf', 'PDF کا کام آف لائن ہو جاتا ہے: "PDF ٹولز"', 'PDF work can be done offline: PDF tools']; }
  if (CL.wrapTools) CL.wrapTools();
};
