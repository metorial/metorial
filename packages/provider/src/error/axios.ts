import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';
import type { AuthConfigSecretRedactor } from '../auth/redact';
import { sanitizeUrl } from '../axios/trace';
import { getCurrentContext } from '../context/hook';
import type { SlateAxiosErrorOptions, SlateErrorResponse } from './types';
import {
  BAGGAGE_MAX_STRING_LENGTH,
  BAGGAGE_RESPONSE_MAX_DEPTH,
  getCurrentAuthConfigRedactor,
  getDefaultMessage,
  isRecord,
  mergeRecords,
  normalizeKind,
  normalizeRetryable,
  normalizeSlateErrorInput,
  sanitizeErrorText,
  sanitizeForBaggage
} from './utils';

let getResponseField = (value: unknown, key: string): unknown => {
  if (!isRecord(value)) return undefined;
  return value[key];
};

let getNestedMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return undefined;

  let message = getResponseField(value, 'message');
  if (typeof message === 'string' && message.trim()) return message;

  let description = getResponseField(value, 'description');
  if (typeof description === 'string' && description.trim()) return description;

  let error = getResponseField(value, 'error');
  if (typeof error === 'string' && error.trim()) return error;
  if (isRecord(error)) {
    let nested = getNestedMessage(error);
    if (nested) return nested;
  }

  let errorDescription = getResponseField(value, 'error_description');
  if (typeof errorDescription === 'string' && errorDescription.trim()) {
    return errorDescription;
  }

  return undefined;
};

let getNestedCode = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;

  let directCode = getResponseField(value, 'code');
  if (typeof directCode === 'string' && directCode.trim()) return directCode;

  let errorCode = getResponseField(value, 'error_code');
  if (typeof errorCode === 'string' && errorCode.trim()) return errorCode;

  let type = getResponseField(value, 'type');
  if (typeof type === 'string' && type.trim()) return type;

  let error = getResponseField(value, 'error');
  if (typeof error === 'string' && error.trim()) return error;
  if (isRecord(error)) return getNestedCode(error);

  return undefined;
};

let getNestedType = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;

  let type = getResponseField(value, 'type');
  if (typeof type === 'string' && type.trim()) return type;

  let error = getResponseField(value, 'error');
  if (isRecord(error)) {
    let nestedType = getNestedType(error);
    if (nestedType) return nestedType;
  }

  return undefined;
};

let getHeaderValue = (headers: unknown, key: string): string | undefined => {
  if (!headers) return undefined;

  if (typeof (headers as { get?: unknown }).get === 'function') {
    let value = (headers as { get(name: string): unknown }).get(key);
    if (typeof value === 'string' && value.trim()) return value;
  }

  if (isRecord(headers)) {
    for (let [headerKey, headerValue] of Object.entries(headers)) {
      if (headerKey.toLowerCase() !== key.toLowerCase()) continue;
      if (typeof headerValue === 'string' && headerValue.trim()) return headerValue;
      if (Array.isArray(headerValue)) {
        let first = headerValue.find(item => typeof item === 'string' && item.trim());
        if (typeof first === 'string') return first;
      }
    }
  }

  return undefined;
};

// Credentials embedded in URL paths (Telegram `/bot<token>/`, Alchemy `/v2/<apiKey>`)
// are only recognizable with the auth-config redactor, mirroring HTTP traces.
let sanitizeRequestUrl = (url: string, redactor?: AuthConfigSecretRedactor) => {
  try {
    return sanitizeUrl(url, redactor);
  } catch {
    return sanitizeUrl(url);
  }
};

let buildRequestUrl = (error: AxiosError, redactor?: AuthConfigSecretRedactor) => {
  let baseURL = error.config?.baseURL;
  let url = error.config?.url;

  if (!url) return undefined;
  if (!baseURL) return sanitizeRequestUrl(url, redactor);

  let absoluteUrl = url;
  try {
    absoluteUrl = new URL(url, baseURL).toString();
  } catch {}

  return sanitizeRequestUrl(absoluteUrl, redactor);
};

let getProviderDefaults = (): Partial<SlateErrorResponse> => {
  try {
    let ctx = getCurrentContext();
    return {
      provider: {
        key: ctx.specification.key
      },
      ...(ctx.getHttpTraces().length > 0 ? { requestTraces: ctx.getHttpTraces() } : {})
    };
  } catch {
    return {};
  }
};

let inferAxiosCode = (error: AxiosError, data: unknown) => {
  let status = error.response?.status;
  let axiosCode = error.code?.toUpperCase();
  let remoteCode = getNestedCode(data)?.toLowerCase();

  if (
    axiosCode === 'ECONNABORTED' ||
    axiosCode === 'ETIMEDOUT' ||
    status === 408 ||
    remoteCode?.includes('timeout')
  ) {
    return 'upstream.timeout';
  }

  if (!error.response) {
    return 'upstream.network_error';
  }

  if (status === 401) return 'auth.invalid';
  if (status === 403) {
    return remoteCode?.includes('rate') ? 'upstream.rate_limited' : 'permission.denied';
  }
  if (status === 404) return 'resource.not_found';
  if (status === 409) return 'resource.conflict';
  if (status === 422 || status === 400) return 'upstream.invalid_request';
  if (status === 429) return 'upstream.rate_limited';
  if (status === 502 || status === 503 || status === 504) return 'upstream.unavailable';
  if (status && status >= 500) return 'upstream.error';

  return 'upstream.error';
};

// Upstream bodies can echo credentials back (request dumps, debug fields), so the
// inferred message is scrubbed and bounded before it becomes SlateError.message.
let inferAxiosMessage = (
  error: AxiosError,
  data: unknown,
  code: string,
  redactor?: AuthConfigSecretRedactor
) => {
  let message =
    getNestedMessage(data) ??
    error.response?.statusText ??
    error.message ??
    getDefaultMessage(code);

  // Scrub before cutting so the cut cannot leave a credential fragment the patterns
  // no longer recognize; sanitizeErrorText bounds its own scan.
  let scrubbed = sanitizeErrorText(message, redactor ?? null);
  return scrubbed.length > BAGGAGE_MAX_STRING_LENGTH
    ? `${scrubbed.slice(0, BAGGAGE_MAX_STRING_LENGTH)}...`
    : scrubbed;
};

let inferAxiosRetryable = (error: AxiosError, code: string) => {
  let headerValue = getHeaderValue(error.response?.headers, 'retry-after');
  if (headerValue) return true;
  return normalizeRetryable(code, undefined);
};

export let isAxiosErrorLike = (error: unknown): error is AxiosError => isAxiosError(error);

export let inferSlateErrorFromAxios = (
  error: AxiosError,
  options: SlateAxiosErrorOptions = {}
): SlateErrorResponse => {
  let responseData = error.response
    ? (options.extractResponseData?.(error.response) ?? error.response.data)
    : undefined;

  let code = inferAxiosCode(error, responseData);
  let redactor = getCurrentAuthConfigRedactor();

  return normalizeSlateErrorInput({
    ...getProviderDefaults(),
    ...options.defaults,
    code: options.defaults?.code ?? code,
    message:
      options.defaults?.message ?? inferAxiosMessage(error, responseData, code, redactor),
    kind: options.defaults?.kind ?? normalizeKind(options.defaults?.code ?? code),
    retryable:
      options.defaults?.retryable ??
      inferAxiosRetryable(error, options.defaults?.code ?? code),
    status: options.defaults?.status ?? error.response?.status,
    provider: {
      ...getProviderDefaults().provider,
      ...(options.defaults?.provider ?? {})
    },
    upstream: {
      ...(options.defaults?.upstream ?? {}),
      status: error.response?.status ?? options.defaults?.upstream?.status,
      code: getNestedCode(responseData) ?? options.defaults?.upstream?.code,
      type: getNestedType(responseData) ?? options.defaults?.upstream?.type,
      requestId:
        getHeaderValue(error.response?.headers, 'x-request-id') ??
        getHeaderValue(error.response?.headers, 'request-id') ??
        getHeaderValue(error.response?.headers, 'x-correlation-id') ??
        options.defaults?.upstream?.requestId,
      method: error.config?.method?.toUpperCase() ?? options.defaults?.upstream?.method,
      url: buildRequestUrl(error, redactor) ?? options.defaults?.upstream?.url
    },
    baggage: mergeRecords(options.defaults?.baggage, {
      axiosCode: error.code,
      response: sanitizeForBaggage(responseData, {
        maxDepth: BAGGAGE_RESPONSE_MAX_DEPTH,
        redactor: redactor ?? null
      })
    })
  });
};
