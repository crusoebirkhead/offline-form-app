import { ExpoConfig, ConfigContext } from 'expo/config';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN ?? '';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID ?? '';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: 'crus_59',
  name: 'periscope-offline-app',
  slug: 'periscope-offline-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.periscope.offline',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.periscope.offline',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    'expo-secure-store',
    [
      'react-native-auth0',
      {
        domain: AUTH0_DOMAIN,
      },
    ],
  ],
  extra: {
    auth0Domain: AUTH0_DOMAIN,
    auth0ClientId: AUTH0_CLIENT_ID,
    auth0Audience: AUTH0_AUDIENCE,
    eas: {
      projectId: '24a0f172-bdcd-4ccd-bbed-37410e0dc4ee',
    },
  },
});
