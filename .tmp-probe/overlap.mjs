import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await b.newPage({ viewport:{ width:800, height:800 } });
await p.goto('http://127.0.0.1:8899/img/course/ch6.svg');
await p.waitForTimeout(300);
const LBL = [51.6, 110.1];                       // 279px kart: İngilizce etiketin SVG bandı
const r = await p.evaluate((LBL) => {
  const svg = document.querySelector('svg'), sr = svg.getBoundingClientRect(), k = 800 / sr.width;
  const els = [...document.querySelectorAll('.rise')];
  els.forEach(e => { e.style.animationPlayState='paused'; e.style.animationDuration='100s';
                     e.style.animationTimingFunction='linear'; });
  const op = pct => pct<14 ? pct/14 : pct<=80 ? 1 : (100-pct)/20;   // rise keyframe opaklığı
  let hits = [], worst = null;
  for (let t = 0; t <= 100; t++) {
    els.forEach(e => e.style.animationDelay = `-${t}s`);
    els.forEach((e, i) => {
      const rc = e.getBoundingClientRect();
      const top = (rc.top - sr.top) * k, bot = (rc.bottom - sr.top) * k;
      const ov = Math.min(bot, LBL[1]) - Math.max(top, LBL[0]);
      const a = op(t) * 0.92;                                        // grup opacity .92
      if (ov > 0 && a > 0.35) {
        hits.push({ kalp:i, pct:t, ortusme:+ov.toFixed(1), opaklik:+a.toFixed(2) });
        if (!worst || ov * a > worst.ortusme * worst.opaklik) worst = { kalp:i, pct:t, ortusme:+ov.toFixed(1), opaklik:+a.toFixed(2) };
      }
    });
  }
  return { toplamOrnek: hits.length, enKotu: worst, ornekler: hits.slice(0, 8) };
}, LBL);
console.log(JSON.stringify(r, null, 1));
await b.close();
