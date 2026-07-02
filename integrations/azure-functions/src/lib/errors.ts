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

let collectAzureMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushMessage(messages, value);
    return;
  }

  for (let key of ['message', 'Message', 'code', 'Code', 'error_description', 'error']) {
    pushMessage(messages, value[key]);
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) {
    collectAzureMessages(nestedError, messages);
  }

  if (Array.isArray(value.details)) {
    for (let detail of value.details) {
      collectAzureMessages(detail, messages);
    }
  }
};

let extractAzureMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectAzureMessages(response?.data, messages);

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let azureFunctionsServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let azureFunctionsApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = azureFunctionsServiceError(
    `Azure Functions API ${operation} failed: ${statusLabel}${extractAzureMessage(error)}`
  );

  serviceError.data.reason = 'azure_functions_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
