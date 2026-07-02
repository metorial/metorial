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

let collectXeroMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  for (let key of [
    'Message',
    'message',
    'Type',
    'title',
    'detail',
    'error_description',
    'error'
  ]) {
    pushMessage(messages, value[key]);
  }

  if (Array.isArray(value.ValidationErrors)) {
    for (let validationError of value.ValidationErrors) {
      collectXeroMessages(validationError, messages);
    }
  }

  if (Array.isArray(value.Elements)) {
    for (let element of value.Elements) {
      collectXeroMessages(element, messages);
    }
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectXeroMessages(error, messages);
    }
  }
};

let extractXeroMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectXeroMessages(response?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let xeroServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let xeroApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = xeroServiceError(
    `Xero API ${operation} failed: ${statusLabel}${extractXeroMessage(error)}`
  );

  serviceError.data.reason = 'xero_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
