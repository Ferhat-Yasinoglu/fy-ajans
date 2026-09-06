import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
for (const w of [1280, 390]) {
  const p = await b.newPage({ viewport:{ width:w, height:1000 } });
  await p.goto('http://127.0.0.1:8899/index.html');
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const art = document.querySelectorAll('.chapter__art')[5];      // 6. bölüm
    const a = art.getBoundingClientRect(), l = art.querySelector('.en').getBoundingClientRect();
    const k = 800 / a.width;                                        // sayfa px -> SVG birimi
    return { artW:+a.width.toFixed(1), labelTopSVG:+((l.top-a.top)*k).toFixed(1), labelBotSVG:+((l.bottom-a.top)*k).toFixed(1) };
  });
  console.log(`viewport ${w}px -> kart ${r.artW}px | etiket SVG bandı y=${r.labelTopSVG}..${r.labelBotSVG}`);
  await p.close();
}
await b.close();
