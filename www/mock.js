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
  var D = 86400000, MB = 1048576;
  var extras = {
    large: [mk(R + 'Movies/wedding.mp4', 640 * MB, 120), mk(R + 'DCIM/Camera/VID_0099.mp4', 410 * MB, 60), mk(R + 'Download/game.zip', 230 * MB, 200), mk(R + 'WhatsApp/Media/WhatsApp Video/VID-20250101-WA0005.mp4', 95 * MB, 300)],
    wa: [mk(R + 'WhatsApp/Media/WhatsApp Images/IMG-20250101-WA0001.jpg', 300000, 300), mk(R + 'WhatsApp/Media/WhatsApp Images/Sent/IMG-20250201-WA0002.jpg', 250000, 260), mk(R + 'WhatsApp/Media/WhatsApp Video/VID-20250101-WA0005.mp4', 95 * MB, 300), mk(R + 'WhatsApp/Media/WhatsApp Voice Notes/202501/PTT-1.opus', 40000, 280), mk(R + 'WhatsApp/Media/WhatsApp Voice Notes/202501/PTT-2.opus', 52000, 100), mk(R + 'WhatsApp/Media/WhatsApp Documents/fee.pdf', 880000, 150), mk(R + 'WhatsApp/Media/WhatsApp Images/IMG-20260101-WA0009.jpg', 410000, 40)],
    shots: [mk(R + 'Pictures/Screenshots/Screenshot_2025.png', 900000, 400), mk(R + 'Pictures/Screenshots/Screenshot_2026a.png', 700000, 50), mk(R + 'Pictures/Screenshots/Screenshot_2026b.png', 650000, 5)],
    junk: [mk(R + 'Download/app-release.apk', 48 * MB, 80), mk(R + 'DCIM/.tmp/x.tmp', 12000, 30), mk(R + 'Download/file.crdownload', 3 * MB, 90)],
    old: [mk(R + 'Download/invoice.pdf', 220000, 140), mk(R + 'Download/notes.docx', 90000, 95), mk(R + 'Download/photo.jpg', 1.4 * MB, 45)],
    blurry: [{ path: R + 'DCIM/Camera/IMG_3001.jpg', size: 2 * MB, mtime: Date.now() - 9 * D, reason: 'blur' }, { path: R + 'DCIM/Camera/IMG_3002.jpg', size: 1.6 * MB, mtime: Date.now() - 8 * D, reason: 'dark' }],
    empty: [R + 'Old/Empty1', R + 'Misc/Empty2']
  };
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
        var steps = [['walk', 500, 0], ['quality', 30, 60], ['walk', 4200, 4200], ['hash', 40, 120], ['hash', 120, 120], ['similar', 30, 60], ['similar', 60, 60]], i = 0;
        var t = setInterval(function () { var s = steps[i++]; if (listeners.progress) listeners.progress({ phase: s[0], done: s[1], total: s[2] }); if (i >= steps.length) { clearInterval(t); res({ groups: JSON.parse(JSON.stringify(groups)), files: 4200, extras: JSON.parse(JSON.stringify(extras)) }); } }, 150);
      });
    },
    thumbnail: function (o) { return Promise.resolve({ data: /\.(jpg|png|mp4|jpeg)$/i.test(o.path) ? thumb(o.path) : '' }); },
    dirs: function () { return Promise.resolve({ dirs: ['DCIM', 'Documents', 'Download', 'Movies', 'Music', 'Pictures', 'WhatsApp'].map(function (n) { return { name: n, path: R + n }; }) }); },
    deleteEmptyDirs: function (o) { return Promise.resolve({ deleted: o.paths.length }); },
    trashPurge: function () { return Promise.resolve(); },
    trashMove: function (o) { var b = 0; o.paths.forEach(function (p) { [].concat(groups.map(function (g) { return g.items; }), Object.keys(extras).map(function (k) { return extras[k].filter ? extras[k].filter(function (x) { return x.path; }) : []; })).forEach(function (items) { items.forEach(function (it) { if (it.path === p) { b += it.size; trash.push({ id: 't' + trash.length, path: '/t/' + p, original: p, size: it.size, ts: Date.now() - 2 * 86400000 }); } }); }); }); return Promise.resolve({ moved: o.paths.length, bytes: b }); },
    trashList: function () { var b = 0; trash.forEach(function (t) { b += t.size; }); return Promise.resolve({ items: trash.slice(), bytes: b }); },
    trashRestore: function (o) { var n = 0; trash = trash.filter(function (t) { if (o.ids.indexOf(t.id) >= 0) { n++; return false; } return true; }); return Promise.resolve({ restored: n }); },
    trashEmpty: function (o) { var f = 0; trash = trash.filter(function (t) { if (!o.ids || o.ids.indexOf(t.id) >= 0) { f += t.size; return false; } return true; }); return Promise.resolve({ freed: f }); }
  };
})();
