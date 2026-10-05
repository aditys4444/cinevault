const fs = require('fs');
const path = require('path');

const versionData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/version.json'), 'utf8'));
const versionStr = JSON.stringify(versionData, null, 2) + '\n';

const webDir = path.resolve(__dirname, '../../CineVaultapk Web');
const targets = [
  path.join(webDir, 'version.json'),
  path.join(webDir, 'dist/version.json'),
  path.join(webDir, 'api/app-update'),
  path.join(webDir, 'api/app-update.json'),
  path.join(webDir, 'dist/api/app-update'),
  path.join(webDir, 'dist/api/app-update.json'),
];

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, versionStr, 'utf8');
  console.log('Updated:', t);
}

// Sync remote catalog API files to dist
const apiFiles = ['channels.json', 'adult.json', 'custom-content.json'];
for (const file of apiFiles) {
  const src = path.join(webDir, 'api', file);
  const dest = path.join(webDir, 'dist/api', file);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Synced content: api/${file} -> dist/api/${file}`);
  }
}

// Update index.html and dist/index.html
function updateHtml(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/"softwareVersion":\s*"[^"]*"/g, `"softwareVersion": "${versionData.latestVersionName}"`);
  html = html.replace(/"fileSize":\s*"[^"]*"/g, `"fileSize": "${versionData.fileSizeMB}"`);
  html = html.replace(/CineVault\s+[\d.]+\s+Available/g, `CineVault ${versionData.latestVersionName} Available`);
  html = html.replace(/v[\d.]+\s*\([\d.]+\s*MB\)/g, `v${versionData.latestVersionName} (${versionData.fileSizeMB})`);
  html = html.replace(/<span class="btn-badge-chip">v[\d.]+<\/span>/g, `<span class="btn-badge-chip">v${versionData.latestVersionName}</span>`);
  html = html.replace(/id="apkHash">\s*[a-fA-F0-9]{64}\s*<\/code>/g, `id="apkHash">${versionData.sha256}</code>`);
  html = html.replace(/Core v[\d.]+-release/g, `Core v${versionData.latestVersionName}-release`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Updated HTML:', filePath);
}

updateHtml(path.join(webDir, 'index.html'));
updateHtml(path.join(webDir, 'dist/index.html'));
console.log('Website sync complete!');
