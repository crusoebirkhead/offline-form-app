import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import {
  type FormChangePayload,
  type FormErrorPayload,
  type FormShellMessage,
  type FormSubmitPayload,
  type FormValidationErrorPayload,
  type FormWebViewProps,
  type FormWebViewRef,
  type SubmissionResultPayload,
} from '../../webview';

type PendingSubmission = {
  resolve: (data: Record<string, unknown> | null) => void;
  timer: ReturnType<typeof setTimeout>;
};

const SUBMISSION_TIMEOUT_MS = 5_000;

const FormWebView = forwardRef<FormWebViewRef, FormWebViewProps>(function FormWebView(
  { baseUrl, onShellReady, onFormReady, onChange, onSubmit, onError, onValidationError },
  ref,
) {
  const webViewRef = useRef<WebView>(null);
  const pendingSubmissionRef = useRef<PendingSubmission | null>(null);

  const injectMessage = useCallback((type: string, payload: unknown) => {
    const js = `
        (function() {
          var event = new MessageEvent('message', {
            data: ${JSON.stringify(JSON.stringify({ type, payload }))}
          });
          window.dispatchEvent(event);
        })();
        true;
      `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const loadForm = useCallback(
    (schema: object, submission?: Record<string, unknown>) => {
      injectMessage('LOAD_FORM', {
        schema,
        submission: submission ?? null,
      });
    },
    [injectMessage],
  );

  const getSubmission = useCallback((): Promise<Record<string, unknown> | null> => {
    // Cancel any pending request
    if (pendingSubmissionRef.current) {
      clearTimeout(pendingSubmissionRef.current.timer);
      pendingSubmissionRef.current.resolve(null);
      pendingSubmissionRef.current = null;
    }

    return new Promise<Record<string, unknown> | null>((resolve) => {
      const timer = setTimeout(() => {
        pendingSubmissionRef.current = null;
        resolve(null);
      }, SUBMISSION_TIMEOUT_MS);

      pendingSubmissionRef.current = { resolve, timer };
      injectMessage('GET_SUBMISSION', null);
    });
  }, [injectMessage]);

  const validateForm = useCallback(() => {
    injectMessage('VALIDATE_FORM', null);
  }, [injectMessage]);

  useImperativeHandle(ref, () => ({ loadForm, getSubmission, validateForm }), [
    loadForm,
    getSubmission,
    validateForm,
  ]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: FormShellMessage;
      try {
        msg = JSON.parse(event.nativeEvent.data) as FormShellMessage;
      } catch {
        return;
      }

      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'SHELL_READY':
          onShellReady?.();
          break;

        case 'FORM_READY':
          onFormReady?.(msg.payload as { components: number });
          break;

        case 'FORM_CHANGE':
          onChange?.(msg.payload as FormChangePayload);
          break;

        case 'FORM_SUBMIT':
          onSubmit?.(msg.payload as FormSubmitPayload);
          break;

        case 'FORM_ERROR':
          onError?.(msg.payload as FormErrorPayload);
          break;

        case 'FORM_VALIDATION_ERROR':
          onValidationError?.(msg.payload as FormValidationErrorPayload);
          break;

        case 'SUBMISSION_RESULT': {
          const pending = pendingSubmissionRef.current;
          if (pending) {
            clearTimeout(pending.timer);
            pendingSubmissionRef.current = null;
            pending.resolve((msg.payload as SubmissionResultPayload).data);
          }
          break;
        }

        default:
          if (__DEV__) {
            console.warn(`[FormWebView] Unknown message type: ${msg.type}`);
          }
          break;
      }
    },
    [onFormReady, onChange, onSubmit, onError, onValidationError],
  );

  const handleNavigationRequest = useCallback((request: ShouldStartLoadRequest): boolean => {
    // The form shell is loaded from the local file system.
    // Allow local file access and about:blank; block all external navigation.
    if (request.url === 'about:blank' || request.url.startsWith('file://')) {
      return true;
    }
    return false;
  }, []);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: `${baseUrl}form-shell.html` }}
      originWhitelist={['file://*', 'about:*']}
      allowingReadAccessToURL={baseUrl}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={handleNavigationRequest}
      javaScriptEnabled
      domStorageEnabled
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      startInLoadingState
      mixedContentMode="never"
      style={{ flex: 1 }}
    />
  );
});

export default FormWebView;
