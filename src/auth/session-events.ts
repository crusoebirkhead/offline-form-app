/**
 * Module-level session event system.
 *
 * Non-React services (e.g. API clients) call `emitSessionExpired()` when a 401
 * is received. The AuthGuardProvider subscribes via `setSessionExpiredListener`
 * and reacts by redirecting to the Login screen with an explanatory message.
 */

type SessionExpiredListener = (message: string) => void;

let listener: SessionExpiredListener | null = null;

export function setSessionExpiredListener(fn: SessionExpiredListener): () => void {
  listener = fn;
  return () => {
    if (listener === fn) {
      listener = null;
    }
  };
}

export function emitSessionExpired(
  message = 'Your session has expired. Please sign in again.',
): void {
  listener?.(message);
}
