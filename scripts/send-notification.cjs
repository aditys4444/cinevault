/**
 * CineVault OneSignal Push Notification Broadcaster
 *
 * Usage:
 *   node scripts/send-notification.cjs "Title" "Message" "Optional URL"
 *   node scripts/send-notification.cjs "🎬 Mayday is waiting!" "Tap now and start watching. ▶️"
 *   npm run notify "JOIN TELEGRAM!! ❤️"
 */

const fs = require('fs');
const path = require('path');

const APP_ID = '59635604-a14e-4448-b35e-f9fa01fdee57';

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
  let targetUrl = null;

  if (args.length === 1) {
    message = args[0];
    if (message.toLowerCase().includes('telegram')) {
      targetUrl = 'https://t.me/+0nZRFagm4wU1MDll';
    }
  } else if (args.length >= 2) {
    title = args[0];
    message = args[1];
    if (args[2]) {
      targetUrl = args[2];
    } else if (message.toLowerCase().includes('telegram') || title.toLowerCase().includes('telegram')) {
      targetUrl = 'https://t.me/+0nZRFagm4wU1MDll';
    }
  }

  console.log('\n===============================================================');
  console.log('       📢 CineVault Push Notification Dispatcher               ');
  console.log('===============================================================');
  console.log(`Title      : ${title}`);
  console.log(`Message    : ${message}`);
  console.log(`Action     : ${targetUrl ? 'Open URL: ' + targetUrl : 'Open CineVault App directly'}`);
  console.log(`App ID     : ${APP_ID}`);
  console.log('---------------------------------------------------------------\n');

  try {
    const payload = {
      app_id: APP_ID,
      included_segments: ['Total Subscriptions'],
      headings: { en: title },
      contents: { en: message }
    };

    if (targetUrl) {
      payload.url = targetUrl;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify(payload)
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
