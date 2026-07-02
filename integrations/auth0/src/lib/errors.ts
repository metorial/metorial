import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  let trimmed = value.trim();
  if (trimmed && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let extractAuth0Message = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    for (let key of ['message', 'error_description', 'error', 'errorCode', 'code']) {
      addDetail(details, data[key]);
    }
  } else {
    addDetail(details, data);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getAuth0ErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let auth0ServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let auth0ApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getAuth0ErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = auth0ServiceError(
    `Auth0 API ${operation} failed: ${statusLabel}${extractAuth0Message(error)}`
  );
  serviceError.data.reason = 'auth0_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let requireField = <T>(value: T | undefined | null, label: string, action: string) => {
  if (value === undefined || value === null || value === '') {
    throw auth0ServiceError(`${label} is required for ${action} action.`);
  }

  return value;
};

export let requireNonEmptyArray = <T>(
  value: T[] | undefined | null,
  label: string,
  action: string
) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw auth0ServiceError(`${label} must contain at least one item for ${action} action.`);
  }

  return value;
};
