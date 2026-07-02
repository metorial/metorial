export type SlateProtocolErrorSource = 'provider' | 'transport';

export type SlateProtocolErrorKind =
  | 'declaration'
  | 'validation'
  | 'request'
  | 'auth'
  | 'config'
  | 'resource'
  | 'payment'
  | 'upstream'
  | 'transport'
  | 'internal';

export interface SlateProtocolErrorResponse {
  code: string;
  message: string;
  kind: SlateProtocolErrorKind;
  retryable?: boolean;
  status?: number;
  issues?: Record<string, unknown>[];
  provider?: Record<string, unknown>;
  upstream?: Record<string, unknown>;
  baggage?: Record<string, unknown>;
  requestTraces?: Record<string, unknown>[];
  [key: string]: unknown;
}

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let isSlateErrorResponse = (error: unknown): error is SlateProtocolErrorResponse =>
  isRecord(error) && typeof error.code === 'string' && typeof error.message === 'string';

let inferKindFromCode = (code: string): SlateProtocolErrorKind => {
  if (code.startsWith('declaration.')) return 'declaration';
  if (code.startsWith('input.')) return 'validation';
  if (code.startsWith('request.')) return 'request';
  if (code.startsWith('config.')) return 'config';
  if (code.startsWith('auth.') || code.startsWith('permission.')) return 'auth';
  if (code.startsWith('resource.')) return 'resource';
  if (code.startsWith('payment.')) return 'payment';
  if (code.startsWith('transport.')) return 'transport';
  if (code.startsWith('upstream.')) return 'upstream';
  return 'internal';
};

let normalizeResponse = (
  error: unknown,
  source: SlateProtocolErrorSource,
  defaults: Partial<SlateProtocolErrorResponse> = {}
): SlateProtocolErrorResponse => {
  if (isSlateErrorResponse(error)) {
    return {
      ...defaults,
      ...error,
      kind: error.kind ?? inferKindFromCode(error.code)
    };
  }

  if (isRecord(error) && typeof error.message === 'string') {
    let code =
      typeof error.code === 'string'
        ? error.code
        : (defaults.code ??
          (source === 'transport' ? 'transport.invoke_failed' : 'internal.unexpected'));

    return {
      ...defaults,
      ...error,
      code,
      message: error.message,
      kind:
        (typeof error.kind === 'string'
          ? (error.kind as SlateProtocolErrorKind)
          : defaults.kind) ?? inferKindFromCode(code)
    };
  }

  let code =
    defaults.code ??
    (source === 'transport' ? 'transport.invoke_failed' : 'internal.unexpected');

  return {
    ...defaults,
    code,
    message:
      error instanceof Error
        ? error.message
        : (defaults.message ?? 'The slate returned an unexpected error.'),
    kind: defaults.kind ?? inferKindFromCode(code),
    baggage: {
      ...(defaults.baggage ?? {}),
      ...(error instanceof Error ? { originalName: error.name } : { originalValue: error })
    }
  };
};

export class SlateProtocolError extends Error {
  cause?: unknown;
  data: SlateProtocolErrorResponse;
  source: SlateProtocolErrorSource;

  constructor(
    data: SlateProtocolErrorResponse,
    source: SlateProtocolErrorSource = 'provider',
    cause?: unknown
  ) {
    super(data.message);
    this.name = 'SlateProtocolError';
    this.data = data;
    this.source = source;
    this.cause = cause;
  }

  get code() {
    return this.data.code;
  }

  get kind() {
    return this.data.kind;
  }

  get retryable() {
    return this.data.retryable;
  }

  get status() {
    return this.data.status;
  }

  toJSON() {
    return {
      ...this.data,
      source: this.source
    };
  }

  static is(error: unknown): error is SlateProtocolError {
    return error instanceof SlateProtocolError;
  }

  static fromResponse(
    error: unknown,
    source: SlateProtocolErrorSource = 'provider'
  ): SlateProtocolError {
    if (SlateProtocolError.is(error)) return error;
    return new SlateProtocolError(normalizeResponse(error, source), source, error);
  }

  static fromUnknown(
    error: unknown,
    defaults: Partial<SlateProtocolErrorResponse> = {},
    source: SlateProtocolErrorSource = 'transport'
  ) {
    if (SlateProtocolError.is(error)) return error;
    return new SlateProtocolError(normalizeResponse(error, source, defaults), source, error);
  }
}
