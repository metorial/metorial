import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addUnique = (values: string[], value: unknown) => {
  let text = typeof value === 'string' ? value.trim() : '';
  if (text && !values.includes(text)) {
    values.push(text);
  }
};

let getErrorStatus = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? error.status;
};

let getErrorStatusText = (error: unknown) => {
  if (!isRecord(error)) {
    return undefined;
  }

  let response = error.response as ErrorResponse | undefined;
  return response?.statusText;
};

let extractMixpanelMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let details: string[] = [];

  if (isRecord(data)) {
    addUnique(details, data.error);
    addUnique(details, data.status);
    addUnique(details, data.message);

    let failedRecords = data.failed_records;
    if (Array.isArray(failedRecords)) {
      for (let record of failedRecords.slice(0, 3)) {
        if (isRecord(record)) {
          addUnique(details, record.message);
        }
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    addUnique(details, data);
  }

  if (details.length > 0) {
    return details.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let mixpanelServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let mixpanelApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = mixpanelServiceError(
    `Mixpanel API ${operation} failed: ${statusLabel}${extractMixpanelMessage(error)}`
  );

  serviceError.data.reason = 'mixpanel_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
