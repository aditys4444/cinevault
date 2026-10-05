import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cinevault.app',
  appName: 'CineVault',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.tmdb.org',
      '*.themoviedb.org',
      '*.aoneroom.com',
      '*.mzfi.me',
      '*.supabase.co',
      '*.googleapis.com',
      '*'
    ]
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#050A18",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    }
  }
};

export default config;
