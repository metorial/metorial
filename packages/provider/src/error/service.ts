import type { ErrorData, ErrorRecord, ServiceError } from '@lowerdeck/error';
import { isServiceError } from '@lowerdeck/error';
import { DEFAULT_CODE, SERVICE_ERROR_CODE_MAP } from './defaults';
import type { SlateErrorInput, SlateErrorIssue, SlateServiceErrorData } from './types';
import {
  cleanRecord,
  isRecord,
  normalizeKind,
  normalizeRetryable,
  sanitizeForBaggage
} from './utils';

let SERVICE_ERROR_DATA_RESERVED_KEYS = new Set([
  'status',
  'code',
  'message',
  'hint',
  'description',
  'reason',
  'errors',
  'object',
  'ok'
]);

let isStructuredValue = (value: unknown): value is Record<string, unknown> | Function =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

let mapServiceErrorCodeByStatus = (status?: number) => {
  if (status === 400) return 'request.bad';
  if (status === 401) return 'auth.required';
  if (status === 402) return 'payment.required';
  if (status === 403) return 'permission.denied';
  if (status === 404) return 'resource.not_found';
  if (status === 406) return 'request.not_acceptable';
  if (status === 409) return 'resource.conflict';
  if (status === 410) return 'resource.gone';
  if (status === 412) return 'request.precondition_failed';
  if (status === 429) return 'request.rate_limited';
  if (status === 501) return 'operation.not_implemented';
  if (status === 504) return 'internal.timeout';
  if (status && status >= 500) return 'internal.unexpected';
  return DEFAULT_CODE;
};

let normalizeServiceErrorIssues = (errors: unknown): SlateErrorIssue[] | undefined => {
  if (!Array.isArray(errors)) return undefined;

  let issues = errors.map(error => {
    if (!isRecord(error)) {
      return {
        message: String(error)
      };
    }

    let path = Array.isArray(error.path) ? error.path.map(entry => String(entry)) : undefined;

    return {
      ...error,
      path,
      code: typeof error.code === 'string' ? error.code : undefined,
      message:
        typeof error.message === 'string'
          ? error.message
          : typeof error.hint === 'string'
            ? error.hint
            : 'Validation issue'
    };
  });

  return issues.length > 0 ? issues : undefined;
};

let getServiceErrorBaggage = (data: SlateServiceErrorData) => {
  let extraEntries = Object.entries(data).filter(
    ([key]) => !SERVICE_ERROR_DATA_RESERVED_KEYS.has(key)
  );

  return cleanRecord({
    serviceError: {
      code: data.code,
      status: data.status,
      hint: data.hint,
      description: data.description,
      reason: data.reason
    },
    ...(extraEntries.length > 0
      ? {
          serviceErrorData: sanitizeForBaggage(Object.fromEntries(extraEntries))
        }
      : {})
  });
};

export let mapServiceErrorCode = (code: string, status?: number) =>
  SERVICE_ERROR_CODE_MAP[code] ?? mapServiceErrorCodeByStatus(status);

export let isServiceErrorData = (value: unknown): value is SlateServiceErrorData =>
  isRecord(value) &&
  typeof value.status === 'number' &&
  typeof value.code === 'string' &&
  typeof value.message === 'string' &&
  !('config' in value) &&
  !('request' in value) &&
  !('response' in value) &&
  !('isAxiosError' in value);

export let getServiceErrorData = (error: unknown): SlateServiceErrorData | null => {
  if (isServiceError(error)) {
    return isServiceErrorData(error.data) ? error.data : null;
  }

  if (isServiceErrorData(error)) {
    return error;
  }

  if (isStructuredValue(error) && 'data' in error && isServiceErrorData(error.data)) {
    return error.data;
  }

  if (
    isStructuredValue(error) &&
    'toResponse' in error &&
    typeof error.toResponse === 'function'
  ) {
    let response = error.toResponse();
    return isServiceErrorData(response) ? response : null;
  }

  return null;
};

export let mapServiceErrorToSlateErrorInput = (
  error:
    | ServiceError<ErrorRecord<any, any>>
    | ErrorRecord<any, any>
    | ErrorData<any, any>
    | SlateServiceErrorData,
  defaults: Partial<SlateErrorInput> = {}
): SlateErrorInput => {
  let data = getServiceErrorData(error);
  if (!data) {
    return {
      code: defaults.code ?? DEFAULT_CODE,
      message: defaults.message ?? 'An unexpected internal error occurred.',
      kind: defaults.kind,
      retryable: defaults.retryable,
      status: defaults.status,
      provider: defaults.provider,
      upstream: defaults.upstream,
      baggage: defaults.baggage
    };
  }

  let code = defaults.code ?? mapServiceErrorCode(data.code, data.status);

  return {
    code,
    message: defaults.message ?? data.message,
    kind: defaults.kind ?? normalizeKind(code),
    retryable: defaults.retryable ?? normalizeRetryable(code),
    status: defaults.status ?? data.status,
    issues: defaults.issues ?? normalizeServiceErrorIssues(data.errors),
    provider: defaults.provider,
    upstream: defaults.upstream,
    baggage: cleanRecord({
      ...(defaults.baggage ?? {}),
      ...getServiceErrorBaggage(data)
    })
  };
};
