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

let collectDigitalOceanDetails = (value: unknown, details: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectDigitalOceanDetails(item, details);
    }
    return;
  }

  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value.message);
  addDetail(details, value.id);
  addDetail(details, value.request_id);
  collectDigitalOceanDetails(value.error, details);
  collectDigitalOceanDetails(value.errors, details);
};

let extractDigitalOceanMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  if (response?.data !== undefined) {
    collectDigitalOceanDetails(response.data, details);
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

export let digitalOceanServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let digitalOceanValidationError = (message: string) => {
  let error = digitalOceanServiceError(message);
  error.data.reason = 'digital_ocean_validation_error';
  return error;
};

export let digitalOceanApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = digitalOceanServiceError(
    `DigitalOcean API ${operation} failed: ${statusLabelFor(response)}${extractDigitalOceanMessage(error)}`
  );
  serviceError.data.reason = 'digital_ocean_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (isRecord(response?.data)) {
    serviceError.data.upstreamCode = response.data.id;
    serviceError.data.requestId = response.data.request_id;
  }

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
