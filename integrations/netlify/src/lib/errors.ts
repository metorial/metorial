import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim() && !messages.includes(value.trim())) {
    messages.push(value.trim());
  }
};

let collectNetlifyMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    return;
  }

  for (let key of ['message', 'error', 'error_description', 'detail', 'title']) {
    pushString(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) {
      if (typeof item === 'string') {
        pushString(messages, item);
      } else {
        collectNetlifyMessages(item, messages);
      }
    }
  }
};

let extractNetlifyMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    collectNetlifyMessages(data, messages);
  } else {
    pushString(messages, data);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let netlifyServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let netlifyApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = netlifyServiceError(
    `Netlify API ${operation} failed: ${statusLabel}${extractNetlifyMessage(error)}`
  );

  serviceError.data.reason = 'netlify_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
