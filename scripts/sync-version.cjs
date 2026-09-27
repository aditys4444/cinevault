const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, '../CineVaultapk Web');
const cleanVersion = '2.6.7';
const buildCode = 2670;

const apkPath = path.join(rootDir, 'CineVault.apk');
const stats = fs.statSync(apkPath);
const sizeBytes = stats.size;
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
const apkSizeBytes = sizeBytes.toLocaleString('en-US');
const apkHash = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');

console.log(`CineVault v${cleanVersion} (Build ${buildCode})`);
console.log(`APK Size: ${sizeMB} MB (${apkSizeBytes} bytes)`);
console.log(`SHA-256: ${apkHash}`);

function updateHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf-8');

  // JSON-LD
  html = html.replace(/"softwareVersion":\s*"[^"]*"/g, `"softwareVersion": "${cleanVersion}"`);
  html = html.replace(/"fileSize":\s*"[^"]*"/g, `"fileSize": "${sizeMB}MB"`);

  // Announcement pill & badges
  html = html.replace(/CineVault\s+[\d.]+\s+Available/g, `CineVault ${cleanVersion} Available`);
  html = html.replace(/v[\d.]+\s*\([\d.]+\s*MB\)/g, `v${cleanVersion} (${sizeMB} MB)`);
  html = html.replace(/<span class="btn-badge-chip">v[\d.]+<\/span>/g, `<span class="btn-badge-chip">v${cleanVersion}</span>`);
  html = html.replace(/<span class="hero-badge">v[\d.]+<\/span>/g, `<span class="hero-badge">v${cleanVersion}</span>`);

  // SHA-256
  html = html.replace(/id="apkHash">\s*[a-fA-F0-9]{64}\s*<\/code>/g, `id="apkHash">${apkHash}</code>`);

  // Specs table
  html = html.replace(/<td class="specs-val val-gold">[\d.]+\s*\(Build\s*\d+\)\s*Stable<\/td>/g, `<td class="specs-val val-gold">${cleanVersion} (Build ${buildCode}) Stable</td>`);
  html = html.replace(/<td class="specs-val">[\d.]+\s*MB\s*\([0-9,]+\s*bytes\)<\/td>/g, `<td class="specs-val">${sizeMB} MB (${apkSizeBytes} bytes)</td>`);

  // Footer version
  html = html.replace(/Core v[\d.]+-release/g, `Core v${cleanVersion}-release`);

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log('✓ Updated HTML:', filePath);
}

updateHtmlFile(path.join(webDir, 'index.html'));
updateHtmlFile(path.join(webDir, 'dist/index.html'));

function updateJsFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let js = fs.readFileSync(filePath, 'utf-8');
  js = js.replace(/v2\.6\.[0-5]/g, `v${cleanVersion}`);
  js = js.replace(/26[45]0/g, String(buildCode));
  fs.writeFileSync(filePath, js, 'utf-8');
  console.log('✓ Updated JS:', filePath);
}

updateJsFile(path.join(webDir, 'app.js'));
updateJsFile(path.join(webDir, 'dist/app.js'));
