import { setSessionExpiredListener, emitSessionExpired } from '../session-events';

beforeEach(() => {
  // Reset by setting and immediately clearing a listener
  const unsub = setSessionExpiredListener(() => {});
  unsub();
});

describe('setSessionExpiredListener', () => {
  it('registers a listener that receives emitted messages', () => {
    const listener = jest.fn();
    setSessionExpiredListener(listener);

    emitSessionExpired('Token expired');

    expect(listener).toHaveBeenCalledWith('Token expired');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('uses default message when none provided', () => {
    const listener = jest.fn();
    setSessionExpiredListener(listener);

    emitSessionExpired();

    expect(listener).toHaveBeenCalledWith('Your session has expired. Please sign in again.');
  });

  it('returns an unsubscribe function that removes the listener', () => {
    const listener = jest.fn();
    const unsubscribe = setSessionExpiredListener(listener);

    unsubscribe();
    emitSessionExpired('Should not arrive');

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not remove a different listener when unsubscribing', () => {
    const listenerA = jest.fn();
    const listenerB = jest.fn();

    const unsubA = setSessionExpiredListener(listenerA);
    // Replace with listener B
    setSessionExpiredListener(listenerB);

    // Unsubscribing A should not affect B (A is no longer the active listener)
    unsubA();

    emitSessionExpired('Hello B');
    expect(listenerB).toHaveBeenCalledWith('Hello B');
  });
});

describe('emitSessionExpired', () => {
  it('does nothing when no listener is registered', () => {
    // Should not throw
    expect(() => emitSessionExpired('No listener')).not.toThrow();
  });
});
