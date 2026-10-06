/**
 * CineVault Application Version & Update Configuration
 */

export const APP_VERSION = '2.9.0';
export const APP_BUILD_CODE = 2900;
export const APP_RELEASE_NAME = 'CineVault v2.9.0 Stable';

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
