import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import FloatingActionMenu from '../ui/FloatingActionMenu';
import { getEntryById, getSchemaByPath, updateEntry } from '../../db';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { setupWebViewAssets } from '../../services/webviewAssets';
import { submitAssessment } from '../../services/periscope';
import type { Entry } from '../../types';
import type { FormChangePayload, FormValidationErrorPayload, FormWebViewRef } from '../../webview';
import FormWebView from './FormWebView';

interface FormEntryScreenProps {
  entryId: string;
  onSaveSuccess?: (entry: Entry) => void;
  onError?: (message: string) => void;
  onUnsavedChangesUpdate?: (hasChanges: boolean) => void;
  onSendSuccess?: (entry: Entry) => void;
  onLastSavedUpdate?: (date: Date) => void;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
type SendStatus = 'idle' | 'sending' | 'success' | 'error';

const AUTO_SAVE_DELAY_MS = 30_000;
const SUCCESS_DISPLAY_MS = 2_000;

function FormEntryScreen({
  entryId,
  onSaveSuccess,
  onError,
  onUnsavedChangesUpdate,
  onSendSuccess,
  onLastSavedUpdate,
}: FormEntryScreenProps) {
  const formRef = useRef<FormWebViewRef>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUnsavedChangesUpdateRef = useRef(onUnsavedChangesUpdate);
  onUnsavedChangesUpdateRef.current = onUnsavedChangesUpdate;
  const onLastSavedUpdateRef = useRef(onLastSavedUpdate);
  onLastSavedUpdateRef.current = onLastSavedUpdate;

  const { isInternetReachable } = useNetworkStatus();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [schema, setSchema] = useState<object | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shellReady, setShellReady] = useState(false);

  const entryRef = useRef(entry);
  entryRef.current = entry;
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  const formLoadedRef = useRef(false);

  // Load entry, schema, and webview assets on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Run asset setup and entry fetch in parallel
        const [loadedEntry, url] = await Promise.all([getEntryById(entryId), setupWebViewAssets()]);
        if (cancelled) return;

        if (!loadedEntry) {
          setErrorMessage('Entry not found');
          setLoading(false);
          return;
        }

        const loadedSchema = await getSchemaByPath(loadedEntry.form_type);
        if (cancelled) return;

        if (!loadedSchema) {
          setErrorMessage('Form schema not found');
          setLoading(false);
          return;
        }

        setEntry(loadedEntry);
        setSchema(JSON.parse(loadedSchema.json_schema));
        setBaseUrl(url);
        setLoading(false);
        onLastSavedUpdateRef.current?.(new Date(loadedEntry.updated_at));
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to initialize form';
        setErrorMessage(msg);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const handleShellReady = useCallback(() => {
    setShellReady(true);
  }, []);

  // Load form into WebView once when shell, schema, and entry are first ready
  useEffect(() => {
    if (formLoadedRef.current) return;
    if (!shellReady || !schema || !entry) return;

    formLoadedRef.current = true;
    const submission = entry.data_json ? JSON.parse(entry.data_json) : undefined;
    const hasData = submission && Object.keys(submission).length > 0;
    formRef.current?.loadForm(schema, hasData ? submission : undefined);
  }, [shellReady, schema, entry]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const persistSubmission = useCallback(
    async (source: 'manual' | 'auto') => {
      const currentEntry = entryRef.current;
      if (__DEV__)
        console.log(`[FormEntryScreen] persistSubmission(${source}), entry=${!!currentEntry}`);
      if (!currentEntry) return;

      setSaveStatus('saving');
      setErrorMessage(null);

      try {
        const data = await formRef.current?.getSubmission();

        if (data === null || data === undefined) {
          throw new Error('Could not retrieve form data from WebView');
        }

        const updated = await updateEntry(currentEntry.id, {
          data_json: JSON.stringify(data),
        });

        setEntry(updated);
        setSaveStatus('success');
        setHasUnsavedChanges(false);
        onUnsavedChangesUpdateRef.current?.(false);
        onLastSavedUpdateRef.current?.(new Date());

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, SUCCESS_DISPLAY_MS);

        if (source === 'manual') {
          onSaveSuccess?.(updated);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Save failed';
        setSaveStatus('error');
        setErrorMessage(msg);
        onError?.(msg);
      }
    },
    [onSaveSuccess, onError],
  );

  const persistSubmissionRef = useRef(persistSubmission);
  persistSubmissionRef.current = persistSubmission;

  const handleSave = useCallback(() => {
    persistSubmissionRef.current('manual');
  }, []);

  // Debounced auto-save on form change
  const handleFormChange = useCallback((_payload: FormChangePayload) => {
    if (__DEV__) console.log('[FormEntryScreen] handleFormChange called');

    if (!hasUnsavedChangesRef.current) {
      setHasUnsavedChanges(true);
      onUnsavedChangesUpdateRef.current?.(true);
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (__DEV__) console.log('[FormEntryScreen] auto-save timer fired');
      persistSubmissionRef.current('auto');
    }, AUTO_SAVE_DELAY_MS);
  }, []);

  const persistAsCompleted = useCallback(async () => {
    if (!entry) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const data = await formRef.current?.getSubmission();

      if (data === null || data === undefined) {
        throw new Error('Could not retrieve form data from WebView');
      }

      const updated = await updateEntry(entry.id, {
        data_json: JSON.stringify(data),
        status: 'completed',
      });

      setEntry(updated);
      setSaveStatus('success');
      setHasUnsavedChanges(false);
      onUnsavedChangesUpdateRef.current?.(false);
      onLastSavedUpdateRef.current?.(new Date());

      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, SUCCESS_DISPLAY_MS);

      onSaveSuccess?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark as completed';
      setSaveStatus('error');
      setErrorMessage(msg);
      onError?.(msg);
    }
  }, [entry, onSaveSuccess, onError]);

  // Track which action triggered validation: 'complete' or 'send'
  const pendingActionRef = useRef<'complete' | 'send' | null>(null);

  // Wire up the validation callback to trigger the pending action on success
  // Uses refs to avoid stale closure issues
  const persistAsCompletedRef = useRef(persistAsCompleted);
  persistAsCompletedRef.current = persistAsCompleted;

  const performSend = useCallback(async () => {
    if (!entry) return;

    setSendStatus('sending');
    setSendErrorMessage(null);

    try {
      const data = await formRef.current?.getSubmission();

      if (data === null || data === undefined) {
        throw new Error('Could not retrieve form data from WebView');
      }

      await updateEntry(entry.id, { data_json: JSON.stringify(data) });

      const result = await submitAssessment({
        dataJson: data as object,
        formType: entry.form_type,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Submission failed');
      }

      const now = new Date().toISOString();
      const updated = await updateEntry(entry.id, {
        status: 'sent',
        sent_at: now,
      });

      setEntry(updated);
      setSendStatus('success');
      setHasUnsavedChanges(false);
      onUnsavedChangesUpdateRef.current?.(false);

      Alert.alert('Sent', 'Assessment submitted to Periscope Portal.');
      onSendSuccess?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      setSendStatus('error');
      setSendErrorMessage(msg);
      onError?.(msg);
    }
  }, [entry, onSendSuccess, onError]);

  const performSendRef = useRef(performSend);
  performSendRef.current = performSend;

  const stableHandleValidationError = useCallback((payload: FormValidationErrorPayload) => {
    setValidationErrors(payload.errors);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    if (payload.errors.length === 0) {
      if (action === 'send') {
        performSendRef.current();
      } else {
        persistAsCompletedRef.current();
      }
    }
  }, []);

  const handleMarkComplete = useCallback(() => {
    setValidationErrors([]);
    pendingActionRef.current = 'complete';
    formRef.current?.validateForm();
  }, []);

  const handleSend = useCallback(() => {
    if (!entry) return;

    if (!isInternetReachable) {
      Alert.alert('Offline', 'You must be online to send to Periscope Portal.');
      return;
    }

    setValidationErrors([]);
    pendingActionRef.current = 'send';
    formRef.current?.validateForm();
  }, [entry, isInternetReachable]);

  const sendButtonDisabled =
    entry?.status === 'sent' || sendStatus === 'sending' || !isInternetReachable;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1894e1" />
      </View>
    );
  }

  if (errorMessage && !entry) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  const fabActions = [
    {
      key: 'save',
      title: 'Save Draft',
      variant: 'outlined' as const,
      onPress: handleSave,
      disabled: saveStatus === 'saving',
      loading: saveStatus === 'saving',
      accessibilityLabel: 'Save as draft',
    },
    {
      key: 'complete',
      title: 'Mark Complete',
      variant: 'filled' as const,
      onPress: handleMarkComplete,
      disabled: saveStatus === 'saving',
      accessibilityLabel: 'Mark as complete',
    },
    {
      key: 'send',
      title: entry?.status === 'sent' ? 'Sent to Portal' : 'Send to Portal',
      variant: 'success' as const,
      onPress: handleSend,
      disabled: sendButtonDisabled,
      loading: sendStatus === 'sending',
      accessibilityLabel: 'Send to Periscope Portal',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.webviewContainer}>
        <FormWebView
          ref={formRef}
          baseUrl={baseUrl}
          onShellReady={handleShellReady}
          onChange={handleFormChange}
          onValidationError={stableHandleValidationError}
        />
      </View>

      {(validationErrors.length > 0 ||
        (saveStatus === 'error' && errorMessage) ||
        (sendStatus === 'error' && sendErrorMessage) ||
        saveStatus === 'success' ||
        (!isInternetReachable && entry?.status !== 'sent')) && (
        <View style={styles.statusBar}>
          {validationErrors.length > 0 && (
            <View style={styles.validationBanner}>
              <Text style={styles.validationBannerText}>
                {validationErrors.length === 1
                  ? '1 required field is incomplete'
                  : `${validationErrors.length} required fields are incomplete`}
              </Text>
            </View>
          )}
          {saveStatus === 'error' && errorMessage && (
            <Text style={styles.errorBanner}>{errorMessage}</Text>
          )}
          {sendStatus === 'error' && sendErrorMessage && (
            <Text style={styles.errorBanner}>{sendErrorMessage}</Text>
          )}
          {saveStatus === 'success' && <Text style={styles.successBanner}>Saved</Text>}
          {!isInternetReachable && entry?.status !== 'sent' && (
            <Text style={styles.offlineHint}>Offline — cannot send</Text>
          )}
        </View>
      )}

      <FloatingActionMenu actions={fabActions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webviewContainer: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dadce0',
  },
  validationBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  validationBannerText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#d93025',
    fontSize: 16,
    textAlign: 'center',
  },
  errorBanner: {
    color: '#d93025',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  successBanner: {
    color: '#188038',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  offlineHint: {
    color: '#80868b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default FormEntryScreen;
