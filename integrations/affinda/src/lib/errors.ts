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

let collectAffindaMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'detail', 'error', 'type', 'code']) {
    addMessage(messages, value[key]);
  }

  let nestedError = isRecord(value.error) ? value.error : undefined;
  if (nestedError) {
    for (let key of ['errorCode', 'errorDetail', 'message', 'detail']) {
      addMessage(messages, nestedError[key]);
    }
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectAffindaMessages(error, messages);
    }
  } else if (isRecord(value.errors)) {
    collectAffindaMessages(value.errors, messages);
  }
};

let extractAffindaMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectAffindaMessages(response?.data, messages);
  if (isRecord(error)) {
    collectAffindaMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getAffindaErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let affindaServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let affindaApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getAffindaErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = affindaServiceError(
    `Affinda API ${operation} failed: ${statusLabel}${extractAffindaMessage(error)}`
  );
  serviceError.data.reason = 'affinda_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
