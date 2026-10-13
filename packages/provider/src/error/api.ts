import { badRequestError, type ErrorRecord, ServiceError } from '@lowerdeck/error';
import {
  BAGGAGE_REDACTED_VALUE,
  BAGGAGE_TRUNCATED_VALUE,
  BAGGAGE_UNSERIALIZABLE_VALUE
} from './utils';

export type ApiErrorStatus = number | string;
export type ApiServiceError = ServiceError<ErrorRecord<any, any>>;

export type ApiErrorResponse = {
  status?: ApiErrorStatus;
  statusText?: string;
  data?: unknown;
};

export type ApiErrorDetailOptions = {
  detailKeys?: readonly string[];
  nestedKeys?: readonly string[];
  includeNumbers?: boolean;
  separator?: string;
  fallbackMessage?: string;
};

export type ApiErrorBuildHelpers = {
  collectDetails: (value: unknown, details: string[], options?: ApiErrorDetailOptions) => void;
  extractMessage: (error: unknown, options?: ApiErrorDetailOptions) => string;
  getResponse: (error: unknown) => ApiErrorResponse | undefined;
  getResponseWithBody: (error: unknown) => ApiErrorResponse | undefined;
  getStatus: (error: unknown) => ApiErrorStatus | undefined;
  isRecord: (value: unknown) => value is Record<string, unknown>;
  statusLabelFor: (status?: ApiErrorStatus, statusText?: string) => string;
};

export type BuildApiServiceErrorOptions = ApiErrorDetailOptions & {
  providerLabel: string;
  reason: string;
  operation?: string;
  extractMessage?: (error: unknown, helpers: ApiErrorBuildHelpers) => string | undefined;
  extractResponse?: (
    error: unknown,
    helpers: ApiErrorBuildHelpers
  ) => ApiErrorResponse | undefined;
  extractStatus?: (
    error: unknown,
    response: ApiErrorResponse | undefined,
    helpers: ApiErrorBuildHelpers
  ) => ApiErrorStatus | undefined;
  extractUpstreamCode?: (
    error: unknown,
    response: ApiErrorResponse | undefined,
    helpers: ApiErrorBuildHelpers
  ) => string | undefined;
  formatMessage?: (parts: {
    providerLabel: string;
    operation: string;
    statusLabel: string;
    message: string;
    response?: ApiErrorResponse;
    status?: ApiErrorStatus;
  }) => string;
  parent?: unknown;
};

let DEFAULT_DETAIL_KEYS = ['message', 'detail', 'error', 'error_description', 'code'];
let DEFAULT_NESTED_KEYS = ['errors'];

export let isApiErrorRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let pushDetail = (
  details: string[],
  value: unknown,
  options: Pick<ApiErrorDetailOptions, 'includeNumbers'> = {}
) => {
  if (
    typeof value !== 'string' &&
    (options.includeNumbers === false || typeof value !== 'number')
  ) {
    return;
  }

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

export let collectApiErrorDetails = (
  value: unknown,
  details: string[],
  options: ApiErrorDetailOptions = {}
) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectApiErrorDetails(item, details, options);
    }
    return;
  }

  if (!isApiErrorRecord(value)) {
    pushDetail(details, value, options);
    return;
  }

  for (let key of options.detailKeys ?? DEFAULT_DETAIL_KEYS) {
    pushDetail(details, value[key], options);
  }

  for (let key of options.nestedKeys ?? DEFAULT_NESTED_KEYS) {
    collectApiErrorDetails(value[key], details, options);
  }
};

// Runtime axios instances from createAxios reject with SlateError (the raw
// AxiosError is consumed by the response interceptor), so the upstream HTTP
// status only survives inside SlateError.data — read it back from there or
// every buildApiServiceError caller loses status-based handling in production.
let getSlateErrorResponse = (error: Record<string, unknown>): ApiErrorResponse | undefined => {
  if (error.name !== 'SlateError' || !isApiErrorRecord(error.data)) {
    return undefined;
  }

  let data = error.data;
  let upstream = isApiErrorRecord(data.upstream) ? data.upstream : undefined;
  let status = upstream?.status ?? data.status;
  return typeof status === 'number' || typeof status === 'string' ? { status } : undefined;
};

export let getApiErrorResponse = (error: unknown): ApiErrorResponse | undefined => {
  if (!isApiErrorRecord(error)) {
    return undefined;
  }
  if (!isApiErrorRecord(error.response)) {
    return getSlateErrorResponse(error);
  }

  let response = error.response;
  return {
    status:
      typeof response.status === 'number' || typeof response.status === 'string'
        ? response.status
        : undefined,
    statusText: typeof response.statusText === 'string' ? response.statusText : undefined,
    data: response.data
  };
};

export let getApiErrorStatus = (error: unknown): ApiErrorStatus | undefined =>
  getApiErrorResponse(error)?.status;

// Like getApiErrorResponse, but also recovers the upstream response body from
// interceptor-normalized SlateErrors. createAxios stores the body (sanitized by
// sanitizeForBaggage) at SlateError.data.baggage.response, so provider-specific
// message extractors need this to read upstream error details in production.
export let getApiErrorResponseWithBody = (error: unknown): ApiErrorResponse | undefined => {
  let response = getApiErrorResponse(error);
  if (response?.data !== undefined) return response;
  if (
    !isApiErrorRecord(error) ||
    error.name !== 'SlateError' ||
    !isApiErrorRecord(error.data)
  ) {
    return response;
  }

  let baggage = isApiErrorRecord(error.data.baggage) ? error.data.baggage : undefined;
  if (baggage?.response === undefined) return response;

  return { ...response, data: baggage.response };
};

export let API_ERROR_MAX_DETAILS = 5;
export let API_ERROR_MAX_MESSAGE_LENGTH = 1_000;

// sanitizeForBaggage replaces values nested past its depth limit (and values cut
// by its size budget) with this placeholder; it never carries a useful upstream message.
// Kept as an alias of BAGGAGE_TRUNCATED_VALUE for existing importers.
export let API_ERROR_TRUNCATED_PLACEHOLDER = BAGGAGE_TRUNCATED_VALUE;

// Sanitized-baggage placeholders that stand in for removed values, never messages.
let BAGGAGE_PLACEHOLDERS = new Set([
  BAGGAGE_TRUNCATED_VALUE,
  BAGGAGE_REDACTED_VALUE,
  BAGGAGE_UNSERIALIZABLE_VALUE
]);

// Detects HTML error pages (gateway, proxy, or login pages) so they are not shown
// as error messages. Requires a doctype, a leading <html>/<head> tag (pages may be
// cut off by baggage truncation), a closing document tag, or a leading markup tag
// with its closing tag, so plain text such as "<id> is required" or
// "Invalid <body> parameter" survives.
export let looksLikeHtmlErrorBody = (value: string) =>
  /^\s*<!doctype\s+html\b/i.test(value) ||
  /^\s*<(html|head)\b[^>]*>/i.test(value) ||
  /<\/(html|head|body)\s*>/i.test(value) ||
  /^\s*<(title|h[1-6]|p|div|pre|center)\b[^>]*>[\s\S]*<\/\1\s*>/i.test(value);

export let truncateApiErrorMessage = (
  value: string,
  maxLength: number = API_ERROR_MAX_MESSAGE_LENGTH
) => (value.length > maxLength ? `${value.slice(0, maxLength)}...` : value);

export type ApiErrorTextOptions = {
  // Accept numeric values (for example numeric provider error codes). Defaults to true.
  includeNumbers?: boolean;
};

// Returns a trimmed, displayable error detail, or undefined for non-text values,
// empty strings, sanitized-baggage placeholders, and HTML error pages.
export let readApiErrorText = (value: unknown, options: ApiErrorTextOptions = {}) => {
  if (
    typeof value !== 'string' &&
    (options.includeNumbers === false || typeof value !== 'number')
  ) {
    return undefined;
  }

  let text = String(value).trim();
  if (!text || BAGGAGE_PLACEHOLDERS.has(text) || looksLikeHtmlErrorBody(text)) {
    return undefined;
  }

  return text;
};

export type BoundedApiErrorDetailOptions = ApiErrorTextOptions & {
  // Stop collecting once this many details are present. Defaults to 5.
  maxDetails?: number;
  // Prefix the detail as `${field}: ${text}` (for example a field validation error).
  field?: string;
};

// Appends a unique, displayable detail while keeping the list bounded.
export let pushBoundedApiErrorDetail = (
  details: string[],
  value: unknown,
  options: BoundedApiErrorDetailOptions = {}
) => {
  if (details.length >= (options.maxDetails ?? API_ERROR_MAX_DETAILS)) return;

  let text = readApiErrorText(value, options);
  if (!text) return;

  let detail = options.field ? `${options.field}: ${text}` : text;
  if (!details.includes(detail)) {
    details.push(detail);
  }
};

export type DecodeApiErrorBodyOptions = {
  // Only decode this many leading bytes of binary bodies.
  maxBytes?: number;
};

// Text and binary (arraybuffer) responses carry provider JSON error bodies as
// strings or bytes. Decode them so the JSON structure is available to message
// extractors and survives sanitizeForBaggage. Returns parsed JSON when the text
// is a JSON object/array, the trimmed text otherwise, and other values unchanged.
export let decodeApiErrorBody = (
  data: unknown,
  options: DecodeApiErrorBodyOptions = {}
): unknown => {
  let text: string;

  if (typeof data === 'string') {
    text = data;
  } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    let bytes: Uint8Array =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (options.maxBytes !== undefined && bytes.byteLength > options.maxBytes) {
      bytes = bytes.subarray(0, options.maxBytes);
    }
    text = new TextDecoder('utf-8').decode(bytes);
  } else {
    return data;
  }

  let trimmed = text.trim();
  if (/^[{[]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not JSON after all; fall back to the trimmed text.
    }
  }

  return trimmed;
};

export let statusLabelForApiError = (status?: ApiErrorStatus, statusText?: string) =>
  status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

export let extractApiErrorMessage = (
  error: unknown,
  options: ApiErrorDetailOptions & { response?: ApiErrorResponse } = {}
) => {
  let details: string[] = [];
  let response = options.response ?? getApiErrorResponse(error);

  collectApiErrorDetails(response?.data, details, options);

  if (details.length > 0) {
    return details.join(options.separator ?? ' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return options.fallbackMessage ?? 'Unknown error';
};

export let createApiServiceError = (
  message: string,
  options: {
    reason?: string;
    upstreamStatus?: ApiErrorStatus;
    upstreamCode?: string;
    parent?: unknown;
  } = {}
) => {
  let error = new ServiceError(badRequestError({ message }));

  if (options.reason !== undefined) {
    error.data.reason = options.reason;
  }

  if ('upstreamStatus' in options) {
    error.data.upstreamStatus = options.upstreamStatus;
  }

  if ('upstreamCode' in options) {
    error.data.upstreamCode = options.upstreamCode;
  }

  if (options.parent instanceof Error) {
    error.setParent(options.parent);
  }

  return error;
};

let helpers: ApiErrorBuildHelpers = {
  collectDetails: collectApiErrorDetails,
  extractMessage: extractApiErrorMessage,
  getResponse: getApiErrorResponse,
  getResponseWithBody: getApiErrorResponseWithBody,
  getStatus: getApiErrorStatus,
  isRecord: isApiErrorRecord,
  statusLabelFor: statusLabelForApiError
};

export let buildApiServiceError = (error: unknown, options: BuildApiServiceErrorOptions) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let operation = options.operation ?? 'request';
  let response = options.extractResponse?.(error, helpers) ?? getApiErrorResponse(error);
  let status = options.extractStatus?.(error, response, helpers) ?? response?.status;
  let message =
    options.extractMessage?.(error, helpers) ??
    extractApiErrorMessage(error, { ...options, response });
  let statusLabel = statusLabelForApiError(status, response?.statusText);
  let fullMessage =
    options.formatMessage?.({
      providerLabel: options.providerLabel,
      operation,
      statusLabel,
      message,
      response,
      status
    }) ?? `${options.providerLabel} API ${operation} failed: ${statusLabel}${message}`;

  return createApiServiceError(fullMessage, {
    reason: options.reason,
    upstreamStatus: status,
    upstreamCode: options.extractUpstreamCode?.(error, response, helpers),
    parent: options.parent ?? error
  });
};
