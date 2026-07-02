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

let collectDetails = (value: unknown, details: string[], prefix?: string) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectDetails(item, details, prefix);
    }
    return;
  }

  if (!isRecord(value)) {
    if (prefix && (typeof value === 'string' || typeof value === 'number')) {
      pushDetail(details, `${prefix}: ${value}`);
      return;
    }

    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.message);
  pushDetail(details, value.error);
  pushDetail(details, value.error_description);
  pushDetail(details, value.code);

  for (let [key, child] of Object.entries(value)) {
    if (
      key === 'message' ||
      key === 'error' ||
      key === 'error_description' ||
      key === 'code'
    ) {
      continue;
    }

    collectDetails(child, details, key);
  }
};

let extractKitMessage = (error: unknown) => {
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

export let kitServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let kitApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = kitServiceError(
    `Kit API ${operation} failed: ${statusLabelFor(response)}${extractKitMessage(error)}`
  );

  serviceError.data.reason = 'kit_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
