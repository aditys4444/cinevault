/**
 * CineVault OneSignal Push Notification Configuration
 * 
 * Replace with your free OneSignal App ID from https://onesignal.com
 */
export const ONESIGNAL_APP_ID: string = '59635604-a14e-4448-b35e-f9fa01fdee57';

export const IS_ONESIGNAL_CONFIGURED: boolean =
  ONESIGNAL_APP_ID !== 'YOUR_ONESIGNAL_APP_ID' && ONESIGNAL_APP_ID.trim().length > 0;
