import { badRequestError, type ErrorRecord, ServiceError } from '@lowerdeck/error';

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

export let getApiErrorResponse = (error: unknown): ApiErrorResponse | undefined => {
  if (!isApiErrorRecord(error) || !isApiErrorRecord(error.response)) {
    return undefined;
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
