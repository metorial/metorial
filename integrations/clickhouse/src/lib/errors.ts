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

let collectClickHouseMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'description', 'hint', 'code']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let item of value.errors) {
      collectClickHouseMessages(item, messages);
    }
  }
};

let extractClickHouseMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectClickHouseMessages(response?.data, messages);

  if (isRecord(error)) {
    collectClickHouseMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

export let clickhouseServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let clickhouseApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status =
    response?.status ??
    (isRecord(error) && typeof error.status === 'number' ? error.status : undefined);
  let statusText =
    response?.statusText ??
    (isRecord(error) &&
    isRecord(error.upstream) &&
    typeof error.upstream.statusText === 'string'
      ? error.upstream.statusText
      : undefined);
  let statusLabel =
    status !== undefined ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}: ` : '';

  let serviceError = clickhouseServiceError(
    `ClickHouse API ${operation} failed: ${statusLabel}${extractClickHouseMessage(error)}`
  );

  serviceError.data.reason = 'clickhouse_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
