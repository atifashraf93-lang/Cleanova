/* Starts the web app in a headless browser and opens every bottom tab and key tools; any uncaught error fails the build. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..', 'www');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
srv.listen(8199, async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/app.js', async r => { const resp = await r.fetch(); let t = await resp.text(); t = t.replace('var CL = { views: {} };', 'var CL = window.CL = { views: {} };'); r.fulfill({ response: resp, body: t, contentType: 'application/javascript' }); });
  await p.route(/googleapis|github|firebase/, r => r.abort());
  await p.goto('http://localhost:8199/index.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelector('#modal').hidden = true; });
  const ok = [];
  for (const id of ['life', 'chat', 'health', 'news', 'home', 'days']) {
    await p.evaluate(i => { CL.S.granted = true; CL.S.back = []; CL.S.view = i; CL.render(); }, id); await p.waitForTimeout(300);
    ok.push(id + ':' + (await p.evaluate(() => document.getElementById('body').innerText.length > 20)));
  }
  for (const id of ['settings', 'diag', 'family', 'studio', 'tbook', 'kids', 'sensors', 'noise', 'speed', 'level', 'light', 'vib', 'wifi', 'bills', 'fuel']) {
    await p.evaluate(i => { CL.S.back = []; CL.S.view = i; CL.render(); }, id); await p.waitForTimeout(300);
    ok.push(id + ':' + (await p.evaluate(() => document.getElementById('body').innerText.length > 5)));
  }
  console.log(ok.join(' '));
  await b.close(); srv.close();
  const bad = errs.filter(e => !/plugin|Capacitor/i.test(e));
  if (bad.length || ok.some(x => /:false/.test(x))) { console.log('FAIL', JSON.stringify(bad), ok.join(' ')); process.exit(1); }
  console.log('smoke ok');
});
