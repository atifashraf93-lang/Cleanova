/* Small slippy map (no libraries): OpenStreetMap-style raster tiles on a canvas, pan, pinch, zoom, routes, markers.
   Tiles you have looked at are kept in the phone's cache, so those areas work offline. */
(function () {
  'use strict';
  var TILE = 256, STYLES = {
    osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap contributors', max: 19 },
    carto: { url: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', attr: '© OpenStreetMap © CARTO', max: 19 }
  };
  var mem = {}, memN = 0, pending = {}, queue = [], active = 0, failed = {};
  var cachePromise = null;
  function openCache() { if (!cachePromise) cachePromise = (window.caches ? window.caches.open('cl-tiles-v1') : Promise.reject()).catch(function () { return null; }); return cachePromise; }
  function pump() {
    while (active < 6 && queue.length) {
      var job = queue.shift(); active++;
      load(job.url).then(job.ok, job.fail).then(function () { active--; pump(); });
    }
  }
  function toImg(blobOrUrl, isBlob) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = isBlob ? URL.createObjectURL(blobOrUrl) : blobOrUrl; });
  }
  function load(url) {
    return openCache().then(function (c) {
      var hit = c ? c.match(url) : null;
      return Promise.resolve(hit).then(function (r) {
        if (r) return r.blob().then(function (b) { return toImg(b, true); });
        return fetch(url, { mode: 'cors' }).then(function (resp) {
          if (!resp.ok) throw new Error('tile ' + resp.status);
          if (c) c.put(url, resp.clone()).catch(function () { /* quota */ });
          return resp.blob();
        }).then(function (b) { return toImg(b, true); }).catch(function () { return toImg(url, false); });
      });
    });
  }
  function tileImg(url, cb) {
    if (mem[url]) return mem[url];
    if (failed[url] && Date.now() - failed[url] < 30000) return null;
    if (pending[url]) return null;
    pending[url] = 1;
    queue.push({ url: url, ok: function (im) { delete pending[url]; if (memN > 400) { mem = {}; memN = 0; } mem[url] = im; memN++; cb(); }, fail: function () { delete pending[url]; failed[url] = Date.now(); } });
    pump();
    return null;
  }
  function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z) * TILE; }
  function lat2y(lat, z) { var s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * TILE; }
  function x2lon(x, z) { return x / (Math.pow(2, z) * TILE) * 360 - 180; }
  function y2lat(y, z) { var n = Math.PI - 2 * Math.PI * y / (Math.pow(2, z) * TILE); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }

  function TileMap(el, opt) {
    opt = opt || {};
    var self = this, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;border-radius:inherit';
    el.innerHTML = ''; el.style.position = 'relative'; el.appendChild(cv);
    self.el = el; self.cv = cv; self.style = opt.style || 'osm'; self.lat = opt.lat || 24.8607; self.lon = opt.lon || 67.0011; self.z = opt.zoom || 11;
    self.layers = []; self.onTap = opt.onTap || null;
    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), raf = 0;
    function size() { var r = el.getBoundingClientRect(); W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = W * dpr; cv.height = H * dpr; self.draw(); }
    self.resize = size;
    self.setStyle = function (s) { self.style = STYLES[s] ? s : 'osm'; self.draw(); };
    self.setLayers = function (l) { self.layers = l || []; self.draw(); };
    self.clampZ = function () { self.z = Math.max(3, Math.min(STYLES[self.style].max, self.z)); };
    self.project = function (lat, lon) { var cx = lon2x(self.lon, self.z), cy = lat2y(self.lat, self.z); return [W / 2 + lon2x(lon, self.z) - cx, H / 2 + lat2y(lat, self.z) - cy]; };
    self.draw = function () {
      if (raf) return; raf = requestAnimationFrame(function () { raf = 0; paint(); });
    };
    function paint() {
      if (!W) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#e8e4dc'; ctx.fillRect(0, 0, W, H);
      var st = STYLES[self.style], tz = Math.max(0, Math.min(st.max, Math.round(self.z))), sc = Math.pow(2, self.z - tz), n = Math.pow(2, tz);
      var cx = lon2x(self.lon, tz), cy = lat2y(self.lat, tz), hw = W / 2 / sc, hh = H / 2 / sc;
      var x0 = Math.floor((cx - hw) / TILE), x1 = Math.floor((cx + hw) / TILE), y0 = Math.floor((cy - hh) / TILE), y1 = Math.floor((cy + hh) / TILE);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
        if (y < 0 || y >= n) continue;
        var xx = ((x % n) + n) % n, url = (opt.tileUrl || st.url).replace('{z}', tz).replace('{x}', xx).replace('{y}', y), im = tileImg(url, self.draw);
        var dx = W / 2 + (x * TILE - cx) * sc, dy = H / 2 + (y * TILE - cy) * sc, ds = TILE * sc + 0.5;
        if (im) ctx.drawImage(im, dx, dy, ds, ds);
        else { ctx.fillStyle = '#efece4'; ctx.fillRect(dx, dy, ds, ds); ctx.strokeStyle = '#e1ddd2'; ctx.strokeRect(dx, dy, ds, ds); }
      }
      self.layers.forEach(function (L) {
        if (L.type === 'line') {
          if (L.pts.length < 2) return;
          ctx.beginPath(); ctx.lineWidth = L.w || 4; ctx.strokeStyle = L.color || '#e5484d'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(L.dash || []);
          L.pts.forEach(function (p, i) { var q = self.project(p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
          ctx.stroke(); ctx.setLineDash([]);
        } else if (L.type === 'dot') {
          var q = self.project(L.lat, L.lon);
          ctx.beginPath(); ctx.arc(q[0], q[1], L.r || 7, 0, 7); ctx.fillStyle = L.color || '#1a73e8'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
          if (L.label) { ctx.font = 'bold 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.strokeText(L.label, q[0] + 10, q[1] + 4); ctx.fillStyle = '#222'; ctx.fillText(L.label, q[0] + 10, q[1] + 4); }
        }
      });
      ctx.font = '10px system-ui,sans-serif'; var at = st.attr, tw = ctx.measureText(at).width + 8;
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(W - tw, H - 16, tw, 16); ctx.fillStyle = '#333'; ctx.fillText(at, W - tw + 4, H - 5);
    }
    self.fit = function (pts, pad) {
      if (!pts || !pts.length) return;
      var la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
      pts.forEach(function (p) { la0 = Math.min(la0, p[0]); la1 = Math.max(la1, p[0]); lo0 = Math.min(lo0, p[1]); lo1 = Math.max(lo1, p[1]); });
      self.lat = (la0 + la1) / 2; self.lon = (lo0 + lo1) / 2; pad = pad || 40;
      var z = 17;
      for (; z > 3; z--) { var w = lon2x(lo1, z) - lon2x(lo0, z), h = lat2y(la0, z) - lat2y(la1, z); if (w <= W - 2 * pad && h <= H - 2 * pad) break; }
      self.z = z; self.draw();
    };
    self.zoomBy = function (d, px, py) {
      var before = self.screenToLL(px == null ? W / 2 : px, py == null ? H / 2 : py), z0 = self.z;
      self.z += d; self.clampZ();
      if (px != null) { var after = self.screenToLL(px, py); self.lat += before[0] - after[0]; self.lon += before[1] - after[1]; }
      if (z0 !== self.z) self.draw();
    };
    self.screenToLL = function (px, py) { var cx = lon2x(self.lon, self.z), cy = lat2y(self.lat, self.z); return [y2lat(cy + py - H / 2, self.z), x2lon(cx + px - W / 2, self.z)]; };
    /* gestures */
    var ptrs = {}, lastD = 0, moved = false, startT = 0;
    function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pos(e); moved = false; startT = Date.now(); lastD = 0; });
    cv.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return;
      var p = pos(e), ids = Object.keys(ptrs);
      if (ids.length === 1) {
        var dx = p[0] - ptrs[e.pointerId][0], dy = p[1] - ptrs[e.pointerId][1]; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        var cx = lon2x(self.lon, self.z) - dx, cy = lat2y(self.lat, self.z) - dy; self.lon = x2lon(cx, self.z); self.lat = y2lat(cy, self.z); self.draw();
      } else if (ids.length === 2) {
        moved = true; ptrs[e.pointerId] = p;
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastD) self.zoomBy(Math.log2(d / lastD), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        lastD = d;
      }
      ptrs[e.pointerId] = p;
    });
    function up(e) { var was = ptrs[e.pointerId]; delete ptrs[e.pointerId]; lastD = 0; if (was && !moved && Date.now() - startT < 350 && self.onTap) { var p = pos(e); self.onTap(p[0], p[1]); } }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var p = pos(e); self.zoomBy(e.deltaY < 0 ? 0.5 : -0.5, p[0], p[1]); }, { passive: false });
    cv.addEventListener('dblclick', function (e) { var p = pos(e); self.zoomBy(1, p[0], p[1]); });
    if (window.ResizeObserver) new ResizeObserver(size).observe(el);
    size();
  }

  /* Downloads a small overview of a city so it still opens without internet (kept deliberately small). box = [north, west, south, east] */
  TileMap.preload = function (style, box, zmin, zmax, onProgress) {
    var st = STYLES[style] || STYLES.osm, list = [];
    for (var z = zmin; z <= zmax; z++) {
      var xa = Math.floor(lon2x(box[1], z) / TILE), xb = Math.floor(lon2x(box[3], z) / TILE), ya = Math.floor(lat2y(box[0], z) / TILE), yb = Math.floor(lat2y(box[2], z) / TILE);
      for (var x = xa; x <= xb; x++) for (var y = ya; y <= yb; y++) list.push(st.url.replace('{z}', z).replace('{x}', x).replace('{y}', y));
    }
    var i = 0, ok = 0;
    return new Promise(function (res) {
      (function next() {
        if (i >= list.length) return res({ total: list.length, ok: ok });
        var u = list[i++];
        load(u).then(function () { ok++; }, function () { /* skip */ }).then(function () { if (onProgress) onProgress(i, list.length); setTimeout(next, 120); });
      })();
    });
  };
  TileMap.STYLES = STYLES;
  window.TileMap = TileMap;
})();
