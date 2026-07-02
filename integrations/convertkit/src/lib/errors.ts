import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushMessage = (messages: string[], value: unknown) => {
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
    pushMessage(messages, value);
    return;
  }

  pushMessage(messages, value.message);
  pushMessage(messages, value.error);
  pushMessage(messages, value.error_description);

  let errors = value.errors;
  if (errors !== undefined) {
    collectMessages(errors, messages);
  }
};

let extractKitMessage = (error: unknown) => {
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

let statusLabelFor = (response?: ErrorResponse) =>
  response?.status !== undefined
    ? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}: `
    : '';

export let kitServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let kitApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let serviceError = kitServiceError(
    `Kit API ${operation} failed: ${statusLabelFor(response)}${extractKitMessage(error)}`
  );
  serviceError.data.reason = 'kit_api_error';
  serviceError.data.upstreamStatus = response?.status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
