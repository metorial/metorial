import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'err', 'ECODE']) {
    pushMessage(messages, value[key]);
  }
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let extractClickUpMessage = (error: unknown) => {
  let messages: string[] = [];
  let data = getErrorResponse(error)?.data;

  if (data !== undefined) {
    collectMessages(data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let clickupServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let clickupApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getErrorResponse(error);
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = clickupServiceError(
    `ClickUp API ${operation} failed: ${statusLabel}${extractClickUpMessage(error)}`
  );
  serviceError.data.reason = 'clickup_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
