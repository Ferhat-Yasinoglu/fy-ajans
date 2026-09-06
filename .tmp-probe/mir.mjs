import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:900, height:900 } });
for (let n = 1; n <= 7; n++) {
  await p.goto(`http://127.0.0.1:8899/img/course/ch${n}.svg`);
  await p.waitForTimeout(250);
  const r = await p.evaluate(() => {
    const svg = document.querySelector('svg');
    const vb = svg.viewBox.baseVal, sr = svg.getBoundingClientRect();
    const k = vb.width / sr.width;
    const out = [];
    document.querySelectorAll('g[mask]').forEach(g => {
      const id = g.getAttribute('mask').slice(5, -1);
      const mask = document.getElementById(id);
      const mr = mask.querySelector('rect');
      const win = [ +mr.getAttribute('y'), +mr.getAttribute('y') + +mr.getAttribute('height') ];
      const rc = g.getBoundingClientRect();                       // maskesiz gerçek geometri
      const geo = [ +((rc.top - sr.top) * k).toFixed(1), +((rc.bottom - sr.top) * k).toFixed(1) ];
      const vis = [ Math.max(win[0], geo[0]), Math.min(win[1], geo[1]) ];
      out.push({ mask: id, maskeAralik: win, yansimaGeometri: geo,
                 gorunenYukseklik: +Math.max(0, vis[1] - vis[0]).toFixed(1),
                 grupOpaklik: g.getAttribute('opacity') });
    });
    return out;
  });
  console.log(`ch${n}:`, JSON.stringify(r));
}
await b.close();
