/**
 * WebView message types sent FROM the form shell TO React Native.
 */
export type FormShellOutboundType =
  | 'SHELL_READY'
  | 'FORM_READY'
  | 'FORM_CHANGE'
  | 'FORM_SUBMIT'
  | 'FORM_ERROR'
  | 'FORM_VALIDATION_ERROR'
  | 'SUBMISSION_RESULT';

/**
 * WebView message types sent FROM React Native TO the form shell.
 */
export type FormShellInboundType =
  | 'LOAD_FORM'
  | 'GET_SUBMISSION'
  | 'SET_SUBMISSION'
  | 'SET_READ_ONLY'
  | 'VALIDATE_FORM';

export interface FormShellMessage<T = unknown> {
  type: FormShellOutboundType | FormShellInboundType;
  payload: T;
}

export interface FormChangePayload {
  data: Record<string, unknown>;
  changed: Record<string, unknown> | null;
  isValid: boolean;
}

export interface FormReadyPayload {
  components: number;
}

export interface FormErrorPayload {
  message: string;
  detail: string | null;
}

export interface FormValidationErrorPayload {
  errors: string[];
}

export interface FormSubmitPayload {
  data: Record<string, unknown>;
}

export interface SubmissionResultPayload {
  data: Record<string, unknown> | null;
}

/**
 * Methods exposed by FormWebView via forwardRef.
 */
export interface FormWebViewRef {
  loadForm: (schema: object, submission?: Record<string, unknown>) => void;
  getSubmission: () => Promise<Record<string, unknown> | null>;
  validateForm: () => void;
}

/**
 * Props for the FormWebView component.
 */
export interface FormWebViewProps {
  baseUrl: string;
  onShellReady?: () => void;
  onFormReady?: (payload: FormReadyPayload) => void;
  onChange?: (payload: FormChangePayload) => void;
  onSubmit?: (payload: FormSubmitPayload) => void;
  onError?: (payload: FormErrorPayload) => void;
  onValidationError?: (payload: FormValidationErrorPayload) => void;
}
