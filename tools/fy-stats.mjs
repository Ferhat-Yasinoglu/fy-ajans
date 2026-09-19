#!/usr/bin/env node
/* FY — sahne kartlarının sayılarını depodan sayar, data/fy-stats.json'a yazar.
   Uydurma sayı yok: her kart gerçek bir kaynağa bağlı.
     studio     studio/*.md            (README sayılmaz)       «Studio · N posts»
     skills     .claude/skills/<ad>/SKILL.md                    «Skills · N skills»
     memory     CLAUDE.md'deki kural satırları                  «Memory · N memories»
                (## Her zaman, ## Asla altındaki «- » ve ## Bana hatırlat altındaki «1. »)
     knowledge  course/chapter-*.html içindeki h2 + h3 başlıklar «Knowledge · N notes»
     boardroom  dosyada başlangıç; sayfa canlı değeri worker /stats'tan alır (yaklaşan randevu)
     agents / agentsOffline / analytics  elle; analytics sayfada oturum trafiğiyle artar
   Kullanım (depo kökünde):  node tools/fy-stats.mjs           yaz
                             node tools/fy-stats.mjs --check   dosya sayımla uyuşmuyorsa çıkış 1 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const p = join(root, 'data', 'fy-stats.json');
const cur = JSON.parse(readFileSync(p, 'utf8'));

const studio = readdirSync(join(root, 'studio')).filter((f) => f.endsWith('.md') && f !== 'README.md').length;
const skills = readdirSync(join(root, '.claude', 'skills')).filter((d) => existsSync(join(root, '.claude', 'skills', d, 'SKILL.md'))).length;

const brain = readFileSync(join(root, 'CLAUDE.md'), 'utf8').split('\n');
let section = '', memory = 0;
for (const line of brain) {
  if (line.startsWith('## ')) { section = line.slice(3).trim(); continue; }
  if ((section === 'Her zaman' || section === 'Asla') && /^- /.test(line)) memory++;
  if (section === 'Bana hatırlat' && /^\d+\. /.test(line)) memory++;
}

let knowledge = 0;
for (const f of readdirSync(join(root, 'course')).filter((f) => /^chapter-\d+\.html$/.test(f))) {
  knowledge += (readFileSync(join(root, 'course', f), 'utf8').match(/<h[23][\s>]/g) || []).length;
}

const next = { ...cur, studio, skills, memory, knowledge };
delete next.coaches;                                   // karşılığı olmayan kart kaldırıldı
next.updated = new Date().toISOString().slice(0, 10);

const same = ['studio', 'skills', 'memory', 'knowledge'].every((k) => cur[k] === next[k]) && !('coaches' in cur);
if (process.argv.includes('--check')) {
  console.log(same ? 'fy-stats güncel' : `fy-stats eski: studio ${cur.studio}→${studio}, skills ${cur.skills}→${skills}, memory ${cur.memory}→${memory}, knowledge ${cur.knowledge}→${knowledge}`);
  process.exit(same ? 0 : 1);
}
if (same) { console.log('fy-stats zaten güncel'); process.exit(0); }
writeFileSync(p, JSON.stringify(next, null, 2) + '\n');
console.log(`fy-stats yazıldı: studio ${studio}, skills ${skills}, memory ${memory}, knowledge ${knowledge}`);
