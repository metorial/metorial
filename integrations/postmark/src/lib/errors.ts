import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  addDetail(details, value.Message);
  addDetail(details, value.message);
  addDetail(details, value.ErrorCode);
  addDetail(details, value.error);
  collectDetails(value.Errors, details);
  collectDetails(value.errors, details);
};

let extractPostmarkMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) {
    return undefined;
  }

  let code = response.data.ErrorCode ?? response.data.errorCode;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
};

export let postmarkServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let postmarkApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = postmarkServiceError(
    `Postmark API ${operation} failed: ${statusLabelFor(response)}${extractPostmarkMessage(error)}`
  );
  serviceError.data.reason = 'postmark_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requirePostmarkString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw postmarkServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requirePostmarkNumber = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'number') {
    return value;
  }

  throw postmarkServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requirePostmarkArray = <T>(
  value: T[] | undefined,
  label: string,
  action?: string
) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  throw postmarkServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};
