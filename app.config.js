export default {
  name: 'IoT-ESP',
  slug: 'IoT-ESP',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.iotesp.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    edgeToEdgeEnabled: true,
    package: 'com.iotesp.app',
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL ,
    eas: {
      projectId: "879028c4-870b-4c74-b219-7d84c2fd803d"
    }
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