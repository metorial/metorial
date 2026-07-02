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

  for (let key of ['message', 'error', 'description', 'reason', 'requestId']) {
    addMessage(messages, value[key]);
  }

  for (let key of ['errors', 'messages']) {
    let nested = value[key];
    if (Array.isArray(nested)) {
      for (let item of nested) collectMessages(item, messages);
    }
  }
};

let extractGongMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectMessages(response?.data, messages);

  if (messages.length > 0) return messages.join(' - ');

  if (error instanceof Error && error.message) return error.message;

  return 'Unknown error';
};

export let gongServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let gongApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

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

  let serviceError = gongServiceError(
    `Gong API ${operation} failed: ${statusLabel}${extractGongMessage(error)}`
  );

  serviceError.data.reason = 'gong_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) serviceError.setParent(error);

  return serviceError;
};
