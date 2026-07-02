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

  addDetail(details, value.message);
  addDetail(details, value.error);
  addDetail(details, value.type);
  collectDetails(value.errors, details);
};

let extractBrazeMessage = (error: unknown) => {
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

export let brazeServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let brazeApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = brazeServiceError(
    `Braze API ${operation} failed: ${statusLabelFor(response)}${extractBrazeMessage(error)}`
  );
  serviceError.data.reason = 'braze_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireBrazeString = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw brazeServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireBrazeNumber = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'number') {
    return value;
  }

  throw brazeServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireBrazeArray = <T>(value: T[] | undefined, label: string, action?: string) => {
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }

  throw brazeServiceError(
    `${label} must contain at least one item${action ? ` for "${action}"` : ''}.`
  );
};
