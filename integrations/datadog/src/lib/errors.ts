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

let collectDatadogMessages = (value: unknown, messages: string[]) => {
  if (!isRecord(value)) {
    addMessage(messages, value);
    return;
  }

  for (let key of ['message', 'error', 'detail', 'title']) {
    addMessage(messages, value[key]);
  }

  if (Array.isArray(value.errors)) {
    for (let error of value.errors) {
      collectDatadogMessages(error, messages);
    }
  } else if (isRecord(value.errors)) {
    collectDatadogMessages(value.errors, messages);
  }
};

let extractDatadogMessage = (error: unknown) => {
  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let messages: string[] = [];

  collectDatadogMessages(response?.data, messages);

  if (isRecord(error)) {
    collectDatadogMessages(error.data, messages);
  }

  if (messages.length > 0) {
    return messages.join(' - ');
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
};

let getDatadogErrorStatus = (error: unknown) => {
  if (!isRecord(error)) return undefined;

  let response = error.response as ErrorResponse | undefined;
  return (
    response?.status ?? error.status ?? (isRecord(error.data) ? error.data.status : undefined)
  );
};

export let datadogServiceError = (message: string) =>
  new ServiceError(badRequestError({ message }));

export let datadogApiError = (error: unknown, operation = 'request') => {
  if (error instanceof ServiceError) return error;

  let response = isRecord(error) ? (error.response as ErrorResponse | undefined) : undefined;
  let status = getDatadogErrorStatus(error);
  let statusLabel =
    status !== undefined
      ? `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}: `
      : '';

  let serviceError = datadogServiceError(
    `Datadog API ${operation} failed: ${statusLabel}${extractDatadogMessage(error)}`
  );
  serviceError.data.reason = 'datadog_api_error';
  serviceError.data.upstreamStatus = status;

  if (error instanceof Error) {
    serviceError.setParent(error);
  }

  return serviceError;
};
