/* Test stand-in for the native plugin. Used only when the app runs in a normal browser (or with ?mock), never on the phone. */
(function () {
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && location.search.indexOf('mock') < 0) return;
  if (location.search.indexOf('mock') >= 0) window.CLEANOVA_MOCK = true;
  var granted = location.search.indexOf('nogrant') < 0;
  var trash = [], listeners = {}, cgranted = location.search.indexOf('nocontacts') < 0;
  var cgroups = [
    { reason: 'number', contacts: [{ id: 11, name: 'Ali Khan', numbers: ['0300 1234567', '0321 7654321'] }, { id: 12, name: 'Ali Khan', numbers: ['+92 300 1234567'] }] },
    { reason: 'number', contacts: [{ id: 21, name: 'Ammi', numbers: ['0333 1112223'] }, { id: 22, name: 'Mama Jan', numbers: ['0333-1112223'] }, { id: 23, name: 'Ammi (Home)', numbers: ['03331112223'] }] },
    { reason: 'name', contacts: [{ id: 31, name: 'Ahmed', numbers: ['0345 9998887'] }, { id: 32, name: 'Ahmed', numbers: ['0312 4445556'] }] }
  ];
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
    contactsStatus: function () { return Promise.resolve({ granted: cgranted }); },
    contactsRequest: function () { cgranted = true; return Promise.resolve({ granted: true }); },
    contactsScan: function () { return Promise.resolve({ total: 412, groups: JSON.parse(JSON.stringify(cgroups)) }); },
    contactsBackup: function () { return Promise.resolve({ path: R + 'Cleanova/contacts-backup-20261028-153000.vcf', count: 412 }); },
    contactsMerge: function (o) { return Promise.resolve({ merged: o.groups.length }); },
    contactsDelete: function (o) { return Promise.resolve({ deleted: o.ids.length }); },
    dirs: function () { return Promise.resolve({ dirs: ['DCIM', 'Documents', 'Download', 'Movies', 'Music', 'Pictures', 'WhatsApp'].map(function (n) { return { name: n, path: R + n }; }) }); },
    deleteEmptyDirs: function (o) { return Promise.resolve({ deleted: o.paths.length }); },
    trashPurge: function () { return Promise.resolve(); },
    trashMove: function (o) { var b = 0; o.paths.forEach(function (p) { [].concat(groups.map(function (g) { return g.items; }), Object.keys(extras).map(function (k) { return extras[k].filter ? extras[k].filter(function (x) { return x.path; }) : []; })).forEach(function (items) { items.forEach(function (it) { if (it.path === p) { b += it.size; trash.push({ id: 't' + trash.length, path: '/t/' + p, original: p, size: it.size, ts: Date.now() - 2 * 86400000 }); } }); }); }); return Promise.resolve({ moved: o.paths.length, bytes: b }); },
    trashList: function () { var b = 0; trash.forEach(function (t) { b += t.size; }); return Promise.resolve({ items: trash.slice(), bytes: b }); },
    trashRestore: function (o) { var n = 0; trash = trash.filter(function (t) { if (o.ids.indexOf(t.id) >= 0) { n++; return false; } return true; }); return Promise.resolve({ restored: n }); },
    trashEmpty: function (o) { var f = 0; trash = trash.filter(function (t) { if (!o.ids || o.ids.indexOf(t.id) >= 0) { f += t.size; return false; } return true; }); return Promise.resolve({ freed: f }); }
  };

  window.MonitorMock = (function () {
    var ug = location.search.indexOf('nousage') < 0, lvl = 62, ms = { on: false, limit: 80, low: 15, hot: 42, aLimit: true, aLow: true, aHot: true };
    var ic = function (c) { return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="' + c + '"/></svg>'); };
    var H = 3600000, MBn = 1048576;
    var apps = [['WhatsApp', 'com.whatsapp', '#25D366', 1.6, 9.5], ['YouTube', 'com.google.android.youtube', '#FF0000', 1.2, 7.2], ['Chrome', 'com.android.chrome', '#4285F4', 0.5, 3.4], ['TikTok', 'com.zhiliaoapp.musically', '#111', 0.3, 2.1], ['Taqweem', 'pk.smaa.taqweem', '#14A38B', 0.1, 0.6]];
    return {
      snapshot: function () { lvl = Math.max(5, lvl - (Math.random() < 0.2 ? 1 : 0)); return Promise.resolve({ battery: { level: lvl, charging: location.search.indexOf('charging') >= 0, full: false, plug: location.search.indexOf('charging') >= 0 ? 'ac' : 'none', health: 2, temp: 33.4, voltage: 3915, tech: 'Li-ion', currentUa: -412000, chargeUah: 2650000, saver: false, chargeMs: 2400000 }, ram: { total: 6 * 1024 * MBn * 1024 / 1024 * 1, avail: 2.1 * 1024 * MBn }, storage: { total: 128e9, free: 41e9 }, device: { brand: 'samsung', model: 'SM-A236E', android: '14', sdk: 34, cores: 8, uptime: 3 * 86400000 + 5 * H, abi: 'arm64-v8a' }, net: 'wifi' }); },
      monitorStatus: function () { return Promise.resolve(JSON.parse(JSON.stringify(ms))); },
      monitorSet: function (o) { for (var k in o) ms[k] = o[k]; return Promise.resolve(); },
      monitorStart: function () { ms.on = true; return Promise.resolve(); },
      monitorStop: function () { ms.on = false; return Promise.resolve(); },
      appInfoOpen: function () { return Promise.resolve(); },
      batteryOptOpen: function () { return Promise.resolve(); },
      history: function () { var pts = [], now = Date.now(); for (var i = 0; i < 120; i++) pts.push({ t: now - (120 - i) * 3600000 * 1.4, l: Math.round(50 + 40 * Math.sin(i / 7)), tp: 33, c: Math.sin(i / 7) > 0.6 ? 1 : 0 }); return Promise.resolve({ points: pts }); },
      unusedApps: function () { return Promise.resolve({ count: 2, apps: [{ pkg: 'com.old.game', label: 'Old Game', idleDays: 140, size: 180 * MBn, icon: ic('#a55') }, { pkg: 'com.x.scanner', label: 'PDF Scanner', idleDays: 9999, size: 42 * MBn, icon: ic('#58a') }] }); },
      uninstall: function () { return Promise.resolve(); },
      usageStatus: function () { return Promise.resolve({ granted: ug }); },
      usageRequest: function () { ug = true; return Promise.resolve(); },
      usage: function () { return Promise.resolve({ days: [3.1, 4.2, 2.8, 5.1, 3.7, 4.4, 2.6].map(function (x) { return x * H; }), unlocks: 47, apps: apps.map(function (a) { return { pkg: a[1], label: a[0], icon: ic(a[2]), today: a[3] * H, week: a[4] * H }; }) }); },
      dataUsage: function () { return Promise.resolve({ wifi: [1.1, 0.8, 1.4, 2.2, 0.9, 1.6, 0.7].map(function (x) { return x * 1024 * MBn; }), mobile: [90, 140, 60, 210, 120, 80, 45].map(function (x) { return x * MBn; }), apps: apps.map(function (a, i) { return { pkg: a[1], label: a[0], icon: ic(a[2]), today: a[3] * 100 * MBn, week: a[4] * 300 * MBn, mobile: 0 }; }) }); }
    };
  })();

  window.TravelMock = (function () {
    var perm = location.search.indexOf('noloc') < 0, active = 0, H = 3600000, now = Date.now();
    function route(lat, lon, n, dl, dn) { var a = []; for (var i = 0; i < n; i++) a.push({ t: 0, lat: lat + dl * i / n + Math.sin(i / 6) * 0.002, lon: lon + dn * i / n + Math.cos(i / 9) * 0.002, sp: 12 + (i % 7) }); return a; }
    var trips = [
      { id: now - 2 * 86400000, name: 'Lahore trip', start: now - 2 * 86400000, end: now - 2 * 86400000 + 4.2 * H, distance: 352000, points: 480, maxSpeed: 31, done: true, lat0: 33.68, lon0: 73.04, lat1: 31.52, lon1: 74.35 },
      { id: now - 9 * 86400000, name: '', start: now - 9 * 86400000, end: now - 9 * 86400000 + 0.6 * H, distance: 8400, points: 90, maxSpeed: 14, done: true, lat0: 33.7, lon0: 73.05, lat1: 33.72, lon1: 73.1 }
    ];
    return {
      locStatus: function () { return Promise.resolve({ granted: perm }); },
      locRequest: function () { perm = true; return Promise.resolve({ granted: true }); },
      tripStatus: function () { return Promise.resolve(active ? { active: true, trip: { start: active, distance: 1250, points: 22 } } : { active: false }); },
      tripStart: function () { active = Date.now(); return Promise.resolve({ id: active }); },
      tripStop: function () { active = 0; return Promise.resolve(); },
      tripList: function () { return Promise.resolve({ trips: JSON.parse(JSON.stringify(trips)) }); },
      tripPoints: function (o) { var t = trips.filter(function (x) { return x.id === o.id; })[0]; return Promise.resolve({ points: route(t.lat0, t.lon0, 120, t.lat1 - t.lat0, t.lon1 - t.lon0) }); },
      tripDelete: function (o) { trips = trips.filter(function (x) { return x.id !== o.id; }); return Promise.resolve(); },
      tripRename: function (o) { trips.forEach(function (x) { if (x.id === o.id) x.name = o.name; }); return Promise.resolve(); },
      tripExport: function () { return Promise.resolve({ path: '/storage/emulated/0/Cleanova/trips/trip-20261028-1000.gpx' }); },
      placeName: function (o) { return Promise.resolve({ name: o.lat > 33 ? 'Islamabad' : 'Lahore' }); }
    };
  })();
})();
