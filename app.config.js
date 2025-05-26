export default {
  name: 'IoT-ESP',
  slug: 'IoT-ESP',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.yourcompany.iotesp',
    versionCode: 1,
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE"
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
  },
  updates: {
    fallbackToCacheTimeout: 0,
    url: "https://u.expo.dev/your-project-id"
  },
  runtimeVersion: {
    policy: "sdkVersion"
  },
  developmentClient: {
    silentLaunch: true
  }
}; 