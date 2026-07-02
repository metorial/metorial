import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addDetail = (details: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed.length > 0 && !details.includes(trimmed)) {
    details.push(trimmed);
  }
};

let addJsonDetail = (details: string[], value: unknown) => {
  if (!isRecord(value)) {
    addDetail(details, value);
    return;
  }

  addDetail(details, value['.tag']);
  addDetail(details, value.tag);
  addDetail(details, value.reason);

  try {
    let serialized = JSON.stringify(value);
    if (serialized && serialized !== '{}') {
      addDetail(details, serialized);
    }
  } catch {
    // Ignore non-serializable upstream payloads.
  }
};

let extractDropboxMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addDetail(details, data.error_summary);
    addDetail(details, data.error_description);
    addDetail(details, data.message);
    addJsonDetail(details, data.error);
  } else {
    addDetail(details, data);
  }

  if (details.length > 0) return details.join(' - ');
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown error';
};

let getStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let dropboxServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let dropboxApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = dropboxServiceError(
    `Dropbox API ${operation} failed: ${statusLabel}${extractDropboxMessage(error)}`
  );
  serviceError.data.reason = 'dropbox_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
