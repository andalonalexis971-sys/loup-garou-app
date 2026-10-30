const { chromium } = require('playwright');
const [,, file, w, h, out, scale] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(scale || 1) });
  await p.goto('file://' + require('path').resolve(file), { timeout: 240000 });
  await p.waitForFunction(() => window.DONE !== false, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out, type: 'jpeg', quality: 88 });
  await b.close();
})();
