/**
 * CineVault OneSignal Push Notification Broadcaster
 *
 * Usage:
 *   node scripts/send-notification.cjs "Title" "Message" "Optional URL"
 *   npm run notify "JOIN TELEGRAM!! ❤️"
 */

const fs = require('fs');
const path = require('path');

const APP_ID = '59635604-a14e-4448-b35e-f9fa01fdee57';
const DEFAULT_URL = 'https://t.me/+0nZRFagm4wU1MDll';

function getApiKey() {
  if (process.env.ONESIGNAL_REST_API_KEY) {
    return process.env.ONESIGNAL_REST_API_KEY;
  }
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/ONESIGNAL_REST_API_KEY\s*=\s*([^\r\n]+)/);
    if (match) return match[1].trim();
  }
  return '';
}

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ Error: ONESIGNAL_REST_API_KEY not found in environment or .env');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let title = 'CineVault';
  let message = 'JOIN TELEGRAM!! ❤️';
  let targetUrl = DEFAULT_URL;

  if (args.length === 1) {
    message = args[0];
  } else if (args.length >= 2) {
    title = args[0];
    message = args[1];
    if (args[2]) {
      targetUrl = args[2];
    }
  }

  console.log('\n===============================================================');
  console.log('       📢 CineVault Push Notification Dispatcher               ');
  console.log('===============================================================');
  console.log(`Title      : ${title}`);
  console.log(`Message    : ${message}`);
  console.log(`Target URL : ${targetUrl}`);
  console.log(`App ID     : ${APP_ID}`);
  console.log('---------------------------------------------------------------\n');

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ['Total Subscriptions'],
        headings: { en: title },
        contents: { en: message },
        url: targetUrl
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('🎉 Notification successfully broadcasted!');
      console.log(`Notification ID: ${data.id}`);
      if (data.recipients) {
        console.log(`Delivered to   : ${data.recipients} subscriber(s)`);
      }
    } else {
      console.error('❌ Failed to send notification:', data);
    }
  } catch (error) {
    console.error('❌ Network or API error:', error.message);
  }
}

main();
