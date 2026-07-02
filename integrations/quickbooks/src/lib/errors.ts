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

let collectQuickBooksMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  for (let key of ['Message', 'Detail', 'message', 'detail', 'error_description', 'error']) {
    pushString(messages, value[key]);
  }

  let fault = value.Fault;
  if (isRecord(fault)) {
    pushString(messages, fault.type);
    let errors = fault.Error;
    if (Array.isArray(errors)) {
      for (let error of errors) {
        collectQuickBooksMessages(error, messages);
      }
    }
  }
};

let extractQuickBooksMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    collectQuickBooksMessages(data, messages);
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

export let quickBooksServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let quickBooksApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = quickBooksServiceError(
    `QuickBooks API ${operation} failed: ${statusLabel}${extractQuickBooksMessage(error)}`
  );

  serviceError.data.reason = 'quickbooks_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
