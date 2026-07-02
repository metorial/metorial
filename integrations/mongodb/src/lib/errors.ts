import { badRequestError, ServiceError } from '@lowerdeck/error';

type ErrorResponse = {
  status?: number;
  statusText?: string;
  data?: unknown;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let pushString = (messages: string[], value: unknown) => {
  if (typeof value !== 'string') return;

  let trimmed = value.trim();
  if (trimmed && !messages.includes(trimmed)) {
    messages.push(trimmed);
  }
};

let collectMongoDbMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    pushString(messages, value);
    return;
  }

  for (let key of ['detail', 'reason', 'errorCode', 'message', 'error', 'title']) {
    pushString(messages, value[key]);
  }

  if (Array.isArray(value.parameters)) {
    for (let parameter of value.parameters) {
      collectMongoDbMessages(parameter, messages);
    }
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectMongoDbMessages(error, messages);
    }
  }
};

let extractMongoDbMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMongoDbMessages(response?.data, messages);

  if (isRecord(error)) {
    collectMongoDbMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let mongodbServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let mongodbApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status =
    response?.status ??
    (isRecord(error) && typeof error.status === 'number' ? error.status : undefined);
  let statusText =
    response?.statusText ??
    (isRecord(error) && typeof error.statusText === 'string' ? error.statusText : undefined);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = mongodbServiceError(
    `MongoDB Atlas API ${operation} failed: ${statusLabel}${extractMongoDbMessage(error)}`
  );

  serviceError.data.reason = 'mongodb_atlas_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
