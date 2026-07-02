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

let collectMessages = (value: unknown, messages: string[]) => {
  if (typeof value === 'string') {
    addMessage(messages, value);
    return;
  }

  if (Array.isArray(value)) {
    for (let item of value) collectMessages(item, messages);
    return;
  }

  if (!isRecord(value)) return;

  for (let key of ['message', 'title', 'detail', 'error', 'error_description']) {
    addMessage(messages, value[key]);
  }

  for (let key of ['errors', 'details', 'validation_errors']) {
    collectMessages(value[key], messages);
  }
};

let extractCalendlyMessage = (error: unknown) => {
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

export let calendlyServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let calendlyApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = calendlyServiceError(
    `Calendly API ${operation} failed: ${statusLabel}${extractCalendlyMessage(error)}`
  );

  serviceError.data.reason = 'calendly_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
