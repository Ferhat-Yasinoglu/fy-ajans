import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:340, height:360 }, deviceScaleFactor:3 });
await p.goto('http://127.0.0.1:8899/.tmp-probe/worst.html');
await p.waitForTimeout(1500);
await p.screenshot({ path:'/home/user/fy-ajans/.tmp-probe/ch6-worst.png' });
await b.close();
