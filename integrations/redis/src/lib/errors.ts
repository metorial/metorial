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

let collectRedisMessages = (value: unknown, messages: string[]) => {
  if (Array.isArray(value)) {
    for (let item of value) {
      collectRedisMessages(item, messages);
    }
    return;
  }

  if (!isRecord(value)) {
    pushString(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'description', 'detail', 'details', 'code']) {
    pushString(messages, value[key]);
  }

  for (let key of ['errors', 'errorMessages', 'validationErrors']) {
    collectRedisMessages(value[key], messages);
  }
};

let extractRedisMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectRedisMessages(response?.data, messages);

  if (isRecord(error)) {
    collectRedisMessages(error.data, messages);
    pushString(messages, error.message);
  }

  if (error instanceof Error) {
    pushString(messages, error.message);
  }

  return messages.length > 0 ? messages.join(' - ') : 'Unknown error';
};

let extractRedisStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let status = response?.status ?? error.statusCode ?? error.status;

  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

export let redisServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let redisApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = extractRedisStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = redisServiceError(
    `Redis Cloud API ${operation} failed: ${statusLabel}${extractRedisMessage(error)}`
  );

  serviceError.data.reason = 'redis_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
