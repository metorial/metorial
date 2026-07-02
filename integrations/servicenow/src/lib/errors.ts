import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectServiceNowMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'detail', 'error', 'error_description', 'status']) {
    addMessage(messages, value[key]);
  }

  if (isRecord(value.error)) {
    collectServiceNowMessages(value.error, messages);
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectServiceNowMessages(error, messages);
    }
  }
};

let extractServiceNowMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectServiceNowMessages(response?.data, messages);

  if (isRecord(error)) {
    collectServiceNowMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getServiceNowErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let servicenowServiceError = (message: string) => {
  let error = new ServiceError(badRequestError({ message }));
  error.data.reason = 'servicenow_validation_error';
  return error;
};

export let servicenowApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getServiceNowErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = servicenowServiceError(
    `ServiceNow API ${operation} failed: ${statusLabel}${extractServiceNowMessage(error)}`
  );
  serviceError.data.reason = 'servicenow_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
