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
  if (trimmed && !messages.includes(trimmed)) messages.push(trimmed);
};

let collectMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'error_description', 'description', 'detail']) {
    addMessage(messages, value[key]);
  }

  for (let key of ['errors', 'messages']) {
    let nested = value[key];
    if (!Array.isArray(nested)) continue;

    for (let item of nested) collectMessages(item, messages);
  }
};

let getFrontErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return response?.status ?? (typeof error.status === 'number' ? error.status : undefined);
};

let extractFrontMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);
  collectMessages(isRecord(error) ? error.data : undefined, messages);

  if (messages.length > 0) return messages.join(' - ');

  if (error instanceof Error && error.message) return error.message;

  return 'Unknown error';
};

export let frontServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let frontApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getFrontErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = frontServiceError(
    `Front API ${operation} failed: ${statusLabel}${extractFrontMessage(error)}`
  );
  serviceError.data.reason = 'front_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) serviceError.setParent(error);

  return serviceError;
};
