<#
Alan adı değişimi — tek komut.

Kullanım (depo kökünde):
  powershell -ExecutionPolicy Bypass -File tools/set-domain.ps1 -Domain fyajans.de

Ne yapar:
  1. Sitedeki tüm mutlak adresleri (canonical, Open Graph, JSON-LD, sitemap, robots, README)
     eski GitHub Pages adresinden https://<alan-adı> adresine çevirir.
  2. 404.html içindeki /fy-ajans/ mutlak yollarını / yapar.
  3. Depo köküne CNAME dosyasını yazar (GitHub Pages bunu okur).
  4. Alan adı firmasında girilecek DNS kayıtlarını ekrana yazar.

Sonra: commit + push, GitHub → Settings → Pages → Custom domain alanına alan adını yaz,
DNS kontrolü geçince "Enforce HTTPS" işaretle. worker/wrangler.toml içindeki ALLOWED_ORIGINS'e
yeni adresi eklemeyi unutma (Worker kuruluysa).
#>
param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [string]$OldBase = "https://ferhat-yasinoglu.github.io/fy-ajans"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Domain = $Domain.Trim().ToLower() -replace '^https?://', '' -replace '/$', ''
$newBase = "https://$Domain"
$enc = New-Object System.Text.UTF8Encoding $false

$files = Get-ChildItem $root -Recurse -Include *.html, *.xml, *.txt, *.webmanifest, *.md, *.toml |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|\.wrangler)\\' }

$changed = 0
foreach ($f in $files) {
  $t = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
  $n = $t.Replace($OldBase, $newBase)
  if ($f.Name -eq "404.html") { $n = $n.Replace('"/fy-ajans/', '"/').Replace("(`"/fy-ajans/", "(`"/") }
  if ($f.Name -eq "wrangler.toml") { $n = $n -replace 'ALLOWED_ORIGINS = "([^"]*)"', ('ALLOWED_ORIGINS = "$1,' + $newBase + '"') }
  if ($n -ne $t) { [IO.File]::WriteAllText($f.FullName, $n, $enc); $changed++; Write-Host "güncellendi: $($f.FullName.Replace($root, ''))" }
}
[IO.File]::WriteAllText((Join-Path $root "CNAME"), "$Domain`n", $enc)
Write-Host "CNAME yazıldı: $Domain"
Write-Host "$changed dosya değişti. Şimdi commit + push."
Write-Host ""
Write-Host "DNS kayıtları (alan adı firmasının paneline gir):"
Write-Host "  A     @    185.199.108.153"
Write-Host "  A     @    185.199.109.153"
Write-Host "  A     @    185.199.110.153"
Write-Host "  A     @    185.199.111.153"
Write-Host "  CNAME www  ferhat-yasinoglu.github.io"
Write-Host ""
Write-Host "GitHub: depo → Settings → Pages → Custom domain: $Domain → Save; DNS geçince Enforce HTTPS."
