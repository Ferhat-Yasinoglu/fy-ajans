#!/usr/bin/env node
/* /leads (mini CRM) yönetici şifresini kurar — panoya girmeden.

   Kullanım (depo kökünde):
     node tools/set-admin-pass.mjs            # rastgele 24 karakterlik şifre üretir, BİR KEZ gösterir
     node tools/set-admin-pass.mjs "şifrem"   # kendi şifreni kullanır

   Ne yapar: şifrenin PBKDF2-SHA256 özetini (rastgele tuz, 100.000 tur) worker/wrangler.toml [vars]
   içindeki ADMIN_PASS_HASH'e yazar. Şifrenin kendisi hiçbir dosyaya YAZILMAZ; özet geri çevrilemez ve
   uzun rastgele bir şifre için kaba kuvvete dayanıklıdır. Commit + merge sonrası Workers Builds dağıtır.
   Panodan ADMIN_PASS gizli değişkeni girilirse o öncelik kazanır (bkz. worker/src/index.js). */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOML = join(ROOT, 'worker/wrangler.toml');
const ITER = 100000;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';   // karışan harfler yok (0/O, 1/l/I)
function randomPassword(n = 24) {
  const bytes = randomBytes(n * 2); let out = '';
  for (let i = 0; i < bytes.length && out.length < n; i++) { const b = bytes[i]; if (b < 232) out += ALPHABET[b % ALPHABET.length]; }
  return out;
}
const given = process.argv[2];
const password = given && given.trim() ? given.trim() : randomPassword();
if (password.length < 12) { console.error('\n✗ Şifre en az 12 karakter olmalı.\n'); process.exit(1); }

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const value = `pbkdf2$${ITER}$${salt.toString('base64')}$${hash.toString('base64')}`;

let toml = readFileSync(TOML, 'utf8');
const line = `ADMIN_PASS_HASH = "${value}"`;
if (/^ADMIN_PASS_HASH = ".*"$/m.test(toml)) toml = toml.replace(/^ADMIN_PASS_HASH = ".*"$/m, line);
else if (/^\[vars\]\n/m.test(toml)) toml = toml.replace(/^\[vars\]\n/m, `[vars]\n# /leads yönetici şifresinin PBKDF2 özeti — şifre değil; node tools/set-admin-pass.mjs yazar.\n${line}\n`);
else { console.error('\n✗ worker/wrangler.toml içinde [vars] bulunamadı.\n'); process.exit(1); }
writeFileSync(TOML, toml);

console.log('\n✓ ADMIN_PASS_HASH worker/wrangler.toml içine yazıldı.');
console.log(given ? '✓ Verdiğin şifre kullanıldı (burada tekrar gösterilmez).' : '\n  ŞİFRE (bir kez gösterilir, not al):  ' + password);
console.log('\nSıradaki adım: git add worker/wrangler.toml && git commit -m "leads sifresi" && git push  → merge → /leads\n');
