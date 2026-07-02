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
    for (let item of value) collectDetails(item, details);
    return;
  }

  if (!isRecord(value)) {
    pushDetail(details, value);
    return;
  }

  pushDetail(details, value.message);
  pushDetail(details, value.error);
  pushDetail(details, value.error_description);
  pushDetail(details, value.code);
  collectDetails(value.errors, details);
};

let extractRailwayMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  if (isRecord(response?.data)) {
    collectDetails(response.data.errors, details);
    collectDetails(response.data.error, details);
    collectDetails(response.data.message, details);
  } else {
    collectDetails(response?.data, details);
  }

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

export let railwayServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let railwayApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = railwayServiceError(
    `Railway API ${operation} failed: ${statusLabelFor(response)}${extractRailwayMessage(error)}`
  );

  serviceError.data.reason = 'railway_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
