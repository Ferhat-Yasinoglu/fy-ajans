#!/usr/bin/env node
/* Google Takvim aboneliği anahtarını kurar — /calendar.ics?key=… için.

   Kullanım (depo kökünde):  node tools/set-calendar-token.mjs
   Rastgele 32 karakterlik anahtar üretir, BİR KEZ gösterir ve SHA-256 özetini worker/wrangler.toml
   [vars] CAL_FEED_TOKEN_HASH'e yazar. Anahtarın kendisi hiçbir dosyaya yazılmaz; yalnızca Google
   Takvim'e eklediğin adresin içinde durur. Yeniden çalıştırınca eski adres geçersiz olur. */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOML = join(ROOT, 'worker/wrangler.toml');
const token = randomBytes(24).toString('base64url');            // 32 karakter, URL'de güvenli
const hash = createHash('sha256').update(token).digest('hex');

let toml = readFileSync(TOML, 'utf8');
const line = `CAL_FEED_TOKEN_HASH = "${hash}"`;
if (/^CAL_FEED_TOKEN_HASH = ".*"$/m.test(toml)) toml = toml.replace(/^CAL_FEED_TOKEN_HASH = ".*"$/m, line);
else if (/^\[vars\]\n/m.test(toml)) toml = toml.replace(/^\[vars\]\n/m, `[vars]\n# Takvim aboneliği (/calendar.ics?key=…) anahtarının SHA-256 özeti; node tools/set-calendar-token.mjs yazar.\n${line}\n`);
else { console.error('\n✗ worker/wrangler.toml içinde [vars] bulunamadı.\n'); process.exit(1); }
writeFileSync(TOML, toml);
console.log('\n✓ CAL_FEED_TOKEN_HASH worker/wrangler.toml içine yazıldı.');
console.log('\n  TAKVİM ADRESİ (bir kez gösterilir, Google Takvim → «URL\'den ekle»):');
console.log('  https://fy-ajans.ferhatyasinoglu.workers.dev/calendar.ics?key=' + token + '\n');
