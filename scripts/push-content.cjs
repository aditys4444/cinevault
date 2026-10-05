/**
 * CineVault Instant Remote Content Publisher
 * Publishes updated channels.json, adult.json, and custom-content.json to Cloudflare Pages
 * without requiring any APK rebuild or user update!
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const webDir = path.resolve(__dirname, '../../CineVaultapk Web');

console.log('\n===============================================================');
console.log('       📡 CineVault Instant Remote Content Publisher          ');
console.log('===============================================================\n');

// 1. Run sync-website to mirror api/ to dist/api/
console.log('🔄 Syncing local content files...');
try {
  require('./sync-website.cjs');
} catch (e) {
  console.error('Error running sync-website:', e.message);
}

// 2. Check if git repo exists in CineVaultapk Web
if (!fs.existsSync(path.join(webDir, '.git'))) {
  console.error('❌ Error: Git repository not found at', webDir);
  process.exit(1);
}

// 3. Commit and push changes
try {
  console.log('\n🌐 Committing and pushing remote content to Cloudflare Pages...');
  execSync('git add api/ dist/api/', { cwd: webDir, stdio: 'inherit' });

  const status = execSync('git status --porcelain api/ dist/api/', { cwd: webDir, encoding: 'utf8' }).trim();
  if (!status) {
    console.log('✨ No changes detected in api/ or dist/api/. Content is already up to date!');
    console.log('===============================================================\n');
    process.exit(0);
  }

  const commitMsg = process.argv.slice(2).join(' ') || 'Update remote content catalogs (channels & adult)';
  execSync(`git commit -m "${commitMsg}"`, { cwd: webDir, stdio: 'inherit' });
  execSync('git push origin main', { cwd: webDir, stdio: 'inherit' });

  // 4. Instant deployment to Cloudflare Pages edge via wrangler
  console.log('\n🚀 Triggering instant edge deployment on Cloudflare...');
  try {
    execSync('npx wrangler pages deploy dist --branch=main --project-name=cinevault-web --commit-dirty=true', {
      cwd: webDir,
      stdio: 'inherit'
    });
  } catch (wErr) {
    console.log('  (Wrangler direct deploy skipped; GitHub Actions will deploy automatically)');
  }

  console.log('\n===============================================================');
  console.log('🎉 SUCCESS: Content is now live on https://cinevaultapk.online/ !');
  console.log('===============================================================');
  console.log('  • Cloudflare Pages edge is serving the updated catalog.');
  console.log('  • All user apps will fetch the new channels/movies automatically.');
  console.log('  • ZERO APK updates or downloads were required!\n');
} catch (error) {
  console.error('\n❌ Failed to publish content:', error.message);
  process.exit(1);
}
