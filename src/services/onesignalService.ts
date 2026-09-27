import { ONESIGNAL_APP_ID, IS_ONESIGNAL_CONFIGURED } from '../config/onesignal';
import { OFFICIAL_TELEGRAM_URL } from '../config/version';

class OneSignalService {
  private initialized = false;

  /**
   * Initialize OneSignal Push Notifications on device
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    if (!IS_ONESIGNAL_CONFIGURED) {
      console.log('[OneSignal] Awaiting ONESIGNAL_APP_ID in src/config/onesignal.ts');
      return;
    }

    try {
      const OneSignal = (window as any).plugins?.OneSignal || (window as any).OneSignal;

      if (!OneSignal) {
        // OneSignal native plugin is only available on real Android/iOS device
        console.log('[OneSignal] Native plugin not available in web browser mode');
        return;
      }

      // Initialize SDK
      OneSignal.initialize(ONESIGNAL_APP_ID);
      this.initialized = true;
      console.log('[OneSignal] Initialized with App ID:', ONESIGNAL_APP_ID);

      // Prompt for push notification permission (Android 13+)
      OneSignal.Notifications.requestPermission(true).then((accepted: boolean) => {
        console.log('[OneSignal] User push notification permission:', accepted);
      });

      // Handle notification click / tap by user
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        try {
          const notification = event?.notification;
          const launchUrl =
            notification?.launchURL ||
            notification?.additionalData?.url ||
            notification?.additionalData?.link;

          if (launchUrl) {
            window.open(launchUrl, '_system');
          } else if (notification?.body?.includes('TELEGRAM') || notification?.title?.includes('TELEGRAM')) {
            window.open(OFFICIAL_TELEGRAM_URL, '_system');
          }
        } catch (e) {
          console.error('[OneSignal] Error handling notification click:', e);
        }
      });
    } catch (err) {
      console.error('[OneSignal] Initialization error:', err);
    }
  }
}

export const onesignalService = new OneSignalService();
