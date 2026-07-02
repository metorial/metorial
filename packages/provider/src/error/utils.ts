import { DEFAULT_CODE, DEFAULT_MESSAGES } from './defaults';
import type {
  SlateErrorInput,
  SlateErrorKind,
  SlateErrorProviderInfo,
  SlateErrorResponse,
  SlateErrorUpstreamInfo
} from './types';

export let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let normalizeKind = (code: string, kind?: SlateErrorKind): SlateErrorKind => {
  if (kind) return kind;
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

export let normalizeStatus = (code: string, status?: number) => {
  if (status) return status;
  if (code === 'input.invalid' || code === 'request.bad' || code === 'config.invalid')
    return 400;
  if (code === 'request.invalid_version') return 400;
  if (code === 'auth.required' || code === 'auth.invalid' || code === 'auth.expired')
    return 401;
  if (code === 'payment.required') return 402;
  if (code === 'permission.denied') return 403;
  if (code === 'resource.not_found') return 404;
  if (code === 'resource.conflict') return 409;
  if (code === 'resource.gone') return 410;
  if (code === 'request.not_acceptable') return 406;
  if (code === 'request.precondition_failed') return 412;
  if (code === 'request.rate_limited' || code === 'upstream.rate_limited') return 429;
  if (code === 'operation.not_implemented') return 501;
  if (code === 'upstream.invalid_request') return 400;
  if (code === 'upstream.timeout' || code === 'internal.timeout') return 504;
  if (code === 'upstream.unavailable') return 503;
  if (code === 'upstream.error') return 502;
  return undefined;
};

export let normalizeRetryable = (code: string, retryable?: boolean) => {
  if (typeof retryable === 'boolean') return retryable;
  return (
    code === 'request.rate_limited' ||
    code === 'upstream.rate_limited' ||
    code === 'upstream.timeout' ||
    code === 'upstream.network_error' ||
    code === 'upstream.unavailable' ||
    code === 'upstream.error' ||
    code === 'transport.invoke_failed' ||
    code === 'internal.timeout'
  );
};

export let getDefaultMessage = (code: string, message?: string) => {
  if (message?.trim()) return message;
  return DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES[DEFAULT_CODE];
};

export let cleanRecord = <Value extends Record<string, unknown> | undefined>(value: Value) => {
  if (!value) return undefined;

  let entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Value;
};

export let mergeRecords = (
  left?: Record<string, unknown>,
  right?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!left && !right) return undefined;
  return cleanRecord({
    ...(left ?? {}),
    ...(right ?? {})
  });
};

export let mergeSlateErrorData = (
  base: SlateErrorResponse,
  override?: Partial<SlateErrorResponse>
): SlateErrorResponse => {
  if (!override) return base;

  return {
    ...base,
    ...override,
    provider: cleanRecord({
      ...(base.provider ?? {}),
      ...(override.provider ?? {})
    }) as SlateErrorProviderInfo | undefined,
    upstream: cleanRecord({
      ...(base.upstream ?? {}),
      ...(override.upstream ?? {})
    }) as SlateErrorUpstreamInfo | undefined,
    baggage: mergeRecords(base.baggage, override.baggage),
    issues: override.issues ?? base.issues,
    requestTraces: override.requestTraces ?? base.requestTraces
  };
};

export let sanitizeForBaggage = (value: unknown, depth = 0): unknown => {
  if (value == null) return value;
  if (depth >= 4) return '[truncated]';
  if (typeof value === 'string') {
    return value.length > 2_000 ? `${value.slice(0, 2_000)}...[truncated]` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => sanitizeForBaggage(item, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([key, entry]) => [key, sanitizeForBaggage(entry, depth + 1)])
    );
  }
  return String(value);
};

export let normalizeSlateErrorInput = (input: SlateErrorInput): SlateErrorResponse => {
  let code = input.code || DEFAULT_CODE;
  return {
    code,
    message: getDefaultMessage(code, input.message),
    kind: normalizeKind(code, input.kind),
    retryable: normalizeRetryable(code, input.retryable),
    status: normalizeStatus(code, input.status ?? input.upstream?.status),
    issues: input.issues,
    provider: cleanRecord(input.provider as Record<string, unknown> | undefined) as
      | SlateErrorProviderInfo
      | undefined,
    upstream: cleanRecord({
      ...input.upstream,
      status: input.upstream?.status ?? input.status
    }) as SlateErrorUpstreamInfo | undefined,
    baggage: cleanRecord(input.baggage),
    requestTraces: input.requestTraces
  };
};

export let isSlateErrorResponse = (error: unknown): error is SlateErrorResponse => {
  if (!isRecord(error)) return false;
  return typeof error.code === 'string' && typeof error.message === 'string';
};
