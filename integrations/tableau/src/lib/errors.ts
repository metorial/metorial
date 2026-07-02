import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    let trimmed = value.trim();
    if (!messages.includes(trimmed)) messages.push(trimmed);
  }
};

let collectTableauMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) return;

  pushString(messages, value.summary);
  pushString(messages, value.detail);
  pushString(messages, value.message);
  pushString(messages, value.errorMessage);
  pushString(messages, value.title);

  if (typeof value.code === 'string' && value.code.trim()) {
    pushString(messages, `code ${value.code}`);
  }

  let nestedError = value.error;
  if (isRecord(nestedError)) collectTableauMessages(nestedError, messages);

  let errors = value.errors;
  if (Array.isArray(errors)) {
    for (let item of errors) collectTableauMessages(item, messages);
  }
};

let extractTableauMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let errorData = isRecord(error)
    ? (error.data as Record<string, unknown> | undefined)
    : undefined;
  let baggage = isRecord(errorData?.baggage)
    ? (errorData.baggage as Record<string, unknown>)
    : undefined;
  let data = response?.data ?? baggage?.response;
  let messages: string[] = [];

  if (isRecord(data)) {
    collectTableauMessages(data, messages);
  } else if (typeof data === 'string') {
    pushString(messages, data.slice(0, 500));
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let tableauServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let tableauApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = response?.status;
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = tableauServiceError(
    `Tableau API ${operation} failed: ${statusLabel}${extractTableauMessage(error)}`
  );

  serviceError.data.reason = 'tableau_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
