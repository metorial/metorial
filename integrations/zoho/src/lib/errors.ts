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

let collectZohoMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'error_description', 'code']) {
    pushMessage(messages, value[key]);
  }

  if (isRecord(value.details)) {
    for (let [key, detailValue] of Object.entries(value.details)) {
      if (typeof detailValue === 'string') {
        pushMessage(messages, `${key}: ${detailValue}`);
      }
    }
  }

  if (Array.isArray(value.data)) {
    for (let item of value.data) {
      collectZohoMessages(item, messages);
    }
  }
};

let extractZohoMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectZohoMessages(response?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let zohoServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let zohoApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = zohoServiceError(
    `Zoho API ${operation} failed: ${statusLabel}${extractZohoMessage(error)}`
  );

  serviceError.data.reason = 'zoho_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
