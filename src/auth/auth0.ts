import Auth0 from 'react-native-auth0';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export interface Auth0Config {
  readonly domain: string;
  readonly clientId: string;
  readonly audience: string;
}

function getAuth0Config(): Auth0Config {
  const extra = Constants.expoConfig?.extra;

  const domain = extra?.auth0Domain as string | undefined;
  const clientId = extra?.auth0ClientId as string | undefined;
  const audience = extra?.auth0Audience as string | undefined;

  if (!domain) {
    throw new Error(
      'AUTH0_DOMAIN is not configured. Set it in your .env file or environment variables.',
    );
  }

  if (!clientId) {
    throw new Error(
      'AUTH0_CLIENT_ID is not configured. Set it in your .env file or environment variables.',
    );
  }

  return {
    domain,
    clientId,
    audience: audience ?? '',
  };
}

export const auth0Config = getAuth0Config();

// Lazy-initialised so the native Turbo Module is ready before we call into it.
let _auth0Client: Auth0 | null = null;

function getAuth0Client(): Auth0 {
  if (!_auth0Client) {
    _auth0Client = new Auth0({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
    });
  }
  return _auth0Client;
}

const TOKEN_KEYS = {
  ACCESS: 'auth_access_token',
  REFRESH: 'auth_refresh_token',
  ID: 'auth_id_token',
} as const;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const BUFFER_SECONDS = 60;
  return Date.now() / 1000 >= payload.exp - BUFFER_SECONDS;
}

export async function storeTokens(
  accessToken: string,
  refreshToken?: string,
  idToken?: string,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH, refreshToken);
  }
  if (idToken) {
    await SecureStore.setItemAsync(TOKEN_KEYS.ID, idToken);
  }
}

export async function getStoredToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
  if (!accessToken) return null;

  if (!isTokenExpired(accessToken)) return accessToken;

  // Token expired — attempt silent refresh
  const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.REFRESH);
  if (!refreshToken) return null;

  try {
    const response = await getAuth0Client().auth.refreshToken({
      refreshToken,
    });

    await storeTokens(
      response.accessToken,
      response.refreshToken ?? refreshToken,
      response.idToken,
    );

    return response.accessToken;
  } catch {
    await clearStoredTokens();
    return null;
  }
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS),
    SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH),
    SecureStore.deleteItemAsync(TOKEN_KEYS.ID),
  ]);
}

export async function logout(): Promise<void> {
  try {
    await getAuth0Client().webAuth.clearSession();
  } finally {
    await clearStoredTokens();
  }
}
