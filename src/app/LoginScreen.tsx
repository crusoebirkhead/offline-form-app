import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/ui/Button';
import { useAuth0 } from 'react-native-auth0';
import { auth0Config, storeTokens } from '../auth';
import { useAuthGuard } from '../auth/AuthGuardProvider';

function LoginScreen() {
  const { authorize, error: auth0Error } = useAuth0();
  const { sessionMessage, onLoginSuccess, clearSessionMessage } = useAuthGuard();
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    setLoginError(null);
    clearSessionMessage();

    try {
      const credentials = await authorize({
        audience: auth0Config.audience || undefined,
        scope: 'openid profile email offline_access',
      });

      if (credentials) {
        await storeTokens(credentials.accessToken, credentials.refreshToken, credentials.idToken);
        onLoginSuccess();
      }
    } catch (err: unknown) {
      // Auth0 sets error.code to a cancel variant when the user
      // dismisses the browser — don't treat that as a real error.
      const isCancel =
        err instanceof Error &&
        'code' in err &&
        String((err as Record<string, unknown>).code).includes('cancelled');

      if (!isCancel) {
        const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
        setLoginError(message);
      }
    } finally {
      setSigningIn(false);
    }
  }, [authorize, onLoginSuccess, clearSessionMessage]);

  const displayError = loginError ?? (auth0Error ? auth0Error.message : null);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>Periscope</Text>
        <Text style={styles.tagline}>Offline-first field assessments</Text>
      </View>

      <View style={styles.actions}>
        {sessionMessage && (
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionText}>{sessionMessage}</Text>
          </View>
        )}

        {displayError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <Button title="Sign In" onPress={handleSignIn} disabled={signingIn} loading={signingIn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#5f6368',
    marginTop: 8,
  },
  actions: {
    gap: 16,
  },
  sessionBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sessionText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;
