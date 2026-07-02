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

  let trimmed = String(value).trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let collectVercelDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectVercelDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.error_description);
  addDetail(details, value.error);
  addDetail(details, value.code);

  if (isRecord(value.meta)) {
    collectVercelDetails(value.meta, details);
  }
};

let extractVercelMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    collectVercelDetails(data.error, details);
    collectVercelDetails(data.errors, details);
    collectVercelDetails(data.message, details);
    collectVercelDetails(data, details);
  } else {
    collectVercelDetails(data, details);
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

export let vercelServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let vercelApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = vercelServiceError(
    `Vercel API ${operation} failed: ${statusLabelFor(response)}${extractVercelMessage(error)}`
  );
  serviceError.data.reason = 'vercel_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
