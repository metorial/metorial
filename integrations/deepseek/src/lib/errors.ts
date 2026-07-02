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

let extractDeepSeekMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let data = response?.data;
  let messages: string[] = [];

  if (isRecord(data)) {
    addMessage(messages, data.message);
    addMessage(messages, data.error);
    addMessage(messages, data.error_msg);

    if (isRecord(data.error)) {
      addMessage(messages, data.error.message);
      addMessage(messages, data.error.type);
      addMessage(messages, data.error.code);
    }
  } else {
    addMessage(messages, data);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getDeepSeekErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  let status = response?.status ?? error.status;
  return typeof status === 'number' || typeof status === 'string' ? status : undefined;
};

export let deepSeekServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let deepSeekApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) {
    return error;
  }

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getDeepSeekErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = deepSeekServiceError(
    `DeepSeek API ${operation} failed: ${statusLabel}${extractDeepSeekMessage(error)}`
  );
  serviceError.data.reason = 'deepseek_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
