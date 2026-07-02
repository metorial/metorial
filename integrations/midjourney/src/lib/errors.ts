import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let addMessage = (messages: string[], value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return;
  }

  let message = String(value).trim();
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
    addMessage(messages, value);
    return;
  }

  for (let key of ['msg', 'message', 'detail', 'error', 'title', 'code']) {
    addMessage(messages, value[key]);
  }

  collectMessages(value.errors, messages);
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let extractMessage = (error: unknown) => {
  let messages: string[] = [];
  collectMessages(getErrorResponse(error)?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let midjourneyServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let midjourneyApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = getErrorResponse(error);
  let statusLabel =
    response?.status !== undefined
      ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
      : '';
  let serviceError = midjourneyServiceError(
    `Midjourney API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );

  serviceError.data.reason = 'midjourney_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
