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

let collectFreshserviceMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'description', 'error', 'code']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectFreshserviceMessages(error, messages);
    }
  } else if (isRecord(value.errors)) {
    collectFreshserviceMessages(value.errors, messages);
  }
};

let extractFreshserviceMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectFreshserviceMessages(response?.data, messages);

  if (isRecord(error)) {
    collectFreshserviceMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getFreshserviceErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let freshserviceServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let freshserviceApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getFreshserviceErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = freshserviceServiceError(
    `Freshservice API ${operation} failed: ${statusLabel}${extractFreshserviceMessage(error)}`
  );
  serviceError.data.reason = 'freshservice_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
