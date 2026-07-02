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

let collectZoomErrors = (value: unknown, details: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  for (let key of ['message', 'error_description', 'error', 'reason', 'code']) {
    let detail = value[key];
    if (typeof detail === 'number') {
      addDetail(details, String(detail));
    } else {
      addDetail(details, detail);
    }
  }

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) {
      if (isRecord(item)) {
        collectZoomErrors(item, details);
      } else {
        addDetail(details, item);
      }
    }
  }
};

let extractZoomMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    collectZoomErrors(data, details);
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

export let zoomServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let zoomApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = zoomServiceError(
    `Zoom API ${operation} failed: ${statusLabel}${extractZoomMessage(error)}`
  );
  serviceError.data.reason = 'zoom_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};

export let zoomOAuthError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let serviceError = zoomServiceError(
    `Zoom OAuth ${operation} failed: ${extractZoomMessage(error)}`
  );
  serviceError.data.reason = 'zoom_oauth_error';

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
