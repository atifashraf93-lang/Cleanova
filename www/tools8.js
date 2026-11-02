/* Cleanova Life: Chat rooms. Anyone with the app can make a room and share its code; others join with the code (open or with admin approval).
   Smart extras: polls, events with RSVP, shared checklists, expense split, replies, reactions, voice notes, photos, location, reminders from text.
   Data lives in the owner's own Firebase project. Messages are NOT end-to-end encrypted. */
window.CLifeInit13 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, V = CL.views, U = CL.u;
  var lget = U.lget, lset = U.lset;
  var FA = function () { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FamilyAlert; };
  var BASE = 'https://firestore.googleapis.com/v1/projects/cleanova-5f6f5/databases/(default)/documents/';
  CL.regTool('chat', '💬', 4, ['چیٹ رومز', 'Chat rooms'], 'daily', ['اپنا چیٹ روم بنائیں، کوڈ سے لوگ شامل ہوں: پول، ایونٹ، لسٹ، خرچ تقسیم، وائس نوٹ', 'Make your own chat room; people join with a code: polls, events, lists, expense split, voice notes'], 'چیٹ روم گروپ میسج واٹس ایپ chat group room polls rsvp voice code رشتہ دار خاندان دوست', true);

  var THEMES = [
    { n: ['رات', 'Night'], bg: 'linear-gradient(165deg,#0b1020,#1b1646 60%,#2a1b5e)', a: '#8b5cf6', b: '#6366f1' },
    { n: ['سمندر', 'Ocean'], bg: 'linear-gradient(165deg,#06141f,#0b3a53 65%,#0e5a6b)', a: '#22d3ee', b: '#3b82f6' },
    { n: ['جنگل', 'Forest'], bg: 'linear-gradient(165deg,#07140f,#0f3a2a 65%,#14532d)', a: '#34d399', b: '#10b981' },
    { n: ['غروب', 'Sunset'], bg: 'linear-gradient(165deg,#1a0b14,#4a1d3a 60%,#7c2d12)', a: '#fb923c', b: '#f43f5e' },
    { n: ['گلاب', 'Rose'], bg: 'linear-gradient(165deg,#1a0a14,#4c1235 65%,#6b1d4f)', a: '#f472b6', b: '#c026d3' },
    { n: ['سلیٹ', 'Slate'], bg: 'linear-gradient(165deg,#0f1115,#1c2230 65%,#262f40)', a: '#94a3b8', b: '#64748b' }
  ];
  var COLS = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#a78bfa', '#f87171', '#a3e635', '#e879f9'];
  var AVS = ['😀', '😎', '🙂', '🤓', '🦁', '🐯', '🦊', '🐼', '🌹', '⭐', '🚀', '🌙'];
  var REACTS = ['👍', '❤️', '😂', '😮', '🙏', '✅'];

  function C() { var c = lget('chat', null) || {}; c.rooms = c.rooms || []; return c; }
  function save(c) { lset('chat', c); }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function colorOf(uid) { return COLS[hash(uid) % COLS.length]; }
  function sheet(h) { var m = $('#modal'); m.hidden = false; $('#sheet').innerHTML = '<div style="max-height:78vh;overflow-y:auto">' + h + '</div>'; return m; }
  function closeSheet() { $('#modal').hidden = true; }
  function th(i) { return THEMES[i] || THEMES[0]; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hm(t) { var d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function dayLabel(t) {
    var d = new Date(t), n = new Date(), y = new Date(Date.now() - 864e5);
    if (d.toDateString() === n.toDateString()) return tt('آج', 'Today');
    if (d.toDateString() === y.toDateString()) return tt('کل', 'Yesterday');
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function fdt(t) { var d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + hm(t); }
  function money(n) { return 'Rs ' + (Math.round(n * 100) / 100).toLocaleString('en-US'); }

  /* ---------- Firestore over REST ---------- */
  function auth() { var p = FA(); if (!p) return Promise.reject(new Error('plugin')); return p.token(); }
  function enc(v) { return typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : (v % 1 === 0 ? { integerValue: String(v) } : { doubleValue: v }); }
  function dec(doc) {
    var o = {}, f = (doc && doc.fields) || {};
    for (var k in f) { var v = f[k]; o[k] = v.stringValue !== undefined ? v.stringValue : v.integerValue !== undefined ? +v.integerValue : v.doubleValue !== undefined ? v.doubleValue : v.booleanValue !== undefined ? v.booleanValue : ''; }
    if (doc && doc.name) o._id = doc.name.split('/').pop();
    return o;
  }
  function req(method, url, bodyObj) {
    return auth().then(function (a) {
      return fetch(url, { method: method, headers: { Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' }, body: bodyObj ? JSON.stringify(bodyObj) : undefined }).then(function (r) {
        return r.text().then(function (t) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return t ? JSON.parse(t) : {}; });
      });
    });
  }
  function api(method, path, obj, q) {
    var url = BASE + path + (q || ''), body = null;
    if (obj) {
      var f = {}; Object.keys(obj).forEach(function (k) { f[k] = enc(obj[k]); }); body = { fields: f };
      if (method === 'PATCH') url += (q ? '&' : '?') + Object.keys(obj).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
    }
    return req(method, url, body);
  }
  function query(parent, coll, field, op, val, dir, limit) {
    var sq = { from: [{ collectionId: coll }], orderBy: [{ field: { fieldPath: field }, direction: dir }], limit: limit };
    if (op) sq.where = { fieldFilter: { field: { fieldPath: field }, op: op, value: { integerValue: String(val) } } };
    return req('POST', BASE + parent + ':runQuery', { structuredQuery: sq }).then(function (r) { return (r || []).filter(function (x) { return x.document; }).map(function (x) { return dec(x.document); }); });
  }
  function myUid() { return auth().then(function (a) { return a.uid; }); }
  function mkCode() { var al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = ''; (window.crypto || window.msCrypto).getRandomValues(b); for (var i = 0; i < 8; i++) s += al[b[i] % al.length]; return s; }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function notifPerm() { try { if (CL.LN && CL.LN.requestPermissions) CL.LN.requestPermissions().catch(function () {}); } catch (e) { /* ignore */ } }
  function sync() {
    var c = C(), p = FA(); if (!p || !p.chatSetup) return;
    p.chatSetup({ rooms: JSON.stringify(c.rooms.map(function (r) { return { c: r.code, n: r.name, p: !!c.hide }; })), fast: !!c.fast, quiet: c.q && c.q.on ? (c.q.from || '22:00') + '-' + (c.q.to || '07:00') : '', muted: JSON.stringify(c.mut || []) }).catch(function () {});
  }
  function failMsg(e) {
    CL.toast(e && e.status === 403 ? 'اجازت نہیں یا Firebase rules نہیں لگے' : 'انٹرنیٹ یا Firebase کا مسئلہ', e && e.status === 403 ? 'Not allowed, or Firebase rules not set' : 'Internet or Firebase problem');
  }

  /* ---------- look ---------- */
  function css() {
    if (document.getElementById('chcss')) return;
    var s = document.createElement('style'); s.id = 'chcss';
    s.textContent = '.chw{display:flex;flex-direction:column;margin:-8px -18px -22px;height:calc(100% + 30px);min-height:380px;position:relative;color:#f1f5f9}' +
      '.chh{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(0,0,0,.28);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.08);direction:ltr}' +
      '.chh .nm{flex:1;min-width:0;font-size:12.5px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.chh button{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.09);font-size:17px;color:#fff}' +
      '.chpin{padding:6px 12px;font-size:12.5px;background:rgba(250,204,21,.13);border-bottom:1px solid rgba(250,204,21,.25);color:#fde68a;direction:auto;max-height:44px;overflow:hidden}' +
      '.chm{flex:1;overflow-y:auto;padding:10px 10px 6px;display:flex;flex-direction:column;gap:2px;scroll-behavior:smooth}' +
      '.chr{display:flex;gap:6px;align-items:flex-end;direction:ltr;animation:chin .22s ease-out}' +
      '.chr.me{justify-content:flex-end}' +
      '@keyframes chin{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}' +
      '.cav{width:30px;height:30px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#0b1020}' +
      '.cbb{max-width:80%;min-width:60px;padding:7px 10px 5px;border-radius:18px;font-size:15px;line-height:1.5;position:relative;word-wrap:break-word;overflow-wrap:anywhere;direction:auto;text-align:start;font-family:system-ui,sans-serif}' +
      '.chr:not(.me) .cbb{background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.1);border-bottom-left-radius:6px;backdrop-filter:blur(6px)}' +
      '.chr.me .cbb{border-bottom-right-radius:6px;color:#fff}' +
      '.cwho{font-size:12px;font-weight:700;margin-bottom:1px}' +
      '.cmt{font-size:10.5px;opacity:.7;text-align:end;margin-top:1px;direction:ltr;white-space:nowrap}' +
      '.ctk.rd{color:#7dd3fc;opacity:1}' +
      '.chsy{align-self:center;font-size:12px;background:rgba(0,0,0,.3);padding:3px 12px;border-radius:12px;margin:6px 0;color:#cbd5e1}' +
      '.chdy{align-self:center;font-size:12px;background:rgba(255,255,255,.12);padding:2px 12px;border-radius:12px;margin:8px 0;color:#e2e8f0}' +
      '.crp{border-inline-start:3px solid;background:rgba(0,0,0,.22);border-radius:8px;padding:3px 8px;margin-bottom:4px;font-size:12.5px;opacity:.9;max-height:40px;overflow:hidden}' +
      '.cimg{max-width:100%;max-height:260px;border-radius:12px;display:block;margin:2px 0}' +
      '.cch{display:inline-block;margin:3px 3px 0 0;padding:2px 8px;border-radius:12px;background:rgba(255,255,255,.14);font-size:13px;border:1px solid transparent}' +
      '.cch.on{border-color:rgba(255,255,255,.6);background:rgba(255,255,255,.24)}' +
      '.ccard{min-width:210px}.ccard b{display:block;margin-bottom:4px}' +
      '.cbar{position:relative;margin:4px 0;border-radius:10px;background:rgba(0,0,0,.25);overflow:hidden;padding:6px 10px;font-size:14px;direction:auto}' +
      '.cbar i{position:absolute;inset:0 auto 0 0;background:rgba(255,255,255,.2);transition:width .4s;z-index:0;max-width:100%}' +
      '.cbar span{position:relative;z-index:1;display:flex;justify-content:space-between;gap:8px}' +
      '.cbar.on{outline:2px solid rgba(255,255,255,.7)}' +
      '.cbtn{display:inline-block;margin:3px 3px 0 0;padding:5px 12px;border-radius:12px;background:rgba(255,255,255,.16);font-size:13.5px;font-weight:600;color:#fff}' +
      '.cbtn.on{background:rgba(255,255,255,.4)}' +
      '.cmen{color:#7dd3fc;font-weight:700}.clk{color:#7dd3fc;text-decoration:underline}' +
      '.csug{align-self:flex-end;margin:2px 0 4px;padding:4px 12px;border-radius:14px;background:rgba(250,204,21,.18);color:#fde68a;font-size:12.5px;border:1px solid rgba(250,204,21,.4)}' +
      '.chc{display:flex;align-items:flex-end;gap:6px;padding:8px;background:rgba(0,0,0,.35);backdrop-filter:blur(8px);direction:ltr}' +
      '.chc textarea{flex:1;min-height:42px;max-height:110px;resize:none;border-radius:22px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);color:#fff;padding:10px 14px;font:inherit;font-family:system-ui,sans-serif;font-size:15.5px;direction:auto}' +
      '.chc textarea::placeholder{color:#94a3b8}' +
      '.chc .ib{width:42px;height:42px;border-radius:50%;flex:none;font-size:19px;background:rgba(255,255,255,.12);color:#fff}' +
      '.chc .sd{background:linear-gradient(135deg,var(--ca),var(--cb));animation:chpop .25s}' +
      '@keyframes chpop{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}' +
      '.cdots span{display:inline-block;width:5px;height:5px;margin:0 1px;border-radius:50%;background:#cbd5e1;animation:chdt 1s infinite}.cdots span:nth-child(2){animation-delay:.15s}.cdots span:nth-child(3){animation-delay:.3s}' +
      '@keyframes chdt{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}' +
      '.crb{display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(255,255,255,.1);font-size:13px;border-top:1px solid rgba(255,255,255,.1);direction:auto}' +
      '.crb b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:400}' +
      '.crec{animation:chdt 1s infinite;color:#f87171}' +
      '.chrm{display:flex;align-items:center;gap:12px;padding:12px;margin:8px 0;border-radius:18px;color:#fff;position:relative;overflow:hidden;cursor:pointer}' +
      '.chrm .cav{width:46px;height:46px;font-size:22px}' +
      '.chrm small{display:block;opacity:.75;font-size:12px}' +
      '.chsh .r{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}' +
      '.chsh .r .t{flex:1;min-width:0}' +
      '.chsh .g{margin:14px 0 6px;font-size:12px;font-weight:700;color:var(--mut);letter-spacing:.4px}';
    document.head.appendChild(s);
  }

  /* ---------- smart helpers ---------- */
  function linkify(raw) {
    var me = (C().name || '').toLowerCase();
    return esc(raw).replace(/(https?:\/\/[^\s<]+)|(\+?\d[\d\s\-]{7,14}\d)|(^|\s)@([\w؀-ۿ]+)/g, function (m, url, ph, sp, nm) {
      if (url) return '<a class="clk" data-a="link" data-u="' + url + '">' + url + '</a>';
      if (ph) return '<a class="clk" data-a="call" data-u="' + ph.replace(/[^\d+]/g, '') + '">' + ph + '</a>';
      return sp + '<span class="cmen">@' + nm + '</span>';
    });
  }
  function parseWhen(t) {
    var s = String(t || '').toLowerCase(), now = new Date(), d = new Date(now), day = -1, hh = -1, mm = 0, m;
    if (/(\bkal\b|tomorrow|کل)/.test(s)) day = 1; else if (/(\baaj\b|\btoday\b|آج)/.test(s)) day = 0; else if (/(parso|parson|پرسوں)/.test(s)) day = 2;
    if ((m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})\b(?!\d)/)) && +m[1] <= 31 && +m[2] <= 12) { d.setMonth(+m[2] - 1, +m[1]); if (d < now && !/\d{4}/.test(s)) d.setFullYear(d.getFullYear() + 1); day = -2; }
    if ((m = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje|bje|بجے)/))) { hh = +m[1]; mm = +(m[2] || 0); if (m[3] === 'pm' && hh < 12) hh += 12; else if (m[3] === 'am' && hh === 12) hh = 0; else if (m[3] !== 'am' && m[3] !== 'pm' && hh >= 1 && hh <= 6) hh += 12; }
    else if ((m = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) { hh = +m[1]; mm = +m[2]; }
    if (hh < 0 || hh > 23 || (day === -1 && !/(\d\s*(am|pm|baje|bje|بجے)|:\d\d)/.test(s))) return 0;
    if (day >= 0) d.setDate(now.getDate() + day);
    d.setHours(hh, mm, 0, 0);
    if (day === -1 && d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
    return d.getTime() > now.getTime() + 60000 ? d.getTime() : 0;
  }
  function remind(at, title, body) {
    var id = 8000 + Math.floor(Math.random() * 900000);
    U.scheduleLN([{ id: id, title: title, body: body, schedule: { at: new Date(at), allowWhileIdle: true } }]).then(function (ok) {
      CL.toast(ok ? 'یاددہانی لگ گئی: ' + fdt(at) : 'نوٹیفکیشن کی اجازت نہیں', ok ? 'Reminder set: ' + fdt(at) : 'No notification permission');
    });
  }
  function sure(msg, yes) {
    sheet('<div class="chsh"><b style="font-size:17px">' + msg + '</b><div style="display:flex;gap:8px;margin-top:14px"><button class="btn o" id="sux" style="flex:1;margin:0">' + tt('نہیں', 'No') + '</button><button class="btn" id="suy" style="flex:1;margin:0;background:var(--red)">' + tt('ہاں', 'Yes') + '</button></div></div>');
    $('#sux').onclick = closeSheet; $('#suy').onclick = function () { closeSheet(); yes(); };
  }
  function shareText(t) { if (navigator.share) navigator.share({ text: t }).catch(function () {}); else { try { navigator.clipboard.writeText(t); } catch (e) { /* ignore */ } CL.toast('کاپی ہو گیا', 'Copied'); } }
  function inviteText(code, name) { return tt('💬 "' + name + '" چیٹ روم میں شامل ہوں:\nCleanova Life ایپ کھولیں ← چیٹ رومز ← کوڈ سے شامل ہوں\nکوڈ: ', '💬 Join the "' + name + '" chat room:\nOpen Cleanova Life → Chat rooms → Join with code\nCode: ') + code; }

  /* ---------- room list ---------- */
  var LST = { info: {}, tm: 0 };
  function privacySheet(after) {
    sheet('<div class="chsh"><b style="font-size:17px">🔒 ' + tt('رازداری کا نوٹس', 'Privacy notice') + '</b><p class="note" style="line-height:1.9">' +
      tt('• یہ چیٹ سروس اینڈ ٹو اینڈ انکرپٹڈ نہیں ہے۔ میسج ایپ کے اپنے Firebase ڈیٹا بیس میں رہتے ہیں۔<br>• روم کا کوڈ جس کے پاس ہو وہ شامل ہونے کی درخواست دے سکتا ہے۔ منتظم منظوری لگا سکتا ہے یا نئے لوگ بند کر سکتا ہے۔<br>• پاس ورڈ، OTP، بینک یا شناختی کارڈ کی معلومات کبھی چیٹ میں نہ بھیجیں۔<br>• آپ کی شناخت ایک گمنام آئی ڈی ہے؛ ایپ کا ڈیٹا صاف کرنے سے رومز کا رابطہ ٹوٹ جاتا ہے، اس لیے کوڈ محفوظ رکھیں۔<br>• میڈیا (تصویر/آواز) چھوٹا کر کے بھیجا جاتا ہے۔ اشتہار نہیں، کوئی ٹریکنگ نہیں۔', '• This chat is NOT end-to-end encrypted. Messages are kept in the app\'s own Firebase database.<br>• Anyone who has a room code can ask to join. The admin can require approval or stop new members.<br>• Never send passwords, OTPs, bank or ID details in chat.<br>• Your identity is an anonymous ID; clearing the app data disconnects your rooms, so keep your codes.<br>• Photos/voice are sent shrunk. No ads, no tracking.') + '</p><button class="btn" id="chok">' + tt('سمجھ گیا', 'I understand') + '</button></div>');
    $('#chok').onclick = function () { var c = C(); c.ok = 1; save(c); closeSheet(); if (after) after(); };
  }
  function ensureName(cb) {
    var c = C();
    if (c.name) return cb();
    sheet('<div class="chsh"><b style="font-size:17px">' + tt('آپ کا نام', 'Your name') + '</b><p class="note">' + tt('چیٹ میں یہی نام دکھے گا۔', 'This name shows in chats.') + '</p><input class="inp" id="chn" maxlength="24" placeholder="' + tt('نام', 'Name') + '"><div style="margin:10px 0;display:flex;flex-wrap:wrap;gap:6px" id="chav">' + AVS.map(function (a, i) { return '<button class="sbtn' + (i === 0 ? ' p' : '') + '" data-av="' + a + '" style="min-width:44px">' + a + '</button>'; }).join('') + '</div><button class="btn" id="chnok">' + tt('محفوظ کریں', 'Save') + '</button></div>');
    var av = AVS[0];
    [].forEach.call(document.querySelectorAll('[data-av]'), function (b) { b.onclick = function () { av = b.dataset.av; [].forEach.call(document.querySelectorAll('[data-av]'), function (x) { x.className = 'sbtn' + (x === b ? ' p' : ''); }); }; });
    $('#chnok').onclick = function () { var n = $('#chn').value.trim(); if (!n) { CL.toast('نام لکھیں', 'Enter a name'); return; } c.name = n; c.av = av; save(c); closeSheet(); cb(); };
  }
  function vChat() {
    css(); CL.setTop(T('چیٹ رومز', 'Chat rooms')); clearInterval(LST.tm);
    var c = C();
    var h = '<div class="card" style="margin-top:8px;background:linear-gradient(145deg,#312e81,#4c1d95);border:0;color:#fff"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:34px">💬</span><div style="flex:1"><b style="font-size:17px">' + tt('چیٹ رومز', 'Chat rooms') + '</b><small style="display:block;opacity:.8;font-size:12.5px;line-height:1.6">' + tt('اپنا روم بنائیں، کوڈ شیئر کریں، دوست اور رشتہ دار شامل ہوں', 'Make a room, share the code, friends and family join') + '</small></div><button class="sbtn" id="chst" style="min-width:44px;background:rgba(255,255,255,.15);border:0;color:#fff">⚙️</button></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px"><button class="sbtn p" id="chnew" style="flex:1;justify-content:center">➕ ' + tt('نیا روم', 'New room') + '</button><button class="sbtn" id="chjn" style="flex:1;justify-content:center;background:rgba(255,255,255,.15);border:0;color:#fff">🔑 ' + tt('کوڈ سے شامل ہوں', 'Join with code') + '</button></div></div>';
    if (!c.rooms.length) h += '<div class="card center"><p class="mut" style="line-height:1.8">' + tt('ابھی کوئی روم نہیں۔ "نیا روم" سے اپنا روم بنائیں یا کسی کا بھیجا ہوا کوڈ ڈال کر شامل ہوں۔', 'No rooms yet. Make one with "New room" or join with a code someone sent you.') + '</p></div>';
    h += c.rooms.map(function (r) {
      var t = th(r.th || 0), i = LST.info[r.code] || {}, tag = i.gone ? tt('ختم', 'gone') : i.wait ? tt('منظوری کا انتظار', 'awaiting approval') : i.closed ? tt('بند', 'closed') : r.admin ? tt('آپ منتظم ہیں', 'You are admin') : '';
      return '<div class="chrm" data-room="' + r.code + '" style="background:' + t.bg + '"><div class="cav" style="background:linear-gradient(135deg,' + t.a + ',' + t.b + ')">' + esc((r.name || '?').charAt(0).toUpperCase()) + '</div><div style="flex:1;min-width:0"><b>' + esc(r.name) + '</b><small dir="ltr">' + esc(r.code) + (tag ? ' · ' + tag : '') + '</small></div>' + ((c.mut || []).indexOf(r.code) >= 0 ? '<span>🔕</span>' : '') + '<span style="opacity:.7">›</span></div>';
    }).join('');
    h += '<p class="note">' + tt('🔒 یہ چیٹ اینڈ ٹو اینڈ انکرپٹڈ نہیں؛ حساس معلومات نہ بھیجیں۔', '🔒 Not end-to-end encrypted; do not send sensitive info.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    $('#chst').onclick = settings; $('#chnew').onclick = function () { gate(newSheet); }; $('#chjn').onclick = function () { gate(joinSheet); };
    [].forEach.call(document.querySelectorAll('[data-room]'), function (b) { b.onclick = function () { openRoom(b.dataset.room); }; });
    /* status of each room (a couple of small reads) */
    myUid().then(function (uid) {
      c.rooms.forEach(function (r) {
        Promise.all([api('GET', 'rooms/' + r.code), api('GET', 'rooms/' + r.code + '/members/' + uid).catch(function () { return null; })]).then(function (x) {
          var rm = dec(x[0]), me = x[1] ? dec(x[1]) : null; LST.info[r.code] = { closed: rm.closed === true, wait: !!(me && !me.ok) };
          if (S.view === 'chat') { var el = document.querySelector('[data-room="' + r.code + '"] small'); if (el) { var i = LST.info[r.code]; el.innerHTML = esc(r.code) + (i.wait ? ' · ' + tt('منظوری کا انتظار', 'awaiting approval') : i.closed ? ' · ' + tt('بند', 'closed') : r.admin ? ' · ' + tt('آپ منتظم ہیں', 'You are admin') : ''); } }
        }).catch(function (e) { if (e && e.status === 404) { LST.info[r.code] = { gone: true }; } });
      });
    }).catch(function () {});
  }
  function gate(fn) { var c = C(); if (!c.ok) privacySheet(function () { ensureName(fn); }); else ensureName(fn); }
  function addRoom(code, name, admin, themeIdx) {
    var c = C(); if (!c.rooms.some(function (r) { return r.code === code; })) c.rooms.push({ code: code, name: name, admin: !!admin, th: themeIdx || 0 }); save(c); sync(); notifPerm();
  }
  function newSheet() {
    var sel = 0;
    sheet('<div class="chsh"><b style="font-size:17px">' + tt('نیا چیٹ روم', 'New chat room') + '</b><input class="inp" id="rn" maxlength="30" placeholder="' + tt('روم کا نام (مثلاً خاندان، دفتر)', 'Room name (e.g. Family, Office)') + '" style="margin-top:10px">' +
      '<div class="g">' + tt('نئے لوگ', 'NEW MEMBERS') + '</div><div style="display:flex;gap:6px"><button class="sbtn p" id="m1" style="flex:1;justify-content:center">' + tt('منظوری کے ساتھ', 'Approval') + '</button><button class="sbtn" id="m2" style="flex:1;justify-content:center">' + tt('کوڈ سے براہِ راست', 'Open (code only)') + '</button></div>' +
      '<div class="g">' + tt('رنگ', 'LOOK') + '</div><div style="display:flex;gap:6px;flex-wrap:wrap" id="tl">' + THEMES.map(function (t, i) { return '<button data-t="' + i + '" style="width:44px;height:44px;border-radius:14px;background:' + t.bg + ';border:3px solid ' + (i === 0 ? '#fff' : 'transparent') + '"></button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn o" id="rx" style="flex:1;margin:0">' + tt('منسوخ', 'Cancel') + '</button><button class="btn" id="ro" style="flex:2;margin:0">' + tt('بنائیں', 'Create') + '</button></div></div>');
    var mode = 'approve';
    $('#m1').onclick = function () { mode = 'approve'; $('#m1').className = 'sbtn p'; $('#m2').className = 'sbtn'; }; $('#m2').onclick = function () { mode = 'open'; $('#m2').className = 'sbtn p'; $('#m1').className = 'sbtn'; };
    [].forEach.call(document.querySelectorAll('[data-t]'), function (b) { b.onclick = function () { sel = +b.dataset.t; [].forEach.call(document.querySelectorAll('[data-t]'), function (x) { x.style.borderColor = x === b ? '#fff' : 'transparent'; }); }; });
    $('#rx').onclick = closeSheet;
    $('#ro').onclick = function () {
      var n = $('#rn').value.trim(); if (!n) { CL.toast('روم کا نام لکھیں', 'Enter a room name'); return; }
      var code = mkCode(), c = C(); $('#ro').disabled = true;
      myUid().then(function (uid) {
        return api('PATCH', 'rooms/' + code, { name: n, admin: uid, mode: mode, closed: false, theme: sel, pin: '', ad: 0, ts: Date.now() }).then(function () {
          return api('PATCH', 'rooms/' + code + '/members/' + uid, { name: c.name, av: c.av || '', role: 'admin', ok: true, ts: Date.now(), seen: Date.now(), typ: 0 });
        });
      }).then(function () { addRoom(code, n, true, sel); closeSheet(); openRoom(code, true); }).catch(function (e) { $('#ro').disabled = false; failMsg(e); });
    };
  }
  function joinSheet() {
    sheet('<div class="chsh"><b style="font-size:17px">' + tt('کوڈ سے شامل ہوں', 'Join with code') + '</b><input class="inp" id="jc" dir="ltr" maxlength="12" placeholder="ABCD2345" style="margin-top:10px;text-transform:uppercase;letter-spacing:3px;text-align:center;font-size:20px"><p class="note">' + tt('روم کے منتظم سے 8 حرفی کوڈ لیں۔', 'Ask the room admin for the 8-letter code.') + '</p><div style="display:flex;gap:8px"><button class="btn o" id="jx" style="flex:1;margin:0">' + tt('منسوخ', 'Cancel') + '</button><button class="btn" id="jo" style="flex:2;margin:0">' + tt('شامل ہوں', 'Join') + '</button></div></div>');
    $('#jx').onclick = closeSheet;
    $('#jo').onclick = function () {
      var code = $('#jc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), c = C(); if (code.length < 6) { CL.toast('کوڈ لکھیں', 'Enter the code'); return; }
      $('#jo').disabled = true;
      Promise.all([api('GET', 'rooms/' + code), myUid()]).then(function (x) {
        var rm = dec(x[0]), uid = x[1];
        if (rm.admin === uid || c.rooms.some(function (r) { return r.code === code; })) { addRoom(code, rm.name, rm.admin === uid, rm.theme); closeSheet(); openRoom(code); return; }
        if (rm.mode === 'shut') { $('#jo').disabled = false; CL.toast('یہ روم نئے لوگوں کے لیے بند ہے', 'This room is closed to new members'); return; }
        return api('PATCH', 'rooms/' + code + '/members/' + uid, { name: c.name, av: c.av || '', role: 'member', ok: rm.mode === 'open', ts: Date.now(), seen: Date.now(), typ: 0 }).then(function () { addRoom(code, rm.name, false, rm.theme); closeSheet(); openRoom(code); });
      }).catch(function (e) { $('#jo').disabled = false; if (e && e.status === 404) CL.toast('یہ کوڈ نہیں ملا', 'Code not found'); else failMsg(e); });
    };
  }
  function settings() {
    var c = C(), q = c.q || { on: false, from: '22:00', to: '07:00' };
    sheet('<div class="chsh"><b style="font-size:17px">⚙️ ' + tt('چیٹ سیٹنگز', 'Chat settings') + '</b>' +
      '<div class="g">' + tt('آپ کا نام', 'YOUR NAME') + '</div><div style="display:flex;gap:6px"><input class="inp" id="sn" maxlength="24" value="' + esc(c.name || '') + '"><button class="sbtn p" id="sns">' + tt('محفوظ', 'Save') + '</button></div>' +
      '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">' + AVS.map(function (a) { return '<button class="sbtn' + (c.av === a ? ' p' : '') + '" data-av2="' + a + '" style="min-width:44px">' + a + '</button>'; }).join('') + '</div>' +
      '<div class="g">' + tt('نوٹیفکیشن', 'NOTIFICATIONS') + '</div>' +
      '<label class="r"><span class="t"><b>⚡ ' + tt('تیز نوٹیفکیشن', 'Fast notifications') + '</b><small class="mut" style="display:block;font-size:12px;line-height:1.6">' + tt('ہر 20 سیکنڈ میں چیک (ایک مستقل چھوٹا نوٹیفکیشن دکھے گا، بیٹری کچھ زیادہ لگے گی). بند ہو تو تقریباً 15 منٹ میں اطلاع ملتی ہے۔', 'Checks every ~20 s (shows a small permanent notification, uses a bit more battery). When off, alerts arrive in ~15 min.') + '</small></span><input type="checkbox" id="sf" ' + (c.fast ? 'checked' : '') + ' style="width:22px;height:22px"></label>' +
      '<label class="r"><span class="t"><b>🌙 ' + tt('خاموش اوقات', 'Quiet hours') + '</b><small class="mut" style="display:block;font-size:12px">' + tt('ان اوقات میں نوٹیفکیشن نہیں', 'No notifications in this window') + '</small></span><input type="checkbox" id="sq" ' + (q.on ? 'checked' : '') + ' style="width:22px;height:22px"></label>' +
      '<div style="display:flex;gap:8px;align-items:center;direction:ltr"><input type="time" class="inp" id="sq1" value="' + q.from + '"> → <input type="time" class="inp" id="sq2" value="' + q.to + '"></div>' +
      '<label class="r"><span class="t"><b>🙈 ' + tt('نوٹیفکیشن میں میسج نہ دکھائیں', 'Hide message text in notifications') + '</b></span><input type="checkbox" id="sh" ' + (c.hide ? 'checked' : '') + ' style="width:22px;height:22px"></label>' +
      '<button class="btn o" id="spv">🔒 ' + tt('رازداری کا نوٹس', 'Privacy notice') + '</button><button class="btn" id="sdn">' + tt('ٹھیک ہے', 'Done') + '</button></div>');
    [].forEach.call(document.querySelectorAll('[data-av2]'), function (b) { b.onclick = function () { c.av = b.dataset.av2; save(c); settings(); }; });
    $('#sns').onclick = function () { var n = $('#sn').value.trim(); if (n) { c.name = n; save(c); CL.toast('محفوظ', 'Saved'); } };
    $('#spv').onclick = function () { privacySheet(settings); };
    $('#sdn').onclick = function () { c.fast = $('#sf').checked; c.q = { on: $('#sq').checked, from: $('#sq1').value || '22:00', to: $('#sq2').value || '07:00' }; c.hide = $('#sh').checked; save(c); sync(); closeSheet(); };
  }

  /* ---------- the room ---------- */
  var R = null, AUD = null;
  function roomRec() { return C().rooms.filter(function (r) { return r.code === (R && R.code); })[0] || { name: 'Chat', th: 0 }; }
  function openRoom(code) {
    R = { code: code, uid: '', room: null, mem: {}, msgs: [], by: {}, acts: {}, lastTs: 0, lastAct: 0, n: 0, q: '', reply: null, typAt: 0, seenAt: 0, hbAt: 0, more: false, dis: {}, state: 'load', rec: null };
    CL.go('chatroom');
  }
  function themeNow() { var l = lget('chatth_' + R.code, null); return th(l !== null && l !== undefined ? l : (R.room && R.room.theme != null ? R.room.theme : roomRec().th)); }
  function isAdmin() { return !!(R && R.room && R.room.admin === R.uid); }
  function okMembers() { return Object.keys(R.mem).map(function (k) { return R.mem[k]; }).filter(function (m) { return m.ok; }); }
  function stopAll() { clearInterval(R && R.tm); if (AUD) { try { AUD.pause(); } catch (e) { /* ignore */ } AUD = null; } if (R && R.rec) { try { R.rec.stop(); } catch (e) { /* ignore */ } R.rec = null; } }

  function vRoom() {
    css(); CL.setNav(false);
    if (!R) { CL.go('chat'); return; }
    var rc = roomRec(); CL.setTop(rc.name);
    var t = themeNow();
    $('#body').innerHTML = '<div class="chw" id="chw" style="background:' + t.bg + ';--ca:' + t.a + ';--cb:' + t.b + '"><div class="chh"><button id="chi">ⓘ</button><div class="nm" id="chnm">…</div><button id="chs">🔍</button></div><div id="chpin"></div><div id="chsr" hidden style="padding:6px 10px;background:rgba(0,0,0,.3)"><input class="inp" id="chq" placeholder="' + tt('میسج تلاش کریں', 'Search messages') + '" style="background:rgba(255,255,255,.1);color:#fff"></div><div class="chm" id="chm"><p style="text-align:center;opacity:.7;margin-top:30px">' + tt('لوڈ ہو رہا ہے…', 'Loading…') + '</p></div><div id="chrp"></div><div class="chc" id="chc" hidden><button class="ib" id="cha">➕</button><textarea id="cht" rows="1" placeholder="' + tt('میسج لکھیں…', 'Message…') + '"></textarea><button class="ib" id="chsd">🎤</button></div></div>';
    $('#chi').onclick = function () { infoSheet(); api('GET', 'rooms/' + R.code + '/members', null, '?pageSize=100').then(function (x) { var o = JSON.stringify(R.mem); R.mem = {}; (x.documents || []).map(dec).forEach(function (m) { R.mem[m._id] = m; }); if (JSON.stringify(R.mem) !== o && !$('#modal').hidden && $('#ish')) infoSheet(); }).catch(function () {}); };
    $('#chs').onclick = function () { var s = $('#chsr'); s.hidden = !s.hidden; if (!s.hidden) $('#chq').focus(); else { R.q = ''; $('#chq').value = ''; paint(); } };
    $('#chq').oninput = function () { R.q = this.value.trim().toLowerCase(); paint(); };
    loadRoom();
  }
  V.chat = vChat; V.chatroom = vRoom;

  function loadRoom() {
    var c = R.code, P = 'rooms/' + c;
    myUid().then(function (uid) {
      R.uid = uid;
      return Promise.all([api('GET', P), api('GET', P + '/members/' + uid).catch(function (e) { if (e.status === 404 || e.status === 403) return null; throw e; })]);
    }).then(function (x) {
      R.room = dec(x[0]); var me = x[1] ? dec(x[1]) : null;
      if (!me && R.room.admin !== R.uid) { R.state = 'out'; return; }
      R.me = me; R.mem[R.uid] = me || {};
      if (me && !me.ok) { R.state = 'wait'; return; }
      return Promise.all([api('GET', P + '/members', null, '?pageSize=100'), query(P, 'msgs', 'ts', null, 0, 'DESCENDING', 40), query(P, 'acts', 'ts', null, 0, 'DESCENDING', 150).catch(function () { return []; })]).then(function (r) {
        R.mem = {}; (r[0].documents || []).map(dec).forEach(function (m) { R.mem[m._id] = m; });
        r[1].reverse().forEach(addMsg); R.more = r[1].length >= 40;
        r[2].forEach(function (a) { R.acts[a._id] = a; R.lastAct = Math.max(R.lastAct, a.ts || 0); });
        R.state = 'ok';
        autoDelete();
      });
    }).catch(function (e) { R.state = e && e.status === 404 ? 'gone' : 'err'; R.errStatus = e && e.status; }).then(function () { if (S.view === 'chatroom') start(); });
  }
  function addMsg(m) { if (!m || R.by[m._id]) return false; R.by[m._id] = m; R.msgs.push(m); R.lastTs = Math.max(R.lastTs, m.ts || 0); return true; }
  function autoDelete() {
    var days = +(R.room && R.room.ad) || 0; if (!days) return;
    var cut = Date.now() - days * 864e5; R.cut = cut;
    if (isAdmin()) query('rooms/' + R.code, 'msgs', 'ts', 'LESS_THAN', cut, 'ASCENDING', 30).then(function (old) { old.forEach(function (m) { api('DELETE', 'rooms/' + R.code + '/msgs/' + m._id).catch(function () {}); }); }).catch(function () {});
  }

  function start() {
    var el = $('#chm'); if (!el) return;
    if (R.state === 'wait' || R.state === 'out' || R.state === 'gone' || R.state === 'err') {
      var msg = R.state === 'wait' ? ['⏳', tt('منظوری کا انتظار', 'Waiting for approval'), tt('روم کے منتظم کو آپ کی درخواست منظور کرنی ہو گی۔ منظور ہوتے ہی چیٹ کھل جائے گی۔', 'The room admin must approve your request. The chat opens as soon as you are approved.')] :
        R.state === 'out' ? ['🚪', tt('آپ اس روم میں نہیں', 'You are not in this room'), tt('منتظم نے آپ کو ہٹا دیا ہے یا درخواست مسترد ہوئی۔', 'The admin removed you or declined your request.')] :
        R.state === 'gone' ? ['🫥', tt('یہ روم موجود نہیں', 'This room no longer exists'), ''] : ['📡', tt('لوڈ نہیں ہو سکا', 'Could not load'), R.errStatus === 403 ? tt('رسائی نہیں ملی یا Firebase rules نہیں لگے۔', 'No access, or Firebase rules are not set.') : tt('انٹرنیٹ چیک کریں۔', 'Check your internet.')];
      el.innerHTML = '<div style="text-align:center;margin:40px 16px"><div style="font-size:44px">' + msg[0] + '</div><b style="font-size:17px">' + msg[1] + '</b><p style="opacity:.8;line-height:1.8">' + msg[2] + '</p><button class="sbtn p" id="chre" style="margin:6px">' + tt('دوبارہ دیکھیں', 'Check again') + '</button>' + (R.state !== 'wait' ? '<button class="sbtn r" id="chrm" style="margin:6px">' + tt('فہرست سے ہٹائیں', 'Remove from list') + '</button>' : '') + '</div>';
      $('#chnm').textContent = '';
      $('#chre').onclick = function () { R.state = 'load'; loadRoom(); };
      if ($('#chrm')) $('#chrm').onclick = function () { dropLocal(); CL.go('chat'); };
      return;
    }
    $('#chc').hidden = false; wireComposer(); head();
    paint(true);
    clearInterval(R.tm); R.tm = setInterval(tick, 4000);
    beat(true);
  }
  function dropLocal() { var c = C(); c.rooms = c.rooms.filter(function (r) { return r.code !== R.code; }); save(c); sync(); }

  function head() {
    var n = $('#chnm'); if (!n) return; var now = Date.now();
    var typing = Object.keys(R.mem).filter(function (u) { return u !== R.uid && (R.mem[u].typ || 0) > now - 6000; }).map(function (u) { return R.mem[u].name; });
    var oks = okMembers(), on = oks.filter(function (m) { return (m.seen || 0) > now - 100000; }).length;
    n.innerHTML = typing.length ? '<span class="cdots"><span></span><span></span><span></span></span> ' + esc(typing.join(', ')) + ' ' + tt('لکھ رہا ہے', 'typing') : '👥 ' + oks.length + ' · 🟢 ' + Math.max(on, 1) + (R.room.closed ? ' · 🔒 ' + tt('بند', 'closed') : '');
    var p = $('#chpin'); if (p) p.innerHTML = R.room.pin ? '<div class="chpin">📌 ' + linkify(R.room.pin) + '</div>' : '';
    if ($('#chc')) { var closed = R.room.closed === true; $('#cht').disabled = closed; $('#cht').placeholder = closed ? tt('روم بند ہے', 'Room is closed') : tt('میسج لکھیں…', 'Message…'); }
  }
  function beat(force) {
    var now = Date.now(); if (!force && now - R.hbAt < 55000) return; R.hbAt = now;
    api('PATCH', 'rooms/' + R.code + '/members/' + R.uid, { ts: now, seen: now }).catch(function () {});
  }
  function tick() {
    if (S.view !== 'chatroom' || !R) { stopAll(); return; }
    if (document.hidden || R.busy) return;
    R.busy = true; R.n++; var P = 'rooms/' + R.code, jobs = [];
    jobs.push(query(P, 'msgs', 'ts', 'GREATER_THAN', Math.max(0, R.lastTs - 10000), 'ASCENDING', 60).then(function (ms) {
      var fresh = 0, others = 0; ms.forEach(function (m) { if (addMsg(m)) { fresh++; if (m.uid !== R.uid) others++; } });
      R.msgs.sort(function (a, b) { return a.ts - b.ts; });
      if (fresh) { paint(); if (others) { var now = Date.now(); if (now - R.seenAt > 4000) { R.seenAt = now; api('PATCH', P + '/members/' + R.uid, { seen: now }).catch(function () {}); } } }
    }));
    if (R.n % 2 === 0) jobs.push(query(P, 'acts', 'ts', 'GREATER_THAN', Math.max(0, R.lastAct - 10000), 'ASCENDING', 100).then(function (as) {
      var ch = false; as.forEach(function (a) { var o = R.acts[a._id]; if (!o || o.ts !== a.ts || o.v !== a.v) { R.acts[a._id] = a; ch = true; } R.lastAct = Math.max(R.lastAct, a.ts || 0); });
      if (ch) paint();
    }));
    if (R.n % 2 === 1) jobs.push(Promise.all([api('GET', P), api('GET', P + '/members', null, '?pageSize=100')]).then(function (x) {
      R.room = dec(x[0]); var old = JSON.stringify(R.mem); R.mem = {}; (x[1].documents || []).map(dec).forEach(function (m) { R.mem[m._id] = m; });
      if (!R.mem[R.uid] && !isAdmin()) { R.state = 'out'; stopAll(); start(); return; }
      head(); if (JSON.stringify(R.mem) !== old) paint();
    }));
    beat();
    Promise.all(jobs.map(function (j) { return j.catch(function () {}); })).then(function () { R.busy = false; });
  }

  /* ---------- drawing the messages ---------- */
  function actIndex() {
    var A = {};
    Object.keys(R.acts).forEach(function (id) {
      var a = R.acts[id]; if (!a.m) return; var o = A[a.m] = A[a.m] || { v: {}, e: {}, c: {}, r: {} };
      if (a.ak === 'v') { try { o.v[a.uid] = JSON.parse(a.v); } catch (e) { /* ignore */ } }
      else if (a.ak === 'e') o.e[a.uid] = a.v;
      else if (a.ak === 'c') o.c[a.x] = { done: a.v === '1', n: a.n };
      else if (a.ak === 'r' && a.v) o.r[a.uid] = a.v;
    });
    return A;
  }
  function memName(u) { return (R.mem[u] && R.mem[u].name) || '?'; }
  function ticks(m) {
    if (m._f) return '<span class="ctk">⚠️</span>'; if (m._p) return '<span class="ctk">⏳</span>';
    var others = okMembers().filter(function (x) { return x._id !== R.uid; });
    var all = others.length && others.every(function (x) { return (x.seen || 0) >= m.ts; });
    return '<span class="ctk' + (all ? ' rd' : '') + '">' + (all ? '✓✓' : '✓') + '</span>';
  }
  function body(m, A) {
    var k = m.k || 'text', a = A[m._id] || { v: {}, e: {}, c: {}, r: {} }, d = {};
    try { if (k === 'poll' || k === 'event' || k === 'list' || k === 'exp') d = JSON.parse(m.d || '{}'); } catch (e) { d = {}; }
    if (k === 'img') return '<img class="cimg" data-a="img" data-i="' + m._id + '" src="' + m.d + '">' + (m.t ? '<div>' + linkify(m.t) + '</div>' : '');
    if (k === 'voice') return '<button class="cbtn" data-a="play" data-i="' + m._id + '">▶ ' + esc(m.t || '🎤') + '</button>';
    if (k === 'loc') return '<div class="ccard"><b>📍 ' + tt('لوکیشن', 'Location') + '</b><button class="cbtn" data-a="loc" data-u="' + esc(m.t) + '">🗺 ' + tt('نقشے میں کھولیں', 'Open in Maps') + '</button></div>';
    if (k === 'poll') {
      var voters = Object.keys(a.v), tot = 0, cnt = (d.o || []).map(function (_, i) { var n = voters.filter(function (u) { return a.v[u].indexOf(i) >= 0; }).length; tot += n; return n; }), mine = a.v[R.uid] || [];
      return '<div class="ccard"><b>📊 ' + esc(d.q) + '</b>' + (d.o || []).map(function (o, i) { var pct = voters.length ? Math.round(cnt[i] * 100 / voters.length) : 0; return '<div class="cbar' + (mine.indexOf(i) >= 0 ? ' on' : '') + '" data-a="vote" data-i="' + m._id + '" data-x="' + i + '"><i style="width:' + pct + '%"></i><span><span>' + esc(o) + '</span><span>' + cnt[i] + '</span></span></div>'; }).join('') + '<small style="opacity:.7">' + voters.length + ' ' + tt('ووٹر', 'voters') + (d.mu ? ' · ' + tt('ایک سے زیادہ', 'multiple') : '') + '</small></div>';
    }
    if (k === 'event') {
      var cnts = { y: [], m: [], n: [] }; Object.keys(a.e).forEach(function (u) { if (cnts[a.e[u]]) cnts[a.e[u]].push(memName(u)); });
      return '<div class="ccard"><b>📅 ' + esc(d.t) + '</b><div>🕒 ' + fdt(d.w) + '</div>' + (d.p ? '<div>📍 ' + esc(d.p) + '</div>' : '') +
        ['y', 'm', 'n'].map(function (x) { return '<button class="cbtn' + (a.e[R.uid] === x ? ' on' : '') + '" data-a="rsvp" data-i="' + m._id + '" data-x="' + x + '">' + (x === 'y' ? '✅ ' + tt('آؤں گا', 'Going') : x === 'm' ? '🤔 ' + tt('شاید', 'Maybe') : '❌ ' + tt('نہیں', 'No')) + ' ' + cnts[x].length + '</button>'; }).join('') +
        (cnts.y.length ? '<div style="font-size:12.5px;opacity:.85;margin-top:4px">✅ ' + esc(cnts.y.join('، ')) + '</div>' : '') + '<button class="cbtn" data-a="evrem" data-i="' + m._id + '">⏰ ' + tt('یاددہانی', 'Remind me') + '</button></div>';
    }
    if (k === 'list') {
      var done = (d.it || []).filter(function (_, i) { return a.c[i] && a.c[i].done; }).length;
      return '<div class="ccard"><b>✅ ' + esc(d.t) + ' <small style="opacity:.7">' + done + '/' + (d.it || []).length + '</small></b>' + (d.it || []).map(function (it, i) { var c = a.c[i] || {}; return '<div class="cbar' + (c.done ? ' on' : '') + '" data-a="chk" data-i="' + m._id + '" data-x="' + i + '"><span><span style="' + (c.done ? 'text-decoration:line-through;opacity:.7' : '') + '">' + (c.done ? '☑' : '☐') + ' ' + esc(it) + '</span><span style="font-size:11px;opacity:.7">' + (c.done ? esc(c.n || '') : '') + '</span></span></div>'; }).join('') + '</div>';
    }
    if (k === 'exp') {
      var n = (d.parts || []).length || 1;
      return '<div class="ccard"><b>💸 ' + esc(d.t) + '</b><div style="font-size:18px;font-weight:700">' + money(d.amt) + '</div><div style="font-size:13px;opacity:.85">' + tt('ادا کرنے والا: ', 'Paid by: ') + esc(m.n) + '<br>' + tt('تقسیم: ', 'Split: ') + n + ' · ' + tt('فی کس ', 'each ') + money(d.amt / n) + '</div></div>';
    }
    return linkify(m.t || '').replace(/\n/g, '<br>');
  }
  function bubble(m, prev, A) {
    if (m.k === 'sys') return '<div class="chsy">' + esc(m.t) + '</div>';
    var me = m.uid === R.uid, col = colorOf(m.uid), mem = R.mem[m.uid] || {}, grp = prev && prev.uid === m.uid && prev.k !== 'sys' && m.ts - prev.ts < 180000 && new Date(prev.ts).toDateString() === new Date(m.ts).toDateString();
    var t = themeNow(), a = (A[m._id] || { r: {} }).r, rc = {}; Object.keys(a).forEach(function (u) { rc[a[u]] = (rc[a[u]] || []).concat(u); });
    var av = me ? '' : (grp ? '<div class="cav" style="visibility:hidden"></div>' : '<div class="cav" style="background:' + col + '">' + esc(mem.av || (m.n || '?').charAt(0).toUpperCase()) + '</div>');
    var mention = !me && C().name && (m.t || '').toLowerCase().indexOf('@' + C().name.toLowerCase()) >= 0;
    return '<div class="chr' + (me ? ' me' : '') + '" id="m_' + m._id + '">' + av + '<div class="cbb" data-a="menu" data-i="' + m._id + '" style="' + (me ? 'background:linear-gradient(135deg,' + t.a + ',' + t.b + ');' : '') + (mention ? 'box-shadow:0 0 0 2px #facc15;' : '') + '">' +
      (!me && !grp ? '<div class="cwho" style="color:' + col + '">' + esc(m.n) + '</div>' : '') +
      (m.rp ? '<div class="crp" data-a="jump" data-i="' + esc(m.ri) + '" style="border-color:' + col + '">' + esc(m.rp) + '</div>' : '') + body(m, A) +
      Object.keys(rc).map(function (e) { return '<span class="cch' + (rc[e].indexOf(R.uid) >= 0 ? ' on' : '') + '" data-a="react" data-i="' + m._id + '" data-x="' + e + '">' + e + ' ' + rc[e].length + '</span>'; }).join('') +
      '<div class="cmt">' + hm(m.ts) + ' ' + (me ? ticks(m) : '') + '</div></div></div>';
  }
  function paint(force) {
    var el = $('#chm'); if (!el || !R || R.state !== 'ok') return;
    var near = force || el.scrollHeight - el.scrollTop - el.clientHeight < 120, A = actIndex(), h = '', prev = null, day = '';
    var list = R.msgs.filter(function (m) { return (!R.cut || m.ts >= R.cut) && !R.dis['x' + m._id] && (!R.q || (m.k === 'sys' ? false : ((m.t || '') + ' ' + (m.d && m.d.length < 800 && m.k !== 'img' && m.k !== 'voice' ? m.d : '') + ' ' + m.n).toLowerCase().indexOf(R.q) >= 0)); });
    if (R.more && !R.q) h += '<button class="csug" id="chmore" style="align-self:center">⬆ ' + tt('پرانے میسج', 'Earlier messages') + '</button>';
    if (!list.length) h += '<p style="text-align:center;opacity:.7;margin:30px 20px;line-height:1.8">' + (R.q ? tt('کچھ نہیں ملا', 'Nothing found') : tt('ابھی کوئی میسج نہیں۔ سلام لکھیں! 👋<br>کوڈ: ', 'No messages yet. Say hello! 👋<br>Code: ') + '<b dir="ltr" style="letter-spacing:2px">' + esc(R.code) + '</b>') + '</p>';
    var sugFor = null, i;
    for (i = list.length - 1; i >= Math.max(0, list.length - 12); i--) { var mm = list[i]; if ((mm.k || 'text') === 'text' && !R.dis[mm._id] && parseWhen(mm.t)) { sugFor = mm._id; break; } }
    list.forEach(function (m) {
      var dl = dayLabel(m.ts); if (dl !== day) { day = dl; h += '<div class="chdy">' + dl + '</div>'; }
      h += bubble(m, prev, A); prev = m;
      if (m._id === sugFor) h += '<button class="csug" data-a="rem" data-i="' + m._id + '">⏰ ' + tt('یاددہانی لگائیں · ', 'Set reminder · ') + fdt(parseWhen(m.t)) + '</button>';
    });
    el.innerHTML = h;
    if (near) el.scrollTop = el.scrollHeight;
  }

  /* ---------- sending ---------- */
  function send(k, t, d) {
    if (R.room.closed) { CL.toast('روم بند ہے', 'Room is closed'); return Promise.resolve(); }
    var m = { _id: rid(), uid: R.uid, n: C().name || '?', k: k, t: String(t || '').slice(0, 2000), d: d || '', rp: R.reply ? R.reply.rp : '', ri: R.reply ? R.reply.id : '', ts: Date.now(), _p: 1 };
    var o = {}; ['uid', 'n', 'k', 't', 'd', 'rp', 'ri', 'ts'].forEach(function (x) { o[x] = m[x]; });
    R.by[m._id] = m; R.msgs.push(m); setReply(null); paint(true);
    return api('PATCH', 'rooms/' + R.code + '/msgs/' + m._id, o).then(function () { delete m._p; paint(); }).catch(function (e) { delete m._p; m._f = 1; paint(); failMsg(e); });
  }
  function setReply(r) {
    R.reply = r; var b = $('#chrp'); if (!b) return;
    b.innerHTML = r ? '<div class="crb"><span>↩️</span><b>' + esc(r.rp) + '</b><button id="chrx" style="color:#fff;font-size:18px">✕</button></div>' : '';
    if (r) $('#chrx').onclick = function () { setReply(null); };
  }
  function setAct(mid, ak, x, v) {
    var id = mid + '_' + ak + (ak === 'c' ? x : '_' + R.uid), o = { m: mid, ak: ak, x: String(x === undefined ? '' : x), v: v, n: C().name || '?', uid: R.uid, ts: Date.now() };
    R.acts[id] = o; paint();
    api('PATCH', 'rooms/' + R.code + '/acts/' + id, o).catch(function (e) { failMsg(e); });
  }
  function shrink(file, max, q) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = rej;
      fr.onload = function () {
        var im = new Image(); im.onerror = rej;
        im.onload = function () {
          var out = '', mx = max, qq = q;
          for (var tries = 0; tries < 6; tries++) {
            var s = Math.min(1, mx / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
            cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); out = cv.toDataURL('image/jpeg', qq);
            if (out.length < 140000) break; if (qq > 0.4) qq -= 0.1; else mx *= 0.75;
          }
          res(out);
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function pickImage(camera) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (camera) inp.setAttribute('capture', 'environment');
    inp.onchange = function () { var f = inp.files && inp.files[0]; if (!f) return; shrink(f, 720, 0.6).then(function (u) { send('img', '', u); }).catch(function () { CL.toast('تصویر نہیں کھل سکی', 'Could not read the photo'); }); };
    inp.click();
  }
  function sendLocation() {
    if (!navigator.geolocation) { CL.toast('لوکیشن دستیاب نہیں', 'Location not available'); return; }
    CL.toast('لوکیشن لی جا رہی ہے…', 'Getting location…');
    navigator.geolocation.getCurrentPosition(function (p) { send('loc', p.coords.latitude.toFixed(5) + ',' + p.coords.longitude.toFixed(5), ''); }, function () { CL.toast('لوکیشن کی اجازت نہیں ملی', 'Location permission denied'); }, { enableHighAccuracy: true, timeout: 15000 });
  }

  /* ---------- voice notes ---------- */
  function recStart() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { CL.toast('آواز ریکارڈنگ دستیاب نہیں', 'Voice recording not available'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].filter(function (x) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x); })[0];
      var chunks = [], rec = new MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }), t0 = Date.now(), cancelled = false, tm;
      R.rec = rec;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        clearInterval(tm); stream.getTracks().forEach(function (t) { t.stop(); }); R.rec = null; recUi(false);
        if (cancelled) return; var sec = Math.max(1, Math.round((Date.now() - t0) / 1000));
        var blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 520000) { CL.toast('آواز بہت لمبی ہے', 'Voice note too long'); return; }
        var fr = new FileReader(); fr.onload = function () { send('voice', Math.floor(sec / 60) + ':' + pad2(sec % 60), fr.result); }; fr.readAsDataURL(blob);
      };
      rec.start(); recUi(true, t0);
      tm = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); var e = $('#chrt'); if (e) e.textContent = Math.floor(s / 60) + ':' + pad2(s % 60); if (s >= 45) rec.stop(); }, 500);
      R.recCancel = function () { cancelled = true; rec.stop(); }; R.recStop = function () { rec.stop(); };
    }).catch(function () { CL.toast('مائیک کی اجازت نہیں ملی', 'Microphone permission denied'); });
  }
  function recUi(on) {
    var c = $('#chc'); if (!c) return;
    if (on) { c.innerHTML = '<button class="ib" id="chrc">🗑</button><div style="flex:1;color:#fff;padding:0 8px;direction:ltr"><span class="crec">●</span> <b id="chrt">0:00</b> <small style="opacity:.7">' + tt('ریکارڈنگ…', 'recording…') + '</small></div><button class="ib sd" id="chrs">➤</button>'; $('#chrc').onclick = function () { R.recCancel(); }; $('#chrs').onclick = function () { R.recStop(); }; }
    else { c.innerHTML = '<button class="ib" id="cha">➕</button><textarea id="cht" rows="1" placeholder="' + tt('میسج لکھیں…', 'Message…') + '"></textarea><button class="ib" id="chsd">🎤</button>'; wireComposer(); head(); }
  }

  function wireComposer() {
    var ta = $('#cht'), sd = $('#chsd');
    function mode() { var has = ta.value.trim().length > 0; sd.textContent = has ? '➤' : '🎤'; sd.className = 'ib' + (has ? ' sd' : ''); }
    ta.oninput = function () { ta.style.height = 'auto'; ta.style.height = Math.min(110, ta.scrollHeight) + 'px'; mode(); var n = Date.now(); if (n - R.typAt > 3000 && ta.value) { R.typAt = n; api('PATCH', 'rooms/' + R.code + '/members/' + R.uid, { typ: n }).catch(function () {}); } };
    ta.onfocus = function () { setTimeout(function () { var m = $('#chm'); if (m) m.scrollTop = m.scrollHeight; }, 300); };
    sd.onclick = function () { var v = ta.value.trim(); if (v) { ta.value = ''; ta.style.height = 'auto'; mode(); send('text', v, ''); api('PATCH', 'rooms/' + R.code + '/members/' + R.uid, { typ: 0 }).catch(function () {}); } else recStart(); };
    $('#cha').onclick = attachSheet;
    $('#chm').onclick = chmClick;
  }

  /* ---------- taps inside the chat ---------- */
  function msgById(id) { return R.by[id]; }
  function chmClick(e) {
    var t = e.target.closest ? e.target.closest('[data-a]') : null, b = $('#chm');
    if (!t && e.target.id === 'chmore') t = e.target;
    if (e.target.id === 'chmore') { more(); return; }
    if (!t) return; var a = t.dataset.a, id = t.dataset.i, x = t.dataset.x, m = id ? msgById(id) : null;
    if (a === 'link') { CL.openUrl(t.dataset.u); }
    else if (a === 'call') { CL.openUrl('tel:' + t.dataset.u); }
    else if (a === 'loc') { CL.openUrl('https://www.google.com/maps?q=' + encodeURIComponent(t.dataset.u)); }
    else if (a === 'img' && m) viewer(m.d);
    else if (a === 'play' && m) play(m, t);
    else if (a === 'vote' && m) {
      var d = {}; try { d = JSON.parse(m.d); } catch (er) { /* ignore */ }
      var cur = (actIndex()[id] || { v: {} }).v[R.uid] || [], i = +x, nx = cur.indexOf(i) >= 0 ? cur.filter(function (z) { return z !== i; }) : (d.mu ? cur.concat([i]) : [i]);
      setAct(id, 'v', '', JSON.stringify(nx));
    }
    else if (a === 'rsvp' && m) { var cur2 = (actIndex()[id] || { e: {} }).e[R.uid]; setAct(id, 'e', '', cur2 === x ? '' : x); }
    else if (a === 'chk' && m) { var c = ((actIndex()[id] || { c: {} }).c[x] || {}).done; setAct(id, 'c', x, c ? '0' : '1'); }
    else if (a === 'react' && m) { var r = (actIndex()[id] || { r: {} }).r[R.uid]; setAct(id, 'r', '', r === x ? '' : x); }
    else if (a === 'evrem' && m) { var ev = {}; try { ev = JSON.parse(m.d); } catch (er2) { /* ignore */ } var at = ev.w - 3600000 > Date.now() ? ev.w - 3600000 : ev.w; if (at < Date.now()) CL.toast('وقت گزر چکا', 'Already passed'); else remind(at, roomRec().name, '📅 ' + ev.t); }
    else if (a === 'rem' && m) { var w = parseWhen(m.t); if (w) remind(w, roomRec().name, m.t); R.dis[id] = 1; paint(); }
    else if (a === 'jump') { var el = document.getElementById('m_' + id); if (el) { el.scrollIntoView({ block: 'center' }); el.style.outline = '2px solid #facc15'; setTimeout(function () { el.style.outline = ''; }, 1200); } }
    else if (a === 'menu' && m) msgMenu(m);
    if (b) return;
  }
  function more() {
    var first = R.msgs[0]; if (!first) return;
    query('rooms/' + R.code, 'msgs', 'ts', 'LESS_THAN', first.ts, 'DESCENDING', 40).then(function (o) { o.forEach(addMsg); R.msgs.sort(function (a, b) { return a.ts - b.ts; }); R.more = o.length >= 40; var el = $('#chm'), h0 = el.scrollHeight; paint(); el.scrollTop = el.scrollHeight - h0; }).catch(failMsg);
  }
  function viewer(src) {
    var v = document.createElement('div'); v.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center';
    v.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:100%"><button style="position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);color:#fff;font-size:20px">✕</button><button id="vsv" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 22px;border-radius:22px;background:rgba(255,255,255,.2);color:#fff;font-size:15px">⬇ ' + tt('محفوظ کریں', 'Save') + '</button>';
    document.body.appendChild(v);
    v.querySelector('button').onclick = function () { v.remove(); };
    v.querySelector('#vsv').onclick = function () { fetch(src).then(function (r) { return r.blob(); }).then(function (b) { if (CL.saveOut) CL.saveOut(b, 'chat-' + Date.now() + '.jpg', 'image/jpeg'); }); };
  }
  function play(m, btn) {
    if (AUD && AUD._id === m._id && !AUD.paused) { AUD.pause(); btn.textContent = '▶ ' + m.t; return; }
    if (AUD) { try { AUD.pause(); } catch (e) { /* ignore */ } }
    AUD = new Audio(m.d); AUD._id = m._id; btn.textContent = '⏸ ' + m.t;
    AUD.onended = function () { btn.textContent = '▶ ' + m.t; }; AUD.play().catch(function () { CL.toast('آواز نہیں چل سکی', 'Cannot play audio'); btn.textContent = '▶ ' + m.t; });
  }

  function msgMenu(m) {
    var me = m.uid === R.uid, k = m.k || 'text', A = actIndex(), mine = (A[m._id] || { r: {} }).r[R.uid];
    var seen = okMembers().filter(function (x) { return x._id !== R.uid && (x.seen || 0) >= m.ts; }).map(function (x) { return x.name; });
    var h = '<div class="chsh"><div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px">' + REACTS.map(function (e) { return '<button class="sbtn' + (mine === e ? ' p' : '') + '" data-rx="' + e + '" style="min-width:46px;font-size:20px;justify-content:center">' + e + '</button>'; }).join('') + '</div>' +
      '<button class="btn o" id="mrp">↩️ ' + tt('جواب دیں', 'Reply') + '</button>' +
      (k === 'text' ? '<button class="btn o" id="mcp">📋 ' + tt('کاپی', 'Copy') + '</button><button class="btn o" id="mrm">⏰ ' + tt('یاددہانی', 'Remind me') + '</button>' : '') +
      (k === 'text' && isAdmin() ? '<button class="btn o" id="mpn">📌 ' + tt('اعلان بنائیں', 'Pin as announcement') + '</button>' : '') +
      ((me || isAdmin()) ? '<button class="btn o" id="mdl" style="color:var(--red)">🗑 ' + tt('حذف کریں', 'Delete') + '</button>' : '') +
      (me ? '<p class="note">' + (seen.length ? '👁 ' + tt('دیکھا: ', 'Seen by: ') + esc(seen.join('، ')) : tt('ابھی کسی نے نہیں دیکھا', 'Not seen yet')) + '</p>' : '') + '</div>';
    sheet(h);
    [].forEach.call(document.querySelectorAll('[data-rx]'), function (b) { b.onclick = function () { closeSheet(); setAct(m._id, 'r', '', mine === b.dataset.rx ? '' : b.dataset.rx); }; });
    $('#mrp').onclick = function () { closeSheet(); var pv = k === 'text' ? m.t : k === 'img' ? '📷' : k === 'voice' ? '🎤' : k === 'loc' ? '📍' : k === 'poll' ? '📊' : k === 'event' ? '📅' : k === 'list' ? '✅' : '💸'; setReply({ id: m._id, rp: (m.n || '') + ': ' + String(pv).slice(0, 60) }); var t = $('#cht'); if (t) t.focus(); };
    if ($('#mcp')) $('#mcp').onclick = function () { try { navigator.clipboard.writeText(m.t); } catch (e) { /* ignore */ } closeSheet(); CL.toast('کاپی ہو گیا', 'Copied'); };
    if ($('#mrm')) $('#mrm').onclick = function () { closeSheet(); remindSheet(m); };
    if ($('#mpn')) $('#mpn').onclick = function () { closeSheet(); api('PATCH', 'rooms/' + R.code, { pin: m.t.slice(0, 300) }).then(function () { R.room.pin = m.t.slice(0, 300); head(); }).catch(failMsg); };
    if ($('#mdl')) $('#mdl').onclick = function () { closeSheet(); api('DELETE', 'rooms/' + R.code + '/msgs/' + m._id).then(function () { R.msgs = R.msgs.filter(function (x) { return x._id !== m._id; }); delete R.by[m._id]; paint(); }).catch(failMsg); };
  }
  function remindSheet(m) {
    var w = parseWhen(m.t) || (Date.now() + 3600000);
    var dt = new Date(w - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    sheet('<div class="chsh"><b>⏰ ' + tt('یاددہانی', 'Reminder') + '</b><input type="datetime-local" class="inp" id="rmt" value="' + dt + '" style="margin-top:8px"><button class="btn" id="rmo">' + tt('لگائیں', 'Set') + '</button></div>');
    $('#rmo').onclick = function () { var at = new Date($('#rmt').value).getTime(); closeSheet(); if (at > Date.now()) remind(at, roomRec().name, m.t); else CL.toast('وقت آگے کا چنیں', 'Pick a future time'); };
  }

  /* ---------- attach menu and forms ---------- */
  function attachSheet() {
    var items = [['📷', tt('تصویر', 'Photo'), 'ph'], ['📸', tt('کیمرہ', 'Camera'), 'cm'], ['📊', tt('پول', 'Poll'), 'po'], ['📅', tt('ایونٹ', 'Event'), 'ev'], ['✅', tt('لسٹ', 'Checklist'), 'li'], ['💸', tt('خرچ', 'Expense'), 'ex'], ['📍', tt('لوکیشن', 'Location'), 'lo']];
    sheet('<div class="chsh"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' + items.map(function (i) { return '<button class="sbtn" data-at="' + i[2] + '" style="flex-direction:column;height:78px;justify-content:center;gap:2px"><span style="font-size:26px">' + i[0] + '</span><small>' + i[1] + '</small></button>'; }).join('') + '</div></div>');
    [].forEach.call(document.querySelectorAll('[data-at]'), function (b) {
      b.onclick = function () {
        var k = b.dataset.at; closeSheet();
        if (k === 'ph') pickImage(false); else if (k === 'cm') pickImage(true); else if (k === 'lo') sendLocation();
        else if (k === 'po') pollForm(); else if (k === 'ev') eventForm(); else if (k === 'li') listForm(); else if (k === 'ex') expForm();
      };
    });
  }
  function formShell(title, inner, ok) {
    sheet('<div class="chsh"><b style="font-size:17px">' + title + '</b>' + inner + '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn o" id="fx" style="flex:1;margin:0">' + tt('منسوخ', 'Cancel') + '</button><button class="btn" id="fo" style="flex:2;margin:0">' + tt('بھیجیں', 'Send') + '</button></div></div>');
    $('#fx').onclick = closeSheet; $('#fo').onclick = function () { if (ok() !== false) closeSheet(); };
  }
  function pollForm() {
    formShell('📊 ' + tt('نیا پول', 'New poll'), '<input class="inp" id="pq" maxlength="120" placeholder="' + tt('سوال', 'Question') + '" style="margin-top:10px"><textarea class="inp" id="po" rows="4" placeholder="' + tt('ہر لائن میں ایک آپشن', 'One option per line') + '" style="margin-top:8px"></textarea><label class="r" style="margin-top:8px"><span class="t">' + tt('ایک سے زیادہ ووٹ کی اجازت', 'Allow multiple votes') + '</span><input type="checkbox" id="pm" style="width:22px;height:22px"></label>', function () {
      var q = $('#pq').value.trim(), o = $('#po').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
      if (!q || o.length < 2) { CL.toast('سوال اور کم از کم 2 آپشن لکھیں', 'Enter a question and at least 2 options'); return false; }
      send('poll', q, JSON.stringify({ q: q, o: o, mu: $('#pm').checked }));
    });
  }
  function eventForm() {
    var dt = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    formShell('📅 ' + tt('نیا ایونٹ', 'New event'), '<input class="inp" id="et" maxlength="80" placeholder="' + tt('عنوان (مثلاً دعوت، میٹنگ)', 'Title (e.g. Dinner, Meeting)') + '" style="margin-top:10px"><input type="datetime-local" class="inp" id="ew" value="' + dt + '" style="margin-top:8px"><input class="inp" id="ep" maxlength="80" placeholder="' + tt('جگہ (اختیاری)', 'Place (optional)') + '" style="margin-top:8px">', function () {
      var t = $('#et').value.trim(), w = new Date($('#ew').value).getTime(); if (!t || !w) { CL.toast('عنوان اور وقت لکھیں', 'Enter title and time'); return false; }
      send('event', t, JSON.stringify({ t: t, w: w, p: $('#ep').value.trim() }));
    });
  }
  function listForm() {
    formShell('✅ ' + tt('مشترکہ لسٹ', 'Shared checklist'), '<input class="inp" id="lt" maxlength="80" placeholder="' + tt('عنوان (مثلاً سامان، کام)', 'Title (e.g. Groceries, Tasks)') + '" style="margin-top:10px"><textarea class="inp" id="li" rows="5" placeholder="' + tt('ہر لائن میں ایک چیز', 'One item per line') + '" style="margin-top:8px"></textarea>', function () {
      var t = $('#lt').value.trim(), it = $('#li').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 30);
      if (!t || !it.length) { CL.toast('عنوان اور چیزیں لکھیں', 'Enter title and items'); return false; }
      send('list', t, JSON.stringify({ t: t, it: it }));
    });
  }
  function expForm() {
    var oks = okMembers();
    formShell('💸 ' + tt('خرچ تقسیم', 'Split an expense'), '<input class="inp" id="xt" maxlength="60" placeholder="' + tt('کس چیز پر خرچ ہوا', 'What was it for') + '" style="margin-top:10px"><input class="inp" id="xa" type="number" inputmode="decimal" placeholder="' + tt('کل رقم (Rs)', 'Total amount (Rs)') + '" style="margin-top:8px"><div class="g">' + tt('کن میں تقسیم ہو (آپ نے ادا کیا)', 'SPLIT AMONG (you paid)') + '</div>' + oks.map(function (m) { return '<label class="r"><span class="t">' + esc(m.name) + '</span><input type="checkbox" data-xp="' + m._id + '" checked style="width:22px;height:22px"></label>'; }).join(''), function () {
      var t = $('#xt').value.trim(), a = parseFloat($('#xa').value), p = [].map.call(document.querySelectorAll('[data-xp]:checked'), function (e) { return e.dataset.xp; });
      if (!t || !(a > 0) || !p.length) { CL.toast('تفصیل، رقم اور افراد چنیں', 'Enter details, amount and people'); return false; }
      send('exp', t + ' · ' + money(a), JSON.stringify({ t: t, amt: a, parts: p }));
    });
  }
  function balances() {
    var from = 0; R.msgs.forEach(function (m) { if (m.k === 'sys' && m.d === 'settle') from = Math.max(from, m.ts); });
    var net = {}, any = false;
    R.msgs.forEach(function (m) {
      if (m.k !== 'exp' || m.ts <= from) return; var d = {}; try { d = JSON.parse(m.d); } catch (e) { return; }
      var p = d.parts || [], sh = d.amt / (p.length || 1); any = true; net[m.uid] = (net[m.uid] || 0) + d.amt; p.forEach(function (u) { net[u] = (net[u] || 0) - sh; });
    });
    var cr = [], db = [], out = [];
    Object.keys(net).forEach(function (u) { if (net[u] > 0.5) cr.push([u, net[u]]); else if (net[u] < -0.5) db.push([u, -net[u]]); });
    cr.sort(function (a, b) { return b[1] - a[1]; }); db.sort(function (a, b) { return b[1] - a[1]; });
    while (cr.length && db.length) { var x = Math.min(cr[0][1], db[0][1]); out.push(memName(db[0][0]) + ' → ' + memName(cr[0][0]) + ': ' + money(x)); cr[0][1] -= x; db[0][1] -= x; if (cr[0][1] < 0.5) cr.shift(); if (db[0][1] < 0.5) db.shift(); }
    sheet('<div class="chsh"><b style="font-size:17px">💸 ' + tt('حساب', 'Balances') + '</b>' + (out.length ? '<div style="margin-top:10px;line-height:2.1;font-size:15px">' + out.map(esc).join('<br>') + '</div>' : '<p class="note">' + (any ? tt('سب برابر ہے ✅', 'All settled ✅') : tt('ابھی کوئی خرچ درج نہیں۔', 'No expenses yet.')) + '</p>') + (out.length ? '<button class="btn" id="bst">✔ ' + tt('سب حساب برابر ہو گیا', 'Mark all settled') + '</button>' : '') + '<button class="btn o" id="bcl">' + tt('بند کریں', 'Close') + '</button></div>');
    $('#bcl').onclick = closeSheet; if ($('#bst')) $('#bst').onclick = function () { closeSheet(); send('sys', '💸 ' + tt('حساب برابر کر دیا گیا', 'Balances settled') + ' — ' + (C().name || ''), 'settle'); };
  }

  /* ---------- room info and admin ---------- */
  function infoSheet() {
    var rm = R.room, adm = isAdmin(), now = Date.now(), c = C(), muted = (c.mut || []).indexOf(R.code) >= 0, tcur = themeNow();
    var mem = Object.keys(R.mem).map(function (k) { return R.mem[k]; }).filter(function (m) { return m && m.name !== undefined; });
    var pend = mem.filter(function (m) { return !m.ok; }), ok = mem.filter(function (m) { return m.ok; });
    var h = '<div class="chsh"><div style="display:flex;align-items:center;gap:10px"><b style="font-size:18px;flex:1">' + esc(rm.name) + '</b><button class="sbtn" id="ix">✕</button></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px"><b dir="ltr" style="font-size:22px;letter-spacing:4px;flex:1;text-align:center;background:var(--bg);border-radius:12px;padding:6px">' + esc(R.code) + '</b><button class="sbtn p" id="ish">' + tt('دعوت', 'Invite') + '</button></div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="sbtn" id="imd">🖼 ' + tt('میڈیا', 'Media') + '</button><button class="sbtn" id="ibl">💸 ' + tt('حساب', 'Balances') + '</button><button class="sbtn" id="imu">' + (muted ? '🔕 ' + tt('خاموش', 'Muted') : '🔔 ' + tt('آواز آن', 'Alerts on')) + '</button></div>';
    if (adm && pend.length) h += '<div class="g">' + tt('نئی درخواستیں', 'REQUESTS') + '</div>' + pend.map(function (m) { return '<div class="r"><span class="cav" style="background:' + colorOf(m._id) + '">' + esc(m.av || m.name.charAt(0).toUpperCase()) + '</span><span class="t"><b>' + esc(m.name) + '</b></span><button class="sbtn p" data-ap="' + m._id + '">✅</button><button class="sbtn r" data-rj="' + m._id + '">✖</button></div>'; }).join('');
    h += '<div class="g">' + tt('ارکان', 'MEMBERS') + ' · ' + ok.length + '</div>' + ok.map(function (m) {
      var on = (m.seen || 0) > now - 100000;
      return '<div class="r"><span class="cav" style="background:' + colorOf(m._id) + '">' + esc(m.av || m.name.charAt(0).toUpperCase()) + '</span><span class="t"><b>' + esc(m.name) + (m._id === R.uid ? ' (' + tt('آپ', 'you') + ')' : '') + '</b><small class="mut" style="display:block;font-size:11.5px">' + (m._id === rm.admin ? '👑 ' + tt('منتظم', 'admin') + ' · ' : '') + (on ? '🟢 ' + tt('آن لائن', 'online') : m.seen ? tt('آخری بار ', 'last seen ') + fdt(m.seen) : '') + '</small></span>' + (adm && m._id !== R.uid ? '<button class="sbtn r" data-rm="' + m._id + '">🗑</button>' : '') + '</div>';
    }).join('');
    h += '<div class="g">' + tt('رنگ', 'LOOK') + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + THEMES.map(function (t, i) { return '<button data-th="' + i + '" style="width:44px;height:44px;border-radius:14px;background:' + t.bg + ';border:3px solid ' + (t === tcur ? '#fff' : 'transparent') + '"></button>'; }).join('') + '</div>';
    if (adm) {
      h += '<div class="g">' + tt('منتظم کے اختیارات', 'ADMIN') + '</div><div class="g" style="margin-top:4px">' + tt('نئے لوگ', 'NEW MEMBERS') + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + [['approve', tt('منظوری', 'Approval')], ['open', tt('کھلا', 'Open')], ['shut', tt('بند', 'Stopped')]].map(function (x) { return '<button class="sbtn' + (rm.mode === x[0] ? ' p' : '') + '" data-md="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="g" style="margin-top:10px">' + tt('خودکار حذف', 'AUTO-DELETE') + '</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + [[0, tt('کبھی نہیں', 'Never')], [1, tt('1 دن', '1 day')], [7, tt('7 دن', '7 days')], [30, tt('30 دن', '30 days')]].map(function (x) { return '<button class="sbtn' + ((+rm.ad || 0) === x[0] ? ' p' : '') + '" data-ad="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="g" style="margin-top:10px">' + tt('اعلان (سب کو اوپر دکھے گا)', 'ANNOUNCEMENT (pinned on top)') + '</div><div style="display:flex;gap:6px"><input class="inp" id="ipn" maxlength="300" value="' + esc(rm.pin || '') + '"><button class="sbtn p" id="ipv">📌</button></div>' +
        '<button class="btn o" id="ith" style="margin-top:10px">🎨 ' + tt('یہ رنگ سب کے لیے لگائیں', 'Use this look for everyone') + '</button>' +
        '<button class="btn o" id="icl" style="color:var(--red)">' + (rm.closed ? '🔓 ' + tt('روم دوبارہ کھولیں', 'Reopen the room') : '🔒 ' + tt('روم بند کریں', 'Close the room')) + '</button>';
    }
    h += '<button class="btn o" id="ilv" style="color:var(--red)">🚪 ' + tt('روم چھوڑیں', 'Leave room') + '</button><p class="note">' + tt('🔒 چیٹ اینڈ ٹو اینڈ انکرپٹڈ نہیں؛ حساس معلومات نہ بھیجیں۔ کوڈ بدلا نہیں جا سکتا، "نئے لوگ: بند" سے مزید لوگوں کو روکیں۔', '🔒 Not end-to-end encrypted. A code cannot be changed; set "New members: Stopped" to block more joiners.') + '</p></div>';
    sheet(h);
    var P = 'rooms/' + R.code, back = function () { infoSheet(); head(); };
    $('#ix').onclick = closeSheet; $('#ish').onclick = function () { shareText(inviteText(R.code, rm.name)); };
    $('#imd').onclick = mediaSheet; $('#ibl').onclick = balances;
    $('#imu').onclick = function () { var c2 = C(); c2.mut = c2.mut || []; var i = c2.mut.indexOf(R.code); if (i >= 0) c2.mut.splice(i, 1); else c2.mut.push(R.code); save(c2); sync(); infoSheet(); };
    [].forEach.call(document.querySelectorAll('[data-th]'), function (b) { b.onclick = function () { lset('chatth_' + R.code, +b.dataset.th); vRoom(); infoSheet(); }; });
    [].forEach.call(document.querySelectorAll('[data-ap]'), function (b) { b.onclick = function () { var u = b.dataset.ap; api('PATCH', P + '/members/' + u, { ok: true }).then(function () { R.mem[u].ok = true; send('sys', '👋 ' + R.mem[u].name + ' ' + tt('شامل ہوا', 'joined'), ''); infoSheet(); head(); }).catch(failMsg); }; });
    [].forEach.call(document.querySelectorAll('[data-rj]'), function (b) { b.onclick = function () { var u = b.dataset.rj; api('DELETE', P + '/members/' + u).then(function () { delete R.mem[u]; infoSheet(); }).catch(failMsg); }; });
    [].forEach.call(document.querySelectorAll('[data-rm]'), function (b) { b.onclick = function () { var u = b.dataset.rm; sure(tt('اس رکن کو ہٹائیں؟', 'Remove this member?'), function () { api('DELETE', P + '/members/' + u).then(function () { var n = R.mem[u].name; delete R.mem[u]; send('sys', '🚫 ' + n + ' ' + tt('کو ہٹا دیا گیا', 'was removed'), ''); infoSheet(); head(); }).catch(failMsg); }); }; });
    [].forEach.call(document.querySelectorAll('[data-md]'), function (b) { b.onclick = function () { api('PATCH', P, { mode: b.dataset.md }).then(function () { rm.mode = b.dataset.md; back(); }).catch(failMsg); }; });
    [].forEach.call(document.querySelectorAll('[data-ad]'), function (b) { b.onclick = function () { api('PATCH', P, { ad: +b.dataset.ad }).then(function () { rm.ad = +b.dataset.ad; R.cut = rm.ad ? Date.now() - rm.ad * 864e5 : 0; autoDelete(); paint(); back(); }).catch(failMsg); }; });
    if (adm) {
      $('#ipv').onclick = function () { var v = $('#ipn').value.trim(); api('PATCH', P, { pin: v }).then(function () { rm.pin = v; head(); CL.toast('اعلان لگ گیا', 'Announcement set'); }).catch(failMsg); };
      $('#ith').onclick = function () { var i = THEMES.indexOf(tcur); api('PATCH', P, { theme: i }).then(function () { rm.theme = i; var c3 = C(); c3.rooms.forEach(function (r) { if (r.code === R.code) r.th = i; }); save(c3); CL.toast('سب کے لیے لگ گیا', 'Applied for everyone'); }).catch(failMsg); };
      $('#icl').onclick = function () { var v = !rm.closed; api('PATCH', P, { closed: v }).then(function () { rm.closed = v; head(); infoSheet(); }).catch(failMsg); };
    }
    $('#ilv').onclick = function () { sure(tt('یہ روم چھوڑ دیں؟', 'Leave this room?'), function () { api('DELETE', P + '/members/' + R.uid).catch(function () {}).then(function () { closeSheet(); stopAll(); dropLocal(); R = null; CL.go('chat'); }); }); };
  }
  function mediaSheet() {
    var im = R.msgs.filter(function (m) { return m.k === 'img'; }).reverse();
    sheet('<div class="chsh"><div style="display:flex;align-items:center"><b style="font-size:17px;flex:1">🖼 ' + tt('میڈیا', 'Media') + '</b><button class="sbtn" id="mx">✕</button></div>' + (im.length ? '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">' + im.map(function (m) { return '<img data-mi="' + m._id + '" src="' + m.d + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px">'; }).join('') + '</div>' : '<p class="note">' + tt('ابھی کوئی تصویر نہیں۔', 'No photos yet.') + '</p>') + '</div>');
    $('#mx').onclick = closeSheet; [].forEach.call(document.querySelectorAll('[data-mi]'), function (b) { b.onclick = function () { viewer(R.by[b.dataset.mi].d); }; });
  }

  /* hint + hand-off */
  if (CL.HINTS) { CL.HINTS.chat = ['family', 'فیملی لوکیشن اور SOS کے لیے "فیملی سرکل"', 'For family location and SOS use "Family circle"']; }
  if (CL.wrapTools) CL.wrapTools();
};
