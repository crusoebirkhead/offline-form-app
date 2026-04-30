import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getStoredToken, logout } from './auth0';
import { setSessionExpiredListener } from './session-events';
import { seedSchemas } from '../db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthPhase = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthGuardContextValue {
  readonly phase: AuthPhase;
  readonly sessionMessage: string | null;
  readonly onLoginSuccess: () => void;
  readonly signOut: () => Promise<void>;
  readonly clearSessionMessage: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthGuardContext = createContext<AuthGuardContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthGuardProviderProps {
  readonly children: ReactNode;
}

export function AuthGuardProvider({ children }: AuthGuardProviderProps) {
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // On mount — check SecureStore for a valid cached token, then seed local schemas
  useEffect(() => {
    let cancelled = false;

    getStoredToken()
      .then((token) => {
        if (!cancelled) {
          setPhase(token ? 'authenticated' : 'unauthenticated');
        }
        return seedSchemas();
      })
      .catch(() => {
        // Seed failure is non-fatal; schemas may arrive via sync
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to session-expired events from API services
  useEffect(() => {
    const unsubscribe = setSessionExpiredListener((message) => {
      setSessionMessage(message);
      setPhase('unauthenticated');
    });

    return unsubscribe;
  }, []);

  const onLoginSuccess = useCallback(() => {
    setSessionMessage(null);
    setPhase('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setPhase('unauthenticated');
  }, []);

  const clearSessionMessage = useCallback(() => {
    setSessionMessage(null);
  }, []);

  const value = useMemo<AuthGuardContextValue>(
    () => ({ phase, sessionMessage, onLoginSuccess, signOut, clearSessionMessage }),
    [phase, sessionMessage, onLoginSuccess, signOut, clearSessionMessage],
  );

  return <AuthGuardContext.Provider value={value}>{children}</AuthGuardContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuthGuard(): AuthGuardContextValue {
  const ctx = useContext(AuthGuardContext);
  if (!ctx) {
    throw new Error('useAuthGuard must be used within an AuthGuardProvider');
  }
  return ctx;
}
