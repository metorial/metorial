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

  for (let key of ['message', 'error', 'error_description', 'code', 'reason', 'detail']) {
    collectDetails(value[key], details);
  }

  collectDetails(value.errors, details);
};

let extractMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let details: string[] = [];

  collectDetails(response?.data, details);
  if (isRecord(error)) {
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

let upstreamCodeFor = (response?: ErrorResponse) => {
  if (!isRecord(response?.data)) {
    return undefined;
  }

  return typeof response.data.code === 'string' ? response.data.code : undefined;
};

export let planetscaleServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let planetscaleApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let statusLabel =
    response?.status !== undefined
      ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = planetscaleServiceError(
    `PlanetScale API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );
  serviceError.data.reason = 'planetscale_api_error';
  serviceError.data.upstreamStatus = response?.status;
  serviceError.data.upstreamCode = upstreamCodeFor(response);

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireField = <T>(value: T | undefined | null, label: string, action?: string) => {
  if (value === undefined || value === null || value === '') {
    throw planetscaleServiceError(`${label} is required${action ? ` for ${action}` : ''}.`);
  }

  return value;
};

export let requireAtLeastOne = (
  values: Record<string, unknown>,
  message = 'Provide at least one field to update.'
) => {
  if (Object.values(values).every(value => value === undefined)) {
    throw planetscaleServiceError(message);
  }
};
