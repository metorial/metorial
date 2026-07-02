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

  addDetail(details, value.error_msg);
  addDetail(details, value.error_name);
  addDetail(details, value.message);
  addDetail(details, value.error);
  addDetail(details, value.error_description);
  addDetail(details, value.code);
  addDetail(details, value.status);
  collectDetails(value.error, details);
  collectDetails(value.errors, details);
  collectDetails(value.warnings, details);
};

let extractDropboxSignMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let details: string[] = [];

  collectDetails(data, details);

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getDropboxSignErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  let data = isRecord(error.data) ? error.data : undefined;
  return response?.status ?? error.status ?? data?.status;
};

export let hellosignServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let hellosignApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getDropboxSignErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = hellosignServiceError(
    `Dropbox Sign API ${operation} failed: ${statusLabel}${extractDropboxSignMessage(error)}`
  );
  serviceError.data.reason = 'dropbox_sign_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
