#!/usr/bin/env node

/**
 * CineVault Release & Website Sync Script
 *
 * This script automates preparing a new CineVault APK update and publishing it
 * to https://cinevaultapk.online/ ONLY AFTER EXPLICIT DEVELOPER PERMISSION.
 *
 * Usage:
 *   node scripts/release-update.js
 *   npm run update:publish
 *   node scripts/release-update.js --version 2.4.1 --dry-run
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project paths
const ROOT_DIR = path.resolve(__dirname, '..');
const APK_PATH = path.join(ROOT_DIR, 'CineVault.apk');
const VERSION_TS_PATH = path.join(ROOT_DIR, 'src', 'config', 'version.ts');
const BUILD_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const LOCAL_VERSION_JSON = path.join(ROOT_DIR, 'public', 'version.json');

// Website paths (sibling directory)
const WEB_DIR = path.resolve(ROOT_DIR, '..', 'CineVaultapk Web');
const WEB_VERSION_JSON = path.join(WEB_DIR, 'version.json');
const WEB_DIST_VERSION_JSON = path.join(WEB_DIR, 'dist', 'version.json');
const WEB_INDEX_HTML = path.join(WEB_DIR, 'index.html');
const WEB_DIST_INDEX_HTML = path.join(WEB_DIR, 'dist', 'index.html');
const WEB_DOWNLOADS_APK = path.join(WEB_DIR, 'downloads', 'CineVault.apk');
const WEB_DIST_DOWNLOADS_APK = path.join(WEB_DIR, 'dist', 'downloads', 'CineVault.apk');
const WEB_API_DIR = path.join(WEB_DIR, 'api');
const WEB_DIST_API_DIR = path.join(WEB_DIR, 'dist', 'api');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const autoYes = args.includes('--yes') || args.includes('-y');
const cliVersion = args.find((a, i) => args[i - 1] === '--version');
const cliChangelog = args.find((a, i) => args[i - 1] === '--changelog');
const cliMandatory = args.includes('--mandatory');

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

// Compute SHA-256 hash of a file
function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Read current version from src/config/version.ts
function getCurrentVersion() {
  if (fs.existsSync(VERSION_TS_PATH)) {
    const content = fs.readFileSync(VERSION_TS_PATH, 'utf-8');
    const match = content.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  }
  return '2.4.0';
}

// Suggest next patch version
function suggestNextVersion(current) {
  const parts = current.split('.').map((n) => parseInt(n, 10) || 0);
  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return `${current}.1`;
}

async function main() {
  console.log('\n===============================================================');
  console.log('       🎬 CineVault Release & Website Sync Manager 🎬          ');
  console.log('===============================================================\n');

  // 1. Verify CineVault.apk existence
  if (!fs.existsSync(APK_PATH)) {
    console.error(`❌ Error: CineVault.apk not found at:\n   ${APK_PATH}`);
    console.log('   Please run "npm run build:apk" first to generate the APK.\n');
    process.exit(1);
  }

  // 2. Verify CineVaultapk Web existence
  if (!fs.existsSync(WEB_DIR)) {
    console.error(`❌ Error: CineVaultapk Web directory not found at:\n   ${WEB_DIR}`);
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const suggestedVersion = suggestNextVersion(currentVersion);
  const apkStats = fs.statSync(APK_PATH);
  const apkSizeMB = (apkStats.size / (1024 * 1024)).toFixed(1);
  const apkSizeBytes = apkStats.size.toLocaleString();
  const apkHash = getSha256(APK_PATH);

  console.log(`Current App Version : v${currentVersion}`);
  console.log(`CineVault.apk Size  : ${apkSizeMB} MB (${apkSizeBytes} bytes)`);
  console.log(`SHA-256 Checksum    : ${apkHash}`);
  console.log('---------------------------------------------------------------\n');

  let rl = null;
  let newVersion = cliVersion || '';
  let changelogList = cliChangelog ? cliChangelog.split(';').map((s) => s.trim()) : [];
  let isMandatory = cliMandatory;

  // Interactive prompts if not passed via CLI
  if (!newVersion) {
    rl = createPrompt();
    const verInput = await askQuestion(rl, `Enter new version [default: ${suggestedVersion}]: `);
    newVersion = verInput.trim() || suggestedVersion;

    const changeInput = await askQuestion(
      rl,
      'Enter release highlights (comma or semicolon separated, or press Enter for defaults):\n> '
    );
    if (changeInput.trim()) {
      changelogList = changeInput
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      changelogList = [
        'Enhanced 4K HDR playback & AV1 decoding stability',
        'Optimized 65+ Live TV streaming edge connections',
        'Performance improvements and battery life optimizations',
        'Bug fixes and offline caching enhancements',
      ];
    }

    const mandatoryInput = await askQuestion(rl, 'Is this a mandatory update? (y/N): ');
    isMandatory = mandatoryInput.trim().toLowerCase() === 'y';
  } else if (changelogList.length === 0) {
    changelogList = [
      'Performance improvements and bug fixes',
      'Streaming stability updates',
    ];
  }

  const cleanVersion = newVersion.replace(/^[vV]/, '').trim();
  const buildCode = parseInt(cleanVersion.replace(/\./g, ''), 10) * 10 || 2410;
  const releaseDate = new Date().toISOString().split('T')[0];

  console.log('\n---------------------------------------------------------------');
  console.log(`Target Version : v${cleanVersion} (Build ${buildCode})`);
  console.log(`Release Date   : ${releaseDate}`);
  console.log(`Mandatory      : ${isMandatory ? 'YES' : 'NO'}`);
  console.log('Changelog:');
  changelogList.forEach((c) => console.log(`  • ${c}`));
  console.log('---------------------------------------------------------------\n');

  // 3. Stage local app configuration updates
  console.log('📝 Updating version files in CineVault app...');

  // Update src/config/version.ts
  const versionTsContent = `/**
 * CineVault Application Version & Update Configuration
 */

export const APP_VERSION = '${cleanVersion}';
export const APP_BUILD_CODE = ${buildCode};
export const APP_RELEASE_NAME = 'CineVault v${cleanVersion} Stable';

// Official distribution & update endpoints
export const OFFICIAL_WEBSITE_URL = 'https://cinevaultapk.online/';
export const UPDATE_API_URL = 'https://cinevaultapk.online/version.json';
export const OFFICIAL_APK_DOWNLOAD_URL = 'https://cinevaultapk.online/downloads/CineVault.apk';
export const OFFICIAL_TELEGRAM_URL = 'https://t.me/+0nZRFagm4wU1MDll';

// Centralized remote update check endpoints with fallback redundancy
export const UPDATE_ENDPOINTS: string[] = [
  'https://cinevaultapk.online/version.json',
  'https://cinevaultapk.online/api/app-update',
  'https://cinevault-web.pages.dev/version.json',
];

// Security whitelist: only allow official domains for update downloads / redirects
export const ALLOWED_UPDATE_DOMAINS: string[] = [
  'cinevaultapk.online',
  'cinevault-web.pages.dev',
];
`;
  if (!isDryRun) {
    fs.writeFileSync(VERSION_TS_PATH, versionTsContent, 'utf-8');
    console.log('  ✓ Updated src/config/version.ts');
  } else {
    console.log('  [DRY-RUN] Would update src/config/version.ts');
  }

  // Update android/app/build.gradle
  if (fs.existsSync(BUILD_GRADLE_PATH)) {
    let gradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');
    gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${buildCode}`);
    gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${cleanVersion}"`);
    if (!isDryRun) {
      fs.writeFileSync(BUILD_GRADLE_PATH, gradle, 'utf-8');
      console.log('  ✓ Updated android/app/build.gradle');
    } else {
      console.log('  [DRY-RUN] Would update android/app/build.gradle');
    }
  }

  // Update package.json version
  if (fs.existsSync(PACKAGE_JSON_PATH)) {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    pkg.version = cleanVersion;
    if (!isDryRun) {
      fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log('  ✓ Updated package.json');
    } else {
      console.log('  [DRY-RUN] Would update package.json');
    }
  }

  // 4. Prepare website update payload (version.json, api/app-update, and index.html)
  const updateMessageStr = changelogList && changelogList.length > 0
    ? changelogList[0]
    : `A new version of CineVault (v${cleanVersion}) is available.`;

  const versionJsonPayload = {
    latestVersionCode: buildCode,
    latestVersionName: cleanVersion,
    websiteUrl: 'https://cinevaultapk.online/',
    apkDownloadUrl: 'https://cinevaultapk.online/downloads/CineVault.apk',
    directApkUrl: 'https://cinevaultapk.online/downloads/CineVault.apk',
    updateMessage: updateMessageStr || 'Update The Apk To The Latest Version',
    forceUpdate: isMandatory,
    // Backward compatibility fields
    version: cleanVersion,
    versionCode: buildCode,
    releaseDate: releaseDate,
    changelog: changelogList,
    apkUrl: 'https://cinevaultapk.online/downloads/CineVault.apk',
    websiteUrl: 'https://cinevaultapk.online/',
    mandatory: isMandatory,
    minVersion: '2.0.0',
    sha256: apkHash,
    fileSizeBytes: apkStats.size,
    fileSizeMB: `${apkSizeMB}MB`,
  };

  const versionJsonStr = JSON.stringify(versionJsonPayload, null, 2) + '\n';

  // Helper to update index.html
  function updateHtmlFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf-8');

    // Replace softwareVersion in JSON-LD
    html = html.replace(/"softwareVersion":\s*"[^"]*"/g, `"softwareVersion": "${cleanVersion}"`);
    html = html.replace(/"fileSize":\s*"[^"]*"/g, `"fileSize": "${apkSizeMB}MB"`);

    // Replace announcement pill and badges
    html = html.replace(/CineVault\s+[\d.]+\s+Available/g, `CineVault ${cleanVersion} Available`);
    html = html.replace(/v[\d.]+\s*\([\d.]+\s*MB\)/g, `v${cleanVersion} (${apkSizeMB} MB)`);
    html = html.replace(/<span class="btn-badge-chip">v[\d.]+<\/span>/g, `<span class="btn-badge-chip">v${cleanVersion}</span>`);

    // Replace SHA-256 hash
    html = html.replace(/id="apkHash">\s*[a-fA-F0-9]{64}\s*<\/code>/g, `id="apkHash">${apkHash}</code>`);

    // Replace specs table version & size
    html = html.replace(/<td class="specs-val val-gold">[\d.]+\s*\(Build\s*\d+\)\s*Stable<\/td>/g, `<td class="specs-val val-gold">${cleanVersion} (Build ${buildCode}) Stable</td>`);
    html = html.replace(/<td class="specs-val">[\d.]+\s*MB\s*\([0-9,]+\s*bytes\)<\/td>/g, `<td class="specs-val">${apkSizeMB} MB (${apkSizeBytes} bytes)</td>`);

    // Replace footer version
    html = html.replace(/Core v[\d.]+-release/g, `Core v${cleanVersion}-release`);

    if (!isDryRun) {
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`  ✓ Updated ${path.relative(ROOT_DIR, filePath)}`);
    } else {
      console.log(`  [DRY-RUN] Would update ${path.relative(ROOT_DIR, filePath)}`);
    }
  }

  console.log('\n📝 Staging website metadata in CineVaultapk Web...');
  if (!isDryRun) {
    fs.writeFileSync(LOCAL_VERSION_JSON, versionJsonStr, 'utf-8');
    console.log('  ✓ Updated public/version.json');
    fs.writeFileSync(WEB_VERSION_JSON, versionJsonStr, 'utf-8');
    console.log('  ✓ Updated CineVaultapk Web/version.json');
    if (fs.existsSync(path.dirname(WEB_DIST_VERSION_JSON))) {
      fs.writeFileSync(WEB_DIST_VERSION_JSON, versionJsonStr, 'utf-8');
      console.log('  ✓ Updated CineVaultapk Web/dist/version.json');
    }

    // Also write to /api/app-update and /api/app-update.json
    fs.mkdirSync(WEB_API_DIR, { recursive: true });
    fs.writeFileSync(path.join(WEB_API_DIR, 'app-update.json'), versionJsonStr, 'utf-8');
    fs.writeFileSync(path.join(WEB_API_DIR, 'app-update'), versionJsonStr, 'utf-8');
    console.log('  ✓ Updated CineVaultapk Web/api/app-update');

    if (fs.existsSync(path.dirname(WEB_DIST_VERSION_JSON))) {
      fs.mkdirSync(WEB_DIST_API_DIR, { recursive: true });
      fs.writeFileSync(path.join(WEB_DIST_API_DIR, 'app-update.json'), versionJsonStr, 'utf-8');
      fs.writeFileSync(path.join(WEB_DIST_API_DIR, 'app-update'), versionJsonStr, 'utf-8');
      console.log('  ✓ Updated CineVaultapk Web/dist/api/app-update');
    }
  } else {
    console.log('  [DRY-RUN] Would update version.json and api/app-update in website and dist');
  }

  updateHtmlFile(WEB_INDEX_HTML);
  updateHtmlFile(WEB_DIST_INDEX_HTML);

  // NOTE: Cloudflare Pages Function (functions/version.json.js) was removed.
  // CORS headers are now handled by _headers file, and the static version.json
  // is served directly. This avoids Function build delays during deployment.

  // 5. EXPLICIT DEVELOPER PERMISSION GATE
  console.log('\n===============================================================');
  console.log('       ⚠️ DEVELOPER PERMISSION REQUIRED BEFORE UPLOADING      ');
  console.log('===============================================================');
  console.log(`You are about to upload and publish CineVault v${cleanVersion}:`);
  console.log(`  • APK Source   : ${APK_PATH}`);
  console.log(`  • File Size    : ${apkSizeMB} MB (${apkSizeBytes} bytes)`);
  console.log(`  • SHA-256 Hash : ${apkHash}`);
  console.log(`  • Destination  : https://cinevaultapk.online/ (Cloudflare Pages)`);
  console.log(`  • Git Repo     : https://github.com/aditys4444/cinevault-web.git`);
  console.log('===============================================================\n');

  let proceed = autoYes;
  if (!proceed) {
    if (!rl) rl = createPrompt();
    const answer = await askQuestion(
      rl,
      "Do you authorize uploading the APK and pushing this update to https://cinevaultapk.online/?\nType 'yes' to proceed, or anything else to cancel: "
    );
    proceed = answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'y';
  }

  if (rl) rl.close();

  if (!proceed) {
    console.log('\n🚫 UPLOAD CANCELLED BY DEVELOPER.');
    console.log('   No APK was copied and no commits were pushed to the website repository.');
    console.log('   Local version configurations remain intact if you wish to inspect them.\n');
    process.exit(0);
  }

  console.log('\n🚀 PERMISSION GRANTED! Proceeding with upload and deployment...\n');

  if (isDryRun) {
    console.log('[DRY-RUN] Simulated copying CineVault.apk to downloads/ and dist/downloads/');
    console.log('[DRY-RUN] Simulated git commit and git push in CineVaultapk Web');
    console.log('\n✨ Dry run complete! Everything is configured correctly.');
    process.exit(0);
  }

  // 6. Copy APK to website downloads directories
  console.log('📦 Copying updated CineVault.apk to website downloads...');
  fs.mkdirSync(path.dirname(WEB_DOWNLOADS_APK), { recursive: true });
  fs.copyFileSync(APK_PATH, WEB_DOWNLOADS_APK);
  console.log(`  ✓ Copied to ${WEB_DOWNLOADS_APK}`);

  if (fs.existsSync(path.dirname(WEB_DIST_DOWNLOADS_APK))) {
    fs.mkdirSync(path.dirname(WEB_DIST_DOWNLOADS_APK), { recursive: true });
    fs.copyFileSync(APK_PATH, WEB_DIST_DOWNLOADS_APK);
    console.log(`  ✓ Copied to ${WEB_DIST_DOWNLOADS_APK}`);
  }

  // 7. Commit and push to git
  console.log('\n🌐 Committing and pushing release to GitHub (Cloudflare Pages)...');
  try {
    const commitMsg = `Release CineVault v${cleanVersion} (Build ${buildCode})`;
    execSync('git add -A', { cwd: WEB_DIR, stdio: 'inherit' });
    execSync(`git commit -m "${commitMsg}"`, { cwd: WEB_DIR, stdio: 'inherit' });
    execSync('git push origin main', { cwd: WEB_DIR, stdio: 'inherit' });
    console.log('\n===============================================================');
    console.log(`🎉 SUCCESS: CineVault v${cleanVersion} is now published!`);
    console.log('===============================================================');
    console.log('  1. Cloudflare Pages is deploying the updated website & APK.');
    console.log('  2. https://cinevaultapk.online/ now serves the updated APK.');
    console.log('  3. In-app users will see the update notification on app launch.');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('\n❌ Git commit or push failed:', error.message);
    console.log('   You can manually navigate to CineVaultapk Web and run: git push origin main\n');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
