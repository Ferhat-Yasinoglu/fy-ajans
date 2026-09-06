import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 900, height: 900 } });
await p.goto('http://127.0.0.1:8899/.tmp-probe/probe.html');
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const svg = document.querySelector('svg');
  const sr = svg.getBoundingClientRect();
  const toUser = r => ({ cx: +((r.x + r.width/2 - sr.x)).toFixed(1), cy: +((r.y + r.height/2 - sr.y)).toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) });
  const res = [];
  const els = [...document.querySelectorAll('.rise')];
  for (const t of [0, 20, 50, 80, 99]) {              // % of the 100s paused animation
    els.forEach(e => e.style.animationDelay = `-${t}s`);
    const row = els.map(e => toUser(e.getBoundingClientRect()));
    res.push({ pct: t, hearts: row });
  }
  // control: same element with transform-box:fill-box
  els.forEach(e => { e.style.transformBox='fill-box'; e.style.transformOrigin='center'; });
  const ctl = [];
  for (const t of [0, 20, 50, 80, 99]) {
    els.forEach(e => e.style.animationDelay = `-${t}s`);
    ctl.push({ pct: t, hearts: els.map(e => toUser(e.getBoundingClientRect())) });
  }
  const groups = [...document.querySelectorAll('g')].filter(g => g.querySelector(':scope > .rise')).map(g => g.getAttribute('transform'));
  return { groups, buggy: res, control: ctl, computedTransformBox: getComputedStyle(els[0]).transformBox };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
