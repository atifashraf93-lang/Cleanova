/* Anonymous usage counts for the SMAA dashboard.
   Sent: random install id, app name, app build number, Android version, language, time zone, "open" and seconds-in-app.
   Never sent: name, phone number, contacts, messages, photos, files, location, family or chat data.
   The user can switch it off in Settings. */
(function () {
  'use strict';
  var APP = 'life';
  var STATS_URL = 'https://script.google.com/macros/s/AKfycbwHw9csC2VqvVvnAyLkdf60jd37NoJ1hvCTIlsIimGYgRBansAjn8zgfVcd3ZmIleMZ/exec';
  var PFX = 'cleanova.st.';
  function get(k) { try { var v = localStorage.getItem(PFX + k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* storage off */ } }
  function on() { return get('on') !== false; }
  function iid() { var i = get('iid'); if (!i) { i = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); set('iid', i); } return i; }
  function av() { var m = /Android (\d+)/.exec(navigator.userAgent); return m ? m[1] : ''; }
  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  var q = [], timer = 0, shown = Date.now(), vis = document.visibilityState !== 'hidden';
  function flush() {
    if (!on()) { q.length = 0; return; }
    var n = 0;
    while (q.length && n++ < 5) {
      var body = JSON.stringify({ a: APP, v: 'b' + (window.CL_BUILD || 0), i: iid(), z: tz(), l: (navigator.language || '').slice(0, 5), o: av(), ev: q.splice(0, 8) });
      try { var img = new Image(); img.src = STATS_URL + '?d=' + encodeURIComponent(body) + '&r=' + Math.random().toString(36).slice(2, 6); } catch (e) { /* ignore */ }
    }
  }
  function track(ev, n) {
    if (!on()) return;
    q.push({ e: ev, n: n || 1, t: Date.now() });
    if (q.length >= 15) flush(); else if (!timer) timer = setTimeout(function () { timer = 0; flush(); }, 4000);
  }
  track('open');
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { if (vis) track('secs', Math.round((Date.now() - shown) / 1000)); vis = false; flush(); }
    else { vis = true; shown = Date.now(); track('open'); }
  });
  setInterval(flush, 30000);
  window.LifeStats = { on: on, set: function (v) { set('on', !!v); if (!v) q.length = 0; } };
})();
