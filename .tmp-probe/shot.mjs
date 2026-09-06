import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:1180, height:660 }, deviceScaleFactor:2 });
for (const f of ['live','static']) {
  await p.goto(`http://127.0.0.1:8899/.tmp-probe/${f}.html`);
  await p.waitForTimeout(3000);
  await p.screenshot({ path:`/home/user/fy-ajans/.tmp-probe/sheet-${f}.png`, fullPage:true });
}
await b.close();
