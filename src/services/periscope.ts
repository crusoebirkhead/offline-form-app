import * as SecureStore from 'expo-secure-store';
import { emitSessionExpired } from '../auth/session-events';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PERISCOPE_BASE_URL =
  process.env.EXPO_PUBLIC_PERISCOPE_BASE_URL ?? 'https://periscope365.example.com';

const AUTH_TOKEN_KEY = 'auth_access_token';
const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionPayload {
  dataJson: object;
  formType: string;
}

export interface SubmissionResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function submitAssessment(payload: SubmissionPayload): Promise<SubmissionResult> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'No auth token available. Please log in again.' };
  }

  let response: Response;

  try {
    response = await fetch(`${PERISCOPE_BASE_URL}/api/mobile/assessment/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data_json: payload.dataJson,
        form_type: payload.formType,
      }),
      signal: withTimeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.' };
    }

    const message = error instanceof Error ? error.message : 'Unknown network error';
    return { success: false, error: `Network error: ${message}` };
  }

  if (response.status === 401) {
    emitSessionExpired('Your session has expired. Please sign in again.');
    return { success: false, error: 'Authentication expired.' };
  }

  if (!response.ok) {
    return {
      success: false,
      error: `Server returned ${response.status}: ${response.statusText}`,
    };
  }

  try {
    const body = (await response.json()) as { request_id?: string };
    return { success: true, requestId: body.request_id };
  } catch {
    return { success: true };
  }
}
