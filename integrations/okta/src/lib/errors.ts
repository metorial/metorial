import { badRequestError, ServiceError } from '@lowerdeck/error';
import type { createAxios } from 'slates';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let detail = value.trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

let collectErrorDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectErrorDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    pushDetail(details, value);
    return;
  }

  for (let key of [
    'errorSummary',
    'errorCode',
    'errorLink',
    'errorId',
    'message',
    'error_description',
    'error'
  ]) {
    pushDetail(details, value[key]);
  }

  for (let nested of Object.values(value)) {
    if (Array.isArray(nested) || isRecord(nested)) {
      collectErrorDetails(nested, details);
    }
  }
};

let extractOktaMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectErrorDetails(response?.data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let oktaServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let oktaApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = oktaServiceError(
    `Okta API ${operation} failed: ${statusLabel}${extractOktaMessage(error)}`
  );
  serviceError.data.reason = 'okta_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let applyOktaErrorInterceptor = (http: ReturnType<typeof createAxios>) => {
  http.interceptors.response.use(
    response => response,
    error => Promise.reject(oktaApiError(error))
  );
};
