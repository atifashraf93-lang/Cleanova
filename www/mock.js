/* Test stand-in for the native plugin. Used only when the app runs in a normal browser (or with ?mock), never on the phone. */
(function () {
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && location.search.indexOf('mock') < 0) return;
  if (location.search.indexOf('mock') >= 0) window.CLEANOVA_MOCK = true;
  var granted = location.search.indexOf('nogrant') < 0;
  var trash = [], listeners = {};
  function mk(path, size, days) { return { path: path, size: size, mtime: Date.now() - days * 86400000 }; }
  var R = '/storage/emulated/0/';
  var groups = [
    { type: 'exact', size: 4100000, items: [mk(R + 'DCIM/Camera/IMG_2041.jpg', 4100000, 40), mk(R + 'WhatsApp/Media/WhatsApp Images/IMG-20260901-WA0012.jpg', 4100000, 30), mk(R + 'Download/IMG_2041 (1).jpg', 4100000, 2)] },
    { type: 'exact', size: 2600000, items: [mk(R + 'DCIM/Camera/IMG_2050.jpg', 2600000, 35), mk(R + 'Pictures/Telegram/IMG_2050.jpg', 2600000, 20)] },
    { type: 'exact', size: 84000000, items: [mk(R + 'DCIM/Camera/VID_0001.mp4', 84000000, 50), mk(R + 'WhatsApp/Media/WhatsApp Video/VID-20260801-WA0003.mp4', 84000000, 45)] },
    { type: 'exact', size: 920000, items: [mk(R + 'Documents/CNIC copy.pdf', 920000, 100), mk(R + 'Download/CNIC copy (1).pdf', 920000, 10), mk(R + 'WhatsApp/Media/WhatsApp Documents/CNIC copy.pdf', 920000, 8)] },
    { type: 'exact', size: 3800000, items: [mk(R + 'Music/naat1.mp3', 3800000, 90), mk(R + 'Download/naat1.mp3', 3800000, 12)] },
    { type: 'similar', size: 3900000, items: [mk(R + 'DCIM/Camera/IMG_2100.jpg', 3900000, 25), mk(R + 'WhatsApp/Media/WhatsApp Images/IMG-20260915-WA0001.jpg', 1200000, 20), mk(R + 'Pictures/Screenshots/Screenshot_2026.png', 800000, 18)] },
    { type: 'similar', size: 3000000, items: [mk(R + 'DCIM/Camera/IMG_2111.jpg', 3000000, 22), mk(R + 'DCIM/Camera/IMG_2112.jpg', 2950000, 22)] }
  ];
  function thumb(path) {
    var c = document.createElement('canvas'); c.width = 96; c.height = 96; var x = c.getContext('2d');
    var h = 0; for (var i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) % 360;
    var g = x.createLinearGradient(0, 0, 96, 96); g.addColorStop(0, 'hsl(' + h + ',60%,45%)'); g.addColorStop(1, 'hsl(' + ((h + 60) % 360) + ',65%,70%)');
    x.fillStyle = g; x.fillRect(0, 0, 96, 96); return c.toDataURL('image/jpeg', 0.6);
  }
  window.CleanovaMock = {
    status: function () { return Promise.resolve({ granted: granted, sdk: 34, free: 18.4e9, total: 64e9 }); },
    requestAccess: function () { granted = true; return Promise.resolve({ granted: true }); },
    addListener: function (n, cb) { listeners[n] = cb; return Promise.resolve({ remove: function () { delete listeners[n]; } }); },
    scan: function () {
      return new Promise(function (res) {
        var steps = [['walk', 500, 0], ['walk', 4200, 4200], ['hash', 40, 120], ['hash', 120, 120], ['similar', 30, 60], ['similar', 60, 60]], i = 0;
        var t = setInterval(function () { var s = steps[i++]; if (listeners.progress) listeners.progress({ phase: s[0], done: s[1], total: s[2] }); if (i >= steps.length) { clearInterval(t); res({ groups: JSON.parse(JSON.stringify(groups)), files: 4200 }); } }, 150);
      });
    },
    thumbnail: function (o) { return Promise.resolve({ data: /\.(jpg|png|mp4)$/i.test(o.path) ? thumb(o.path) : '' }); },
    trashMove: function (o) { var b = 0; o.paths.forEach(function (p) { groups.forEach(function (g) { g.items.forEach(function (it) { if (it.path === p) { b += it.size; trash.push({ id: 't' + trash.length, path: '/t/' + p, original: p, size: it.size, ts: Date.now() - 2 * 86400000 }); } }); }); }); return Promise.resolve({ moved: o.paths.length, bytes: b }); },
    trashList: function () { var b = 0; trash.forEach(function (t) { b += t.size; }); return Promise.resolve({ items: trash.slice(), bytes: b }); },
    trashRestore: function (o) { var n = 0; trash = trash.filter(function (t) { if (o.ids.indexOf(t.id) >= 0) { n++; return false; } return true; }); return Promise.resolve({ restored: n }); },
    trashEmpty: function (o) { var f = 0; trash = trash.filter(function (t) { if (!o.ids || o.ids.indexOf(t.id) >= 0) { f += t.size; return false; } return true; }); return Promise.resolve({ freed: f }); }
  };
})();
