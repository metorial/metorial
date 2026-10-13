import { badRequestError, ServiceError } from '@lowerdeck/error';
import { isApiErrorRecord } from 'slates';

export let sentryServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

let MAX_ERROR_DETAILS = 5;
let MAX_ERROR_MESSAGE_LENGTH = 1_000;
let MAX_FIELD_DEPTH = 6;

// Organization-level endpoints the client calls with no other path identifiers.
// A 404 here means the configured organization itself could not be resolved.
let ORGANIZATION_SCOPED_PATH =
  /^\/(?:api\/0\/)?organizations\/([^/]+)\/(?:(?:projects|teams|issues|members|releases|alert-rules|monitors|events)\/)?$/;

let looksLikeHtml = (value: string) =>
  /^\s*</.test(value) || /<\/?(html|body|head)\b/i.test(value);

let truncate = (value: string) =>
  value.length > MAX_ERROR_MESSAGE_LENGTH
    ? `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`
    : value;

let pushDetail = (details: string[], value: unknown, field?: string) => {
  if (details.length >= MAX_ERROR_DETAILS) return;
  if (typeof value !== 'string' && typeof value !== 'number') return;

  let text = String(value).trim();
  if (!text || looksLikeHtml(text)) return;

  let detail = field ? `${field}: ${text}` : text;
  if (!details.includes(detail)) {
    details.push(detail);
  }
};

// Sentry REST errors use { detail: string | { message, code } } and Django REST
// serializer errors such as { field: ["message"], non_field_errors: ["message"] }.
let collectSentryDetails = (
  value: unknown,
  details: string[],
  field: string | undefined,
  depth: number
) => {
  if (details.length >= MAX_ERROR_DETAILS || depth > MAX_FIELD_DEPTH) return;

  if (Array.isArray(value)) {
    for (let item of value) {
      collectSentryDetails(item, details, field, depth + 1);
    }
    return;
  }

  if (!isApiErrorRecord(value)) {
    pushDetail(details, value, field);
    return;
  }

  for (let [key, nested] of Object.entries(value)) {
    if (key === 'code' || key === 'extra') continue;

    let isMessageKey =
      key === 'detail' ||
      key === 'message' ||
      key === 'error' ||
      key === 'error_description' ||
      key === 'non_field_errors';
    let nestedField = isMessageKey ? field : field ? `${field}.${key}` : key;
    collectSentryDetails(nested, details, nestedField, depth + 1);
  }
};

let getSentryErrorCode = (data: unknown) => {
  if (!isApiErrorRecord(data)) return undefined;
  if (typeof data.code === 'string') return data.code;
  if (isApiErrorRecord(data.detail) && typeof data.detail.code === 'string') {
    return data.detail.code;
  }
  return undefined;
};

let getRequestPath = (url: string | undefined) => {
  if (!url) return undefined;

  try {
    return new URL(url, 'https://sentry.invalid').pathname;
  } catch {
    return undefined;
  }
};

let decodeSegment = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

type SentryErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
  config?: { url?: string };
};

// createAxios turns upstream failures into SlateError and only reads common
// message fields, so Sentry's `detail` and field errors would otherwise be lost
// behind a bare status text. Flatten them into one bounded message.
export let flattenSentryErrorResponse = (
  response: SentryErrorResponse,
  connection: { organizationSlug: string; region: 'us' | 'de' }
) => {
  let details: string[] = [];
  collectSentryDetails(response.data, details, undefined, 0);

  let path = getRequestPath(response.config?.url);
  let organizationMatch = path ? ORGANIZATION_SCOPED_PATH.exec(path) : null;
  if (
    response.status === 404 &&
    organizationMatch?.[1] !== undefined &&
    decodeSegment(organizationMatch[1]) === connection.organizationSlug
  ) {
    let regionLabel = connection.region === 'de' ? 'EU (de.sentry.io)' : 'US (us.sentry.io)';
    details.push(
      `Sentry organization "${connection.organizationSlug}" was not found in the ${regionLabel} region. Check that the organization slug and data region in the connection settings are correct and that the token has access to this organization.`
    );
  }

  let statusLabel =
    response.status !== undefined
      ? ` (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
      : '';
  let code = getSentryErrorCode(response.data);
  let message =
    details.length > 0
      ? `Sentry API request failed${statusLabel}: ${details.join(' - ')}`
      : `Sentry API request failed${statusLabel}.`;

  return {
    message: truncate(message),
    ...(code ? { code } : {})
  };
};
