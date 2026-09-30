import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cricketmanager.app',
  appName: 'BCCB Cricket',
  // The Android app's bundled web assets are the single source of truth for both platforms.
  webDir: '../native-android-app/app/src/main/assets',
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound']
    }
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': {
            symlink: true
          }
        }
      }
    }
  }
};

export default config;
