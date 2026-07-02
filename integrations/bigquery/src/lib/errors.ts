import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return;
  }

  let detail = String(value).trim();
  if (detail && !details.includes(detail)) {
    details.push(detail);
  }
};

let collectDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.status);
  addDetail(details, value.reason);
  addDetail(details, value.code);
  addDetail(details, value.error_description);
  collectDetails(value.errors, details);
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let getErrorStatus = (error: unknown) => {
  let response = getErrorResponse(error);
  if (response?.status !== undefined) {
    return response.status;
  }

  if (isRecord(error) && typeof error.status === 'number') {
    return error.status;
  }

  if (isRecord(error) && isRecord(error.data) && typeof error.data.status === 'number') {
    return error.data.status;
  }

  return undefined;
};

let getStatusText = (error: unknown) => getErrorResponse(error)?.statusText;

let extractBigQueryMessage = (error: unknown) => {
  let details: string[] = [];
  let response = getErrorResponse(error);

  if (isRecord(response?.data)) {
    collectDetails(response.data.error, details);
    collectDetails(response.data, details);
  } else {
    collectDetails(response?.data, details);
  }

  if (isRecord(error) && isRecord(error.data)) {
    collectDetails(error.data, details);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let statusLabel = (error: unknown) => {
  let status = getErrorStatus(error);
  let statusText = getStatusText(error);
  return status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
};

export let bigQueryServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let bigQueryApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = bigQueryServiceError(
    `BigQuery API ${operation} failed: ${statusLabel(error)}${extractBigQueryMessage(error)}`
  );
  serviceError.data.reason = 'bigquery_api_error';
  serviceError.data.upstreamStatus = getErrorStatus(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let bigQueryOAuthError = (operation: string, error: unknown) => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = bigQueryServiceError(
    `BigQuery OAuth ${operation} failed: ${statusLabel(error)}${extractBigQueryMessage(error)}`
  );
  serviceError.data.reason = 'bigquery_oauth_error';
  serviceError.data.upstreamStatus = getErrorStatus(error);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
