import { buildApiServiceError, createApiServiceError, type SlateErrorResponse } from 'slates';

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
  if (Array.isArray(value)) {
    for (let item of value) {
      collectZohoMessages(item, messages);
    }
    return;
  }

  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  if (isRecord(value.error)) {
    collectZohoMessages(value.error, messages);
  }

  if (Array.isArray(value.details)) {
    collectZohoMessages(value.details, messages);
  } else if (isRecord(value.details)) {
    for (let [key, detailValue] of Object.entries(value.details)) {
      if (typeof detailValue === 'string') {
        pushMessage(messages, `${key}: ${detailValue}`);
      }
    }
  }

  for (let key of ['message', 'error', 'error_description', 'title', 'error_type', 'code']) {
    pushMessage(messages, value[key]);
  }

  if (value.data !== undefined) {
    collectZohoMessages(value.data, messages);
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

export let mapZohoAxiosError = (error: unknown, inferred: SlateErrorResponse) => ({
  ...inferred,
  message: extractZohoMessage(error)
});

export let zohoServiceError = (message: string) => createApiServiceError(message);

export let zohoApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Zoho',
    operation,
    reason: 'zoho_api_error',
    extractMessage: extractZohoMessage
  });
