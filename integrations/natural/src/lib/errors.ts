import { ServiceError } from '@lowerdeck/error';
import {
  type ApiErrorBuildHelpers,
  type ApiErrorResponse,
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  getApiErrorResponse,
  getResponseHeaderValue,
  type SlateAxiosErrorOptions,
  type SlateErrorIssue
} from 'slates';

type NaturalRateLimitDetails = {
  retryAfter?: string;
  limit?: string;
  remaining?: string;
  reset?: string;
};

type NaturalErrorContext = {
  supportId?: unknown;
  requestId?: string;
  connectionStatus?: unknown;
  providerIdentifiers?: Record<string, unknown>;
  rateLimit?: NaturalRateLimitDetails;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const compactRecord = <Value extends Record<string, unknown>>(value: Value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Value;

const responseHeaders = (error: unknown) =>
  isRecord(error) && isRecord(error.response) ? error.response.headers : undefined;

const slateErrorData = (error: unknown) => {
  if (!isRecord(error) || error.name !== 'SlateError' || !isRecord(error.data)) {
    return undefined;
  }

  return error.data;
};

const naturalErrorResponse = (error: unknown): ApiErrorResponse | undefined => {
  const response = getApiErrorResponse(error);
  if (response?.data !== undefined) return response;

  const data = slateErrorData(error);
  if (!data) return response;

  const upstream = isRecord(data.upstream) ? data.upstream : undefined;
  const baggage = isRecord(data.baggage) ? data.baggage : undefined;

  return {
    status:
      response?.status ??
      (typeof upstream?.status === 'number' || typeof upstream?.status === 'string'
        ? upstream.status
        : typeof data.status === 'number' || typeof data.status === 'string'
          ? data.status
          : undefined),
    data: baggage?.response
  };
};

const naturalIssues = (payload: unknown): SlateErrorIssue[] => {
  if (!isRecord(payload) || !Array.isArray(payload.errors)) return [];

  return payload.errors.flatMap(item => {
    if (!isRecord(item)) {
      return [{ message: String(item) }];
    }

    const detail = typeof item.detail === 'string' ? item.detail : undefined;
    const code = typeof item.code === 'string' ? item.code : undefined;
    const issue = compactRecord({
      message: detail ?? code ?? 'Natural API error',
      detail: item.detail,
      code: item.code,
      status: item.status,
      source: item.source,
      meta: item.meta
    });

    return [issue];
  });
};

const issueMetadata = (issues: SlateErrorIssue[]) =>
  issues.flatMap(issue => (isRecord(issue.meta) ? [issue.meta] : []));

const firstMetadataValue = (metadata: Record<string, unknown>[], key: string) => {
  for (const item of metadata) {
    if (item[key] !== undefined) return item[key];
  }

  return undefined;
};

const providerIdentifiersFrom = (metadata: Record<string, unknown>[]) => {
  const entries = metadata.flatMap(item =>
    Object.entries(item).filter(
      ([key, value]) => key.toLowerCase().includes('provider') && value !== undefined
    )
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
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

const contextFromPayload = (payload: unknown, headers: unknown): NaturalErrorContext => {
  const metadata = issueMetadata(naturalIssues(payload));
  const rateLimit = naturalRateLimitDetails(headers);

  return compactRecord({
    supportId: firstMetadataValue(metadata, 'supportId'),
    requestId: getResponseHeaderValue(headers, 'X-Request-ID'),
    connectionStatus: firstMetadataValue(metadata, 'connectionStatus'),
    providerIdentifiers: providerIdentifiersFrom(metadata),
    rateLimit: Object.keys(rateLimit).length > 0 ? rateLimit : undefined
  });
};

const contextFromSlateError = (error: unknown): NaturalErrorContext => {
  const data = slateErrorData(error);
  if (!data) return {};

  const baggage = isRecord(data.baggage) ? data.baggage : undefined;
  const natural = isRecord(baggage?.natural) ? baggage.natural : undefined;
  const upstream = isRecord(data.upstream) ? data.upstream : undefined;

  return compactRecord({
    supportId: natural?.supportId,
    requestId:
      typeof natural?.requestId === 'string'
        ? natural.requestId
        : typeof upstream?.requestId === 'string'
          ? upstream.requestId
          : undefined,
    connectionStatus: natural?.connectionStatus,
    providerIdentifiers: isRecord(natural?.providerIdentifiers)
      ? natural.providerIdentifiers
      : undefined,
    rateLimit: isRecord(natural?.rateLimit)
      ? (natural.rateLimit as NaturalRateLimitDetails)
      : undefined
  });
};

const naturalErrorMessage = (error: unknown, _helpers: ApiErrorBuildHelpers) => {
  const data = naturalErrorResponse(error)?.data;
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
  return error instanceof Error && error.message ? error.message : undefined;
};

const naturalUpstreamCode = (
  error: unknown,
  response: ApiErrorResponse | undefined,
  _helpers: ApiErrorBuildHelpers
) => {
  const issues = naturalIssues(response?.data);
  const firstCode = issues.find(issue => typeof issue.code === 'string')?.code;
  if (typeof firstCode === 'string') return firstCode;

  const upstream = slateErrorData(error)?.upstream;
  return isRecord(upstream) && typeof upstream.code === 'string' ? upstream.code : undefined;
};

export const naturalAxiosErrorMapping = {
  defaults: {
    provider: {
      service: 'natural'
    }
  },
  mapAxiosError: (error, inferred) => {
    const payload = error.response?.data;
    const issues = naturalIssues(payload);
    const context = contextFromPayload(payload, error.response?.headers);
    const firstCode = issues.find(issue => typeof issue.code === 'string')?.code;

    return {
      provider: {
        ...inferred.provider,
        service: 'natural'
      },
      upstream: {
        ...inferred.upstream,
        code: typeof firstCode === 'string' ? firstCode : inferred.upstream?.code,
        requestId: context.requestId ?? inferred.upstream?.requestId
      },
      issues: issues.length > 0 ? issues : inferred.issues,
      retryable: context.rateLimit?.retryAfter ? true : inferred.retryable,
      baggage: {
        ...inferred.baggage,
        ...(Object.keys(context).length > 0 ? { natural: context } : {})
      }
    };
  }
} satisfies SlateAxiosErrorOptions;

export const naturalServiceError = (message: string, reason = 'natural_validation_error') =>
  createApiServiceError(message, { reason });

export const naturalApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  const response = naturalErrorResponse(error);
  const serviceError = buildApiServiceError(error, {
    providerLabel: 'Natural',
    reason: 'natural_api_error',
    operation,
    extractResponse: naturalErrorResponse,
    extractMessage: naturalErrorMessage,
    extractUpstreamCode: naturalUpstreamCode
  });
  const payloadIssues = naturalIssues(response?.data);
  const normalizedIssues = slateErrorData(error)?.issues;
  const issues =
    Array.isArray(normalizedIssues) && normalizedIssues.length > 0
      ? normalizedIssues
      : payloadIssues;
  const context = {
    ...contextFromPayload(response?.data, responseHeaders(error)),
    ...contextFromSlateError(error)
  };
  const normalizedData = slateErrorData(error);

  if (issues.length > 0) {
    serviceError.data.errors = issues;
    serviceError.data.issues = issues;
  }
  if (context.supportId !== undefined) serviceError.data.supportId = context.supportId;
  if (context.requestId !== undefined) serviceError.data.requestId = context.requestId;
  if (context.connectionStatus !== undefined) {
    serviceError.data.connectionStatus = context.connectionStatus;
  }
  if (context.providerIdentifiers !== undefined) {
    serviceError.data.providerIdentifiers = context.providerIdentifiers;
  }
  if (context.rateLimit !== undefined) serviceError.data.rateLimit = context.rateLimit;
  if (typeof normalizedData?.retryable === 'boolean') {
    serviceError.data.retryable = normalizedData.retryable;
  } else if (context.rateLimit?.retryAfter !== undefined) {
    serviceError.data.retryable = true;
  }

  return serviceError;
};
