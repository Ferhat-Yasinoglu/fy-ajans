#!/usr/bin/env node
/* PreToolUse kancası — üretilmiş dosyalara elle yazmayı engeller.
   CLAUDE.md'deki «asla» kuralının zorla uygulanan hâli (Bölüm 4: beyne yazılan kural okunur, kanca
   zorla uygulanır). Claude Code, Edit/Write/MultiEdit'ten önce bu betiği çalıştırır ve aracın girdisini
   stdin'e JSON olarak verir. Çıkış kodu 2 = engelle; stderr'e yazılan metin Claude'a gösterilir.
   Bağımlılığı yok; proje kökünde çalışır (Claude Code kancaları oradan başlatır). */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

let input = '';
try { input = readFileSync(0, 'utf8'); } catch {}
let hedef = '';
try {
  const j = JSON.parse(input || '{}');
  hedef = String((j.tool_input && (j.tool_input.file_path || j.tool_input.path)) || '');
} catch {}
if (!hedef) process.exit(0);

const rel = relative(process.cwd(), resolve(hedef)).replace(/\\/g, '/');
const korunan = /^(de|en|fa|js\/lang)\/|^sitemap\.xml$/;
if (korunan.test(rel)) {
  process.stderr.write(
    `Engellendi: ${rel} üretilmiş bir dosya, elle düzenlenmez. Türkçe kaynağı (kök HTML) ve ` +
    `i18n/*.json'daki aynı anahtarı düzelt, sonra node tools/build-i18n.mjs çalıştır (skill: ceviri).\n`);
  process.exit(2);
}
