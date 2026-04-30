const mockSetItemAsync = jest.fn();
const mockGetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  setItemAsync: mockSetItemAsync,
  getItemAsync: mockGetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
}));

const mockRefreshToken = jest.fn();
const mockClearSession = jest.fn();

jest.mock('react-native-auth0', () => {
  return jest.fn().mockImplementation(() => ({
    auth: { refreshToken: mockRefreshToken },
    webAuth: { clearSession: mockClearSession },
  }));
});

jest.mock(
  'expo-constants',
  () => ({
    expoConfig: {
      extra: {
        auth0Domain: 'test.auth0.com',
        auth0ClientId: 'test-client-id',
        auth0Audience: 'https://test-api',
      },
    },
  }),
  { virtual: true },
);

import { storeTokens, getStoredToken, clearStoredTokens, logout } from '../auth0';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'fake-signature';
  return `${header}.${body}.${signature}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('storeTokens', () => {
  it('stores access token', async () => {
    await storeTokens('access-tok');

    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_access_token', 'access-tok');
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
  });

  it('stores all three tokens when provided', async () => {
    await storeTokens('access-tok', 'refresh-tok', 'id-tok');

    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_access_token', 'access-tok');
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh-tok');
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_id_token', 'id-tok');
    expect(mockSetItemAsync).toHaveBeenCalledTimes(3);
  });
});

describe('getStoredToken', () => {
  it('returns null when no token is stored', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const result = await getStoredToken();

    expect(result).toBeNull();
  });

  it('returns the token when it is not expired', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp: futureExp, sub: 'user-1' });
    mockGetItemAsync.mockResolvedValue(token);

    const result = await getStoredToken();

    expect(result).toBe(token);
  });

  it('returns null when token is expired and no refresh token exists', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 120;
    const token = makeJwt({ exp: pastExp, sub: 'user-1' });
    mockGetItemAsync
      .mockResolvedValueOnce(token) // access token
      .mockResolvedValueOnce(null); // no refresh token

    const result = await getStoredToken();

    expect(result).toBeNull();
  });

  it('silently refreshes when token is expired and refresh token exists', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 120;
    const expiredToken = makeJwt({ exp: pastExp, sub: 'user-1' });
    const newToken = 'new-access-token';

    mockGetItemAsync
      .mockResolvedValueOnce(expiredToken) // access token
      .mockResolvedValueOnce('stored-refresh-tok'); // refresh token

    mockRefreshToken.mockResolvedValue({
      accessToken: newToken,
      refreshToken: 'new-refresh-tok',
      idToken: 'new-id-tok',
    });

    const result = await getStoredToken();

    expect(result).toBe(newToken);
    expect(mockRefreshToken).toHaveBeenCalledWith({ refreshToken: 'stored-refresh-tok' });
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_access_token', newToken);
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'new-refresh-tok');
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_id_token', 'new-id-tok');
  });

  it('clears tokens and returns null when refresh fails', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 120;
    const expiredToken = makeJwt({ exp: pastExp, sub: 'user-1' });

    mockGetItemAsync
      .mockResolvedValueOnce(expiredToken)
      .mockResolvedValueOnce('stored-refresh-tok');

    mockRefreshToken.mockRejectedValue(new Error('refresh failed'));

    const result = await getStoredToken();

    expect(result).toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_id_token');
  });

  it('treats a token without exp claim as expired', async () => {
    const tokenNoExp = makeJwt({ sub: 'user-1' });
    mockGetItemAsync.mockResolvedValueOnce(tokenNoExp).mockResolvedValueOnce(null); // no refresh token

    const result = await getStoredToken();

    expect(result).toBeNull();
  });
});

describe('clearStoredTokens', () => {
  it('deletes all three token keys', async () => {
    await clearStoredTokens();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_id_token');
  });
});

describe('logout', () => {
  it('clears Auth0 session and stored tokens', async () => {
    mockClearSession.mockResolvedValue(undefined);

    await logout();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_id_token');
  });

  it('clears stored tokens even if clearSession throws', async () => {
    mockClearSession.mockRejectedValue(new Error('session error'));

    await expect(logout()).rejects.toThrow('session error');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_id_token');
  });
});
