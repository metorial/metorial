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

  let message = value.trim();
  if (message && !messages.includes(message)) {
    messages.push(message);
  }
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectMessages(item, messages);
    }
    return;
  }

  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  for (let key of ['message', 'description', 'error', 'error_description', 'title']) {
    pushMessage(messages, value[key]);
  }

  for (let nested of Object.values(value)) {
    if (Array.isArray(nested) || isRecord(nested)) {
      collectMessages(nested, messages);
    }
  }
};

let extractFreshdeskMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let freshdeskServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let freshdeskApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = freshdeskServiceError(
    `Freshdesk API ${operation} failed: ${statusLabel}${extractFreshdeskMessage(error)}`
  );

  serviceError.data.reason = 'freshdesk_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
