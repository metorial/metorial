import { ServiceError, tooManyRequestsError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  getResponseHeaderValue,
  type SlateAxiosErrorOptions
} from 'slates';

type GranolaErrorContext = {
  meetingId?: string;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let numericStatus = (status: number | string | undefined) => {
  if (typeof status === 'number') return status;
  if (typeof status !== 'string') return undefined;
  let parsed = Number(status);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let normalizeRetryAfter = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  let normalized = value.trim();
  return normalized ? normalized.slice(0, 256) : undefined;
};

let responseHeaders = (error: unknown) =>
  isRecord(error) && isRecord(error.response) ? error.response.headers : undefined;

let slateErrorData = (error: unknown) => {
  if (!isRecord(error) || error.name !== 'SlateError' || !isRecord(error.data)) {
    return undefined;
  }

  return error.data;
};

let granolaBaggage = (error: unknown) => {
  let baggage = slateErrorData(error)?.baggage;
  if (!isRecord(baggage) || !isRecord(baggage.granola)) return undefined;
  return baggage.granola;
};

let retryAfterFromError = (error: unknown) =>
  normalizeRetryAfter(getResponseHeaderValue(responseHeaders(error), 'Retry-After')) ??
  normalizeRetryAfter(granolaBaggage(error)?.retryAfter);

let statusFromError = (error: unknown) => {
  let responseStatus =
    isRecord(error) && isRecord(error.response)
      ? numericStatus(
          typeof error.response.status === 'number' ||
            typeof error.response.status === 'string'
            ? error.response.status
            : undefined
        )
      : undefined;
  if (responseStatus !== undefined) return responseStatus;

  let normalized = slateErrorData(error);
  let upstream = isRecord(normalized?.upstream) ? normalized.upstream : undefined;
  let upstreamStatus = numericStatus(
    typeof upstream?.status === 'number' || typeof upstream?.status === 'string'
      ? upstream.status
      : undefined
  );
  if (upstreamStatus !== undefined) return upstreamStatus;

  return numericStatus(getApiErrorStatus(error));
};

export const granolaAxiosErrorMapping = {
  defaults: {
    provider: {
      service: 'granola'
    }
  },
  mapAxiosError: (error, inferred) => {
    let retryAfter = normalizeRetryAfter(
      getResponseHeaderValue(error.response?.headers, 'Retry-After')
    );
    let existingGranola = isRecord(inferred.baggage?.granola) ? inferred.baggage.granola : {};

    return {
      ...inferred,
      provider: {
        ...inferred.provider,
        service: 'granola'
      },
      retryable: retryAfter !== undefined ? true : inferred.retryable,
      baggage: {
        ...inferred.baggage,
        ...(retryAfter === undefined
          ? {}
          : {
              granola: {
                ...existingGranola,
                retryAfter
              }
            })
      }
    };
  }
} satisfies SlateAxiosErrorOptions;

let granolaRateLimitError = (error: unknown, operation: string, retryAfter?: string) => {
  let message = retryAfter
    ? `Granola API rate limit reached while trying to ${operation}. Retry-After is ${retryAfter}.`
    : `Granola API rate limit reached while trying to ${operation}.`;
  let hint = retryAfter
    ? `Wait for Granola's Retry-After value (${retryAfter}) before retrying.`
    : 'Wait briefly before retrying.';
  let serviceError = new ServiceError(
    tooManyRequestsError({
      message,
      hint,
      reason: 'granola_rate_limited',
      upstreamStatus: 429,
      retryable: true,
      ...(retryAfter === undefined ? {} : { retryAfter })
    })
  );

  if (error instanceof Error) serviceError.setParent(error);
  return serviceError;
};

export let granolaResponseError = (operation: string) =>
  createApiServiceError(
    `Granola returned an unexpected response while trying to ${operation}. Retry the request; if it continues to fail, check Granola's API status.`,
    { reason: 'granola_response_invalid' }
  );

export let granolaApiError = (
  error: unknown,
  operation = 'request',
  context: GranolaErrorContext = {}
) => {
  if (error instanceof ServiceError) return error;

  if (statusFromError(error) === 429) {
    return granolaRateLimitError(error, operation, retryAfterFromError(error));
  }

  return buildApiServiceError(error, {
    providerLabel: 'Granola',
    operation,
    reason: 'granola_api_error',
    detailKeys: ['message', 'error', 'detail', 'code'],
    nestedKeys: ['errors', 'details', 'error'],
    formatMessage: ({ providerLabel, operation, statusLabel, message, status }) => {
      let code = numericStatus(status);

      if (code === 401) {
        return `Granola authentication failed while trying to ${operation}. The API key is invalid or revoked; reconnect with a personal or workspace API key from Settings > Connectors > API keys.`;
      }

      if (code === 404 && context.meetingId) {
        return `Granola note ${context.meetingId} could not be retrieved while trying to ${operation}. The note may be inaccessible to this API key, may not have been summarized, or may still be processing.`;
      }

      return `${providerLabel} API ${operation} failed: ${statusLabel}${message}`;
    }
  });
};
