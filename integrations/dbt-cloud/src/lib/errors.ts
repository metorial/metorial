import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    let trimmed = value.trim();
    if (!messages.includes(trimmed)) messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  pushString(messages, value.message);
  pushString(messages, value.detail);
  pushString(messages, value.error);
  pushString(messages, value.status);
  pushString(messages, value.title);

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) collectMessages(item, messages);
  }

  let data = value.data;
  if (Array.isArray(data)) {
    for (let item of data) collectMessages(item, messages);
  } else if (isRecord(data)) {
    collectMessages(data, messages);
  }
};

let extractDbtCloudMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data ?? (isRecord(error) ? error.data : undefined);
  let messages: string[] = [];

  if (typeof data === 'string') {
    pushString(messages, data.slice(0, 500));
  } else {
    collectMessages(data, messages);
  }

  if (messages.length > 0) return messages.join(' - ');

  if (error instanceof Error && error.message) return error.message;

  return 'Unknown error';
};

export let dbtCloudServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let dbtCloudApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = dbtCloudServiceError(
    `dbt Cloud API ${operation} failed: ${statusLabel}${extractDbtCloudMessage(error)}`
  );
  serviceError.data.reason = 'dbt_cloud_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
