import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{ width: 1180, height: 700 }, deviceScaleFactor: 2 });
const EN = ['The Wake-Up','The Formula','The Agent','The Workshop','The Lab','The Showcase','The Summit'];
const cell = (n, kind) => `<figure><div class=art>
  <span class=en>${EN[n-1]}</span>
  <img src="/img/course/ch${n}${kind}.svg">
  <i class=shade></i></div><figcaption>ch${n}${kind||'  (canlı)'}</figcaption></figure>`;
for (const kind of ['', '-static']) {
  await p.setContent(`<style>
   body{margin:0;background:#0b0a09;font:12px system-ui;color:#bbb;padding:14px}
   .row{display:flex;gap:14px}
   .art{position:relative;width:279px;height:279px;overflow:hidden;border-radius:14px}
   .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
   .en{position:absolute;top:18px;left:0;right:0;text-align:center;font:700 12px ui-monospace,monospace;
       letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.75);z-index:1}
   .shade{position:absolute;inset:0;background:linear-gradient(0deg,rgba(11,10,9,.9),transparent 50%,transparent)}
   figcaption{padding-top:6px}</style>
   <div class=row>${[1,2,3,4].map(n=>cell(n,kind)).join('')}</div>
   <div class=row style="margin-top:14px">${[5,6,7].map(n=>cell(n,kind)).join('')}</div>`,
   { baseURL: 'http://127.0.0.1:8899' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `/home/user/fy-ajans/.tmp-probe/sheet${kind||'-live'}.png`, fullPage: true });
}
await b.close();
