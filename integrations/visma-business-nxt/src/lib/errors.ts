import {
  buildApiServiceError,
  collectApiErrorDetails,
  createApiServiceError,
  isApiErrorRecord
} from 'slates';

export type BusinessNxtGraphQLError = {
  message?: string;
  extensions?: Record<string, unknown>;
};

let collectGraphQlMessages = (errors: BusinessNxtGraphQLError[]) => {
  let details: string[] = [];

  for (let error of errors) {
    collectApiErrorDetails(error, details, {
      detailKeys: ['message', 'code'],
      nestedKeys: [],
      includeNumbers: true
    });

    if (error.extensions) {
      collectApiErrorDetails(error.extensions, details, {
        detailKeys: ['message', 'code', 'classification'],
        nestedKeys: ['errors'],
        includeNumbers: true
      });
    }
  }

  return details.length > 0 ? details.join(' - ') : 'Unknown GraphQL error';
};

let getTraceId = (extensions?: Record<string, unknown>) => {
  if (!extensions) return undefined;

  let traceId = extensions['vbnxt-trace-id'] ?? extensions.traceId ?? extensions.trace_id;
  return typeof traceId === 'string' && traceId.trim() ? traceId : undefined;
};

let getFirstGraphQlCode = (errors: BusinessNxtGraphQLError[]) => {
  for (let error of errors) {
    let code = error.extensions?.code;
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }

  return undefined;
};

export let vismaBusinessNxtServiceError = (
  message: string,
  options: {
    reason?: string;
    upstreamStatus?: number | string;
    upstreamCode?: string;
    parent?: unknown;
  } = {}
) =>
  createApiServiceError(message, {
    reason: options.reason ?? 'visma_business_nxt_validation_error',
    upstreamStatus: options.upstreamStatus,
    upstreamCode: options.upstreamCode,
    parent: options.parent
  });

export let vismaBusinessNxtApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Visma Business NXT',
    reason: 'visma_business_nxt_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'error_description', 'code'],
    nestedKeys: ['errors']
  });

export let vismaBusinessNxtGraphQlError = (
  errors: BusinessNxtGraphQLError[],
  operation = 'request',
  extensions?: Record<string, unknown>
) => {
  let message = collectGraphQlMessages(errors);
  let traceId =
    getTraceId(extensions) ?? errors.map(error => getTraceId(error.extensions)).find(Boolean);
  let serviceError = vismaBusinessNxtServiceError(
    `Visma Business NXT GraphQL ${operation} failed: ${message}${
      traceId ? ` (trace ${traceId})` : ''
    }`,
    {
      reason: 'visma_business_nxt_graphql_error',
      upstreamCode: getFirstGraphQlCode(errors)
    }
  );

  if (traceId) {
    serviceError.data.traceId = traceId;
  }

  return serviceError;
};

export let isNonEmptyRecord = (value: unknown): value is Record<string, unknown> =>
  isApiErrorRecord(value) && Object.keys(value).length > 0;
