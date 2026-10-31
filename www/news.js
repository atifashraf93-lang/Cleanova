/* Cleanova Life 3: news headlines (RSS) with an auto-rotating home card, News tab, live news channels (YouTube), settings.
   Only headline, source, time and link are shown; tapping opens the publisher's own page. Live channels open the channel's own YouTube stream. */
window.CLifeInit3 = function (CL) {
  'use strict';
  var S = CL.S, T = CL.T, tt = CL.tt, $ = CL.$, esc = CL.esc, ico = CL.ico, V = CL.views, U = CL.u, TO = CL.TAB_OF;
  var lget = U.lget, lset = U.lset, L = U.L, chips = U.chips, bind = U.bind, nav = U.nav;
  CL.IC.news = '<path d="M4 4h13a2 2 0 0 1 2 2v13a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2z"/><path d="M19 8h2v11a1 1 0 0 1-1 1"/><line x1="8" y1="8" x2="15" y2="8"/><line x1="8" y1="12" x2="15" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>';
  CL.IC.tv = '<rect x="2" y="5" width="20" height="14" rx="2"/><polyline points="8 2 12 5 16 2"/>';
  TO.news = 'news'; TO.tv = 'news'; TO.newsset = 'news';

  /* ---------- sources (feed URLs checked against the publishers' own feed lists) ---------- */
  var OUTLETS = [
    { id: 'dawn', n: ['ڈان', 'Dawn'], f: [['https://www.dawn.com/feeds/home', 'pk'], ['https://www.dawn.com/feeds/business', 'biz'], ['https://www.dawn.com/feeds/sport', 'sport']] },
    { id: 'tribune', n: ['ایکسپریس ٹریبیون', 'Express Tribune'], f: [['https://tribune.com.pk/feed/pakistan', 'pk'], ['https://tribune.com.pk/feed/business', 'biz']] },
    { id: 'ary', n: ['اے آر وائی نیوز', 'ARY News'], f: [['https://arynews.tv/feed/', 'pk']] },
    { id: 'bbcurdu', n: ['بی بی سی اردو', 'BBC Urdu'], f: [['https://feeds.bbci.co.uk/urdu/rss.xml', 'urdu']] },
    { id: 'bbc', n: ['بی بی سی نیوز', 'BBC News'], f: [['https://feeds.bbci.co.uk/news/world/rss.xml', 'world'], ['https://feeds.bbci.co.uk/news/business/rss.xml', 'biz'], ['https://feeds.bbci.co.uk/news/technology/rss.xml', 'tech'], ['https://feeds.bbci.co.uk/sport/rss.xml', 'sport']] },
    { id: 'aj', n: ['الجزیرہ', 'Al Jazeera'], f: [['https://www.aljazeera.com/xml/rss/all.xml', 'world']] }
  ];
  var CATS = [['all', ['سب', 'All']], ['pk', ['پاکستان', 'Pakistan']], ['urdu', ['اردو', 'Urdu']], ['world', ['دنیا', 'World']], ['sport', ['کھیل', 'Sport']], ['biz', ['کاروبار', 'Business']], ['tech', ['ٹیکنالوجی', 'Tech']]];
  var CAT_IC = { pk: '🇵🇰', urdu: '📰', world: '🌍', sport: '🏏', biz: '💹', tech: '💻' };
  function catName(c) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === c) return tt(CATS[i][1][0], CATS[i][1][1]); return c; }

  /* ---------- preferences ---------- */
  function P(k, d) { return lget('news.' + k, d); }
  function setP(k, v) { lset('news.' + k, v); }
  function srcOn() { var s = P('src', null); return s || OUTLETS.map(function (o) { return o.id; }); }
  function hcats() { return P('hcats', ['pk', 'urdu', 'world']); }
  var SPEED = { off: 0, slow: 8000, norm: 5000, fast: 3000 };
  CL.navFilter = function (t) { return t.id !== 'news' || P('tab', true) !== false; };

  /* ---------- fetching ---------- */
  function timeout(p, ms) { return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error('timeout')); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); }); }
  function plain(s) { var d = document.createElement('div'); d.innerHTML = String(s || ''); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function txt(el, names) {
    for (var i = 0; i < names.length; i++) { var e = el.getElementsByTagName(names[i])[0]; if (e && e.textContent) return e.textContent.trim(); }
    return '';
  }
  function parseFeed(xml, outlet, cat) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length) return [];
    var nodes = [].slice.call(doc.getElementsByTagName('item')); if (!nodes.length) nodes = [].slice.call(doc.getElementsByTagName('entry'));
    var out = [];
    nodes.slice(0, 14).forEach(function (n) {
      var t = plain(txt(n, ['title'])), l = txt(n, ['link']);
      if (!l) { var a = n.getElementsByTagName('link')[0]; l = a ? (a.getAttribute('href') || '') : ''; }
      var d = Date.parse(txt(n, ['pubDate', 'dc:date', 'published', 'updated'])) || 0;
      if (t && /^https?:\/\//.test(l)) out.push({ t: t, l: l, d: d, o: outlet.id, c: cat });
    });
    return out;
  }
  var busy = null;
  function refresh(force) {
    var c = lget('news.cache', null);
    if (!force && c && Date.now() - c.t < 15 * 60000) return Promise.resolve(c);
    if (busy) return busy;
    var on = srcOn(), jobs = [];
    OUTLETS.forEach(function (o) {
      if (on.indexOf(o.id) < 0) return;
      o.f.forEach(function (f) {
        jobs.push(timeout(fetch(f[0], { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }), 12000).then(function (x) { return parseFeed(x, o, f[1]); }).catch(function () { return []; }));
      });
    });
    busy = Promise.all(jobs).then(function (lists) {
      var all = [], seen = {};
      lists.forEach(function (l) { l.forEach(function (i) { var k = i.l; if (!seen[k]) { seen[k] = 1; all.push(i); } }); });
      if (!all.length) { busy = null; return c; }
      all.sort(function (a, b) { return b.d - a.d; });
      var res = { t: Date.now(), items: all.slice(0, 120) };
      lset('news.cache', res); busy = null; return res;
    }).catch(function () { busy = null; return c; });
    return busy;
  }
  function ago(t) { if (!t) return ''; var m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 2 ? tt('ابھی', 'just now') : m < 60 ? m + tt(' منٹ', ' min') : m < 1440 ? Math.round(m / 60) + tt(' گھنٹے', ' h') : Math.round(m / 1440) + tt(' دن', ' d'); }
  function oname(id) { for (var i = 0; i < OUTLETS.length; i++) if (OUTLETS[i].id === id) return tt(OUTLETS[i].n[0], OUTLETS[i].n[1]); return id; }
  function items(cat) { var c = lget('news.cache', null); if (!c) return []; var on = srcOn(); return c.items.filter(function (i) { return on.indexOf(i.o) >= 0 && (cat === 'all' || i.c === cat); }); }
  function homeItems() {
    var hc = hcats(), n = P('count', 4), per = {}, out = [];
    items('all').forEach(function (i) { if (hc.indexOf(i.c) < 0) return; per[i.c] = per[i.c] || 0; if (per[i.c] < Math.max(2, Math.ceil(n / Math.max(1, hc.length)))) { per[i.c]++; out.push(i); } });
    out.sort(function (a, b) { return b.d - a.d; });
    return out.slice(0, n);
  }
  function open(url) { if (CL.openUrl) CL.openUrl(url); else window.open(url, '_blank'); }

  /* ---------- home cards ---------- */
  var rot = null;
  function stopRot() { if (rot) { clearInterval(rot); rot = null; } }
  function homeNews() {
    var list = homeItems(), host = $('#nwsSl'); if (!host) return;
    if (!list.length) { host.innerHTML = '<span class="mut">' + tt('خبریں لوڈ ہو رہی ہیں… (انٹرنیٹ چاہیے)', 'Loading headlines… (needs internet)') + '</span>'; $('#nwsRun').textContent = ''; return; }
    $('#nwsRun').textContent = list.map(function (i) { return '•  ' + i.t; }).join('     ');
    $('#nwsRun').style.animationDuration = Math.max(20, list.join('').length / 6) + 's';
    var idx = 0, speed = SPEED[P('rot', 'norm')];
    function show(k) {
      var i = list[k % list.length]; if (!$('#nwsSl')) return;
      $('#nwsSl').innerHTML = '<button class="nwsb" data-nl="' + esc(i.l) + '"><span class="src"><i>' + esc(CAT_IC[i.c] || '') + ' ' + catName(i.c) + '</i><span>' + esc(oname(i.o)) + (i.d ? ' · ' + ago(i.d) : '') + '</span></span><b dir="auto">' + esc(i.t) + '</b></button>';
      var dots = $('#nwsDt'); if (dots) dots.innerHTML = list.map(function (_, j) { return '<i class="' + (j === k % list.length ? 'on' : '') + '"></i>'; }).join('');
      var pb = $('#nwsPb'); if (pb && speed) { pb.style.transition = 'none'; pb.style.width = '0'; void pb.offsetWidth; pb.style.transition = 'width ' + speed + 'ms linear'; pb.style.width = '100%'; }
      [].forEach.call(document.querySelectorAll('#nwsSl [data-nl]'), function (b) { b.onclick = function () { open(b.dataset.nl); }; });
    }
    if (!speed) {
      host.innerHTML = list.map(function (i) { return '<button class="nwsb" data-nl="' + esc(i.l) + '" style="margin-bottom:6px"><span class="src"><i>' + esc(CAT_IC[i.c] || '') + ' ' + catName(i.c) + '</i><span>' + esc(oname(i.o)) + (i.d ? ' · ' + ago(i.d) : '') + '</span></span><b dir="auto">' + esc(i.t) + '</b></button>'; }).join('');
      [].forEach.call(host.querySelectorAll('[data-nl]'), function (b) { b.onclick = function () { open(b.dataset.nl); }; });
      return;
    }
    show(0); stopRot();
    rot = setInterval(function () { if (!$('#nwsSl') || document.hidden) { if (!$('#nwsSl')) stopRot(); return; } idx++; show(idx); }, speed);
  }
  function injectHome() {
    if (S.view !== 'life') { stopRot(); return; }
    var anchor = document.querySelector('#body .rems') || document.querySelector('#body .lhero'); if (!anchor) return;
    var h = '';
    if (P('home', true) !== false) {
      h += '<div class="card nws" id="nwsC"><div class="nh"><b>📰 ' + tt('آج کی اہم خبریں', "Today's headlines") + '</b><button class="sbtn nmore" data-nv="news">' + tt('سب', 'All') + ' ›</button></div>' +
        '<div class="tk"><em>' + tt('تازہ', 'LIVE') + '</em><div class="trk"><span id="nwsRun" dir="auto"></span></div></div>' +
        '<div id="nwsSl" class="nsl"></div><div class="ndots" id="nwsDt"></div>' + (SPEED[P('rot', 'norm')] ? '<div class="npb"><i id="nwsPb"></i></div>' : '') + '</div>';
    }
    if (P('tvcard', true) !== false) {
      h += '<button class="card tvh" data-nv="tv"><span class="dd" style="background:rgba(var(--c2),.18);color:rgb(var(--c2))">' + ico('tv') + '</span><span class="tx"><b>' + tt('لائیو نیوز چینل', 'Live news channels') + '</b><small>' + tt('جیو · اے آر وائی · ایکسپریس · دنیا · BBC · الجزیرہ…', 'Geo · ARY · Express · Dunya · BBC · Al Jazeera…') + '</small></span><span class="go">›</span></button>';
    }
    if (!h) { stopRot(); return; }
    anchor.insertAdjacentHTML('afterend', h);
    bind('nv', function (v) { nav(v); });
    if ($('#nwsC')) { homeNews(); refresh(false).then(function (c) { if (c && S.view === 'life' && $('#nwsC')) homeNews(); }); }
  }
  var baseLife = V.life;
  V.life = function (soft) { baseLife(soft); injectHome(); };
  /* refresh while the app stays open */
  setInterval(function () { if (document.hidden) return; if (S.view === 'life' || S.view === 'news') refresh(false).then(function () { if (S.view === 'life' && $('#nwsC')) homeNews(); }); }, 5 * 60000);

  /* ---------- news tab ---------- */
  var NF = { cat: 'all' };
  function seg(cur) {
    return '<div class="chips" style="margin-top:8px"><button class="chip' + (cur === 'news' ? ' on' : '') + '" data-nv="news">📰 ' + tt('خبریں', 'News') + '</button><button class="chip' + (cur === 'tv' ? ' on' : '') + '" data-nv="tv">📺 ' + tt('لائیو چینل', 'Live channels') + '</button><button class="chip" data-nv="newsset" aria-label="settings">⚙</button></div>';
  }
  function vNews() {
    CL.setTop(T('خبریں', 'News')); stopRot();
    var c = lget('news.cache', null), list = items(NF.cat);
    var h = seg('news') + chips(CATS.map(function (x) { return [x[0], x[1]]; }), NF.cat, 'nc') +
      '<div class="mut" style="font-size:12px;margin:6px 2px">' + (c ? tt('آخری اپ ڈیٹ: ', 'Updated: ') + ago(c.t) + tt(' پہلے', ' ago') : tt('ابھی کوئی خبر محفوظ نہیں', 'Nothing saved yet')) + ' <button class="sbtn" id="nref" style="min-height:32px;padding:0 12px;font-size:12px">⟳ ' + tt('تازہ کریں', 'Refresh') + '</button></div>';
    h += list.length ? list.slice(0, 60).map(function (i) {
      return '<button class="card nitem" data-nl="' + esc(i.l) + '"><span class="src"><i>' + esc(CAT_IC[i.c] || '') + ' ' + catName(i.c) + '</i><span>' + esc(oname(i.o)) + (i.d ? ' · ' + ago(i.d) : '') + '</span></span><b dir="auto">' + esc(i.t) + '</b></button>';
    }).join('') : '<div class="card center"><div style="font-size:42px">📡</div><p class="mut">' + tt('خبریں لانے کے لیے انٹرنیٹ چاہیے۔ "تازہ کریں" دبائیں۔', 'Internet is needed to load headlines. Tap Refresh.') + '</p></div>';
    h += '<p class="note">' + tt('صرف سرخیاں اور ذریعہ دکھایا جاتا ہے؛ خبر دبانے پر اصل ویب سائٹ کھلتی ہے۔ خبروں کا مواد متعلقہ اداروں کی ملکیت ہے۔', 'Only headlines and sources are shown; tapping opens the publisher\'s own page. Content belongs to the respective publishers.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    bind('nv', function (v) { nav(v); });
    bind('nc', function (v) { NF.cat = v; vNews(); });
    bind('nl', function (v) { open(v); });
    $('#nref').onclick = function () { this.textContent = '…'; refresh(true).then(function () { if (S.view === 'news') vNews(); }); };
    if (!c || Date.now() - c.t > 15 * 60000) refresh(false).then(function (r) { if (S.view === 'news' && r && (!c || r.t !== c.t)) vNews(); });
  }
  V.news = vNews;

  /* ---------- live channels ---------- */
  function ysearch(n) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(n + ' live') + '&sp=EgJAAQ%253D%253D'; }
  var CH = [
    { g: 'pk', id: 'geo', n: ['جیو نیوز', 'Geo News'], s: 'Geo News', c: '#c2410c', u: 'https://www.youtube.com/c/geonews/live' },
    { g: 'pk', id: 'ary', n: ['اے آر وائی نیوز', 'ARY News'], s: 'ARY News', c: '#b91c1c', u: 'https://www.youtube.com/@arynewstvofficial/live' },
    { g: 'pk', id: 'express', n: ['ایکسپریس نیوز', 'Express News'], s: 'Express News', c: '#1d4ed8', u: 'https://www.youtube.com/channel/UCTur7oM6mLL0rM2k0znuZpQ/live' },
    { g: 'pk', id: 'dunya', n: ['دنیا نیوز', 'Dunya News'], s: 'Dunya News', c: '#0f766e', u: 'https://www.youtube.com/@DunyanewsOfficial/live' },
    { g: 'pk', id: 'samaa', n: ['سما', 'SAMAA TV'], s: 'SAMAA TV', c: '#7c3aed', u: 'https://www.youtube.com/samaatvnews/live' },
    { g: 'world', id: 'bbc', n: ['بی بی سی نیوز', 'BBC News'], s: 'BBC News', c: '#be123c', u: 'https://www.youtube.com/user/BBCNEWS/live' },
    { g: 'world', id: 'aje', n: ['الجزیرہ انگلش', 'Al Jazeera English'], s: 'Al Jazeera English', c: '#a16207', u: 'https://www.youtube.com/@aljazeeraenglish/live' },
    { g: 'world', id: 'dw', n: ['ڈی ڈبلیو نیوز', 'DW News'], s: 'DW News', c: '#0369a1', u: 'https://www.youtube.com/@DWNews/live' },
    { g: 'world', id: 'f24', n: ['فرانس 24', 'France 24 English'], s: 'France 24 English', c: '#1e40af', u: 'https://www.youtube.com/@FRANCE24English/live' },
    { g: 'world', id: 'sky', n: ['سکائی نیوز', 'Sky News'], s: 'Sky News', c: '#b91c1c', u: 'https://www.youtube.com/@SkyNews/live' },
    { g: 'islamic', id: 'trt', n: ['ٹی آر ٹی ورلڈ', 'TRT World'], s: 'TRT World', c: '#dc2626', u: 'https://www.youtube.com/@trtworld/live' }
  ];
  var TF = { g: 'pk' };
  function chans(g) {
    var ov = lget('tv.ov', {}), list = CH.filter(function (c) { return c.g === g; }).map(function (c) { return { id: c.id, n: tt(c.n[0], c.n[1]), s: c.s, c: c.c, u: ov[c.id] || c.u }; });
    if (g === 'mine') list = lget('tv.mine', []).map(function (c, i) { return { id: 'm' + i, n: c.n, s: c.n, c: '#475569', u: c.u, mine: i }; });
    return list;
  }
  function vTv() {
    CL.setTop(T('لائیو چینل', 'Live channels')); stopRot();
    var h = seg('tv') + chips([['pk', ['پاکستان', 'Pakistan']], ['world', ['عالمی', 'World']], ['islamic', ['اسلامی', 'Islamic']], ['mine', ['میرے', 'Mine']]], TF.g, 'tg');
    var l = chans(TF.g);
    h += l.length ? l.map(function (c) {
      return '<div class="card tvr"><span class="lg" style="background:' + c.c + '">' + esc(c.s.charAt(0)) + '</span><span class="tx"><b dir="auto">' + esc(c.n) + '</b><small>' + tt('یوٹیوب پر لائیو', 'Live on YouTube') + '</small></span>' +
        '<button class="live" data-tl="' + esc(c.u) + '">● ' + tt('لائیو', 'LIVE') + '</button><button class="sbtn tsm" data-ts="' + esc(c.s) + '" aria-label="search">🔍</button><button class="sbtn tsm" data-te="' + c.id + '" aria-label="edit">✎</button></div>';
    }).join('') : '<div class="card center"><p class="mut">' + tt('ابھی کوئی اپنا چینل نہیں۔ نیچے "چینل شامل کریں" دبائیں۔', 'No channels yet. Tap "Add channel" below.') + '</p></div>';
    h += '<button class="sbtn" id="tadd" style="width:100%;margin-top:6px">＋ ' + tt('اپنا چینل شامل کریں', 'Add your own channel') + '</button>' +
      '<p class="note">' + tt('بٹن دبانے پر چینل کی اپنی یوٹیوب لائیو نشریات کھلتی ہے (یوٹیوب ایپ میں)۔ ایپ نشریات خود نہیں چلاتی۔ اگر چینل اس وقت لائیو نہ ہو یا لنک بدل گیا ہو تو 🔍 سے یوٹیوب پر تلاش کریں، یا ✎ سے لنک خود بدل دیں۔', 'The button opens the channel\'s own YouTube live stream (in the YouTube app); this app does not play streams itself. If a channel is not live or a link changed, use 🔍 to search YouTube or ✎ to edit the link.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    bind('nv', function (v) { nav(v); });
    bind('tg', function (v) { TF.g = v; vTv(); });
    bind('tl', function (u) { open(u); });
    bind('ts', function (s) { open(ysearch(s)); });
    bind('te', function (id) {
      var c = chans(TF.g).filter(function (x) { return x.id === id; })[0]; if (!c) return;
      CL.ask(tt('لنک: ', 'Link: ') + c.n, c.u, function (v) {
        v = String(v || '').trim(); if (!/^https?:\/\//i.test(v)) { CL.toast('درست لنک لکھیں (https://…)', 'Enter a valid link (https://…)'); return; }
        if (c.mine !== undefined) { var m = lget('tv.mine', []); m[c.mine].u = v; lset('tv.mine', m); } else { var ov = lget('tv.ov', {}); ov[id] = v; lset('tv.ov', ov); }
        vTv();
      }, 'https://www.youtube.com/@channel/live');
    });
    $('#tadd').onclick = function () {
      CL.ask(tt('چینل کا نام', 'Channel name'), '', function (n) {
        n = String(n || '').trim(); if (!n) return;
        setTimeout(function () {
          CL.ask(tt('لائیو لنک (خالی چھوڑیں تو یوٹیوب سرچ)', 'Live link (leave empty for a YouTube search)'), '', function (u) {
            u = String(u || '').trim(); if (u && !/^https?:\/\//i.test(u)) { CL.toast('درست لنک لکھیں', 'Enter a valid link'); return; }
            var m = lget('tv.mine', []); m.push({ n: n, u: u || ysearch(n) }); lset('tv.mine', m); TF.g = 'mine'; vTv();
          }, 'https://…');
        }, 50);
      }, tt('مثلاً: پبلک نیوز', 'e.g. Public News'));
    };
  }
  V.tv = vTv;

  /* ---------- news settings ---------- */
  function sw(id, ur, en, on, sub) { return '<div class="row"><div class="t"><b>' + tt(ur, en) + '</b>' + (sub ? '<small class="e" style="display:block">' + tt(sub[0], sub[1]) + '</small>' : '') + '</div><button class="sw" id="' + id + '" aria-pressed="' + !!on + '"></button></div>'; }
  function vNewsSet() {
    CL.setTop(T('خبروں کی ترتیبات', 'News settings')); stopRot();
    var hc = hcats(), on = srcOn();
    var h = '<div class="card" style="margin-top:8px">' + sw('nh', 'ہوم پر آج کی خبریں', 'Headlines on home', P('home', true) !== false) + sw('nt', 'ہوم پر لائیو چینل کارڈ', 'Live channels card on home', P('tvcard', true) !== false) + sw('nb', 'نیچے "خبریں" ٹیب دکھائیں', 'Show the News tab at the bottom', P('tab', true) !== false) + '</div>' +
      '<div class="card"><b>' + tt('خودکار گھومنا', 'Auto-rotate') + '</b><span class="fl">' + tt('ہوم پر سرخیاں خود بدلنے کی رفتار', 'How fast home headlines change') + '</span>' + chips([['off', ['بند', 'Off']], ['slow', ['آہستہ', 'Slow']], ['norm', ['عام', 'Normal']], ['fast', ['تیز', 'Fast']]], P('rot', 'norm'), 'nr') +
      '<span class="fl">' + tt('ہوم پر سرخیوں کی تعداد', 'Headlines on home') + '</span>' + chips([[1, ['۱', '1']], [2, ['۲', '2']], [3, ['۳', '3']], [4, ['۴', '4']], [5, ['۵', '5']]], P('count', 4), 'nn') + '</div>' +
      '<div class="card"><b>' + tt('ہوم پر کون سی خبریں', 'Home categories') + '</b><div class="chips">' + CATS.slice(1).map(function (x) { return '<button class="chip' + (hc.indexOf(x[0]) >= 0 ? ' on' : '') + '" data-nhc="' + x[0] + '">' + L(x[1]) + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><b>' + tt('خبر کے ادارے', 'Sources') + '</b><div class="chips">' + OUTLETS.map(function (o) { return '<button class="chip' + (on.indexOf(o.id) >= 0 ? ' on' : '') + '" data-nso="' + o.id + '">' + L(o.n) + '</button>'; }).join('') + '</div></div>' +
      '<div class="card"><button class="sbtn p" id="nrf" style="width:100%">⟳ ' + tt('ابھی خبریں تازہ کریں', 'Refresh headlines now') + '</button><button class="sbtn" id="nback" style="width:100%;margin-top:8px">' + tt('خبریں کھولیں', 'Open News') + '</button></div>' +
      '<p class="note">' + tt('خبریں ایپ کھلی ہونے پر ہر ۱۵ منٹ بعد خود تازہ ہوتی ہیں۔ ایپ بند ہو تو اینڈرائیڈ بیک گراؤنڈ میں انٹرنیٹ سے خبریں لانے نہیں دیتا۔', 'Headlines refresh every 15 minutes while the app is open. Android does not let apps fetch news in the background.') + '</p>' + CL.footer();
    $('#body').innerHTML = h;
    function tog(id, key, def) { $('#' + id).onclick = function () { setP(key, !(P(key, def) !== false)); vNewsSet(); if (key === 'tab') CL.render(); }; }
    tog('nh', 'home', true); tog('nt', 'tvcard', true); tog('nb', 'tab', true);
    bind('nr', function (v) { setP('rot', v); vNewsSet(); });
    bind('nn', function (v) { setP('count', +v); vNewsSet(); });
    bind('nhc', function (k) { var l = hcats().slice(), i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); setP('hcats', l); vNewsSet(); });
    bind('nso', function (k) { var l = srcOn().slice(), i = l.indexOf(k); if (i >= 0) { if (l.length > 1) l.splice(i, 1); } else l.push(k); setP('src', l); lset('news.cache', null); vNewsSet(); });
    $('#nrf').onclick = function () { this.textContent = '…'; refresh(true).then(function () { CL.toast('خبریں تازہ ہو گئیں', 'Headlines refreshed'); vNewsSet(); }); };
    $('#nback').onclick = function () { nav('news'); };
  }
  V.newsset = vNewsSet;

  /* row inside Privacy and display */
  var basePrefs = V.prefs;
  if (basePrefs) V.prefs = function () { basePrefs(); var f = document.querySelector('#body .foot'); var row = '<div class="card"><button class="cat" data-nv="newsset" style="padding:6px 0"><span class="t"><b>' + tt('خبریں اور لائیو چینل', 'News and live channels') + '</b></span><span>›</span></button></div>'; if (f) f.insertAdjacentHTML('beforebegin', row); else $('#body').insertAdjacentHTML('beforeend', row); bind('nv', function (v) { nav(v); }); };

  /* warm the cache a few seconds after start so the home card has headlines */
  setTimeout(function () { if (!window.CLEANOVA_MOCK || window.CLEANOVA_NEWS) refresh(false).then(function () { if (S.view === 'life' && $('#nwsC')) homeNews(); }); }, 2500);
  CL.news = { refresh: refresh, items: items, parseFeed: parseFeed, OUTLETS: OUTLETS, CH: CH };
};
