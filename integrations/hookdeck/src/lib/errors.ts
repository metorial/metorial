import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushDetail = (details: string[], value: unknown) => {
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
    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.message);
  pushDetail(details, value.detail);
  pushDetail(details, value.title);
  pushDetail(details, value.error);
  pushDetail(details, value.error_description);
  pushDetail(details, value.code);
  collectDetails(value.data, details);
  collectDetails(value.errors, details);
};

let extractHookdeckMessage = (error: unknown) => {
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

  return typeof response.data.code === 'string' ? response.data.code : undefined;
};

export let hookdeckServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let hookdeckApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = hookdeckServiceError(
    `Hookdeck API ${operation} failed: ${statusLabelFor(response)}${extractHookdeckMessage(error)}`
  );
  serviceError.data.reason = 'hookdeck_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireHookdeckInput = (value: unknown, label: string, action?: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw hookdeckServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireHookdeckRecord = (
  value: unknown,
  label: string,
  action?: string
): Record<string, unknown> => {
  if (isRecord(value) && !Array.isArray(value)) {
    return value;
  }

  throw hookdeckServiceError(`${label} is required${action ? ` for "${action}"` : ''}.`);
};

export let requireNonEmptyHookdeckRecord = (
  value: unknown,
  label: string,
  action?: string
): Record<string, unknown> => {
  let record = requireHookdeckRecord(value, label, action);

  if (Object.keys(record).length > 0) {
    return record;
  }

  throw hookdeckServiceError(`${label} cannot be empty${action ? ` for "${action}"` : ''}.`);
};
