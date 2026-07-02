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

  addDetail(details, value.detail);
  addDetail(details, value.info_message);
  addDetail(details, value.message);
  addDetail(details, value.type);
  addDetail(details, value.error);
  addDetail(details, value.error_description);
  addDetail(details, value.code);
  collectDetails(value.details, details);
  collectDetails(value.non_field_errors, details);

  for (let [key, child] of Object.entries(value)) {
    if (
      [
        'detail',
        'info_message',
        'message',
        'type',
        'error',
        'error_description',
        'code',
        'details',
        'non_field_errors'
      ].includes(key)
    ) {
      continue;
    }
    collectDetails(child, details);
  }
};

let extractPandaDocMessage = (error: unknown) => {
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

let getPandaDocErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  let data = isRecord(error.data) ? error.data : undefined;
  return response?.status ?? error.status ?? data?.status;
};

export let pandadocServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let pandadocApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getPandaDocErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = pandadocServiceError(
    `PandaDoc API ${operation} failed: ${statusLabel}${extractPandaDocMessage(error)}`
  );
  serviceError.data.reason = 'pandadoc_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
