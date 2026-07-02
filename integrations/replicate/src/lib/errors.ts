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
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['detail', 'message', 'error', 'title', 'code']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) {
      collectMessages(item, messages);
    }
  }
};

let getErrorResponse = (error: unknown) =>
  isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;

let getErrorStatus = (error: unknown) => {
  let response = getErrorResponse(error);
  return response?.status ?? (isRecord(error) ? error.status : undefined);
};

let getErrorStatusText = (error: unknown) => {
  let response = getErrorResponse(error);
  return response?.statusText;
};

let extractMessage = (error: unknown) => {
  let messages: string[] = [];
  let response = getErrorResponse(error);

  collectMessages(response?.data, messages);

  if (isRecord(error)) {
    collectMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let replicateServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let replicateApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let status = getErrorStatus(error);
  let statusText = getErrorStatusText(error);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';
  let serviceError = replicateServiceError(
    `Replicate API ${operation} failed: ${statusLabel}${extractMessage(error)}`
  );

  serviceError.data.reason = 'replicate_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
