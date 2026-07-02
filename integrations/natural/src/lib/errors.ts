import { ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorBuildHelpers,
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getResponseHeaderValue
} from 'slates';

type NaturalRateLimitDetails = {
  retryAfter?: string;
  limit?: string;
  remaining?: string;
  reset?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const responseHeaders = (error: unknown) =>
  isRecord(error) && isRecord(error.response) ? error.response.headers : undefined;

const naturalErrorMessage = (error: unknown, helpers: ApiErrorBuildHelpers) => {
  const response = helpers.getResponse(error);
  const data = response?.data;
  const details: string[] = [];

  if (isRecord(data) && Array.isArray(data.errors)) {
    for (const item of data.errors) {
      if (isRecord(item)) {
        collectApiErrorDetails(item, details, {
          detailKeys: ['detail', 'code', 'status'],
          nestedKeys: ['source', 'meta'],
          includeNumbers: true
        });
        continue;
      }

      collectApiErrorDetails(item, details);
    }
  }

  if (details.length > 0) return details.join(' - ');
  return undefined;
};

const naturalUpstreamCode = (
  _error: unknown,
  response: { data?: unknown } | undefined,
  helpers: ApiErrorBuildHelpers
) => {
  const data = response?.data;
  if (!helpers.isRecord(data) || !Array.isArray(data.errors)) return undefined;

  const first = data.errors.find(helpers.isRecord);
  return typeof first?.code === 'string' ? first.code : undefined;
};

const naturalRateLimitDetails = (headers: unknown): NaturalRateLimitDetails => {
  const details: NaturalRateLimitDetails = {};
  const retryAfter = getResponseHeaderValue(headers, 'Retry-After');
  const limit = getResponseHeaderValue(headers, 'X-RateLimit-Limit');
  const remaining = getResponseHeaderValue(headers, 'X-RateLimit-Remaining');
  const reset = getResponseHeaderValue(headers, 'X-RateLimit-Reset');

  if (retryAfter !== undefined) details.retryAfter = retryAfter;
  if (limit !== undefined) details.limit = limit;
  if (remaining !== undefined) details.remaining = remaining;
  if (reset !== undefined) details.reset = reset;

  return details;
};

export const naturalServiceError = (message: string, reason = 'natural_validation_error') =>
  createApiServiceError(message, { reason });

export const naturalApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  const serviceError = buildApiServiceError(error, {
    providerLabel: 'Natural',
    reason: 'natural_api_error',
    operation,
    extractMessage: naturalErrorMessage,
    extractUpstreamCode: naturalUpstreamCode
  });

  const rateLimit = naturalRateLimitDetails(responseHeaders(error));
  if (Object.keys(rateLimit).length > 0) {
    serviceError.data.rateLimit = rateLimit;
  }

  return serviceError;
};
