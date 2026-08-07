const { chromium } = require('playwright');
(async()=> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG>', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR>', err.toString()));
  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.error('GOTO_ERROR', e && e.message);
  }
  await page.waitForTimeout(1000);
  const h1 = await page.$('h1');
  const computed = h1 ? await page.evaluate(el=>{ const s = window.getComputedStyle(el); return {fontSize: s.fontSize, fontWeight: s.fontWeight, fontFamily: s.fontFamily, color: s.color}; }, h1) : null;
  const sheets = await page.evaluate(()=>Array.from(document.styleSheets).map(s => s.href || (s.ownerNode && s.ownerNode.textContent ? 'inline:'+s.ownerNode.textContent.slice(0,120) : 'inline')));
  console.log('COMPUTED_H1', computed);
  console.log('STYLESHEETS_COUNT', sheets.length);
  console.log('STYLESHEETS_SAMPLE', sheets.slice(0,6));
  await page.screenshot({path:'playwright-screenshot.png', fullPage:true});
  console.log('SCREENSHOT: playwright-screenshot.png');
  await browser.close();
  process.exit(0);
})().catch(e=>{ console.error('SCRIPT_ERROR', e); process.exit(2); });
