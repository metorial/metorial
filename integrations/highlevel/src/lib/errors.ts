import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  getApiErrorResponseWithBody,
  getResponseHeaderValue,
  isApiErrorRecord
} from 'slates';
import type { HighLevelResponseMetadata } from './types';

let redactText = (value: string, secrets: string[]) => {
  let result = value;
  for (let secret of secrets) {
    if (secret) result = result.split(secret).join('[REDACTED]');
  }
  return result
    .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]')
    .replace(
      /((?:access_token|refresh_token|client_secret|authorization|api[_-]?key)\s*[=:]\s*)[^\s&,;]+/gi,
      '$1[REDACTED]'
    )
    .slice(0, 2000);
};

let redactDetails = (value: unknown, secrets: string[], depth = 0): unknown => {
  if (depth > 5) return '[TRUNCATED]';
  if (typeof value === 'string') return redactText(value, secrets);
  if (Array.isArray(value)) {
    return value.slice(0, 30).map(item => redactDetails(item, secrets, depth + 1));
  }
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, item]) => [
          key,
          /token|secret|authorization|password|api.?key|cookie/i.test(key)
            ? '[REDACTED]'
            : redactDetails(item, secrets, depth + 1)
        ])
    );
  }
  return value;
};

export let highLevelResponseMetadata = (
  status: number,
  headers: unknown,
  body?: unknown
): HighLevelResponseMetadata => ({
  status,
  traceId:
    getResponseHeaderValue(headers, 'x-request-id') ??
    getResponseHeaderValue(headers, 'x-trace-id') ??
    getResponseHeaderValue(headers, 'x-correlation-id') ??
    (isApiErrorRecord(body) && typeof body.traceId === 'string' ? body.traceId : undefined),
  retryAfter: getResponseHeaderValue(headers, 'retry-after'),
  rateLimit: {
    limitDaily: getResponseHeaderValue(headers, 'x-ratelimit-limit-daily'),
    dailyRemaining: getResponseHeaderValue(headers, 'x-ratelimit-daily-remaining'),
    intervalMilliseconds: getResponseHeaderValue(headers, 'x-ratelimit-interval-milliseconds'),
    max: getResponseHeaderValue(headers, 'x-ratelimit-max'),
    remaining: getResponseHeaderValue(headers, 'x-ratelimit-remaining')
  }
});

export let highLevelApiError = (
  error: unknown,
  operation = 'request',
  secrets: string[] = []
) => {
  if (error instanceof ServiceError) return error;

  let response = getApiErrorResponseWithBody(error);
  let record = isApiErrorRecord(error) ? error : {};
  let normalized = isApiErrorRecord(record.data) ? record.data : {};
  let upstream = isApiErrorRecord(normalized.upstream) ? normalized.upstream : {};
  let responseRecord = isApiErrorRecord(record.response) ? record.response : {};
  let metadata = highLevelResponseMetadata(
    Number(response?.status ?? 0),
    responseRecord.headers,
    response?.data
  );
  let details = redactDetails(response?.data, secrets);
  let safeError = {
    message: redactText(
      error instanceof Error ? error.message : String(record.message ?? 'Request failed.'),
      secrets
    ),
    response: response
      ? {
          ...response,
          statusText: response.statusText
            ? redactText(response.statusText, secrets)
            : undefined,
          data: details
        }
      : undefined
  };
  let result = buildApiServiceError(safeError, {
    providerLabel: 'HighLevel',
    reason: 'highlevel_api_error',
    operation: redactText(operation, secrets),
    extractMessage: (_error, helpers) =>
      response?.data === undefined ? safeError.message : helpers.extractMessage(safeError),
    extractUpstreamCode: () => {
      let code = isApiErrorRecord(details) ? details.code : upstream.code;
      return typeof code === 'string' ? redactText(code, secrets) : undefined;
    }
  });
  result.data.providerDetails = details;
  result.data.traceId = redactDetails(metadata.traceId ?? upstream.requestId, secrets);
  result.data.retryAfter = metadata.retryAfter
    ? redactText(metadata.retryAfter, secrets)
    : undefined;
  result.data.rateLimit = redactDetails(metadata.rateLimit, secrets);
  result.data.rateLimitExhaustion =
    metadata.rateLimit.dailyRemaining === '0'
      ? 'daily'
      : metadata.rateLimit.remaining === '0'
        ? 'burst'
        : undefined;
  result.data.retryable = response?.status === 429 || normalized.retryable === true;
  result.data.requestReplayed = false;
  return result;
};
